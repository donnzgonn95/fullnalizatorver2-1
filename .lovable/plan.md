
# Audyt techniczny CryptoPuls — gotowość do publicznego udostępnienia

> Tryb: **AUDYT** — bez zmian w kodzie. Poniżej kompletny raport.

## A. Streszczenie wykonawcze

**Czy aplikacja jest gotowa do publicznego udostępnienia: NIE.**

Aplikacja działa jako klient-side dashboard rynkowy (TanStack Start + Vite + React 19, Lovable Cloud / Supabase + edge function `market-ai`). **Nie ma w niej ani jednego ekranu logowania/rejestracji**, mimo że edge function AI wymaga JWT zalogowanego użytkownika oraz że dokument bezpieczeństwa (`mem://security-memory.md`) zakłada autoryzację przez `supabase.auth.getUser()`. Funkcja `/asystent` jest więc dziś niedostępna dla każdego odwiedzającego (rzuca „Not authenticated"). Jednocześnie **wszystkie „prywatne" dane (ulubione, alerty, historia czatu, ustawienia, layout pulpitu) trzymane są w `localStorage`** — nie ma żadnych tabel w Supabase i żadnych polityk RLS do audytu (potwierdzone: `information_schema.tables` w schemacie `public` jest puste).

### 5 największych ryzyk

1. **Brak warstwy auth w UI** — żadnej rejestracji, logowania, wylogowania, reset hasła; brak `_authenticated` layout route, brak guardów, brak `AuthProvider`. AI nie zadziała publicznie.
2. **Plik `.env` z kluczem `SUPABASE_PUBLISHABLE_KEY` jest w repo i nie jest w `.gitignore`** (gitignore zawiera tylko `*.local` i `.dev.vars`). Klucz publiczny — ale komitowanie `.env` to zła praktyka i utrudnia rotację.
4. **Brak polityki prywatności / regulaminu / disclaimera inwestycyjnego** — wymagane prawnie dla aplikacji okołofinansowej (PL/UE).
5. **Brak rate-limitingu po stronie backendu** dla `market-ai` (świadoma decyzja zapisana w memory, ale przed publicznym udostępnieniem oznacza ryzyko nadużycia kredytów Lovable AI po pierwszym dodaniu logowania).
6. **Brak migracji i tabel** dla danych użytkownika — jeśli aplikacja ma być wieloużytkownikowa, dane z `localStorage` nie są przenośne między urządzeniami i nie podlegają RLS.

### 5 najważniejszych poprawek (kolejność)

1. Dodać kompletne auth (email+hasło + Google), `_authenticated` layout, `/login`, `/signup`, `/reset-password`, `/auth/callback`. Owinąć trasy prywatne (asystent, alerty, historia, ustawienia, ulubione) layoutem `_authenticated`.
2. Usunąć `.env` z repo, dopisać `.env` do `.gitignore`, zostawić `.env.example`. Zrotować `LOVABLE_API_KEY` (już ustawiony w Cloud) na wszelki wypadek.
3. Dodać strony statyczne: `/polityka-prywatnosci`, `/regulamin`, `/disclaimer` + globalny banner/disclaimer w stopce i przy rejestracji (checkbox akceptacji).
4. Stworzyć migrację z tabelami `profiles`, `watchlist`, `alerts`, `alert_history`, `user_settings`, `ai_chat_history` z RLS `user_id = auth.uid()` i przemigrować dane z `localStorage` (lub świadomie zostawić local-only z ostrzeżeniem).
5. Dodać prosty rate-limiter po stronie `market-ai` (np. licznik w tabeli `ai_usage` per `user_id` + okno czasowe) — obecny limit po stronie klienta jest trywialny do obejścia.

---

## B. Tabela ryzyk

| ID | Priorytet | Obszar | Problem | Plik / lokalizacja | Skutek | Poprawka |
|---|---|---|---|---|---|---|
| R1 | KRYT. | Auth | Brak całej warstwy logowania/rejestracji | `src/routes/*` (brak `login.tsx`, `signup.tsx`, `_authenticated.tsx`) | `/asystent` nie działa, brak ochrony danych, niemożność wieloużytkownikowości | Zaimplementować pełny flow auth (Lovable Cloud) |
| R2 | KRYT. | Sekrety | `.env` zacommitowany, brak w `.gitignore` | `.env`, `.gitignore` | Zła praktyka, ryzyko commitu prawdziwych sekretów w przyszłości | Dopisać `.env`, `.env.local` do `.gitignore`, usunąć z historii |
| R3 | KRYT. | Prawne | Brak polityki prywatności, regulaminu, disclaimera | brak | Naruszenie RODO/UE, ryzyko prawne (treści okołoinwestycyjne) | Dodać 3 trasy + checkbox akceptacji + stopkę |
| R4 | WYS. | Ochrona tras | Brak guardów — wszystkie trasy publiczne | `src/routes/__root.tsx`, brak `_authenticated/` | Brak ochrony, gdy dodamy backend per user | Dodać layout `_authenticated.tsx` z `beforeLoad` + `redirect` |
| R5 | WYS. | Backend | Brak tabel i RLS dla danych użytkownika | `supabase/migrations/*` (brak) | Dane w `localStorage` — nieprzenośne, brak audytu, brak właściciela | Migracje dla `profiles/watchlist/alerts/...` + RLS |
| R6 | WYS. | Backend | Brak rate-limitingu po stronie serwera w `market-ai` | `supabase/functions/market-ai/index.ts` | Nadużycie kredytów AI po publicznym udostępnieniu | Dodać tabelę `ai_usage` + sprawdzanie limitu w handlerze |
| R7 | WYS. | Auth UX | `getUserAccessToken()` w `asystent.tsx` rzuca błąd zamiast redirect | `src/routes/asystent.tsx:51` | Użytkownik widzi „Not authenticated" zamiast ekranu logowania | Przenieść `/asystent` pod `_authenticated/asystent.tsx` |
| R8 | ŚR. | Walidacja | Brak walidacji wejścia w `market-ai` (długość `messages`, `payload`) | `supabase/functions/market-ai/index.ts:60-66` | DoS / spuchnięty prompt / koszty | Zod (lub ręczna walidacja długości) na wejściu |
| R9 | ŚR. | Stabilność | `fetch` w wielu miejscach bez `AbortController`/timeout | `src/lib/providers/*.ts` | Wiszące requesty, wycieki | Dodać `AbortSignal.timeout(15000)` |
| R10 | ŚR. | Edge | `console.error` w `market-ai` może logować dane wejściowe | `supabase/functions/market-ai/index.ts:91, 113` | Wyciek user content do logów | Logować tylko status + kod, nie body |
| R11 | ŚR. | Demo/prod | `data-source.ts` (DEMO/REAL) trzymane w `localStorage` bez wyraźnego ostrzeżenia w UI (poza `<DataBadge>`) | `src/lib/data-source.ts` | Ryzyko pomyłki użytkownika — tradowanie na demo | Banner globalny gdy DEMO |
| R12 | ŚR. | UX/SEO | `<html lang="pl">` ok, ale brak `og:image` na trasach głębokich | `src/routes/*.tsx` | Niska jakość udostępnień | Dodać `og:image` per route |
| R13 | NIS. | Wydajność | Brak `staleTime` dla niektórych `useQuery` (top-coins refetch) | `src/lib/top-coins.ts` | Nadmierne odpytywanie CoinGecko (publiczny API ma rate-limit) | `staleTime: 60_000`, `refetchOnWindowFocus:false` |
| R14 | NIS. | Kod | `e2e/` testy nie są w CI | `.github/workflows/ci.yml` | Regresje E2E | Dodać job Playwright |
| R15 | NIS. | UX | Brak strony 404 specyficznej dla aplikacji (jest generyczna w `__root`) | `src/routes/__root.tsx` | OK, ale można poprawić | Dodać przyciski do najczęstszych tras |

---

## C. Audyt tras

| Trasa | Obecny dostęp | Docelowy | Status | Ryzyko | Plik |
|---|---|---|---|---|---|
| `/` | publiczny | publiczny | OK | — | `src/routes/index.tsx` |
| `/coin/$symbol` | publiczny | publiczny | OK | — | `src/routes/coin.$symbol.tsx` |
| `/slownik` | publiczny | publiczny | OK | — | `src/routes/slownik.tsx` |
| `/sila`, `/squeeze`, `/likwidacja`, `/przeplyw`, `/sentyment`, `/setupy` | publiczny | publiczny (analizy) | OK | — | `src/routes/*.tsx` |
| `/sitemap.xml` | publiczny | publiczny | OK | — | `src/routes/sitemap[.]xml.tsx` |
| `/asystent` | publiczny w UI, ale FN wymaga JWT | **prywatny** | NIE OK | użytkownik widzi błąd zamiast loginu | `src/routes/asystent.tsx` |
| `/alerty` | publiczny (dane w localStorage) | **prywatny** docelowo | NIE OK | dane lokalne, brak synchronizacji | `src/routes/alerty.tsx` |
| `/historia-alertow` | publiczny | **prywatny** | NIE OK | jw. | `src/routes/historia-alertow.tsx` |
| `/ulubione` | publiczny | **prywatny** | NIE OK | jw. | `src/routes/ulubione.tsx` |
| `/ustawienia` | publiczny | **prywatny** | NIE OK | jw. | `src/routes/ustawienia.tsx` |
| `/login` | **brak** | publiczny | BRAK | krytyczny | do utworzenia |
| `/signup` | **brak** | publiczny | BRAK | krytyczny | do utworzenia |
| `/reset-password` | **brak** | publiczny | BRAK | wymagany | do utworzenia |
| `/polityka-prywatnosci`, `/regulamin`, `/disclaimer` | **brak** | publiczne | BRAK | prawne | do utworzenia |

---

## D. Audyt Supabase / RLS

**Stan obecny: w bazie nie istnieje żadna tabela w schemacie `public`** (potwierdzone zapytaniem do `information_schema`). Brak migracji w `supabase/migrations/`. Wszystkie dane „użytkownika" są w `localStorage` przeglądarki:

| Plik (localStorage) | Co przechowuje | Wymaga przeniesienia do DB? |
|---|---|---|
| `src/lib/watchlist.ts` | ulubione coiny | TAK — `watchlist` |
| `src/lib/alert-triggers.ts` | reguły alertów | TAK — `alerts` |
| `src/lib/notifications.ts` | historia alertów | TAK — `alert_history` |
| `src/lib/chat-history.ts` | historia rozmów AI | TAK — `ai_chat_history` (z RLS) |
| `src/lib/dashboard-layout.ts` | układ pulpitu | TAK — `user_settings` |
| `src/lib/data-source.ts` | DEMO/PROXY/REAL | per-user — `user_settings` |
| `src/lib/regime-store.ts` | override reżimu rynku | per-user — `user_settings` |
| `src/lib/coin-tv-settings.ts` | ustawienia TV per coin | per-user — `user_settings` |
| `src/lib/recent-coins.ts` | ostatnio oglądane | OK, może zostać lokalnie |
| `src/lib/ai-usage.ts` | rate-limit klienta | TAK — `ai_usage` (do server-side limitu) |

### Wzorzec polityk dla każdej nowej tabeli prywatnej

```sql
ALTER TABLE public.<tab> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select own" ON public.<tab>
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own" ON public.<tab>
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON public.<tab>
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own" ON public.<tab>
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

`profiles` wymaga osobnej tabeli ról (`user_roles` + enum `app_role` + funkcja SECURITY DEFINER `has_role`) — zgodnie z wytycznymi (nie trzymamy roli na `profiles`).

---

## E. Audyt sekretów

| Zmienna / sekret | Lokalizacja | Charakter | Ryzyko | Co zrobić |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env`, `client.ts` | publiczny (anon) | NISKIE | OK, zostawić |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env`, `client.ts`, `asystent.tsx` (header `apikey`) | publiczny (anon) | NISKIE | OK |
| `VITE_SUPABASE_PROJECT_ID` | `.env` | publiczny | NISKIE | OK |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (process.env) | `auth-middleware.ts`, `client.ts` (SSR fallback) | server | OK | OK |
| `SUPABASE_SERVICE_ROLE_KEY` | `client.server.ts` (server-only) | **server-only** | **WYS. gdyby trafił do importu klienckiego** | Audyt importów `client.server` — obecnie nigdzie nie importowany w kliencie ✓ |
| `LOVABLE_API_KEY` | `supabase/functions/market-ai/index.ts` (Deno.env) | server-only | OK | OK |
| `.env` w repo | root projektu | — | ŚR. (zła praktyka) | Dodać do `.gitignore`, usunąć z repo |
| Brak `OPENAI_API_KEY`/`BINANCE_API_KEY` w kodzie | — | — | — | Wszystko idzie przez Lovable AI Gateway / Binance public REST ✓ |

**Skanowanie:** `rg "service_role|OPENAI|BINANCE_SECRET|process\.env\.(?!SUPABASE)"` — brak prywatnych sekretów po stronie klienta.

---

## F. Audyt formularzy

| Formularz | Walidacja | Auth | Ryzyko | Poprawka |
|---|---|---|---|---|
| Logowanie | **brak ekranu** | — | krytyczne | Stworzyć z Zod |
| Rejestracja | **brak ekranu** | — | krytyczne | Stworzyć z Zod + checkbox regulamin |
| Reset hasła | **brak ekranu** | — | krytyczne | Stworzyć (`resetPasswordForEmail` + `/reset-password`) |
| Czat AI (`/asystent`) | brak limitu długości w UI | wymaga JWT | ŚR. | Limit 4000 znaków po stronie UI + walidacja w edge |
| Konfiguracja alertów | brak Zod, ale prosta walidacja inline | brak | ŚR. | Dodać schemat Zod, limit liczby alertów |
| Watchlist (dodawanie coina) | OK (CoinSearch) | brak | NIS. | OK |
| Ustawienia (TV override, layout) | minimalna | brak | NIS. | OK |
| Brak formularza kontakt | — | — | — | Opcjonalnie |

---

## G. Błędy builda

Nie uruchamiałem komend (tryb plan / harness uruchamia automatycznie). Z poprzednich iteracji:
- `bun run build` ✓ (7.58s)
- `bun run typecheck` (`tsc --noEmit`) ✓
- `vitest run` ✓ (28 testów)
- ESLint — nie zweryfikowano w tym audycie, **do uruchomienia ręcznie**.
- Playwright (`e2e/*.spec.ts`) — istnieje `playwright.config.ts`, ale **nie ma joba w CI** — do dodania.

---

## H. Lista konkretnych plików do utworzenia / poprawy

**Do utworzenia:**
- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `src/routes/reset-password.tsx`
- `src/routes/auth.callback.tsx` (dla Google OAuth)
- `src/routes/_authenticated.tsx` (layout z `beforeLoad`)
- `src/routes/_authenticated/asystent.tsx` (przeniesienie)
- `src/routes/_authenticated/alerty.tsx`
- `src/routes/_authenticated/historia-alertow.tsx`
- `src/routes/_authenticated/ulubione.tsx`
- `src/routes/_authenticated/ustawienia.tsx`
- `src/routes/polityka-prywatnosci.tsx`
- `src/routes/regulamin.tsx`
- `src/routes/disclaimer.tsx`
- `src/components/Footer.tsx` (linki do dokumentów)
- `src/components/DemoBanner.tsx`
- `supabase/migrations/<timestamp>_init_user_data.sql`
- `.gitignore` — dopisać `.env`, `.env.local`

**Do poprawy:**
- `src/routes/asystent.tsx` — przenieść do `_authenticated/`, pokazać UI logowania zamiast `throw`
- `supabase/functions/market-ai/index.ts` — walidacja długości wejścia, server-side rate-limit, mniej szczegółowe logi
- `src/lib/providers/*.ts` — dodać `AbortSignal.timeout(15000)`
- `src/lib/top-coins.ts` — `staleTime: 60_000`
- `.github/workflows/ci.yml` — job Playwright

---

## I. Plan naprawy krok po kroku

**Krok 1 — KRYTYCZNE przed publikacją (1 sesja)**
1. `.gitignore`: dodać `.env`, `.env.local`. Usunąć `.env` z repo.
2. Migracja DB: `profiles`, `user_roles` + enum `app_role`, funkcja `has_role`.
3. Auth UI: `/login`, `/signup`, `/reset-password`, `/auth/callback` + `_authenticated` layout.
4. Email auth + Google OAuth (`configure_social_auth`).
5. Przeniesienie `/asystent`, `/alerty`, `/historia-alertow`, `/ulubione`, `/ustawienia` pod `_authenticated/`.

**Krok 2 — Bezpieczeństwo i prawne**
6. Strony `/polityka-prywatnosci`, `/regulamin`, `/disclaimer` + Footer.
7. Checkbox akceptacji regulaminu w `/signup`.
8. Migracje tabel danych użytkownika + RLS (lub świadoma decyzja: zostawić localStorage z banerem „dane tylko w tej przeglądarce").
9. Server-side rate-limit `market-ai` (`ai_usage` table).
10. Walidacja Zod wejścia `market-ai`.

**Krok 3 — UX**
11. `DemoBanner` gdy `data-source = DEMO`.
12. Globalny disclaimer w stopce.
13. Loading/error states w guardach (`beforeLoad` + spinner zamiast flash).

**Krok 4 — Wydajność**
14. `staleTime` dla CoinGecko/Binance queries.
15. `AbortSignal.timeout` dla wszystkich `fetch`.
16. Lazy `top-coins` jest już wdrożone.

**Krok 5 — Finalny test**
17. CI: `typecheck`, `vitest`, `playwright`, `bun run build`.
18. Skan bezpieczeństwa Lovable.
19. Linter Supabase.
20. Manual test: rejestracja → email confirm → login → redirect → wylogowanie → próba wejścia na `/_authenticated/*` z URL.

---

## J. Gotowe rekomendacje kodu (do wdrożenia później)

**`.gitignore` (dopisać):**
```
.env
.env.local
.env.*.local
```

**`src/routes/_authenticated.tsx`:**
```tsx
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
```

**Migracja (szkielet):**
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  accepted_terms_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read"  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
```

**Server-side rate-limit (szkic):**
```ts
// w market-ai/index.ts po pobraniu userId
const { count } = await supabase
  .from("ai_usage")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId)
  .gte("created_at", new Date(Date.now() - 60_000).toISOString());
if ((count ?? 0) >= 10) return json({ error: "Limit 10/min" }, 429);
await supabase.from("ai_usage").insert({ user_id: userId, mode });
```

---

### Czego nie udało się potwierdzić

- **Konfiguracja auth providerów** (czy email auth jest włączone, czy Google OAuth ma redirect URL) — wymaga `supabase--configure_social_auth` lub ręcznej weryfikacji w Cloud → Users.
- **Czy `LOVABLE_API_KEY` nie wyciekł wcześniej** — należy zrotować profilaktycznie (`ai_gateway--rotate_lovable_api_key`).
- **Stan ESLint** (`bun run lint`) — nie uruchomione w tym audycie.
- **Pełny skan E2E** Playwright — testy istnieją, ale nie wiem, czy aktualnie zielone.

---

### Następny krok

Po Twojej akceptacji: zaczynamy od **Kroku 1 (Auth + .gitignore + migracja `profiles`/`user_roles`)** jako jednej spójnej iteracji. Inne sekcje (RLS dla danych użytkownika, dokumenty prawne, rate-limit) jako oddzielne iteracje.
