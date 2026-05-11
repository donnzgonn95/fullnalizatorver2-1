// E2E-style tests for alert generation + notification pipeline.
// Run with: bun test
import { describe, it, expect, beforeEach } from "bun:test";
import { generateAlerts } from "../lib/signals";
import type { Coin } from "../lib/demo-data";
import { isInQuietHours, type QuietHours } from "../lib/notifications";

const baseCoin = (over: Partial<Coin>): Coin => ({
  symbol: "BTC",
  name: "Bitcoin",
  price: 70000,
  change24h: 0,
  change7d: 0,
  volume24h: 1e9,
  marketCap: 1e12,
  rsi: 50,
  strength: 50,
  ...over,
});

describe("generateAlerts", () => {
  it("emituje 'critical' dla ruchu >= 5% w 24h", () => {
    const alerts = generateAlerts([baseCoin({ symbol: "SOL", change24h: 6.2 })]);
    const crit = alerts.find((a) => a.symbol === "SOL" && a.level === "critical");
    expect(crit).toBeDefined();
    expect(crit!.message).toContain("+6.2%");
  });

  it("emituje 'critical' dla spadku <= -5% w 24h", () => {
    const alerts = generateAlerts([baseCoin({ symbol: "DOGE", change24h: -7.1 })]);
    expect(alerts.some((a) => a.symbol === "DOGE" && a.level === "critical")).toBe(true);
  });

  it("emituje 'warning' przy RSI >= 70 i RSI <= 30", () => {
    const alerts = generateAlerts([
      baseCoin({ symbol: "ETH", rsi: 78 }),
      baseCoin({ symbol: "XRP", rsi: 22 }),
    ]);
    expect(alerts.some((a) => a.symbol === "ETH" && a.level === "warning")).toBe(true);
    expect(alerts.some((a) => a.symbol === "XRP" && a.level === "warning")).toBe(true);
  });

  it("emituje 'info' dla trendu 7D >= 10%", () => {
    const alerts = generateAlerts([baseCoin({ symbol: "ARB", change7d: 18 })]);
    expect(alerts.some((a) => a.symbol === "ARB" && a.level === "info")).toBe(true);
  });

  it("sortuje od critical -> warning -> info", () => {
    const alerts = generateAlerts([
      baseCoin({ symbol: "A", change7d: 12 }),       // info
      baseCoin({ symbol: "B", rsi: 75 }),            // warning
      baseCoin({ symbol: "C", change24h: 8 }),       // critical
    ]);
    const order = ["critical", "warning", "info"] as const;
    let idx = 0;
    for (const a of alerts) {
      const cur = order.indexOf(a.level);
      expect(cur).toBeGreaterThanOrEqual(idx);
      idx = cur;
    }
  });

  it("zwraca fallback gdy rynek spokojny", () => {
    const alerts = generateAlerts([baseCoin({})]);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].symbol).toBe("MKT");
  });
});

describe("isInQuietHours", () => {
  const qh = (from: string, to: string, enabled = true): QuietHours => ({ enabled, from, to });

  it("zwraca false gdy wyłączone", () => {
    expect(isInQuietHours(qh("00:00", "23:59", false), new Date(2026, 0, 1, 12, 0))).toBe(false);
  });

  it("dzienny przedział (09:00 - 17:00)", () => {
    expect(isInQuietHours(qh("09:00", "17:00"), new Date(2026, 0, 1, 12, 0))).toBe(true);
    expect(isInQuietHours(qh("09:00", "17:00"), new Date(2026, 0, 1, 8, 59))).toBe(false);
    expect(isInQuietHours(qh("09:00", "17:00"), new Date(2026, 0, 1, 17, 0))).toBe(false);
  });

  it("przedział nocny przez północ (22:00 - 07:00)", () => {
    expect(isInQuietHours(qh("22:00", "07:00"), new Date(2026, 0, 1, 23, 30))).toBe(true);
    expect(isInQuietHours(qh("22:00", "07:00"), new Date(2026, 0, 1, 3, 0))).toBe(true);
    expect(isInQuietHours(qh("22:00", "07:00"), new Date(2026, 0, 1, 12, 0))).toBe(false);
  });
});
