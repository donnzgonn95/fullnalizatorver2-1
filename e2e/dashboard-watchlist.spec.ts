import { test, expect } from "@playwright/test";

// Seed deterministycznego stanu i wyczyszczenie localStorage przed każdym testem.
async function resetStorage(page: import("@playwright/test").Page, watchlist: string[] = []) {
  await page.addInitScript((seed) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (seed.length) localStorage.setItem("watchlist:v1", JSON.stringify(seed));
    } catch {
      /* noop */
    }
  }, watchlist);
}

test.describe("Dashboard + Watchlist", () => {
  test("dashboard renders key sections", async ({ page, context }) => {
    await context.clearCookies();
    await resetStorage(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Top 3 setupy/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Najnowsze alerty/i })).toBeVisible();
  });

  test("dashboard layout: collapse persists in localStorage", async ({ page, context }) => {
    await context.clearCookies();
    await resetStorage(page);
    await page.goto("/");
    await page.getByTestId("section-toggle-setups").click();
    // Reload — sekcja powinna pozostać zwinięta.
    await page.reload();
    const stored = await page.evaluate(() => localStorage.getItem("eljot-dashboard-layout-v1"));
    expect(stored).toContain("\"setups\":true");
  });

  test("watchlist add/remove and deep-link nav", async ({ page, context }) => {
    await context.clearCookies();
    await resetStorage(page);
    await page.goto("/ulubione");
    await expect(page.getByTestId("watchlist-empty")).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem("watchlist:v1", JSON.stringify(["BTC"]));
      window.dispatchEvent(new CustomEvent("watchlist:changed"));
    });

    await expect(page.getByTestId("watchlist-link-BTC")).toBeVisible();
    await page.getByTestId("watchlist-link-BTC").click();
    await expect(page).toHaveURL(/\/coin\/BTC/i);
    await page.goBack();

    await page.getByTestId("watchlist-remove-BTC").click({ force: true });
    await expect(page.getByTestId("watchlist-empty")).toBeVisible();
  });

  test("watchlist view toggle, filter and sort persist", async ({ page, context }) => {
    await context.clearCookies();
    await resetStorage(page, ["BTC", "ETH", "SOL"]);
    await page.goto("/ulubione");

    await expect(page.getByTestId("watchlist-grid")).toBeVisible();
    await page.getByTestId("watchlist-view-list").click();
    await expect(page.getByTestId("watchlist-list")).toBeVisible();

    await page.getByTestId("watchlist-sort").selectOption("alpha");

    await page.getByTestId("watchlist-filter").fill("eth");
    await expect(page.getByTestId("watchlist-link-ETH")).toBeVisible();
    await expect(page.getByTestId("watchlist-link-BTC")).toHaveCount(0);

    // Po reload preferencje widoku/sortu wczytują się z localStorage.
    await page.reload();
    await expect(page.getByTestId("watchlist-list")).toBeVisible();
    const view = await page.evaluate(() => localStorage.getItem("eljot-watchlist-view-v1"));
    const sort = await page.evaluate(() => localStorage.getItem("eljot-watchlist-sort-v1"));
    expect(view).toBe("list");
    expect(sort).toBe("alpha");
  });

  test("mobile bottom nav switches sections without breaking deep links", async ({ page, context }) => {
    await context.clearCookies();
    await resetStorage(page);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/asystent");

    const nav = page.getByTestId("mobile-bottom-nav");
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: /Ulubione/i }).click();
    await expect(page).toHaveURL(/\/ulubione/);

    await nav.getByRole("link", { name: /Ustawienia/i }).click();
    await expect(page).toHaveURL(/\/ustawienia/);

    await nav.getByRole("link", { name: /Panel/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
