// Wykres TradingView (Advanced Chart) — lazy-loaded (IntersectionObserver),
// z mapowaniem tickerów krypto i fallbackiem na timeout / błąd sieci.
import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export type TradingViewRange = "1D" | "1M" | "3M" | "6M" | "YTD" | "12M" | "ALL";

export type TradingViewChartProps = {
  /** Symbol w formacie TradingView, np. "BINANCE:BTCUSDT". Wygrywa nad `coinSymbol`. */
  symbol?: string;
  /** Skrót coina (np. "BTC") — mapowany przez `resolveTradingViewSymbol`. */
  coinSymbol?: string;
  /** Wysokość kontenera w px. Domyślnie 520. */
  height?: number;
  /** Zakres podświetlony przy starcie (np. "1D", "1M", "3M"...). */
  range?: TradingViewRange;
  /** Interwał świec ("1","5","15","60","D","W","M"). Domyślnie "D". */
  interval?: string;
  /** Język UI widgetu — domyślnie "pl". */
  locale?: string;
  /** Motyw — "dark" / "light". Domyślnie "dark". */
  theme?: "dark" | "light";
  /** Timeout w ms; po tym czasie pokazujemy fallback. Domyślnie 5000. */
  loadTimeoutMs?: number;
};

/**
 * Mapowanie nietypowych tickerów krypto na konkretne pary giełdowe TradingView.
 * Większość coinów dostępna jest jako BINANCE:{SYM}USDT, ale część nie istnieje
 * na Binance (np. delistowane lub regionalnie blokowane) i wymaga innej giełdy.
 */
const TV_SYMBOL_OVERRIDES: Record<string, string> = {
  // Stable
  USDT: "BINANCE:USDTUSD",
  USDC: "COINBASE:USDCUSD",
  DAI: "COINBASE:DAIUSD",
  // Wrapped / synthetics
  WBTC: "BINANCE:WBTCBTC",
  WETH: "UNISWAP3ETH:WETHUSDC",
  // Brak na Binance lub niska płynność na USDT
  XRP: "BITSTAMP:XRPUSD",
  XMR: "KRAKEN:XMRUSD",
  BCH: "COINBASE:BCHUSD",
  HBAR: "COINBASE:HBARUSD",
  LEO: "BITFINEX:LEOUSD",
  TON: "OKX:TONUSDT",
  KAS: "KUCOIN:KASUSDT",
  CRO: "CRYPTO:CROUSD",
  OKB: "OKX:OKBUSDT",
  BGB: "BITGET:BGBUSDT",
  BNB: "BINANCE:BNBUSDT",
};

export function resolveTradingViewSymbol(input: string | undefined): string {
  if (!input) return "BINANCE:BTCUSDT";
  const sym = input.toUpperCase().trim();
  if (sym.includes(":")) return sym; // już pełen symbol
  if (TV_SYMBOL_OVERRIDES[sym]) return TV_SYMBOL_OVERRIDES[sym];
  return `BINANCE:${sym}USDT`;
}

const TV_RANGES: TradingViewRange[] = ["1D", "1M", "3M", "6M", "YTD", "12M", "ALL"];

function TradingViewChartImpl({
  symbol,
  coinSymbol,
  height = 520,
  range = "3M",
  interval = "D",
  locale = "pl",
  theme = "dark",
  loadTimeoutMs = 5000,
}: TradingViewChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tvSymbol = symbol ?? resolveTradingViewSymbol(coinSymbol);

  const [inView, setInView] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "timeout" | "error">("idle");
  const [reloadKey, setReloadKey] = useState(0);

  // Lazy mount — startujemy widget dopiero, gdy sekcja wejdzie w viewport.
  useEffect(() => {
    if (inView) return;
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView || !containerRef.current) return;
    const root = containerRef.current;
    root.innerHTML = "";
    setStatus("loading");

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "calc(100% - 32px)";
    widget.style.width = "100%";
    root.appendChild(widget);

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    copyright.innerHTML =
      '<a href="https://pl.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';
    root.appendChild(copyright);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: true,
      interval,
      locale,
      save_image: true,
      style: "1",
      symbol: tvSymbol,
      theme,
      timezone: "Etc/UTC",
      backgroundColor: "#0F0F0F",
      gridColor: "rgba(242, 242, 242, 0.13)",
      watchlist: [],
      withdateranges: false,
      range,
      compareSymbols: [],
      studies: [],
      autosize: true,
    });

    const onError = () => setStatus("error");
    script.addEventListener("error", onError);
    root.appendChild(script);

    // Wykrycie udanego renderu — TradingView wstrzykuje <iframe> do widget container.
    let mo: MutationObserver | null = null;
    if ("MutationObserver" in window) {
      mo = new MutationObserver(() => {
        if (widget.querySelector("iframe")) {
          setStatus("ready");
          mo?.disconnect();
        }
      });
      mo.observe(widget, { childList: true, subtree: true });
    }

    const timeout = window.setTimeout(() => {
      setStatus((s) => (s === "ready" ? s : "timeout"));
    }, loadTimeoutMs);

    return () => {
      window.clearTimeout(timeout);
      mo?.disconnect();
      script.removeEventListener("error", onError);
      root.innerHTML = "";
    };
  }, [inView, tvSymbol, range, interval, locale, theme, loadTimeoutMs, reloadKey]);

  const showFallback = status === "timeout" || status === "error";

  return (
    <div
      ref={wrapperRef}
      data-testid="tradingview-chart"
      data-tv-symbol={tvSymbol}
      data-tv-status={status}
      className="relative overflow-hidden rounded-lg border border-border bg-[#0F0F0F]"
      style={{ height }}
    >
      {!inView && <ChartSkeleton label="Wykres załaduje się po wejściu w widok…" testId="tv-lazy" />}
      {inView && status === "loading" && <ChartSkeleton label="Ładuję wykres TradingView…" testId="tv-loading" />}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: "100%", width: "100%", visibility: status === "ready" ? "visible" : "hidden" }}
      />
      {showFallback && (
        <div
          data-testid="tv-fallback"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 p-6 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-warning" />
          <div className="text-sm font-semibold">
            {status === "timeout" ? "Wykres ładuje się dłużej niż zwykle" : "Nie udało się wczytać wykresu TradingView"}
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Sprawdź połączenie sieciowe lub blokery skryptów. Możesz spróbować ponownie.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Spróbuj ponownie
          </button>
        </div>
      )}
    </div>
  );
}

function ChartSkeleton({ label, testId }: { label: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="absolute inset-0 z-0 flex flex-col gap-2 p-4"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-full w-full animate-pulse rounded-md bg-muted/30" />
      <div className="text-center text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export const TV_RANGE_OPTIONS = TV_RANGES;
export const TradingViewChart = memo(TradingViewChartImpl);
