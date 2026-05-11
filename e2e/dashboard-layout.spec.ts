import { test, expect } from "@playwright/test";

async function reset(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* noop */
    }
  });
}

test.describe("Dashboard layout — collapse, reorder, reset", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("zwijanie i rozwijanie sekcji utrwala się w localStorage", async ({ page }) => {
    await reset(page);
    await page.goto("/");

    const toggle = page.getByTestId("section-toggle-setups");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await page.reload();
    await expect(page.getByTestId("section-toggle-setups")).toHaveAttribute("aria-expanded", "false");
    const stored = await page.evaluate(() => localStorage.getItem("eljot-dashboard-layout-v1"));
    expect(stored).toContain("\"setups\":true");

    await page.getByTestId("section-toggle-setups").click();
    await expect(page.getByTestId("section-toggle-setups")).toHaveAttribute("aria-expanded", "true");
  });

  test("zmiana kolejności sekcji (przesunięcie w górę) zapisuje nowy układ", async ({ page }) => {
    await reset(page);
    await page.goto("/");

    const orderBefore = await page.locator("[data-section]").evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.section),
    );
    expect(orderBefore[0]).toBe("regime");
    expect(orderBefore.indexOf("setups")).toBeGreaterThan(0);

    // Przesuwamy „setups” na sam początek.
    const setupsIdx = orderBefore.indexOf("setups");
    for (let i = 0; i < setupsIdx; i++) {
      await page.getByTestId("section-up-setups").click();
    }

    const orderAfter = await page.locator("[data-section]").evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.section),
    );
    expect(orderAfter[0]).toBe("setups");

    const stored = await page.evaluate(() => localStorage.getItem("eljot-dashboard-layout-v1"));
    expect(stored).toContain("\"order\":[\"setups\"");

    await page.reload();
    const orderReloaded = await page.locator("[data-section]").evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.section),
    );
    expect(orderReloaded[0]).toBe("setups");
  });

  test("przycisk „Domyślny układ” przywraca kolejność i rozwija sekcje", async ({ page }) => {
    await reset(page);
    await page.goto("/");

    // Zaburzamy układ: zwijamy sekcję i przesuwamy „alerts” w górę.
    await page.getByTestId("section-toggle-setups").click();
    await page.getByTestId("section-up-alerts").click();

    await page.getByTestId("dashboard-reset-layout").click();

    // Po resecie kolejność jest domyślna a sekcje rozwinięte.
    const order = await page.locator("[data-section]").evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.section),
    );
    expect(order).toEqual(["regime", "watchlist", "tickers", "stats", "setups", "alerts", "history"]);
    await expect(page.getByTestId("section-toggle-setups")).toHaveAttribute("aria-expanded", "true");

    const stored = await page.evaluate(() => localStorage.getItem("eljot-dashboard-layout-v1"));
    expect(stored).toContain("\"collapsed\":{}");
  });
});
