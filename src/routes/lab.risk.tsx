import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { RiskSettings } from "@/lib/lab/risk-engine";
import { seoHead } from "@/lib/seo";
import { Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lab/risk")({
  head: () => ({ ...seoHead({ title: "Risk Engine — Lab", description: "Limity ryzyka, kill switch i blokady.", path: "/lab/risk" }) }),
  component: RiskPage,
});

const DEFAULT: RiskSettings = {
  max_trades_per_day: 6, max_daily_loss: 1000, max_risk_per_trade: 200,
  cooldown_minutes: 60, kill_switch: false, block_high_macro_risk: true, block_correlated: true,
};

function RiskPage() {
  const { user } = useAuth();
  const [s, setS] = useState<RiskSettings>(DEFAULT);

  useEffect(() => {
    void supabase.from("lab_risk_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) setS(data as any);
    });
  }, []);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("lab_risk_settings").upsert({ ...s, user_id: user.id }, { onConflict: "user_id" });
    if (error) toast.error(error.message); else toast.success("Zapisano limity ryzyka.");
  };

  const Num = ({ k, label }: { k: keyof RiskSettings; label: string }) => (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <input type="number" value={s[k] as number}
        onChange={(e) => setS({ ...s, [k]: Number(e.target.value) } as RiskSettings)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
    </label>
  );
  const Tog = ({ k, label }: { k: keyof RiskSettings; label: string }) => (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={s[k] as boolean} onChange={(e) => setS({ ...s, [k]: e.target.checked } as RiskSettings)} />
    </label>
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Risk Engine</div>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Limity ryzyka</h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Num k="max_trades_per_day" label="Max transakcji dziennie" />
          <Num k="max_daily_loss" label="Max dzienna strata" />
          <Num k="max_risk_per_trade" label="Max ryzyko / transakcję" />
          <Num k="cooldown_minutes" label="Cooldown po stracie (min)" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Tog k="kill_switch" label="🛑 Kill switch" />
          <Tog k="block_high_macro_risk" label="Blokuj przy wysokim ryzyku makro" />
          <Tog k="block_correlated" label="Blokuj skorelowane pozycje" />
        </div>
        <button onClick={save} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" /> Zapisz
        </button>
      </section>
    </div>
  );
}
