import { SITE } from "../config/site";
import type { LandingFaq, PageLink } from "../ssr/types";

type JsonLd = Record<string, unknown>;

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);

export function travelAgencyLd(lang: "cs" | "ru"): JsonLd {
  const address: JsonLd = {
    "@type": "PostalAddress",
    streetAddress: SITE.address.streetAddress,
    addressLocality: SITE.address.addressLocality,
    addressCountry: SITE.address.addressCountry,
  };
  if (SITE.address.postalCode) address.postalCode = SITE.address.postalCode;

  const agency: JsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logoUrl,
    image: SITE.ogImage,
    description:
      lang === "ru"
        ? "Туры из Праги от всех чешских туроператоров по их ценам. Подбор тура на русском языке."
        : "Zájezdy z Prahy od všech českých cestovních kanceláří za jejich ceny.",
    email: SITE.email,
    address,
    areaServed: "CZ",
    knowsLanguage: ["cs", "ru"],
    sameAs: [SITE.instagramUrl, SITE.telegramChannelUrl],
  };
  if (SITE.phone) agency.telephone = SITE.phone;
  return agency;
}

export function breadcrumbLd(items: PageLink[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: abs(item.href),
    })),
  };
}

/** Strips tags so FAQ answers written in Markdown/HTML become plain text for schema. */
function plain(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function faqLd(faq: LandingFaq[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: plain(item.q),
      acceptedAnswer: { "@type": "Answer", text: plain(item.a) },
    })),
  };
}

export function renderJsonLd(data: JsonLd): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}
