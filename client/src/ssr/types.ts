import type { AlexandriaLastMinuteItem } from "../api";
import type { OwnTour } from "../data";
import type { PublicLocale } from "../i18n/locales";
import type { TranslationDict } from "../i18n/localeContextValue";
import type { UnifiedTour } from "../types/providers";

export interface PageLink {
  href: string;
  label: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

/** A landing page as produced by the server from server/content/pages/<lang>/<slug>.md */
export interface LandingPageData {
  lang: PublicLocale;
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  bodyHtml: string;
  faq: LandingFaq[];
  related: PageLink[];
  /** Full breadcrumb trail including home and the current page. */
  breadcrumbs: PageLink[];
  /** Equivalent page path per language, e.g. { cs: "/cs/egypt/", ru: "/ru/egipet/" } */
  alternates: Partial<Record<PublicLocale, string>>;
  deals: {
    /** KNOWN_DESTINATIONS slug used to filter live offers (empty = all destinations). */
    destinationSlug: string;
    /** Only departures in the next ~3 weeks. */
    lastMinute: boolean;
    /** Search page link for "show all offers". */
    searchHref: string;
  };
  /** Destination name pre-filled in the lead form. */
  formDestination: string;
  updatedAt: string;
}

/** Short entry used to link landing pages from the home page. */
export interface LandingSummary {
  path: string;
  label: string;
}

export type SsrPage = "home" | "landing" | "notFound";

/** Everything the server hands to the React app for one request. */
export interface SsrPayload {
  path: string;
  lang: PublicLocale;
  page: SsrPage;
  dict?: TranslationDict;
  landing?: LandingPageData;
  deals?: UnifiedTour[];
  lastMinute?: AlexandriaLastMinuteItem[];
  ownTours?: OwnTour[];
  landingIndex?: LandingSummary[];
}

export const SSR_DATA_ELEMENT_ID = "__SSR_DATA__";
