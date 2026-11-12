import { SITE } from "../config/site";
import { heroImages, heroSrcSet } from "../data";
import { LOCALE_LABELS, PUBLIC_LOCALES, localePath, type PublicLocale } from "../i18n/locales";
import type { SsrPayload } from "../ssr/types";
import { HOME_META, NOT_FOUND_META } from "./homeMeta";
import { breadcrumbLd, faqLd, renderJsonLd, travelAgencyLd } from "./jsonLd";

export interface HeadData {
  title: string;
  description: string;
  /** Absolute canonical URL; omitted on 404. */
  canonical?: string;
  /** Path per language for hreflang. */
  alternates: Partial<Record<PublicLocale, string>>;
  lang: PublicLocale;
  noindex?: boolean;
  jsonLd: Record<string, unknown>[];
  preloadImage?: { href: string; srcset: string };
}

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const abs = (path: string) => `${SITE.url}${path}`;

export function headDataFor(payload: SsrPayload): HeadData {
  const { lang } = payload;
  if (payload.page === "landing" && payload.landing) {
    const page = payload.landing;
    const jsonLd = [travelAgencyLd(lang), breadcrumbLd(page.breadcrumbs)];
    if (page.faq.length > 0) jsonLd.push(faqLd(page.faq));
    return {
      title: page.title,
      description: page.description,
      canonical: abs(page.path),
      alternates: page.alternates,
      lang,
      jsonLd,
    };
  }
  if (payload.page === "home") {
    const alternates = Object.fromEntries(PUBLIC_LOCALES.map((l) => [l, localePath(l)]));
    return {
      title: HOME_META[lang].title,
      description: HOME_META[lang].description,
      canonical: abs(localePath(lang)),
      alternates,
      lang,
      jsonLd: [travelAgencyLd(lang)],
      preloadImage: { href: heroImages[0], srcset: heroSrcSet(heroImages[0]) },
    };
  }
  return {
    title: NOT_FOUND_META[lang].title,
    description: NOT_FOUND_META[lang].description,
    alternates: {},
    lang,
    noindex: true,
    jsonLd: [],
  };
}

/** Renders the <head> tags for a server-rendered page. */
export function renderHead(data: HeadData): string {
  const tags: string[] = [
    `<title>${esc(data.title)}</title>`,
    `<meta name="description" content="${esc(data.description)}" />`,
    `<meta name="robots" content="${data.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}" />`,
  ];

  if (data.canonical) tags.push(`<link rel="canonical" href="${esc(data.canonical)}" />`);

  const alternateEntries = Object.entries(data.alternates) as [PublicLocale, string][];
  if (alternateEntries.length > 0) {
    for (const [lang, path] of alternateEntries) {
      tags.push(`<link rel="alternate" hreflang="${lang}" href="${esc(abs(path))}" />`);
    }
    const xDefault = data.alternates.cs ?? data.alternates[data.lang];
    if (xDefault) {
      tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(abs(xDefault))}" />`);
    }
  }

  tags.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:title" content="${esc(data.title)}" />`,
    `<meta property="og:description" content="${esc(data.description)}" />`,
    `<meta property="og:image" content="${esc(SITE.ogImage)}" />`,
    `<meta property="og:locale" content="${LOCALE_LABELS[data.lang].og}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  );
  if (data.canonical) tags.push(`<meta property="og:url" content="${esc(data.canonical)}" />`);
  for (const [lang] of alternateEntries) {
    if (lang !== data.lang) {
      tags.push(`<meta property="og:locale:alternate" content="${LOCALE_LABELS[lang].og}" />`);
    }
  }

  if (SITE.googleSiteVerification) {
    tags.push(
      `<meta name="google-site-verification" content="${esc(SITE.googleSiteVerification)}" />`,
    );
  }
  if (SITE.seznamVerification) {
    tags.push(`<meta name="seznam-wmt" content="${esc(SITE.seznamVerification)}" />`);
  }

  if (data.preloadImage) {
    tags.push(
      `<link rel="preload" as="image" href="${esc(data.preloadImage.href)}" imagesrcset="${esc(data.preloadImage.srcset)}" imagesizes="100vw" fetchpriority="high" />`,
    );
  }

  for (const ld of data.jsonLd) tags.push(renderJsonLd(ld));

  return tags.join("\n    ");
}
