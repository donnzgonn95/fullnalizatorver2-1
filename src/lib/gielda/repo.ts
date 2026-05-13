/**
 * Supabase-backed repo for the Giełda module.
 * All methods require an authenticated user (RLS enforces it).
 */
import { supabase } from "@/integrations/supabase/client";

// ---------- Watchlist ----------
export async function listWatchlist() {
  const { data, error } = await supabase
    .from("stock_watchlist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function addWatchlistSymbol(userId: string, symbol: string, market?: string) {
  const { error } = await supabase
    .from("stock_watchlist")
    .insert({ user_id: userId, symbol, market: market ?? null });
  if (error && !error.message.includes("duplicate")) throw error;
}
export async function removeWatchlistSymbol(symbol: string) {
  const { error } = await supabase.from("stock_watchlist").delete().eq("symbol", symbol);
  if (error) throw error;
}

// ---------- Bajtlik capital ----------
export async function getCapital() {
  const { data, error } = await supabase
    .from("bajtlik_capital")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertCapital(userId: string, total: number, cash: number, currency = "PLN") {
  const { error } = await supabase
    .from("bajtlik_capital")
    .upsert(
      { user_id: userId, total_capital: total, available_cash: cash, currency },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

// ---------- Bajtlik goals ----------
export async function listGoals() {
  const { data, error } = await supabase
    .from("bajtlik_goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function addGoal(userId: string, title: string, target: number, deadline?: string) {
  const { error } = await supabase
    .from("bajtlik_goals")
    .insert({ user_id: userId, title, target_amount: target, deadline: deadline ?? null });
  if (error) throw error;
}
export async function updateGoalAmount(id: string, current: number) {
  const { error } = await supabase
    .from("bajtlik_goals")
    .update({ current_amount: current })
    .eq("id", id);
  if (error) throw error;
}
export async function deleteGoal(id: string) {
  const { error } = await supabase.from("bajtlik_goals").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Portfolio (positions) ----------
export async function listPositions() {
  const { data, error } = await supabase
    .from("portfolio_journal")
    .select("*")
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function openPosition(
  userId: string,
  p: { symbol: string; side: "long" | "short"; quantity: number; entry_price: number; note?: string },
) {
  const { error } = await supabase.from("portfolio_journal").insert({
    user_id: userId,
    symbol: p.symbol,
    side: p.side,
    quantity: p.quantity,
    entry_price: p.entry_price,
    status: "open",
    note: p.note ?? null,
  });
  if (error) throw error;
}
export async function closePosition(id: string, exitPrice: number, qty: number, entry: number, side: string) {
  const pnl = side === "short" ? (entry - exitPrice) * qty : (exitPrice - entry) * qty;
  const { error } = await supabase
    .from("portfolio_journal")
    .update({
      status: "closed",
      exit_price: exitPrice,
      closed_at: new Date().toISOString(),
      pnl,
    })
    .eq("id", id);
  if (error) throw error;
}
export async function deletePosition(id: string) {
  const { error } = await supabase.from("portfolio_journal").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Decision logs ----------
export async function listDecisions() {
  const { data, error } = await supabase
    .from("decision_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
export async function insertDecision(
  userId: string,
  d: { source?: string; verdict: string; symbol?: string; payload?: unknown; note?: string; approved?: boolean | null },
) {
  const { data, error } = await supabase
    .from("decision_logs")
    .insert({
      user_id: userId,
      source: d.source ?? "agent",
      verdict: d.verdict,
      symbol: d.symbol ?? null,
      payload: (d.payload ?? {}) as never,
      note: d.note ?? null,
      approved: d.approved ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function setDecisionApproval(id: string, approved: boolean, note?: string) {
  const { error } = await supabase
    .from("decision_logs")
    .update({ approved, note: note ?? null })
    .eq("id", id);
  if (error) throw error;
}

// ---------- Agent notes ----------
export async function listAgentNotes() {
  const { data, error } = await supabase
    .from("agent_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
export async function addAgentNote(
  userId: string,
  n: { title?: string; content: string; tags?: string[]; linked_decision_id?: string },
) {
  const { error } = await supabase.from("agent_notes").insert({
    user_id: userId,
    title: n.title ?? null,
    content: n.content,
    tags: n.tags ?? [],
    linked_decision_id: n.linked_decision_id ?? null,
  });
  if (error) throw error;
}
