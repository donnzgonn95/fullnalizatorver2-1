import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeatureCard } from "@/components/FeatureCard";
import { Settings, ListChecks, Bell, X, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
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
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Panel admina</h1>
        <p className="mt-1 text-xs text-muted-foreground">Zarządzaj globalnym skanerem, podglądaj logi cronów, konfiguruj swoje powiadomienia.</p>
      </header>

      {isAdmin === false && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Nie masz roli <code>admin</code>. Edycja konfiguracji skanera jest niedostępna. Możesz nadal konfigurować swoje powiadomienia.
        </div>
      )}

      <ScannerConfigCard cfg={cfg} canEdit={!!isAdmin} onSaved={() => qc.invalidateQueries({ queryKey: ["scanner_config"] })} />
      <NotificationsCard />
      <CronLogsCard logs={logs ?? []} />
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

function CronLogsCard({ logs }: { logs: any[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <FeatureCard variant="warning" icon={ListChecks} title="Logi cronów"
      description="Każde wykonanie skanera, weryfikacji i powiadomień. Kliknij wiersz, żeby zobaczyć szczegóły JSON."
      action={<RefreshCw className="h-4 w-4 text-muted-foreground" />}>
      <ul className="divide-y divide-border text-xs">
        {logs.length === 0 && <li className="py-2 text-muted-foreground">Brak wpisów. Pierwsze pojawią się w ciągu kilku minut.</li>}
        {logs.map((l) => (
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
              <span className="col-span-2 truncate text-muted-foreground">{l.details?.detected != null ? `det:${l.details.detected} ins:${l.details.inserted}` : l.details?.updated != null ? `upd:${l.details.updated}` : l.details?.sent != null ? `sent:${l.details.sent}` : ""}</span>
            </button>
            {open === l.id && (
              <pre className="mb-2 overflow-x-auto rounded-md bg-background/60 p-3 text-[10px] text-muted-foreground">{JSON.stringify(l.details, null, 2)}</pre>
            )}
          </li>
        ))}
      </ul>
    </FeatureCard>
  );
}
