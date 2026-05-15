import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { detectBBBounce, BB_PARAMS, type DetectedSetup } from "@/lib/feed/detectors/bb-bounce";
import { detectElliott, ELLIOTT_PARAMS } from "@/lib/feed/detectors/elliott";
import { aggregateM45 } from "@/lib/feed/m45";
import { bollinger, rsi } from "@/lib/feed/indicators";
import {
  BINANCE_INTERVAL,
  BINANCE_PAIR,
  INTERVALS,
  SCAN_SYMBOLS,
  type Candle,
  type Interval,
  type ScanSymbol,
} from "@/lib/feed/types";

type DetectorOutcome = "setup" | "no-signal" | "duplicate" | "error";

interface DetectorReport {
  name: "bb_bounce" | "elliott_wave";
  outcome: DetectorOutcome;
  reason?: string;
  setup?: {
    direction: "long" | "short";
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    signal_strength: number;
    wave_label?: string | null;
    setup_type: string;
  };
  params?: Record<string, unknown>;
  durationMs: number;
}

interface CandleTailItem {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RunReport {
  symbol: string;
  interval: string;
  candles: {
    count: number;
    firstOpenTime: string | null;
    lastCloseTime: string | null;
    lastClose: number | null;
    lastVolume: number | null;
    tail?: CandleTailItem[];
  };
  detectors: DetectorReport[];
}

const TAIL_SIZE = 20;

const DETECTOR_PARAMS: Record<DetectorReport["name"], Record<string, unknown>> = {
  bb_bounce: BB_PARAMS as unknown as Record<string, unknown>,
  elliott_wave: ELLIOTT_PARAMS as unknown as Record<string, unknown>,
};

interface RunReport {
  symbol: string;
  interval: string;
  candles: {
    count: number;
    firstOpenTime: string | null;
    lastCloseTime: string | null;
    lastClose: number | null;
    lastVolume: number | null;
  };
  detectors: DetectorReport[];
}

async function fetchKlines(pair: string, binItv: string, limit = 200): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binItv}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<unknown[]>;
  const now = Date.now();
  return rows.map((r) => {
    const closeTime = Number(r[6]);
    return {
      openTime: Number(r[0]),
      open: parseFloat(r[1] as string),
      high: parseFloat(r[2] as string),
      low: parseFloat(r[3] as string),
      close: parseFloat(r[4] as string),
      volume: parseFloat(r[5] as string),
      closed: closeTime < now,
    } as Candle;
  });
}

async function loadCandles(symbol: string, interval: Interval): Promise<Candle[]> {
  const pair = BINANCE_PAIR[symbol as ScanSymbol] ?? `${symbol}USDT`;
  if (interval === "M45") {
    const m15 = await fetchKlines(pair, "15m", 300);
    return aggregateM45(m15.filter((c) => c.closed));
  }
  const binItv = BINANCE_INTERVAL[interval as Exclude<Interval, "M45">];
  if (!binItv) return [];
  const all = await fetchKlines(pair, binItv, 200);
  return all.filter((c) => c.closed);
}

