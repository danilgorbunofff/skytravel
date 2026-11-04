#!/usr/bin/env node
/**
 * Builds the responsive image set for the blog.
 *
 * Sources stay where they are (`client/public/assets/hub/*.jpg`), the generated
 * variants are committed under `client/public/assets/blog/` and described in
 * `server/content/blog/media.json`. Committing the output matters because
 * `/assets/*` is served with `immutable, max-age=1y`: filenames have to be
 * stable and versioned by width, not rewritten in place.
 *
 * Requires `cwebp` (brew install webp) and `sips` (macOS). No native npm deps —
 * `sharp` breaks the production install.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "client/public/assets");
const BLOG_OUT = path.join(PUBLIC_DIR, "blog");
const MANIFEST = path.join(ROOT, "server/content/blog/media.json");
const WEBP_WIDTHS = [480, 800, 1200];
/** Raster fallback rungs — one file per breakpoint is enough for non-WebP browsers. */
const JPG_WIDTHS = [480, 800];
const WEBP_QUALITY = 66;
const JPG_QUALITY = 68;
const OG = { width: 1200, height: 630, quality: 55 };

/** Destination photographs + the generic fallback, with their social crop bias. */
const SOURCES = [
  { key: "/assets/hub/albanie.jpg", slug: "albanie", ogTop: 0.5 },
  { key: "/assets/hub/bulharsko.jpg", slug: "bulharsko", ogTop: 0.5 },
  { key: "/assets/hub/cerna-hora.jpg", slug: "cerna-hora", ogTop: 0.5 },
  { key: "/assets/hub/chorvatsko.jpg", slug: "chorvatsko", ogTop: 0.5 },
  { key: "/assets/hub/italie.jpg", slug: "italie", ogTop: 0.5 },
  { key: "/assets/hub/recko.jpg", slug: "recko", ogTop: 0.28 },
  { key: "/assets/hub/spanelsko.jpg", slug: "spanelsko", ogTop: 0.5 },
  { key: "/assets/hub/turecko.jpg", slug: "turecko", ogTop: 0.3 },
  { key: "/assets/blog/hero-fallback.jpg", slug: "hero-fallback", ogTop: 0.45 },
];

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
}

function readJpegSize(file) {
  const buffer = fs.readFileSync(file);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`cannot read JPEG dimensions: ${file}`);
}

function isFresh(output, input) {
  try {
    return fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs;
  } catch {
    return false;
  }
}

function writeJpeg(input, output, { width, height, quality, cropTop = null }) {
  const qualityFlag = ["-s", "format", "jpeg", "-s", "formatOptions", String(quality)];
  if (width && height) {
    const offsetY =
      cropTop === null ? 0 : Math.round((readJpegSize(input).height - height) * cropTop);
    run("sips", [
      "-c",
      String(height),
      String(width),
      "--cropOffset",
      String(offsetY),
      "0",
      ...qualityFlag,
      input,
      "--out",
      output,
    ]);
    return;
  }
  run("sips", ["-Z", String(width), ...qualityFlag, input, "--out", output]);
}

/**
 * Blog art is always landscape. Portrait sources (Řecko, Turecko) would
 * otherwise be scaled by their long edge and end up too narrow for the hero,
 * so every variant is a centre "cover" crop to 8:5 at the requested width.
 */
const ASPECT = 8 / 5;

function cropBox({ width, height }) {
  const cropHeight = Math.min(height, Math.round(width / ASPECT));
  return { x: 0, y: Math.round((height - cropHeight) / 2), width, height: cropHeight };
}

/** Dimensions of the 8:5 variant for a given width. */
function variantSize(targetWidth) {
  return { width: targetWidth, height: Math.max(1, Math.round(targetWidth / ASPECT)) };
}

