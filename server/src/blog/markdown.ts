import { Marked, type Tokens } from "marked";
import { addHeadingIdsAndToc, type TocEntry } from "./toc.js";
import { escapeHtml } from "./html.js";

const SITE_HOST = "sky-travel.tours";

function isExternal(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return !new URL(href).hostname.endsWith(SITE_HOST);
  } catch {
    return false;
  }
}

/** Inline image: rendered as a figure with an honest caption and real dimensions. */
function renderImage(token: Tokens.Image): string {
  const src = token.href;
  const alt = (token.text ?? "").trim();
  const title = token.title?.trim();
  const caption = title && title !== alt ? title : "";
  const figcaption = caption
    ? `<figcaption>${escapeHtml(caption)}</figcaption>`
    : alt
      ? `<figcaption>${escapeHtml(alt)}</figcaption>`
      : "";
  return `<figure class="prose-figure">
  <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${
    title ? ` title="${escapeHtml(title)}"` : ""
  }/>
  ${figcaption}
</figure>`;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    image(token) {
      return renderImage(token);
    },
    link(token) {
      const href = token.href;
      const text = this.parser.parseInline(token.tokens);
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
      if (isExternal(href)) {
        return `<a href="${escapeHtml(href)}"${title} rel="noopener noreferrer external" target="_blank">${text}<span class="sr-only"> (externí odkaz)</span></a>`;
      }
      return `<a href="${escapeHtml(href)}"${title}>${text}</a>`;
    },
  },
});

export type RenderedBody = {
  html: string;
  toc: TocEntry[];
  wordCount: number;
};

/**
 * Render a markdown body to HTML with stable heading ids, a TOC, hardened
 * external links, figure-captioned images and horizontally scrollable tables.
 */
export function renderMarkdown(markdown: string): RenderedBody {
  const raw = marked.parse(markdown, { async: false }) as string;
  const scrolled = raw
    .replace(
      /<table>/g,
      '<div class="prose-table-scroll" role="region" aria-label="Tabulka" tabindex="0"><table>',
    )
    .replace(/<\/table>/g, "</table></div>");
  const { html, entries } = addHeadingIdsAndToc(scrolled);
  return { html, toc: entries, wordCount: countRenderedWords(html) };
}

export function countRenderedWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
