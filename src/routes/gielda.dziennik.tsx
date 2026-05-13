import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { decisionLogsInitial, agentNotesInitial } from "@/lib/gielda/mock-bajtlik";
import { gieldaStorage } from "@/lib/gielda/storage";
import type { DecisionLog, AgentNote, DecisionVerdict } from "@/lib/gielda/types";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/gielda/dziennik")({
  head: () => ({
    ...seoHead({
      title: "Dziennik decyzji inwestycyjnych",
      description: "Historia podjętych decyzji, notatki agenta i użytkownika.",
      path: "/gielda/dziennik",
    }),
  }),
  component: () => <RequireAuth><DziennikPage /></RequireAuth>,
});

const VERDICTS: DecisionVerdict[] = ["czekaj", "obserwuj", "akumuluj", "redukuj", "zabezpieczaj"];

function DziennikPage() {
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [notes, setNotes] = useState<AgentNote[]>([]);
  const [draft, setDraft] = useState({ symbol: "", verdict: "obserwuj" as DecisionVerdict, rationale: "", userNote: "" });

  useEffect(() => {
    const d = gieldaStorage.getDecisions();
    setDecisions(d.length ? d : decisionLogsInitial);
    const n = gieldaStorage.getAgentNotes();
    setNotes(n.length ? n : agentNotesInitial);
  }, []);

  const addDecision = () => {
    if (!draft.rationale.trim()) return;
    const d: DecisionLog = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      symbol: draft.symbol || undefined,
      verdict: draft.verdict,
      rationale: draft.rationale,
      userNote: draft.userNote || undefined,
      outcome: "approved",
    };
    const next = [d, ...decisions];
    setDecisions(next);
    gieldaStorage.setDecisions(next);
    setDraft({ symbol: "", verdict: "obserwuj", rationale: "", userNote: "" });
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Dziennik</div>
        <h1 className="mt-1 text-2xl font-bold">Decyzje i notatki</h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Nowy wpis</h2>
        <div className="grid gap-3 md:grid-cols-[120px_140px_1fr]">
          <input
            value={draft.symbol}
            onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })}
            placeholder="Symbol"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={draft.verdict}
            onChange={(e) => setDraft({ ...draft, verdict: e.target.value as DecisionVerdict })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input
            value={draft.rationale}
            onChange={(e) => setDraft({ ...draft, rationale: e.target.value })}
            placeholder="Uzasadnienie decyzji…"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={draft.userNote}
            onChange={(e) => setDraft({ ...draft, userNote: e.target.value })}
            placeholder="Notatka użytkownika (opcjonalnie)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={addDecision}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Dodaj wpis
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Historia decyzji ({decisions.length})</h2>
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
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(d.createdAt).toLocaleString("pl-PL")}</span>
              </div>
              <p className="mt-2 text-sm">{d.rationale}</p>
              {d.agentNote && <p className="mt-1 text-xs text-muted-foreground">Agent: {d.agentNote}</p>}
              {d.userNote && <p className="mt-1 text-xs text-muted-foreground">Ja: {d.userNote}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Notatki agenta</h2>
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">{n.topic}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("pl-PL")}</div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.content}</p>
              {n.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.tags.map((t) => <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{t}</span>)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
