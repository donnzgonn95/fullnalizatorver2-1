/**
 * Złota Księga — append-only event ledger.
 * Server-only writer. Każdy wpis ma hash łańcuchowy (prev_hash → entry_hash)
 * jak w blockchainie, dzięki czemu modyfikacja historii jest wykrywalna.
 *
 * Wpisy idą TYLKO przez serwer (service role bypassuje RLS).
 * RLS dla klientów to tylko SELECT — UPDATE/DELETE są zabronione.
 */
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LedgerCategory =
  | "setup.detected"
  | "setup.verified"
  | "scan.run"
  | "agent.lifecycle"
  | "reward.eljot"
  | "system";

export interface LedgerWrite {
  category: LedgerCategory;
  source: string;
  agentSlug?: string;
  symbol?: string;
  summary: string;
  payload?: Record<string, unknown>;
  /** Opcjonalna nagroda eljot przyznana agentowi za to zdarzenie */
  reward?: { amount: number; reason: string };
}

async function getAgentId(slug?: string): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabaseAdmin
    .from("agents")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

async function getLastHash(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("golden_ledger")
    .select("entry_hash")
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.entry_hash ?? null;
}

/** Append a single event. Returns the new entry hash (or null on failure). */
export async function appendLedger(w: LedgerWrite): Promise<{ id: string; hash: string } | null> {
  try {
    const agentId = await getAgentId(w.agentSlug);
    const prev = await getLastHash();
    const createdAt = new Date().toISOString();
    const body = {
      category: w.category,
      source: w.source,
      symbol: w.symbol ?? null,
      summary: w.summary,
      payload: w.payload ?? {},
      prev_hash: prev,
      created_at: createdAt,
    };
    const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");

    const { data, error } = await supabaseAdmin
      .from("golden_ledger")
      .insert({
        category: w.category,
        source: w.source,
        agent_id: agentId,
        symbol: w.symbol ?? null,
        summary: w.summary,
        payload: (w.payload ?? {}) as never,
        prev_hash: prev,
        entry_hash: hash,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[golden_ledger] insert failed", error);
      return null;
    }

    // Update reputation (best-effort)
    if (agentId) {
      const { data: rep } = await supabaseAdmin
        .from("agent_reputation")
        .select("events_count, score")
        .eq("agent_id", agentId)
        .maybeSingle();
      await supabaseAdmin.from("agent_reputation").upsert({
        agent_id: agentId,
        events_count: (rep?.events_count ?? 0) + 1,
        score: Number(rep?.score ?? 0) + 1,
        last_active_at: createdAt,
        updated_at: createdAt,
      });
    }

    // Optional eljot reward
    if (w.reward && agentId) {
      await supabaseAdmin.from("eljot_ledger").insert({
        agent_id: agentId,
        ledger_entry_id: data.id,
        amount: w.reward.amount,
        reason: w.reward.reason,
      });
    }

    return { id: data.id, hash };
  } catch (e) {
    console.error("[golden_ledger] unexpected error", e);
    return null;
  }
}