async function alreadyExists(symbol: string, interval: string, setup_type: string, entryISO: string) {
  const start = new Date(new Date(entryISO).getTime() - 30 * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("detected_setups").select("id").is("user_id", null)
    .eq("symbol", symbol).eq("interval", interval).eq("setup_type", setup_type)
    .gte("entry_time", start).limit(1);
  return !!(data && data.length > 0);
}

/** Krótki opis dlaczego BB-bounce nie wystrzelił. */
function explainBBNoSignal(candles: Candle[]): string {
  const closes = candles.map((c) => c.close);
  const bb = bollinger(closes);
  const r = rsi(closes);
  if (!bb || r === null) return "Za mało danych dla BB/RSI";
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const longTouch = prev.low <= bb.lower;
  const shortTouch = prev.high >= bb.upper;
  if (!longTouch && !shortTouch) {
    return `Cena w kanale BB (low ${prev.low.toFixed(2)} > lower ${bb.lower.toFixed(2)}, high ${prev.high.toFixed(2)} < upper ${bb.upper.toFixed(2)})`;
  }
  if (longTouch && r >= 40) return `Dotyk dolnej BB, ale RSI ${r.toFixed(1)} ≥ 40 (brak wyprzedania)`;
  if (shortTouch && r <= 60) return `Dotyk górnej BB, ale RSI ${r.toFixed(1)} ≤ 60 (brak wykupienia)`;
  if (longTouch && last.close <= bb.lower) return `Brak odbicia: close ${last.close.toFixed(2)} ≤ lower ${bb.lower.toFixed(2)}`;
  if (shortTouch && last.close >= bb.upper) return `Brak odbicia: close ${last.close.toFixed(2)} ≥ upper ${bb.upper.toFixed(2)}`;
  return "Warunki BB-bounce niespełnione";
}

function explainElliottNoSignal(candles: Candle[]): string {
  return `Brak czytelnej fali Elliotta na ${candles.length} świecach`;
}

interface DiffEntry {
  symbol: string;
  interval: string;
  lastCloseDelta: number | null;
  lastClosePrev: number | null;
  lastCloseNow: number | null;
  newSetups: string[];
  goneSetups: string[];
}

function buildDiff(prevRuns: RunReport[] | undefined, currRuns: RunReport[]): DiffEntry[] {
  if (!prevRuns?.length) return [];
  const prevMap = new Map<string, RunReport>();
  for (const r of prevRuns) prevMap.set(`${r.symbol}/${r.interval}`, r);
  const out: DiffEntry[] = [];
  for (const curr of currRuns) {
    const key = `${curr.symbol}/${curr.interval}`;
    const prev = prevMap.get(key);
    const currTypes = new Set(curr.detectors.filter((d) => d.outcome === "setup").map((d) => `${d.name}-${d.setup?.direction ?? "?"}`));
    const prevTypes = new Set((prev?.detectors ?? []).filter((d) => d.outcome === "setup").map((d) => `${d.name}-${d.setup?.direction ?? "?"}`));
    const newSetups = [...currTypes].filter((t) => !prevTypes.has(t));
    const goneSetups = [...prevTypes].filter((t) => !currTypes.has(t));
    const prevClose = prev?.candles.lastClose ?? null;
    const currClose = curr.candles.lastClose ?? null;
    const delta = prevClose !== null && currClose !== null ? currClose - prevClose : null;
    if (newSetups.length || goneSetups.length || (delta !== null && Math.abs(delta) > 0)) {
      out.push({ symbol: curr.symbol, interval: curr.interval, lastClosePrev: prevClose, lastCloseNow: currClose, lastCloseDelta: delta, newSetups, goneSetups });
    }
  }
  return out;
}

export const Route = createFileRoute("/api/public/hooks/scan-setups")({
  server: {
    handlers: {
      POST: async () => {
        const startedAt = new Date();
        const { data: logRow } = await supabaseAdmin.from("cron_run_logs").insert({
          job_name: "scan-setups", status: "running",
        }).select("id").single();
        const logId = logRow?.id as string | undefined;

        // Read live config
        const { data: cfg } = await supabaseAdmin.from("scanner_config")
          .select("symbols,intervals,enabled").order("updated_at", { ascending: false }).limit(1).single();
        const symbols = (cfg?.symbols as string[] | null)?.length ? cfg!.symbols as string[] : [...SCAN_SYMBOLS];
        const intervals = (cfg?.intervals as string[] | null)?.length ? cfg!.intervals as string[] : [...INTERVALS];
        const enabled = cfg?.enabled !== false;

        // Poprzedni udany run — do diff
        const { data: prevLog } = await supabaseAdmin.from("cron_run_logs")
          .select("id,details").eq("job_name", "scan-setups").in("status", ["success", "partial"])
          .order("started_at", { ascending: false }).limit(1).maybeSingle();
        const prevRuns = (prevLog?.details as { runs?: RunReport[] } | null)?.runs;

        const runs: RunReport[] = [];
        let detected = 0, inserted = 0, errors = 0;
        const errorMessages: string[] = [];

        if (enabled) {
          for (const symbol of symbols) {
            for (const interval of intervals as Interval[]) {
              const detectorReports: DetectorReport[] = [];
              const candleMeta: RunReport["candles"] = { count: 0, firstOpenTime: null, lastCloseTime: null, lastClose: null, lastVolume: null };
              try {
                const candles = await loadCandles(symbol, interval);
                if (candles.length) {
                  const last = candles[candles.length - 1];
                  candleMeta.count = candles.length;
                  candleMeta.firstOpenTime = new Date(candles[0].openTime).toISOString();
                  candleMeta.lastCloseTime = new Date(last.openTime).toISOString();
                  candleMeta.lastClose = last.close;
                  candleMeta.lastVolume = last.volume;
                }
                if (candles.length < 35) {
                  detectorReports.push({ name: "bb_bounce", outcome: "no-signal", reason: `Tylko ${candles.length} świec (min 35)`, durationMs: 0 });
                  detectorReports.push({ name: "elliott_wave", outcome: "no-signal", reason: `Tylko ${candles.length} świec (min 35)`, durationMs: 0 });
                  runs.push({ symbol, interval, candles: candleMeta, detectors: detectorReports });
                  continue;
                }

                const detectors: Array<{ name: DetectorReport["name"]; fn: (c: Candle[]) => DetectedSetup | null; explain: (c: Candle[]) => string }> = [
                  { name: "bb_bounce", fn: detectBBBounce, explain: explainBBNoSignal },
                  { name: "elliott_wave", fn: detectElliott, explain: explainElliottNoSignal },
                ];

                for (const d of detectors) {
                  const t0 = Date.now();
                  try {
                    const setup = d.fn(candles);
                    const dur = Date.now() - t0;
                    if (!setup) {
                      detectorReports.push({ name: d.name, outcome: "no-signal", reason: d.explain(candles), durationMs: dur });
                      continue;
                    }
                    detected += 1;
                    const entryISO = new Date(setup.entry_time).toISOString();
                    const setupSummary = {
                      setup_type: setup.setup_type,
                      direction: setup.direction,
                      entry_price: setup.entry_price,
                      stop_loss: setup.stop_loss,
                      take_profit: setup.take_profit,
                      signal_strength: setup.signal_strength,
                      wave_label: setup.wave_label ?? null,
                    };
                    if (await alreadyExists(symbol, interval, setup.setup_type, entryISO)) {
                      detectorReports.push({ name: d.name, outcome: "duplicate", reason: "Identyczny setup w ostatnich 30 min", setup: setupSummary, durationMs: dur });
                      continue;
                    }
                    const { error } = await supabaseAdmin.from("detected_setups").insert({
                      user_id: null, symbol, interval,
                      setup_type: setup.setup_type, wave_label: setup.wave_label ?? null,
                      direction: setup.direction, entry_price: setup.entry_price,
                      stop_loss: setup.stop_loss, take_profit: setup.take_profit,
                      signal_strength: setup.signal_strength, entry_time: entryISO,
                      status: "active", details: setup.details as never,
                    });
                    if (error) {
                      errors += 1;
                      errorMessages.push(`${symbol}/${interval}/${d.name}: ${error.message}`);
                      detectorReports.push({ name: d.name, outcome: "error", reason: error.message, setup: setupSummary, durationMs: dur });
                    } else {
                      inserted += 1;
                      detectorReports.push({ name: d.name, outcome: "setup", setup: setupSummary, durationMs: dur });
                    }
                  } catch (e) {
                    const dur = Date.now() - t0;
                    errors += 1;
                    const msg = (e as Error).message ?? "unknown";
                    errorMessages.push(`${symbol}/${interval}/${d.name}: ${msg}`);
                    detectorReports.push({ name: d.name, outcome: "error", reason: msg, durationMs: dur });
                  }
                }
              } catch (e) {
                errors += 1;
                const msg = (e as Error).message ?? "unknown";
                errorMessages.push(`${symbol}/${interval}: ${msg}`);
                detectorReports.push({ name: "bb_bounce", outcome: "error", reason: msg, durationMs: 0 });
              }
              runs.push({ symbol, interval, candles: candleMeta, detectors: detectorReports });
            }
          }
        }

        const cappedRuns = runs.slice(0, 200);
        const diff = buildDiff(prevRuns, cappedRuns);

        const finishedAt = new Date();
        if (logId) {
          await supabaseAdmin.from("cron_run_logs").update({
            finished_at: finishedAt.toISOString(),
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            status: errors > 0 ? (inserted > 0 ? "partial" : "error") : "success",
            details: {
              detected, inserted, errors, enabled, symbols, intervals,
              errorMessages: errorMessages.slice(0, 20),
              runs: cappedRuns,
              diff: { vsRunId: prevLog?.id ?? null, changed: diff },
            } as never,
          }).eq("id", logId);
        }

        return new Response(
          JSON.stringify({ ok: true, detected, inserted, errors, enabled, runsCount: cappedRuns.length, diffCount: diff.length }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
