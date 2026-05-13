# Plan: Migracja Giełdy do Supabase + Agent Trading Lab

Plan obejmuje 3 części wykonywane sekwencyjnie. Wszystko działa w trybie PAPER TRADING — brak realnej egzekucji zleceń, brak integracji brokerskiej.

---

## CZĘŚĆ A — Migracja modułu Giełda do Supabase (per-user, RLS)

### A1. Nowe tabele (migracja SQL)

Wszystkie tabele z `user_id uuid not null`, RLS włączone, polityki: SELECT/INSERT/UPDATE/DELETE tylko `auth.uid() = user_id`.

- `stock_watchlist` — `symbol text`, `market text` (USA/EU/ETF), `note text`, `created_at`
- `investment_tactics` — `name text`, `description text`, `entry_rules jsonb`, `exit_rules jsonb`, `risk_profile text`, `is_active boolean`
- `portfolio_journal` — `symbol text`, `side text` (long/short), `quantity numeric`, `entry_price numeric`, `exit_price numeric nullable`, `opened_at timestamptz`, `closed_at timestamptz nullable`, `pnl numeric nullable`, `status text` (open/closed)
- `decision_logs` — `source text` (agent/user/lab), `verdict text` (czekaj/obserwuj/akumuluj/redukuj/zabezpieczaj/long/short/skip), `symbol text nullable`, `payload jsonb` (cały plan/scenariusze/checklist), `approved boolean`, `note text nullable`, `created_at`
- `bajtlik_goals` — `title text`, `target_amount numeric`, `current_amount numeric`, `currency text default 'PLN'`, `deadline date nullable`, `is_active boolean default true`
- `bajtlik_capital` — pojedynczy wiersz per user: `total_capital numeric`, `available_cash numeric`, `currency text`, `updated_at` (UNIQUE user_id)
- `agent_notes` — `title text nullable`, `content text`, `tags text[]`, `linked_decision_id uuid nullable references decision_logs`

### A2. Refaktor kodu Giełda

