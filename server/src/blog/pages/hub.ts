import { plural } from "../html.js";
import { listDestinationHubs, listPostsByDestination, paginatePosts } from "../loader.js";
import {
  breadcrumbs,
  ctaBand,
  hubTile,
  IMAGE_SIZES,
  leadStory,
  pagination,
  postCard,
  sectionHead,
} from "../layout/components.js";
import { breadcrumbLd, hubLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";
import type { DestinationHub } from "../types.js";
import { BLOG_PAGE_SIZE } from "../types.js";

function pagePath(slug: string, page: number): string {
  return page === 1 ? `/blog/destinace/${slug}/` : `/blog/destinace/${slug}/page/${page}/`;
}

export function renderHubPage(hub: DestinationHub, requestedPage = 1): string {
  const posts = listPostsByDestination(hub.czechName);
  const { items, page, totalPages } = paginatePosts(posts, requestedPage, BLOG_PAGE_SIZE);
  const [lead, ...rest] = items;
  const cards = page === 1 ? rest : items;
  const others = listDestinationHubs().filter((item) => item.slug !== hub.slug);

  const content = `<div class="shell">
  ${breadcrumbs([
    { label: "Deník", href: "/blog/" },
    { label: "Destinace", href: "/blog/destinace/" },
    { label: hub.czechName, href: pagePath(hub.slug, 1) },
  ])}
  <header class="page-head">
    <p class="page-head__eyebrow">Destinace</p>
    <h1 class="page-head__title">${hub.czechName}</h1>
    <p class="page-head__lead">${hub.intro}</p>
    <p class="page-head__meta">${plural(hub.count, "článek", "články", "článků")}</p>
  </header>
  ${page === 1 && lead ? leadStory(lead) : ""}
  ${
    cards.length
      ? `<div class="grid">${cards
          .map((post) => postCard(post, { sizes: IMAGE_SIZES.card }))
          .join("")}</div>`
      : ""
  }
  ${pagination({ page, totalPages, hrefFor: (target) => pagePath(hub.slug, target) })}
  <section class="block" aria-labelledby="dalsi-destinace">
    ${sectionHead({
      title: "Další destinace",
      id: "dalsi-destinace",
      moreHref: "/blog/destinace/",
      moreLabel: "Všechny destinace",
    })}
    <ul class="tiles">${others
      .map((item) => {
        const cover = listPostsByDestination(item.czechName)[0];
        return hubTile(item, cover?.cover ?? cover?.hero ?? null);
      })
      .join("")}</ul>
  </section>
  ${ctaBand({
    title: `Zájezdy — ${hub.czechName}`,
    body: "Aktuální termíny a ceny od ověřených dodavatelů. Bez registrace, s možností filtrovat podle data odletu.",
    href: "/",
    label: "Porovnat nabídky",
  })}
</div>`;

  return renderShell({
    head: {
      title: `${hub.czechName} — průvodce, pláže a ceny | SkyTravel`,
      description: hub.intro,
      canonicalPath: pagePath(hub.slug, page),
      ogType: "website",
      image: lead?.hero ?? lead?.cover ?? null,
      prevPath: page > 1 ? pagePath(hub.slug, page - 1) : null,
      nextPath: page < totalPages ? pagePath(hub.slug, page + 1) : null,
      jsonLd: [
        ...hubLd(hub, posts),
        breadcrumbLd([
          { label: "Deník", path: "/blog/" },
          { label: "Destinace", path: "/blog/destinace/" },
          { label: hub.czechName, path: pagePath(hub.slug, 1) },
        ]),
      ],
    },
    active: "destinations",
    bodyClass: "page--hub",
    content,
  });
}
