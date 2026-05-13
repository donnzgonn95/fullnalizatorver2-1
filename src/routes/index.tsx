import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveCoins } from "@/lib/binance";
import { generateSetups } from "@/lib/signals";
import { useRegime } from "@/lib/regime-store";
import { sentiment } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { FeatureCard } from "@/components/FeatureCard";
import { ModeSwitcher } from "@/components/gielda/ModeSwitcher";
import { FeedStatusBadge } from "@/components/feed/FeedStatusBadge";
import { TopSetupsWidget } from "@/components/feed/TopSetupsWidget";
import {
  Activity,
  Brain,
  Compass,
  Gauge,
  Radar,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...seoHead({
      title: "AI Quant Cockpit — co robić teraz",
      description: "Institutional crypto cockpit: tryb rynku, najlepszy setup, ryzyko, AI reasoning, przepływ kapitału, aktywne sygnały — w jednej przestrzeni.",
      path: "/",
    }),
  }),
  component: Index,
});

function Index() {
  const { data: liveCoins } = useLiveCoins();
  const coinsForRegime = liveCoins && liveCoins.length ? liveCoins : [];
  const { active: activeRegime } = useRegime(coinsForRegime);

  // Best setup — z globalnych detected_setups, fallback do demo
  const { data: bestLive } = useQuery({
    queryKey: ["best-setup-live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detected_setups").select("*")
        .is("user_id", null).in("status", ["pending", "active"])
        .order("signal_strength", { ascending: false })
        .order("detected_at", { ascending: false })
        .limit(1).maybeSingle();
      if (error) return null;
      return data;
    },
    refetchInterval: 30_000,
  });

  const fallbackSetups = useMemo(
    () => (liveCoins && liveCoins.length ? generateSetups(liveCoins) : []),
    [liveCoins],
  );
  const fb = fallbackSetups[0];

  return (
    <div className="space-y-6">
      <ModeSwitcher />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">AI Quant Cockpit</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Institutional trading operating system · live feed · auto setupy · risk controls
          </p>
        </div>
        <FeedStatusBadge />
      </div>

      {/* 4 kolorowe ramki — quick pulse */}
      <QuickFrames sentiment={sentiment} />

      {/* 1. TRYB RYNKU */}
      <FeatureCard
        variant={activeRegime.tone === "bull" ? "mint" : activeRegime.tone === "bear" ? "bear" : "warning"}
        icon={Compass}
        title="Tryb rynku"
        badge={activeRegime.label}
        description="Aktualny reżim rynkowy decyduje, czy preferujemy long, short, czy stoimy z boku. Zmienia agresywność setupów i poziom ryzyka."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Fear & Greed" value={`${sentiment.fearGreedIndex}`} sub={sentiment.fearGreedLabel} />
          <Mini label="Dominacja BTC" value={`${sentiment.btcDominance}%`} sub="rotacja w alty" />
          <Mini label="Kapitalizacja" value="$2.69T" sub={<ChangePill value={sentiment.marketCapChange24h} />} />
          <Mini label="Trend 24h" value="Byczy" sub="krótkoterminowy" />
        </div>
      </FeatureCard>

      {/* 2. BEST SETUP NOW — największa karta */}
      <BestSetupCard live={bestLive} fallback={fb} />

      {/* 3. RYZYKO */}
      <RiskCard />

      {/* 4. AI MYŚLI */}
      <AiThinkingCard regimeLabel={activeRegime.label} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5. PRZEPŁYW KAPITAŁU */}
        <CapitalFlowCard />

        {/* 6. AKTYWNE SYGNAŁY */}
        <FeatureCard
          variant="orange"
          icon={Radar}
          title="Aktywne sygnały"
          description="Top 10 globalnych setupów wykrytych przez skaner. Aktualizacja co 30 s."
          action={<Link to="/setupy/historia" className="text-xs text-primary hover:underline">Historia →</Link>}
        >
          <TopSetupsWidget />
        </FeatureCard>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 text-center">
        <Link to="/setupy" className="text-xs text-primary hover:underline">
          Klasyczny dashboard z watchlistą i alertami →
        </Link>
      </div>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="num mt-1 text-lg font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function BestSetupCard({ live, fallback }: { live: any; fallback: any }) {
  const isLive = !!live;
  const symbol = live?.symbol ?? fallback?.symbol ?? "—";
  const direction = (live?.direction ?? (fallback?.type === "Short" ? "short" : "long")) as "long" | "short";
  const entry = Number(live?.entry_price ?? fallback?.entry ?? 0);
  const sl = Number(live?.stop_loss ?? 0);
  const tp1 = Number(live?.take_profit ?? 0);
  const tp2 = tp1 ? entry + (tp1 - entry) * 1.6 : 0;
  const strength = Number(live?.signal_strength ?? fallback?.confidence ?? 0);
  const rr = entry && sl && tp1 ? Math.abs((tp1 - entry) / (entry - sl)) : Number(fallback?.riskReward ?? 0);

  return (
    <FeatureCard
      variant="orange"
      icon={Target}
      title="Best setup now"
      badge={isLive ? "LIVE" : "DEMO"}
      description="Najlepszy aktualny setup z globalnego skanera. Wejście, SL, TP1/TP2 oraz jakość sygnału obliczane na żywo."
      size="lg"
      className="ring-orange"
      action={
        <Link
          to="/setupy"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          <Zap className="h-3 w-3" /> Otwórz w terminalu
        </Link>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1.2fr_2fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold tracking-tight md:text-4xl">{symbol}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {live?.interval ?? "—"} · {live?.setup_type === "bb_bounce" ? "BB Bounce" : live?.setup_type === "elliott_wave" ? "Elliott Wave" : "Setup"}
              </div>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                direction === "long" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear",
              )}
            >
              {direction === "long" ? <TrendingUp className="mr-1 inline h-3 w-3" /> : <TrendingDown className="mr-1 inline h-3 w-3" />}
              {direction}
            </span>
          </div>
          <MiniSparkline strength={strength} direction={direction} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Entry" value={entry ? formatMoney(entry) : "—"} />
          <Stat label="Stop Loss" value={sl ? formatMoney(sl) : "—"} tone="bear" />
          <Stat label="TP 1" value={tp1 ? formatMoney(tp1) : "—"} tone="bull" />
          <Stat label="TP 2" value={tp2 ? formatMoney(tp2) : "—"} tone="bull" />
          <Stat label="RR" value={rr ? rr.toFixed(2) : "—"} />
          <Stat label="Jakość" value={`${Math.round(strength)}%`} />
          <Stat label="Status" value={live?.status ?? "fresh"} />
          <Stat label="Wave" value={live?.wave_label ?? "—"} />
        </div>
      </div>
    </FeatureCard>
  );
}

