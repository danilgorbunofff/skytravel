import { listPublishedPosts } from "../loader.js";
import { ctaBand, indexList, searchForm, sectionHead } from "../layout/components.js";
import { renderShell } from "../layout/shell.js";

export function renderNotFoundPage(): string {
  const latest = listPublishedPosts().slice(0, 5);

  const content = `<div class="shell shell--narrow">
  <header class="page-head page-head--404">
    <p class="page-head__eyebrow">Chyba 404</p>
    <h1 class="page-head__title">Tuhle stránku jsme nenašli</h1>
    <p class="page-head__lead">Adresa možná změnila podobu, nebo článek ještě nevyšel. Zkuste hledání níže — nebo začněte od nejnovějších textů.</p>
  </header>
  ${searchForm({})}
  ${
    latest.length
      ? `<section class="block" aria-labelledby="nejnovejsi-clanky">
    ${sectionHead({ title: "Nejnovější články", id: "nejnovejsi-clanky" })}
    ${indexList(latest)}
  </section>`
      : ""
  }
  ${ctaBand({
    title: "Hledáte konkrétní zájezd?",
    body: "Vyhledávání SkyTravel porovná termíny a ceny od dodavatelů.",
    href: "/",
    label: "Přejít na vyhledávání",
  })}
</div>`;

  return renderShell({
    head: {
      title: "Stránka nenalezena | SkyTravel",
      description:
        "Požadovaná stránka na blogu SkyTravel neexistuje. Zkuste hledání nebo nejnovější články.",
      canonicalPath: "/blog/",
      noindex: true,
      ogType: "website",
      image: null,
    },
    active: null,
    bodyClass: "page--404",
    content,
  });
}
