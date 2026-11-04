import { BLOG_HOME_INTRO, BLOG_HOME_LEAD, BLOG_HOME_TITLE } from "../content.js";
import { plural } from "../html.js";
import {
  blogStats,
  listDestinationHubs,
  listIndexableTags,
  listPublishedPosts,
  paginatePosts,
} from "../loader.js";
import {
  ctaBand,
  hubTile,
  IMAGE_SIZES,
  leadStory,
  preloadPayload,
  pagination,
  postCard,
  sectionHead,
  tagChips,
} from "../layout/components.js";
import { blogHomeLd, breadcrumbLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";
import { BLOG_PAGE_SIZE } from "../types.js";

function pagePath(page: number): string {
  return page === 1 ? "/blog/" : `/blog/page/${page}/`;
}

export function renderIndexPage(requestedPage = 1): string {
  const stats = blogStats();
  const { items, page, totalPages } = paginatePosts(
    listPublishedPosts(),
    requestedPage,
    BLOG_PAGE_SIZE,
  );
  const hubs = listDestinationHubs();
  const [lead, ...rest] = items;
  const cards = page === 1 ? rest : items;
  const leadMedia = page === 1 && lead ? (lead.hero ?? lead.cover) : null;

  const head =
    page === 1
      ? `${plural(stats.postCount, "článek", "články", "článků")} · ${plural(
          stats.destinationCount,
          "destinace",
          "destinace",
          "destinací",
        )}`
      : `Strana ${page} z ${totalPages}`;

  const content = `<div class="shell">
  <header class="masthead">
    <p class="masthead__eyebrow">Cestovní deník</p>
    <h1 class="masthead__title">Destinace, ceny a rady před odletem</h1>
    <p class="masthead__lead">${BLOG_HOME_LEAD}</p>
    <p class="masthead__stats">${head}</p>
  </header>
  ${page === 1 && lead ? leadStory(lead) : ""}
  <section class="block" aria-labelledby="nejnovejsi">
    ${sectionHead({
      title: page === 1 ? "Další články" : `Články — strana ${page}`,
      id: "nejnovejsi",
      level: 2,
    })}
    <div class="grid">${cards.map((post) => postCard(post, { sizes: IMAGE_SIZES.card })).join("")}</div>
    ${pagination({ page, totalPages, hrefFor: pagePath })}
  </section>
  <section class="block" aria-labelledby="destinace">
    ${sectionHead({
      title: "Podle destinace",
      id: "destinace",
      lead: "Každá destinace má vlastní rozcestník se všemi články, sezonou a cenami.",
      moreHref: "/blog/destinace/",
      moreLabel: "Všechny destinace",
    })}
    <ul class="tiles">${hubs
      .map((hub) => {
        const cover = listPublishedPosts().find(
          (post) => post.destinationCzechName === hub.czechName,
        );
        return hubTile(hub, cover?.cover ?? cover?.hero ?? null);
      })
      .join("")}</ul>
  </section>
  <section class="block" aria-labelledby="temata">
    ${sectionHead({ title: "Podle tématu", id: "temata", level: 2 })}
    ${tagChips(listIndexableTags())}
  </section>
  ${ctaBand({
    title: "Hledáte konkrétní termín?",
    body: "V Deníku najdete, co v destinaci čekat. Aktuální zájezdy a ceny porovnáte ve vyhledávání SkyTravel.",
    href: "/",
    label: "Porovnat zájezdy",
  })}
</div>`;

  return renderShell({
    head: {
      title: page === 1 ? BLOG_HOME_TITLE : `Cestovní deník — strana ${page} | SkyTravel`,
      description: BLOG_HOME_INTRO,
      canonicalPath: pagePath(page),
      ogType: "website",
      image: null,
      preloadImage: leadMedia ? preloadPayload(leadMedia, IMAGE_SIZES.lead) : null,
      prevPath: page > 1 ? pagePath(page - 1) : null,
      nextPath: page < totalPages ? pagePath(page + 1) : null,
      jsonLd: [
        ...blogHomeLd({ description: BLOG_HOME_INTRO }),
        ...(page === 1
          ? [breadcrumbLd([{ label: "Deník", path: "/blog/" }])]
          : [
              breadcrumbLd([
                { label: "Deník", path: "/blog/" },
                { label: `Strana ${page}`, path: pagePath(page) },
              ]),
            ]),
      ],
    },
    active: "blog",
    bodyClass: "page--home",
    content,
  });
}
