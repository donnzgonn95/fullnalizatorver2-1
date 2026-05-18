# Plan naprawy bezpieczeństwa (A + B + C)

## A. P0 — Krytyczne

**1. `src/integrations/supabase/auth-middleware.ts`** — zamień `supabase.auth.getClaims(token)` na `supabase.auth.getUser()`. To wymusza weryfikację podpisu JWT po stronie Supabase (zamiast lokalnego dekodowania bez podpisu). Z `data.user` zbuduj `userId = data.user.id` i `claims = data.user` (dla kompatybilności z istniejącymi handlerami).

**2. `src/start.ts`** — dodaj import `attachSupabaseAuth` i zarejestruj go jako `functionMiddleware`:
```ts
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
```

## B. P1 — Ważne

**3. Migration — fix RLS `detected_setups` SELECT policy.** Aktualnie globalne setupy (`user_id IS NULL`) są czytelne dla anon. Zmień politykę na:
```sql
DROP POLICY IF EXISTS "<old-name>" ON public.detected_setups;
CREATE POLICY "detected_setups_select_auth_only"
ON public.detected_setups FOR SELECT
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);
```
(Najpierw odczytam dokładną nazwę istniejącej polityki przez `supabase--read_query`.)

**4. CORS allow-list dla edge functions `market-ai` i `telegram-send`.** Zamiast `Access-Control-Allow-Origin: *` — funkcja `pickOrigin(req)` zwracająca origin tylko dla allow-listy:
- `https://*.lovable.app` (preview + published)
- `http://localhost:*` (dev)
- `https://kukomy.pl` jeśli istnieje custom domain (do potwierdzenia z użytkownikiem — póki co tylko lovable.app + localhost)

Dodać `Vary: Origin` w odpowiedziach.

## C. P2 — Konfiguracja / hardening

**5. HIBP** — `supabase--configure_auth({ password_hibp_enabled: true, ...obecne wartości })`.

**6. Migration — revoke EXECUTE z anon/authenticated** dla SECURITY DEFINER funkcji nie wywoływanych z klienta:
```sql
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_admin_role_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
```
`has_role` nadal działa w wyrażeniach RLS (planner używa właściciela funkcji, nie wywołującego). `handle_new_user` i `prevent_self_admin_role_change` to triggery — `EXECUTE` przyznawany użytkownikom nie jest potrzebny.

**Pominięte:** `SUPA_extension_in_public` — niskie ryzyko, ruszanie schematu rozszerzenia ryzykuje regresjami. Do osobnej iteracji.

## Po wdrożeniu

- `security--run_security_scan` ponownie.
- Oznaczenie naprawionych findings przez `manage_security_finding`.
- Update `mem://security-memory.md` o nowych regułach (JWT przez `getUser()`, CORS allow-list, brak `EXECUTE` na SECURITY DEFINER dla anon/authenticated).

## Pytanie do ciebie

Czy masz **custom domain** (np. `kukomy.pl`), którą mam dopisać do CORS allow-listy w `market-ai` i `telegram-send`? Jeśli nie — zostawiam tylko `*.lovable.app` + `localhost`.
