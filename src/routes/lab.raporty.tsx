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
  strategy_name?: string | null;
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown> | null;
  params?: Record<string, unknown> | null;
};

type PaperTrade = {
  id?: string;
  instrument?: string;
  side?: string;
  entry_price?: number | null;
  quantity?: number | null;
  opened_at?: string | null;
  closed_at: string | null;
  result_pnl: number | null;
  status: string;
  rationale?: string | null;
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

  const [search, setSearch] = useState("");

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
          .select("id, strategy_name, started_at, finished_at, summary, params")
          .order("started_at", { ascending: false })
          .limit(500),
        supabase
          .from("lab_paper_trades")
          .select("id, instrument, side, entry_price, quantity, opened_at, closed_at, result_pnl, status, rationale"),
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

  // Lookup poprzedniego raportu tego samego typu (do porównania)
  const prevByReportId = useMemo(() => {
    const map = new Map<string, LabReport | null>();
    const sortedAsc = [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date));
    const lastByType = new Map<string, LabReport>();
    for (const r of sortedAsc) {
      map.set(r.id, lastByType.get(r.report_type) ?? null);
      lastByType.set(r.report_type, r);
    }
    return map;
  }, [reports]);

  // Backtesty i trade'y dla danego dnia (do rozwijanych szczegółów)
  const runsByDate = useMemo(() => {
    const m = new Map<string, BacktestRun[]>();
    for (const r of runs) {
      const d = (r.finished_at ?? r.started_at).slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return m;
  }, [runs]);

  const tradesByDate = useMemo(() => {
    const m = new Map<string, PaperTrade[]>();
    for (const t of trades) {
      const d = (t.closed_at ?? t.opened_at)?.slice(0, 10);
      if (!d) continue;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(t);
    }
    return m;
  }, [trades]);

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

// ---- Słowniczek pojęć (EN → PL + krótki opis) ----
const GLOSSARY: Record<string, { pl: string; desc: string }> = {
  pnl: { pl: "Wynik (PnL)", desc: "Zysk lub strata — różnica między ceną wejścia a wyjścia." },
  daily_pnl: { pl: "Dzienny wynik", desc: "Suma zysków i strat z zamkniętych pozycji w danym dniu." },
  wins: { pl: "Trafione", desc: "Liczba zamkniętych pozycji z zyskiem." },
  losses: { pl: "Stratne", desc: "Liczba zamkniętych pozycji ze stratą." },
  winrate: { pl: "Skuteczność", desc: "Odsetek transakcji zakończonych zyskiem." },
  closed_trades: { pl: "Zamknięte pozycje", desc: "Liczba pozycji zamkniętych w tym dniu." },
  open_positions: { pl: "Otwarte pozycje", desc: "Pozycje aktualnie utrzymywane na rynku." },
  planned_setups: { pl: "Zaplanowane setupy", desc: "Pomysły handlowe oczekujące na sygnał wejścia." },
  backtest_runs_today: { pl: "Backtesty dziś", desc: "Symulacje strategii na danych historycznych uruchomione dziś." },
  backtests: { pl: "Backtesty", desc: "Testy strategii na danych historycznych." },
  watchlist: { pl: "Lista obserwowanych", desc: "Instrumenty pod szczególną obserwacją." },
  risks: { pl: "Ryzyka", desc: "Zagrożenia dla planu sesji." },
  notes: { pl: "Notatki", desc: "Uwagi i przypomnienia agenta." },
  headline: { pl: "Nagłówek", desc: "Najważniejsze zdanie podsumowujące." },
  summary: { pl: "Podsumowanie", desc: "Skrót sytuacji rynkowej." },
  key_events: { pl: "Kluczowe wydarzenia", desc: "Publikacje makro i wydarzenia spółkowe wpływające na ceny." },
  leading_signals: { pl: "Sygnały wyprzedzające", desc: "Wskaźniki pojawiające się przed głównym ruchem rynku." },
  preferred_tactics: { pl: "Preferowane taktyki", desc: "Strategie najlepiej dopasowane do bieżącego reżimu rynku." },
  last5to7: { pl: "Ostatnie 5–7 dni", desc: "Krótkie podsumowanie ostatniego tygodnia." },
  sector_rotation: { pl: "Rotacja sektorów", desc: "Przepływ kapitału między sektorami giełdy." },
  flows: { pl: "Przepływy kapitału", desc: "Napływy i odpływy środków z funduszy/ETF-ów." },
  agent_performance: { pl: "Wyniki agenta", desc: "Statystyki decyzji agenta-analityka." },
  setups_for_tomorrow: { pl: "Setupy na jutro", desc: "Pomysły handlowe przygotowane na kolejną sesję." },
  decisions: { pl: "Decyzje", desc: "Liczba decyzji wydanych przez agenta." },
  approved: { pl: "Zatwierdzone", desc: "Decyzje zaakceptowane przez Ciebie." },
  hit: { pl: "Trafione", desc: "Decyzje, które okazały się skuteczne." },
  miss: { pl: "Chybione", desc: "Decyzje, które okazały się błędne." },
  date: { pl: "Data", desc: "Data raportu." },
};

function tr(key: string): { pl: string; desc?: string } {
  const g = GLOSSARY[key];
  if (g) return g;
  return { pl: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

function fmtNum(v: unknown): string {
  if (typeof v === "number") return v.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
  return String(v);
}

function ReportView({
  content,
  type,
  stats,
}: {
  content: Record<string, unknown>;
  type: "morning" | "evening";
  stats: { pnl: number; backtests: number };
}) {
  const c = content ?? {};
  const headline = (c.headline as string) ?? (c.summary as string) ?? "";

  // Kluczowe metryki — różne dla porannego vs wieczornego
  const metrics: Array<{ key: string; value: unknown; tone?: "bull" | "bear" | "neutral" }> = [];
  if (type === "evening") {
    const pnl = (c.daily_pnl as number) ?? stats.pnl;
    metrics.push({ key: "daily_pnl", value: (pnl >= 0 ? "+" : "") + fmtNum(pnl), tone: pnl >= 0 ? "bull" : "bear" });
    if (c.wins != null) metrics.push({ key: "wins", value: c.wins, tone: "bull" });
    if (c.losses != null) metrics.push({ key: "losses", value: c.losses, tone: "bear" });
    if (c.closed_trades != null) metrics.push({ key: "closed_trades", value: c.closed_trades });
    if (c.backtest_runs_today != null) metrics.push({ key: "backtest_runs_today", value: c.backtest_runs_today });
  } else {
    if (c.open_positions != null) metrics.push({ key: "open_positions", value: c.open_positions });
    if (c.planned_setups != null) metrics.push({ key: "planned_setups", value: c.planned_setups });
    metrics.push({ key: "backtests", value: stats.backtests });
  }

  // Pozostałe znane sekcje listowe
  const listKeys = [
    "notes", "key_events", "leading_signals", "preferred_tactics",
    "watchlist", "risks", "last5to7", "sector_rotation", "flows", "setups_for_tomorrow",
  ];
  const lists = listKeys
    .filter((k) => Array.isArray((c as any)[k]) && ((c as any)[k] as unknown[]).length > 0)
    .map((k) => ({ key: k, items: (c as any)[k] as unknown[] }));

  // Specjalna obróbka agent_performance (obiekt)
  const ap = c.agent_performance as Record<string, unknown> | undefined;

  // Zbierz nieobsłużone klucze dla fallbacku
  const handled = new Set<string>([
    "headline", "summary", "date",
    "daily_pnl", "wins", "losses", "closed_trades", "backtest_runs_today",
    "open_positions", "planned_setups", "agent_performance",
    ...listKeys,
  ]);
  const extra = Object.keys(c).filter((k) => !handled.has(k));

  return (
    <div className="space-y-4">
      {headline && (
        <div className="rounded-md bg-background/60 p-3 text-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Nagłówek</div>
          <div className="mt-1">{headline}</div>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => {
            const t = tr(m.key);
            const toneCls = m.tone === "bull" ? "text-bull" : m.tone === "bear" ? "text-bear" : "text-foreground";
            return (
              <div key={m.key} className="rounded-md border border-border bg-background/40 p-3" title={t.desc}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.pl}</div>
                <div className={`mt-1 text-lg font-bold ${toneCls}`}>{fmtNum(m.value)}</div>
                {t.desc && <div className="mt-1 text-[10px] text-muted-foreground/80 leading-snug">{t.desc}</div>}
              </div>
            );
          })}
        </div>
      )}

      {ap && (
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{tr("agent_performance").pl}</div>
          <div className="mt-1 text-[10px] text-muted-foreground/80">{tr("agent_performance").desc}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {Object.entries(ap).map(([k, v]) => {
              const t = tr(k);
              const val = k === "winrate" && typeof v === "number" ? `${Math.round(v * 100)}%` : fmtNum(v);
              return (
                <div key={k} className="rounded bg-background/60 p-2" title={t.desc}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.pl}</div>
                  <div className="text-sm font-bold">{val}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lists.map(({ key, items }) => {
        const t = tr(key);
        const mono = key === "watchlist";
        return (
          <section key={key} className="rounded-md border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.pl}</div>
            {t.desc && <div className="mt-0.5 text-[10px] text-muted-foreground/80">{t.desc}</div>}
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {items.map((it, i) => (
                <li key={i} className={mono ? "font-mono text-xs" : ""}>{typeof it === "string" ? it : JSON.stringify(it)}</li>
              ))}
            </ul>
          </section>
        );
      })}

      {extra.length > 0 && (
        <details className="rounded-md border border-border bg-background/40 p-3">
          <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-muted-foreground">
            Dodatkowe pola ({extra.length})
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-xs text-muted-foreground">
{JSON.stringify(Object.fromEntries(extra.map((k) => [k, (c as any)[k]])), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
