import { test, expect } from "@playwright/test";

test("TradingView retry — fallback po blokadzie, wykres po odblokowaniu i kliknięciu „Spróbuj ponownie”", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ }
  });

  // Krok 1: blokujemy embed widget — fallback powinien się pojawić.
  let blocked = true;
  await page.route("**/external-embedding/**", (route) => {
    if (blocked) return route.abort();
    return route.continue();
  });

  await page.goto("/coin/BTC");
  const chart = page.getByTestId("tradingview-chart");
  await chart.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("tv-fallback")).toBeVisible({ timeout: 8000 });

  // Krok 2: odblokowujemy skrypt i klikamy „Spróbuj ponownie”.
  blocked = false;
  await page.getByRole("button", { name: /Spróbuj ponownie/i }).click();

  // Po retry: status przechodzi w „loading” lub od razu „ready”, fallback znika.
  await expect(page.getByTestId("tv-fallback")).toBeHidden({ timeout: 10_000 });
  await expect(chart).toHaveAttribute("data-tv-status", /loading|ready/, { timeout: 10_000 });
});
