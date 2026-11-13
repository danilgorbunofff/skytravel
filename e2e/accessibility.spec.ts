import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { url: "/cs/", name: "Homepage (cs)" },
  { url: "/ru/", name: "Homepage (ru)" },
  { url: "/cs/last-minute/", name: "Last minute landing" },
  { url: "/search", name: "Search" },
  { url: "/search?q=Egypt", name: "Search with a query" },
  { url: "/favorites", name: "Favorites" },
  { url: "/gdpr", name: "GDPR" },
  { url: "/terms", name: "Terms" },
  { url: "/admin-login", name: "Admin login" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const SAVED_TOUR = {
  source: "alexandria",
  externalId: "a11y-1",
  title: "Hotel Accessibility Test",
  destination: "Egypt",
  price: 18990,
  originalPrice: 24990,
  startDate: "2099-07-01",
  endDate: "2099-07-08",
  transport: "plane",
  image: "",
  description: null,
  photos: [],
  url: "",
  stars: "4",
  board: "AI",
  nights: 7,
  offersCount: 3,
};

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    // Logotype text is exempt from contrast requirements (WCAG 1.4.3).
    .exclude(".logo")
    .exclude("[data-logotype]")
    .analyze();
  for (const violation of results.violations) {
    console.log(`[a11y] ${label}: ${violation.id} (${violation.impact}) — ${violation.help}`);
  }
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

test.describe("Accessibility audit", () => {
  for (const viewport of VIEWPORTS) {
    for (const entry of PAGES) {
      test(`${entry.name} (${viewport.name}) has no serious a11y violations`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(entry.url);
        await page.waitForLoadState("networkidle");
        await audit(page, `${entry.name} (${viewport.name})`);
      });
    }
  }

  test("Open tour detail modal has no serious a11y violations", async ({ page }) => {
    // Deterministic data: a saved tour plus a stubbed detail response, no live catalog needed.
    await page.route("**/api/search/tour/**", (route) =>
      route.fulfill({ json: { tour: SAVED_TOUR } }),
    );
    await page.addInitScript((tour) => {
      window.localStorage.setItem(
        "skytravel:favorites",
        JSON.stringify({ [`${tour.source}-${tour.externalId}`]: tour }),
      );
    }, SAVED_TOUR);
    await page.goto("/favorites");
    await page.getByRole("button", { name: SAVED_TOUR.title }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await audit(page, "Tour detail modal");

    // Back closes the modal instead of leaving the page.
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/search$/);
  });
});
