import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LRUCache } from "lru-cache";
import { logger } from "../lib/logger.js";
import type { SsrInput, SsrModule } from "./types.js";

/**
 * Loads the client's Vite build (client/dist/index.html as the template and
 * client/dist-ssr/entry-server.js as the React renderer) and turns an
 * SsrInput into a full HTML document.
 *
 * Paths can be overridden with CLIENT_DIST_DIR / CLIENT_SSR_DIR.
 */
const clientDist = () =>
  process.env.CLIENT_DIST_DIR ?? path.resolve(process.cwd(), "../client/dist");
const clientSsr = () =>
  process.env.CLIENT_SSR_DIR ?? path.resolve(process.cwd(), "../client/dist-ssr");

let loaded: Promise<{ template: string; mod: SsrModule } | null> | null = null;

async function load(): Promise<{ template: string; mod: SsrModule } | null> {
  const templatePath = path.join(clientDist(), "index.html");
  const entryPath = path.join(clientSsr(), "entry-server.js");
  if (!fs.existsSync(templatePath) || !fs.existsSync(entryPath)) {
    logger.error(
      { templatePath, entryPath },
      "SSR build not found — run `npm --workspace client run build`",
    );
    return null;
  }
  const template = fs.readFileSync(templatePath, "utf8");
  const mod = (await import(pathToFileURL(entryPath).href)) as SsrModule;
  return { template, mod };
}

function getBuild() {
  if (!loaded) {
    loaded = load().catch((err) => {
      logger.error({ err }, "SSR bundle failed to load");
      loaded = null;
      return null;
    });
  }
  return loaded;
}

const HEAD_REGION = /<!--head:start-->[\s\S]*?<!--head:end-->/;

export function injectIntoTemplate(
  template: string,
  parts: { head: string; html: string; data: string; htmlLang: string },
): string {
  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${parts.htmlLang}">`)
    .replace(HEAD_REGION, () => parts.head)
    .replace("<!--app-html-->", () => parts.html)
    .replace(
      "<!--app-data-->",
      () => `<script type="application/json" id="__SSR_DATA__">${parts.data}</script>`,
    );
}

/** Rendered HTML per path, so bursts of crawler traffic cost one render. */
const htmlCache = new LRUCache<string, string>({ max: 200, ttl: 2 * 60 * 1000 });

export async function renderPage(input: SsrInput, { cache = true } = {}): Promise<string | null> {
  const cacheKey = `${input.page}:${input.path}`;
  if (cache) {
    const hit = htmlCache.get(cacheKey);
    if (hit) return hit;
  }
  const build = await getBuild();
  if (!build) return null;
  const result = build.mod.render(input);
  const html = injectIntoTemplate(build.template, result);
  if (cache) htmlCache.set(cacheKey, html);
  return html;
}

export function clearSsrCache(): void {
  htmlCache.clear();
}
