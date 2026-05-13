import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { canOpenTrade, type RiskSettings } from "@/lib/lab/risk-engine";
import { formatTelegramAlert } from "@/lib/lab/telegram-preview";
import { seoHead } from "@/lib/seo";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/paper")({
  head: () => ({ ...seoHead({ title: "Paper Trading — Lab", description: "Decyzje long/short bez realnej egzekucji.", path: "/lab/paper" }) }),
  component: PaperPage,
});

const STATUSES = ["planned", "opened", "monitoring", "closed", "invalidated"] as const;
type Status = typeof STATUSES[number];

const DEFAULT_RISK: RiskSettings = {
  max_trades_per_day: 6, max_daily_loss: 1000, max_risk_per_trade: 200,
  cooldown_minutes: 60, kill_switch: false, block_high_macro_risk: true, block_correlated: true,
};

function PaperPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState<RiskSettings>(DEFAULT_RISK);
  const [draft, setDraft] = useState({
    instrument: "SPY", side: "long" as "long" | "short", entry: "", sl: "", tp: "", qty: "1",
    conviction: "6", riskScore: "4", rationale: "",
  });

  const refresh = useCallback(async () => {
    const [t, s] = await Promise.all([
      supabase.from("lab_paper_trades").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("lab_risk_settings").select("*").maybeSingle(),
    ]);
    if (t.data) setTrades(t.data);
    if (s.data) setRisk(s.data as any);
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const create = async () => {
    if (!user) return;
    const entry = Number(draft.entry), sl = Number(draft.sl), tp = Number(draft.tp), qty = Number(draft.qty);
    if (!draft.instrument || !entry || !sl || !tp) return toast.error("Uzupełnij pola");
    const proposedRisk = Math.abs(entry - sl) * qty;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tradesToday = trades.filter((x) => new Date(x.created_at) >= today).length;
    const dailyPnl = trades.filter((x) => new Date(x.created_at) >= today).reduce((a, x) => a + Number(x.result_pnl ?? 0), 0);
    const check = canOpenTrade(risk, { trades_today: tradesToday, daily_pnl: dailyPnl, proposed_risk: proposedRisk });
    if (!check.allowed) return toast.error(`Risk Engine: ${check.reason}`);

    const rr = +(Math.abs(tp - entry) / Math.abs(entry - sl)).toFixed(2);
    try {
      const { error } = await supabase.from("lab_paper_trades").insert({
        user_id: user.id,
        instrument: draft.instrument.toUpperCase(),
        side: draft.side, entry_price: entry, stop_loss: sl, take_profit: tp, quantity: qty,
        risk_reward: rr, conviction_score: Number(draft.conviction), risk_score: Number(draft.riskScore),
        rationale: draft.rationale || null,
        status: "planned",
      });
      if (error) throw error;
      toast.success("Decyzja zapisana (planned)");
      setDraft({ ...draft, entry: "", sl: "", tp: "", rationale: "" });
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const setStatus = async (id: string, status: Status, exit_price?: number) => {
    const updates: any = { status };
    if (status === "closed" && exit_price != null) {
      const t = trades.find((x) => x.id === id);
      if (t) {
        const pnl = (t.side === "short" ? Number(t.entry_price) - exit_price : exit_price - Number(t.entry_price)) * Number(t.quantity);
        updates.exit_price = exit_price; updates.closed_at = new Date().toISOString(); updates.result_pnl = pnl;
      }
    }
    if (status === "opened") updates.opened_at = new Date().toISOString();
    const { error } = await supabase.from("lab_paper_trades").update(updates).eq("id", id);
    if (error) toast.error(error.message); else await refresh();
  };

  const closeWithPrompt = async (t: any) => {
    const v = window.prompt(`Cena exit dla ${t.instrument}?`, String(t.entry_price));
    if (!v) return;
    await setStatus(t.id, "closed", Number(v));
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Paper Trading</div>
        <h1 className="mt-1 text-2xl font-bold">Decyzje bez realnej egzekucji</h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Nowa decyzja</h2>
        <div className="grid gap-2 md:grid-cols-[120px_100px_1fr_1fr_1fr_80px]">
          <input placeholder="Instrument" value={draft.instrument} onChange={(e) => setDraft({ ...draft, instrument: e.target.value.toUpperCase() })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <select value={draft.side} onChange={(e) => setDraft({ ...draft, side: e.target.value as any })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="long">Long</option><option value="short">Short</option>
          </select>
          <input type="number" placeholder="Entry" value={draft.entry} onChange={(e) => setDraft({ ...draft, entry: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="SL" value={draft.sl} onChange={(e) => setDraft({ ...draft, sl: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="TP" value={draft.tp} onChange={(e) => setDraft({ ...draft, tp: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="Qty" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_120px_120px_auto]">
          <input placeholder="Uzasadnienie" value={draft.rationale} onChange={(e) => setDraft({ ...draft, rationale: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" min={1} max={10} placeholder="Conviction" value={draft.conviction} onChange={(e) => setDraft({ ...draft, conviction: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" min={1} max={10} placeholder="Risk score" value={draft.riskScore} onChange={(e) => setDraft({ ...draft, riskScore: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={create} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Zaplanuj
          </button>
        </div>
        {draft.entry && draft.sl && draft.tp && (
          <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-background/40 p-2 text-[11px] text-muted-foreground">
{formatTelegramAlert({
  instrument: draft.instrument, side: draft.side,
  entry_price: Number(draft.entry), stop_loss: Number(draft.sl), take_profit: Number(draft.tp),
  risk_reward: +(Math.abs(Number(draft.tp) - Number(draft.entry)) / Math.abs(Number(draft.entry) - Number(draft.sl))).toFixed(2),
  conviction_score: Number(draft.conviction),
})}
          </pre>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Pozycje paper ({trades.length})</h2>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th>Data</th><th>Instr</th><th>Side</th><th className="text-right">Entry</th>
                  <th className="text-right">SL/TP</th><th className="text-right">PnL</th><th>Status</th><th>Akcje</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pl-PL")}</td>
                    <td className="font-bold">{t.instrument}</td>
                    <td className={cn("text-xs", t.side === "long" ? "text-bull" : "text-bear")}>{t.side}</td>
                    <td className="num text-right">{Number(t.entry_price).toFixed(2)}</td>
                    <td className="num text-right text-xs">{t.stop_loss}/{t.take_profit}</td>
                    <td className={cn("num text-right", Number(t.result_pnl ?? 0) >= 0 ? "text-bull" : "text-bear")}>
                      {t.result_pnl != null ? `${Number(t.result_pnl) >= 0 ? "+" : ""}${Number(t.result_pnl).toFixed(0)}` : "—"}
                    </td>
                    <td className="text-[10px] uppercase">{t.status}</td>
                    <td className="flex flex-wrap gap-1">
                      {t.status === "planned" && <Btn onClick={() => setStatus(t.id, "opened")}>Open</Btn>}
                      {t.status === "opened" && <Btn onClick={() => setStatus(t.id, "monitoring")}>Monitor</Btn>}
                      {(t.status === "opened" || t.status === "monitoring") && <Btn onClick={() => closeWithPrompt(t)}>Close</Btn>}
                      {t.status !== "closed" && t.status !== "invalidated" && <Btn onClick={() => setStatus(t.id, "invalidated")}>Invalid</Btn>}
                    </td>
                  </tr>
                ))}
                {trades.length === 0 && <tr><td colSpan={8} className="py-3 text-center text-xs text-muted-foreground">Brak decyzji.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary">{children}</button>;
}
