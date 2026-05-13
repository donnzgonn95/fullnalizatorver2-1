# Plan: Admin Panel, Cron Logs, Notifications & Dashboard Redesign

To olbrzymi zakres pracy — proponuję podzielić na **4 fazy**, które dostarczają osobno działające kawałki. Każdą fazę mogę zrobić w osobnej iteracji po Twojej akceptacji.

---

## FAZA 1 — Backend: Admin config + cron logs + notyfikacje

### 1.1 Nowe tabele (migracja)
- `scanner_config` — `id`, `symbols text[]`, `intervals text[]`, `enabled bool`, `updated_at`, `updated_by` (single-row config)
- `cron_run_logs` — `id`, `job_name` (scan-setups / verify-setups), `started_at`, `finished_at`, `status` (success/error/partial), `details jsonb` (detected, inserted, errors, error_messages), `duration_ms`
- `notification_settings` — `user_id`, `email_enabled bool`, `webhook_url text`, `min_signal_strength numeric`, `symbols_filter text[]`, `intervals_filter text[]`
- `notification_log` — `id`, `setup_id`, `user_id`, `channel` (email/webhook), `sent_at`, `status`, `error`

RLS:
- `scanner_config` — public read; insert/update tylko admin (`has_role(auth.uid(),'admin')`)
- `cron_run_logs` — public read; insert tylko service role
- `notification_settings` — własne wiersze
- `notification_log` — własne wiersze

### 1.2 Hooki cron (modyfikacje)
- `scan-setups.ts` — czytaj `scanner_config` (fallback do hardcoded list); na końcu zapisuj wpis w `cron_run_logs`
- `verify-setups.ts` — analogicznie loguj wykonanie
- Nowy hook `notify-setups.ts` — co 5 min: znajdź nowe `detected_setups` (user_id NULL, status pending/active, niewysłane), dla każdego usera z `notification_settings` dopasuj filtry, wyślij email (Lovable Email) + webhook (POST JSON), zapisz do `notification_log`

### 1.3 Scheduling
- pg_cron job `notify-setups-global` co 1 min

---

## FAZA 2 — UI Admin

Nowa trasa `/admin` (gated `has_role admin`):
- **Symbols & Intervals** — edytowalna lista chips z + / x, toggle enabled, zapis bez restartu
- **Cron Logs** — tabela ostatnich 100 wykonań, kolory statusów, expand → JSON details
- **Notifications config** (per user, dostępne też poza adminem) — email on/off, webhook URL, min siła sygnału, filtry symboli/interwałów

---

## FAZA 3 — Redesign Dashboardu: Orange Institutional Quant

### Design tokens (`src/styles.css`)
- Nowy primary: warm orange `oklch(0.74 0.17 55)` + glow accent
- Dark: matte deep navy/charcoal background, soft orange accent only
- Light: off-white `oklch(0.98 0.005 80)`, soft gray cards `oklch(0.96 0.005 80)`, warm orange accent, subtle shadows zamiast glow
- Smooth theme transition (`transition-colors duration-300`)
- ThemeProvider + toggle w headerze, `localStorage`

### Nowy układ `src/routes/index.tsx` — 6 kart hierarchii:
1. **TRYB RYNKU** — kompaktowa karta z reżimem
2. **BEST SETUP NOW** — największa karta (full-width hero), mini-wykres, entry/SL/TP1/TP2, RR, jakość, akcje
3. **RYZYKO** — duża karta z liczbami i progress barami (dzienna strata, limit, trade count, max risk, auto-entry toggle)
4. **AI MYŚLI** — feed live reasoning, timeline timestamps, monospace operator vibe
5. **PRZEPŁYW KAPITAŁU** — flow visualization (BTC dominance, sector rotation, animated bars)
6. **AKTYWNE SYGNAŁY** — kompaktowa lista (skrót obecnego TopSetupsWidget)

Zasady:
- Większe spacingi (`gap-6`, `p-6`)
- Mniej mikrotekstów (text-xs → text-sm/base)
- Każda karta z opisem/znaczeniem (tooltip + krótki podtytuł)
- Kolorowe akcent-ramki per funkcja (orange dla setupów, mint dla ryzyka OK, bear dla ryzyka high, cyan dla AI, neutral dla flow)
- Premium feel: `surface-glass`, soft shadows, brak gęstych tabel

### Sekcje pomocnicze
- Stary układ (`tickers`, `stats`, `alerts`, `history`, `watchlist`) → przesunięte niżej, opcjonalne, w `<details>` lub osobnej trasie `/dashboard-classic`

---

## FAZA 4 — Kolorowe ramki + opisy w całym projekcie

- Wspólny komponent `<FeatureCard variant="orange|mint|cyan|bear|warning" title icon description>` 
- Zastosowanie w sekcjach: Giełda (Taktyki, Sektory, ETF, Makro), Lab (Raporty, Backtest, Paper, Risk, Telegram), Setupy
- Każda funkcja zyskuje krótki opis "co to robi / kiedy używać"

---

## Co potrzebuję od Ciebie zanim zacznę

1. **Email do notyfikacji** — Lovable Email wymaga skonfigurowanej domeny. Mam to ustawić teraz, czy webhook wystarczy na start?
2. **Admin user** — czy masz już rolę `admin` w `user_roles`? Jeśli nie, dodam Twoje konto po Twoim potwierdzeniu (powiedz email).
3. **Czy zaczynamy od Fazy 1+2 (backend + admin), a redesign w drugiej iteracji?** Czy wolisz odwrotnie (najpierw dashboard, potem admin)?

Po Twojej decyzji ruszam.
