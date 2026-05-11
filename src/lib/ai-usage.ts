import { useEffect, useState } from "react";
import { estimateCostUsd } from "./ai-models";

export type AiLimits = {
  perMinute: number;
  perHour: number;
  perDay: number;
  /** Soft daily budget in USD — only warns. */
  dailyBudgetUsd: number;
};

export const DEFAULT_LIMITS: AiLimits = {
  perMinute: 10,
  perHour: 60,
  perDay: 200,
  dailyBudgetUsd: 1.0,
};

const LIMITS_KEY = "eljot-ai-limits-v1";
const EVENTS_KEY = "eljot-ai-events-v1";
const EVT = "eljot-ai-usage-changed";

export type AiEvent = {
  ts: number;
  mode: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
};

function readLimits(): AiLimits {
  if (typeof localStorage === "undefined") return DEFAULT_LIMITS;
  try {
    return { ...DEFAULT_LIMITS, ...(JSON.parse(localStorage.getItem(LIMITS_KEY) ?? "{}") as Partial<AiLimits>) };
  } catch {
    return DEFAULT_LIMITS;
  }
}

function readEvents(): AiEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "[]") as AiEvent[];
  } catch {
    return [];
  }
}

function writeEvents(list: AiEvent[]) {
  // Keep last 1000 events.
  const trimmed = list.slice(-1000);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new Event(EVT));
}

export function setLimits(patch: Partial<AiLimits>) {
  const next = { ...readLimits(), ...patch };
  localStorage.setItem(LIMITS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

export function getLimits(): AiLimits {
  return readLimits();
}

export function clearUsage() {
  writeEvents([]);
}

/** Returns null if allowed, or a human message if blocked. */
export function checkLimit(): { ok: true } | { ok: false; reason: string; retryInSec: number } {
  const limits = readLimits();
  const events = readEvents();
  const now = Date.now();
  const inLast = (ms: number) => events.filter((e) => now - e.ts < ms).length;

  const perMin = inLast(60_000);
  if (perMin >= limits.perMinute) {
    const oldest = events.filter((e) => now - e.ts < 60_000)[0]?.ts ?? now;
    return { ok: false, reason: `Limit ${limits.perMinute}/min`, retryInSec: Math.ceil((60_000 - (now - oldest)) / 1000) };
  }
  const perHour = inLast(3_600_000);
  if (perHour >= limits.perHour) {
    return { ok: false, reason: `Limit ${limits.perHour}/h`, retryInSec: 60 };
  }
  const perDay = inLast(86_400_000);
  if (perDay >= limits.perDay) {
    return { ok: false, reason: `Dzienny limit ${limits.perDay} zapytań`, retryInSec: 600 };
  }
  return { ok: true };
}

export function recordUsage(args: {
  mode: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}) {
  const p = args.promptTokens ?? 0;
  const c = args.completionTokens ?? 0;
  const ev: AiEvent = {
    ts: Date.now(),
    mode: args.mode,
    model: args.model,
    promptTokens: p,
    completionTokens: c,
    costUsd: estimateCostUsd(args.model, p, c),
  };
  writeEvents([...readEvents(), ev]);
  return ev;
}

export type UsageStats = {
  countDay: number;
  countWeek: number;
  costDayUsd: number;
  costWeekUsd: number;
  budgetPct: number;
  budgetExceeded: boolean;
};

export function computeStats(): UsageStats {
  const limits = readLimits();
  const events = readEvents();
  const now = Date.now();
  const day = events.filter((e) => now - e.ts < 86_400_000);
  const week = events.filter((e) => now - e.ts < 7 * 86_400_000);
  const costDayUsd = day.reduce((s, e) => s + e.costUsd, 0);
  const costWeekUsd = week.reduce((s, e) => s + e.costUsd, 0);
  const budgetPct = limits.dailyBudgetUsd > 0 ? (costDayUsd / limits.dailyBudgetUsd) * 100 : 0;
  return {
    countDay: day.length,
    countWeek: week.length,
    costDayUsd,
    costWeekUsd,
    budgetPct,
    budgetExceeded: costDayUsd > limits.dailyBudgetUsd,
  };
}

export function useAiUsage() {
  const [stats, setStats] = useState<UsageStats>(() => computeStats());
  const [limits, setLimitsState] = useState<AiLimits>(() => readLimits());
  useEffect(() => {
    const refresh = () => {
      setStats(computeStats());
      setLimitsState(readLimits());
    };
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    const t = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(t);
    };
  }, []);
  return { stats, limits };
}

/** Persist & retrieve last selected model per scope. */
export function getStoredModel(scope: "chat" | "report" | "analyze" | "summary", fallback: string): string {
  if (typeof localStorage === "undefined") return fallback;
  return localStorage.getItem(`ai-model:${scope}`) ?? fallback;
}
export function setStoredModel(scope: "chat" | "report" | "analyze" | "summary", model: string) {
  localStorage.setItem(`ai-model:${scope}`, model);
}
