import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SetupInput = z.object({
  symbol: z.string().min(1).max(20),
  interval: z.enum(["M15", "M30", "M45", "H1", "H4"]),
  setup_type: z.enum(["elliott_wave", "bb_bounce"]),
  wave_label: z.string().max(40).nullable().optional(),
  direction: z.enum(["long", "short"]),
  entry_price: z.number().positive(),
  stop_loss: z.number().positive(),
  take_profit: z.number().positive(),
  signal_strength: z.number().min(0).max(100),
  entry_time: z.string(),
  details: z.record(z.string(), z.unknown()).default({}),
});

export const ingestSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetupInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Dedup: check existing in 30-min bucket
    const bucketStart = new Date(new Date(data.entry_time).getTime() - 30 * 60_000).toISOString();
    const { data: existing } = await supabase
      .from("detected_setups")
      .select("id")
      .eq("user_id", userId)
      .eq("symbol", data.symbol)
      .eq("interval", data.interval)
      .eq("setup_type", data.setup_type)
      .gte("entry_time", bucketStart)
      .limit(1);
    if (existing && existing.length > 0) return { ok: true, deduped: true };
    const { error } = await supabase.from("detected_setups").insert({
      user_id: userId,
      symbol: data.symbol,
      interval: data.interval,
      setup_type: data.setup_type,
      wave_label: data.wave_label ?? null,
      direction: data.direction,
      entry_price: data.entry_price,
      stop_loss: data.stop_loss,
      take_profit: data.take_profit,
      signal_strength: data.signal_strength,
      entry_time: data.entry_time,
      status: "active",
      details: data.details as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTopSetups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("detected_setups")
      .select("*")
      .in("status", ["pending", "active"])
      .order("signal_strength", { ascending: false })
      .order("detected_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const HistoryInput = z.object({
  result: z.enum(["win", "loss", "neutral"]).nullable().optional(),
  setup_type: z.enum(["elliott_wave", "bb_bounce"]).nullable().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listSetupHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HistoryInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("detected_setups").select("*").order("detected_at", { ascending: false }).limit(data.limit);
    if (data.result) q = q.eq("result", data.result);
    if (data.setup_type) q = q.eq("setup_type", data.setup_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
