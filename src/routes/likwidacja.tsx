import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveCoins } from "@/lib/binance";
import { coins as demoCoins } from "@/lib/demo-data";
import { useTopCoins, useCoinOHLC } from "@/lib/top-coins";
import { CandlestickChart, type ChartZone } from "@/components/CandlestickChart";
import {
  buildHeatmap,
  buildVolumeClusters,
  computeBookImbalance,
  detectSpoofZones,
  detectSweeps,
} from "@/lib/liquidity";
import { formatMoney } from "@/components/StatPill";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CandlestickChart as CandleIcon,
  Droplets,
  Flame,
  Layers,
  Radar,
  Scale,
  Waves,
} from "lucide-react";
import { DataBadge } from "@/components/DataBadge";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/likwidacja")({
  head: () => ({
    ...seoHead({
      title: "Liquidity Heatmap: klastry, POC, ściany order booka",
      description: "Heatmapa likwidacji, klastry wolumenu (POC), detektor sweepów, strefy spoofingu i nierównowaga księgi zleceń na świecach.",
      path: "/likwidacja",
    }),
  }),
  component: LiquidityPage,
});

function compact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function LiquidityPage() {
  const { data: live } = useLiveCoins();
  const coins = live && live.length ? live : demoCoins;
  const symbols = coins.map((c) => c.symbol);
  const [symbol, setSymbol] = useState<string>("BTC");
  const coin = useMemo(
    () => coins.find((c) => c.symbol === symbol) ?? coins[0],
    [coins, symbol],
  );

  const heatmap = useMemo(() => buildHeatmap(coin), [coin]);
  const clusters = useMemo(() => buildVolumeClusters(coin), [coin]);
  const sweeps = useMemo(() => detectSweeps(coin), [coin]);
  const spoofs = useMemo(() => detectSpoofZones(coin), [coin]);
  const book = useMemo(() => computeBookImbalance(coin), [coin]);

  const longLiq = heatmap.filter((c) => c.side === "long").reduce((s, c) => s + c.notional, 0);
  const shortLiq = heatmap.filter((c) => c.side === "short").reduce((s, c) => s + c.notional, 0);
  const maxClusterVol = Math.max(...clusters.map((c) => c.volume));

  // Resolve CoinGecko id from top100 to fetch OHLC for the candlestick view.
  const { data: top } = useTopCoins();
  const cgId = top?.find((c) => c.symbol === coin.symbol)?.id;

  // Persisted chart prefs (timeframe + zone toggles).
  type LiqPrefs = { days: number; showLiq: boolean; showPOC: boolean; showWalls: boolean };
  const PREFS_KEY = "liq:chart-prefs:v1";
  const DEFAULT_PREFS: LiqPrefs = { days: 7, showLiq: true, showPOC: true, showWalls: true };
  const [prefs, setPrefs] = useState<LiqPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<LiqPrefs>) });
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        /* noop */
      }
    }
  }, [prefs]);
  const { days, showLiq, showPOC, showWalls } = prefs;
  const setDays = (d: number) => setPrefs((p) => ({ ...p, days: d }));

  const { data: candles, isLoading: loadingCandles, isError: candlesError } = useCoinOHLC(cgId, days);

  // Build price-line zones from microstructure data.
  const zones = useMemo<ChartZone[]>(() => {
    const out: ChartZone[] = [];
    if (showLiq) {
      const heat = [...heatmap].sort((a, b) => b.notional - a.notional).slice(0, 4);
      for (const h of heat) {
        out.push({
          price: h.price,
          color: h.side === "long" ? "#16a34a" : "#dc2626",
          label: `${h.side === "long" ? "Liq L" : "Liq S"} ${h.leverage}x`,
          lineStyle: 2,
        });
      }
    }
    if (showPOC) {
      const poc = clusters.find((c) => c.poc);
      if (poc) out.push({ price: poc.price, color: "#f59e0b", label: "POC", lineStyle: 0 });
    }
    if (showWalls) {
      for (const w of book.topWalls.slice(0, 2)) {
        out.push({
          price: w.price,
          color: w.side === "bid" ? "#22c55e" : "#ef4444",
          label: `${w.side === "bid" ? "Ściana bid" : "Ściana ask"}`,
          lineStyle: 3,
        });
      }
    }
    return out;
  }, [heatmap, clusters, book, showLiq, showPOC, showWalls]);

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Droplets className="h-3.5 w-3.5 text-primary" />
              Mapa płynności · struktura mikro-rynku
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">Liquidity Heatmap</h1>
              <DataBadge kind="proxy" />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Zobacz, gdzie ukryte są lewarowane pozycje i ściany kapitału. Dane szacunkowe
              wyprowadzone z wolumenu i zmienności — pokazują strukturę, nie dokładne kwoty.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {symbols.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-bold transition-colors",
                  s === coin.symbol
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-secondary",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cena" value={formatMoney(coin.price)} />
          <Stat label="24h" value={`${coin.change24h.toFixed(2)}%`} accent={coin.change24h >= 0 ? "bull" : "bear"} />
          <Stat label="Likw. longów (est.)" value={compact(longLiq)} accent="bear" />
          <Stat label="Likw. shortów (est.)" value={compact(shortLiq)} accent="bull" />
        </div>
      </header>

      {/* Candlestick with liquidity zones */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            icon={CandleIcon}
            title="Płynność na świecach"
            desc="Wykres OHLC z naniesionymi strefami: kluczowe klastry likwidacji, POC i ściany w księdze."
          />
          <div className="flex flex-wrap gap-1">
            {[
              { label: "1D", days: 1 },
              { label: "7D", days: 7 },
              { label: "30D", days: 30 },
              { label: "90D", days: 90 },
            ].map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={cn(
                  "rounded-md border border-border px-2.5 py-1 text-xs",
                  days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ZoneToggle active={showLiq} onClick={() => setPrefs((p) => ({ ...p, showLiq: !p.showLiq }))} dot="#dc2626">
            Likwidacje
          </ZoneToggle>
          <ZoneToggle active={showPOC} onClick={() => setPrefs((p) => ({ ...p, showPOC: !p.showPOC }))} dot="#f59e0b">
            POC
          </ZoneToggle>
          <ZoneToggle active={showWalls} onClick={() => setPrefs((p) => ({ ...p, showWalls: !p.showWalls }))} dot="#22c55e">
            Ściany
          </ZoneToggle>
          <span className="ml-auto flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <Legend color="#dc2626" label="Liq Short" />
            <Legend color="#16a34a" label="Liq Long" />
            <Legend color="#f59e0b" label="POC" />
            <Legend color="#22c55e" label="Bid" dashed />
            <Legend color="#ef4444" label="Ask" dashed />
          </span>
        </div>
        <div className="mt-3">
          {!cgId && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Brak danych OHLC dla {coin.symbol} (poza top 100).
            </div>
          )}
          {cgId && loadingCandles && (
            <div className="py-12 text-center text-sm text-muted-foreground">Ładuję świece…</div>
          )}
          {cgId && candlesError && (
            <div className="py-12 text-center text-sm text-bear">Nie udało się pobrać OHLC.</div>
          )}
          {cgId && candles && candles.length > 0 && (
            <CandlestickChart data={candles} zones={zones} height={360} />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader
          icon={Flame}
          title="Heatmapa likwidacji"
          desc="Im jaśniejszy pasek, tym większy klaster lewarowanych pozycji do likwidacji na danym poziomie."
        />
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          {[...heatmap].reverse().map((cell, i) => {
            const isShort = cell.side === "short";
            const widthPct = Math.max(4, cell.intensity * 100);
            return (
              <div
                key={i}
                className="flex items-center gap-2 border-b border-border/50 px-2 py-1 text-[11px] last:border-b-0"
              >
                <span className="num w-20 shrink-0 text-right text-muted-foreground">
                  {formatMoney(cell.price)}
                </span>
                <div className="relative flex h-5 flex-1 items-center overflow-hidden rounded-sm bg-muted/40">
                  <div
                    className={cn(
                      "h-full rounded-sm",
                      isShort
                        ? "bg-gradient-to-r from-bear/30 via-bear/60 to-bear"
                        : "bg-gradient-to-r from-bull/30 via-bull/60 to-bull",
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="absolute right-2 text-[10px] font-bold text-foreground/80">
                    {cell.leverage}x
                  </span>
                </div>
                <span className="num w-16 shrink-0 text-right text-muted-foreground">
                  {compact(cell.notional)}
                </span>
                <span
                  className={cn(
                    "w-12 shrink-0 text-right text-[10px] font-bold uppercase",
                    isShort ? "text-bear" : "text-bull",
                  )}
                >
                  {isShort ? "Short" : "Long"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Magnetyzm: cena często „zbiera” gęste klastry. Duże skupiska = magnesy, gdzie market makerzy
          dążą do spustu stop-lossów.
        </p>
      </section>

      {/* Volume clusters */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader
          icon={Layers}
          title="Wolumen klastrowy"
          desc="Profil obrotu wg ceny. POC (Point of Control) = poziom z największym obrotem — silny magnes i wsparcie/opór."
        />
        <div className="mt-4 space-y-1">
          {[...clusters].reverse().map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="num w-20 shrink-0 text-right text-muted-foreground">
                {formatMoney(c.price)}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-sm",
                    c.poc ? "bg-warning" : "bg-primary/60",
                  )}
                  style={{ width: `${(c.volume / maxClusterVol) * 100}%` }}
                />
              </div>
              <span className="num w-20 shrink-0 text-right text-muted-foreground">
                {compact(c.volume)}
              </span>
              {c.poc && (
                <span className="w-12 shrink-0 rounded bg-warning/20 px-1.5 py-0.5 text-center text-[9px] font-bold uppercase text-warning">
                  POC
                </span>
              )}
              {!c.poc && <span className="w-12 shrink-0" />}
            </div>
          ))}
        </div>
      </section>

      {/* Sweeps */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader
          icon={Waves}
          title="Detektor przemiatania (liquidity sweeps)"
          desc="Szybkie wybicia poniżej/ powyżej lokalnych ekstremów, które zbierają stop-lossy. Reclaimed = cena natychmiast wróciła = pułapka."
        />
        <ul className="mt-4 divide-y divide-border">
          {sweeps.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                  s.side === "long"
                    ? "bg-bear/20 text-bear"
                    : "bg-bull/20 text-bull",
                )}
                title={s.side === "long" ? "Sweep stop-lossów longów" : "Sweep stop-lossów shortów"}
              >
                {s.side === "long" ? "Long sweep" : "Short sweep"}
              </span>
              <span className="num font-semibold">{formatMoney(s.price)}</span>
              <span className="num text-xs text-muted-foreground">{compact(s.size)}</span>
              <span className="text-xs text-muted-foreground">{s.age}</span>
              {s.reclaimed && (
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                  <AlertTriangle className="h-3 w-3" /> reclaimed — pułapka
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Spoof zones */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader
          icon={Radar}
          title="Strefy podszywania się (spoofing)"
          desc="Duże fałszywe zlecenia, które znikają z księgi zanim zostaną wykonane — manipulacja, by zachęcić innych do wejścia."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {spoofs.map((z, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-3",
                z.side === "bid" ? "border-bull/30 bg-bull/5" : "border-bear/30 bg-bear/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                    z.side === "bid" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear",
                  )}
                >
                  Fałszywy {z.side === "bid" ? "bid" : "ask"}
                </span>
                <span className="num text-sm font-semibold">{formatMoney(z.price)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Rozmiar: {compact(z.size)}</span>
                <span>Wycofano: {z.pulledPct.toFixed(0)}%</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${z.confidence}%` }} />
                </div>
                <span className="num text-[10px] text-muted-foreground">{z.confidence.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Order book imbalance */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader
          icon={Scale}
          title="Nierównowaga księgi zleceń"
          desc="Kto dominuje: kupujący (bid) czy sprzedający (ask)? Ściany pokazują największe zlecenia oczekujące."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Bidy (kupno)" value={compact(book.bidsUsd)} accent="bull" />
          <Stat label="Aski (sprzedaż)" value={compact(book.asksUsd)} accent="bear" />
          <Stat
            label="Skew"
            value={book.skew === "bid-heavy" ? "Bid-heavy" : book.skew === "ask-heavy" ? "Ask-heavy" : "Balans"}
            accent={book.skew === "bid-heavy" ? "bull" : book.skew === "ask-heavy" ? "bear" : undefined}
          />
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full border border-border">
          <div className="h-full bg-bull" style={{ width: `${book.ratio * 100}%` }} />
          <div className="h-full bg-bear" style={{ width: `${(1 - book.ratio) * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{(book.ratio * 100).toFixed(1)}% bid</span>
          <span>{((1 - book.ratio) * 100).toFixed(1)}% ask</span>
        </div>
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Top ściany
          </div>
          <ul className="mt-2 space-y-1">
            {book.topWalls.map((w, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "w-12 rounded px-1.5 py-0.5 text-center text-[10px] font-bold uppercase",
                    w.side === "bid" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear",
                  )}
                >
                  {w.side}
                </span>
                <span className="num">{formatMoney(w.price)}</span>
                <span className="ml-auto num text-muted-foreground">{compact(w.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Dane likwidacji i książki zleceń są szacunkami z wolumenu i zmienności. Pełna mapa wymaga
        integracji z futures (Binance/Bybit) — patrz{" "}
        <Link to="/ustawienia" className="text-primary hover:underline">
          Ustawienia
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "bull" | "bear";
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "num mt-1 text-base font-bold",
          accent === "bull" && "text-bull",
          accent === "bear" && "text-bear",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md border border-border bg-background/40 p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-background/40 px-1.5 py-0.5">
      <span
        className="inline-block h-0.5 w-3"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          backgroundImage: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`
            : undefined,
        }}
      />
      {label}
    </span>
  );
}

function ZoneToggle({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
      {children}
    </button>
  );
}
