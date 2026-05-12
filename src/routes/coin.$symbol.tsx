import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useTopCoins, useCoinOHLC, useCoinVolumes } from "@/lib/top-coins";
import { CandlestickChart, type ChartOverlay } from "@/components/CandlestickChart";
import { RSIChart } from "@/components/RSIChart";
import { WatchlistStar } from "@/components/WatchlistStar";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { sma, ema, rsi as rsiCalc } from "@/lib/indicators";
import { AlertTriggersPanel } from "@/components/AlertTriggersPanel";
import { TradingViewChart, resolveTradingViewSymbol, TV_RANGE_OPTIONS, type TradingViewRange } from "@/components/TradingViewChart";
import { TradingViewRangeSwitcher } from "@/components/TradingViewRangeSwitcher";
import { TradingViewSymbolOverride } from "@/components/TradingViewSymbolOverride";
import { useCoinTvSettings, TV_INTERVAL_OPTIONS } from "@/lib/coin-tv-settings";
import { pushRecentCoin } from "@/lib/recent-coins";
import { cn } from "@/lib/utils";

const PREFS_KEY = "coin:chart-prefs:v1";
const TV_RANGE_KEY = "coin:tv-range:v1";
type Prefs = { days: number; showSMA: boolean; showEMA: boolean; showRSI: boolean; showVolume: boolean };
const DEFAULT_PREFS: Prefs = { days: 30, showSMA: true, showEMA: true, showRSI: true, showVolume: true };

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

import { seoHead, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/coin/$symbol")({
  head: ({ params }) => {
    const sym = params.symbol.toUpperCase();
    return {
      ...seoHead({
        title: `${sym} — cena, wykres świecowy, RSI`,
        description: `Szczegółowe statystyki ${sym}: świece OHLC, SMA/EMA, RSI 14, wolumen, alerty cenowe i analiza AI. Dane z CoinGecko / Binance.`,
        path: `/coin/${sym}`,
        type: "article",
      }),
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "FinancialProduct",
          name: sym,
          category: "Cryptocurrency",
          description: `Wykres, wskaźniki techniczne i alerty dla ${sym}.`,
        }),
      ],
    };
  },
  component: CoinPage,
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      Nie udało się załadować: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-lg font-bold">Nie znaleziono kryptowaluty</h1>
      <Link to="/" className="text-primary hover:underline">← Powrót</Link>
    </div>
  ),
});

const RANGES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1R", days: 365 },
] as const;

