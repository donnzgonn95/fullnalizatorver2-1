import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatTelegramAlert } from "@/lib/lab/telegram-preview";
import { seoHead } from "@/lib/seo";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lab/telegram")({
  head: () => ({ ...seoHead({ title: "Telegram Alerts — Lab", description: "Konfiguracja i preview wiadomości Telegram (bez wysyłki).", path: "/lab/telegram" }) }),
  component: TelegramPage,
});

function TelegramPage() {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    void supabase.from("lab_telegram_config").select("*").maybeSingle().then(({ data }) => {
      if (data) { setToken(data.bot_token ?? ""); setChatId(data.chat_id ?? ""); setEnabled(!!data.enabled); }
    });
    void supabase.from("lab_paper_trades").select("*").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setRecent(data ?? []));
  }, []);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("lab_telegram_config").upsert({
      user_id: user.id, bot_token: token || null, chat_id: chatId || null, enabled,
    }, { onConflict: "user_id" });
    if (error) toast.error(error.message);
    else toast.success("Konfiguracja zapisana.");
  };

  const sendTest = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const tk = sess.session?.access_token;
      if (!tk) return toast.error("Zaloguj się.");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ text: "[PAPER] Test wiadomości z CryptoPuls Lab ✅" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Błąd Telegram");
      toast.success(`Wysłano (id ${json.message_id ?? "?"}).`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lab · Telegram Alerts</div>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2"><Send className="h-5 w-5" /> Konfiguracja i preview</h1>
        <p className="mt-1 text-xs text-warning">⚠ W tym etapie wiadomości NIE są wysyłane — tylko podgląd formatowania.</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Konfiguracja</h2>
        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">TELEGRAM_BOT_TOKEN</div>
          <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="123456:AAA…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">TELEGRAM_CHAT_ID</div>
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Włączone (preview only)
        </label>
        <button onClick={save} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" /> Zapisz
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Preview ostatnich wiadomości</h2>
        <ol className="space-y-3">
          {recent.map((t) => (
            <li key={t.id}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(t.created_at).toLocaleString("pl-PL")}</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-background/40 p-3 font-mono text-xs">
{formatTelegramAlert({
  instrument: t.instrument, side: t.side, entry_price: Number(t.entry_price),
  stop_loss: Number(t.stop_loss ?? 0), take_profit: Number(t.take_profit ?? 0),
  risk_reward: Number(t.risk_reward ?? 0), conviction_score: t.conviction_score,
}, t.status === "closed" ? "EXIT" : "ENTRY")}
              </pre>
            </li>
          ))}
          {recent.length === 0 && <li className="text-sm text-muted-foreground">Brak transakcji do podglądu.</li>}
        </ol>
      </section>
    </div>
  );
}
