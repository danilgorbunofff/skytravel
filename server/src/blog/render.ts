// Server-side HTML rendering for the blog — Phase 15 redesign aligned to main-site system.
// Pure template strings, no client JS (helmet CSP). Treat frontmatter as untrusted.
import type { BlogPost, BlogPostMeta } from "./types.js";
import { destinationSlug } from "./slug.js";
import { addHeadingIdsAndToc, renderTocNav } from "./toc.js";

export const SITE_BASE_URL = "https://sky-travel.tours";

export const OG_IMAGE = {
  path: "/images/blog/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "SkyTravel Blog — průvodce destinacemi",
};

export const UI = {
  blogHome: "Blog",
  homeLink: "Domů",
  searchCta: "Hledat zájezdy",
  searchInto: (name: string) => `Hledat zájezdy do ${declineInto(name)}`,
  updatedOn: "Aktualizováno",
  relatedArticles: (name: string) => `Další články o ${declineAbout(name)}`,
  moreArticles: "Další články",
  byDestination: "Články podle destinace",
  pageOf: (page: number, total: number) => `Strana ${page} z ${total}`,
  previousPage: "Předchozí",
  nextPage: "Další",
  notFoundTitle: "Článek nenalezen",
  notFoundText: "Požadovaný článek neexistuje nebo byl přesunut.",
  readMore: "Číst dále",
  minReadSuffix: "min čtení",
  latestArticles: "Nejnovější články",
  allDestinations: "Všechny destinace",
  tocTitle: "Obsah článku",
  emptyHubTitle: "Průvodce připravujeme",
  emptyHubText:
    "Články o této destinaci právě píšeme. Mezitím se podívejte na aktuální nabídku zájezdů nebo jiné destinace.",
  prevArticle: "Předchozí článek",
  nextArticle: "Další článek",
  notFoundCta: "Zpět na blog",
} as const;

export type BreadcrumbItem = { name: string; url: string };

/** Czech declension of destination names for UI strings (genitive: "do X"). */
const DESTINATION_GENITIVE: Record<string, string> = {
  Bulharsko: "Bulharska",
  Chorvatsko: "Chorvatska",
  Itálie: "Itálie",
  Albánie: "Albánie",
  "Černá Hora": "Černé Hory",
  Řecko: "Řecka",
  Turecko: "Turecka",
  Španělsko: "Španělska",
};

/** Czech declension of destination names for UI strings (locative: "o X"). */
const DESTINATION_LOCATIVE: Record<string, string> = {
  Bulharsko: "Bulharsku",
  Chorvatsko: "Chorvatsku",
  Itálie: "Itálii",
  Albánie: "Albánii",
  "Černá Hora": "Černé Hoře",
  Řecko: "Řecku",
  Turecko: "Turecku",
  Španělsko: "Španělsku",
};

function declineInto(name: string): string {
  return DESTINATION_GENITIVE[name] ?? name;
}