function CoinPage() {
  const { symbol } = Route.useParams();
  const sym = symbol.toUpperCase();
  const { data: coins, isLoading } = useTopCoins();
  const coin = coins?.find((c) => c.symbol === sym);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  // Hydrate prefs after mount to keep SSR output deterministic.
  useEffect(() => setPrefs(loadPrefs()), []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        /* noop */
      }
    }
  }, [prefs]);
  const { days, showSMA, showEMA, showRSI, showVolume } = prefs;
  const setDays = (days: number) => setPrefs((p) => ({ ...p, days }));
  const setShowSMA = (fn: (v: boolean) => boolean) => setPrefs((p) => ({ ...p, showSMA: fn(p.showSMA) }));
  const setShowEMA = (fn: (v: boolean) => boolean) => setPrefs((p) => ({ ...p, showEMA: fn(p.showEMA) }));
  const setShowRSI = (fn: (v: boolean) => boolean) => setPrefs((p) => ({ ...p, showRSI: fn(p.showRSI) }));
  const setShowVolume = (fn: (v: boolean) => boolean) => setPrefs((p) => ({ ...p, showVolume: fn(p.showVolume) }));

  // TradingView range — utrwalony osobno w localStorage (globalnie).
  const [tvRange, setTvRange] = useState<TradingViewRange>("3M");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(TV_RANGE_KEY) as TradingViewRange | null;
    if (saved && (TV_RANGE_OPTIONS as readonly string[]).includes(saved)) setTvRange(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(TV_RANGE_KEY, tvRange); } catch { /* noop */ }
    }
  }, [tvRange]);

  // TradingView ustawienia per-coin (override symbolu, motyw, interwał).
  const { settings: tvSettings, update: updateTvSettings } = useCoinTvSettings(sym);
  const tvAutoSymbol = resolveTradingViewSymbol(sym);
  const tvSymbol = tvSettings.symbolOverride ?? tvAutoSymbol;

  // Track as recently viewed once per visit/symbol.
  useEffect(() => {
    if (sym) pushRecentCoin(sym);
  }, [sym]);

  // Sticky mini-header — appears after scrolling and dokuje pod aktualnym <header>.
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(64);
  useEffect(() => {
    const headerEl = document.querySelector("header");
    const measure = () => {
      if (headerEl) setHeaderHeight(headerEl.getBoundingClientRect().height);
    };
    measure();
    const ro = headerEl && "ResizeObserver" in window ? new ResizeObserver(measure) : null;
    if (ro && headerEl) ro.observe(headerEl);
    const onScroll = () => setShowStickyHeader(window.scrollY > 280);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);

  // Indicators panel collapsed by default on mobile.
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") setIndicatorsOpen(window.innerWidth >= 768);
  }, []);

  const { data: candles, isLoading: loadingChart, isError: chartError } = useCoinOHLC(coin?.id, days);
  const { data: volumes } = useCoinVolumes(coin?.id, days);

  const overlays: ChartOverlay[] = useMemo(() => {
    if (!candles?.length) return [];
    const list: ChartOverlay[] = [];
    if (showSMA) list.push({ id: "sma20", color: "#3b82f6", title: "SMA 20", data: sma(candles, 20) });
    if (showEMA) list.push({ id: "ema50", color: "#f59e0b", title: "EMA 50", data: ema(candles, 50) });
    return list;
  }, [candles, showSMA, showEMA]);

  const rsiData = useMemo(() => (candles?.length ? rsiCalc(candles, 14) : []), [candles]);

  if (!isLoading && coins && !coin) {
    throw notFound();
  }

  return (
    <div className="space-y-6">
      {/* Sticky mini-header — pojawia się przy scrollu */}
      {coin && (
        <div
          data-testid="coin-sticky-header"
          style={{ top: headerHeight }}
          className={cn(
            "fixed inset-x-0 z-40 border-b border-border bg-background/95 backdrop-blur-md transition-all duration-200",
            showStickyHeader ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
            {coin.image && <img src={coin.image} alt="" width={24} height={24} className="h-6 w-6 rounded-full" />}
            <span className="font-bold">{coin.symbol}</span>
            <span className="num text-sm font-semibold">{formatMoney(coin.price)}</span>
            <ChangePill value={coin.change24h} />
            <div className="ml-auto"><WatchlistStar symbol={sym} /></div>
          </div>
        </div>
      )}

      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Powrót
        </Link>
      </div>

      {/* Header */}
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          {coin?.image && <img src={coin.image} alt={coin.name} width={48} height={48} className="h-12 w-12 rounded-full" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{coin?.name ?? sym}</h1>
              <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase">{sym}</span>
              {coin?.rank && (
                <span className="num rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{coin.rank}</span>
              )}
            </div>
            {coin && (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="num text-2xl font-bold">{formatMoney(coin.price)}</span>
                <ChangePill value={coin.change24h} />
                <span className="text-xs text-muted-foreground">24h</span>
              </div>
            )}
          </div>
          <WatchlistStar symbol={sym} />
        </div>
      </header>

      {/* Stats grid */}
      {coin && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Statystyki">
          <Stat label="Kapitalizacja" value={formatMoney(coin.marketCap)} />
          <Stat label="Wolumen 24h" value={formatMoney(coin.volume24h)} />
          <Stat label="Zmiana 7D" value={`${coin.change7d > 0 ? "+" : ""}${coin.change7d.toFixed(2)}%`} accent={coin.change7d >= 0 ? "bull" : "bear"} />
          <Stat label="RSI (przybl.)" value={`${coin.rsi}`} accent={coin.rsi >= 70 ? "bear" : coin.rsi <= 30 ? "bull" : undefined} />
          <Stat label="Maks. 24h" value={coin.high24h ? formatMoney(coin.high24h) : "—"} />
          <Stat label="Min. 24h" value={coin.low24h ? formatMoney(coin.low24h) : "—"} />
          <Stat label="ATH" value={coin.ath ? formatMoney(coin.ath) : "—"} sub={coin.athChangePct != null ? `${coin.athChangePct.toFixed(1)}% od ATH` : undefined} />
          <Stat label="Podaż w obiegu" value={coin.circulatingSupply ? coin.circulatingSupply.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) : "—"} />
        </section>
      )}

      {/* Candlestick chart + controls */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Wykres świecowy">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Mapa świec (Candlestick)</h2>
          {/* Segmented control for ranges */}
          <div role="tablist" aria-label="Zakres czasu" className="inline-flex overflow-hidden rounded-md border border-border">
            {RANGES.map((r) => (
              <button
                key={r.days}
                role="tab"
                aria-selected={days === r.days}
                onClick={() => setDays(r.days)}
                className={cn(
                  "px-3 py-1 text-xs transition-colors",
                  days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators panel — collapsible (zwinięte na mobile) */}
        <div className="mb-3 overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setIndicatorsOpen((v) => !v)}
            aria-expanded={indicatorsOpen}
            className="flex w-full items-center justify-between bg-card/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span>Wskaźniki techniczne</span>
            {indicatorsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {indicatorsOpen && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border bg-background/40 p-3">
              <Toggle active={showSMA} onClick={() => setShowSMA((v) => !v)} dot="#3b82f6">SMA 20</Toggle>
              <Toggle active={showEMA} onClick={() => setShowEMA((v) => !v)} dot="#f59e0b">EMA 50</Toggle>
              <Toggle active={showVolume} onClick={() => setShowVolume((v) => !v)}>Wolumen</Toggle>
              <Toggle active={showRSI} onClick={() => setShowRSI((v) => !v)} dot="#a855f7">RSI 14</Toggle>
            </div>
          )}
        </div>

        {loadingChart && <ChartSkeleton />}
        {chartError && <div className="py-12 text-center text-sm text-bear">Nie udało się pobrać danych OHLC.</div>}
        {candles && candles.length > 0 && (
          <CandlestickChart data={candles} overlays={overlays} volumes={showVolume ? volumes : undefined} />
        )}
        {candles && candles.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">Brak danych świecowych dla tego zakresu.</div>
        )}

        {showRSI && rsiData.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>RSI 14 — strefy 30/70</span>
              <span className="num">aktualne: {rsiData[rsiData.length - 1].value.toFixed(1)}</span>
            </div>
            <RSIChart data={rsiData} />
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Dane: CoinGecko OHLC + market_chart. Wskaźniki SMA/EMA/RSI obliczane lokalnie z zamknięć świec — nie generują dodatkowych zapytań do API.
        </p>
      </section>

      {/* TradingView Advanced Chart — pełna mapa rynkowa pary z auto-mapowaniem giełdy */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Wykres TradingView">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">TradingView</h2>
            <div className="mt-1">
              <TradingViewSymbolOverride
                resolved={tvAutoSymbol}
                override={tvSettings.symbolOverride}
                onChange={(next) => updateTvSettings({ symbolOverride: next })}
                onClear={() => updateTvSettings({ symbolOverride: undefined })}
              />
            </div>
          </div>
          <TradingViewRangeSwitcher value={tvRange} onChange={setTvRange} />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Interwał:</span>
            <select
              data-testid="tv-interval"
              value={tvSettings.interval}
              onChange={(e) => updateTvSettings({ interval: e.target.value as typeof tvSettings.interval })}
              className="h-7 rounded border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              aria-label="Interwał świecy TradingView"
            >
              {TV_INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-background">
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Motyw:</span>
            <div role="radiogroup" aria-label="Motyw wykresu" className="inline-flex overflow-hidden rounded border border-border">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tvSettings.theme === t}
                  data-testid={`tv-theme-${t}`}
                  onClick={() => updateTvSettings({ theme: t })}
                  className={cn(
                    "px-2 py-1 text-xs",
                    tvSettings.theme === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {t === "dark" ? "Ciemny" : "Jasny"}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div id="tradingview-chart-panel" role="tabpanel" aria-labelledby={`tv-range-tab-${tvRange}`}>
          <TradingViewChart
            symbol={tvSymbol}
            height={560}
            range={tvRange}
            interval={tvSettings.interval}
            theme={tvSettings.theme}
          />
        </div>
      </section>

      <AlertTriggersPanel symbol={sym} currentPrice={coin?.price} />
    </div>
  );
}

function Toggle({
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
        active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
      {children}
    </button>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "bull" | "bear" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-lg font-bold", accent === "bull" && "text-bull", accent === "bear" && "text-bear")}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-2 py-2" aria-busy="true" aria-label="Ładuję wykres">
      <div className="h-[320px] w-full animate-pulse rounded-md bg-muted/40" />
      <div className="flex gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}
