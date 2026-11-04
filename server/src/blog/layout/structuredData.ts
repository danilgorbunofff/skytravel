import { SITE_BASE_URL, absoluteUrl, formatDateCs } from "../html.js";
import type { BlogPost, BlogPostMeta, DestinationHub, FaqItem } from "../types.js";

const PUBLISHER = {
  "@type": "Organization",
  "@id": `${SITE_BASE_URL}/#organization`,
  name: "SkyTravel",
  url: SITE_BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_BASE_URL}/images/blog/logo.svg`,
    width: 480,
    height: 120,
  },
};

const BLOG = {
  "@type": "Blog",
  "@id": `${SITE_BASE_URL}/blog/#blog`,
  name: "SkyTravel Cestovní deník",
  url: `${SITE_BASE_URL}/blog/`,
  inLanguage: "cs-CZ",
  publisher: { "@id": `${SITE_BASE_URL}/#organization` },
};

export type CrumbLd = { label: string; path: string };

export function breadcrumbLd(crumbs: CrumbLd[]): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function blogHomeLd(options: { description: string }): unknown[] {
  return [
    { "@context": "https://schema.org", ...BLOG, description: options.description },
    { "@context": "https://schema.org", ...PUBLISHER },
  ];
}

export function articleLd(post: BlogPost): unknown {
  const canonical = absoluteUrl(`/blog/${post.slug}/`);
  const image = post.hero ?? post.cover;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    ...(image ? { image: [absoluteUrl(image.og ?? image.src)] } : {}),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author.name,
      url: absoluteUrl(`/blog/autor/${post.author.slug}/`),
    },
    publisher: PUBLISHER,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    isPartOf: { "@id": `${SITE_BASE_URL}/blog/#blog` },
    ...(post.destinationCzechName ? { articleSection: post.destinationCzechName } : {}),
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingMinutes}M`,
    inLanguage: "cs-CZ",
    isAccessibleForFree: true,
    ...(post.updatedAt
      ? { creditText: `Aktualizováno ${formatDateCs(post.updatedAt)} — ${post.author.name}` }
      : {}),
  };
}

export function faqLd(items: FaqItem[]): unknown | null {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** ItemList for hub/tag/author listings — helps the crawler see the ordering. */
export function listLd(options: { name: string; path: string; posts: BlogPostMeta[] }): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: options.name,
    url: absoluteUrl(options.path),
    numberOfItems: options.posts.length,
    itemListElement: options.posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/blog/${post.slug}/`),
      name: post.title,
    })),
  };
}

export function hubLd(hub: DestinationHub, posts: BlogPostMeta[]): unknown[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Blog — ${hub.czechName}`,
      description: hub.intro,
      url: absoluteUrl(`/blog/destinace/${hub.slug}/`),
      inLanguage: "cs-CZ",
      isPartOf: { "@id": `${SITE_BASE_URL}/blog/#blog` },
    },
    listLd({ name: hub.czechName, path: `/blog/destinace/${hub.slug}/`, posts }),
  ];
}