function declineAbout(name: string): string {
  return DESTINATION_LOCATIVE[name] ?? name;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MONTHS_CS = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

function formatDateCs(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return isoDate;
  return `${d}. ${MONTHS_CS[m - 1]} ${y}`;
}

function estimateReadMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function jsonLd(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")}</script>`;
}

type SeoPage = {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  /** 404 and other non-indexable pages: no canonical, meta robots noindex. */
  noindex?: boolean;
};

function head(seo: SeoPage): string {
  const url = `${SITE_BASE_URL}${seo.canonicalPath}`;
  const ogImage = `${SITE_BASE_URL}${OG_IMAGE.path}`;
  const articleMeta =
    (seo.publishedTime
      ? `\n  <meta property="article:published_time" content="${escapeHtml(seo.publishedTime)}" />`
      : "") +
    (seo.modifiedTime
      ? `\n  <meta property="article:modified_time" content="${escapeHtml(seo.modifiedTime)}" />`
      : "");
  const canonicalLink = seo.noindex
    ? `<meta name="robots" content="noindex, follow" />`
    : `<link rel="canonical" href="${escapeHtml(url)}" />`;
  return `<meta charset="utf-8" />
   <meta name="viewport" content="width=device-width, initial-scale=1" />
   <meta name="color-scheme" content="light" />
   <title>${escapeHtml(seo.title)}</title>
   <meta name="description" content="${escapeHtml(seo.description)}" />
   ${canonicalLink}
   <link rel="alternate" type="application/rss+xml" title="SkyTravel Blog — RSS" href="${SITE_BASE_URL}/blog/rss.xml" />
   <link rel="stylesheet" href="/assets/blog.css" />
   <script src="/assets/blog.js" defer></script>
   <link rel="icon" href="/favicon.ico" />
   <meta property="og:site_name" content="SkyTravel" />
   <meta property="og:locale" content="cs_CZ" />
   <meta property="og:type" content="${seo.ogType ?? "website"}" />
   <meta property="og:title" content="${escapeHtml(seo.title)}" />
   <meta property="og:description" content="${escapeHtml(seo.description)}" />
   <meta property="og:url" content="${escapeHtml(url)}" />
   <meta property="og:image" content="${escapeHtml(ogImage)}" />
   <meta property="og:image:width" content="${OG_IMAGE.width}" />
   <meta property="og:image:height" content="${OG_IMAGE.height}" />
   <meta property="og:image:alt" content="${escapeHtml(OG_IMAGE.alt)}" />
   <meta name="twitter:card" content="summary_large_image" />${articleMeta}`;
}

function breadcrumbJsonLd(items: BreadcrumbItem[]): string {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_BASE_URL}${item.url}`,
    })),
  });
}

function breadcrumbNav(items: BreadcrumbItem[]): string {
  return `<nav class="breadcrumb" aria-label="Drobečková navigace"><div class="container"><ol>${items
    .map((item, i) =>
      i < items.length - 1
        ? `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a></li>`
        : `<li><span aria-current="page">${escapeHtml(item.name)}</span></li>`,
    )
    .join("")}</ol></div></nav>`;
}

// Header — 1:1 with site.css, search form links to SPA search
function siteHeader(): string {
  return `<a class="skip-link" href="#blog-main">Přeskočit na obsah</a>
   <header class="site-header">
     <div class="container header-top">
       <a class="logo" href="/" aria-label="SkyTravel — domů"><span class="logo__sky">Sky</span><span class="logo__travel">Travel</span></a>
       <form class="top-search" action="/search" method="get" role="search" aria-label="Hledat zájezdy">
         <input type="search" name="q" placeholder="Kam vyrazíte? Zadejte destinaci nebo hotel" aria-label="Hledat zájezdy" autocomplete="off" />
         <button type="submit" aria-label="Hledat">🔍</button>
       </form>
       <div class="header-contact-wrap">
         <div class="header-contact desktop-only">
           <a href="tel:+420721163860">+420 721 163 860</a>
           <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
         </div>
         <div class="lang-toggle" aria-label="Výběr jazyka">
           <button class="lang-btn is-active" type="button" aria-label="Čeština" aria-pressed="true">🇨🇿</button>
           <button class="lang-btn" type="button" aria-label="English" aria-pressed="false">🇬🇧</button>
         </div>
       </div>
     </div>
     <div class="site-nav-wrapper">
       <div class="container">
         <nav class="main-nav" aria-label="Hlavní navigace">
           <a href="/#vlastni">Exkluzivní nabídky</a>
           <a href="/#allinclusive">Partnerské zájezdy</a>
           <a href="/#destinace">Top destinace</a>
           <a href="/#lastminute">Last minute</a>
           <a href="/blog/" class="is-active" aria-current="page">Blog</a>
           <a href="/#sluzby">Služby</a>
           <a href="/#kontakt">Kontakt</a>
         </nav>
       </div>
     </div>
   </header>`;
}

function siteFooter(): string {
  return `<footer class="footer">
     <div class="container">
       <div class="footer-top-cats">
         <div>
           <h4>Dovolená u moře</h4>
           <p><a href="/search?destinationSlug=bulharsko">Bulharsko</a></p>
           <p><a href="/search?destinationSlug=chorvatsko">Chorvatsko</a></p>
           <p><a href="/search?destinationSlug=recko">Řecko</a></p>
           <p><a href="/search?destinationSlug=turecko">Turecko</a></p>
         </div>
         <div>
           <h4>Středomoří</h4>
           <p><a href="/search?destinationSlug=italie">Itálie</a></p>
           <p><a href="/search?destinationSlug=spanelsko">Španělsko</a></p>
           <p><a href="/search?destinationSlug=cerna-hora">Černá Hora</a></p>
           <p><a href="/search?destinationSlug=albanie">Albánie</a></p>
         </div>
         <div>
           <h4>Užitečné</h4>
           <p><a href="/blog/">Blog — průvodce destinacemi</a></p>
           <p><a href="/blog/destinace/">Všechny destinace</a></p>
           <p><a href="/blog/rss.xml">RSS kanál</a></p>
           <p><a href="/sitemap.xml">Mapa stránek</a></p>
         </div>
         <div>
           <h4>SkyTravel</h4>
           <p>Křižíkova 6, Praha</p>
           <p><a href="tel:+420721163860">+420 721 163 860</a></p>
           <p><a href="mailto:info@skytravel.cz">info@skytravel.cz</a></p>
           <p><a href="/#kontakt">Kontakt &amp; pobočky</a></p>
         </div>
       </div>
       <div class="footer-main">
         <div class="newsletter">
           <h5>Newsletter</h5>
           <p>Chcete tipy na zájezdy a last minute nabídky jako první? Napište nám a zařadíme vás do odběru novinek.</p>
           <a class="newsletter-link" href="/#kontakt">Zapsat se do odběru</a>
         </div>
         <div>
           <h5>Sledujte nás</h5>
           <p>Novinky, inspirace a last minute tipy na sociálních sítích.</p>
           <p><a href="https://www.facebook.com/" target="_blank" rel="noopener">Facebook</a> · <a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></p>
         </div>
         <div>
           <h5>Kontakt</h5>
           <p>SkyTravel — zájezdy do Bulharska, Chorvatska, Itálie, Albánie, Černé Hory, Řecka, Turecka a Španělska.</p>
           <p><a href="mailto:info@skytravel.cz">info@skytravel.cz</a> · <a href="tel:+420721163860">+420 721 163 860</a></p>
         </div>
       </div>
       <div class="footer-bottom">
         <span>© ${new Date().getFullYear()} SkyTravel. Všechna práva vyhrazena.</span>
         <a class="footer-bottom__link" href="/blog/">Blog</a>
         <a class="footer-bottom__link" href="/sitemap.xml">Mapa webu</a>
       </div>
     </div>
   </footer>`;
}

function destinationBadge(name: string, variant: "default" | "hero" = "default"): string {
  const cls = variant === "hero" ? "dest-badge dest-badge--hero" : "dest-badge";
  return `<a class="${cls}" href="/blog/destinace/${destinationSlug(name)}/">${escapeHtml(name)}</a>`;
}

function articleAuthorSignOff(): string {
  return `<div class="prose-end">
     <div class="prose-end__author">
       <div class="prose-end__avatar" aria-hidden="true">ST</div>
       <div>
         <div class="prose-end__name">Tým SkyTravel</div>
         <div class="prose-end__role">Cestovní experti · Praha</div>
       </div>
     </div>
     <span class="prose-end__share">Líbí se vám? Sdílejte článek.</span>
   </div>`;
}

// Local hub images (served from /assets/hub/ — no third-party requests, CSP-safe).
const HUB_IMAGES: Record<string, string> = {
  Bulharsko: "/assets/hub/bulharsko.jpg",
  Chorvatsko: "/assets/hub/chorvatsko.jpg",
  Itálie: "/assets/hub/italie.jpg",
  Albánie: "/assets/hub/albanie.jpg",
  "Černá Hora": "/assets/hub/cerna-hora.jpg",
  Řecko: "/assets/hub/recko.jpg",
  Turecko: "/assets/hub/turecko.jpg",
  Španělsko: "/assets/hub/spanelsko.jpg",
};

const BLOG_HERO_FALLBACK = "/assets/blog/hero-fallback.jpg";

/** Every card reserves image space, so always resolve a cover — never render a blank block. */
function coverFor(post: BlogPostMeta): string {
  return post.coverImage ?? HUB_IMAGES[post.destinationCzechName ?? ""] ?? BLOG_HERO_FALLBACK;
}

function postCard(post: BlogPostMeta, options: { eagerImage?: boolean } = {}): string {
  const url = `/blog/${post.slug}/`;
  const readMin = post.readingMinutes ?? 3;
  const eager = options.eagerImage === true;
  const cover = coverFor(post);
  return `<article class="post-card">
    <a class="post-card__image" href="${url}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(cover)}" alt="" loading="${eager ? "eager" : "lazy"}"${eager ? ' fetchpriority="high"' : ""} width="360" height="202"/></a>
    <div class="post-card__body">
      <div class="post-card__top">
        ${post.destinationCzechName ? destinationBadge(post.destinationCzechName) : ""}
        <span class="post-card__read">${readMin} ${UI.minReadSuffix}</span>
      </div>
      <p class="post-card__date"><time datetime="${escapeHtml(post.publishedAt)}">${formatDateCs(post.publishedAt)}</time></p>
      <h2><a href="${url}">${escapeHtml(post.title)}</a></h2>
      <p class="post-card__excerpt">${escapeHtml(post.description)}</p>
      <div class="post-card__footer">
        <a class="post-card__more" href="${url}">${UI.readMore} →</a>
      </div>
    </div>
   </article>`;
}

/** Search deep-link: the SPA reads the `destinationSlug` query param. */
export function searchUrl(destinationCzechName: string | null): string {
  return destinationCzechName
    ? `/search?destinationSlug=${destinationSlug(destinationCzechName)}`
    : "/search";
}

function ctaBox(
  destinationCzechName: string | null,
  variant: "default" | "hero" = "default",
): string {
  const label = destinationCzechName ? UI.searchInto(destinationCzechName) : UI.searchCta;
  const query = searchUrl(destinationCzechName);
  const cls = variant === "hero" ? "cta-box cta-box--compact" : "cta-box";
  const prompt = destinationCzechName
    ? "Aktuální nabídky a termíny na jednom místě."
    : "Aktuální nabídky, termíny a ceny na jednom místě.";
  return `<aside class="${cls}">
     <h2>${escapeHtml(label)}</h2>
     <p>${escapeHtml(prompt)}</p>
     <a class="cta-btn" href="${query}">Hledat zájezdy <span aria-hidden="true" class="cta-btn__arrow">→</span></a>
   </aside>`;
}

function hubDestinationCards(
  hubs: Array<{ slug: string; czechName: string; count: number }>,
): string {
  if (!hubs.length) return "";
  return `<section class="hub-destinations">
     <div class="hub-destinations__inner">
       <h2>${UI.byDestination}</h2>
       <p class="hub-destinations__lead">Prohlédněte si všechny destinace, pro které máme smlouvy — najdete zde podrobné průvodce, itineráře a tipy.</p>
       <div class="destination-carousel" data-carousel="page">
         <button class="destination-carousel__arrow destination-carousel__arrow--prev" type="button" data-carousel-prev aria-label="Předchozí destinace" disabled>
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
         </button>
         <div class="destination-carousel__track" data-carousel-track>
           <div class="destination-grid destination-grid--carousel">
             ${hubs
               .map(
                 (hub) => `<a class="destination-card" href="/blog/destinace/${hub.slug}/">
                   <img class="destination-card__bg" src="${escapeHtml(HUB_IMAGES[hub.czechName] ?? "/assets/blog/hero-fallback.jpg")}" alt="" loading="lazy" width="1200" height="800"/>
                   <span class="destination-card__body"><h3>${escapeHtml(hub.czechName)}</h3><span class="destination-card__meta"><span class="hub-count-pill">${hub.count} ${hub.count === 1 ? "článek" : hub.count < 5 ? "články" : "článků"}<span class="hub-count-pill__num" aria-hidden="true" style="display:none">(${hub.count})</span></span></span></span>
                 </a>`,
               )
               .join("")}
           </div>
         </div>
         <button class="destination-carousel__arrow destination-carousel__arrow--next" type="button" data-carousel-next aria-label="Další destinace">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
         </button>
       </div>
     </div>
   </section>`;
}

function featuredStrip(posts: BlogPostMeta[]): string {
  if (posts.length < 3) return "";
  const [main, side1, side2] = posts;
  const renderSide = (p: BlogPostMeta) => `<a class="blog-featured__side" href="/blog/${p.slug}/">
     <div class="blog-featured__side-img"><img src="${escapeHtml(coverFor(p))}" alt="" loading="eager" width="800" height="500"/></div>
     <div class="blog-featured__side-body">
        <span class="blog-featured__side-eyebrow">${p.destinationCzechName ? escapeHtml(p.destinationCzechName) : "Další článek"}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <span class="blog-featured__side-meta">${formatDateCs(p.publishedAt)} · ${p.readingMinutes ?? 3} ${UI.minReadSuffix}</span>
     </div>
   </a>`;
  return `<section class="blog-featured" aria-label="Hlavní články">
     <a class="blog-featured__main" href="/blog/${main.slug}/">
       <div class="blog-featured__main-img"><img src="${escapeHtml(coverFor(main))}" alt="" loading="eager" fetchpriority="high" width="800" height="500"/></div>
       <div class="blog-featured__main-body">
         <span class="blog-featured__main-eyebrow">${main.destinationCzechName ? escapeHtml(main.destinationCzechName) : "Hlavní článek"}</span>
         <h2>${escapeHtml(main.title)}</h2>
         <p class="blog-featured__main-excerpt">${escapeHtml(main.description)}</p>
         <div class="blog-featured__main-meta">
           <span><strong>${formatDateCs(main.publishedAt)}</strong></span>
           <span>·</span>
           <span>${main.readingMinutes ?? 3} ${UI.minReadSuffix}</span>
           ${main.destinationCzechName ? `<span>·</span><span>${escapeHtml(main.destinationCzechName)}</span>` : ""}
         </div>
       </div>
     </a>
     ${renderSide(side1)}
     ${renderSide(side2)}
   </section>`;
}

function blogHero(args: {
  title: string;
  intro?: string;
  imageUrl?: string;
  ctaHref?: string;
  ctaLabel?: string;
  eyebrow?: string;
  overlayHub?: boolean;
}): string {
  const bg = args.imageUrl ?? BLOG_HERO_FALLBACK;
  const overlayCls = args.overlayHub
    ? "blog-hero__overlay blog-hero__overlay--hub"
    : "blog-hero__overlay";
  return `<section class="blog-hero" aria-label="${escapeHtml(args.title)}">
     <div class="blog-hero__bg" style="background-image: url('${escapeHtml(bg)}')"></div>
     <div class="${overlayCls}"></div>
     <div class="blog-hero__content">
       ${args.eyebrow ? `<span class="blog-hero__eyebrow">${escapeHtml(args.eyebrow)}</span>` : ""}
       <h1>${escapeHtml(args.title)}</h1>
       ${args.intro ? `<p>${escapeHtml(args.intro)}</p>` : ""}
       ${args.ctaHref ? `<a class="hero__btn" href="${escapeHtml(args.ctaHref)}">${escapeHtml(args.ctaLabel ?? UI.searchCta)}</a>` : ""}
     </div>
   </section>`;
}

function htmlShell(args: {
  seo: SeoPage;
  breadcrumbs?: BreadcrumbItem[];
  body: string;
  jsonLdBlocks?: string[];
}): string {
  return `<!DOCTYPE html>
  <html lang="cs">
 <head>${head(args.seo)}
 </head>
 <body>
 ${siteHeader()}
 <main id="blog-main" class="blog-main">
 ${args.breadcrumbs ? breadcrumbNav(args.breadcrumbs) : ""}
 ${args.body}
 ${(args.jsonLdBlocks ?? []).join("\n")}
 </main>
 ${siteFooter()}
 </body>
 </html>`;
}

export function renderArticlePage(args: {
  post: BlogPost;
  relatedPosts: BlogPostMeta[];
  prevPost?: BlogPostMeta | null;
  nextPost?: BlogPostMeta | null;
}): string {
  const { post } = args;
  const url = `/blog/${post.slug}/`;
  const crumbs: BreadcrumbItem[] = [
    { name: UI.homeLink, url: "/" },
    { name: UI.blogHome, url: "/blog/" },
  ];
  if (post.destinationCzechName) {
    crumbs.push({
      name: post.destinationCzechName,
      url: `/blog/destinace/${destinationSlug(post.destinationCzechName)}/`,
    });
  }
  crumbs.push({ name: post.title, url });
  const readMinutes = post.readingMinutes ?? estimateReadMinutes(post.html);

  // Absolute image URL for JSON-LD / OG — local paths get the site prefix,
  // already-absolute URLs are used as-is.
  const articleImageUrl = post.coverImage
    ? absoluteUrl(post.coverImage)
    : `${SITE_BASE_URL}${OG_IMAGE.path}`;

  const articleLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: "cs-CZ",
    mainEntityOfPage: `${SITE_BASE_URL}${url}`,
    image: articleImageUrl,
    author: { "@type": "Organization", name: "SkyTravel", url: SITE_BASE_URL },
    publisher: { "@type": "Organization", name: "SkyTravel", url: SITE_BASE_URL },
    ...(post.destinationCzechName
      ? { about: { "@type": "Place", name: post.destinationCzechName } }
      : {}),
    wordCount: post.html
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length,
  });

  const related =
    args.relatedPosts.length > 0
      ? `<section class="related-posts"><h2>${
          post.destinationCzechName
            ? escapeHtml(UI.relatedArticles(post.destinationCzechName))
            : UI.moreArticles
        }</h2><ul>${args.relatedPosts
          .map(
            (rel) =>
              `<li class="related-posts__item"><a href="/blog/${rel.slug}/"><span class="related-posts__title">${escapeHtml(rel.title)}</span><span class="related-posts__meta"><time datetime="${escapeHtml(rel.publishedAt)}">${formatDateCs(rel.publishedAt)}</time> · ${rel.readingMinutes ?? 3} ${UI.minReadSuffix}</span></a></li>`,
          )
          .join("")}</ul></section>`
      : "";

  const prevNext =
    args.prevPost || args.nextPost
      ? `<nav class="prev-next" aria-label="Navigace mezi články">
         ${args.prevPost ? `<a class="prev-next__link prev-next__link--prev" href="/blog/${args.prevPost.slug}/"><span class="prev-next__label">${UI.prevArticle}</span><span class="prev-next__title">${escapeHtml(args.prevPost.title)}</span></a>` : "<span></span>"}
         ${args.nextPost ? `<a class="prev-next__link prev-next__link--next" href="/blog/${args.nextPost.slug}/"><span class="prev-next__label">${UI.nextArticle}</span><span class="prev-next__title">${escapeHtml(args.nextPost.title)}</span></a>` : "<span></span>"}
       </nav>`
      : "";

  const { html: bodyWithIds, entries: tocEntries } = addHeadingIdsAndToc(post.html);
  const tocNav = renderTocNav(tocEntries);

  const tags =
    post.tags.length > 0
      ? `<ul class="tag-list">${post.tags.map((t) => `<li>#${escapeHtml(t)}</li>`).join("")}</ul>`
      : "";

  return htmlShell({
    seo: {
      title: `${post.title} | SkyTravel Blog`,
      description: post.description,
      canonicalPath: url,
      ogType: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? undefined,
    },
    breadcrumbs: crumbs,
    body: `<section class="section section-white"><div class="container"><div class="blog-article-layout">
     <article class="blog-article">
     <header class="blog-article__header">
       ${post.destinationCzechName ? destinationBadge(post.destinationCzechName, "hero") : ""}
       <h1>${escapeHtml(post.title)}</h1>
       ${post.description ? `<p class="blog-article__lede">${escapeHtml(post.description)}</p>` : ""}
       <p class="blog-article__meta">
         <span><strong>Tým SkyTravel</strong> · </span>
         <time datetime="${escapeHtml(post.publishedAt)}">${formatDateCs(post.publishedAt)}</time>
         <span>·</span>
         <span>${readMinutes} ${UI.minReadSuffix}</span>
         ${post.updatedAt ? `<span>·</span><span>${UI.updatedOn}: <time datetime="${escapeHtml(post.updatedAt)}">${formatDateCs(post.updatedAt)}</time></span>` : ""}
       </p>
     </header>
     ${post.coverImage ? `<div class="blog-article__cover-wrap"><img class="blog-article__cover" src="${escapeHtml(post.coverImage)}" alt="" width="1200" height="675" fetchpriority="high"/></div>` : ""}
     ${tocNav}
     <div class="prose">${bodyWithIds}</div>
     ${articleAuthorSignOff()}
     ${tags}
     </article>
     <aside class="blog-sidebar">
     ${ctaBox(post.destinationCzechName, "hero")}
     ${related}
     </aside>
     </div></div></section>
     <section class="container prev-next-wrap">${prevNext}</section>
     <section class="section section-soft"><div class="container">${ctaBox(post.destinationCzechName)}</div></section>`,
    jsonLdBlocks: [breadcrumbJsonLd(crumbs), articleLd],
  });
}

/** Local paths become absolute site URLs; already-absolute URLs pass through. */
function absoluteUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? src : `${SITE_BASE_URL}${src}`;
}

export function renderListPage(args: {
  posts: BlogPostMeta[];
  page: number;
  totalPages: number;
  heading: string;
  intro?: string;
  canonicalPath: string;
  hubs?: Array<{ slug: string; czechName: string; count: number }>;
}): string {
  const pagination = renderPagination(args.page, args.totalPages, args.canonicalPath);

  const hubBlock = args.hubs && args.hubs.length > 0 ? hubDestinationCards(args.hubs) : "";

  const isHome = args.canonicalPath === "/blog/";
  const hero = isHome
    ? blogHero({
        title: args.heading,
        intro:
          args.intro ??
          "Průvodce destinacemi, tipy na pláže, výlety a rady před odletem — vše česky.",
        ctaHref: "/search",
        ctaLabel: UI.searchCta,
        eyebrow: "SkyTravel Blog · průvodce na každý den",
      })
    : "";

  // The home hero already carries the single h1 — the list section gets an h2.
  const listHeading = isHome
    ? `<header class="section-head list-header"><div><h2>${escapeHtml(UI.latestArticles)}</h2><p class="section-head__lead">Čerstvé tipy, itineráře a průvodce z našich oblíbených destinací.</p></div></header>`
    : `<header class="section-head list-header"><h1>${escapeHtml(args.heading)}</h1>${
        args.intro ? `<p class="section-subtitle list-intro">${escapeHtml(args.intro)}</p>` : ""
      }</header>`;

  // On home: featured strip + remaining posts grid (no stats bar).
  // On other list pages: standard grid.
  const homeFeatured = isHome ? featuredStrip(args.posts) : "";
  const homeFeaturedIds = new Set(isHome ? args.posts.slice(0, 3).map((p) => p.slug) : []);
  const remainingPosts = isHome
    ? args.posts.filter((p) => !homeFeaturedIds.has(p.slug))
    : args.posts;

  const cards = remainingPosts.map((p, i) => postCard(p, { eagerImage: isHome && i < 3 })).join("");

  const gridBlock =
    remainingPosts.length > 0
      ? isHome
        ? `<div class="post-carousel" data-carousel>
              <button class="post-carousel__arrow post-carousel__arrow--prev" type="button" data-carousel-prev aria-label="Předchozí články" disabled>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="post-carousel__track" data-carousel-track>
                <div class="post-grid post-grid--carousel">${cards}</div>
              </div>
              <button class="post-carousel__arrow post-carousel__arrow--next" type="button" data-carousel-next aria-label="Další články">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>`
        : `<div class="post-grid${remainingPosts.length === 1 ? " post-grid--single" : ""}">${cards}</div>`
      : isHome
        ? ""
        : renderEmptyList();

  const listBody = `${hero}
     ${isHome ? homeFeatured : ""}
     <section class="section ${isHome ? "section-white" : "section-soft"}"><div class="container">
     ${listHeading}
     ${gridBlock}
     ${pagination}
     </div></section>
     ${isHome && hubBlock ? `<div class="container">${hubBlock}</div>` : ""}
     ${!isHome && hubBlock ? hubBlock : ""}`;

  const itemListLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: args.posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_BASE_URL}/blog/${p.slug}/`,
      name: p.title,
    })),
  });

  return htmlShell({
    seo: {
      title:
        args.page > 1
          ? `${args.heading} — strana ${args.page} | SkyTravel Blog`
          : `${args.heading} | SkyTravel Blog`,
      description: args.intro ?? args.heading,
      canonicalPath: args.canonicalPath,
    },
    breadcrumbs:
      args.canonicalPath !== "/blog/"
        ? [
            { name: UI.homeLink, url: "/" },
            { name: UI.blogHome, url: "/blog/" },
            { name: args.heading, url: args.canonicalPath },
          ]
        : undefined,
    body: listBody,
    jsonLdBlocks: [jsonLd(blogSchema()), itemListLd],
  });
}

