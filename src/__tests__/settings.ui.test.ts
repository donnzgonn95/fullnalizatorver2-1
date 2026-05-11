// UI/state tests for notification settings: dedup, muted history, export.
// Run with: bun test
import { describe, it, expect, beforeEach } from "bun:test";

// ---- Minimal browser shim (localStorage + Notification) ----
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  get length() { return this.m.size; }
}

const downloads: { name: string; type: string; size: number }[] = [];

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = new MemStorage();
(globalThis as any).Notification = class {
  static permission: NotificationPermission = "default";
  static async requestPermission() { return "granted" as NotificationPermission; }
  constructor(public title: string, public opts?: any) {}
};
(globalThis as any).Blob = class {
  size: number;
  type: string;
  constructor(parts: any[], opts?: { type?: string }) {
    this.size = parts.reduce((n: number, p: any) => n + String(p).length, 0);
    this.type = opts?.type ?? "";
  }
};
(globalThis as any).URL = {
  createObjectURL: (b: any) => {
    downloads.push({ name: "_pending_", type: b.type, size: b.size });
    return "blob://test";
  },
  revokeObjectURL: () => {},
};
(globalThis as any).document = {
  createElement: () => {
    const el: any = { click: () => {}, remove: () => {}, set href(_v: string) {}, set download(v: string) { if (downloads.length) downloads[downloads.length - 1].name = v; } };
    return el;
  },
  body: { appendChild: () => {} },
};

// Import AFTER shims so module-level reads see them.
const {
  alertKey,
  exportNotifHistory,
  fireNotification,
  serializeHistory,
  setNotifSettings,
  clearNotifHistory,
} = await import("../lib/notifications");

beforeEach(() => {
  (globalThis as any).localStorage.clear();
  downloads.length = 0;
  clearNotifHistory();
});

describe("alertKey dedup buckets", () => {
  const a = { id: "x", time: "", symbol: "BTC", level: "critical" as const, message: "pump +6%" };
  it("identyczny klucz w obrębie jednego okna", () => {
    const t = 1_700_000_000_000;
    expect(alertKey(a, 60, t)).toBe(alertKey(a, 60, t + 30 * 60_000));
  });
  it("zmienia klucz po przekroczeniu okna", () => {
    const t = 1_700_000_000_000;
    expect(alertKey(a, 15, t)).not.toBe(alertKey(a, 15, t + 16 * 60_000));
  });
  it("krótsze okno = więcej kubełków", () => {
    const t = 1_700_000_000_000;
    expect(alertKey(a, 5, t)).not.toBe(alertKey(a, 5, t + 6 * 60_000));
    expect(alertKey(a, 360, t)).toBe(alertKey(a, 360, t + 60 * 60_000));
  });
});

describe("muted window (quiet hours)", () => {
  it("alert w godzinach ciszy trafia tylko do historii (muted=true)", () => {
    const now = new Date();
    const from = `${String(now.getHours()).padStart(2, "0")}:00`;
    const toH = (now.getHours() + 1) % 24;
    const to = `${String(toH).padStart(2, "0")}:00`;
    setNotifSettings({
      enabled: false,
      inAppToast: true,
      quietHours: { enabled: true, from, to },
    });
    const settings = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    const r = fireNotification(
      { id: "1", time: "", symbol: "BTC", level: "critical", message: "test" },
      settings,
    );
    expect(r?.muted).toBe(true);
    expect(r?.delivered).toBe(false);
    const hist = JSON.parse(localStorage.getItem("cryptopuls:notif-history")!);
    expect(hist.length).toBe(1);
    expect(hist[0].muted).toBe(true);
  });

  it("force=true omija ciszę", () => {
    setNotifSettings({
      quietHours: { enabled: true, from: "00:00", to: "23:59" },
    });
    const settings = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    const r = fireNotification(
      { id: "1", time: "", symbol: "BTC", level: "critical", message: "test" },
      settings,
      { force: true },
    );
    expect(r?.delivered).toBe(true);
  });
});

describe("eksport historii", () => {
  it("serializeHistory zwraca poprawny JSON", () => {
    setNotifSettings({ inAppToast: false, enabled: false });
    const settings = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    fireNotification(
      { id: "1", time: "", symbol: "ETH", level: "warning", message: "RSI 75" },
      settings,
    );
    const json = serializeHistory();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].symbol).toBe("ETH");
    expect(parsed[0].level).toBe("warning");
  });

  it("exportNotifHistory wywołuje pobieranie z prawidłową nazwą i typem", () => {
    setNotifSettings({ inAppToast: false, enabled: false });
    const settings = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    fireNotification(
      { id: "1", time: "", symbol: "SOL", level: "info", message: "trend +12%" },
      settings,
    );
    const r = exportNotifHistory();
    expect(r.ok).toBe(true);
    expect(r.count).toBe(1);
    expect(downloads.length).toBe(1);
    expect(downloads[0].type).toBe("application/json");
    expect(downloads[0].name).toMatch(/^cryptopuls-alerts-.*\.json$/);
    expect(downloads[0].size).toBeGreaterThan(10);
  });
});

describe("ustawienia – persystencja", () => {
  it("zapisuje dedupMinutes i quietHours w localStorage", () => {
    setNotifSettings({ dedupMinutes: 15, quietHours: { enabled: true, from: "22:00", to: "07:00" } });
    const raw = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    expect(raw.dedupMinutes).toBe(15);
    expect(raw.quietHours.enabled).toBe(true);
    expect(raw.quietHours.from).toBe("22:00");
  });
  it("zachowuje pozostałe pola przy częściowej aktualizacji", () => {
    setNotifSettings({ dedupMinutes: 30 });
    setNotifSettings({ inAppToast: false });
    const raw = JSON.parse(localStorage.getItem("cryptopuls:notif-settings")!);
    expect(raw.dedupMinutes).toBe(30);
    expect(raw.inAppToast).toBe(false);
  });
});
