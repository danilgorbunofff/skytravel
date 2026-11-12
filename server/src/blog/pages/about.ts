import { ABOUT_CONTACT, ABOUT_LEAD, ABOUT_SECTIONS } from "../content.js";
import { absoluteUrl, escapeHtml } from "../html.js";
import { DEFAULT_AUTHOR } from "../authors.js";
import { blogStats } from "../loader.js";
import { authorCard, breadcrumbs, ctaBand } from "../layout/components.js";
import { breadcrumbLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";

export function renderAboutPage(): string {
  const stats = blogStats();
  const sections = ABOUT_SECTIONS.map(
    (section) => `<section class="about-section" aria-labelledby="s-${i(section.heading)}">
    <h2 id="s-${i(section.heading)}">${section.heading}</h2>
    ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
  </section>`,
  ).join("");

  const content = `<div class="shell shell--narrow">
  ${breadcrumbs([
    { label: "Deník", href: "/blog/" },
    { label: "O blogu", href: "/blog/o-blogu/" },
  ])}
  <header class="page-head">
    <p class="page-head__eyebrow">O blogu</p>
    <h1 class="page-head__title">Jak vznikl Cestovní deník</h1>
    <p class="page-head__lead">${ABOUT_LEAD}</p>
  </header>
  <div class="prose">
    ${sections}
    <section class="about-section" aria-labelledby="redakce">
      <h2 id="redakce">Kdo články píše</h2>
      <p>Texty podepisuje redakce SkyTravel. Konkrétní články vznikají ve spolupráci s lidmi, kteří destinaci znají z opakovaných cest — jejich jména najdete v tiráži u článku, pokud se na něm podíleli.</p>
      ${authorCard(DEFAULT_AUTHOR)}
    </section>
    <section class="about-section" aria-labelledby="kontakt">
      <h2 id="kontakt">Kontakt</h2>
      <p>${ABOUT_CONTACT.note}</p>
      <p><a class="btn" href="mailto:${escapeHtml(ABOUT_CONTACT.email)}">${escapeHtml(
        ABOUT_CONTACT.email,
      )}</a></p>
    </section>
    <section class="about-section" aria-labelledby="cisla">
      <h2 id="cisla">Blog v číslech</h2>
      <p>Zatím jsme publikovali ${stats.postCount} článků o ${stats.destinationCount} destinacích. Nové texty přidáváme průběžně, sezonní průvodce aktualizujeme před začátkem sezony.</p>
    </section>
  </div>
  ${ctaBand({
    title: "Zpět na články",
    body: "Nejnovější průvodce, ceny a rady před odletem.",
    href: "/blog/",
    label: "Otevřít Deník",
  })}
</div>`;

  return renderShell({
    head: {
      title: "O blogu a redakci | SkyTravel Cestovní deník",
      description:
        "Kdo píše Cestovní deník SkyTravel, odkud bereme ceny a jak články aktualizujeme. Redakční zásady a kontakt.",
      canonicalPath: "/blog/o-blogu/",
      ogType: "website",
      image: null,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "O blogu a redakci",
          url: absoluteUrl("/blog/o-blogu/"),
          inLanguage: "cs-CZ",
        },
        breadcrumbLd([
          { label: "Deník", path: "/blog/" },
          { label: "O blogu", path: "/blog/o-blogu/" },
        ]),
      ],
    },
    active: "about",
    bodyClass: "page--about",
    content,
  });
}

/** Stable, readable heading id from Czech text. */
function i(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
