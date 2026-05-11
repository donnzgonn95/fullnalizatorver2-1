import { useMemo, useState } from "react";
import { Activity, ChevronDown, Flame, History as HistoryIcon, Info, Lock, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_REGIME_IDS,
  METRIC_WEIGHTS,
  REGIME_THRESHOLDS,
  computeMetrics,
  type Regime,
  type RegimeId,
  type RegimeTone,
} from "@/lib/market-regime";
import { useRegime } from "@/lib/regime-store";
import { coins as demoCoins, type Coin } from "@/lib/demo-data";
import { useLiveCoins } from "@/lib/binance";

const toneClass: Record<RegimeTone, { wrap: string; dot: string; chip: string; bar: string }> = {
  bull: {
    wrap: "from-bull/30 via-bull/10 to-transparent border-bull/40",
    dot: "bg-bull",
    chip: "bg-bull/20 text-bull",
    bar: "bg-bull",
  },
  bear: {
    wrap: "from-bear/30 via-bear/10 to-transparent border-bear/40",
    dot: "bg-bear",
    chip: "bg-bear/20 text-bear",
    bar: "bg-bear",
  },
  warning: {
    wrap: "from-warning/30 via-warning/10 to-transparent border-warning/40",
    dot: "bg-warning",
    chip: "bg-warning/20 text-warning",
    bar: "bg-warning",
  },
  neutral: {
    wrap: "from-muted to-muted/10 border-border",
    dot: "bg-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground",
  },
};

export function MarketRegimeBanner({ coins: coinsProp }: { coins?: Coin[] }) {
  const { data: live, isLoading, isError } = useLiveCoins();
  const coins = coinsProp ?? live ?? demoCoins;
  const isLive = !!coinsProp || (!!live && live.length > 0);

  const { auto, active, isManual, setOverride, clearOverride } = useRegime(coins);
  const regime: Regime = active;
  const metrics = useMemo(() => computeMetrics(coins), [coins]);
  const [open, setOpen] = useState(false);
  const [openMetrics, setOpenMetrics] = useState(false);
  const [openRules, setOpenRules] = useState(false);
  const t = toneClass[regime.tone];

  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  return (
    <section className={cn("rounded-2xl border bg-gradient-to-br p-5 md:p-7", t.wrap)}>
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        Market Regime Engine
        <span className="text-foreground/50">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", isLive ? "animate-pulse bg-bull" : "bg-muted-foreground")} />
          {isLoading ? "ładuję…" : isError ? "dane DEMO" : isLive ? "na żywo" : "DEMO"}
        </span>
        {isManual && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
            <Lock className="h-3 w-3" /> tryb ręczny
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider", t.chip)}>
          <Flame className="h-3.5 w-3.5" />
          {regime.label} · {regime.pl}
        </span>
        <span className="num text-xs text-muted-foreground">
          pewność <span className="text-foreground font-semibold">{regime.confidence}%</span>
        </span>
        {isManual && (
          <span className="text-[11px] text-muted-foreground">
            auto-detekcja: <span className="font-semibold text-foreground">{auto.label}</span>
          </span>
        )}
      </div>

      <h1 className="mt-3 text-xl font-bold leading-snug md:text-3xl">{regime.headline}</h1>
      <p className="mt-2 max-w-3xl text-sm text-foreground/80 md:text-base">{regime.narrative}</p>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/40">
          <div className={cn("h-full", t.bar)} style={{ width: `${regime.confidence}%` }} />
        </div>
      </div>

      {/* Override controls */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Tryb:</span>
        <select
          value={isManual ? regime.id : "auto"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "auto") clearOverride();
            else setOverride(v as RegimeId);
          }}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          aria-label="Wybór reżimu"
        >
          <option value="auto">Auto ({auto.label})</option>
          {ALL_REGIME_IDS.map((id) => (
            <option key={id} value={id}>
              Ręczny: {labelFor(id)}
            </option>
          ))}
        </select>
        {isManual && (
          <button
            type="button"
            onClick={clearOverride}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold hover:bg-muted"
          >
            ↺ Wróć do automatu
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Override jest globalny — wpływa też na sygnały i setupy.
        </span>
      </div>

      {/* Playbook */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {regime.playbook.map((p) => (
          <div key={p} className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} />
            <span>{p}</span>
          </div>
        ))}
      </div>

      {/* Toggles */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 hover:text-foreground">
          <Info className="h-3.5 w-3.5" />
          {open ? "Ukryj sygnały" : "Pokaż sygnały decyzyjne"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <button type="button" onClick={() => setOpenMetrics((v) => !v)} className="inline-flex items-center gap-1.5 hover:text-foreground">
          <HistoryIcon className="h-3.5 w-3.5" />
          {openMetrics ? "Ukryj metryki" : "Szczegółowe metryki"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openMetrics && "rotate-180")} />
        </button>
        <button type="button" onClick={() => setOpenRules((v) => !v)} className="inline-flex items-center gap-1.5 hover:text-foreground">
          {openRules ? "Ukryj progi" : "Progi reżimów"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openRules && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {regime.signals.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-md border border-border/60 bg-background/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className={cn("num font-semibold",
                s.direction === "bull" && "text-bull",
                s.direction === "bear" && "text-bear",
                s.direction === "neutral" && "text-foreground")}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {openMetrics && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/60 bg-background/30">
          <table className="w-full text-xs">
            <thead className="bg-background/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Metryka</th>
                <th className="px-3 py-2 text-right font-semibold">Wartość</th>
                <th className="px-3 py-2 text-left font-semibold">Waga</th>
                <th className="px-3 py-2 text-left font-semibold">Próg byczy</th>
                <th className="px-3 py-2 text-left font-semibold">Próg niedźwiedzi</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_WEIGHTS.map((mw) => {
                const raw = metrics[mw.key] as number;
                const display = mw.key === "breadth"
                  ? `${raw.toFixed(0)}%`
                  : ["avg24h", "avg7d", "altsMinusBtc7d"].includes(mw.key as string)
                    ? fmt(raw)
                    : String(raw);
                return (
                  <tr key={mw.key as string} className="border-t border-border/40">
                    <td className="px-3 py-2">{mw.label}</td>
                    <td className="num px-3 py-2 text-right font-semibold">{display}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                        mw.weight === "strong" && "bg-primary/20 text-primary",
                        mw.weight === "medium" && "bg-warning/20 text-warning",
                        mw.weight === "weak" && "bg-muted text-muted-foreground")}>
                        {mw.weight}
                      </span>
                    </td>
                    <td className="num px-3 py-2 text-bull/90">{mw.bullThreshold}</td>
                    <td className="num px-3 py-2 text-bear/90">{mw.bearThreshold}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openRules && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/60 bg-background/30">
          <table className="w-full text-xs">
            <thead className="bg-background/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Reżim</th>
                <th className="px-3 py-2 text-left font-semibold">Warunek wykrycia</th>
              </tr>
            </thead>
            <tbody>
              {REGIME_THRESHOLDS.map((r) => (
                <tr key={r.id} className={cn("border-t border-border/40", r.id === auto.id && "bg-primary/10")}>
                  <td className="num px-3 py-2 text-muted-foreground">{r.priority}</td>
                  <td className="px-3 py-2 font-semibold">{r.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border/40 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
            Reguły są sprawdzane w kolejności od priorytetu 1 — pierwsza spełniona wygrywa.
          </div>
        </div>
      )}
    </section>
  );
}

function labelFor(id: RegimeId): string {
  return REGIME_THRESHOLDS.find((r) => r.id === id)?.label ?? id;
}
