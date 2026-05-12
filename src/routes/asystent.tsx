import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Download, FileText, Loader2, RefreshCw, Send, Sparkles, Activity } from "lucide-react";
import { useLiveCoins } from "@/lib/binance";
import { generateAlerts, generateSetups } from "@/lib/signals";
import { sentiment, alerts as demoAlerts, setups as demoSetups, coins as demoCoins } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ModelPicker } from "@/components/ModelPicker";
import { ConversationsSidebar } from "@/components/ConversationsSidebar";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_REPORT_MODEL,
} from "@/lib/ai-models";
import {
  checkLimit,
  getStoredModel,
  recordUsage,
  setStoredModel,
  useAiUsage,
} from "@/lib/ai-usage";
import {
  deriveTitle,
  getConversation,
  newConversationId,
  upsertConversation,
  type ChatMsg,
  type Conversation,
} from "@/lib/chat-history";

import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/asystent")({
  head: () => ({
    ...seoHead({
      title: "AI Asystent rynku krypto",
      description: "Chat z asystentem AI, podsumowanie alertów i raport inwestorski. Wybór modelu (Gemini/GPT-5), historia rozmów, limity i koszty.",
      path: "/asystent",
    }),
  }),
  component: AsystentPage,
});

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-ai`;

import { supabase } from "@/integrations/supabase/client";

/** Returns the current user's JWT (not the anon key). Throws if not signed in. */
async function getUserAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Zaloguj się, aby korzystać z asystenta AI.");
  }
  return token;
}
type Mode = "analyze" | "summary" | "report";

async function callAI(mode: Mode, payload: unknown, model: string): Promise<{ content: string; usage?: any }> {
  const gate = checkLimit();
  if (!gate.ok) throw new Error(`${gate.reason}. Spróbuj za ~${gate.retryInSec}s.`);

  const token = await getUserAccessToken();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ mode, payload, model }),
  });
  if (res.status === 429) throw new Error("Przekroczony limit zapytań — spróbuj za chwilę.");
  if (res.status === 402) throw new Error("Brak kredytów AI — doładuj w Workspace → Usage.");
  if (!res.ok) throw new Error("Błąd bramki AI");
  const data = (await res.json()) as { content?: string; error?: string; usage?: any };
  if (data.error) throw new Error(data.error);
  return { content: data.content ?? "", usage: data.usage };
}

function AsystentPage() {
  const { data: liveCoins } = useLiveCoins();
  const coins = liveCoins?.length ? liveCoins : demoCoins;
  const setups = useMemo(() => (liveCoins?.length ? generateSetups(liveCoins) : demoSetups), [liveCoins]);
  const alerts = useMemo(() => (liveCoins?.length ? generateAlerts(liveCoins) : demoAlerts), [liveCoins]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Asystent AI · Lovable AI Gateway
        </div>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Analiza, podsumowania i raport inwestorski</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modele LLM operują na bieżących danych z aplikacji. Treści są edukacyjne, nie stanowią porady inwestycyjnej.
        </p>
      </header>

      <UsageBar />

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyzeCard coins={coins} sentiment={sentiment} />
        <SummaryCard alerts={alerts} />
      </div>

      <ReportCard coins={coins} sentiment={sentiment} setups={setups} alerts={alerts} />

      <ChatSection contextHint={{ topSetups: setups.slice(0, 3), sentiment }} />
    </div>
  );
}

/* ---------- Usage / limits bar ---------- */
function UsageBar() {
  const { stats, limits } = useAiUsage();
  const pct = Math.min(100, stats.budgetPct);
  const warn = pct >= 80;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3.5 w-3.5" /> Zużycie AI
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span><span className="text-muted-foreground">Dziś:</span> <span className="num font-semibold">{stats.countDay}</span> zapytań · <span className="num">${stats.costDayUsd.toFixed(4)}</span></span>
          <span><span className="text-muted-foreground">7 dni:</span> <span className="num font-semibold">{stats.countWeek}</span> zapytań · <span className="num">${stats.costWeekUsd.toFixed(4)}</span></span>
          <span className="text-muted-foreground">Limity: {limits.perMinute}/min · {limits.perHour}/h · {limits.perDay}/dzień</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
        <div
          className={cn("h-full transition-all", warn ? "bg-warning" : "bg-bull", stats.budgetExceeded && "bg-bear")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Budżet dnia: ${stats.costDayUsd.toFixed(4)} / ${limits.dailyBudgetUsd.toFixed(2)} ({pct.toFixed(0)}%)
        {stats.budgetExceeded && <span className="ml-2 font-semibold text-bear">PRZEKROCZONY</span>}
        <span className="ml-2">· zmień w Ustawieniach → Limity AI</span>
      </div>
    </section>
  );
}

/* ---------- Analyze ---------- */
function AnalyzeCard({ coins, sentiment }: { coins: any[]; sentiment: any }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(() => getStoredModel("analyze", DEFAULT_CHAT_MODEL));

  const run = async () => {
    setLoading(true);
    setOut("");
    try {
      const { content, usage } = await callAI("analyze", { coins, sentiment }, model);
      setOut(content);
      recordUsage({ mode: "analyze", model, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="h-4 w-4 text-primary" /> Analiza rynku (LLM)
        </h2>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Generuj
        </button>
      </div>
      <div className="mt-2">
        <ModelPicker value={model} onChange={(m) => { setModel(m); setStoredModel("analyze", m); }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Model przeanalizuje aktualne ceny, momentum, RSI i siłę relatywną {coins.length} aktywów.
      </p>
      <MarkdownBox content={out} placeholder="Kliknij „Generuj”, aby otrzymać analizę." />
    </section>
  );
}

/* ---------- Alerts summary ---------- */
function SummaryCard({ alerts }: { alerts: any[] }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(() => getStoredModel("summary", DEFAULT_CHAT_MODEL));

  const run = async () => {
    setLoading(true);
    setOut("");
    try {
      const { content, usage } = await callAI("summary", { alerts }, model);
      setOut(content);
      recordUsage({ mode: "summary", model, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-4 w-4 text-warning" /> Podsumowanie alertów na żywo
        </h2>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Podsumuj
        </button>
      </div>
      <div className="mt-2">
        <ModelPicker value={model} onChange={(m) => { setModel(m); setStoredModel("summary", m); }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{alerts.length} aktywnych alertów do podsumowania.</p>
      <MarkdownBox content={out} placeholder="Kliknij „Podsumuj”, aby otrzymać zwięzły przegląd alertów." />
    </section>
  );
}

/* ---------- Report ---------- */
function ReportCard(props: { coins: any[]; sentiment: any; setups: any[]; alerts: any[] }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(() => getStoredModel("report", DEFAULT_REPORT_MODEL));

  const run = async () => {
    setLoading(true);
    setOut("");
    try {
      const payload = {
        date: new Date().toISOString(),
        sentiment: props.sentiment,
        coins: props.coins,
        setups: props.setups,
        alerts: props.alerts.slice(0, 10),
      };
      const { content, usage } = await callAI("report", payload, model);
      setOut(content);
      recordUsage({ mode: "report", model, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([out], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raport-inwestorski-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="h-4 w-4 text-bull" /> Raport inwestorski
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <ModelPicker value={model} onChange={(m) => { setModel(m); setStoredModel("report", m); }} label="Model raportu" />
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Wygeneruj raport
          </button>
          <button
            onClick={download}
            disabled={!out}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Pobierz .md
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pełny raport (streszczenie, stan rynku, setupy, alerty, ryzyka, rekomendacje) wygenerowany przez LLM.
      </p>
      <MarkdownBox content={out} placeholder="Kliknij „Wygeneruj raport”, aby przygotować dokument." minHeight={260} />
    </section>
  );
}

/* ---------- Chat with history ---------- */
function ChatSection({ contextHint }: { contextHint: unknown }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState(() => getStoredModel("chat", DEFAULT_CHAT_MODEL));
  const initial: ChatMsg[] = [
    {
      role: "assistant",
      content:
        "Cześć! Jestem **eL Jot**, asystent rynkowy. Zapytaj o sytuację na BTC/ETH, sens rotacji do altów, sygnały RSI, znaczenie alertów. Pamiętaj: to edukacja, nie porada inwestycyjna.",
    },
  ];
  const [messages, setMessages] = useState<ChatMsg[]>(initial);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation when activeId changes from sidebar.
  useEffect(() => {
    if (!activeId) return;
    const conv = getConversation(activeId);
    if (conv) {
      setMessages(conv.messages);
      setModel(conv.model);
    }
  }, [activeId]);

  const newChat = () => {
    setActiveId(null);
    setMessages(initial);
    setInput("");
  };

  const persist = (msgs: ChatMsg[]) => {
    let id = activeId;
    const now = Date.now();
    if (!id) {
      id = newConversationId();
      setActiveId(id);
    }
    const conv: Conversation = {
      id,
      title: deriveTitle(msgs),
      createdAt: now,
      updatedAt: now,
      model,
      messages: msgs,
    };
    const existing = getConversation(id);
    if (existing) conv.createdAt = existing.createdAt;
    upsertConversation(conv);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const gate = checkLimit();
    if (!gate.ok) {
      toast.error(`${gate.reason}. Spróbuj za ~${gate.retryInSec}s.`);
      return;
    }

    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const token = await getUserAccessToken();
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          mode: "chat",
          model,
          messages: [
            { role: "user", content: `Kontekst rynkowy (JSON):\n${JSON.stringify(contextHint)}` },
            ...next,
          ],
        }),
      });
      if (res.status === 429) throw new Error("Przekroczony limit — spróbuj za chwilę.");
      if (res.status === 402) throw new Error("Brak kredytów AI — doładuj w Workspace → Usage.");
      if (!res.ok || !res.body) throw new Error("Błąd asystenta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
      let started = false;
      let lastUsage: any = null;

      const upsert = (delta: string) => {
        assistantSoFar += delta;
        setMessages((prev) => {
          if (!started) {
            started = true;
            return [...prev, { role: "assistant", content: assistantSoFar }];
          }
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      };

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
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(data);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
            if (parsed.usage) lastUsage = parsed.usage;
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      const finalMsgs: ChatMsg[] = [...next, { role: "assistant", content: assistantSoFar }];
      persist(finalMsgs);
      recordUsage({
        mode: "chat",
        model,
        promptTokens: lastUsage?.prompt_tokens,
        completionTokens: lastUsage?.completion_tokens,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <ConversationsSidebar activeId={activeId} onSelect={setActiveId} onNew={newChat} />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Bot className="h-4 w-4 text-primary" /> Chat-asystent rynkowy
          </h2>
          <ModelPicker value={model} onChange={(m) => { setModel(m); setStoredModel("chat", m); }} label="Model chatu" />
        </div>

        <div
          ref={scrollRef}
          className="mt-3 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-border bg-background/40 p-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto max-w-[85%] bg-primary/15 text-foreground"
                  : "mr-auto max-w-[90%] bg-secondary text-foreground",
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="ml-4 list-disc space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="ml-4 list-decimal space-y-0.5">{children}</ol>,
                  code: ({ children }) => (
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>
                  ),
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
          ))}
          {loading && (
            <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> piszę…
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Zapytaj o rynek, alerty, setupy…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Wyślij
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared markdown box ---------- */
function MarkdownBox({
  content,
  placeholder,
  minHeight = 160,
}: {
  content: string;
  placeholder: string;
  minHeight?: number;
}) {
  return (
    <div
      className="prose prose-sm prose-invert mt-3 max-w-none overflow-y-auto rounded-lg border border-border bg-background/40 p-3 text-sm"
      style={{ minHeight, maxHeight: 480 }}
    >
      {content ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      ) : (
        <p className="text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}
