import "dotenv/config";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import prisma from "./prisma.js";
import { ensureKnownDestinations } from "./providers/destinationStore.js";

const app = createApp();

async function ensureAdminUser() {
  const { login, password } = config.admin;
  if (!login || !password) {
    logger.warn("ADMIN_LOGIN or ADMIN_PASSWORD is missing. Admin login disabled.");
    return;
  }
  const existing = await prisma.adminUser.findUnique({ where: { login } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { login, passwordHash } });
  logger.info(`Admin user '${login}' created.`);
}

ensureAdminUser()
  .catch((error) => {
    logger.error({ err: error }, "Failed to ensure admin user");
  })
  .finally(() => {
    app.listen(config.port, () => {
      logger.info(`SkyTravel API running on http://localhost:${config.port}`);

      // Signal PM2 that the app is ready to accept connections
      if (process.send) process.send("ready");

      // ── Warm destination mapping (fire-and-forget) ──────────────
      // Ensures ProviderTour rows have correct destinationId before
      // the first search request hits the lazy path.
      ensureKnownDestinations().catch((err) =>
        logger.error({ err }, "ensureKnownDestinations failed"),
      );

      // ── Cache warming (fire-and-forget) ───────────────────────────
      const warmOnStartup = process.env.PROVIDERS_WARM_ON_STARTUP !== "false";
      void (async () => {
        const { getAllProviders, getProvider } = await import("./providers/index.js");
        const all = getAllProviders();

        // Always load DB cache status so getCacheStatus() works (in parallel)
        await Promise.allSettled(
          all.map(async (meta) => {
            try {
              const provider = getProvider(meta.id);
              if (
                "loadCacheStatus" in provider &&
                typeof (provider as Record<string, unknown>).loadCacheStatus === "function"
              ) {
                await (
                  (provider as Record<string, unknown>).loadCacheStatus as () => Promise<void>
                )();
              }
            } catch {
              /* ignore */
            }
          }),
        );

        if (warmOnStartup) {
          // Warm all providers in parallel — each is an independent network/DB
          // workload; serializing them was wasting startup time for no reason.
          await Promise.allSettled(
            all.map(async (meta) => {
              const start = Date.now();
              try {
                const provider = getProvider(meta.id);
                await provider.warmCache();
                const status = provider.getCacheStatus();
                logger.info(
                  `[Cache] ${meta.id} warmed: ${status.itemCount} items in ${Date.now() - start}ms`,
                );
              } catch (err) {
                logger.error({ err }, `[Cache] ${meta.id} warm failed`);
              }
            }),
          );
        }

        // Set up background refresh intervals (staggered to avoid all
        // providers refreshing at the same instant).
        all.forEach((meta, idx) => {
          const provider = getProvider(meta.id);
          const mins = Math.round(provider.refreshIntervalMs / 60_000);
          const initialDelay = (idx + 1) * 30_000; // 30s, 60s, ...
          setTimeout(() => {
            setInterval(() => {
              provider
                .warmCache()
                .catch((err) =>
                  logger.error({ err }, `[Cache] ${meta.id} background refresh failed`),
                );
            }, provider.refreshIntervalMs);
            // Trigger one immediate refresh after the stagger so cold deploys
            // don't have to wait the full interval.
            provider.warmCache().catch(() => {
              /* logged elsewhere */
            });
          }, initialDelay);
          logger.info(
            `[Cache] ${meta.id} will refresh every ${mins} min (first run in ${Math.round(initialDelay / 1000)}s)`,
          );
        });
      })();
    });
  });
