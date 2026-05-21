import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authorizeCronRequest, unauthorizedResponse } from "@/lib/cron-auth.server";


// One-shot, idempotent endpoint: syncs CRON_SECRET from runtime env into Supabase Vault
// so that public.invoke_cron_hook() can read it during pg_cron jobs.
// Safe to expose: it never returns the secret value, only writes env -> vault.
export const Route = createFileRoute("/api/public/hooks/sync-cron-secret")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeCronRequest(request);
        if (!auth.ok) return unauthorizedResponse(auth.status);
        const secret = process.env.CRON_SECRET;

        if (!secret) {
          return new Response(
            JSON.stringify({ ok: false, error: "CRON_SECRET env missing on server" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const { data, error } = await (supabaseAdmin.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>)(
          "set_vault_secret",
          { p_name: "CRON_SECRET", p_value: secret },
        );
        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ ok: true, action: data }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
