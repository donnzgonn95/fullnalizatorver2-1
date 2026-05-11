// E2E test: full alert -> history -> export -> JSON file pipeline.
// Run with: bun test
import { describe, it, expect, beforeEach } from "bun:test";

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  get length() { return this.m.size; }
}

const downloads: { name: string; type: string; payload: string }[] = [];
let lastBlobPayload = "";

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = new MemStorage();
(globalThis as any).Notification = class {
  static permission: NotificationPermission = "granted";
  static async requestPermission() { return "granted" as NotificationPermission; }
  constructor(public title: string, public opts?: any) {}
};
(globalThis as any).Blob = class {
  size: number;
  type: string;
  constructor(parts: any[], opts?: { type?: string }) {
    const joined = parts.map((p: any) => String(p)).join("");
    lastBlobPayload = joined;
    this.size = joined.length;
    this.type = opts?.type ?? "";
  }
};
(globalThis as any).URL = {
  createObjectURL: (b: any) => {
    downloads.push({ name: "_pending_", type: b.type, payload: lastBlobPayload });
    return "blob://test";
  },
  revokeObjectURL: () => {},
};
(globalThis as any).document = {
  createElement: () => {
    const el: any = {
      click: () => {}, remove: () => {},
      set href(_v: string) {},
      set download(v: string) { if (downloads.length) downloads[downloads.length - 1].name = v; },
    };
    return el;
  },
  body: { appendChild: () => {} },
};

const {
  fireNotification,
  exportNotifHistory,
  setNotifSettings,
  clearNotifHistory,
  alertKey,
} = await import("../lib/notifications");
const { generateAlerts } = await import("../lib/signals");

beforeEach(() => {
  (globalThis as any).localStorage.clear();
  downloads.length = 0;
  clearNotifHistory();
});

describe("E2E: alerty -> historia -> eksport JSON", () => {
  it("generuje alerty z danych rynku, zapisuje historię i eksportuje plik", () => {
    setNotifSettings({ enabled: false, inAppToast: false });
    const settings = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);

    const coins = [
      { symbol: "BTC", name: "Bitcoin", price: 70000, change24h: 6.4, change7d: 12, volume24h: 1e9, marketCap: 1e12, rsi: 75, strength: 80 },
      { symbol: "DOGE", name: "Doge", price: 0.1, change24h: -7.2, change7d: -10, volume24h: 1e8, marketCap: 1e10, rsi: 25, strength: 20 },
    ];
    const generated = generateAlerts(coins as any);
    expect(generated.length).toBeGreaterThan(0);

    for (const a of generated) fireNotification(a, settings);

    const r = exportNotifHistory();
    expect(r.ok).toBe(true);
    expect(r.count).toBe(generated.length);
    expect(downloads).toHaveLength(1);
    expect(downloads[0].type).toBe("application/json");
    expect(downloads[0].name).toMatch(/^cryptopuls-alerts-\d{4}-\d{2}-\d{2}T.*\.json$/);

    const parsed = JSON.parse(downloads[0].payload);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(generated.length);
    expect(parsed[0]).toHaveProperty("title");
    expect(parsed[0]).toHaveProperty("body");
    expect(parsed[0]).toHaveProperty("level");
    expect(parsed[0]).toHaveProperty("ts");
    expect(parsed.some((p: any) => p.symbol === "BTC")).toBe(true);
    expect(parsed.some((p: any) => p.symbol === "DOGE")).toBe(true);
  });

  it("eksportowany plik zawiera również wpisy 'muted' z ciszy", () => {
    setNotifSettings({
      enabled: false, inAppToast: false,
      quietHours: { enabled: true, from: "00:00", to: "23:59" },
    });
    const settings = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    fireNotification(
      { id: "1", time: "", symbol: "ETH", level: "warning", message: "muted alert" },
      settings,
    );
    exportNotifHistory();
    const parsed = JSON.parse(downloads[0].payload);
    expect(parsed[0].muted).toBe(true);
  });
});

describe("UI dedup: kubełki czasowe", () => {
  const a = { id: "x", time: "", symbol: "BTC", level: "critical" as const, message: "pump +6%" };

  it("preset 5min: drugi alert po 1 min trafia w ten sam kubełek", () => {
    const t = Math.floor(1_700_000_000_000 / (5 * 60_000)) * (5 * 60_000);
    expect(alertKey(a, 5, t)).toBe(alertKey(a, 5, t + 60_000));
  });
  it("preset 60min: alert po 30 min jest duplikatem", () => {
    const t = 1_700_000_000_000;
    expect(alertKey(a, 60, t)).toBe(alertKey(a, 60, t + 30 * 60_000));
  });
  it("preset 60min: alert po 61 min ma nowy klucz", () => {
    const t = 1_700_000_000_000;
    expect(alertKey(a, 60, t)).not.toBe(alertKey(a, 60, t + 61 * 60_000));
  });
  it("alerty różniące się symbolem/poziomem nigdy nie są duplikatami", () => {
    const t = 1_700_000_000_000;
    const b = { ...a, symbol: "ETH" };
    const c = { ...a, level: "warning" as const };
    expect(alertKey(a, 60, t)).not.toBe(alertKey(b, 60, t));
    expect(alertKey(a, 60, t)).not.toBe(alertKey(c, 60, t));
  });
});
