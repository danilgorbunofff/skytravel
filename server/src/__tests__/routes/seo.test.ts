import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../app.js";
import { registerTeardown } from "../helpers/teardown.js";
import { injectIntoTemplate, clearSsrCache } from "../../ssr/renderer.js";
import { formatLeadMessage } from "../../routes/leads.js";
import { tourLeadSchema } from "../../validators/tourLead.js";

registerTeardown();

// A fake client build: template + an SSR module that echoes its input, so the
// Express side can be tested without running the Vite build.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skytravel-ssr-"));
const TEMPLATE = `<!doctype html>
<html lang="cs">
  <head><!--head:start--><title>default</title><!--head:end--></head>
  <body><div id="root"><!--app-html--></div><!--app-data--><script type="module" src="/assets/x.js"></script></body>
</html>`;
fs.writeFileSync(path.join(tmp, "index.html"), TEMPLATE);
fs.writeFileSync(
  path.join(tmp, "entry-server.js"),
  `export function render(input) {
    const title = input.page === "landing" ? input.landing.title : input.page;
    return {
      html: "<main><h1>" + (input.landing ? input.landing.h1 : input.page) + "</h1></main>",
      head: "<title>" + title + "</title>",
      data: JSON.stringify({ page: input.page, path: input.path }),
      htmlLang: input.lang,
    };
  }`,
);

let app: Express;

before(() => {
  process.env.CLIENT_DIST_DIR = tmp;
  process.env.CLIENT_SSR_DIR = tmp;
  clearSsrCache();
  app = createApp();
});

after(() => {
  delete process.env.CLIENT_DIST_DIR;
  delete process.env.CLIENT_SSR_DIR;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("SSR routes", () => {
  it("redirects / to /cs/ with 301 and keeps UTM params", async () => {
    const res = await request(app).get("/?utm_source=instagram&utm_medium=bio");
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, "/cs/?utm_source=instagram&utm_medium=bio");
  });

  it("adds the trailing slash", async () => {
    assert.equal((await request(app).get("/ru")).headers.location, "/ru/");
    const home = await request(app).get("/ru/");
    assert.equal(home.status, 200);
    assert.match(home.text, /<h1>home<\/h1>/);
    const res = await request(app).get("/ru/egipet?utm_source=tg");
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, "/ru/egipet/?utm_source=tg");
  });

  it("renders a landing page with real HTML, lang and data", async () => {
    const res = await request(app).get("/ru/egipet/");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/html/);
    assert.match(res.text, /<html lang="ru">/);
    assert.match(res.text, /<h1>Туры в Египет из Праги<\/h1>/);
    assert.match(res.text, /<title>Туры в Египет из Праги — /);
    assert.doesNotMatch(res.text, /<title>default<\/title>/);
    assert.match(res.text, /<script type="application\/json" id="__SSR_DATA__">/);
    assert.match(res.headers["content-security-policy"], /googletagmanager/);
  });

  it("returns a real 404 for unknown pages", async () => {
    const res = await request(app).get("/cs/neexistuje/");
    assert.equal(res.status, 404);
    assert.match(res.text, /<h1>notFound<\/h1>/);
  });

  it("serves landing JSON for client-side navigation", async () => {
    const res = await request(app).get("/api/pages/cs/egypt");
    assert.equal(res.status, 200);
    assert.equal(res.body.page.path, "/cs/egypt/");
    assert.equal((await request(app).get("/api/pages/cs/nope")).status, 404);
  });
});

describe("sitemap.xml / robots.txt", () => {
  it("lists both languages with hreflang alternates", async () => {
    const res = await request(app).get("/sitemap.xml");
    assert.equal(res.status, 200);
    assert.match(res.text, /xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml"/);
    assert.match(res.text, /<loc>https:\/\/sky-travel.tours\/cs\/<\/loc>/);
    assert.match(res.text, /<loc>https:\/\/sky-travel.tours\/ru\/egipet\/<\/loc>/);
    assert.match(res.text, /hreflang="cs" href="https:\/\/sky-travel.tours\/cs\/egypt\/"/);
    assert.match(res.text, /hreflang="x-default"/);
    assert.doesNotMatch(res.text, /search\?destination/);
  });

  it("robots.txt points to the sitemap", async () => {
    const res = await request(app).get("/robots.txt");
    assert.match(res.text, /Sitemap: https:\/\/sky-travel.tours\/sitemap.xml/);
  });
});

describe("POST /api/leads", () => {
  const valid = {
    destination: "Египет",
    adults: 2,
    children: 1,
    contactMethod: "telegram",
    contact: "@someone",
    gdprConsent: true,
    lang: "ru",
    pagePath: "/ru/egipet/",
  };

  it("rejects missing consent / bad email", async () => {
    const noConsent = await request(app)
      .post("/api/leads")
      .send({ ...valid, gdprConsent: false });
    assert.equal(noConsent.status, 400);
    const badEmail = await request(app)
      .post("/api/leads")
      .send({ ...valid, contactMethod: "email", contact: "nope" });
    assert.equal(badEmail.status, 400);
  });

  it("silently accepts honeypot submissions", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ ...valid, website: "spam.example" });
    assert.equal(res.status, 201);
  });

  it("formats the Telegram message with escaped user input and UTM", () => {
    const lead = tourLeadSchema.parse({
      ...valid,
      message: "<b>hi</b> & bye",
      utm: { utm_source: "instagram", utm_medium: "story" },
    });
    const text = formatLeadMessage(lead);
    assert.match(text, /&lt;b&gt;hi&lt;\/b&gt; &amp; bye/);
    assert.match(text, /<a href="https:\/\/t.me\/someone">@someone<\/a>/);
    assert.match(text, /instagram \/ story/);
    assert.match(text, /2 взр\. \+ 1 дет\./);
  });
});

describe("injectIntoTemplate", () => {
  it("replaces the head region, root, data and html lang", () => {
    const out = injectIntoTemplate(TEMPLATE, {
      head: "<title>X $& $1</title>",
      html: "<p>body</p>",
      data: "{}",
      htmlLang: "ru",
    });
    assert.match(out, /<html lang="ru">/);
    assert.match(out, /<title>X \$& \$1<\/title>/); // no regex replacement patterns applied
    assert.match(out, /<div id="root"><p>body<\/p><\/div>/);
    assert.doesNotMatch(out, /default/);
  });
});