/** Crop (sips) and resize to exactly width×height in one pass. */
function writeJpegCover(input, output, width, height, quality) {
  run("sips", [
    "-c",
    String(height),
    String(width),
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    String(quality),
    input,
    "--out",
    output,
  ]);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

let generated = 0;
let skipped = 0;
const manifest = { version: 1, generatedAt: new Date().toISOString(), images: {} };

ensureDir(path.join(BLOG_OUT, "hub"));
ensureDir(path.join(BLOG_OUT, "og"));

for (const source of SOURCES) {
  const input = path.join(PUBLIC_DIR, ...source.key.replace("/assets/", "").split("/"));
  if (!fs.existsSync(input)) {
    console.warn(`! missing source ${source.key} — skipped`);
    continue;
  }
  const isHub = source.key.includes("/hub/");
  const outDir = isHub ? path.join(BLOG_OUT, "hub") : BLOG_OUT;
  const variantBase = isHub ? `/assets/blog/hub/${source.slug}` : `/assets/blog/${source.slug}`;
  const sourceSize = readJpegSize(input);

  const entry = { width: sourceSize.width, height: sourceSize.height, webp: [], jpg: [], og: null };

  const box = cropBox(sourceSize);

  for (const edge of JPG_WIDTHS) {
    const { width, height } = variantSize(edge);
    if (width > sourceSize.width) continue;
    const jpgPath = path.join(outDir, `${source.slug}-${edge}.jpg`);
    if (!isFresh(jpgPath, input)) {
      writeJpegCover(input, jpgPath, width, height, JPG_QUALITY);
      generated += 1;
    } else {
      skipped += 1;
    }
    entry.jpg.push({ src: `${variantBase}-${edge}.jpg`, width, height });
  }

  for (const edge of WEBP_WIDTHS) {
    const { width, height } = variantSize(edge);
    if (width > sourceSize.width) continue;
    const webpPath = path.join(outDir, `${source.slug}-${edge}.webp`);
    if (!isFresh(webpPath, input)) {
      // Encoding from the source avoids the double JPEG pass a raster
      // intermediate would add. `-crop` runs before `-resize`, so the crop
      // keeps the frame's aspect instead of squashing a portrait source.
      run("cwebp", [
        "-q",
        String(WEBP_QUALITY),
        "-m",
        "6",
        "-crop",
        String(box.x),
        String(box.y),
        String(box.width),
        String(box.height),
        "-resize",
        String(width),
        String(height),
        "-quiet",
        input,
        "-o",
        webpPath,
      ]);
      generated += 1;
    } else {
      skipped += 1;
    }
    entry.webp.push({ src: `${variantBase}-${edge}.webp`, width, height });
  }

  const ogPath = path.join(BLOG_OUT, "og", `${source.slug}.jpg`);
  const cropWidth = Math.min(OG.width, sourceSize.width);
  const cropHeight = Math.min(OG.height, sourceSize.height);
  if (!isFresh(ogPath, input)) {
    writeJpeg(input, ogPath, {
      width: cropWidth,
      height: cropHeight,
      quality: OG.quality,
      cropTop: source.ogTop,
    });
    generated += 1;
  } else {
    skipped += 1;
  }
  entry.og = `/assets/blog/og/${source.slug}.jpg`;

  manifest.images[source.key] = entry;
}

const sorted = {
  ...manifest,
  images: Object.fromEntries(
    Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b)),
  ),
};
fs.writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);

const totalBytes = Object.values(sorted.images).reduce((sum, entry) => {
  const files = [...entry.jpg, ...entry.webp].map((variant) =>
    path.join(PUBLIC_DIR, ...variant.src.replace("/assets/", "").split("/")),
  );
  files.push(path.join(PUBLIC_DIR, ...entry.og.replace("/assets/", "").split("/")));
  return (
    sum +
    files.reduce((fileSum, file) => {
      try {
        return fileSum + fs.statSync(file).size;
      } catch {
        return fileSum;
      }
    }, 0)
  );
}, 0);

console.log(
  `blog images: ${generated} written, ${skipped} up to date, ${(totalBytes / 1024).toFixed(0)} kB total`,
);
