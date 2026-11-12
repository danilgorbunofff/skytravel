import type { TocEntry } from "../toc.js";
import {
  escapeHtml,
  formatDateCs,
  formatDateShortCs,
  plural,
  readingLabel,
  srcsetAttr,
} from "../html.js";
import type {
  Author,
  BlogPostMeta,
  DestinationHub,
  FaqItem,
  KeyFact,
  ResolvedImage,
  TagSummary,
} from "../types.js";
import { buildHubSlug } from "../types.js";

/** Breakpoint presets shared by the pages, so `sizes` stays honest and short. */
export const IMAGE_SIZES = {
  /** Lead story: half the 1160px shell on desktop. */
  lead: "(max-width: 880px) 92vw, 560px",
  /** Grid card: three per row on desktop. */
  card: "(max-width: 720px) 92vw, (max-width: 1080px) 46vw, 360px",
  /** Article hero: full prose column. */
  hero: "(max-width: 980px) 92vw, 760px",
  /** Thumbnail in a dense list row. */
  thumb: "(max-width: 640px) 96px, 132px",
} as const;

type PictureOptions = {
  sizes?: string;
  className?: string;
  /** Override the manifest alt — pass "" when the surrounding link already names it. */
  alt?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high";
  /** Renders the credit line under the photo; off inside dense lists. */
  credit?: boolean;
};

/**
 * `<picture>` with a WebP source and a JPEG fallback. Width/height always come
 * from the manifest, so every image reserves its box and cannot shift layout.
 */
export function renderPicture(image: ResolvedImage, options: PictureOptions = {}): string {
  const sizes = options.sizes ?? IMAGE_SIZES.card;
  const alt = options.alt ?? image.alt;
  const classes = options.className ? ` class="${escapeHtml(options.className)}"` : "";
  const position = image.focalPoint
    ? ` style="object-position:${escapeHtml(image.focalPoint)}"`
    : "";
  const priority =
    options.loading === "eager"
      ? ` loading="eager" fetchpriority="${options.fetchPriority ?? "high"}"`
      : ` loading="lazy"`;
  const source = image.webpSrcset
    ? `<source type="image/webp"${srcsetAttr(image.webpSrcset)} sizes="${escapeHtml(sizes)}">`
    : "";
  const picture = `<picture class="media">${source}<img src="${escapeHtml(image.src)}"${srcsetAttr(
    image.jpgSrcset,
  )} sizes="${escapeHtml(sizes)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(
    alt,
  )}"${priority} decoding="async"${classes}${position}></picture>`;
  if (!options.credit || !image.credit) return picture;
  return `${picture}${creditLine(image)}`;
}

export function creditLine(image: ResolvedImage): string {
  if (!image.credit) return "";
  const label = image.creditUrl
    ? `<a href="${escapeHtml(image.creditUrl)}" rel="noopener noreferrer nofollow" target="_blank">${escapeHtml(image.credit)}</a>`
    : escapeHtml(image.credit);
  return `<p class="media-credit">Foto: ${label}</p>`;
}

export function destinationHref(czechName: string): string {
  return `/blog/destinace/${buildHubSlug(czechName)}/`;
}

/** "1. března 2026 · 7 min čtení" — the one meta line used across the blog. */
export function postMeta(post: BlogPostMeta, options: { short?: boolean } = {}): string {
  const date = options.short ? formatDateShortCs(post.publishedAt) : formatDateCs(post.publishedAt);
  return `<p class="meta"><time datetime="${post.publishedAt}">${date}</time><span aria-hidden="true">·</span>${readingLabel(
    post.readingMinutes,
  )}</p>`;
}

/** Kicker link to the destination hub, or the first tag when there is no hub. */
export function postKicker(post: BlogPostMeta): string {
  if (post.destinationCzechName) {
    return `<a class="kicker" href="${destinationHref(post.destinationCzechName)}">${escapeHtml(
      post.destinationCzechName,
    )}</a>`;
  }
  const tag = post.tags[0];
  return tag
    ? `<a class="kicker" href="/blog/tema/${escapeHtml(tag)}/">${escapeHtml(tag)}</a>`
    : "";
}

export type Crumb = { label: string; href?: string };

export function breadcrumbs(items: Crumb[]): string {
  const parts = items.map((item, index) => {
    const last = index === items.length - 1;
    const inner =
      item.href && !last
        ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
        : `<span aria-current="page">${escapeHtml(item.label)}</span>`;
    return `<li>${inner}</li>`;
  });
  return `<nav class="crumbs" aria-label="Drobečková navigace"><ol>${parts.join("")}</ol></nav>`;
}

type SectionHeadOptions = {
  title: string;
  lead?: string | null;
  id?: string;
  moreHref?: string;
  moreLabel?: string;
  level?: 2 | 3;
};

