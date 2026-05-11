// Browser push notifications driven by generated alerts.
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useLiveCoins } from "./binance";
import { generateAlerts } from "./signals";
import type { Alert } from "./demo-data";
import { readTriggers, writeTriggers } from "./alert-triggers";

export type NotifLevel = Alert["level"];

export type QuietHours = {
  enabled: boolean;
  from: string; // "HH:MM"
  to: string;   // "HH:MM"
};

export type NotifSettings = {
  enabled: boolean;
  levels: Record<NotifLevel, boolean>;
  inAppToast: boolean;
  quietHours: QuietHours;
  /** Minimal time window between identical alerts (minutes). */
  dedupMinutes: number;
  /** When true, alerts only fire for symbols on the watchlist. */
  watchlistOnly: boolean;
};

const DEFAULTS: NotifSettings = {
  enabled: false,
  levels: { critical: true, warning: true, info: false },
  inAppToast: true,
  quietHours: { enabled: false, from: "22:00", to: "07:00" },
  dedupMinutes: 60,
  watchlistOnly: false,
};

export const DEDUP_PRESETS = [5, 15, 30, 60, 180, 360] as const;

const KEY = "cryptopuls:notif-settings";
const SEEN_KEY = "cryptopuls:notif-seen";
const HISTORY_KEY = "cryptopuls:notif-history";
const SEEN_MAX = 200;
const HISTORY_MAX = 50;

export type NotifHistoryItem = {
  id: string;
  title: string;
  body: string;
  level: NotifLevel;
  symbol: string;
  ts: number;
  muted?: boolean;
  readAt?: number;
};

function read(): NotifSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return {
      enabled: !!p.enabled,
      inAppToast: p.inAppToast ?? true,
      levels: { ...DEFAULTS.levels, ...(p.levels ?? {}) },
      quietHours: { ...DEFAULTS.quietHours, ...(p.quietHours ?? {}) },
      dedupMinutes: typeof p.dedupMinutes === "number" ? p.dedupMinutes : DEFAULTS.dedupMinutes,
      watchlistOnly: !!p.watchlistOnly,
    };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<() => void>();
let cache: NotifSettings | null = null;

function getSnapshot(): NotifSettings {
  if (!cache) cache = read();
  return cache;
}

function emit() {
  cache = read();
  listeners.forEach((l) => l());
}

export function setNotifSettings(patch: Partial<NotifSettings>) {
  const next = { ...getSnapshot(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

export function useNotifSettings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    () => DEFAULTS,
  );
}

export function notifPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotifPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const p = await Notification.requestPermission();
  emit();
  return p;
}

/**
 * Build a deduplication key for an alert. The `bucketMinutes` controls how
 * often the same alert can re-fire — within a single bucket window the key
 * is identical, so the alert is suppressed.
 */
export function alertKey(a: Alert, bucketMinutes = 60, now = Date.now()): string {
  const size = Math.max(1, bucketMinutes) * 60_000;
  const bucket = Math.floor(now / size);
  return `${a.symbol}:${a.level}:${a.message.slice(0, 40)}:${bucket}`;
}

function loadSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  const arr = Array.from(set).slice(-SEEN_MAX);
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
}

// ============== History ==============

const historyListeners = new Set<() => void>();
let historyCache: NotifHistoryItem[] | null = null;

function loadHistory(): NotifHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as NotifHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function emitHistory() {
  historyCache = loadHistory();
  historyListeners.forEach((l) => l());
}

function pushHistory(item: NotifHistoryItem) {
  const list = loadHistory();
  list.unshift(item);
  const trimmed = list.slice(0, HISTORY_MAX);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  emitHistory();
}

export function useNotifHistory() {
  return useSyncExternalStore(
    (cb) => {
      historyListeners.add(cb);
      return () => historyListeners.delete(cb);
    },
    () => {
      if (!historyCache) historyCache = loadHistory();
      return historyCache;
    },
    () => [],
  );
}

export function clearNotifHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HISTORY_KEY);
  window.localStorage.removeItem(SEEN_KEY);
  emitHistory();
}

export function markHistoryRead(id: string) {
  if (typeof window === "undefined") return;
  const list = loadHistory().map((h) => (h.id === id && !h.readAt ? { ...h, readAt: Date.now() } : h));
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  emitHistory();
}

export function markAllHistoryRead() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const list = loadHistory().map((h) => (h.readAt ? h : { ...h, readAt: now }));
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  emitHistory();
}

/** Serialize history to JSON string (pretty-printed). */
export function serializeHistory(items?: NotifHistoryItem[]): string {
  return JSON.stringify(items ?? loadHistory(), null, 2);
}

