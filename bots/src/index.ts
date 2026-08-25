import "dotenv/config";
import express from "express";
import { config, telegramEnabled } from "./config.js";
import { logger } from "./logger.js";
import { ensureSchema } from "./prisma.js";

const app = express();

app.use(express.json({ verify: keepRawBody }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function main(): Promise<void> {
  await ensureSchema();

  if (telegramEnabled()) {
    const { bot, telegramWebhook } = await import("./tg/bot.js");
    const seenUpdates = new Set<number>();

    bot.use(async (ctx, next) => {
      const updateId = ctx.update.update_id;
      if (seenUpdates.has(updateId)) {
        logger.warn({ updateId }, "duplicate update skipped");
        return;
      }
      seenUpdates.add(updateId);
      if (seenUpdates.size > 5000) {
        for (const old of seenUpdates) {
          seenUpdates.delete(old);
          if (seenUpdates.size <= 2500) break;
        }
      }
      await next();
    });

    if (config.telegram.polling) {
      await bot.api.deleteWebhook().catch(() => undefined);
      void bot.start({
        onStart: (me) => logger.info(`telegram bot polling as @${me.username}`),
      });
      const stopBot = async () => {
        await bot.stop().catch(() => undefined);
        process.exit(0);
      };
      process.once("SIGTERM", () => void stopBot());
      process.once("SIGINT", () => void stopBot());
    } else {
      app.use("/webhooks/telegram", telegramWebhook());
      logger.info("telegram bot mounted on /webhooks/telegram");
    }

    const { startFollowUpCron } = await import("./crons/followups.js");
    const { startReportCron } = await import("./crons/report.js");
    startFollowUpCron();
    startReportCron();
  } else {
    logger.warn("TELEGRAM_BOT_TOKEN is not set — telegram bot disabled");
  }

  const { instagramRouter } = await import("./ig/webhook.js");
  const { warnInstagramConfig } = await import("./ig/webhook.js");
  warnInstagramConfig();
  app.use("/webhooks/instagram", instagramRouter);
  logger.info("instagram webhook mounted on /webhooks/instagram");

  app.listen(config.port, () => {
    logger.info(`SkyTravel bots running on http://localhost:${config.port}`);
  });
}

function keepRawBody(req: express.Request, _res: express.Response, buf: Buffer): void {
  (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
}

process.on("unhandledRejection", (reason) => {
  logger.error(reason, "unhandled rejection");
});

main().catch((error) => {
  logger.error(error, "failed to start bots service");
  process.exit(1);
});