export function sectionHead(options: SectionHeadOptions): string {
  const level = options.level ?? 2;
  const id = options.id ? ` id="${escapeHtml(options.id)}"` : "";
  const lead = options.lead ? `<p class="section-head__lead">${escapeHtml(options.lead)}</p>` : "";
  const more =
    options.moreHref && options.moreLabel
      ? `<a class="section-head__more" href="${escapeHtml(options.moreHref)}">${escapeHtml(
          options.moreLabel,
        )}<span aria-hidden="true"> →</span></a>`
      : "";
  return `<div class="section-head">
  <div>
    <h${level}${id}>${escapeHtml(options.title)}</h${level}>
    ${lead}
  </div>
  ${more}
</div>`;
}

/**
 * Payload for `<link rel="preload" as="image">`. The `<picture>` element picks
 * WebP when it can, so the preload has to advertise the same candidates — a
 * mismatched preload downloads the image twice.
 */
export function preloadPayload(
  image: ResolvedImage,
  sizes: string,
): { src: string; srcset: string; sizes: string } | null {
  const srcset = image.webpSrcset || image.jpgSrcset;
  if (!srcset) return null;
  return { src: image.src, srcset, sizes };
}

/** Lead story: the newest article, given real weight instead of a carousel. */
export function leadStory(post: BlogPostMeta): string {
  const media = post.hero ?? post.cover;
  const image = media
    ? `<div class="lead__media">${renderPicture(media, {
        sizes: IMAGE_SIZES.lead,
        alt: "",
        loading: "eager",
        fetchPriority: "high",
      })}</div>`
    : "";
  return `<article class="lead">
  ${image}
  <div class="lead__body">
    ${postKicker(post)}
    <h2 class="lead__title"><a href="/blog/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h2>
    <p class="lead__dek">${escapeHtml(post.description)}</p>
    ${postMeta(post)}
    <p class="lead__more"><a class="link-arrow" href="/blog/${escapeHtml(post.slug)}/">Číst článek</a></p>
  </div>
</article>`;
}

/** Compact card used in grids and "related" blocks. */
export function postCard(post: BlogPostMeta, options: { sizes?: string } = {}): string {
  const media = post.cover ?? post.hero;
  const image = media
    ? `<div class="card__media">${renderPicture(media, {
        sizes: options.sizes ?? IMAGE_SIZES.card,
        alt: "",
      })}</div>`
    : `<div class="card__media card__media--empty" aria-hidden="true"></div>`;
  return `<article class="card">
  ${image}
  <div class="card__body">
    ${postKicker(post)}
    <h3 class="card__title"><a href="/blog/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h3>
    <p class="card__dek">${escapeHtml(post.description)}</p>
    ${postMeta(post, { short: true })}
  </div>
</article>`;
}

/** Numbered, image-free row — dense scanning for "more articles" lists. */
export function indexRow(post: BlogPostMeta, position: number): string {
  return `<li class="row">
  <span class="row__num" aria-hidden="true">${String(position).padStart(2, "0")}</span>
  <div class="row__body">
    <h3 class="row__title"><a href="/blog/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h3>
    <p class="row__meta">${escapeHtml(
      post.destinationCzechName ?? post.tags[0] ?? "Cestování",
    )}<span aria-hidden="true">·</span><time datetime="${post.publishedAt}">${formatDateShortCs(
      post.publishedAt,
    )}</time></p>
  </div>
</li>`;
}

export function indexList(posts: BlogPostMeta[], startAt = 1): string {
  return `<ol class="row-list">${posts
    .map((post, index) => indexRow(post, startAt + index))
    .join("")}</ol>`;
}

export function hubTile(hub: DestinationHub, cover: ResolvedImage | null): string {
  const image = cover
    ? `<div class="tile__media">${renderPicture(cover, {
        sizes: "(max-width: 640px) 92vw, (max-width: 1080px) 46vw, 280px",
        alt: "",
      })}</div>`
    : "";
  return `<li class="tile">
  <a class="tile__link" href="/blog/destinace/${escapeHtml(hub.slug)}/">
    ${image}
    <span class="tile__body">
      <span class="tile__name">${escapeHtml(hub.czechName)}</span>
      <span class="tile__count">${plural(hub.count, "článek", "články", "článků")}</span>
    </span>
  </a>
</li>`;
}

export function tagChips(tags: TagSummary[], options: { limit?: number } = {}): string {
  const list = options.limit ? tags.slice(0, options.limit) : tags;
  return `<ul class="chips">${list
    .map(
      (tag) =>
        `<li><a class="chip" href="/blog/tema/${escapeHtml(tag.slug)}/">${escapeHtml(tag.name)}<span class="chip__count">${tag.count}</span></a></li>`,
    )
    .join("")}</ul>`;
}

type PagerOptions = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
};