/** Friendly empty state with CTA instead of a bare sentence. */
function renderEmptyList(): string {
  return `<div class="empty-state">
     <p class="empty-state__title">${UI.emptyHubTitle}</p>
     <p class="empty-state__text">${UI.emptyHubText}</p>
     <p><a class="cta-btn" href="/search">${UI.searchCta}</a> <a class="cta-btn cta-btn--ghost" href="/blog/destinace/">${UI.allDestinations}</a></p>
   </div>`;
}

function blogSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "SkyTravel Blog",
    inLanguage: "cs-CZ",
    url: `${SITE_BASE_URL}/blog/`,
    publisher: { "@type": "Organization", name: "SkyTravel", url: SITE_BASE_URL },
  };
}

function collectionSchema(name: string, path: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    inLanguage: "cs-CZ",
    url: `${SITE_BASE_URL}${path}`,
    isPartOf: { "@type": "Blog", name: "SkyTravel Blog", url: `${SITE_BASE_URL}/blog/` },
  };
}

/** Pagination URLs match the express routes: page 1 = base, else `${base}page/N/`. */
function pageUrl(basePath: string, n: number): string {
  return n === 1 ? basePath : `${basePath}page/${n}/`;
}

function renderPagination(page: number, totalPages: number, basePath: string): string {
  if (totalPages <= 1) return "";
  const prev =
    page > 1
      ? `<a rel="prev" href="${pageUrl(basePath, page - 1)}" aria-label="Předchozí strana">${UI.previousPage}</a>`
      : "";
  const next =
    page < totalPages
      ? `<a rel="next" href="${pageUrl(basePath, page + 1)}" aria-label="Další strana">${UI.nextPage}</a>`
      : "";
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .map((n) =>
      n === page
        ? `<span class="page-current" aria-current="page" aria-label="Strana ${n}">${n}</span>`
        : `<a href="${pageUrl(basePath, n)}" aria-label="Strana ${n}">${n}</a>`,
    )
    .join("");
  return `<nav class="pagination" aria-label="Stránkování">${prev}<span class="pages">${pages}</span>${next}</nav><p class="pagination-info">${UI.pageOf(page, totalPages)}</p>`;
}

