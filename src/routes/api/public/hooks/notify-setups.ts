import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authorizeCronRequest, isSafeOutboundUrl, unauthorizedResponse } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/notify-setups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeCronRequest(request);
        if (!auth.ok) return unauthorizedResponse(auth.status);
        const startedAt = new Date();
        const { data: logRow } = await supabaseAdmin.from("cron_run_logs").insert({
          job_name: "notify-setups", status: "running",
        }).select("id").single();
        const logId = logRow?.id as string | undefined;

        // Find recent global setups (last 15 min)
        const since = new Date(Date.now() - 15 * 60_000).toISOString();
        const { data: setups } = await supabaseAdmin
          .from("detected_setups").select("*")
          .is("user_id", null).in("status", ["pending", "active"])
          .gte("detected_at", since).limit(200);

        const { data: subs } = await supabaseAdmin
          .from("notification_settings").select("*");

        let sent = 0, skipped = 0, errors = 0;
        const errorMessages: string[] = [];

        for (const setup of setups ?? []) {
          for (const sub of subs ?? []) {
            const minStrength = Number(sub.min_signal_strength ?? 0);
            if (Number(setup.signal_strength) < minStrength) { skipped += 1; continue; }
            const symFilter = (sub.symbols_filter as string[]) ?? [];
            if (symFilter.length && !symFilter.includes(setup.symbol)) { skipped += 1; continue; }
            const itvFilter = (sub.intervals_filter as string[]) ?? [];
            if (itvFilter.length && !itvFilter.includes(setup.interval)) { skipped += 1; continue; }
            const tFilter = (sub.setup_types_filter as string[]) ?? [];
            if (tFilter.length && !tFilter.includes(setup.setup_type)) { skipped += 1; continue; }

            // Webhook
            if (sub.webhook_url) {
              if (!isSafeOutboundUrl(sub.webhook_url)) {
                await supabaseAdmin.from("notification_log").insert({
                  setup_id: setup.id, user_id: sub.user_id, channel: "webhook",
                  status: "failed", error: "Blocked: webhook URL must be https and public",
                });
                errors += 1;
                errorMessages.push(`webhook[${errors}]: blocked unsafe url`);
                console.warn(`notify-setups: blocked unsafe webhook url for user ${sub.user_id}`);
                continue;
              }
              const { data: existing } = await supabaseAdmin
                .from("notification_log").select("id")
                .eq("setup_id", setup.id).eq("user_id", sub.user_id).eq("channel", "webhook").maybeSingle();
              if (!existing) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8_000);
                try {
                  const res = await fetch(sub.webhook_url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event: "new_setup", setup }),
                    redirect: "manual",
                    signal: controller.signal,
                  });
                  const ok2xx = res.status >= 200 && res.status < 300;
                  await supabaseAdmin.from("notification_log").insert({
                    setup_id: setup.id, user_id: sub.user_id, channel: "webhook",
                    status: ok2xx ? "sent" : "failed",
                    error: ok2xx ? null : `HTTP ${res.status}`,
                  });
                  if (ok2xx) sent += 1; else errors += 1;
                } catch (e) {
                  await supabaseAdmin.from("notification_log").insert({
                    setup_id: setup.id, user_id: sub.user_id, channel: "webhook",
                    status: "failed", error: (e as Error).message,
                  });
                  errors += 1;
                  console.error(`notify-setups: webhook failed for user ${sub.user_id}`, e);
                  errorMessages.push(`webhook[${errors}]: ${(e as Error).message}`);
                } finally {
                  clearTimeout(timer);
                }

              }
            }
          }
        }

        const finishedAt = new Date();
        if (logId) await supabaseAdmin.from("cron_run_logs").update({
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          status: errors > 0 ? "partial" : "success",
          details: { setups: setups?.length ?? 0, sent, skipped, errors, errorMessages: errorMessages.slice(0, 10) },
        }).eq("id", logId);

        return new Response(JSON.stringify({ ok: true, sent, skipped, errors }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
