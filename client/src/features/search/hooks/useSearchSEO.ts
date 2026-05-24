import { useEffect } from "react";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown>;
}

/**
 * Hook for dynamic SEO meta tags based on search state.
 * Updates document title, meta description, canonical URL, and JSON-LD.
 */
export function useSearchSEO({ title, description, canonicalPath, jsonLd }: SEOProps) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
    return () => {
      document.title = "SkyTravel — Levné zájezdy";
    };
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [description]);

  useEffect(() => {
    if (!canonicalPath) return;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}${canonicalPath}`;
    return () => {
      link?.remove();
    };
  }, [canonicalPath]);

  useEffect(() => {
    if (!jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [jsonLd]);
}

/**
 * Builds JSON-LD Product schema for tour search results.
 */
export function buildToursJsonLd(
  tours: Array<{ name: string; price?: number; currency?: string; image?: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: tours.slice(0, 10).map((tour, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: tour.name,
        ...(tour.image && { image: tour.image }),
        ...(tour.price && {
          offers: {
            "@type": "Offer",
            price: tour.price,
            priceCurrency: tour.currency || "CZK",
            availability: "https://schema.org/InStock",
          },
        }),
      },
    })),
  };
}

/**
 * Builds a search-aware page title.
 */
export function buildSearchTitle(
  t: (key: TranslationKey) => string,
  destination?: string,
  resultsCount?: number
): string {
  const parts: string[] = [];
  if (destination) parts.push(destination);
  if (resultsCount !== undefined) parts.push(`${resultsCount} zájezdů`);
  parts.push("SkyTravel");
  return parts.join(" — ");
}
