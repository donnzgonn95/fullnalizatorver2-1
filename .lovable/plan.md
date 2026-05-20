# Patch stabilizujący silnik decyzyjny (reżim rynku)

Cel: `useRegime()` zawsze otrzymuje niepustą tablicę monet, a wynikowy reżim modyfikuje setupy, alerty i powiadomienia w jednolity sposób. Bez zmian UI, routingu, bazy, płatności i auth.

## Zmiany w plikach

### 1. `src/routes/index.tsx`
- Dodać import: `import { coins as demoCoins } from "@/lib/demo-data";`
- Zamienić linię 43:
  ```ts
  const coinsForRegime = liveCoins && liveCoins.length ? liveCoins : demoCoins;
  ```
- Reszta strony bez zmian.

### 2. `src/routes/setupy.tsx`
- Dodać importy:
  - `adjustSetupsForRegime` z `@/lib/signals`
  - `useRegime` z `@/lib/regime-store`
  - `coins as demoCoins` z `@/lib/demo-data`
- Zamienić obecne (linia 43):
  ```ts
  const setups = coins && coins.length ? generateSetups(coins, tf) : demoSetups;
  ```
  na:
  ```ts
  const sourceCoins = coins && coins.length ? coins : demoCoins;
  const { active: regime } = useRegime(sourceCoins);
  const rawSetups = coins && coins.length ? generateSetups(coins, tf) : demoSetups;
  const { setups: adjustedSetups, note } = adjustSetupsForRegime(rawSetups, regime.id);
  ```
- Dotychczasowy filtr/sortowanie ma operować na `adjustedSetups` (zmienna lokalna `setups` zostaje wyprowadzona z `adjustedSetups`, aby nie ruszać dalszego kodu/JSX-a).
- Dodać mały tekst informacyjny nad listą setupów (jedna linia, istniejące klasy `text-xs text-muted-foreground`): `Filtr reżimu rynku: {note.tag}`. Bez nowych komponentów, bez zmian layoutu.

### 3. `src/routes/_authenticated/alerty.tsx` (faktyczna ścieżka pliku alertów)
- Dodać importy:
  - `adjustAlertsForRegime` z `@/lib/signals`
  - `useRegime` z `@/lib/regime-store`
  - `coins as demoCoins` z `@/lib/demo-data`
- Zamienić obecne (linia 29):
  ```ts
  const alerts = coins && coins.length ? generateAlerts(coins) : demoAlerts;
  ```
  na:
  ```ts
  const sourceCoins = coins && coins.length ? coins : demoCoins;
  const { active: regime } = useRegime(sourceCoins);
  const rawAlerts = coins && coins.length ? generateAlerts(coins) : demoAlerts;
  const alerts = adjustAlertsForRegime(rawAlerts, regime.id);
  ```
- UI bez zmian.

### 4. `src/lib/notifications.ts`
- Dodać importy:
  - `adjustAlertsForRegime` z `./signals`
  - `detectRegime` z `./market-regime`
- W linii ~313 zamienić:
  ```ts
  const alerts = generateAlerts(coins);
  ```
  na:
  ```ts
  const regime = detectRegime(coins);
  const alerts = adjustAlertsForRegime(generateAlerts(coins), regime.id);
  ```
- Reszta toru (dedup, quiet hours, historia, custom price triggers) bez zmian.

## Czego NIE robimy
- Brak centralnego `analyzeMarket()`.
- Brak zmian w Stripe, Supabase Auth, Premium, layoutach, routingu, schemacie DB, płatnościach, auto-tradingu.
- Brak zmian w kartach setupów ani w komponentach alertów.

## Weryfikacja
1. `bun run build` przechodzi (TS strict).
2. Strona `/` ładuje się bez `liveCoins` — `MarketRegimeBanner` pokazuje reżim z `demoCoins`, brak migotania „Neutral" przy pierwszym renderze.
3. `/setupy`: nad listą widoczny komunikat „Filtr reżimu rynku: …"; ręczne ustawienie override reżimu (np. `risk-off`/`panic`) ogranicza długie setupy; `altseason` wzmacnia alty; `btc-dominance` obniża agresję na altach.
4. `/alerty`: lista alertów reaguje na zmianę reżimu (override z bannera).
5. Powiadomienia (cron/`notifications.ts`) korzystają z `adjustAlertsForRegime` — ręczny test przez wywołanie `runNotificationsTick` w devtools / istniejący test.

## Raport końcowy (do wysłania po wykonaniu)
- Lista zmienionych plików.
- Co podłączono (reżim → setupy / alerty / notyfikacje / homepage fallback).
- Jak sprawdzić (override reżimu w bannerze + odświeżenie /setupy i /alerty).
- Status `bun run build` / testów.