- `src/lib/gielda/storage.ts` → przepisany na adapter Supabase (zachować podpis API). Dla niezalogowanych: zwracać puste/dane mock read-only.
- `src/routes/gielda.watchlista.tsx` — CRUD na `stock_watchlist` (dodaj/usuń symbol).
- `src/routes/gielda.taktyki.tsx` — czytaj `investment_tactics`, fallback do mocków jeśli pusto. Brak edycji w tym etapie (read-only z możliwością „zapisz do moich taktyk").
- `src/routes/gielda.bajtlik.tsx` — **NOWA EDYCJA**:
  - panel „Kapitał": input `total_capital` + `available_cash`, zapis do `bajtlik_capital`.
  - panel „Cele": lista `bajtlik_goals` z dodawaniem (title, target, deadline) i aktualizacją `current_amount`.
  - panel „Pozycje": formularz dodania pozycji (`symbol`, `side`, `qty`, `entry_price`), lista pozycji z akcją „Zamknij" (ustawia `exit_price`, `closed_at`, oblicza `pnl`).
  - usunięcie zależności od `mock-bajtlik.ts` dla zalogowanych.
- `src/routes/gielda.dziennik.tsx` — czytaj `decision_logs` (filtr po user_id przez RLS), pokazuj approved/rejected/pending.

### A3. Agent-Analityk: zatwierdzanie/odrzucanie

- `src/routes/gielda.agent.tsx`:
  - po otrzymaniu odpowiedzi z `market-ai` zapisz wpis do `decision_logs` ze statusem `approved=null` (pending).
  - dodaj przyciski „Zatwierdź" / „Odrzuć" → UPDATE `approved=true/false` + opcjonalne `note`.
  - przycisk „Zapisz jako notatkę" → INSERT do `agent_notes` z `linked_decision_id`.
  - wymagaj zalogowania (już chronione przez `RequireAuth`).

### A4. Migracja localStorage → Supabase

Jednorazowy hook przy logowaniu: jeśli istnieją klucze `gielda:*` w localStorage → upsert do odpowiednich tabel, potem czyść.

---

## CZĘŚĆ B — Agent Trading Lab (nowy moduł, mock data + Supabase dla dziennika)

### B1. Routing i nawigacja

Trasy pod istniejącym layoutem `/gielda` (rozszerzenie sidebara) lub nowy top-level `/lab`. **Wybór: `/lab` jako osobny moduł**, dostępny z `ModeSwitcher` jako trzeci tryb „Agent Trading Lab".

- `src/routes/lab.tsx` — layout + sidebar + status bar (Agent Active, Paper Mode, Risk Level, Trades Today, Daily PnL, Telegram Status).
- `src/routes/lab.index.tsx` — dashboard overview.
- `src/routes/lab.backtest.tsx` — Backtest 3M
- `src/routes/lab.paper.tsx` — Paper Trading
- `src/routes/lab.scanner.tsx` — Setup Scanner
- `src/routes/lab.risk.tsx` — Risk Engine (konfiguracja limitów)
- `src/routes/lab.journal.tsx` — Trade Journal
- `src/routes/lab.telegram.tsx` — Telegram Alerts (preview, bez realnego wysyłania)
- `src/routes/lab.morning.tsx` — Morning Report
- `src/routes/lab.evening.tsx` — Evening Report
- `src/routes/lab.ledger.tsx` — Bajtlik Ledger

Wszystkie pod `RequireAuth`. Wszędzie widoczny baner „PAPER TRADING — brak realnej egzekucji".

### B2. Tabele Supabase (część B)

- `lab_paper_trades` — `instrument text`, `side text`, `entry_price numeric`, `stop_loss numeric`, `take_profit numeric`, `quantity numeric`, `risk_reward numeric`, `conviction_score int`, `risk_score int`, `rationale text`, `status text` (planned/opened/monitoring/closed/invalidated), `opened_at`, `closed_at nullable`, `result_pnl numeric nullable`, `tags text[]`
- `lab_risk_settings` — pojedynczy wiersz per user: `max_trades_per_day int default 6`, `max_daily_loss numeric`, `max_risk_per_trade numeric`, `cooldown_minutes int`, `kill_switch boolean`, `block_high_macro_risk boolean`, `block_correlated boolean`
- `lab_telegram_config` — `bot_token text` (zaszyfrowany na poziomie aplikacji — przechowywany jako tekst, RLS chroni), `chat_id text`, `enabled boolean default false`. **Uwaga**: tu lepiej trzymać te wartości w secrets per-user, ale bez infrastruktury per-user secrets — zostawiamy w tabeli z RLS i ostrzeżeniem.
- `lab_reports` — `report_type text` (morning/evening), `report_date date`, `content jsonb`, UNIQUE(user_id, report_type, report_date)
- `lab_backtest_runs` — `strategy_name text`, `params jsonb`, `started_at`, `finished_at`, `summary jsonb` (winrate, expectancy, max DD)
- `lab_backtest_trades` — `run_id uuid references lab_backtest_runs`, wszystkie pola jak `lab_paper_trades` + brak statusu (zawsze closed)

Wszystko z RLS per `user_id`.

### B3. Logika

- `src/lib/lab/mock-historical.ts` — generator danych historycznych 3M (mock OHLC).
- `src/lib/lab/strategies.ts` — przykładowa strategia (np. SMA crossover) zwracająca trades.
- `src/lib/lab/risk-engine.ts` — funkcja `canOpenTrade(settings, todayTrades, dailyPnl, macroRisk)` → `{ allowed, reason }`.
- `src/lib/lab/telegram-preview.ts` — formatter wiadomości („🟢 LONG SPY @ 512.30 | SL 510 | TP 518 | R:R 2.6 | conv 7/10").
- `src/lib/lab/reports.ts` — generator mock raportów morning/evening na bazie ostatnich N dni.

### B4. UI

- Dark institutional (reuse istniejących tokenów: `surface-glass`, `bull/bear/warning`, `Card`, `ChangePill`).
- Status bar w layoucie `lab.tsx` — sticky top, kolorowane chipy.
- Backtest: tabela trade-by-trade + summary card (winrate, expectancy, max DD, equity curve placeholder).
- Paper Trading: formularz „Nowa decyzja" + lista pozycji z akcjami status (open/monitor/close/invalidate).
- Risk Engine: formularz konfiguracji + wskaźnik aktualnego ryzyka.
- Trade Journal: lista wszystkich `lab_paper_trades` z filtrami.
- Telegram: formularz konfiguracji + preview ostatnich N wiadomości (renderowane lokalnie, bez wysyłki).
- Morning/Evening Report: wczytanie z `lab_reports` lub generacja on-demand z mocków.
- Ledger: agregacje PnL (dzień/tydzień/miesiąc), zrealizowany vs niezrealizowany, progres do `bajtlik_goals`.

### B5. Bezpieczeństwo

- Banner „⚠ PAPER TRADING MODE — żadne zlecenia nie są wysyłane do brokera" we wszystkich routach `/lab/*`.
- Brak integracji brokerskiej.
- Telegram tylko preview — żadne wywołania API.
- Wszystkie tabele RLS per-user.

---

## CZĘŚĆ C — Walidacja

- `bun run typecheck`
- przegląd `supabase--linter`
- ręczna weryfikacja: niezalogowany → redirect do /login, zalogowany → dane z bazy.

---

## Co NIE robimy

- Brak realnej integracji z brokerem (Alpaca/IBKR/etc).
- Brak realnej wysyłki Telegram (tylko preview formatowania).
- Brak płatnych API giełdowych (mock OHLC).
- Brak cron jobs dla raportów (raporty generowane on-demand z mock data).
- Nie usuwamy istniejącego analizatora krypto ani modułu giełda (tylko rozszerzamy).

---

## Kolejność wykonania

1. Migracja SQL (część A + B w jednej migracji)
2. Refaktor `gielda/storage.ts` na Supabase
3. Edycja Bajtlika (kapitał/cele/pozycje)
4. Agent-Analityk: approve/reject + notatki
5. Layout `/lab` + status bar + ModeSwitcher (3 tryby)
6. Wszystkie routes `/lab/*` z mockami i zapisem do bazy
7. Typecheck + linter

Czas: pojedynczy duży etap, ~25-30 plików nowych/edytowanych.
