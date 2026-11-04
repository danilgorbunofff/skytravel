import { listDestinationHubs } from "../loader.js";
import { escapeHtml } from "../html.js";
import { renderHead, type SeoPage } from "./head.js";
import { renderFooter, renderHeader, type NavKey } from "./header.js";

export type ShellOptions = {
  head: SeoPage;
  active: NavKey;
  /** Page markup, already escaped; inserted inside <main>. */
  content: string;
  /** Body modifier, e.g. "page--article". */
  bodyClass?: string;
};

function footerHubs(): { slug: string; czechName: string }[] {
  try {
    return listDestinationHubs().map(({ slug, czechName }) => ({ slug, czechName }));
  } catch {
    return [];
  }
}

/** Full document for every blog page. */
export function renderShell(options: ShellOptions): string {
  const bodyClass = options.bodyClass ? ` class="${escapeHtml(options.bodyClass)}"` : "";
  return `<!doctype html>
<html lang="cs">
<head>
  ${renderHead(options.head)}
</head>
<body${bodyClass}>
${renderHeader(options.active)}
<main id="obsah" tabindex="-1">${options.content}</main>
${renderFooter(footerHubs())}
</body>
</html>`;
}