/** Numbered pagination with first/last and a single ellipsis gap. */
export function pagination(options: PagerOptions): string {
  const { page, totalPages, hrefFor } = options;
  if (totalPages <= 1) return "";
  const numbers = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...numbers].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items: string[] = [];
  let previous = 0;
  for (const number of pages) {
    if (previous && number - previous > 1) {
      items.push(`<li class="pager__gap" aria-hidden="true">…</li>`);
    }
    items.push(
      number === page
        ? `<li><span class="pager__link pager__link--current" aria-current="page">${number}</span></li>`
        : `<li><a class="pager__link" href="${escapeHtml(hrefFor(number))}">${number}</a></li>`,
    );
    previous = number;
  }
  const prev =
    page > 1
      ? `<a class="pager__step" rel="prev" href="${escapeHtml(hrefFor(page - 1))}">Předchozí</a>`
      : `<span class="pager__step pager__step--off">Předchozí</span>`;
  const next =
    page < totalPages
      ? `<a class="pager__step" rel="next" href="${escapeHtml(hrefFor(page + 1))}">Další</a>`
      : `<span class="pager__step pager__step--off">Další</span>`;
  return `<nav class="pager" aria-label="Stránkování">${prev}<ol>${items.join("")}</ol>${next}</nav>`;
}

export function keyFacts(facts: KeyFact[]): string {
  if (!facts.length) return "";
  const rows = facts
    .map(
      (fact) =>
        `<div class="facts__row"><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`,
    )
    .join("");
  return `<dl class="facts">${rows}</dl>`;
}

export function faqList(items: FaqItem[]): string {
  if (!items.length) return "";
  return `<div class="faq">${items
    .map(
      (item) =>
        `<details class="faq__item"><summary><h3>${escapeHtml(item.question)}</h3></summary><p>${escapeHtml(
          item.answer,
        )}</p></details>`,
    )
    .join("")}</div>`;
}

export function authorCard(author: Author, options: { reviewedBy?: Author | null } = {}): string {
  const reviewed = options.reviewedBy
    ? `<p class="byline__review">Odborně zkontroloval <a href="/blog/autor/${escapeHtml(
        options.reviewedBy.slug,
      )}/">${escapeHtml(options.reviewedBy.name)}</a></p>`
    : "";
  return `<aside class="byline">
  <div class="byline__text">
    <p class="byline__name"><a href="/blog/autor/${escapeHtml(author.slug)}/">${escapeHtml(
      author.name,
    )}</a></p>
    <p class="byline__role">${escapeHtml(author.role)}</p>
    <p class="byline__bio">${escapeHtml(author.bio)}</p>
    ${reviewed}
  </div>
</aside>`;
}

export function tocRail(toc: TocEntry[]): string {
  if (toc.length < 3) return "";
  return `<nav class="toc" aria-labelledby="toc-title">
  <h2 class="toc__title" id="toc-title">V článku</h2>
  <ol class="toc__list">${toc
    .map(
      (entry) =>
        `<li class="toc__item toc__item--h${entry.level}"><a href="#${escapeHtml(entry.id)}">${escapeHtml(
          entry.text,
        )}</a></li>`,
    )
    .join("")}</ol>
</nav>`;
}

export function relatedList(posts: BlogPostMeta[]): string {
  if (!posts.length) return "";
  return `<ul class="related">${posts
    .map(
      (post) =>
        `<li class="related__item"><a class="related__link" href="/blog/${escapeHtml(
          post.slug,
        )}/"><span class="related__kicker">${escapeHtml(
          post.destinationCzechName ?? post.tags[0] ?? "Cestování",
        )}</span><span class="related__title">${escapeHtml(
          post.title,
        )}</span></a><span class="related__meta">${readingLabel(post.readingMinutes)}</span></li>`,
    )
    .join("")}</ul>`;
}

export function ctaBand(options: {
  title: string;
  body: string;
  href: string;
  label: string;
}): string {
  return `<aside class="cta">
  <div class="cta__text">
    <h2 class="cta__title">${escapeHtml(options.title)}</h2>
    <p class="cta__body">${escapeHtml(options.body)}</p>
  </div>
  <a class="btn" href="${escapeHtml(options.href)}">${escapeHtml(options.label)}</a>
</aside>`;
}

export function emptyState(options: {
  title: string;
  body: string;
  href?: string;
  label?: string;
}): string {
  const action =
    options.href && options.label
      ? `<p><a class="btn" href="${escapeHtml(options.href)}">${escapeHtml(options.label)}</a></p>`
      : "";
  return `<div class="empty">
  <h2 class="empty__title">${escapeHtml(options.title)}</h2>
  <p class="empty__body">${escapeHtml(options.body)}</p>
  ${action}
</div>`;
}

export function searchForm(options: { query?: string; action?: string } = {}): string {
  const action = options.action ?? "/blog/hledat/";
  const value = options.query ? ` value="${escapeHtml(options.query)}"` : "";
  return `<form class="search-form" action="${escapeHtml(action)}" method="get" role="search">
  <label class="search-form__label" for="q">Hledat v článcích</label>
  <div class="search-form__row">
    <input class="search-form__input" id="q" name="q" type="search"${value} autocomplete="off" placeholder="např. pláže v Chorvatsku">
    <button class="btn" type="submit">Hledat</button>
  </div>
</form>`;
}
