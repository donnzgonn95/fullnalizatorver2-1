// Shared store for Market Regime: auto-detected, manual override, history, change notifications.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Coin } from "./demo-data";
import { detectRegime, type Regime, type RegimeId, buildPresetRegime } from "./market-regime";

const OVERRIDE_KEY = "regime:override";
const HISTORY_KEY = "regime:history-v1";
const HISTORY_MAX = 50;

export type RegimeHistoryEntry = {
  id: RegimeId;
  label: string;
  pl: string;
  tone: Regime["tone"];
  confidence: number;
  source: "auto" | "manual";
  at: number; // timestamp
};

function readOverride(): RegimeId | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(OVERRIDE_KEY);
  return (v as RegimeId) || null;
}

function readHistory(): RegimeHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeHistory(h: RegimeHistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, HISTORY_MAX)));
  window.dispatchEvent(new CustomEvent("regime:history-updated"));
}

export function getRegimeHistory(): RegimeHistoryEntry[] {
  return readHistory();
}

export function clearRegimeHistory() {
  writeHistory([]);
}

export function useRegimeHistory(): RegimeHistoryEntry[] {
  // Start empty on server + first client render to avoid hydration mismatch;
  // hydrate from localStorage after mount.
  const [h, setH] = useState<RegimeHistoryEntry[]>([]);
  useEffect(() => {
    const reload = () => setH(readHistory());
    reload();
    window.addEventListener("regime:history-updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("regime:history-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);
  return h;
}

export function useRegime(coins: Coin[]) {
  const auto = useMemo(() => detectRegime(coins), [coins]);
  const [overrideId, setOverrideId] = useState<RegimeId | null>(() => readOverride());

  // Sync override across tabs / banner instances
  useEffect(() => {
    const handler = () => setOverrideId(readOverride());
    window.addEventListener("regime:override-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("regime:override-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isManual = !!overrideId;
  const active: Regime = useMemo(() => {
    if (!overrideId) return auto;
    // Build a Regime preserving signals from auto-detected metrics, but with overridden id
    return { ...buildPresetRegime(overrideId, auto), signals: auto.signals };
  }, [auto, overrideId]);

  // Notification + history on change of active regime id
  const lastIdRef = useRef<RegimeId | null>(null);
  useEffect(() => {
    const prev = lastIdRef.current;
    if (prev === active.id) return;
    const entry: RegimeHistoryEntry = {
      id: active.id,
      label: active.label,
      pl: active.pl,
      tone: active.tone,
      confidence: active.confidence,
      source: isManual ? "manual" : "auto",
      at: Date.now(),
    };
    const existing = readHistory();
    // Dedupe: if last entry is same id within 5s (e.g. multiple useRegime instances mounting), skip.
    const dup = existing[0] && existing[0].id === entry.id && Date.now() - existing[0].at < 5000;
    if (!dup) writeHistory([entry, ...existing]);
    if (prev !== null && !dup) {
      toast(`Reżim zmienił się: ${active.label}`, {
        description: `${active.pl} · ${isManual ? "ręcznie" : "auto"} · pewność ${active.confidence}%`,
      });
    }
    lastIdRef.current = active.id;
  }, [active.id, active.label, active.pl, active.confidence, isManual]);

  return {
    auto,
    active,
    isManual,
    setOverride: (id: RegimeId) => {
      localStorage.setItem(OVERRIDE_KEY, id);
      setOverrideId(id);
      window.dispatchEvent(new CustomEvent("regime:override-changed"));
    },
    clearOverride: () => {
      localStorage.removeItem(OVERRIDE_KEY);
      setOverrideId(null);
      window.dispatchEvent(new CustomEvent("regime:override-changed"));
    },
  };
}
