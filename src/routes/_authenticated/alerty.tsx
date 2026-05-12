import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, Loader2, Radio } from "lucide-react";
import { useState } from "react";
import { useLiveCoins } from "@/lib/binance";
import { generateAlerts } from "@/lib/signals";
import { alerts as demoAlerts } from "@/lib/demo-data";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/alerty")({
  head: () => ({
    ...seoHead({
      title: "Alerty techniczne na żywo",
      description: "Wybicia, RSI ekstremalne, zmiana wolumenu, dominacja BTC, funding rate — wszystkie sygnały w jednym miejscu.",
      path: "/alerty",
    }),
  }),
  component: AlertyPage,
});

const filters = ["Wszystkie", "critical", "warning", "info"] as const;
const labels: Record<string, string> = { Wszystkie: "Wszystkie", critical: "Krytyczne", warning: "Ostrzeżenia", info: "Info" };

function AlertyPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Wszystkie");
  const { data: coins, isLoading, isError, dataUpdatedAt } = useLiveCoins();

  const alerts = coins && coins.length ? generateAlerts(coins) : demoAlerts;
  const list = alerts.filter((a) => filter === "Wszystkie" || a.level === filter);
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pl-PL") : "";

  const counts = {
    critical: alerts.filter((a) => a.level === "critical").length,
    warning: alerts.filter((a) => a.level === "warning").length,
    info: alerts.filter((a) => a.level === "info").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Alerty</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sygnały generowane na żywo z RSI, zmian 24h i 7D oraz wolumenu.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Ładowanie...
              </span>
            ) : isError ? (
              <span className="text-bear">Błąd API — pokazuję dane DEMO</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-bull">
                <Radio className="h-3 w-3 animate-pulse" /> LIVE · {updated}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {labels[f]}
              {f !== "Wszystkie" && (
                <span className="ml-1 text-[10px] opacity-70">({counts[f as keyof typeof counts]})</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Krytyczne" value={counts.critical} tone="bear" />
        <Stat label="Ostrzeżenia" value={counts.warning} tone="warning" />
        <Stat label="Info" value={counts.info} tone="muted" />
      </section>

      <section className="rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {list.map((a) => {
            const Icon = a.level === "critical" ? AlertCircle : a.level === "warning" ? AlertTriangle : Info;
            return (
              <li key={a.id} className="flex items-start gap-4 p-4">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  a.level === "critical" && "bg-bear/15 text-bear",
                  a.level === "warning" && "bg-warning/15 text-warning",
                  a.level === "info" && "bg-secondary text-muted-foreground",
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="num">{a.time}</span>
                    <span>·</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-bold text-foreground">{a.symbol}</span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      a.level === "critical" && "bg-bear/20 text-bear",
                      a.level === "warning" && "bg-warning/20 text-warning",
                      a.level === "info" && "bg-muted",
                    )}>{a.level}</span>
                  </div>
                  <p className="mt-1 text-sm">{a.message}</p>
                </div>
              </li>
            );
          })}
          {!list.length && (
            <li className="p-6 text-center text-sm text-muted-foreground">Brak alertów dla wybranego filtru.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "bear" | "warning" | "muted" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "num mt-1 text-2xl font-bold",
        tone === "bear" && "text-bear",
        tone === "warning" && "text-warning",
        tone === "muted" && "text-foreground",
      )}>{value}</div>
    </div>
  );
}
