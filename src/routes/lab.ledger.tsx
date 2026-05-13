import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/lab/ledger")({
  head: () => ({ ...seoHead({ title: "Bajtlik Ledger — Lab", description: "PnL paper tradingu i progres do celu.", path: "/lab/ledger" }) }),
  component: LedgerPage,
});

function bucketSince(days: number) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d;
}

function LedgerPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [goal, setGoal] = useState<any>(null);
  const [capital, setCapital] = useState<any>(null);

  useEffect(() => {
    void Promise.all([
      supabase.from("lab_paper_trades").select("*").order("created_at", { ascending: false }),
      supabase.from("bajtlik_goals").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("bajtlik_capital").select("*").maybeSingle(),
    ]).then(([t, g, c]) => {
      setTrades(t.data ?? []); setGoal(g.data); setCapital(c.data);
    });
  }, []);

  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "opened" || t.status === "monitoring");
  const realized = closed.reduce((a, t) => a + Number(t.result_pnl ?? 0), 0);
  const unrealized = open.reduce((a, t) => a + (Number(t.entry_price) * 0.0), 0); // brak live cen — mock 0
  const day = closed.filter((t) => new Date(t.closed_at) >= bucketSince(0)).reduce((a, t) => a + Number(t.result_pnl ?? 0), 0);
  const week = closed.filter((t) => new Date(t.closed_at) >= bucketSince(7)).reduce((a, t) => a + Number(t.result_pnl ?? 0), 0);
  const month = closed.filter((t) => new Date(t.closed_at) >= bucketSince(30)).reduce((a, t) => a + Number(t.result_pnl ?? 0), 0);

  const pct = goal ? Math.min(100, ((Number(goal.current_amount) + realized) / Number(goal.target_amount || 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Bajtlik Ledger</div>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5" /> Wynik paper tradingu</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Dziś" v={day} />
        <Stat label="7 dni" v={week} />
        <Stat label="30 dni" v={month} />
        <Stat label="Łącznie zrealizowane" v={realized} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="surface-glass rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Niezrealizowany P&amp;L</div>
          <div className="num mt-1 text-2xl font-bold">{unrealized.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground">(brak live cen w trybie mock)</div>
        </div>
        <div className="surface-glass rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Otwarte pozycje</div>
          <div className="num mt-1 text-2xl font-bold">{open.length}</div>
          <div className="text-[11px] text-muted-foreground">Kapitał: {capital ? `${Number(capital.total_capital).toLocaleString("pl-PL")} ${capital.currency}` : "—"}</div>
        </div>
      </section>

      {goal && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Cel: {goal.title}</div>
              <div className="text-sm">{(Number(goal.current_amount) + realized).toFixed(0)} / {Number(goal.target_amount).toLocaleString("pl-PL")} {goal.currency}</div>
            </div>
            <div className="num text-2xl font-bold text-bull">{pct.toFixed(0)}%</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-bull" style={{ width: `${pct}%` }} />
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="surface-glass rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-2xl font-bold", v >= 0 ? "text-bull" : "text-bear")}>
        {v >= 0 ? "+" : ""}{v.toFixed(2)}
      </div>
    </div>
  );
}
