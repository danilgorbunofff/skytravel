import { test, expect } from "@playwright/test";

test.describe("Admin login page", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/admin-login");
    // Wait for the login form to render
    await page.waitForSelector("#adminLogin");
    // Should have login and password inputs
    const loginInput = page.locator('input[type="text"], input[type="email"], input[name="login"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(loginInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/admin-login");
    await page.waitForSelector("#adminLogin");
    // Fill in wrong credentials
    const loginInput = page.locator('input[type="text"], input[type="email"], input[name="login"]');
    const passwordInput = page.locator('input[type="password"]');
    await loginInput.first().fill("wrong@example.com");
    await passwordInput.first().fill("wrongpassword");
    // Submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    // Should show error or stay on login page
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("admin-login");
  });
});
