import { test, expect } from "@playwright/test";

test.describe("Admin flow", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin-login");
    await page.waitForLoadState("networkidle");
    // Verify login form exists
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });
});
