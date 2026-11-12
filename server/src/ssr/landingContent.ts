import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { PUBLIC_LOCALES, type PublicLocale, type LandingPageData } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Landing pages live in server/content/pages/<lang>/<slug>.md
 * (nested slugs: server/content/pages/ru/egipet/hurgada.md → /ru/egipet/hurgada/).
 * See README → "Adding a landing page".
 */
export const PAGES_CONTENT_DIR = path.resolve(__dirname, "../../content/pages");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

const HOME_LABEL: Record<PublicLocale, string> = { cs: "SkyTravel", ru: "SkyTravel" };

const linkSchema = z.object({
  href: z.string().regex(/^\/[a-z0-9/_-]*$|^https?:\/\//, "href must be a site path or URL"),
  label: z.string().min(1),
});

const frontmatterSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(50),
  h1: z.string().min(3),
  intro: z.string().default(""),
  breadcrumb: z.string().optional(),
  /** Same page in other languages: { cs: "egypt" } (slug, without slashes). */
  alternates: z.record(z.string(), z.string()).default({}),
  deals: z
    .object({
      destinationSlug: z.string().default(""),
      lastMinute: z.boolean().default(false),
    })
    .default({ destinationSlug: "", lastMinute: false }),
  formDestination: z.string().default(""),
  showOnHome: z.boolean().default(false),
  homeLabel: z.string().optional(),
  faq: z.array(z.object({ q: z.string().min(3), a: z.string().min(3) })).default([]),
  related: z.array(linkSchema).default([]),
  updated: z.union([z.string(), z.date()]).optional(),
  draft: z.boolean().default(false),
});

export type LandingFrontmatter = z.infer<typeof frontmatterSchema>;

interface LoadedPage {
  data: LandingPageData;
  showOnHome: boolean;
  homeLabel: string;
  crumb: string;
}

let cache: Map<string, LoadedPage> | null = null;

const key = (lang: PublicLocale, slug: string) => `${lang}:${slug}`;
export const landingPath = (lang: PublicLocale, slug: string) => `/${lang}/${slug}/`;

function renderMarkdown(source: string): string {
  // Page H1 comes from front-matter; demote any "# " heading in the body.
  return (marked.parse(source, { async: false }) as string)
    .replace(/<h1(\s|>)/g, "<h2$1")
    .replace(/<\/h1>/g, "</h2>");
}

function toIsoDate(value: string | Date | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Parses one markdown file. Exported for tests. */
export function parseLandingPage(
  lang: PublicLocale,
  slug: string,
  raw: string,
): { page: LandingPageData; frontmatter: LandingFrontmatter } {
  const parsed = matter(raw);
  const fm = frontmatterSchema.parse(parsed.data);
  const path_ = landingPath(lang, slug);

  const alternates: Partial<Record<PublicLocale, string>> = { [lang]: path_ };
  for (const [altLang, altSlug] of Object.entries(fm.alternates)) {
    if ((PUBLIC_LOCALES as readonly string[]).includes(altLang) && SLUG_RE.test(altSlug)) {
      alternates[altLang as PublicLocale] = landingPath(altLang as PublicLocale, altSlug);
    }
  }

  const page: LandingPageData = {
    lang,
    slug,
    path: path_,
    title: fm.title,
    description: fm.description,
    h1: fm.h1,
    intro: fm.intro,
    bodyHtml: renderMarkdown(parsed.content),
    faq: fm.faq.map((item) => ({
      q: item.q,
      a: marked.parseInline(item.a, { async: false }) as string,
    })),
    related: fm.related,
    breadcrumbs: [], // filled in once all pages are known (parents need their labels)
    alternates,
    deals: {
      destinationSlug: fm.deals.destinationSlug,
      lastMinute: fm.deals.lastMinute,
      searchHref: fm.deals.destinationSlug
        ? `/search?destinationSlug=${encodeURIComponent(fm.deals.destinationSlug)}`
        : "/search",
    },
    formDestination: fm.formDestination,
    updatedAt: toIsoDate(fm.updated),
  };
  return { page, frontmatter: fm };
}

/** Length checks from the SEO brief. Logged, never fatal. */
export function seoWarnings(page: LandingPageData): string[] {
  const warnings: string[] = [];
  if (page.title.length < 50 || page.title.length > 60) {
    warnings.push(`title is ${page.title.length} chars (target 50–60)`);
  }
  if (page.description.length < 150 || page.description.length > 160) {
    warnings.push(`description is ${page.description.length} chars (target 150–160)`);
  }
  return warnings;
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
  });
}

