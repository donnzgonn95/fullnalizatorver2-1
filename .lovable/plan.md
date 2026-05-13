## Cel

Dziś `cron_run_logs.details` zawiera tylko liczniki (`detected`, `inserted`, `errors`, lista `errorMessages`). Po kliknięciu wpisu w `/admin` widać tylko surowy JSON z agregatami — nie wiadomo **co** detektor dostał na wejściu i **dlaczego** wypluł (lub nie wypluł) setup.

Rozbudowa ma dać pełną „ścieżkę audytu" dla każdego ręcznego (i automatycznego) skanu:
- ile świec wczytano, z jakiego zakresu czasowego, ostatni close
- co każdy detektor zwrócił (setup albo powód odrzucenia)
- czy setup był nowy, czy duplikat (deduplikacja po 30 min)
- diff względem poprzedniego runu tej samej pary symbol/interwał

Bez zmian w logice detektorów ani w cronach automatycznych — tylko więcej telemetrii + nowy widok w `/admin`.

---

## Zakres

### 1. Backend — bogatszy payload w `cron_run_logs.details`

**Plik:** `src/routes/api/public/hooks/scan-setups.ts`

Dorzucam wewnątrz pętli `for symbol → for interval` zbieranie obiektu:

```text
runs: [
  {
    symbol, interval,
    candles: { count, firstOpenTime, lastCloseTime, lastClose, lastVolume },
    detectors: [
      {
        name: "bb-bounce" | "elliott",
        outcome: "setup" | "no-signal" | "duplicate" | "error",
        reason?: string,           // np. "RSI 62 > próg 30", "brak fali 5"
        setup?: { direction, entry_price, stop_loss, take_profit, signal_strength, wave_label },
        durationMs: number,
      }
    ],
  }
]
```

Detektory (`detectBBBounce`, `detectElliott`) zwracają obecnie `DetectedSetup | null` — dodaję cienki wrapper w hooku, który łapie `null` i zapisuje `outcome: "no-signal"` z krótkim opisem powodu pobranym z ostatniej świecy (BB%, RSI, fale). To NIE wymaga zmian w samych detektorach.

Limity rozmiaru: górny cap 200 wpisów `runs` w jednym logu (więcej i tak nie zmieści się sensownie w UI), świece nie są zapisywane (tylko meta), `errorMessages` zostaje.

### 2. Backend — diff vs poprzedni run

W tym samym hooku, **przed** insertem nowego loga, czytam ostatni `cron_run_logs` o `job_name='scan-setups'` i `status IN ('success','partial')`. Dla każdego klucza `symbol/interval` porównuję `lastClose` i listę wykrytych typów setupów. Wynik trafia do `details.diff`:

```text
diff: {
  vsRunId: "...",
  changed: [
    { symbol, interval, lastCloseDelta: +0.42, newSetups: ["bb-bounce-long"], goneSetups: [] }
  ]
}
```

To samo dla `verify-setups` (diff: które setupy zmieniły status `active → win/loss/expired`).

### 3. UI — rozbudowany `CronLogsCard`

**Plik:** `src/routes/admin.tsx` (sekcja `CronLogsCard`)

Po rozwinięciu wiersza, zamiast surowego `<pre>{JSON.stringify(details)}</pre>`, renderuję trzy zakładki (lokalny `useState`, bez Radix Tabs — proste przyciski):

1. **Podsumowanie** — kafelki: detected, inserted, errors, czas trwania, użyta lista symboli/interwałów (z `cfg`).
2. **Runs** — tabela: symbol · interwał · #świec · lastClose · wynik każdego detektora (kolorowy chip: zielony=setup, szary=no-signal, żółty=duplicate, czerwony=error). Klik wiersza → drawer z pełnym `setup` JSON i `reason`.
3. **Diff** — lista zmian względem poprzedniego runu, z kolorowymi delta (↑/↓ ceny, „NOWY: bb-bounce-long").

Na poziomie samej listy logów dorzucam mini-wskaźnik nad numerem `det:X ins:Y` (np. „+2 NEW" jeśli `diff.changed` zawiera nowe setupy) — od razu widać który skan coś znalazł.

### 4. Bez zmian

- Schemat tabeli `cron_run_logs` — `details jsonb` już to udźwignie.
- Cron pg_cron i jego harmonogram.
- Detektory, deduplikacja, RLS.
- `verify-setups` i `notify-setups` dostają tylko bogatsze `details` w analogicznym stylu (per-setup `pnl_pct`, dlaczego status się zmienił).

---

## Pliki do edycji

- `src/routes/api/public/hooks/scan-setups.ts` — bogatszy `details`, diff, wrapper na detektory.
- `src/routes/api/public/hooks/verify-setups.ts` — bogatszy `details` per setup + diff statusów.
- `src/routes/admin.tsx` — `CronLogsCard` z 3 zakładkami, kolorowe chipy outcome'ów, drawer JSON.

Brak migracji bazy. Brak nowych zależności.

---

## Pytanie pomocnicze

Czy chcesz też zapisywać **snapshot ostatnich N świec (np. ostatnie 5 OHLCV)** na detektor — żeby móc po fakcie ręcznie odtworzyć decyzję? To zwiększy wagę logów (~3–5 KB/run zamiast ~500 B), ale daje pełną reprodukcję bez ponownego strzału w Binance. Domyślnie **NIE robię** tego — tylko meta świec.