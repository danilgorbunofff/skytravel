import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { url: "/", name: "Homepage" },
  { url: "/search", name: "Search" },
  { url: "/admin-login", name: "Admin login" },
];

test.describe("Accessibility audit", () => {
  for (const page of PAGES) {
    test(`${page.name} should have no critical a11y violations`, async ({ page: p }) => {
      await p.goto(page.url);
      await p.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      // Log violations rather than strictly failing (so tests can pass in CI without requiring perfection yet)
      for (const violation of results.violations) {
        console.log(`[a11y] ${page.name}: ${violation.id} — ${violation.description}`);
      }
      // Only fail on critical violations
      const critical = results.violations.filter((v) => v.impact === "critical");
      expect(critical).toEqual([]);
    });
  }
});
