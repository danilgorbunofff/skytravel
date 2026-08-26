// Post-processing for rendered article HTML: assigns stable heading IDs
// (Czech-aware, collision-safe) and builds a table of contents.
import { foldCzech } from "./slug.js";

export type TocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type TocResult = {
  html: string;
  entries: TocEntry[];
};

function headingId(text: string, used: Set<string>): string {
  const base =
    foldCzech(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sekce";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/** Decodes the entities marked emits (&amp; &lt; &gt; &quot; &#39;) back to characters. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Takes rendered HTML (from marked) and:
 *  1. adds id attributes to h2/h3 headings,
 *  2. returns the list of entries for a TOC.
 * Headings that already carry an id are left untouched.
 */
export function addHeadingIdsAndToc(html: string): TocResult {
  const used = new Set<string>();
  const entries: TocEntry[] = [];

  const out = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g,
    (_match, levelRaw: string, attrs: string, inner: string) => {
      const level = Number(levelRaw) as 2 | 3;
      const existing = /\sid="([^"]+)"/.exec(attrs);
      const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
      if (existing) {
        used.add(existing[1]);
        entries.push({ id: existing[1], text, level });
        return `<h${level}${attrs}>${inner}</h${level}>`;
      }
      const id = headingId(text, used);
      entries.push({ id, text, level });
      return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
    },
  );

  return { html: out, entries };
}

/** Renders the TOC nav block (empty string when fewer than 3 entries). */
export function renderTocNav(entries: TocEntry[]): string {
  if (entries.length < 3) return "";
  const items = entries
    .map(
      (e) => `<li class="toc__item toc__item--l${e.level}"><a href="#${e.id}">${e.text}</a></li>`,
    )
    .join("");
  return `<nav class="toc" aria-label="Obsah článku">
    <p class="toc__title">Obsah článku</p>
    <ol class="toc__list">${items}</ol>
  </nav>`;
}
