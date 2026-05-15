## Cel

Po kliknięciu wiersza w zakładce **Runs** (panel `/admin`) chcesz zobaczyć obok wyniku detektora także:

- **payload wejściowy świec** (ostatnie OHLCV użyte do decyzji),
- **parametry detektora** (BB period/std, progi RSI, lookback Elliotta itd.).

Przy okazji dwa szybkie fixy błędów runtime, które już są w preview.

---

## Bug fixy (po drodze)

### A. Hydration mismatch w `AiThinkingCard` (`src/routes/index.tsx` ~304–310)

`new Date()` jest wołane w trakcie renderu — SSR generuje czas serwera (np. `02:21`), klient po hydratacji wstawia czas lokalny (`00:21`) → React #418. Naprawiam: `useState<Date | null>(null)` + `useEffect(() => setNow(new Date()), [])`, do pierwszego renderu placeholder `--:--`. Logika i wygląd bez zmian.

### B. Duplikat `id="runs"` w zakładkach `CronLogsCard` (`src/routes/admin.tsx` 357–358)

Dwa `<TabBtn id="runs" />` — jeden dla skanów, drugi dla setupów (verify) — powodują kolizję stanu. Zmieniam typ stanu na `"summary" | "runs" | "checks" | "diff" | "raw"`, drugi przycisk dostaje `id="checks"`, warunek `tab === "runs" && checks.length` → `tab === "checks"`.

---

## Główna zmiana — bogatszy drawer w Runs

### 1. Backend — `src/routes/api/public/hooks/scan-setups.ts`

Rozszerzam `RunReport.candles` o `tail` (5 ostatnich OHLCV) i każdy `DetectorReport` o `params`:

```text
candles: { count, firstOpenTime, lastCloseTime, lastClose, lastVolume,
           tail: [{ openTime, open, high, low, close, volume }, ...5] }
detectors: [{
  name, outcome, reason, setup, durationMs,
  params: { ...statyczna konfiguracja detektora }
}]
```

`params` biorę z nowych eksportów w detektorach (poniżej) — pojedyncze obiekty, bez zmiany logiki sygnałów.

Limit `runs` 200 zostaje. Dodatkowy narzut: ~5 świec × ~80 B + ~150 B params ≈ 0.5 KB/run, mieści się spokojnie.

### 2. Detektory — eksport stałych

- `src/lib/feed/detectors/bb-bounce.ts`: dodaję `export const BB_PARAMS = { bbPeriod: 20, bbStdDev: 2, rsiPeriod: 14, rsiOversold: 40, rsiOverbought: 60 }` (wartości odczytane z aktualnych użyć `bollinger`/`rsi` — bez zmiany progów). Detektor dalej używa tych samych liczb, ale przez stałą.
- `src/lib/feed/detectors/elliott.ts`: `export const ELLIOTT_PARAMS = { zigzagThresholdPct: 0.5, tailPivots: 5, tpFib: 0.618, slBufferPct: 0.3 }` (też zgodnie z aktualnym kodem).

Brak zmian w logice — tylko wyciągnięcie magicznych liczb do stałej, którą można pokazać w UI i logach.

### 3. UI — `src/routes/admin.tsx` drawer Runs (linie ~424–447)

W rozwiniętym wierszu, pod nagłówkiem świec:

**(a) Tail świec** — mini-tabela monospace:

```
time     open     high     low      close    volume
13:30    67120.5  67230.0  67050.1  67200.3  412.20
13:45    ...
```

**(b) W boxie każdego detektora** dodaję pasek `params` (komponent `Mini` używany już dla `setup`):

```
params: bbPeriod=20 · bbStdDev=2 · rsi=14 · oversold=40 · overbought=60
```

**(c)** Toggle `<details>Pokaż surowy JSON</details>` na końcu drawer'a — szybki podgląd całości bez wchodzenia w zakładkę Raw.

Stare logi (bez `tail`/`params`) renderują się normalnie — pola opcjonalne.

---

## Bez zmian

- Schemat bazy, RLS, crony.
- Logika detektorów / ingestu / dedup.
- `verify-setups`, `notify-setups`.

## Pliki do edycji

- `src/routes/index.tsx` — fix hydration `AiThinkingCard`.
- `src/routes/admin.tsx` — fix duplicate tab id + rozbudowany drawer Runs.
- `src/routes/api/public/hooks/scan-setups.ts` — `candles.tail` + `detectors[].params`.
- `src/lib/feed/detectors/bb-bounce.ts` — eksport `BB_PARAMS`.
- `src/lib/feed/detectors/elliott.ts` — eksport `ELLIOTT_PARAMS`.

Brak migracji, brak nowych zależności.

## Pytanie

Domyślnie tail = **5 świec**. OK, czy wolisz 10/20? Większa liczba = lepsza reprodukcja decyzji, ale rosną logi.  
  
20