export function renderHubPage(args: {
  destinationName: string;
  intro: string;
  posts: BlogPostMeta[];
  page: number;
  totalPages: number;
  otherHubs: Array<{ slug: string; czechName: string; count: number }>;
}): string {
  const basePath = `/blog/destinace/${destinationSlug(args.destinationName)}/`;
  const crumbs: BreadcrumbItem[] = [
    { name: UI.homeLink, url: "/" },
    { name: UI.blogHome, url: "/blog/" },
    { name: args.destinationName, url: basePath },
  ];
  const others = args.otherHubs.length > 0 ? hubDestinationCards(args.otherHubs) : "";

  const hubImage = HUB_IMAGES[args.destinationName] ?? BLOG_HERO_FALLBACK;
  // Canonical reflects the paginated URL (page 1 = hub base).
  const canonicalPath = args.page > 1 ? `${basePath}page/${args.page}/` : basePath;

  return htmlShell({
    seo: {
      title:
        args.page > 1
          ? `Zájezdy a články: ${args.destinationName} — strana ${args.page} | SkyTravel Blog`
          : `Zájezdy a články: ${args.destinationName} | SkyTravel Blog`,
      description: args.intro,
      canonicalPath,
    },
    breadcrumbs: crumbs,
    body: `${blogHero({ title: args.destinationName, intro: args.intro, ctaHref: searchUrl(args.destinationName), ctaLabel: UI.searchInto(args.destinationName), imageUrl: hubImage, eyebrow: "Destinace · průvodce", overlayHub: true })}
     <section class="section section-white"><div class="container">
     ${
       args.posts.length > 0
         ? `<header class="hub-bar">
       <h2 class="hub-bar__title">Nejnovější články o ${escapeHtml(declineAbout(args.destinationName))}</h2>
       <span class="hub-bar__count">${args.posts.length === 1 ? "1 článek" : args.posts.length < 5 ? `${args.posts.length} články` : `${args.posts.length} článků`}</span>
     </header>
     <div class="post-grid${args.posts.length === 1 ? " post-grid--single" : ""}">${args.posts.map((p, i) => postCard(p, { eagerImage: i < 3 })).join("")}</div>`
         : renderEmptyList()
     }
     ${renderPagination(args.page, args.totalPages, basePath)}
     ${others}
     ${ctaBox(args.destinationName, "hero")}
     </div></section>`,
    jsonLdBlocks: [
      breadcrumbJsonLd(crumbs),
      jsonLd(collectionSchema(args.destinationName, basePath)),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: args.posts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_BASE_URL}/blog/${p.slug}/`,
          name: p.title,
        })),
      }),
    ],
  });
}

export function renderNotFoundPage(message?: string): string {
  const crumbs: BreadcrumbItem[] = [
    { name: UI.homeLink, url: "/" },
    { name: UI.blogHome, url: "/blog/" },
    { name: UI.notFoundTitle, url: "/blog/" },
  ];
  return htmlShell({
    seo: {
      title: `${UI.notFoundTitle} | SkyTravel Blog`,
      description: UI.notFoundText,
      canonicalPath: "/blog/",
      noindex: true,
    },
    breadcrumbs: crumbs,
    body: `<section class="section section-white"><div class="container"><section class="not-found">
     <div class="not-found__art" aria-hidden="true">🧳</div>
     <h1>${UI.notFoundTitle}</h1>
     <p>${escapeHtml(message ?? UI.notFoundText)}</p>
     <div class="not-found__ctas">
       <a class="cta-btn" href="/blog/">${UI.notFoundCta}</a>
       <a class="cta-btn cta-btn--ghost" href="/">${UI.searchCta}</a>
     </div>
   </section></div></section>`,
  });
}

/** /blog/destinace/ — index of all destination hubs with their latest articles. */
export function renderDestinationsIndexPage(args: {
  hubs: Array<{ slug: string; czechName: string; count: number; latest: BlogPostMeta[] }>;
}): string {
  const crumbs: BreadcrumbItem[] = [
    { name: UI.homeLink, url: "/" },
    { name: UI.blogHome, url: "/blog/" },
    { name: UI.allDestinations, url: "/blog/destinace/" },
  ];

  const cards = args.hubs
    .map((hub) => {
      const image = HUB_IMAGES[hub.czechName] ?? BLOG_HERO_FALLBACK;
      const latest = hub.latest
        .slice(0, 3)
        .map(
          (p) =>
            `<li><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a><span class="hub-index__meta"> · ${p.readingMinutes ?? 3} ${UI.minReadSuffix}</span></li>`,
        )
        .join("");
      return `<article class="hub-index__card">
       <a class="hub-index__link" href="/blog/destinace/${hub.slug}/">
         <img class="hub-index__bg" src="${escapeHtml(image)}" alt="" loading="lazy" width="1200" height="800"/>
         <span class="hub-index__overlay">
           <span class="hub-index__body">
             <h2>${escapeHtml(hub.czechName)}</h2>
             <span class="hub-count-pill">${hub.count} ${hub.count === 1 ? "článek" : hub.count < 5 ? "články" : "článků"}</span>
           </span>
         </span>
       </a>
       ${latest ? `<ul class="hub-index__latest">${latest}</ul>` : ""}
     </article>`;
    })
    .join("");

  return htmlShell({
    seo: {
      title: `${UI.allDestinations} | SkyTravel Blog`,
      description:
        "Vyberte destinaci a přečtěte si průvodce, tipy na pláže i výlety od našich redaktorů.",
      canonicalPath: "/blog/destinace/",
    },
    breadcrumbs: crumbs,
    body: `<section class="section section-white"><div class="container">
     <header class="section-head list-header"><h1>${UI.allDestinations}</h1><p class="section-subtitle list-intro">Vyberte destinaci a přečtěte si průvodce, tipy na pláže i výlety od našich redaktorů.</p></header>
     <div class="hub-index">${cards}</div>
     ${ctaBox(null)}
   </div></section>`,
    jsonLdBlocks: [
      breadcrumbJsonLd(crumbs),
      jsonLd(collectionSchema(UI.allDestinations, "/blog/destinace/")),
    ],
  });
}

/** RSS 2.0 feed of published posts (newest first). */
export function renderRss(posts: BlogPostMeta[]): string {
  const items = posts
    .map(
      (post) => `<item>
       <title>${escapeHtml(post.title)}</title>
       <link>${SITE_BASE_URL}/blog/${post.slug}/</link>
       <guid isPermaLink="true">${SITE_BASE_URL}/blog/${post.slug}/</guid>
       <pubDate>${new Date(`${post.publishedAt}T09:00:00+02:00`).toUTCString()}</pubDate>
       <description>${escapeHtml(post.description)}</description>
     </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
 <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
 <channel>
 <title>SkyTravel Blog</title>
 <link>${SITE_BASE_URL}/blog/</link>
 <description>Praktické průvodce destinacemi, pláže, tipy na výlety a rady před dovolenou.</description>
 <language>cs</language>
 <atom:link href="${SITE_BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
 ${items}
 </channel>
 </rss>`;
}
