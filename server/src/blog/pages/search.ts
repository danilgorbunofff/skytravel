import { SEARCH_LEAD } from "../content.js";
import { escapeHtml, plural } from "../html.js";
import { listIndexableTags, searchPosts } from "../loader.js";
import {
  breadcrumbs,
  emptyState,
  postCard,
  searchForm,
  sectionHead,
  tagChips,
  IMAGE_SIZES,
} from "../layout/components.js";
import { breadcrumbLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";

const SUGGESTIONS = [
  "Chorvatsko",
  "trajekt",
  "dovolená s dětmi",
  "kdy jet k moři",
  "all inclusive",
];

export function renderSearchPage(rawQuery: string): string {
  const query = rawQuery.trim().slice(0, 80);
  const results = query.length >= 2 ? searchPosts(query, 12) : [];
  const tooShort = query.length > 0 && query.length < 2;

  const body = tooShort
    ? emptyState({
        title: "Zadejte alespoň dva znaky",
        body: "Kratší dotazy vrací příliš mnoho výsledků. Zkuste název destinace nebo téma.",
      })
    : !query
      ? ""
      : results.length
        ? `<p class="search-count">${plural(results.length, "nalezený článek", "nalezené články", "nalezených článků")} pro „${escapeHtml(query)}“</p>
      <div class="grid">${results.map((post) => postCard(post, { sizes: IMAGE_SIZES.card })).join("")}</div>`
        : emptyState({
            title: "Nic jsme nenašli",
            body: `Pro „${escapeHtml(query)}“ nemáme žádný článek. Zkuste jiné slovo, nebo projděte témata níže.`,
            href: "/blog/",
            label: "Zpět na Deník",
          });

  const content = `<div class="shell shell--narrow">
  ${breadcrumbs([
    { label: "Deník", href: "/blog/" },
    { label: "Hledání", href: "/blog/hledat/" },
  ])}
  <header class="page-head">
    <p class="page-head__eyebrow">Hledání</p>
    <h1 class="page-head__title">Hledat v článcích</h1>
    <p class="page-head__lead">${SEARCH_LEAD}</p>
  </header>
  ${searchForm({ query })}
  <div class="search-body">${body}</div>
  ${
    !query
      ? `<section class="block" aria-labelledby="tipy">
    ${sectionHead({
      title: "Zkuste některé z témat",
      id: "tipy",
      lead: "Nejčastěji hledané výrazy v Deníku.",
    })}
    <ul class="chips">${SUGGESTIONS.map(
      (item) =>
        `<li><a class="chip" href="/blog/hledat/?q=${encodeURIComponent(item)}">${escapeHtml(item)}</a></li>`,
    ).join("")}</ul>
    ${sectionHead({ title: "Procházet témata", id: "temata" })}
    ${tagChips(listIndexableTags())}
  </section>`
      : ""
  }
</div>`;

  return renderShell({
    head: {
      title: query ? `Hledání: ${query} | SkyTravel` : "Hledat v článcích | SkyTravel",
      description: SEARCH_LEAD,
      canonicalPath: "/blog/hledat/",
      // Search result pages are thin by nature; keep them out of the index but
      // let crawlers follow the links they contain.
      noindex: true,
      ogType: "website",
      image: null,
      jsonLd: [
        breadcrumbLd([
          { label: "Deník", path: "/blog/" },
          { label: "Hledání", path: "/blog/hledat/" },
        ]),
      ],
    },
    active: "blog",
    bodyClass: "page--search",
    content,
  });
}
