import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { FeatureCard } from "@/components/FeatureCard";
import { Settings, ListChecks, Bell, X, Plus, RefreshCw, Play, ShieldCheck, Send, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { testWebhook, verifyAdminAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: {} });
    // Server-side admin role verification (defence-in-depth on top of RLS).
    try {
      await verifyAdminAccess();
    } catch {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  const { data: cfg } = useQuery({
    queryKey: ["scanner_config"],
    queryFn: async () => {
      const { data } = await supabase.from("scanner_config").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["cron_run_logs"],
    queryFn: async () => {
      const { data } = await supabase.from("cron_run_logs").select("*").order("started_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    refetchInterval: 5_000,
  });

  const refreshLogs = () => qc.invalidateQueries({ queryKey: ["cron_run_logs"] });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Panel admina</h1>
        <p className="mt-1 text-xs text-muted-foreground">Zarządzaj globalnym skanerem, podglądaj logi cronów, konfiguruj swoje powiadomienia.</p>
      </header>

      {isAdmin === null && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Weryfikuję uprawnienia…
        </div>
      )}

      {isAdmin === false && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Nie masz roli <code>admin</code>. Panel jest niedostępny.
        </div>
      )}

      {isAdmin === true && (
        <>
          <ManualTriggersCard canRun={true} onRan={refreshLogs} />
          <ScannerConfigCard cfg={cfg} canEdit={true} onSaved={() => qc.invalidateQueries({ queryKey: ["scanner_config"] })} />
          <NotificationsCard />
          <WebhookTestCard />
          <CronLogsCard logs={logs ?? []} onRefresh={refreshLogs} />
        </>
      )}
    </div>
  );
}

function Chips({ items, onRemove, onAdd, placeholder }: { items: string[]; onRemove: (v: string) => void; onAdd: (v: string) => void; placeholder: string }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary">
            {i}
            <button onClick={() => onRemove(i)} className="opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input value={val} onChange={(e) => setVal(e.target.value.toUpperCase())} placeholder={placeholder}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs" />
        <button onClick={() => { if (val) { onAdd(val); setVal(""); } }}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 text-xs font-bold text-primary-foreground"><Plus className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function ManualTriggersCard({ canRun, onRan }: { canRun: boolean; onRan: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (path: string, label: string) => {
    setBusy(path);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(path, { method: "POST", headers });
      const json = await res.json().catch(() => ({}));
      if (res.ok) toast.success(`${label}: OK`, { description: JSON.stringify(json).slice(0, 200) });
      else toast.error(`${label}: błąd ${res.status}`);
    } catch (e) {
      toast.error(`${label}: ${e instanceof Error ? e.message : "błąd sieci"}`);
    } finally {
      setBusy(null);
      // pokaż nowy wpis w logach od razu
      setTimeout(onRan, 600);
      setTimeout(onRan, 2500);
    }
  };

  const Btn = ({ path, label, icon: Icon, color }: { path: string; label: string; icon: typeof Play; color: string }) => (
    <button
      onClick={() => run(path, label)}
      disabled={!canRun || !!busy}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm font-bold transition-all disabled:opacity-40",
        color,
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", busy === path && "animate-spin")} />
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-widest opacity-70">{busy === path ? "RUN..." : "RUN"}</span>
    </button>
  );

  return (
    <FeatureCard variant="mint" icon={Zap} title="Ręczne uruchamianie"
      description="Uruchom natychmiast dowolny cron globalny. Nowe wpisy pojawią się w logach poniżej w ciągu kilku sekund.">
      <div className="grid gap-2 md:grid-cols-3">
        <Btn path="/api/public/hooks/scan-setups" label="Skan setupów" icon={Play}
          color="border-[var(--accent-mint)]/40 bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] hover:bg-[var(--accent-mint)]/20" />
        <Btn path="/api/public/hooks/verify-setups" label="Weryfikacja PnL" icon={ShieldCheck}
          color="border-[var(--accent-warning)]/40 bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/20" />
        <Btn path="/api/public/hooks/notify-setups" label="Wyślij powiadomienia" icon={Send}
          color="border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20" />
      </div>
    </FeatureCard>
  );
}

