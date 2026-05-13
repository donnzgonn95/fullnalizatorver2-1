import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Sunrise, Moon, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { seoHead } from "@/lib/seo";

type LabReport = {
  id: string;
  report_type: "morning" | "evening" | string;
  report_date: string;
  content: Record<string, unknown>;
  created_at: string;
};

type BacktestRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown> | null;
};

type PaperTrade = {
  closed_at: string | null;
  result_pnl: number | null;
  status: string;
};

export const Route = createFileRoute("/lab/raporty")({
  head: () => ({
    ...seoHead({
      title: "Historia raportów Lab",
      description: "Archiwum raportów porannych i wieczornych z Agent Trading Lab.",
      path: "/lab/raporty",
    }),
  }),
  component: RaportyPage,
});

function RaportyPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [filter, setFilter] = useState<"all" | "morning" | "evening">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [r, b, t] = await Promise.all([
        supabase
          .from("lab_reports")
          .select("id, report_type, report_date, content, created_at")
          .order("report_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("lab_backtest_runs")
          .select("id, started_at, finished_at, summary")
          .order("started_at", { ascending: false })
          .limit(500),
        supabase
          .from("lab_paper_trades")
          .select("closed_at, result_pnl, status")
          .eq("status", "closed"),
      ]);
      if (cancelled) return;
      setReports((r.data ?? []) as LabReport[]);
      setRuns((b.data ?? []) as BacktestRun[]);
      setTrades((t.data ?? []) as PaperTrade[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const byDate = useMemo(() => {
    const m = new Map<string, { pnl: number; backtests: number }>();
    for (const t of trades) {
      if (!t.closed_at || t.result_pnl == null) continue;
      const d = t.closed_at.slice(0, 10);
      const cur = m.get(d) ?? { pnl: 0, backtests: 0 };
      cur.pnl += Number(t.result_pnl);
      m.set(d, cur);
    }
    for (const r of runs) {
      const d = (r.finished_at ?? r.started_at).slice(0, 10);
      const cur = m.get(d) ?? { pnl: 0, backtests: 0 };
      cur.backtests += 1;
      m.set(d, cur);
    }
    return m;
  }, [trades, runs]);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.report_type === filter);

  if (authLoading || loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ładowanie…</div>;
  }
  if (!user) return <p className="text-sm text-muted-foreground">Zaloguj się, aby zobaczyć historię raportów.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Agent Trading Lab</div>
          <h1 className="mt-1 text-2xl font-bold">Historia raportów</h1>
          <p className="mt-1 text-sm text-muted-foreground">Archiwum porannych i wieczornych raportów z Twojej bazy.</p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
          {(["all", "morning", "evening"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "Wszystkie" : f === "morning" ? "Poranne" : "Wieczorne"}
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Brak raportów w bazie. Pojawią się tu po zadziałaniu cronów porannego (5:10) i wieczornego (21:00).
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const stats = byDate.get(r.report_date) ?? { pnl: 0, backtests: 0 };
            const isMorning = r.report_type === "morning";
            const Icon = isMorning ? Sunrise : Moon;
            const open = openId === r.id;
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isMorning ? "text-amber-400" : "text-indigo-300"}`} />
                    <div>
                      <div className="text-sm font-bold">{r.report_date} · {isMorning ? "Poranny" : "Wieczorny"}</div>
                      <div className="text-[11px] text-muted-foreground">utworzono {new Date(r.created_at).toLocaleString("pl-PL")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={stats.pnl >= 0 ? "text-bull" : "text-bear"}>
                      PnL {stats.pnl >= 0 ? "+" : ""}{stats.pnl.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <FileBarChart className="h-3 w-3" /> {stats.backtests}
                    </span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border px-4 py-3">
                    <ReportView content={r.content} type={isMorning ? "morning" : "evening"} stats={stats} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
