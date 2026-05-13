import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { sectors } from "@/lib/gielda/mock-sectors";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gielda/sektory")({
  head: () => ({
    ...seoHead({
      title: "Sektory S&P 500 — scoring i analiza",
      description: "11 sektorów S&P 500: scoring momentum, trend, breadth, valuation, flows, ryzyko + katalizatory i ryzyka.",
      path: "/gielda/sektory",
    }),
  }),
  component: SectorsPage,
});

type SortKey = "score" | "ytd" | "change1m" | "weight";

function SectorsPage() {
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const sorted = useMemo(() => {
    const arr = [...sectors];
    arr.sort((a, b) => {
      if (sortBy === "score") return (b.score?.total ?? 0) - (a.score?.total ?? 0);
      if (sortBy === "ytd") return b.changeYtd - a.changeYtd;
      if (sortBy === "change1m") return b.change1m - a.change1m;
      return b.weight - a.weight;
    });
    return arr;
  }, [sortBy]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Sektory</div>
          <h1 className="mt-1 text-2xl font-bold">Mapa sektorów S&P 500</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scoring 0–100 oparty o momentum (25%), trend (20%), breadth (15%), valuation (15%), flows (15%), risk (10%).
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
          {(["score", "ytd", "change1m", "weight"] as const).map((k) => (
            <button key={k} onClick={() => setSortBy(k)}
              className={`rounded px-2 py-1 ${sortBy === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "score" ? "Score" : k === "ytd" ? "YTD" : k === "change1m" ? "1M" : "Waga"}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-3 lg:grid-cols-2">
        {sorted.map((s) => {
          const total = s.score?.total ?? 0;
          const tone = total >= 70 ? "bull" : total <= 40 ? "bear" : "neutral";
          return (
            <article
              key={s.symbol}
              className={cn(
                "rounded-xl border p-4",
                tone === "bull" && "border-bull/30 bg-bull/5",
                tone === "bear" && "border-bear/30 bg-bear/5",
                tone === "neutral" && "border-border bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.symbol} · waga {s.weight}% {s.pe && `· P/E ${s.pe}`}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    s.rating === "Overweight" && "bg-bull/20 text-bull",
                    s.rating === "Underweight" && "bg-bear/20 text-bear",
                    (!s.rating || s.rating === "Neutral") && "bg-muted text-muted-foreground",
                  )}>{s.rating ?? s.trend}</span>
                  <ScoreRing value={total} />
                </div>
              </div>

              {s.description && (
                <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <Cell label="1D" value={s.change1d} />
                <Cell label="1M" value={s.change1m} />
                <Cell label="YTD" value={s.changeYtd} />
              </div>

              {s.score && (
                <div className="mt-3 space-y-1.5">
                  <ScoreBar label="Momentum" v={s.score.momentum} />
                  <ScoreBar label="Trend" v={s.score.trendStrength} />
                  <ScoreBar label="Breadth (% nad MA50)" v={s.score.breadth} />
                  <ScoreBar label="Valuation" v={s.score.valuation} />
                  <ScoreBar label="Flows" v={s.score.flows} />
                  <ScoreBar label="Risk-adjusted" v={s.score.risk} />
                </div>
              )}

              {s.relativeStrength != null && (
                <div className="mt-3 text-xs">
                  <span className="text-muted-foreground">Siła względna vs S&P: </span>
                  <span className={cn("num font-bold", s.relativeStrength >= 0 ? "text-bull" : "text-bear")}>
                    {s.relativeStrength > 0 ? "+" : ""}{s.relativeStrength}
                  </span>
                </div>
              )}

              {s.topHoldings && s.topHoldings.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.topHoldings.map((h) => (
                    <span key={h} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{h}</span>
                  ))}
                </div>
              )}

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {s.catalysts && s.catalysts.length > 0 && (
                  <div className="rounded-md border border-bull/20 bg-bull/5 p-2">
                    <div className="text-[10px] font-semibold uppercase text-bull">Katalizatory</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">{s.catalysts.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}
                {s.risks && s.risks.length > 0 && (
                  <div className="rounded-md border border-bear/20 bg-bear/5 p-2">
                    <div className="text-[10px] font-semibold uppercase text-bear">Ryzyka</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">{s.risks.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background/40 p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("num font-bold", value >= 0 ? "text-bull" : "text-bear")}>{value.toFixed(1)}%</div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const tone = value >= 70 ? "text-bull" : value <= 40 ? "text-bear" : "text-warning";
  return (
    <div className={cn("rounded-md border border-border bg-background/60 px-2 py-1 text-center", tone)}>
      <div className="text-[9px] uppercase text-muted-foreground">Score</div>
      <div className="num text-base font-bold leading-none">{value}</div>
    </div>
  );
}

function ScoreBar({ label, v }: { label: string; v: number }) {
  const tone = v >= 70 ? "bg-bull" : v <= 40 ? "bg-bear" : "bg-warning";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span><span className="num">{v}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-background/60">
        <div className={cn("h-full", tone)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