/** Trigger a browser download of the current history as a JSON file. */
export function exportNotifHistory(): { ok: boolean; count: number } {
  if (typeof window === "undefined") return { ok: false, count: 0 };
  const items = loadHistory();
  const blob = new Blob([serializeHistory(items)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `cryptopuls-alerts-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, count: items.length };
}

// ============== Quiet hours ==============

/** Returns true if `now` falls inside quiet hours window (handles overnight). */
export function isInQuietHours(qh: QuietHours, now = new Date()): boolean {
  if (!qh.enabled) return false;
  const [fh, fm] = qh.from.split(":").map(Number);
  const [th, tm] = qh.to.split(":").map(Number);
  if (Number.isNaN(fh) || Number.isNaN(th)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

const ICON: Record<NotifLevel, string> = {
  critical: "🚨",
  warning: "⚠️",
  info: "📈",
};

export function fireNotification(a: Alert, settings: NotifSettings, opts?: { force?: boolean }) {
  const muted = !opts?.force && isInQuietHours(settings.quietHours);
  const title = `${ICON[a.level]} ${a.symbol} — CryptoPuls`;
  const body = a.message;

  // Always log to history (so user can review what was muted)
  pushHistory({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    body,
    level: a.level,
    symbol: a.symbol,
    ts: Date.now(),
    muted,
  });

  if (muted) return { delivered: false, muted: true };

  if (settings.inAppToast) {
    const fn = a.level === "critical" ? toast.error : a.level === "warning" ? toast.warning : toast.info;
    fn(`${ICON[a.level]} ${a.symbol}`, { description: body });
  }
  if (settings.enabled && notifPermission() === "granted") {
    try {
      new Notification(title, {
        body,
        tag: `${a.symbol}-${a.level}`,
        silent: a.level === "info",
      });
    } catch {
      // ignore
    }
  }
  return { delivered: true, muted: false };
}

/** Fires a hard-coded test push notification (uses Notification API + toast). */
export async function sendTestPush(settings: NotifSettings) {
  if (notifPermission() === "default") {
    await requestNotifPermission();
  }
  fireNotification(
    {
      id: "test-push",
      time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      symbol: "PUSH",
      level: "critical",
      message: "Test powiadomienia push — jeśli to widzisz, kanał działa poprawnie.",
    },
    settings,
    { force: true },
  );
}

/** Mounts globally — watches live coin data and fires notifications for new alerts. */
export function useAlertNotifications() {
  const settings = useNotifSettings();
  const { data: coins } = useLiveCoins();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!settings.enabled && !settings.inAppToast) return;
    if (!coins || coins.length === 0) return;

    const alerts = generateAlerts(coins);
    const seen = loadSeen();
    const firstRun = !window.localStorage.getItem(SEEN_KEY);

    let watchlist: Set<string> | null = null;
    if (settings.watchlistOnly) {
      try {
        const raw = window.localStorage.getItem("watchlist:v1");
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        watchlist = new Set(arr.map((s) => String(s).toUpperCase()));
      } catch {
        watchlist = new Set();
      }
    }

    for (const a of alerts) {
      if (!settings.levels[a.level]) continue;
      if (watchlist && !watchlist.has(a.symbol.toUpperCase())) continue;
      const k = alertKey(a, settings.dedupMinutes);
      if (seen.has(k)) continue;
      seen.add(k);
      if (!firstRun) fireNotification(a, settings);
    }
    saveSeen(seen);

    // ===== Custom price triggers (favorites) =====
    // Re-arming jest per-trigger (per coin + per poziom/kierunek). Trigger
    // wystrzeliwuje przy przekroczeniu progu, potem czeka aż cena wróci na
    // przeciwną stronę progu (histerezis), zanim znów się uzbroi.
    const triggers = readTriggers().filter((t) => t.enabled);
    if (triggers.length) {
      const priceBy = new Map(coins.map((c) => [c.symbol.toUpperCase(), c.price]));
      let dirty = false;
      const next = readTriggers();
      for (const t of next) {
        if (!t.enabled) continue;
        const px = priceBy.get(t.symbol.toUpperCase());
        if (px == null) continue;

        if (t.kind === "price") {
          const hit = t.side === "above" ? px >= t.price : px <= t.price;
          const armed = t.armed !== false;
          if (hit && armed) {
            t.armed = false;
            dirty = true;
            if (!firstRun) {
              fireNotification(
                {
                  id: `trig-${t.id}`,
                  time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
                  symbol: t.symbol,
                  level: "warning",
                  message: `Cena ${t.side === "above" ? "przekroczyła" : "spadła poniżej"} $${t.price} (aktualnie $${px.toFixed(2)})`,
                },
                settings,
              );
            }
          } else if (!hit && !armed) {
            // Re-arm gdy cena wróci na drugą stronę progu.
            t.armed = true;
            dirty = true;
          }
        } else if (t.kind === "pct") {
          const change = ((px - t.refPrice) / t.refPrice) * 100;
          // Up direction
          if (t.pctUp != null) {
            const hit = change >= t.pctUp;
            const armed = t.armedUp !== false;
            if (hit && armed) {
              t.armedUp = false;
              dirty = true;
              if (!firstRun) {
                fireNotification(
                  {
                    id: `trig-${t.id}-up`,
                    time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
                    symbol: t.symbol,
                    level: "warning",
                    message: `Wzrost ≥ +${t.pctUp}% od $${t.refPrice} (Δ ${change.toFixed(2)}%, teraz $${px.toFixed(2)})`,
                  },
                  settings,
                );
              }
            } else if (!hit && !armed && change < t.pctUp - 0.25) {
              t.armedUp = true;
              dirty = true;
            }
          }
          // Down direction
          if (t.pctDown != null) {
            const hit = change <= -t.pctDown;
            const armed = t.armedDown !== false;
            if (hit && armed) {
              t.armedDown = false;
              dirty = true;
              if (!firstRun) {
                fireNotification(
                  {
                    id: `trig-${t.id}-down`,
                    time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
                    symbol: t.symbol,
                    level: "warning",
                    message: `Spadek ≤ -${t.pctDown}% od $${t.refPrice} (Δ ${change.toFixed(2)}%, teraz $${px.toFixed(2)})`,
                  },
                  settings,
                );
              }
            } else if (!hit && !armed && change > -t.pctDown + 0.25) {
              t.armedDown = true;
              dirty = true;
            }
          }
        }
      }
      if (dirty) writeTriggers(next);
    }
  }, [coins, settings]);
}
