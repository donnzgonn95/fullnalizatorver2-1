import { useLiveCandles } from "@/lib/feed/use-live-candles";
import { liveIndicators } from "@/lib/feed/indicators";
import type { Interval, ScanSymbol } from "@/lib/feed/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

const INTERVALS: Interval[] = ["M15", "M30", "M45", "H1", "H4"];

export function LiveIndicators({ symbol }: { symbol: ScanSymbol }) {
  const [interval, setInterval] = useState<Interval>("H1");
  const { candles } = useLiveCandles(symbol, interval);
  const ind = liveIndicators(candles);
  const last = candles[candles.length - 1];

  const fmt = (n: number | null | undefined, d = 2) =>
    n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("pl-PL", { maximumFractionDigits: d });

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Wskaźniki live</h3>
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {INTERVALS.map((t) => (
            <button key={t} onClick={() => setInterval(t)}
              className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                interval === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Cell label="Cena" value={fmt(last?.close, 4)} />
        <Cell label="RSI(14)" value={fmt(ind.rsi, 1)} tone={ind.rsi != null ? (ind.rsi > 70 ? "bear" : ind.rsi < 30 ? "bull" : undefined) : undefined} />
        <Cell label="BB Górna" value={fmt(ind.bb?.upper, 4)} />
        <Cell label="BB Środ." value={fmt(ind.bb?.middle, 4)} />
        <Cell label="BB Dolna" value={fmt(ind.bb?.lower, 4)} />
        <Cell label="MACD" value={fmt(ind.macd?.macd, 4)} />
        <Cell label="Sygnał" value={fmt(ind.macd?.signal, 4)} />
        <Cell label="Histogram" value={fmt(ind.macd?.histogram, 4)} tone={ind.macd ? (ind.macd.histogram >= 0 ? "bull" : "bear") : undefined} />
      </div>
    </section>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("num mt-0.5 text-sm font-bold", tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>{value}</div>
    </div>
  );
}
