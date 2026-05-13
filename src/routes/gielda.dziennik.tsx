import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { insertDecision, listAgentNotes, listDecisions, setDecisionApproval } from "@/lib/gielda/repo";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/gielda/dziennik")({
  head: () => ({
    ...seoHead({
      title: "Dziennik decyzji inwestycyjnych",
      description: "Historia decyzji, status zatwierdzeń i notatki agenta — z bazy (RLS per-user).",
      path: "/gielda/dziennik",
    }),
  }),
  component: () => <RequireAuth><DziennikPage /></RequireAuth>,
});

const VERDICTS = ["czekaj", "obserwuj", "akumuluj", "redukuj", "zabezpieczaj"];

function DziennikPage() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ symbol: "", verdict: "obserwuj", rationale: "" });

  const refresh = async () => {
    try {
      const [d, n] = await Promise.all([listDecisions(), listAgentNotes()]);
      setDecisions(d); setNotes(n);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const add = async () => {
    if (!user || !draft.rationale.trim()) return;
    try {
      await insertDecision(user.id, {
        source: "user",
        verdict: draft.verdict,
        symbol: draft.symbol || undefined,
        payload: { rationale: draft.rationale },
        approved: true,
      });
      setDraft({ symbol: "", verdict: "obserwuj", rationale: "" });
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Dziennik</div>
        <h1 className="mt-1 text-2xl font-bold">Decyzje i notatki</h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Nowy wpis (ręczny)</h2>
        <div className="grid gap-3 md:grid-cols-[120px_140px_1fr_auto]">
          <input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })}
            placeholder="Symbol" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <select value={draft.verdict} onChange={(e) => setDraft({ ...draft, verdict: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {VERDICTS.map((v) => <option key={v}>{v}</option>)}
          </select>
          <input value={draft.rationale} onChange={(e) => setDraft({ ...draft, rationale: e.target.value })}
            placeholder="Uzasadnienie…" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Dodaj
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Historia decyzji ({decisions.length})</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ładuję…</div>
        ) : decisions.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak decyzji.</div>
        ) : (
          <ol className="space-y-3">
            {decisions.map((d) => (
              <li key={d.id} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      d.verdict === "akumuluj" && "bg-bull/20 text-bull",
                      (d.verdict === "redukuj" || d.verdict === "zabezpieczaj") && "bg-bear/20 text-bear",
                      d.verdict === "obserwuj" && "bg-warning/20 text-warning",
                      d.verdict === "czekaj" && "bg-muted text-foreground",
                    )}>{d.verdict}</span>
                    {d.symbol && <span className="font-bold">{d.symbol}</span>}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.source}</span>
                    <ApprovalBadge approved={d.approved} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleString("pl-PL")}</span>
                </div>
                {(d.payload?.rationale || d.payload?.question) && (
                  <p className="mt-2 text-sm">{d.payload.rationale || d.payload.question}</p>
                )}
                {d.payload?.answer && (
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">Agent: {d.payload.answer}</p>
                )}
                {d.note && <p className="mt-1 text-xs text-muted-foreground">Ja: {d.note}</p>}
                {d.approved == null && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setDecisionApproval(d.id, true).then(refresh)} className="inline-flex items-center gap-1 rounded border border-bull/40 bg-bull/10 px-2 py-1 text-xs text-bull hover:bg-bull/20">
                      <Check className="h-3 w-3" /> Zatwierdź
                    </button>
                    <button onClick={() => setDecisionApproval(d.id, false).then(refresh)} className="inline-flex items-center gap-1 rounded border border-bear/40 bg-bear/10 px-2 py-1 text-xs text-bear hover:bg-bear/20">
                      <X className="h-3 w-3" /> Odrzuć
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Notatki agenta ({notes.length})</h2>
        {notes.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak notatek.</div>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">{n.title || "(bez tytułu)"}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString("pl-PL")}</div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</p>
                {n.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {n.tags.map((t: string) => <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{t}</span>)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ApprovalBadge({ approved }: { approved: boolean | null }) {
  if (approved == null) return <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] uppercase text-warning">pending</span>;
  if (approved) return <span className="rounded bg-bull/15 px-1.5 py-0.5 text-[9px] uppercase text-bull">approved</span>;
  return <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[9px] uppercase text-bear">rejected</span>;
}
