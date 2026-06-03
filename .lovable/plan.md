## Cel

Wykonać kompleksowy audyt CryptoPuls (SEO + zdrowie systemu + skuteczność detektorów) i wygenerować trzy artefakty:
1. `system-health-report.md` (nadpisać aktualnymi danymi z 03.06.2026)
2. `backtest-results.csv` (regenerować z `detected_setups` — 3 285 zweryfikowanych setupów)
3. SEO scan w tle (rezultaty w panelu SEO)

Audyt jest **read-only** (zgodnie z trybem maintenance) — żadnych zmian w kodzie, RLS, schemacie ani Stripe.

## Co zrobię — krok po kroku

### 1. SEO audit (~1 min w tle)
- Uruchomię `seo--trigger_scan` (wymaga zatwierdzenia użytkownika).
- Zaraportuję 3 istniejące findings (wszystkie `low`):
  - `http:robots` — Sitemap wskazuje na cryptopuls.lovable.app zamiast aktualnej domeny
  - `http:sitemap` — brak wpisów dla `/admin`, `/disclaimer`, `/login`, `/polityka-prywatnosci`, `/regulamin`
  - `http:llms_txt` — brak `/llms.txt`
- Findings tylko zgłoszę — **nie naprawiam** (audit mode).

### 2. System health report (Markdown → `/mnt/documents/system-health-report.md`)
Sekcje:
- **Status cron jobs** (48h):
  - scan-setups: 124 success, 287 success_no_candidates, **165 running (zombie)**
  - verify-setups: 527 success, **49 running**
  - notify-setups: 1440 success ✅
  - agent-simulation-tick: 576 success ✅
- **Zombie cron rows (cumulative)**: 486 scan-setups + 145 verify-setups stuck w `running` od 2026-05-29 — reaper z fix #2 był one-shot; **brak ponawialnego reaper'a**. Rekomendacja: pg_cron co 10 min albo rozszerzenie `cron_run_logs` UPDATE w handlerze startowym.
- **Detected setups**: 3 293 total, 3 285 zweryfikowane, 8 aktywnych, zakres 21.05.2026 → 03.06.2026
- **Backend/RLS**: bez zmian, polityki opisane w schemacie projektu
- **Edge function `market-ai`**: JWT validation OK (potwierdzone wcześniej)
- **SEO findings**: jak wyżej (3× low)
- **Lista zaleceń** w kolejności priorytetu (zombie reaper > Elliott calibration > SEO domain swap > llms.txt)

### 3. Backtest results CSV (`/mnt/documents/backtest-results.csv`)
Eksport agregatów + raw sample:
- **Agregaty (winrate per detector × interval)** — z danych live:
  - BB-bounce: M15 100% (719w/0l), M30 100% (421w/0l), M45 84% (322w/61l), H1 100% (318w/0l), H4 100% (83w/0l)
  - Elliott: M15 6.8% (20w/274l), M30 5.0% (16w/302l), M45 6.2% (21w/319l), H1 1.6% (5w/315l), H4 4.5% (4w/85l)
- **Czerwone flagi w raporcie**:
  - BB-bounce winrate 96–100% **wygląda na artefakt weryfikatora** (brak strat poza M45) — wymaga przeglądu logiki `verify-setups`
  - Elliott winrate ~5% — detektor systemowo nieprzydatny w obecnej konfiguracji ELLIOTT_PARAMS
- **Raw rows**: ostatnie 200 zweryfikowanych setupów z kolumnami `symbol,interval,setup_type,direction,signal_strength,entry_time,result,detected_at`

### 4. Raport końcowy w czacie
Krótki tekst z:
- liczbą znalezionych issues per kategoria
- linkiem do panelu SEO
- odnośnikami `<presentation-artifact>` do obu plików.

## Czego **nie** zrobię (zgodnie z audit mode)
- Nie naprawiam zombie cron rows (potrzebny pg_cron reaper — wymaga migracji)
- Nie zmieniam `robots.txt` ani `sitemap.xml`
- Nie tworzę `llms.txt`
- Nie modyfikuję detektora Elliotta ani verifier'a BB-bounce
- Nie ruszam RLS, Stripe, edge functions, UI

Wszystkie powyższe mogą zostać zaimplementowane jako **osobny zatwierdzony fix #3+** po przeglądzie raportu.

## Ryzyko
Zerowe — operacje wyłącznie odczytowe + zapis 2 plików w `/mnt/documents/`.
