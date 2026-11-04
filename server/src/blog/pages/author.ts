import { getAuthor } from "../authors.js";
import { absoluteUrl, plural } from "../html.js";
import { listPostsByAuthor, listTags } from "../loader.js";
import {
  breadcrumbs,
  ctaBand,
  IMAGE_SIZES,
  postCard,
  sectionHead,
  tagChips,
} from "../layout/components.js";
import { breadcrumbLd, listLd } from "../layout/structuredData.js";
import { renderShell } from "../layout/shell.js";
import { MIN_TAG_POSTS } from "../types.js";

export function renderAuthorPage(slug: string): string | null {
  const author = getAuthor(slug);
  if (!author) return null;
  const posts = listPostsByAuthor(author.slug);
  const path = `/blog/autor/${author.slug}/`;
  const expertise = new Set(author.expertise);
  const tags = listTags().filter((tag) => expertise.has(tag.name));

  const content = `<div class="shell">
  ${breadcrumbs([
    { label: "Deník", href: "/blog/" },
    { label: author.name, href: path },
  ])}
  <header class="page-head page-head--author">
    <p class="page-head__eyebrow">Autor</p>
    <h1 class="page-head__title">${author.name}</h1>
    <p class="page-head__lead">${author.bio}</p>
    <p class="page-head__meta">${author.role} · ${plural(posts.length, "článek", "články", "článků")}</p>
  </header>
  ${
    tags.length
      ? `<section class="block" aria-labelledby="zamereni">
    ${sectionHead({ title: "Zaměření", id: "zamereni" })}
    ${tagChips(tags.slice(0, 6))}
  </section>`
      : ""
  }
  <section class="block" aria-labelledby="clanky-autora">
    ${sectionHead({ title: "Články", id: "clanky-autora" })}
    <div class="grid">${posts.map((post) => postCard(post, { sizes: IMAGE_SIZES.card })).join("")}</div>
  </section>
  ${ctaBand({
    title: "Napsat redakci",
    body: "Máte dotaz k článku nebo tip na téma? Odpovídáme do dvou pracovních dnů.",
    href: "/blog/o-blogu/",
    label: "Kontakt na redakci",
  })}
</div>`;

  return renderShell({
    head: {
      title: `${author.name} — články | SkyTravel`,
      description: `${author.name}: ${author.role}. ${author.bio}`,
      canonicalPath: path,
      noindex: posts.length < MIN_TAG_POSTS,
      ogType: "website",
      image: posts[0]?.cover ?? posts[0]?.hero ?? null,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Person",
          name: author.name,
          jobTitle: author.role,
          description: author.bio,
          url: absoluteUrl(path),
          worksFor: { "@type": "Organization", name: "SkyTravel", url: absoluteUrl("/") },
        },
        listLd({ name: author.name, path, posts }),
        breadcrumbLd([
          { label: "Deník", path: "/blog/" },
          { label: author.name, path },
        ]),
      ],
    },
    active: "about",
    bodyClass: "page--author",
    content,
  });
}