function MiniSparkline({ strength, direction }: { strength: number; direction: "long" | "short" }) {
  const bars = 24;
  const arr = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const trend = direction === "long" ? i / bars : 1 - i / bars;
        const noise = Math.sin(i * 1.3) * 0.15 + Math.cos(i * 0.7) * 0.1;
        return Math.max(0.1, Math.min(1, trend * 0.7 + 0.25 + noise));
      }),
    [direction],
  );
  const color = direction === "long" ? "var(--accent-mint)" : "var(--accent-coral)";
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Mini chart · 24 bars</span>
        <span className="num text-foreground">{Math.round(strength)}%</span>
      </div>
      <div className="flex h-16 items-end gap-[2px]">
        {arr.map((v, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${v * 100}%`, background: color, opacity: 0.4 + v * 0.6 }} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("num mt-0.5 text-base font-semibold", tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>{value}</div>
    </div>
  );
}

function RiskCard() {
  // mock risk state
  const dailyLoss = 320;
  const lossLimit = 1000;
  const tradesToday = 3;
  const maxTrades = 6;
  const maxRisk = 200;
  const autoEntry = false;

  const lossPct = (dailyLoss / lossLimit) * 100;
  const tradePct = (tradesToday / maxTrades) * 100;
  const riskTone = lossPct > 70 ? "bear" : lossPct > 40 ? "warning" : "mint";

  return (
    <FeatureCard
      variant={riskTone}
      icon={ShieldAlert}
      title="Ryzyko"
      badge={lossPct > 70 ? "ALERT" : lossPct > 40 ? "UWAGA" : "OK"}
      description="Twój dzienny budżet ryzyka. Po przekroczeniu limitu strat lub liczby trade'ów system blokuje nowe wejścia."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <RiskBar label="Dzienna strata" value={`-$${dailyLoss}`} cap={`/ -$${lossLimit}`} pct={lossPct} tone={riskTone} />
        <RiskBar label="Liczba trade'ów" value={`${tradesToday}`} cap={`/ ${maxTrades}`} pct={tradePct} tone="cyan" />
        <Mini label="Max ryzyko / trade" value={`$${maxRisk}`} sub="2% kapitału" />
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Auto-entry</div>
            <div className="num mt-1 text-sm font-semibold">{autoEntry ? "Włączone" : "Ręczne zatwierdzanie"}</div>
          </div>
          <span className={cn("h-3 w-9 rounded-full p-0.5 transition-colors", autoEntry ? "bg-bull" : "bg-muted")}>
            <span className={cn("block h-2 w-2 rounded-full bg-background transition-transform", autoEntry && "translate-x-6")} />
          </span>
        </div>
      </div>
    </FeatureCard>
  );
}

function RiskBar({ label, value, cap, pct, tone }: { label: string; value: string; cap: string; pct: number; tone: string }) {
  const color =
    tone === "bear" ? "var(--accent-coral)" : tone === "warning" ? "var(--accent-warning)" : tone === "cyan" ? "var(--accent-cyan)" : "var(--accent-mint)";
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="num text-sm">
          <span className="font-bold text-foreground">{value}</span>
          <span className="text-muted-foreground"> {cap}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}

function AiThinkingCard({ regimeLabel }: { regimeLabel: string }) {
  const now = new Date();
  const t = (mins: number) => {
    const d = new Date(now.getTime() - mins * 60_000);
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };
  const items = [
    { time: t(0), text: `Reżim: ${regimeLabel}. Filtruję setupy long-only, ignoruję mean-reversion na altach.` },
    { time: t(2), text: "BTC dominacja stabilna 58.4%. Brak rotacji w alty — utrzymuję konserwatywną ekspozycję." },
    { time: t(5), text: "Skaner wykrył BB-bounce na ETH M15. Siła sygnału < 65 — odrzucam." },
    { time: t(9), text: "Funding rate na SOL ujemny od 4h. Setup long jakościowo wzmocniony." },
    { time: t(14), text: "Volatility skurcz na BTC H1 — czekam na breakout." },
  ];
  return (
    <FeatureCard
      variant="cyan"
      icon={Brain}
      title="AI myśli"
      badge="REASONING"
      description="Operator AI komentuje rynek, filtry i decyzje na żywo. Każdy wpis ze znacznikiem czasu."
    >
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 rounded-md border border-border/60 bg-background/30 p-2.5 text-sm">
            <span className="num shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">{it.time}</span>
            <span className="text-foreground/90">{it.text}</span>
          </li>
        ))}
      </ul>
    </FeatureCard>
  );
}

function CapitalFlowCard() {
  const flows = [
    { sector: "L1 Majors", change: 2.4, share: 38 },
    { sector: "AI / Compute", change: 5.1, share: 18 },
    { sector: "DeFi", change: -1.2, share: 12 },
    { sector: "Memecoins", change: 8.7, share: 9 },
    { sector: "RWA", change: 1.6, share: 7 },
    { sector: "Stablecoins (in)", change: 0.3, share: 16 },
  ];
  return (
    <FeatureCard
      variant="warning"
      icon={Waves}
      title="Przepływ kapitału"
      description="Gdzie dziś płynie pieniądz: dominacja BTC, rotacja sektorowa, dynamika napływu/odpływu."
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Mini label="BTC.D" value="58.4%" sub={<ChangePill value={-0.3} />} />
        <Mini label="ETH.D" value="13.1%" sub={<ChangePill value={0.2} />} />
        <Mini label="USDT.D" value="4.7%" sub={<ChangePill value={-0.1} />} />
      </div>
      <ul className="space-y-1.5">
        {flows.map((f) => (
          <li key={f.sector} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0 truncate text-muted-foreground">{f.sector}</span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted/50">
              <div
                className="absolute inset-y-0 left-0 rounded-sm transition-all"
                style={{
                  width: `${f.share}%`,
                  background: f.change >= 0 ? "var(--accent-mint)" : "var(--accent-coral)",
                  opacity: 0.85,
                }}
              />
            </div>
            <ChangePill value={f.change} />
          </li>
        ))}
      </ul>
    </FeatureCard>
  );
}
