# Plan: Test pętli sygnał → zapis → uczenie + backtest

## Stan obecny (z bazy)
- `detected_setups`: **0 rekordów** — skaner nigdy nie wpisał sygnału do DB.
- `cron_run_logs`: **0** — żaden cron nie został uruchomiony przez pg_cron.
- `agent_decisions` / `agent_paper_trades`: **0** — pętla agent-simulation-tick nigdy nie wystartowała.
- `lab_backtest_runs`: **36** — backtest UI był używany ręcznie.

Wniosek: kod istnieje (`scan-setups`, `verify-setups`, `agent-simulation-tick`, `lab.backtest`), ale brak harmonogramu i danych historycznych do oceny "czy się uczy".

## Co zrobimy (bez zmian w funkcjonalności, tylko obserwacja + ręczne triggery)

### Krok 1 — Smoke test endpointów cron (ręczne wywołanie)
Wywołam HTTP-em każdy hook publiczny i zbiorę odpowiedź:
1. `POST /api/public/hooks/scan-setups` → ile świec pobrał, ile sygnałów wykrył, ile zapisał, duplikaty.
2. `POST /api/public/hooks/verify-setups` → ile pendingów sprawdził, ile hit/miss.
3. `POST /api/public/hooks/agent-simulation-tick` → czy agent przeczytał raport, podjął decyzję, otworzył paper-trade, naliczył ELJOT.

Output: tabela "endpoint | status | co zapisał | błędy".

### Krok 2 — Weryfikacja zapisu w DB
Po każdym triggerze odczyt:
- `detected_setups` (nowe wiersze, signal_strength, direction)
- `agent_decisions`, `agent_report_reads`, `agent_paper_trades` (idempotencja — drugi trigger nie powinien duplikować)
- `agent_reputation` (czy score się zmienia), `eljot_ledger` (czy reward/penalty leci)
- `cron_run_logs` (czas trwania, status)

### Krok 3 — Test "uczenia"
Sprawdzimy mechanizm korekcji:
- przed: snapshot `agent_reputation` (score, hits, misses)
- 2× tick z różnymi raportami (lub ten sam dwukrotnie — test idempotencji)
- po: diff score, czy `golden_ledger` ma nowy wpis z `entry_hash`/`prev_hash` (audit trail).

Wynik powie: czy advisory-lock + idempotencja działają, czy reputacja rośnie/spada zgodnie z `take_profit`/`stop_loss` z `agent_simulation_config`.

### Krok 4 — Backtest porównawczy
W `/lab/backtest` (UI istniejący) puścimy SMA(5/20) crossover na 4 symbolach (BTC, ETH, SOL, BNB) — zapisz wyniki, potem porównanie:
- winrate, expectancy, max DD per symbol
- zestawienie wyników z 36 istniejącymi runami w `lab_backtest_runs` (raport CSV do `/mnt/documents/backtest-compare.csv`).

### Krok 5 — Raport końcowy
Jeden dokument w `/mnt/documents/system-health-report.md`:
- Co działa (✅), co milczy (⚠️), co padło (❌)
- Czy agent się "uczy" (score delta vs trades)
- Ranking strategii backtest
- Lista konkretnych braków do naprawy w następnym sprincie

## Czego NIE robimy
- Nie zmieniamy logiki detektorów ani agent-simulation.
- Nie tworzymy migracji.
- Nie dodajemy panelu admin.
- Nie włączamy pg_cron na stałe (tylko ręczne triggery do testu).

## Detale techniczne
- Wywołania endpointów: `stack_modern--invoke-server-function` lub `curl` na `project--5eca04f2...lovable.app/api/public/hooks/*`.
- Odczyty DB: `supabase--read_query` (read-only).
- Logi: `stack_modern--server-function-logs` po każdym triggerze (filtr `scan-setups`, `agent-simulation`).
- Cały test = ~5–10 minut wykonania, zero zmian w kodzie.

## Decyzja
Zatwierdź plan — uruchomię test i wrócę z raportem. Jeśli wolisz tylko backtest (krok 4) albo tylko smoke (krok 1–2), powiedz.
