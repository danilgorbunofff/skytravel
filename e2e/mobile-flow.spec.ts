import { test, expect } from "@playwright/test";

test.describe("Mobile flow", () => {
  test("homepage renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Verify page renders
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });
});
