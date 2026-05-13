import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { computeVerdict, defaultContext } from "@/lib/gielda/decision-engine";
import { addAgentNote, insertDecision, setDecisionApproval } from "@/lib/gielda/repo";
import { CoRobicCard } from "@/components/gielda/CoRobicCard";
import { Bot, Check, Loader2, NotebookPen, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { seoHead } from "@/lib/seo";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/gielda/agent")({
  head: () => ({
    ...seoHead({
      title: "Agent-Analityk giełdowy",
      description: "Doradca AI: plan, scenariusze, ryzyka, checklista. Decyzje zatwierdzasz Ty — zapis w bazie.",
      path: "/gielda/agent",
    }),
  }),
  component: () => <RequireAuth><AgentPage /></RequireAuth>,
});

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-ai`;

const SYSTEM_PROMPT = `Jesteś doradcą analityczno-edukacyjnym dla rynków akcji USA i Europy oraz ETF-ów.
Nie składasz zleceń ani nie wykonujesz realnych transakcji.
Każdą rekomendację formatujesz w sekcjach:
1. Plan (cel, horyzont)
2. Scenariusze (bazowy, byczy, niedźwiedzi)
3. Ryzyka i czerwone flagi
4. Checklista decyzyjna (do akceptacji przez użytkownika)
Język: polski. Treści edukacyjne, nie stanowią porady inwestycyjnej.`;

function AgentPage() {
  const { user } = useAuth();
  const verdict = useMemo(() => computeVerdict(defaultContext()), []);
  const [question, setQuestion] = useState("Co robić w obecnym otoczeniu makro z portfelem 60/40?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);

  const ask = async () => {
    if (!question.trim() || !user) return;
    setLoading(true);
    setAnswer("");
    setDecisionId(null);
    setDecided(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Zaloguj się.");
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          mode: "stocks",
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: `Kontekst makro/techniczny (heurystyka): ${JSON.stringify(verdict)}\n\nPytanie: ${question}` },
          ],
        }),
      });
      if (!res.ok || !res.body) throw new Error("Błąd agenta.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(data);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { acc += c; setAnswer(acc); }
          } catch { /* ignore */ }
        }
      }

      // zapisz wpis pending
      const row = await insertDecision(user.id, {
        source: "agent",
        verdict: verdict.verdict,
        payload: { question, answer: acc.slice(0, 4000), context: verdict },
        approved: null,
      });
      setDecisionId((row as any).id);
    } catch (e: any) {
      toast.error(e.message ?? "Błąd agenta");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (approved: boolean) => {
    if (!decisionId) return;
    try {
      await setDecisionApproval(decisionId, approved);
      setDecided(approved ? "approved" : "rejected");
      toast.success(approved ? "Zatwierdzono w dzienniku." : "Odrzucono — zapisane w dzienniku.");
    } catch (e: any) { toast.error(e.message); }
  };

  const saveAsNote = async () => {
    if (!user || !answer) return;
    try {
      await addAgentNote(user.id, {
        title: question.slice(0, 80),
        content: answer,
        tags: ["agent", "gielda"],
        linked_decision_id: decisionId ?? undefined,
      });
      toast.success("Zapisano jako notatkę agenta.");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> Agent-Analityk · doradca edukacyjny
        </div>
        <h1 className="mt-1 text-2xl font-bold">Pomocnik decyzji inwestycyjnych</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent przygotowuje plan, scenariusze i ryzyka. <strong>Nie składa zleceń.</strong> Decyzję zatwierdzasz Ty (zapis w bazie).
        </p>
      </header>

      <CoRobicCard result={verdict} />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Pytanie do agenta</h2>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div className="mt-3 flex gap-2">
          <button onClick={ask} disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Zapytaj agenta
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Plan i checklista</h2>
          {answer && decisionId && decided == null && (
            <div className="flex gap-2">
              <button onClick={() => decide(true)} className="inline-flex items-center gap-1 rounded-md border border-bull/40 bg-bull/10 px-2 py-1 text-xs text-bull hover:bg-bull/20">
                <Check className="h-3 w-3" /> Zatwierdzam
              </button>
              <button onClick={() => decide(false)} className="inline-flex items-center gap-1 rounded-md border border-bear/40 bg-bear/10 px-2 py-1 text-xs text-bear hover:bg-bear/20">
                <X className="h-3 w-3" /> Odrzucam
              </button>
              <button onClick={saveAsNote} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary">
                <NotebookPen className="h-3 w-3" /> Zapisz jako notatkę
              </button>
            </div>
          )}
          {decided && (
            <span className={cn_status(decided)}>
              {decided === "approved" ? "Zatwierdzono" : "Odrzucono"}
            </span>
          )}
        </div>
        <div className="prose prose-sm prose-invert max-w-none">
          {answer
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            : <p className="text-sm text-muted-foreground">Wpisz pytanie i kliknij „Zapytaj agenta".</p>}
        </div>
      </section>
    </div>
  );
}

function cn_status(s: "approved" | "rejected") {
  return s === "approved"
    ? "rounded bg-bull/15 px-2 py-1 text-[11px] font-bold uppercase text-bull"
    : "rounded bg-bear/15 px-2 py-1 text-[11px] font-bold uppercase text-bear";
}