function ScannerConfigCard({ cfg, canEdit, onSaved }: { cfg: any; canEdit: boolean; onSaved: () => void }) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [intervals, setIntervals] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (cfg) {
      setSymbols(cfg.symbols ?? []);
      setIntervals(cfg.intervals ?? []);
      setEnabled(cfg.enabled ?? true);
    }
  }, [cfg]);

  const save = async () => {
    if (!cfg?.id) return;
    const { error } = await supabase.from("scanner_config").update({
      symbols, intervals, enabled, updated_at: new Date().toISOString(),
    }).eq("id", cfg.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Konfiguracja zapisana — skaner użyje jej przy następnym uruchomieniu (max 5 min).");
    onSaved();
  };

  return (
    <FeatureCard variant="orange" icon={Settings} title="Konfiguracja skanera"
      description="Zmiany działają od następnego cyklu cron (≤ 5 min). Bez zmiany kodu i bez restartu.">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Symbole</div>
          <Chips items={symbols} onRemove={(v) => setSymbols(symbols.filter(s => s !== v))}
            onAdd={(v) => !symbols.includes(v) && setSymbols([...symbols, v])} placeholder="np. BTC" />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Interwały</div>
          <Chips items={intervals} onRemove={(v) => setIntervals(intervals.filter(s => s !== v))}
            onAdd={(v) => !intervals.includes(v) && setIntervals([...intervals, v])} placeholder="np. M15" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!canEdit} />
          Skaner włączony
        </label>
        <button onClick={save} disabled={!canEdit}
          className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40">
          Zapisz
        </button>
      </div>
    </FeatureCard>
  );
}

function NotificationsCard() {
  const [s, setS] = useState<any>({ email_enabled: false, email_address: "", webhook_url: "", min_signal_strength: 60, symbols_filter: [], intervals_filter: [], setup_types_filter: [] });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setUserId(u.user.id);
      const { data } = await supabase.from("notification_settings").select("*").eq("user_id", u.user.id).maybeSingle();
      if (data) setS({ ...data });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!userId) return;
    const payload = { ...s, user_id: userId, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("notification_settings").upsert(payload, { onConflict: "user_id" });
    if (error) toast.error(error.message); else toast.success("Powiadomienia zapisane");
  };

  if (loading) return null;

  return (
    <FeatureCard variant="cyan" icon={Bell} title="Moje powiadomienia"
      description="Powiadom mnie przez webhook (np. Discord, Slack, IFTTT) gdy pojawi się nowy globalny setup pasujący do filtrów. Email wymaga konfiguracji domeny.">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-lg border border-border bg-background/40 p-3 text-xs">
          <div className="mb-1 uppercase tracking-widest text-muted-foreground">Webhook URL</div>
          <input value={s.webhook_url ?? ""} onChange={(e) => setS({ ...s, webhook_url: e.target.value })}
            placeholder="https://..." className="w-full rounded-md border border-border bg-background px-2 py-1" />
        </label>
        <label className="rounded-lg border border-border bg-background/40 p-3 text-xs">
          <div className="mb-1 uppercase tracking-widest text-muted-foreground">Min. siła sygnału</div>
          <input type="number" min={0} max={100} value={s.min_signal_strength ?? 60}
            onChange={(e) => setS({ ...s, min_signal_strength: Number(e.target.value) })}
            className="w-full rounded-md border border-border bg-background px-2 py-1" />
        </label>
        <label className="rounded-lg border border-border bg-background/40 p-3 text-xs">
          <div className="mb-1 uppercase tracking-widest text-muted-foreground">Symbole (CSV, puste = wszystkie)</div>
          <input value={(s.symbols_filter ?? []).join(",")}
            onChange={(e) => setS({ ...s, symbols_filter: e.target.value.split(",").map(x => x.trim().toUpperCase()).filter(Boolean) })}
            className="w-full rounded-md border border-border bg-background px-2 py-1" />
        </label>
        <label className="rounded-lg border border-border bg-background/40 p-3 text-xs">
          <div className="mb-1 uppercase tracking-widest text-muted-foreground">Interwały (CSV)</div>
          <input value={(s.intervals_filter ?? []).join(",")}
            onChange={(e) => setS({ ...s, intervals_filter: e.target.value.split(",").map(x => x.trim().toUpperCase()).filter(Boolean) })}
            className="w-full rounded-md border border-border bg-background px-2 py-1" />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={save} className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">Zapisz</button>
      </div>
    </FeatureCard>
  );
}

