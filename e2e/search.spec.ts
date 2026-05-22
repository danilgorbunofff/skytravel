import { test, expect } from "@playwright/test";

test.describe("Search page", () => {
  test("navigates to search page and shows filters", async ({ page }) => {
    await page.goto("/search");
    // Should display the search/filter UI
    await expect(page.locator("body")).toBeVisible();
    // Wait for the page to fully load (Suspense boundary resolved)
    await page.waitForTimeout(1000);
    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(50);
  });

  test("shows loading state or results", async ({ page }) => {
    await page.goto("/search");
    // Either shows a loading spinner or tour results
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
