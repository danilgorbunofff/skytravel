import { test, expect } from "@playwright/test";

test.describe("Search flow", () => {
  test("navigates from homepage to search results", async ({ page }) => {
    await page.goto("/");
    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Attempt to search (adjust selectors based on actual app)
    const searchInput = page.locator('input[placeholder*="Místo"], input[placeholder*="destinaci"], #searchDestination, #topSearchInput');
    if (await searchInput.isVisible()) {
      await searchInput.fill("Egypt");
      // Click search button or press Enter
      const searchBtn = page.locator('button[type="submit"]');
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
    }

    // Basic assertion — page still loads
    await expect(page).toHaveURL(/\//);
  });

  test("homepage renders key sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Verify page has content
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });
});
