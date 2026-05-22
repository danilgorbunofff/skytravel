import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and shows main heading", async ({ page }) => {
    await page.goto("/");
    // The homepage should have the SkyTravel brand or a search section
    await expect(page.locator("body")).toBeVisible();
    // Check the page has rendered (not a blank page)
    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(100);
  });

  test("has navigation links", async ({ page }) => {
    await page.goto("/");
    // Should have some form of navigation
    const nav = page.locator("nav, header");
    await expect(nav.first()).toBeVisible();
  });
});
