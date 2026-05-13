import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/gielda/RequireAuth";
import { computeVerdict, defaultContext } from "@/lib/gielda/decision-engine";
import { gieldaStorage } from "@/lib/gielda/storage";
import { CoRobicCard } from "@/components/gielda/CoRobicCard";
import { Bot, Check, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { seoHead } from "@/lib/seo";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DecisionLog } from "@/lib/gielda/types";

export const Route = createFileRoute("/gielda/agent")({
  head: () => ({
    ...seoHead({
      title: "Agent-Analityk giełdowy",
      description: "Doradca AI: plan, scenariusze, ryzyka i checklista decyzyjna. Edukacyjnie — nie zleca transakcji.",
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
  const verdict = useMemo(() => computeVerdict(defaultContext()), []);
  const [question, setQuestion] = useState("Co robić w obecnym otoczeniu makro z portfelem 60/40?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
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
          mode: "chat",
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Kontekst (skrócony): ${JSON.stringify(verdict)}\n\nPytanie: ${question}` },
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
    } catch (e: any) {
      toast.error(e.message ?? "Błąd agenta");
    } finally {
      setLoading(false);
    }
  };

  const approve = (outcome: "approved" | "rejected") => {
    if (!answer) return;
    const log: DecisionLog = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      verdict: verdict.verdict,
      rationale: question,
      agentNote: answer.slice(0, 800),
      outcome,
    };
    gieldaStorage.appendDecision(log);
    toast.success(outcome === "approved" ? "Zatwierdzono w dzienniku decyzji." : "Odrzucono — zapisane w dzienniku.");
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> Agent-Analityk · doradca edukacyjny
        </div>
        <h1 className="mt-1 text-2xl font-bold">Pomocnik decyzji inwestycyjnych</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent przygotowuje plan, scenariusze i ryzyka. <strong>Nie składa zleceń.</strong> Decyzję zatwierdzasz Ty.
        </p>
      </header>

      <CoRobicCard result={verdict} />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Pytanie do agenta</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={ask}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Zapytaj agenta
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Plan i checklista</h2>
          {answer && (
            <div className="flex gap-2">
              <button onClick={() => approve("approved")} className="inline-flex items-center gap-1 rounded-md border border-bull/40 bg-bull/10 px-2 py-1 text-xs text-bull hover:bg-bull/20">
                <Check className="h-3 w-3" /> Zatwierdzam
              </button>
              <button onClick={() => approve("rejected")} className="inline-flex items-center gap-1 rounded-md border border-bear/40 bg-bear/10 px-2 py-1 text-xs text-bear hover:bg-bear/20">
                <X className="h-3 w-3" /> Odrzucam
              </button>
            </div>
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
