import { escapeHtml, formatDateCs, readingLabel } from "../html.js";
import { neighbours, relatedPosts } from "../loader.js";
import {
  authorCard,
  breadcrumbs,
  ctaBand,
  destinationHref,
  faqList,
  IMAGE_SIZES,
  keyFacts,
  postKicker,
  relatedList,
  preloadPayload,
  renderPicture,
  sectionHead,
  tocRail,
} from "../layout/components.js";
import { articleLd, breadcrumbLd, faqLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";
import type { BlogPost } from "../types.js";

export function renderArticlePage(post: BlogPost): string {
  const hero = post.hero ?? post.cover;
  const path = `/blog/${post.slug}/`;
  const crumbs = [
    { label: "Deník", href: "/blog/" },
    ...(post.destinationCzechName
      ? [
          {
            label: post.destinationCzechName,
            href: destinationHref(post.destinationCzechName),
          },
        ]
      : []),
    { label: post.title, href: path },
  ];

  const updated =
    post.updatedAt && post.updatedAt !== post.publishedAt
      ? `<span class="post-meta__item">Aktualizováno <time datetime="${post.updatedAt}">${formatDateCs(
          post.updatedAt,
        )}</time></span>`
      : "";

  const { prevPost, nextPost } = neighbours(post.slug);
  const related = relatedPosts(post.slug, { limit: 3 });
  const faq = faqLd(post.faq);

  const content = `<div class="shell">
  ${breadcrumbs(crumbs)}
  <article class="post">
    <header class="post-head">
      ${postKicker(post)}
      <h1 class="post-head__title">${escapeHtml(post.title)}</h1>
      <p class="post-head__dek">${escapeHtml(post.description)}</p>
      <div class="post-meta">
        <span class="post-meta__item">Od <a href="/blog/autor/${post.author.slug}/">${post.author.name}</a></span>
        <span class="post-meta__item"><time datetime="${post.publishedAt}">${formatDateCs(
          post.publishedAt,
        )}</time></span>
        <span class="post-meta__item">${readingLabel(post.readingMinutes)}</span>
        ${updated}
        <button class="share" type="button" data-copy-url="${path}" hidden>Kopírovat odkaz</button>
      </div>
    </header>
    ${hero ? `<figure class="post-hero">${renderPicture(hero, { sizes: IMAGE_SIZES.hero, loading: "eager", credit: true, alt: hero.alt })}</figure>` : ""}
    <div class="post-grid">
      <div class="post-body">
        ${keyFacts(post.keyFacts)}
        <div class="prose">${post.html}</div>
        ${post.faq.length ? `${sectionHead({ title: "Časté otázky", id: "caste-otazky", level: 2 })}${faqList(post.faq)}` : ""}
        ${authorCard(post.author, { reviewedBy: post.reviewedBy })}
      </div>
      <aside class="post-rail">
        ${tocRail(post.toc)}
        <div class="rail-cta">
          <p class="rail-cta__title">Zajímá vás konkrétní termín?</p>
          <p class="rail-cta__body">Porovnejte aktuální zájezdy do této destinace.</p>
          <a class="btn btn--block" href="/">Hledat zájezdy</a>
        </div>
      </aside>
    </div>
    <footer class="post-foot">
      ${sectionHead({ title: "Související články", id: "souvisejici", level: 2 })}
      ${relatedList(related)}
      <nav class="post-nav" aria-label="Další články v Deníku">
        ${
          prevPost
            ? `<a class="post-nav__item" href="/blog/${prevPost.slug}/"><span class="post-nav__label">Předchozí</span><span class="post-nav__title">${prevPost.title}</span></a>`
            : ""
        }
        ${
          nextPost
            ? `<a class="post-nav__item post-nav__item--next" href="/blog/${nextPost.slug}/"><span class="post-nav__label">Následující</span><span class="post-nav__title">${nextPost.title}</span></a>`
            : ""
        }
      </nav>
    </footer>
  </article>
  ${ctaBand({
    title: "Naplánujte cestu podle článku",
    body: "Termíny, hotely a ceny od dodavatelů na jednom místě — bez registrace.",
    href: "/",
    label: "Zobrazit nabídky",
  })}
</div>`;

  return renderShell({
    head: {
      title: `${post.title} | SkyTravel`,
      description: post.description,
      canonicalPath: post.canonicalPath ?? path,
      noindex: post.noindex,
      ogType: "article",
      image: hero,
      preloadImage: hero ? preloadPayload(hero, IMAGE_SIZES.hero) : null,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authorName: post.author.name,
      section: post.destinationCzechName,
      tags: post.tags,
      jsonLd: [
        articleLd(post),
        breadcrumbLd(crumbs.map(({ label, href }) => ({ label, path: href }))),
        ...(faq ? [faq] : []),
      ],
    },
    active: "blog",
    bodyClass: "page--post",
    content,
  });
}
