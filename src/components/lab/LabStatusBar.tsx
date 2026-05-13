import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { riskLevel, type RiskSettings } from "@/lib/lab/risk-engine";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, FlaskConical, Send, ShieldCheck, TrendingUp } from "lucide-react";

const DEFAULT_RISK: RiskSettings = {
  max_trades_per_day: 6, max_daily_loss: 1000, max_risk_per_trade: 200,
  cooldown_minutes: 60, kill_switch: false, block_high_macro_risk: true, block_correlated: true,
};

export function LabStatusBar() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_RISK);
  const [tradesToday, setTradesToday] = useState(0);
  const [pnlToday, setPnlToday] = useState(0);
  const [tg, setTg] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [s, t, c] = await Promise.all([
        supabase.from("lab_risk_settings").select("*").maybeSingle(),
        supabase.from("lab_paper_trades").select("status,result_pnl,opened_at").gte("created_at", today.toISOString()),
        supabase.from("lab_telegram_config").select("enabled").maybeSingle(),
      ]);
      if (s.data) setSettings(s.data as any);
      if (t.data) {
        setTradesToday(t.data.length);
        setPnlToday(t.data.reduce((a: number, x: any) => a + Number(x.result_pnl ?? 0), 0));
      }
      if (c.data) setTg(!!c.data.enabled);
    })();
  }, [user]);

  const level = riskLevel(settings, { trades_today: tradesToday, daily_pnl: pnlToday });
  const levelColor = {
    LOW: "bg-bull/15 text-bull border-bull/40",
    MEDIUM: "bg-warning/15 text-warning border-warning/40",
    HIGH: "bg-bear/15 text-bear border-bear/40",
    BLOCKED: "bg-bear/30 text-bear border-bear/60",
  }[level];

  return (
    <div className="surface-glass sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border p-2 text-xs">
      <Chip icon={<Activity className="h-3 w-3" />} label="Agent" value="ACTIVE" tone="bull" />
      <Chip icon={<FlaskConical className="h-3 w-3" />} label="Mode" value="PAPER" tone="warning" />
      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 font-bold uppercase tracking-wider", levelColor)}>
        <ShieldCheck className="h-3 w-3" /> Risk: {level}
      </span>
      <Chip icon={<TrendingUp className="h-3 w-3" />} label="Trades" value={`${tradesToday}/${settings.max_trades_per_day}`} />
      <Chip
        icon={<AlertTriangle className="h-3 w-3" />}
        label="Daily PnL"
        value={`${pnlToday >= 0 ? "+" : ""}${pnlToday.toFixed(0)}`}
        tone={pnlToday >= 0 ? "bull" : "bear"}
      />
      <Chip icon={<Send className="h-3 w-3" />} label="Telegram" value={tg ? "ON" : "OFF"} tone={tg ? "bull" : undefined} />
    </div>
  );
}

function Chip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "bull" | "bear" | "warning" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1",
      tone === "bull" && "border-bull/40 bg-bull/10 text-bull",
      tone === "bear" && "border-bear/40 bg-bear/10 text-bear",
      tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
    )}>
      {icon}<span className="text-muted-foreground">{label}:</span><span className="font-bold">{value}</span>
    </span>
  );
}
