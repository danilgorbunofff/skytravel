import { TAG_INTROS } from "../content.js";
import { plural } from "../html.js";
import { listIndexableTags, listPostsByTag, paginatePosts } from "../loader.js";
import {
  breadcrumbs,
  ctaBand,
  IMAGE_SIZES,
  pagination,
  postCard,
  sectionHead,
} from "../layout/components.js";
import { breadcrumbLd, listLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";
import type { TagSummary } from "../types.js";
import { BLOG_PAGE_SIZE, MIN_TAG_POSTS } from "../types.js";

function pagePath(slug: string, page: number): string {
  return page === 1 ? `/blog/tema/${slug}/` : `/blog/tema/${slug}/page/${page}/`;
}

export function renderTagPage(tag: TagSummary, requestedPage = 1): string {
  const posts = listPostsByTag(tag.slug);
  const { items, page, totalPages } = paginatePosts(posts, requestedPage, BLOG_PAGE_SIZE);
  const intro = TAG_INTROS[tag.slug] ?? `Všechny články na téma ${tag.name}.`;
  const thin = tag.count < MIN_TAG_POSTS;
  const others = listIndexableTags().filter((item) => item.slug !== tag.slug);

  const content = `<div class="shell">
  ${breadcrumbs([
    { label: "Deník", href: "/blog/" },
    { label: tag.name, href: pagePath(tag.slug, 1) },
  ])}
  <header class="page-head">
    <p class="page-head__eyebrow">Téma</p>
    <h1 class="page-head__title">${tag.name}</h1>
    <p class="page-head__lead">${intro}</p>
    <p class="page-head__meta">${plural(tag.count, "článek", "články", "článků")}</p>
  </header>
  ${thin ? `<p class="note">Téma zatím nemá dost článků na samostatnou stránku — projděte zatím dostupné texty níže.</p>` : ""}
  <div class="grid">${items.map((post) => postCard(post, { sizes: IMAGE_SIZES.card })).join("")}</div>
  ${pagination({ page, totalPages, hrefFor: (target) => pagePath(tag.slug, target) })}
  ${
    others.length
      ? `<section class="block" aria-labelledby="dalsi-temata">
    ${sectionHead({ title: "Další témata", id: "dalsi-temata" })}
    <ul class="chips">${others
      .map(
        (item) =>
          `<li><a class="chip" href="/blog/tema/${item.slug}/">${item.name}<span class="chip__count">${item.count}</span></a></li>`,
      )
      .join("")}</ul>
  </section>`
      : ""
  }
  ${ctaBand({
    title: `Zájezdy podle tématu`,
    body: "Vyberte si termín a destinaci — ceny a dostupnost vidíte hned.",
    href: "/",
    label: "Zobrazit nabídky",
  })}
</div>`;

  return renderShell({
    head: {
      title: `${tag.name} — články a rady | SkyTravel`,
      description: intro,
      canonicalPath: pagePath(tag.slug, page),
      noindex: thin,
      ogType: "website",
      image: posts[0]?.cover ?? posts[0]?.hero ?? null,
      prevPath: page > 1 ? pagePath(tag.slug, page - 1) : null,
      nextPath: page < totalPages ? pagePath(tag.slug, page + 1) : null,
      jsonLd: [
        listLd({ name: tag.name, path: pagePath(tag.slug, 1), posts }),
        breadcrumbLd([
          { label: "Deník", path: "/blog/" },
          { label: tag.name, path: pagePath(tag.slug, 1) },
        ]),
      ],
    },
    active: "blog",
    bodyClass: "page--tag",
    content,
  });
}
