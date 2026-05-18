// Market AI edge function — analyze | summary | chat | report
// Uses Lovable AI Gateway (no API key required from user).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
  /^https?:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function pickOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin)) ? origin : "";
}

function buildCors(req: Request): Record<string, string> {
  const origin = pickOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const ALLOWED_MODELS = new Set([
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "openai/gpt-5",
  "openai/gpt-5.2",
]);

type Mode = "analyze" | "summary" | "chat" | "report" | "stocks";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  analyze:
    "Jesteś analitykiem rynku krypto piszącym po polsku. Otrzymujesz dane rynkowe (ceny, zmiany 24h/7d, RSI, siła, wolumen). Zwróć krótki raport: 1) ogólny stan rynku, 2) 3 najmocniejsze i 3 najsłabsze aktywa z uzasadnieniem, 3) ryzyka, 4) konkretne wskazówki. Używaj Markdown z nagłówkami.",
  summary:
    "Jesteś analitykiem alertów krypto. Otrzymujesz listę alertów (poziom: critical/warning/info, symbol, treść, czas). Zrób zwięzłe podsumowanie po polsku w Markdown: priorytety, powtarzające się tematy, sugerowane akcje. Maks. 200 słów.",
  chat:
    "Jesteś przyjaznym asystentem rynkowym 'eL Jot' dla aplikacji Kukomy co w rynkach piszczy. Odpowiadasz po polsku, zwięźle, konkretnie, w Markdown. Bazujesz na danych z kontekstu jeśli zostały podane. Nigdy nie udzielasz porad inwestycyjnych — informuj edukacyjnie.",
  report:
    "Jesteś analitykiem przygotowującym profesjonalny raport inwestorski (Markdown, po polsku). Struktura: # Raport inwestorski / data, ## Streszczenie zarządcze, ## Stan rynku, ## Top setupy (Long/Short), ## Najważniejsze alerty, ## Ryzyka, ## Rekomendacje taktyczne (1-2 tyg.), ## Disclaimer. Bądź konkretny, używaj liczb z dostarczonych danych.",
  stocks:
    `Jesteś doradcą analityczno-edukacyjnym dla rynków akcji USA i Europy oraz ETF-ów. Piszesz po polsku, w Markdown.
Nie składasz zleceń ani nie wykonujesz realnych transakcji. Bazujesz na dostarczonym kontekście makro/technicznym.
Każdą rekomendację formatujesz w sekcjach:
1. **Werdykt** — jedno z: czekaj | obserwuj | akumuluj | redukuj | zabezpieczaj (+ horyzont: krótki/średni/długi)
2. **Plan** — cel, ramy czasowe, instrumenty (np. SPY/QQQ/XLF/IWM/EURUSD)
3. **Scenariusze** — bazowy / byczy / niedźwiedzi z konkretnymi poziomami
4. **Ryzyka i czerwone flagi**
5. **Checklista decyzyjna** — punkty do akceptacji przez użytkownika
Treści edukacyjne, NIE stanowią porady inwestycyjnej.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth: require valid Supabase JWT ---
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: "Server auth not configured" }, 500);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { mode, payload, messages, model } = (await req.json()) as {
      mode: Mode;
      payload?: unknown;
      messages?: { role: "user" | "assistant"; content: string }[];
      model?: string;
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    if (!mode || !SYSTEM_PROMPTS[mode]) return json({ error: "Invalid mode" }, 400);

    const useModel = model && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const isChatLike = mode === "chat" || mode === "stocks";
    const system = SYSTEM_PROMPTS[mode];
    const userContent = isChatLike
      ? null
      : `Dane wejściowe (JSON):\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

    const reqMessages = isChatLike
      ? [{ role: "system", content: system }, ...(messages ?? [])]
      : [
          { role: "system", content: system },
          { role: "user", content: userContent! },
        ];

    const stream = isChatLike;
    const upstream = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useModel,
        messages: reqMessages,
        stream,
        ...(stream ? { stream_options: { include_usage: true } } : {}),
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429)
        return json({ error: "Przekroczony limit zapytań, spróbuj za chwilę." }, 429);
      if (upstream.status === 402)
        return json({ error: "Brak kredytów AI — doładuj w Settings → Workspace → Usage." }, 402);
      const t = await upstream.text();
      console.error("Gateway error:", upstream.status, t);
      return json({ error: "Błąd bramki AI" }, 500);
    }

    if (stream) {
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "x-ai-model": useModel,
        },
      });
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage ?? null;
    return json({ content, usage, model: useModel });
  } catch (e) {
    console.error("market-ai error:", e);
    return json({ error: "Wewnętrzny błąd serwera." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