function WebhookTestCard() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const callTest = useServerFn(testWebhook);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("notification_settings").select("webhook_url").eq("user_id", u.user.id).maybeSingle();
      if (data?.webhook_url) setUrl(data.webhook_url);
    })();
  }, []);

  const send = async () => {
    if (!url) { toast.error("Podaj URL webhooka"); return; }
    setBusy(true); setResult(null);
    try {
      const res = await callTest({ data: { url } });
      setResult(res);
      if (res.ok) toast.success(`Webhook ${res.status} ${res.statusText} · ${res.durationMs} ms`);
      else toast.error(`Webhook ${res.status || "FAIL"}: ${res.statusText}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FeatureCard variant="bear" icon={Send} title="Test webhooka"
      description="Wyślij przykładowy payload setupu na podany URL i zobacz odpowiedź serwera. Działa z Discord, Slack, IFTTT, Make, n8n itp.">
      <div className="flex flex-col gap-2 md:flex-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={send} disabled={busy || !url}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent-coral)] px-4 py-2 text-xs font-bold text-background disabled:opacity-40">
          <Send className={cn("h-3 w-3", busy && "animate-pulse")} /> {busy ? "Wysyłam..." : "Wyślij test"}
        </button>
      </div>

      {result && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Status
              <span className={cn("rounded px-1.5 py-0.5 font-bold",
                result.ok ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear")}>
                {result.ok ? "OK" : "FAIL"}
              </span>
            </div>
            <div className="num text-sm">{result.status || "—"} {result.statusText}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Czas: {result.durationMs} ms</div>
            {"responseSnippet" in result && (result as any).responseSnippet && (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[10px] text-muted-foreground">{(result as any).responseSnippet}</pre>
            )}
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Wysłany payload</div>
            <pre className="max-h-40 overflow-auto rounded bg-background/60 p-2 text-[10px] text-muted-foreground">{JSON.stringify(result.sentPayload, null, 2)}</pre>
          </div>
        </div>
      )}
    </FeatureCard>
  );
}

function OutcomeChip({ outcome }: { outcome: string }) {
  const map: Record<string, string> = {
    setup: "bg-bull/20 text-bull",
    "no-signal": "bg-muted/30 text-muted-foreground",
    duplicate: "bg-warning/20 text-warning",
    error: "bg-bear/20 text-bear",
  };
  return <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", map[outcome] ?? "bg-muted/20")}>{outcome}</span>;
}

function LogDetailTabs({ details }: { details: any }) {
  const [tab, setTab] = useState<"summary" | "runs" | "checks" | "diff" | "raw">("summary");
  const [openRun, setOpenRun] = useState<string | null>(null);
  const runs: any[] = details?.runs ?? [];
  const checks: any[] = details?.checks ?? [];
  const diff: any[] = details?.diff?.changed ?? [];

  const TabBtn = ({ id, label, count }: { id: typeof tab; label: string; count?: number }) => (
    <button onClick={() => setTab(id)}
      className={cn("rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
        tab === id ? "bg-primary text-primary-foreground" : "bg-background/40 text-muted-foreground hover:text-foreground")}>
      {label}{count != null && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );

  return (
    <div className="space-y-3 pb-3">
      <div className="flex flex-wrap gap-1">
        <TabBtn id="summary" label="Podsumowanie" />
        {runs.length > 0 && <TabBtn id="runs" label="Runs" count={runs.length} />}
        {checks.length > 0 && <TabBtn id="checks" label="Setupy" count={checks.length} />}
        {diff.length > 0 && <TabBtn id="diff" label="Diff" count={diff.length} />}
        <TabBtn id="raw" label="JSON" />
      </div>

      {tab === "summary" && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Object.entries(details ?? {})
            .filter(([k, v]) => typeof v === "number" || typeof v === "boolean")
            .map(([k, v]) => (
              <div key={k} className="rounded-md border border-border bg-background/40 p-2">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{k}</div>
                <div className="num text-sm font-bold">{String(v)}</div>
              </div>
            ))}
          {Array.isArray(details?.symbols) && (
            <div className="col-span-2 rounded-md border border-border bg-background/40 p-2 md:col-span-4">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Symbols</div>
              <div className="text-[11px]">{details.symbols.join(", ")}</div>
            </div>
          )}
          {Array.isArray(details?.intervals) && (
            <div className="col-span-2 rounded-md border border-border bg-background/40 p-2 md:col-span-4">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Intervals</div>
              <div className="text-[11px]">{details.intervals.join(", ")}</div>
            </div>
          )}
          {Array.isArray(details?.errorMessages) && details.errorMessages.length > 0 && (
            <div className="col-span-2 rounded-md border border-bear/40 bg-bear/10 p-2 md:col-span-4">
              <div className="mb-1 text-[9px] uppercase tracking-widest text-bear">Błędy</div>
              <ul className="space-y-0.5 text-[10px] text-bear/90">
                {details.errorMessages.map((e: string, i: number) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "runs" && runs.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-12 gap-2 bg-background/60 px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            <span className="col-span-2">Symbol/Itv</span>
            <span className="col-span-2">Świece</span>
            <span className="col-span-2 text-right">Last close</span>
            <span className="col-span-6">Detektory</span>
          </div>
          <div className="divide-y divide-border text-[11px]">
            {runs.map((r) => {
              const key = `${r.symbol}-${r.interval}`;
              const isOpen = openRun === key;
              return (
                <div key={key}>
                  <button onClick={() => setOpenRun(isOpen ? null : key)} className="grid w-full grid-cols-12 items-center gap-2 px-2 py-1.5 text-left hover:bg-background/30">
                    <span className="col-span-2 font-bold">{r.symbol} <span className="text-muted-foreground">/{r.interval}</span></span>
                    <span className="col-span-2 num text-muted-foreground">{r.candles?.count ?? 0}</span>
                    <span className="col-span-2 num text-right">{r.candles?.lastClose != null ? Number(r.candles.lastClose).toFixed(2) : "—"}</span>
                    <span className="col-span-6 flex flex-wrap items-center gap-1">
                      {r.detectors?.map((d: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground">{d.name}</span>
                          <OutcomeChip outcome={d.outcome} />
                        </span>
                      ))}
                      <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform", isOpen && "rotate-90")} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 bg-background/40 px-3 py-2 text-[10px]">
                      <div className="text-muted-foreground">
                        Świece: {r.candles?.firstOpenTime?.slice(0, 16)?.replace("T", " ")} → {r.candles?.lastCloseTime?.slice(0, 16)?.replace("T", " ")}
                        {" · "}vol {r.candles?.lastVolume?.toFixed?.(2) ?? "—"}
                      </div>
                      {Array.isArray(r.candles?.tail) && r.candles.tail.length > 0 && (
                        <div className="overflow-x-auto rounded border border-border bg-background/60">
                          <div className="grid grid-cols-6 gap-2 border-b border-border/60 px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                            <span>time</span><span className="text-right">open</span><span className="text-right">high</span><span className="text-right">low</span><span className="text-right">close</span><span className="text-right">vol</span>
                          </div>
                          {r.candles.tail.map((c: any, i: number) => (
                            <div key={i} className="grid grid-cols-6 gap-2 px-2 py-0.5 font-mono text-[10px] odd:bg-background/30">
                              <span className="text-muted-foreground">{c.openTime?.slice(5, 16)?.replace("T", " ")}</span>
                              <span className="num text-right">{Number(c.open).toFixed(2)}</span>
                              <span className="num text-right">{Number(c.high).toFixed(2)}</span>
                              <span className="num text-right">{Number(c.low).toFixed(2)}</span>
                              <span className="num text-right">{Number(c.close).toFixed(2)}</span>
                              <span className="num text-right text-muted-foreground">{Number(c.volume).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.detectors?.map((d: any, i: number) => (
                        <div key={i} className="rounded border border-border bg-background/60 p-2">
                          <div className="mb-1 flex items-center gap-2"><span className="font-bold">{d.name}</span><OutcomeChip outcome={d.outcome} /><span className="text-muted-foreground">· {d.durationMs} ms</span></div>
                          {d.reason && <div className="text-muted-foreground">{d.reason}</div>}
                          {d.params && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(d.params).map(([k, v]) => (
                                <Mini key={k} label={k} v={String(v)} />
                              ))}
                            </div>
                          )}
                          {d.setup && (
                            <div className="mt-1 grid grid-cols-2 gap-1 md:grid-cols-4">
                              <Mini label="dir" v={d.setup.direction} />
                              <Mini label="entry" v={Number(d.setup.entry_price).toFixed(2)} />
                              <Mini label="SL" v={Number(d.setup.stop_loss).toFixed(2)} />
                              <Mini label="TP" v={Number(d.setup.take_profit).toFixed(2)} />
                              <Mini label="strength" v={d.setup.signal_strength} />
                              {d.setup.wave_label && <Mini label="wave" v={d.setup.wave_label} />}
                            </div>
                          )}
                        </div>
                      ))}
                      <details className="rounded border border-border/60 bg-background/40 p-1">
                        <summary className="cursor-pointer px-1 text-[9px] uppercase tracking-widest text-muted-foreground">Surowy JSON</summary>
                        <pre className="mt-1 max-h-60 overflow-auto p-2 text-[10px]">{JSON.stringify(r, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "checks" && checks.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-12 gap-2 bg-background/60 px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            <span className="col-span-3">Symbol/Itv</span>
            <span className="col-span-2">Typ</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-5">Powód</span>
          </div>
          <ul className="divide-y divide-border text-[11px]">
            {checks.map((c) => (
              <li key={c.id} className="grid grid-cols-12 gap-2 px-2 py-1.5">
                <span className="col-span-3 font-bold">{c.symbol} <span className="text-muted-foreground">/{c.interval}</span></span>
                <span className="col-span-2 text-muted-foreground">{c.setup_type} {c.direction}</span>
                <span className="col-span-2"><OutcomeChip outcome={c.newStatus === "win" ? "setup" : c.newStatus === "loss" ? "error" : "no-signal"} /></span>
                <span className="col-span-5 truncate text-muted-foreground" title={c.reason}>{c.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "diff" && (
        <div className="space-y-1 text-[11px]">
          {diff.length === 0 && <div className="text-muted-foreground">Brak zmian względem poprzedniego runu.</div>}
          {diff.map((d, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background/40 px-2 py-1.5">
              <span className="font-bold">{d.symbol} <span className="text-muted-foreground">/{d.interval}</span></span>
              <span className="num text-muted-foreground">
                {d.lastClosePrev?.toFixed?.(2) ?? "—"} →{" "}
                <span className={cn(d.lastCloseDelta > 0 && "text-bull", d.lastCloseDelta < 0 && "text-bear")}>
                  {d.lastCloseNow?.toFixed?.(2) ?? "—"} ({d.lastCloseDelta > 0 ? "+" : ""}{d.lastCloseDelta?.toFixed?.(2) ?? "—"})
                </span>
              </span>
              <span className="flex gap-1">
                {d.newSetups?.map((s: string) => <span key={s} className="rounded bg-bull/20 px-1.5 py-0.5 text-[9px] font-bold text-bull">+{s}</span>)}
                {d.goneSetups?.map((s: string) => <span key={s} className="rounded bg-bear/20 px-1.5 py-0.5 text-[9px] font-bold text-bear">-{s}</span>)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "raw" && (
        <pre className="max-h-96 overflow-auto rounded-md bg-background/60 p-3 text-[10px] text-muted-foreground">{JSON.stringify(details, null, 2)}</pre>
      )}
    </div>
  );
}

function Mini({ label, v }: { label: string; v: any }) {
  return (
    <div className="rounded bg-background/60 px-1.5 py-1">
      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="num text-[11px] font-bold">{String(v)}</div>
    </div>
  );
}

function CronLogsCard({ logs, onRefresh }: { logs: any[]; onRefresh: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <FeatureCard variant="warning" icon={ListChecks} title="Logi cronów"
      description="Każde wykonanie skanera, weryfikacji i powiadomień. Auto-odświeżanie co 5 s. Kliknij wiersz, żeby zobaczyć podgląd: świece → detektory → diff."
      action={
        <button onClick={onRefresh} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3 w-3" /> Odśwież
        </button>
      }>
      <ul className="divide-y divide-border text-xs">
        {logs.length === 0 && <li className="py-2 text-muted-foreground">Brak wpisów. Pierwsze pojawią się w ciągu kilku minut lub po ręcznym uruchomieniu.</li>}
        {logs.map((l) => {
          const newCount = l.details?.diff?.changed?.reduce((acc: number, c: any) => acc + (c.newSetups?.length ?? 0), 0) ?? 0;
          return (
            <li key={l.id}>
              <button onClick={() => setOpen(open === l.id ? null : l.id)}
                className="grid w-full grid-cols-12 items-center gap-2 py-2 text-left hover:bg-background/30">
                <span className="col-span-3 font-bold">{l.job_name}</span>
                <span className={cn("col-span-2 rounded px-1.5 py-0.5 text-center text-[10px] font-bold uppercase",
                  l.status === "success" && "bg-bull/20 text-bull",
                  l.status === "partial" && "bg-warning/20 text-warning",
                  l.status === "error" && "bg-bear/20 text-bear",
                  l.status === "running" && "bg-cyan-500/20 text-cyan-300")}>{l.status}</span>
                <span className="col-span-3 num text-muted-foreground">{new Date(l.started_at).toLocaleString("pl-PL")}</span>
                <span className="col-span-2 num text-muted-foreground">{l.duration_ms ? `${l.duration_ms} ms` : "—"}</span>
                <span className="col-span-2 truncate text-muted-foreground">
                  {l.details?.detected != null ? `det:${l.details.detected} ins:${l.details.inserted}` : l.details?.updated != null ? `upd:${l.details.updated}` : l.details?.sent != null ? `sent:${l.details.sent}` : ""}
                  {newCount > 0 && <span className="ml-1 rounded bg-bull/20 px-1 text-[9px] font-bold text-bull">+{newCount} NEW</span>}
                </span>
              </button>
              {open === l.id && <LogDetailTabs details={l.details} />}
            </li>
          );
        })}
      </ul>
    </FeatureCard>
  );
}

