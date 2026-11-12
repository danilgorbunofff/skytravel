/**
 * Server-side mirror of the SSR contract in client/src/ssr/types.ts.
 * Keep both in sync — the server builds the payload, the client renders it.
 */
export const PUBLIC_LOCALES = ["cs", "ru"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export function isPublicLocale(value: unknown): value is PublicLocale {
  return value === "cs" || value === "ru";
}

export interface PageLink {
  href: string;
  label: string;
}

export interface LandingPageData {
  lang: PublicLocale;
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  bodyHtml: string;
  faq: { q: string; a: string }[];
  related: PageLink[];
  breadcrumbs: PageLink[];
  alternates: Partial<Record<PublicLocale, string>>;
  deals: { destinationSlug: string; lastMinute: boolean; searchHref: string };
  formDestination: string;
  updatedAt: string;
}

export type SsrPage = "home" | "landing" | "notFound";

/** Payload passed to render() in client/dist-ssr/entry-server.js (dict is added there). */
export interface SsrInput {
  path: string;
  lang: PublicLocale;
  page: SsrPage;
  landing?: LandingPageData;
  deals?: unknown[];
  lastMinute?: unknown[];
  ownTours?: unknown[];
  landingIndex?: { path: string; label: string }[];
}

export interface SsrRenderResult {
  html: string;
  head: string;
  data: string;
  htmlLang: string;
}

export interface SsrModule {
  render(input: SsrInput): SsrRenderResult;
}
