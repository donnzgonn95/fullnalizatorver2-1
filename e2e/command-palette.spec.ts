import { test, expect } from "@playwright/test";

test.describe("Command Palette", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ }
    });
  });

  test("opens via Ctrl+K and closes via Escape", async ({ page }) => {

    await page.goto("/");
    await page.keyboard.press("Control+K");
    const palette = page.getByTestId("command-palette");
    await expect(palette).toBeVisible();

    // Type a search query and verify list updates.
    await page.keyboard.type("bit");
    await expect(palette.getByText(/Top kryptowaluty/i)).toBeVisible();

    // Escape closes palette.
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });

  test("Enter selects highlighted item and navigates", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");
    const palette = page.getByTestId("command-palette");
    await expect(palette).toBeVisible();

    await page.keyboard.type("BTC");
    // First match should auto-highlight; press Enter to navigate.
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/coin\/BTC/i, { timeout: 10_000 });
  });
});
