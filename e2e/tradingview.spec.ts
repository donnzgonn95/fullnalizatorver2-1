import { test, expect } from "@playwright/test";

async function reset(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ }
  });
}

test.describe("Coin page — TradingView chart", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("kontener TradingView jest obecny i ma poprawny zmapowany symbol", async ({ page }) => {
    await reset(page);
    await page.goto("/coin/BTC");

    const chart = page.getByTestId("tradingview-chart");
    await chart.scrollIntoViewIfNeeded();
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute("data-tv-symbol", "BINANCE:BTCUSDT");
    await expect(page.getByTestId("tv-resolved-symbol")).toHaveText("BINANCE:BTCUSDT");
  });

  test("override mapowania działa dla XRP (poza Binance)", async ({ page }) => {
    await reset(page);
    await page.goto("/coin/XRP");

    const chart = page.getByTestId("tradingview-chart");
    await chart.scrollIntoViewIfNeeded();
    await expect(chart).toHaveAttribute("data-tv-symbol", "BITSTAMP:XRPUSD");
    await expect(page.getByTestId("tv-resolved-symbol")).toHaveText("BITSTAMP:XRPUSD");
  });

  test("przełącznik zakresu zapisuje wybór i utrzymuje go po reload", async ({ page }) => {
    await reset(page);
    await page.goto("/coin/BTC");

    await page.getByTestId("tv-range-switcher").scrollIntoViewIfNeeded();
    await page.getByTestId("tv-range-6M").click();
    await expect(page.getByTestId("tv-range-6M")).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => localStorage.getItem("coin:tv-range:v1"))).toBe("6M");

    await page.reload();
    await expect(page.getByTestId("tv-range-6M")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("tradingview-chart")).toBeVisible();
  });

  test("fallback pojawia się, gdy skrypt TradingView jest zablokowany", async ({ page }) => {
    await reset(page);
    // Blokujemy embed widget — symuluje brak sieci / adblock.
    await page.route("**/external-embedding/**", (route) => route.abort());
    await page.goto("/coin/BTC");

    const chart = page.getByTestId("tradingview-chart");
    await chart.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("tv-fallback")).toBeVisible({ timeout: 8000 });
  });
});
