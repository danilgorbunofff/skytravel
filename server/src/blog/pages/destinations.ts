import { HUBS_LEAD } from "../content.js";
import { absoluteUrl, plural } from "../html.js";
import { listDestinationHubs, listPostsByDestination, listIndexableTags } from "../loader.js";
import {
  breadcrumbs,
  ctaBand,
  renderPicture,
  sectionHead,
  tagChips,
} from "../layout/components.js";
import { breadcrumbLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";

export function renderDestinationsPage(): string {
  const hubs = listDestinationHubs();
  const tiles = hubs
    .map((hub) => {
      const latest = listPostsByDestination(hub.czechName)[0];
      const cover = latest?.cover ?? latest?.hero ?? null;
      return `<li class="dest-card">
  <a class="dest-card__link" href="/blog/destinace/${hub.slug}/">
    ${
      cover
        ? `<div class="dest-card__media">${renderPicture(cover, {
            sizes: "(max-width: 640px) 92vw, (max-width: 1080px) 46vw, 360px",
            alt: "",
          })}</div>`
        : ""
    }
    <div class="dest-card__body">
      <h2 class="dest-card__title">${hub.czechName}</h2>
      <p class="dest-card__intro">${hub.intro}</p>
      <p class="dest-card__meta">${plural(hub.count, "článek", "články", "článků")}</p>
    </div>
  </a>
</li>`;
    })
    .join("");

  const content = `<div class="shell">
  ${breadcrumbs([
    { label: "Deník", href: "/blog/" },
    { label: "Destinace", href: "/blog/destinace/" },
  ])}
  <header class="page-head">
    <p class="page-head__eyebrow">Rozcestník</p>
    <h1 class="page-head__title">Destinace</h1>
    <p class="page-head__lead">${HUBS_LEAD}</p>
  </header>
  <ul class="dest-grid">${tiles}</ul>
  <section class="block" aria-labelledby="temata">
    ${sectionHead({
      title: "Podle tématu",
      id: "temata",
      lead: "Hledáte spíš téma než zemi? Projděte články podle témat.",
    })}
    ${tagChips(listIndexableTags())}
  </section>
  ${ctaBand({
    title: "Nemůžete se rozhodnout?",
    body: "Porovnejte zájezdy podle ceny a termínu — Deník vám řekne, co od destinace čekat.",
    href: "/",
    label: "Hledat zájezdy",
  })}
</div>`;

  return renderShell({
    head: {
      title: "Destinace — průvodce od Albánie po Turecko | SkyTravel",
      description:
        "Rozcestník destinací v Cestovním deníku SkyTravel: Albánie, Bulharsko, Černá Hora, Chorvatsko, Itálie, Řecko, Španělsko a Turecko.",
      canonicalPath: "/blog/destinace/",
      ogType: "website",
      image: null,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Destinace",
          description: HUBS_LEAD,
          url: absoluteUrl("/blog/destinace/"),
          hasPart: hubs.map((hub) => ({
            "@type": "CollectionPage",
            name: hub.czechName,
            url: absoluteUrl(`/blog/destinace/${hub.slug}/`),
          })),
        },
        breadcrumbLd([
          { label: "Deník", path: "/blog/" },
          { label: "Destinace", path: "/blog/destinace/" },
        ]),
      ],
    },
    active: "destinations",
    bodyClass: "page--destinations",
    content,
  });
}
