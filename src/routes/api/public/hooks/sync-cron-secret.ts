import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// One-shot, idempotent endpoint: syncs CRON_SECRET from runtime env into Supabase Vault
// so that public.invoke_cron_hook() can read it during pg_cron jobs.
// Safe to expose: it never returns the secret value, only writes env -> vault.
export const Route = createFileRoute("/api/public/hooks/sync-cron-secret")({
  server: {
    handlers: {
      POST: async () => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          return new Response(
            JSON.stringify({ ok: false, error: "CRON_SECRET env missing on server" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const { data, error } = await supabaseAdmin.rpc("set_vault_secret", {
          p_name: "CRON_SECRET",
          p_value: secret,
        });
        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ ok: true, action: data, secret_length: secret.length }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
