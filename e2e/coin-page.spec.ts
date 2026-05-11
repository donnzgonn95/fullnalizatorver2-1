import { test, expect } from "@playwright/test";

test.describe("Coin page", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ }
    });
  });

  test("renders header, stats and chart controls", async ({ page }) => {
    await page.goto("/coin/BTC");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "30D" })).toBeVisible();
  });

  test("sticky mini-header appears after scrolling and stays below main header", async ({ page }) => {
    await page.goto("/coin/BTC");
    const sticky = page.getByTestId("coin-sticky-header");

    // Initially hidden (opacity-0 + pointer-events-none).
    await expect(sticky).toHaveCSS("opacity", "0");

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(sticky).toHaveCSS("opacity", "1");

    // Sticky must dock below the main <header>, never overlap it.
    const stickyTop = await sticky.evaluate((el) => el.getBoundingClientRect().top);
    const headerBottom = await page
      .locator("header")
      .first()
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(Math.round(stickyTop)).toBeGreaterThanOrEqual(Math.round(headerBottom) - 1);
  });

  test("chart preferences persist across reloads", async ({ page }) => {
    await page.goto("/coin/BTC");
    await page.getByRole("tab", { name: "7D" }).click();
    await expect(page.getByRole("tab", { name: "7D" })).toHaveAttribute("aria-selected", "true");

    await page.reload();
    await expect(page.getByRole("tab", { name: "7D" })).toHaveAttribute("aria-selected", "true");
  });
});
