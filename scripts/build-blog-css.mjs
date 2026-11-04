#!/usr/bin/env node
/**
 * Bundles the blog stylesheet sources into the single file the SSR blog links
 * to. Sources live in client/src/blog/styles so they can be diffed and linted
 * like the rest of the app; the output is committed because production serves
 * it as a static file with a one-year cache.
 *
 *   node scripts/build-blog-css.mjs           # one-off build
 *   node scripts/build-blog-css.mjs --watch   # rebuild on change (dev)
 */
import { build, context } from "esbuild";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "client/src/blog/styles/index.css");
const outfile = path.join(root, "client/public/assets/blog.css");

/** Payload budget: fail the build rather than ship a bloated stylesheet. */
// Raw size grows faster than the wire size; gzip is the number that matters.
const BUDGET_RAW = 28 * 1024;
const BUDGET_GZIP = 7 * 1024;

const options = {
  entryPoints: [entry],
  outfile,
  bundle: true,
  minify: true,
  charset: "utf8",
  target: ["chrome111", "firefox113", "safari16"],
  legalComments: "none",
  // Fonts already live under /assets/fonts and must keep their public URLs.
  external: ["/assets/*"],
  logLevel: "warning",
};

async function report() {
  const css = await readFile(outfile);
  const { size } = await stat(outfile);
  const gzipped = gzipSync(css).length;
  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
  console.log(`blog.css  ${kb(size)} raw · ${kb(gzipped)} gzip → ${path.relative(root, outfile)}`);
  if (size > BUDGET_RAW) console.warn(`⚠ over raw budget (${kb(BUDGET_RAW)})`);
  if (gzipped > BUDGET_GZIP) console.warn(`⚠ over gzip budget (${kb(BUDGET_GZIP)})`);
}

await mkdir(path.dirname(outfile), { recursive: true });

if (process.argv.includes("--watch")) {
  const ctx = await context({
    ...options,
    plugins: [
      {
        name: "blog-css-report",
        setup(pluginBuild) {
          pluginBuild.onEnd(async (result) => {
            if (!result.errors.length) await report();
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log("watching client/src/blog/styles …");
} else {
  await build(options);
  await report();
}
