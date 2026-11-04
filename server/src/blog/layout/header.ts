import { escapeHtml } from "../html.js";

export type NavKey = "blog" | "destinations" | "about" | null;

const NAV: { key: Exclude<NavKey, null>; href: string; label: string }[] = [
  { key: "blog", href: "/blog/", label: "Deník" },
  { key: "destinations", href: "/blog/destinace/", label: "Destinace" },
  { key: "about", href: "/blog/o-blogu/", label: "O blogu" },
];

function navLinks(active: NavKey): string {
  return NAV.map(
    (item) =>
      `<a href="${item.href}"${active === item.key ? ' aria-current="page"' : ""}>${item.label}</a>`,
  ).join("");
}

const SEARCH_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>`;

/**
 * Blog chrome. The mobile menu is a native <details> element, so navigation
 * works without JavaScript; the desktop nav is a plain list of links.
 */
export function renderHeader(active: NavKey): string {
  return `<a class="skip-link" href="#obsah">Přeskočit na obsah</a>
<header class="site-head">
  <div class="shell site-head__inner">
    <a class="brand" href="/" aria-label="SkyTravel — úvodní stránka">
      <span class="brand__sky">Sky</span><span class="brand__travel">Travel</span>
    </a>
    <nav class="head-nav" aria-label="Sekce blogu">${navLinks(active)}</nav>
    <div class="head-actions">
      <a class="head-search" href="/blog/hledat/" aria-label="Hledat v článcích">${SEARCH_ICON}</a>
      <a class="head-cta" href="/">Hledat zájezdy</a>
    </div>
    <details class="head-menu">
      <summary class="head-menu__summary"><span class="head-menu__bars" aria-hidden="true"></span><span class="sr-only">Menu</span></summary>
      <div class="head-menu__panel">
        <nav aria-label="Sekce blogu">${navLinks(active)}<a href="/blog/hledat/">Hledat v článcích</a></nav>
        <a class="head-menu__cta" href="/">Hledat zájezdy</a>
      </div>
    </details>
  </div>
</header>`;
}

export function renderFooter(hubs: { slug: string; czechName: string }[]): string {
  const hubLinks = hubs
    .slice(0, 8)
    .map(
      (hub) => `<li><a href="/blog/destinace/${hub.slug}/">${escapeHtml(hub.czechName)}</a></li>`,
    )
    .join("");
  return `<footer class="site-foot">
  <div class="shell site-foot__grid">
    <div class="site-foot__brand">
      <a class="brand brand--foot" href="/" aria-label="SkyTravel — úvodní stránka">
        <span class="brand__sky">Sky</span><span class="brand__travel">Travel</span>
      </a>
      <p>Cestovní deník redakce SkyTravel. Píšeme o destinacích, které máme v nabídce — sezony, ceny, pláže a praktické rady před odletem.</p>
    </div>
    <nav class="site-foot__col" aria-label="Blog">
      <h2>Děník</h2>
      <ul>
        <li><a href="/blog/">Nejnovější články</a></li>
        <li><a href="/blog/destinace/">Všechny destinace</a></li>
        <li><a href="/blog/o-blogu/">O blogu a redakci</a></li>
        <li><a href="/blog/hledat/">Hledat v článcích</a></li>
        <li><a href="/blog/rss.xml">RSS kanál</a></li>
      </ul>
    </nav>
    <nav class="site-foot__col" aria-label="Destinace na blogu">
      <h2>Destinace</h2>
      <ul>${hubLinks}</ul>
    </nav>
    <div class="site-foot__col">
      <h2>Kontakt</h2>
      <ul>
        <li><a href="mailto:info@skytravel.cz">info@skytravel.cz</a></li>
        <li><a href="/#kontakt">Napsat redakci</a></li>
        <li><a href="/">Hledat zájezdy</a></li>
      </ul>
    </div>
  </div>
  <div class="shell site-foot__legal">
    <p>© ${new Date().getFullYear()} SkyTravel. Ceny a termíny jsou orientační, závazná je nabídka pořadatele.</p>
    <nav aria-label="Právní informace">
      <a href="/gdpr">Ochrana údajů</a>
      <a href="/terms">Obchodní podmínky</a>
      <a href="/blog/rss.xml">RSS</a>
    </nav>
  </div>
</footer>`;
}
