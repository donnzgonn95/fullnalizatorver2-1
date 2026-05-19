import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isSafeOutboundUrl } from "@/lib/cron-auth.server";

const TestWebhookInput = z.object({
  url: z.string().url().max(2048),
  payload: z.unknown().optional(),
});

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => TestWebhookInput.parse(input))
  .handler(async ({ data, context }) => {
    // Admin-only: prevents arbitrary authenticated users from using us as an SSRF proxy.
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      throw new Response("Forbidden: admin role required", { status: 403 });
    }

    if (!isSafeOutboundUrl(data.url)) {
      throw new Response("Webhook URL must be https and target a public host", { status: 400 });
    }

    const samplePayload = data.payload ?? {
      type: "setup.detected",
      source: "cryptopuls.test",
      timestamp: new Date().toISOString(),
      setup: {
        symbol: "BTC", interval: "H1", direction: "long",
        setup_type: "bb_bounce", signal_strength: 78,
        entry_price: 67500, stop_loss: 66800, take_profit: 69200,
        wave_label: null,
      },
      message: "🔔 To jest testowy webhook z CryptoPuls Admin Panel.",
    };
    const startedAt = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "CryptoPuls-Test/1.0" },
        body: JSON.stringify(samplePayload),
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timer);
      // Intentionally do NOT return response body — prevents partial exfiltration.
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs: Date.now() - startedAt,
        sentPayload: samplePayload,
      };
    } catch (e) {
      console.error("testWebhook error", e);
      return {
        ok: false,
        status: 0,
        statusText: "Network error",
        durationMs: Date.now() - startedAt,
        sentPayload: samplePayload,
      };
    }
  });

// Server-side admin role check used by the /admin route's beforeLoad guard.
export const verifyAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      throw new Response("Forbidden: admin role required", { status: 403 });
    }
    return { ok: true as const };
  });
