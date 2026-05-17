// Server-only helper: authorize cron-style public hook endpoints.
// Accepts either:
//  1) `x-cron-secret` header matching the CRON_SECRET env var (for scheduled jobs), or
//  2) `Authorization: Bearer <jwt>` from an admin user (for manual triggers from /admin).
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function authorizeCronRequest(request: Request): Promise<{ ok: true } | { ok: false; status: number }> {
  // 1) Shared cron secret (preferred for scheduled jobs)
  const secret = process.env.CRON_SECRET;
  const presented = request.headers.get("x-cron-secret");
  if (secret && presented && timingSafeEqual(presented, secret)) {
    return { ok: true };
  }

  // 2) Admin JWT (for manual triggers from the admin panel)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) {
      try {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return { ok: false, status: 500 };
        const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await sb.auth.getClaims(token);
        const userId = data?.claims?.sub;
        if (error || !userId) return { ok: false, status: 401 };
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) return { ok: true };
        return { ok: false, status: 403 };
      } catch {
        return { ok: false, status: 401 };
      }
    }
  }

  return { ok: false, status: 401 };
}

export function unauthorizedResponse(status: number): Response {
  const msg = status === 403 ? "Forbidden" : status === 500 ? "Server misconfiguration" : "Unauthorized";
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// --- Webhook URL safety (anti-SSRF) ---
const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fe80:/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /\.local$/i,
  /\.internal$/i,
];

export function isSafeOutboundUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (!host) return false;
    for (const p of PRIVATE_HOST_PATTERNS) if (p.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}
