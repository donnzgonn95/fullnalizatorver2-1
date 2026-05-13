import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/journal")({
  head: () => ({ ...seoHead({ title: "Trade Journal — Lab", description: "Pełny dziennik decyzji paper.", path: "/lab/journal" }) }),
  component: JournalPage,
});

function JournalPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    void supabase.from("lab_paper_trades").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setTrades(data ?? []));
  }, []);

  const list = filter === "all" ? trades : trades.filter((t) => t.status === filter);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Trade Journal</div>
        <h1 className="mt-1 text-2xl font-bold">Wszystkie decyzje paper</h1>
      </header>
      <div className="flex flex-wrap gap-2">
        {["all", "planned", "opened", "monitoring", "closed", "invalidated"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            "rounded-md border px-3 py-1 text-xs uppercase",
            filter === f ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary",
          )}>{f}</button>
        ))}
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <ol className="space-y-2">
          {list.map((t) => (
            <li key={t.id} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{t.instrument}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase", t.side === "long" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear")}>{t.side}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{t.status}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("pl-PL")}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Entry {t.entry_price} · SL {t.stop_loss} · TP {t.take_profit} · R:R {t.risk_reward} · Conv {t.conviction_score}/10
              </div>
              {t.rationale && <p className="mt-1 text-xs">{t.rationale}</p>}
              {t.result_pnl != null && (
                <div className={cn("mt-1 num text-xs font-bold", Number(t.result_pnl) >= 0 ? "text-bull" : "text-bear")}>
                  PnL: {Number(t.result_pnl) >= 0 ? "+" : ""}{Number(t.result_pnl).toFixed(2)}
                </div>
              )}
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-center text-xs text-muted-foreground">Brak wpisów.</li>}
        </ol>
      </section>
    </div>
  );
}
