import { createFileRoute } from "@tanstack/react-router";
import { sentiment } from "@/lib/demo-data";
import { ChangePill, formatMoney } from "@/components/StatPill";
import { cn } from "@/lib/utils";
import { DataBadge } from "@/components/DataBadge";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/sentyment")({
  head: () => ({
    ...seoHead({
      title: "Sentyment rynku krypto: Fear & Greed, dominacja BTC",
      description: "Indeks Strachu i Chciwości, dominacja BTC/ETH, kapitalizacja całego rynku — agregat nastrojów rynkowych.",
      path: "/sentyment",
    }),
  }),
  component: SentymentPage,
});

function SentymentPage() {
  const fg = sentiment.fearGreedIndex;
  // gauge needle position 0-100
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Sentyment rynku</h1>
          <DataBadge kind="demo" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Co czują inwestorzy? Skrajna chciwość = ostrożność. Skrajny strach = okazje.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Fear & Greed gauge */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Strach & Chciwość</div>
          <div className="mt-4 flex flex-col items-center">
            <Gauge value={fg} />
            <div className="num mt-2 text-5xl font-bold">{fg}</div>
            <div className="mt-1 rounded-full bg-bull/15 px-3 py-1 text-sm font-semibold text-bull">
              {sentiment.fearGreedLabel}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-5 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div className="text-center">Skrajny strach</div>
            <div className="text-center">Strach</div>
            <div className="text-center">Neutralny</div>
            <div className="text-center">Chciwość</div>
            <div className="text-center">Skrajna chciwość</div>
          </div>
        </div>

        {/* Dominance */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Dominacja BTC</div>
            <div className="num mt-2 text-4xl font-bold">{sentiment.btcDominance}%</div>
            <Bar value={sentiment.btcDominance} max={70} />
            <p className="mt-3 text-xs text-muted-foreground">
              Spadająca dominacja = kapitał płynie z BTC w altcoiny.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Dominacja ETH</div>
            <div className="num mt-2 text-4xl font-bold">{sentiment.ethDominance}%</div>
            <Bar value={sentiment.ethDominance} max={30} variant="chart-3" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Kapitalizacja rynku" value={formatMoney(sentiment.totalMarketCap)} sub={<ChangePill value={sentiment.marketCapChange24h} />} />
        <Stat label="Trend krótkoterminowy" value="Byczy" sub="zielona przewaga 7D" />
        <Stat label="Faza cyklu" value="Rotacja w alty" sub="po rajdzie BTC" />
      </section>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -90 + (clamped / 100) * 180;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-xs">
      <defs>
        <linearGradient id="gg" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.66 0.23 25)" />
          <stop offset="50%" stopColor="oklch(0.78 0.16 70)" />
          <stop offset="100%" stopColor="oklch(0.78 0.18 145)" />
        </linearGradient>
      </defs>
      <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="url(#gg)" strokeWidth="16" strokeLinecap="round" />
      <g transform={`translate(100 100) rotate(${angle})`}>
        <line x1="0" y1="0" x2="0" y2="-78" stroke="oklch(0.96 0.01 240)" strokeWidth="3" strokeLinecap="round" />
        <circle r="6" fill="oklch(0.96 0.01 240)" />
      </g>
    </svg>
  );
}

function Bar({ value, max, variant = "primary" }: { value: number; max: number; variant?: "primary" | "chart-3" }) {
  const pct = (value / max) * 100;
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", variant === "primary" ? "bg-primary" : "bg-chart-3")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
