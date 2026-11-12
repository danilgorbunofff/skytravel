import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../../../client/public/assets");

type Versioned = { url: string; hash: string };

const cache = new Map<string, Versioned>();

/**
 * Content-hashed URL for a blog asset. The file is served by express.static
 * with `immutable`, so the version query is what makes long caching safe:
 * editing the stylesheet changes the hash and therefore the URL.
 */
function versioned(file: string): Versioned {
  const cached = cache.get(file);
  if (cached) return cached;
  let hash = "";
  try {
    hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(ASSETS_DIR, file)))
      .digest("hex")
      .slice(0, 10);
  } catch {
    logger.warn({ file }, "[blog] asset missing — serving unversioned URL");
  }
  const result = { url: hash ? `/assets/${file}?v=${hash}` : `/assets/${file}`, hash };
  cache.set(file, result);
  return result;
}

export function blogCssUrl(): string {
  return versioned("blog.css").url;
}

/** The enhancement script is optional; when it is missing the page stays usable. */
export function blogJsUrl(): string | null {
  const { hash } = versioned("blog.js");
  return hash ? `/assets/blog.js?v=${hash}` : null;
}

/** Test helper. */
export function resetAssetCache(): void {
  cache.clear();
}
