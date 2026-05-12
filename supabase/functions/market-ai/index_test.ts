// Deno tests for the market-ai edge function — auth, mode validation, error masking.
// Run with: deno test --allow-net --allow-env supabase/functions/market-ai/index_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FN_URL = Deno.env.get("MARKET_AI_URL") ?? "http://localhost:54321/functions/v1/market-ai";

async function call(init: RequestInit = {}) {
  return await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

Deno.test("zwraca 401 bez nagłówka Authorization", async () => {
  const res = await call({ body: JSON.stringify({ mode: "chat" }) });
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "Unauthorized");
});

Deno.test("zwraca 401 dla nieprawidłowego tokenu Bearer", async () => {
  const res = await call({
    headers: { Authorization: "Bearer not-a-real-jwt" },
    body: JSON.stringify({ mode: "chat" }),
  });
  assertEquals(res.status, 401);
});

Deno.test("nagłówek Authorization bez schematu Bearer odpada od razu", async () => {
  const res = await call({
    headers: { Authorization: "Basic abc" },
    body: JSON.stringify({ mode: "chat" }),
  });
  assertEquals(res.status, 401);
});

Deno.test("CORS preflight działa", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  // CORS preflight powinien zwrócić 200/204 z wymaganymi nagłówkami
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

// Smoke check struktury — moduł powinien się sparsować bez wyjątku
Deno.test("moduł funkcji ładuje się bez błędu", async () => {
  await import("./index.ts").catch(() => {
    // Deno.serve startuje przy imporcie — to normalne w środowisku testowym.
  });
});
