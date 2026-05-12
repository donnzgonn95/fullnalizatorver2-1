import { createFileRoute, Link } from "@tanstack/react-router";
import { sentiment, setups as demoSetups, alerts as demoAlerts } from "@/lib/demo-data";
import { useLiveCoins } from "@/lib/binance";
import { adjustAlertsForRegime, adjustSetupsForRegime, generateSetups, generateAlerts } from "@/lib/signals";
import { useRegime } from "@/lib/regime-store";
import { useMemo } from "react";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { MarketRegimeBanner } from "@/components/MarketRegimeBanner";
import { RegimeHistoryPanel } from "@/components/RegimeHistoryPanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SectionControls } from "@/components/SectionControls";
import { useDashboardLayout, type SectionId } from "@/lib/dashboard-layout";
import { ArrowRight, Radio, RotateCcw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...seoHead({
      title: "Co robić teraz na rynku krypto?",
      description: "Polski monitor sentymentu, siły relatywnej top 100 krypto, watchlista, alerty cenowe i AI asystent — jednoznaczna rekomendacja co robić teraz.",
      path: "/",
    }),
  }),
  component: Index,
});

function Index() {
  const { data: liveCoins, isError, isLoading } = useLiveCoins();
  const featured = ["BTC", "ETH", "SOL", "ARB"];
  const liveTickers = (liveCoins ?? []).filter((c) => featured.includes(c.symbol));

  const coinsForRegime = liveCoins && liveCoins.length ? liveCoins : [];
  const { active: activeRegime } = useRegime(coinsForRegime);

  const rawSetups = useMemo(
    () => (liveCoins && liveCoins.length ? generateSetups(liveCoins) : demoSetups),
    [liveCoins],
  );
  const rawAlerts = useMemo(
    () => (liveCoins && liveCoins.length ? generateAlerts(liveCoins) : demoAlerts),
    [liveCoins],
  );
  const { setups, note: regimeNote } = useMemo(
    () => adjustSetupsForRegime(rawSetups, activeRegime.id),
    [rawSetups, activeRegime.id],
  );
  const alerts = useMemo(
    () => adjustAlertsForRegime(rawAlerts, activeRegime.id),
    [rawAlerts, activeRegime.id],
  );
  const top = setups.slice(0, 3);

  const { layout, reset } = useDashboardLayout();

  const sections: Record<SectionId, React.ReactNode> = {
    regime: (
      <Section id="regime" title={<h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Reżim rynku</h2>}>
        <MarketRegimeBanner coins={liveCoins ?? undefined} />
      </Section>
    ),
    watchlist: (
      <Section id="watchlist" title={null} bare>
        <WatchlistPanel />
      </Section>
    ),
    tickers: (
      <Section
        id="tickers"
        title={
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Radio className={cn("h-3.5 w-3.5", !isError && liveCoins && "animate-pulse text-bull")} />
            {isError ? "Brak połączenia · DEMO" : isLoading ? "Łączę z Binance…" : "Binance · ceny na żywo"}
          </div>
        }
        extra={<Link to="/sila" className="text-xs text-primary hover:underline">Pełny ranking →</Link>}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(liveTickers.length ? liveTickers : featured.map((s) => ({ symbol: s, price: 0, change24h: 0 }))).map((c) => (
            <div key={c.symbol} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{c.symbol}</span>
                {c.price > 0 && <ChangePill value={c.change24h} />}
              </div>
              <div className="num mt-1 text-base font-semibold">{c.price > 0 ? formatMoney(c.price) : "—"}</div>
            </div>
          ))}
        </div>
      </Section>
    ),
    stats: (
      <Section id="stats" title={<h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Statystyki rynku</h2>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Fear & Greed" value={`${sentiment.fearGreedIndex}`} sub={sentiment.fearGreedLabel} accent="bull" />
          <StatCard label="Dominacja BTC" value={`${sentiment.btcDominance}%`} sub="↓ rotacja w alty" />
          <StatCard label="Kapitalizacja" value="$2.69T" sub={<ChangePill value={sentiment.marketCapChange24h} />} />
          <StatCard label="Trend rynku" value="Byczy" sub="krótkoterminowy" accent="bull" />
        </div>
      </Section>
    ),
    setups: (
      <Section
        id="setups"
        title={
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Top 3 setupy dziś</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                regimeNote.tone === "bull" && "bg-bull/20 text-bull",
                regimeNote.tone === "bear" && "bg-bear/20 text-bear",
                regimeNote.tone === "warning" && "bg-warning/20 text-warning",
                regimeNote.tone === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {regimeNote.tag}
            </span>
          </div>
        }
        extra={
          <Link to="/setupy" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Wszystkie <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {top.map((s) => (
            <div key={s.symbol} className="rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-base font-bold">{s.symbol}</div>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    s.type === "Long" && "bg-bull/20 text-bull",
                    s.type === "Short" && "bg-bear/20 text-bear",
                    s.type === "Obserwuj" && "bg-warning/20 text-warning",
                  )}
                >
                  {s.type}
                </span>
              </div>
              <div className="num mt-2 text-xs text-muted-foreground">
                Wejście: <span className="text-foreground">${s.entry}</span> · RR {s.riskReward}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${s.confidence}%` }} />
                </div>
                <span className="num text-xs text-muted-foreground">{s.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    ),
    alerts: (
      <Section
        id="alerts"
        title={<h2 className="text-lg font-bold">Najnowsze alerty</h2>}
        extra={
          <Link to="/alerty" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Wszystkie <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <ul className="divide-y divide-border">
          {alerts.slice(0, 4).map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <ShieldAlert
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  a.level === "critical" && "text-bear",
                  a.level === "warning" && "text-warning",
                  a.level === "info" && "text-muted-foreground",
                )}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="num">{a.time}</span>
                  <span className="font-semibold text-foreground">{a.symbol}</span>
                </div>
                <div className="text-sm">{a.message}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    ),
    history: (
      <Section id="history" title={<h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Historia reżimów</h2>}>
        <RegimeHistoryPanel />
      </Section>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={reset}
          data-testid="dashboard-reset-layout"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Przywróć domyślny układ"
        >
          <RotateCcw className="h-3 w-3" /> Domyślny układ
        </button>
      </div>
      {layout.order.map((id) => (
        <div key={id} data-section={id}>
          {sections[id]}
        </div>
      ))}
    </div>
  );
}

function Section({
  id,
  title,
  extra,
  children,
  bare,
}: {
  id: SectionId;
  title: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;
}) {
  const { layout } = useDashboardLayout();
  const collapsed = !!layout.collapsed[id];

  return (
    <section className={cn(!bare && "rounded-xl border border-border bg-card p-5")}>
      <SectionControls id={id} title={title} className={cn(!bare ? "mb-3" : "mb-2 px-1")}>
        {extra}
      </SectionControls>
      {!collapsed && <div className={cn(bare && "")}>{children}</div>}
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  accent?: "bull" | "bear";
}) {
  return (
    <div className="surface-glass relative overflow-hidden rounded-xl p-4 transition-colors hover:border-[color-mix(in_oklab,var(--accent-mint)_30%,transparent)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "num mt-1.5 text-[1.65rem] font-semibold leading-none tracking-tight text-foreground",
          accent === "bull" && "text-bull",
          accent === "bear" && "text-bear",
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground/90">{sub}</div>
    </div>
  );
}
