// @vitest-environment node
/**
 * Server-side render smoke tests: runs entry-server.render() exactly as the
 * Express server does (no window/document) and checks the SEO essentials.
 */
import { describe, expect, it } from "vitest";
import { render } from "../entry-server";
import type { LandingPageData } from "../ssr/types";

const landing: LandingPageData = {
  lang: "ru",
  slug: "egipet",
  path: "/ru/egipet/",
  title: "Туры в Египет из Праги — цены всех чешских CK | SkyTravel",
  description: "Описание",
  h1: "Туры в Египет из Праги",
  intro: "Вступление",
  bodyHtml: "<h2>Курорты</h2><p>Текст страницы</p>",
  faq: [{ q: "Нужна ли виза?", a: "Да, по <strong>прилёте</strong>." }],
  related: [{ href: "/cs/egypt/", label: "Zájezdy do Egypta" }],
  breadcrumbs: [
    { href: "/ru/", label: "SkyTravel" },
    { href: "/ru/egipet/", label: "Египет" },
  ],
  alternates: { ru: "/ru/egipet/", cs: "/cs/egypt/" },
  deals: { destinationSlug: "", lastMinute: false, searchHref: "/search" },
  formDestination: "Египет",
  updatedAt: "2026-11-12",
};

const h1s = (html: string) => html.match(/<h1[\s>]/g) ?? [];

describe("SSR render", () => {
  it("home (cs) has crawlable text, one H1, links to the other language", () => {
    const out = render({ path: "/cs/", lang: "cs", page: "home" });
    expect(h1s(out.html)).toHaveLength(1);
    expect(out.html).toContain("Zájezdy z Prahy a last minute od českých CK");
    expect(out.html).toContain('href="/ru/"');
    expect(out.html).toContain("https://t.me/irinaterenteva_04");
    expect(out.html).toContain("https://t.me/skytravel_tours");
    expect(out.htmlLang).toBe("cs");
    expect(out.head).toContain(
      "<title>Zájezdy z Prahy, last minute od českých CK | SkyTravel</title>",
    );
    expect(out.head).toContain('<link rel="canonical" href="https://sky-travel.tours/cs/" />');
    expect(out.head).toContain('hreflang="ru" href="https://sky-travel.tours/ru/"');
    expect(out.head).toContain('hreflang="x-default" href="https://sky-travel.tours/cs/"');
    expect(out.head).toContain('"@type":"TravelAgency"');
    // translation keys must never leak into the markup
    expect(out.html).not.toMatch(/>(hero|section|nav|footer)[A-Z]\w+</);
  });

  it("home (ru) is rendered in Russian", () => {
    const out = render({ path: "/ru/", lang: "ru", page: "home" });
    expect(out.html).toContain("Туры из Праги от всех чешских туроператоров");
    expect(out.html).toContain("Написать в Telegram");
    expect(out.htmlLang).toBe("ru");
  });

  it("landing page renders content, FAQ, breadcrumbs and schema", () => {
    const out = render({ path: landing.path, lang: "ru", page: "landing", landing, deals: [] });
    expect(h1s(out.html)).toHaveLength(1);
    expect(out.html).toContain("Текст страницы");
    expect(out.html).toContain("Нужна ли виза?");
    expect(out.html).toContain('aria-current="page"');
    expect(out.head).toContain('"@type":"BreadcrumbList"');
    expect(out.head).toContain('"@type":"FAQPage"');
    expect(out.head).toContain('"text":"Да, по прилёте."');
    expect(out.head).toContain('hreflang="cs" href="https://sky-travel.tours/cs/egypt/"');
    expect(out.head).toContain("og:description");
    expect(JSON.parse(out.data).landing.slug).toBe("egipet");
  });

  it("all images in the HTML have alt text", () => {
    for (const out of [
      render({ path: "/cs/", lang: "cs", page: "home" }),
      render({ path: landing.path, lang: "ru", page: "landing", landing, deals: [] }),
    ]) {
      expect(out.html.match(/<img(?![^>]*\balt=)[^>]*>/g) ?? []).toEqual([]);
    }
  });

  it("404 page is noindex and has no canonical", () => {
    const out = render({ path: "/cs/nic/", lang: "cs", page: "notFound" });
    expect(out.head).toContain('content="noindex, follow"');
    expect(out.head).not.toContain("canonical");
  });

  it("escapes the data payload so it cannot break out of its <script>", () => {
    const out = render({
      path: landing.path,
      lang: "ru",
      page: "landing",
      landing: { ...landing, intro: "</script><script>alert(1)</script>" },
      deals: [],
    });
    expect(out.data).not.toContain("</script>");
  });
});
