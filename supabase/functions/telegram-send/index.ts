// telegram-send — sends a message via the user's lab_telegram_config bot.
// Auth: requires valid Supabase JWT. Uses bot_token from caller's row only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendWithRetry(token: string, chatId: string, text: string, parseMode?: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let lastStatus = 0;
  let lastBody: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true }),
      });
      lastStatus = res.status;
      lastBody = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, status: res.status, body: lastBody };
      // 4xx (except 429) — bot/chat issue, no retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { ok: false, status: res.status, body: lastBody };
      }
    } catch (e) {
      lastBody = { error: String(e) };
    }
    // backoff
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  return { ok: false, status: lastStatus, body: lastBody };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supa = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uerr } = await supa.auth.getUser();
    if (uerr || !u?.user) return json({ error: "Unauthorized" }, 401);

    const { text, parse_mode } = (await req.json()) as { text: string; parse_mode?: string };
    if (!text || text.length > 4000) return json({ error: "Invalid text" }, 400);

    const { data: cfg } = await supa.from("lab_telegram_config").select("*").maybeSingle();
    if (!cfg?.enabled) return json({ error: "Telegram disabled w konfiguracji." }, 400);
    if (!cfg.bot_token || !cfg.chat_id) return json({ error: "Brak bot_token lub chat_id." }, 400);

    const result = await sendWithRetry(cfg.bot_token, cfg.chat_id, text, parse_mode);
    if (!result.ok) {
      console.error("telegram-send failed", result);
      return json({ error: "Telegram API error", status: result.status, details: result.body }, 502);
    }
    return json({ ok: true, message_id: (result.body as any)?.result?.message_id });
  } catch (e) {
    console.error("telegram-send error", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
