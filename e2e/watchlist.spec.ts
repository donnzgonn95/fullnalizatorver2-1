import { test, expect } from "@playwright/test";

async function seed(page: import("@playwright/test").Page, watchlist: string[] = ["BTC", "ETH", "SOL"]) {
  await page.addInitScript((data) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (data.length) localStorage.setItem("watchlist:v1", JSON.stringify(data));
    } catch {
      /* noop */
    }
  }, watchlist);
}

test.describe("/ulubione — view, sort, persistence", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("toggle siatka <-> lista i utrwalenie po reload", async ({ page }) => {
    await seed(page);
    await page.goto("/ulubione");

    await expect(page.getByTestId("watchlist-grid")).toBeVisible();
    await page.getByTestId("watchlist-view-list").click();
    await expect(page.getByTestId("watchlist-list")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("watchlist-list")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("eljot-watchlist-view-v1"))).toBe("list");

    await page.getByTestId("watchlist-view-grid").click();
    await page.reload();
    await expect(page.getByTestId("watchlist-grid")).toBeVisible();
  });

  test("wszystkie opcje sortowania zapisują się i są ładowane po reload", async ({ page }) => {
    await seed(page);
    await page.goto("/ulubione");

    const sorts = ["added", "alpha", "change-desc", "change-asc", "price-desc"];
    for (const s of sorts) {
      await page.getByTestId("watchlist-sort").selectOption(s);
      await expect(page.getByTestId("watchlist-sort")).toHaveValue(s);
      await page.reload();
      await expect(page.getByTestId("watchlist-sort")).toHaveValue(s);
      expect(await page.evaluate(() => localStorage.getItem("eljot-watchlist-sort-v1"))).toBe(s);
    }
  });

  test("filtr ulubionych zwęża wyniki", async ({ page }) => {
    await seed(page);
    await page.goto("/ulubione");
    await page.getByTestId("watchlist-filter").fill("eth");
    await expect(page.getByTestId("watchlist-link-ETH")).toBeVisible();
    await expect(page.getByTestId("watchlist-link-BTC")).toHaveCount(0);
  });
});
