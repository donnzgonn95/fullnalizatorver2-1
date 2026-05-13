import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CoRobicCard } from "@/components/gielda/CoRobicCard";
import { computeVerdict, defaultContext } from "@/lib/gielda/decision-engine";
import { indices } from "@/lib/gielda/mock-indices";
import { sectors } from "@/lib/gielda/mock-sectors";
import { macroIndicators } from "@/lib/gielda/mock-macro";
import { ChangePill } from "@/components/StatPill";
import { seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { insertDecision } from "@/lib/gielda/repo";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/gielda/")({
  head: () => ({
    ...seoHead({
      title: "Overview rynku — Globalny Portal Giełdowy",
      description: "Stan rynków akcji USA i Europy, kluczowe indeksy, sektory, makro i decyzja: czekać, akumulować czy zabezpieczać.",
      path: "/gielda",
    }),
  }),
  component: GieldaOverview,
});

function GieldaOverview() {
  const { user } = useAuth();
  const verdict = useMemo(() => computeVerdict(defaultContext()), []);
  const topSectors = [...sectors].sort((a, b) => b.changeYtd - a.changeYtd).slice(0, 4);
  const [agentText, setAgentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestDecision, setLatestDecision] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("decision_logs").select("*")
      .eq("source", "agent").order("created_at", { ascending: false }).limit(1)
      .maybeSingle()
      .then(({ data }) => setLatestDecision(data));
  }, [user]);

  const askAgent = async () => {
    if (!user) return toast.error("Zaloguj się, aby pobrać werdykt agenta.");
    setLoading(true);
    setAgentText("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Brak sesji.");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-ai`, {
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
            { role: "user", content: `Kontekst: ${JSON.stringify({ verdict, indices, topSectors })}\n\nKrótko (do 200 słów): jaki werdykt na dziś (czekaj/obserwuj/akumuluj/redukuj/zabezpieczaj), 3 punkty planu, 2 ryzyka.` },
          ],
        }),
      });
      if (!res.ok || !res.body) throw new Error("Błąd agenta");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let acc = ""; let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(data);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setAgentText(acc); }
          } catch { /* */ }
        }
      }
      const row = await insertDecision(user.id, {
        source: "agent", verdict: verdict.verdict,
        payload: { question: "overview-verdict", answer: acc.slice(0, 4000), context: verdict },
        approved: null,
      });
      setLatestDecision(row);
      toast.success("Werdykt zapisany w dzienniku decyzji.");
    } catch (e: any) {
      toast.error(e.message ?? "Błąd agenta");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Overview</div>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Co dziś dzieje się na giełdach?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skondensowany przegląd indeksów, sektorów i makro. Dane prezentacyjne (mock) — przygotowane pod podłączenie realnych źródeł.
        </p>
      </header>

      <CoRobicCard result={verdict} />

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Bot className="h-4 w-4" /> Werdykt Agenta-Analityka
          </div>
          <div className="flex gap-2">
            <button onClick={askAgent} disabled={loading || !user}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Pobierz werdykt
            </button>
            <Link to="/gielda/agent" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
              Pełny agent →
            </Link>
          </div>
        </div>
        {agentText ? (
          <pre className="mt-3 whitespace-pre-wrap text-sm">{agentText}</pre>
        ) : latestDecision ? (
          <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Ostatnia decyzja: {new Date(latestDecision.created_at).toLocaleString("pl-PL")} · {latestDecision.verdict}
            </div>
            <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">
              {(latestDecision.payload as any)?.answer ?? "—"}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {user ? "Kliknij „Pobierz werdykt”, aby agent zinterpretował aktualne dane." : "Zaloguj się, aby skorzystać z agenta."}
          </p>
        )}
      </section>

      <Section title="Kluczowe indeksy">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indices.map((i) => (
            <div key={i.symbol} className="surface-glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.region}</div>
                  <div className="text-sm font-bold">{i.name}</div>
                </div>
                <ChangePill value={i.change1d} />
              </div>
              <div className="num mt-2 text-xl font-semibold">{i.value.toLocaleString("pl-PL")}</div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>1M <span className={cn("num", i.change1m >= 0 ? "text-bull" : "text-bear")}>{i.change1m.toFixed(1)}%</span></span>
                <span>YTD <span className={cn("num", i.changeYtd >= 0 ? "text-bull" : "text-bear")}>{i.changeYtd.toFixed(1)}%</span></span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Najsilniejsze sektory (YTD)">
          <ul className="divide-y divide-border">
            {topSectors.map((s) => (
              <li key={s.symbol} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.symbol} · waga {s.weight}%</div>
                </div>
                <div className={cn("num text-sm font-bold", s.changeYtd >= 0 ? "text-bull" : "text-bear")}>
                  {s.changeYtd.toFixed(1)}%
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Makro w pigułce">
          <ul className="divide-y divide-border">
            {macroIndicators.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.region} · {m.asOf}</div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-bold">{m.value}{m.unit}</div>
                  <div className={cn(
                    "text-[11px]",
                    m.interpretation === "positive" && "text-bull",
                    m.interpretation === "negative" && "text-bear",
                    m.interpretation === "neutral" && "text-muted-foreground",
                  )}>
                    Δ {m.change > 0 ? "+" : ""}{m.change}{m.unit}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
