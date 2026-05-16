import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/ksiega")({
  component: KsiegaPage,
  head: () => ({
    meta: [
      { title: "Złota Księga — CryptoPuls" },
      { name: "description", content: "Niezmienna księga zdarzeń ekosystemu eljot." },
    ],
  }),
});

interface Agent {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  version: string;
  status: string;
}

interface LedgerEntry {
  id: string;
  seq: number;
  category: string;
  source: string;
  symbol: string | null;
  summary: string;
  payload: Record<string, unknown>;
  prev_hash: string | null;
  entry_hash: string;
  created_at: string;
  agent_id: string | null;
}

interface Reputation {
  agent_id: string;
  score: number;
  events_count: number;
  hits: number;
  misses: number;
  last_active_at: string | null;
}

interface EljotMove {
  id: string;
  agent_id: string | null;
  amount: number;
  reason: string;
  created_at: string;
}

function KsiegaPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [rep, setRep] = useState<Reputation[]>([]);
  const [eljot, setEljot] = useState<EljotMove[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [a, l, r, e] = await Promise.all([
        supabase.from("agents").select("*").order("created_at"),
        supabase.from("golden_ledger").select("*").order("seq", { ascending: false }).limit(200),
        supabase.from("agent_reputation").select("*"),
        supabase.from("eljot_ledger").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      if (!alive) return;
      setAgents((a.data as Agent[]) ?? []);
      setEntries((l.data as LedgerEntry[]) ?? []);
      setRep((r.data as Reputation[]) ?? []);
      setEljot((e.data as EljotMove[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const repByAgent = new Map(rep.map((r) => [r.agent_id, r]));
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const totalEljotByAgent = new Map<string, number>();
  for (const m of eljot) {
    if (!m.agent_id) continue;
    totalEljotByAgent.set(m.agent_id, (totalEljotByAgent.get(m.agent_id) ?? 0) + Number(m.amount));
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">📜 Złota Księga</h1>
        <p className="text-muted-foreground max-w-2xl">
          Niezmienna księga zdarzeń ekosystemu <strong>eljot</strong>. Każdy wpis ma hash łańcuchowy
          (jak w blockchainie). Agenci zapisują tu swoje obserwacje i dostają nagrody w tokenie eljot.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">🤖 Agenci ({agents.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {agents.map((a) => {
            const r = repByAgent.get(a.id);
            const tokens = totalEljotByAgent.get(a.id) ?? 0;
            return (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.slug} · v{a.version}</div>
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                </div>
                {a.description && (
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2 text-xs">
                  <span className="rounded bg-muted px-2 py-0.5">
                    🎯 {r?.events_count ?? 0} zdarzeń
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5">
                    ⭐ {Number(r?.score ?? 0).toFixed(1)} rep
                  </span>
                  <span className="rounded bg-warning/20 px-2 py-0.5 text-warning">
                    🪙 {tokens.toFixed(2)} eljot
                  </span>
                </div>
              </div>
            );
          })}
          {agents.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Brak agentów. Pierwszy zostanie zainicjalizowany przy starcie skanera.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📖 Ostatnie wpisy ({entries.length})</h2>
        {loading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Kategoria</th>
                <th className="px-3 py-2 text-left">Agent</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Streszczenie</th>
                <th className="px-3 py-2 text-right">Czas</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isOpen = expanded === e.id;
                const agent = e.agent_id ? agentById.get(e.agent_id) : null;
                return (
                  <>
                    <tr
                      key={e.id}
                      className="cursor-pointer border-t border-border hover:bg-muted/30"
                      onClick={() => setExpanded(isOpen ? null : e.id)}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">#{e.seq}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{e.category}</Badge></td>
                      <td className="px-3 py-2 text-xs">{agent?.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.symbol ?? "—"}</td>
                      <td className="px-3 py-2">{e.summary}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pl-PL")}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${e.id}-d`} className="bg-muted/20">
                        <td colSpan={6} className="px-3 py-3 space-y-2">
                          <div className="font-mono text-[11px] text-muted-foreground break-all">
                            <div>🔗 entry_hash: {e.entry_hash}</div>
                            <div>↩ prev_hash: {e.prev_hash ?? "(genesis)"}</div>
                          </div>
                          <details>
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                              Pokaż payload
                            </summary>
                            <pre className="mt-2 rounded bg-background p-3 text-[11px] overflow-x-auto">
                              {JSON.stringify(e.payload, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {entries.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Księga jest pusta. Zdarzenia pojawią się po pierwszym skanie.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">🪙 Ruchy tokenu eljot ({eljot.length})</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Czas</th>
                <th className="px-3 py-2 text-left">Agent</th>
                <th className="px-3 py-2 text-left">Powód</th>
                <th className="px-3 py-2 text-right">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {eljot.map((m) => {
                const a = m.agent_id ? agentById.get(m.agent_id) : null;
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("pl-PL")}
                    </td>
                    <td className="px-3 py-2 text-xs">{a?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{m.reason}</td>
                    <td className={`px-3 py-2 text-right font-mono ${Number(m.amount) >= 0 ? "text-bull" : "text-bear"}`}>
                      {Number(m.amount) >= 0 ? "+" : ""}{Number(m.amount).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {eljot.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Brak ruchów tokenu. Agenci dostają eljot za każde wartościowe zdarzenie.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
