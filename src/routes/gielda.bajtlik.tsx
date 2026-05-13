import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addGoal, closePosition, deleteGoal, deletePosition,
  getCapital, listGoals, listPositions, openPosition,
  updateGoalAmount, upsertCapital,
} from "@/lib/gielda/repo";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/gielda/bajtlik")({
  head: () => ({
    ...seoHead({
      title: "Bajtlik — portfel inwestycyjny",
      description: "Zarządzaj kapitałem, celami i pozycjami portfela. Dane zapisywane w bazie z RLS.",
      path: "/gielda/bajtlik",
    }),
  }),
  component: () => <RequireAuth><BajtlikInner /></RequireAuth>,
});

function BajtlikInner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [capital, setCapital] = useState({ total: 0, cash: 0, currency: "PLN" });
  const [goals, setGoals] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [newGoal, setNewGoal] = useState({ title: "", target: "", deadline: "" });
  const [newPos, setNewPos] = useState({ symbol: "", side: "long" as "long" | "short", qty: "", entry: "" });

  const refresh = useCallback(async () => {
    try {
      const [c, g, p] = await Promise.all([getCapital(), listGoals(), listPositions()]);
      if (c) setCapital({ total: Number(c.total_capital), cash: Number(c.available_cash), currency: c.currency });
      setGoals(g);
      setPositions(p);
    } catch (e: any) {
      toast.error(e.message ?? "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveCapital = async () => {
    if (!user) return;
    try {
      await upsertCapital(user.id, capital.total, capital.cash, capital.currency);
      toast.success("Kapitał zapisany");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddGoal = async () => {
    if (!user || !newGoal.title || !newGoal.target) return;
    try {
      await addGoal(user.id, newGoal.title, Number(newGoal.target), newGoal.deadline || undefined);
      setNewGoal({ title: "", target: "", deadline: "" });
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdateGoalAmount = async (id: string, value: number) => {
    try { await updateGoalAmount(id, value); await refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleAddPosition = async () => {
    if (!user || !newPos.symbol || !newPos.qty || !newPos.entry) return;
    try {
      await openPosition(user.id, {
        symbol: newPos.symbol.toUpperCase(),
        side: newPos.side,
        quantity: Number(newPos.qty),
        entry_price: Number(newPos.entry),
      });
      setNewPos({ symbol: "", side: "long", qty: "", entry: "" });
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleClose = async (p: any) => {
    const exit = window.prompt(`Cena zamknięcia dla ${p.symbol}?`, String(p.entry_price));
    if (!exit) return;
    try {
      await closePosition(p.id, Number(exit), Number(p.quantity), Number(p.entry_price), p.side);
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const totalCost = positions.filter((p) => p.status === "open").reduce((a, p) => a + Number(p.quantity) * Number(p.entry_price), 0);
  const realized = positions.filter((p) => p.status === "closed").reduce((a, p) => a + Number(p.pnl ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Ładuję dane bajtlika…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Bajtlik · Portfel</div>
        <h1 className="mt-1 text-2xl font-bold">Twój kapitał i cele</h1>
      </header>

      {/* Kapitał */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Kapitał</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <Field label="Kapitał całkowity">
            <input type="number" value={capital.total}
              onChange={(e) => setCapital({ ...capital, total: Number(e.target.value) })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Wolna gotówka">
            <input type="number" value={capital.cash}
              onChange={(e) => setCapital({ ...capital, cash: Number(e.target.value) })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Waluta">
            <select value={capital.currency}
              onChange={(e) => setCapital({ ...capital, currency: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>PLN</option><option>USD</option><option>EUR</option>
            </select>
          </Field>
          <button onClick={saveCapital} className="inline-flex items-center gap-1.5 self-end rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4" /> Zapisz
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
          <div>Zaangażowane: <span className="num font-bold text-foreground">{totalCost.toFixed(0)} {capital.currency}</span></div>
          <div>Zrealizowany P&L: <span className={cn("num font-bold", realized >= 0 ? "text-bull" : "text-bear")}>{realized >= 0 ? "+" : ""}{realized.toFixed(0)}</span></div>
          <div>Otwarte pozycje: <span className="font-bold text-foreground">{positions.filter((p) => p.status === "open").length}</span></div>
        </div>
      </section>

      {/* Cele */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Cele finansowe</h2>
        <div className="mb-4 grid gap-2 md:grid-cols-[1fr_140px_160px_auto]">
          <input placeholder="Tytuł celu" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="Kwota docelowa" value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={handleAddGoal} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Dodaj
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak celów — dodaj pierwszy.</div>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => {
              const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount || 1)) * 100);
              return (
                <li key={g.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">{g.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {Number(g.current_amount).toLocaleString("pl-PL")} / {Number(g.target_amount).toLocaleString("pl-PL")} {g.currency}
                        {g.deadline && <> · do {g.deadline}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="num font-bold text-bull">{pct.toFixed(0)}%</span>
                      <button onClick={() => deleteGoal(g.id).then(refresh)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-bear">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-bull" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" defaultValue={g.current_amount}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== Number(g.current_amount)) handleUpdateGoalAmount(g.id, v);
                      }}
                      className="w-32 rounded-md border border-input bg-background px-2 py-1 text-xs" />
                    <span className="text-[11px] text-muted-foreground">aktualizuj kwotę bieżącą (Tab/blur zapisuje)</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pozycje */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Pozycje</h2>
        <div className="mb-4 grid gap-2 md:grid-cols-[120px_120px_120px_140px_auto]">
          <input placeholder="Symbol" value={newPos.symbol}
            onChange={(e) => setNewPos({ ...newPos, symbol: e.target.value.toUpperCase() })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <select value={newPos.side} onChange={(e) => setNewPos({ ...newPos, side: e.target.value as any })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="long">Long</option><option value="short">Short</option>
          </select>
          <input type="number" placeholder="Ilość" value={newPos.qty} onChange={(e) => setNewPos({ ...newPos, qty: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="Cena wejścia" value={newPos.entry} onChange={(e) => setNewPos({ ...newPos, entry: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={handleAddPosition} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Otwórz
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Symbol</th><th>Side</th><th className="text-right">Ilość</th>
                <th className="text-right">Entry</th><th className="text-right">Exit</th>
                <th className="text-right">P&amp;L</th><th>Status</th><th>Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {positions.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 font-bold">{p.symbol}</td>
                  <td className={cn("text-xs", p.side === "long" ? "text-bull" : "text-bear")}>{p.side}</td>
                  <td className="num text-right">{p.quantity}</td>
                  <td className="num text-right">{Number(p.entry_price).toFixed(2)}</td>
                  <td className="num text-right">{p.exit_price ? Number(p.exit_price).toFixed(2) : "—"}</td>
                  <td className={cn("num text-right", Number(p.pnl ?? 0) >= 0 ? "text-bull" : "text-bear")}>
                    {p.pnl != null ? `${Number(p.pnl) >= 0 ? "+" : ""}${Number(p.pnl).toFixed(0)}` : "—"}
                  </td>
                  <td className="text-xs uppercase">{p.status}</td>
                  <td className="flex gap-1">
                    {p.status === "open" && (
                      <button onClick={() => handleClose(p)} className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary">Zamknij</button>
                    )}
                    <button onClick={() => deletePosition(p.id).then(refresh)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-bear">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr><td colSpan={8} className="py-3 text-center text-xs text-muted-foreground">Brak pozycji</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Decyzje agenta i notatki znajdziesz w sekcji{" "}
        <Link to="/gielda/dziennik" className="text-primary hover:underline">Dziennik decyzji</Link>.
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
