/**
 * Site-wide public settings used by the server-rendered pages, SEO tags,
 * structured data and analytics.
 *
 * ── TODO values ────────────────────────────────────────────────────────
 * Paste your IDs into the TODO fields below, then rebuild + deploy.
 * Empty strings are skipped (no tag / no script is rendered).
 * See README.md → "SEO: TODO values".
 */
export const SITE = {
  url: "https://sky-travel.tours",
  name: "SkyTravel",
  // TODO: upload a square logo (e.g. client/public/images/logo.png, ≥112×112) and point to it.
  logoUrl: "https://sky-travel.tours/images/blog/og-default.jpg",
  // Social share image, 1200×630.
  ogImage: "https://sky-travel.tours/images/blog/og-default.jpg",

  // Contact — shown in the TravelAgency JSON-LD.
  // TODO: confirm the phone number (taken from the current site header).
  phone: "+420 721 163 860",
  email: "info@skytravel.cz",
  address: {
    streetAddress: "Křižíkova 6",
    addressLocality: "Praha",
    postalCode: "", // TODO: e.g. "186 00"
    addressCountry: "CZ",
  },

  telegramContactUrl: "https://t.me/irinaterenteva_04",
  telegramChannelUrl: "https://t.me/skytravel_tours",
  instagramUrl: "https://instagram.com/skytravel.cz",

  // TODO: Google Analytics 4 measurement ID, e.g. "G-XXXXXXXXXX"
  ga4Id: "",
  // TODO: Google Search Console → "HTML tag" method → content="…" value
  googleSiteVerification: "",
  // TODO: Seznam Webmaster → "meta tag" method → content="…" value
  seznamVerification: "",
} as const;