function loadAll(): Map<string, LoadedPage> {
  const pages = new Map<string, LoadedPage>();
  for (const lang of PUBLIC_LOCALES) {
    const langDir = path.join(PAGES_CONTENT_DIR, lang);
    for (const file of walk(langDir)) {
      const slug = path
        .relative(langDir, file)
        .replace(/\\/g, "/")
        .replace(/\.md$/, "")
        .replace(/\/index$/, "");
      if (!SLUG_RE.test(slug)) {
        logger.warn(
          { file },
          "landing page skipped: file name must be lowercase ASCII (a-z, 0-9, -)",
        );
        continue;
      }
      try {
        const { page, frontmatter } = parseLandingPage(lang, slug, fs.readFileSync(file, "utf8"));
        if (frontmatter.draft) continue;
        for (const warning of seoWarnings(page))
          logger.warn({ page: page.path }, `SEO: ${warning}`);
        pages.set(key(lang, slug), {
          data: page,
          showOnHome: frontmatter.showOnHome,
          homeLabel: frontmatter.homeLabel ?? frontmatter.breadcrumb ?? page.h1,
          crumb: frontmatter.breadcrumb ?? page.h1,
        });
      } catch (err) {
        logger.error({ err, file }, "landing page skipped: invalid front-matter");
      }
    }
  }

  // Breadcrumbs: home → existing parent pages → current page.
  for (const loadedPage of pages.values()) {
    const { data } = loadedPage;
    const parts = data.slug.split("/");
    const trail = [{ href: `/${data.lang}/`, label: HOME_LABEL[data.lang] }];
    for (let i = 1; i < parts.length; i++) {
      const parentSlug = parts.slice(0, i).join("/");
      const parent = pages.get(key(data.lang, parentSlug));
      if (parent) trail.push({ href: parent.data.path, label: crumbLabel(parent) });
    }
    trail.push({ href: data.path, label: crumbLabel(loadedPage) });
    data.breadcrumbs = trail;
  }

  // Drop hreflang alternates that point to pages that don't exist.
  for (const { data } of pages.values()) {
    const valid: Partial<Record<PublicLocale, string>> = {};
    for (const [altLang, altPath] of Object.entries(data.alternates) as [PublicLocale, string][]) {
      const altSlug = altPath.split("/").slice(2).filter(Boolean).join("/");
      if (altLang === data.lang || pages.has(key(altLang, altSlug))) {
        valid[altLang] = altPath;
      } else {
        logger.warn({ page: data.path, missing: altPath }, "landing alternate not found");
      }
    }
    data.alternates = valid;
  }
  return pages;
}

function crumbLabel(page: LoadedPage): string {
  return page.crumb;
}

function store(): Map<string, LoadedPage> {
  // Production: read once. Development: re-read so content edits show instantly.
  if (!cache || process.env.NODE_ENV !== "production") cache = loadAll();
  return cache;
}

export function getLandingPage(lang: PublicLocale, slug: string): LandingPageData | null {
  if (!SLUG_RE.test(slug)) return null;
  return store().get(key(lang, slug))?.data ?? null;
}

export function listLandingPages(): LandingPageData[] {
  return [...store().values()].map((p) => p.data);
}

/** Pages flagged `showOnHome: true`, for internal links from the home page. */
export function homeLinks(lang: PublicLocale): { path: string; label: string }[] {
  return [...store().values()]
    .filter((p) => p.data.lang === lang && p.showOnHome)
    .map((p) => ({ path: p.data.path, label: p.homeLabel }));
}

/** For tests. */
export function resetLandingCache(): void {
  cache = null;
}
