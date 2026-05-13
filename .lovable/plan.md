## Cel
Dodać drugi moduł aplikacji „Globalny Portal Giełdowy" obok istniejącego Analizatora Krypto. Zachować obecny styl (ciemny institutional dashboard) i nie usuwać żadnej obecnej funkcjonalności.

## Architektura tras (TanStack Start)

```
src/routes/
  index.tsx                          (modyfikacja — dodać Mode Switcher na górze)
  gielda.tsx                         (layout + Outlet, nawigacja boczna sekcji)
  gielda.index.tsx                   (Overview rynku + sekcja „Co robić?")
  gielda.usa.tsx
  gielda.europa.tsx
  gielda.etf.tsx
  gielda.sektory.tsx
  gielda.makro.tsx
  gielda.watchlista.tsx
  gielda.taktyki.tsx
  _authenticated/
    gielda.bajtlik.tsx               (portfel — wymaga loginu)
    gielda.dziennik.tsx              (decision log — wymaga loginu)
    gielda.agent.tsx                 (Agent-Analityk — wymaga loginu, używa market-ai)
```

Publiczne sekcje (overview, USA, Europa, ETF, sektory, makro, taktyki, watchlista) — bez auth, dane mockowane.
Prywatne (bajtlik, dziennik, agent) — pod `_authenticated/`.

## Komponenty

```
src/components/gielda/
  ModeSwitcher.tsx        — wybór Krypto vs Giełda na home
  GieldaSidebar.tsx       — nawigacja sekcji w layout `gielda.tsx`
  CoRobicCard.tsx         — decyzja + conviction + risk + horyzont + uzasadnienie
  IndexTile.tsx           — kafelek indeksu (S&P, Nasdaq, DAX, WIG…)
  EtfRow.tsx              — wiersz ETF w tabeli
  SectorHeatmap.tsx       — siatka sektorów z kolorem zwrotu
  MacroCard.tsx           — kafelek makro (CPI, stopy, bezrobocie…)
  StockWatchlist.tsx      — watchlista giełdowa
  TacticCard.tsx          — pojedyncza taktyka (wejście/wyjście/ryzyko)
  BajtlikSummary.tsx      — kapitał, zyski, straty, cel, progres bar
  DecisionLogEntry.tsx
  AgentChat.tsx           — wariant `asystent` z systemowym promptem giełdowym
```

## Mock data + typy

`src/lib/gielda/`
- `types.ts` — `StockSymbol`, `Etf`, `Sector`, `MacroIndicator`, `Tactic`, `Decision`, `BajtlikGoal`, `PortfolioPosition`, `AgentNote`, `DecisionVerdict = 'czekaj'|'obserwuj'|'akumuluj'|'redukuj'|'zabezpieczaj'`.
- `mock-indices.ts` — S&P 500, Nasdaq 100, Dow, Russell 2000, DAX, CAC 40, FTSE 100, WIG20.
- `mock-etfs.ts` — SPY, QQQ, IWM, VTI, VOO, EZU, EWG, EWU, GLD, TLT, HYG, ARKK.
- `mock-sectors.ts` — 11 sektorów S&P (XLK, XLF, XLE, XLV, XLI, XLY, XLP, XLU, XLRE, XLB, XLC).
- `mock-macro.ts` — CPI YoY, Fed Funds, ECB rate, US 10Y, EUR/USD, DXY, VIX, bezrobocie.
- `mock-tactics.ts` — 5–6 strategii (Trend Following, Mean Reversion, Sector Rotation, Dividend Growth, ETF DCA, Defensive Hedge).
- `mock-bajtlik.ts` — przykładowy stan portfela, cele, historia decyzji.
- `decision-engine.ts` — funkcja `computeVerdict(context)` zwracająca `{verdict, conviction, risk, horizon, rationale, supports[], warnings[]}` na podstawie mockowanych warunków (np. VIX > 25 → ostrożnie).

## Przyszła integracja z Supabase

Tworzymy tylko strukturę po stronie klienta — żadnych migracji jeszcze. W `src/lib/gielda/storage.ts` jeden interfejs:

```ts
export interface GieldaStorage {
  stock_watchlist: …
  investment_tactics: …
  portfolio_journal: …
  decision_logs: …
  bajtlik_goals: …
  agent_notes: …
}
```

Implementacja `localStorageAdapter` teraz; placeholder `supabaseAdapter` jako TODO. Nazwy pól dopasowane 1:1 do przyszłych tabel.

## Agent-Analityk

`gielda.agent.tsx` używa istniejącej edge function `market-ai` z dodatkowym `mode: 'stocks'` w request body. Edge function dostaje rozszerzenie systemowego promptu: doradca analityczny, NIE wykonuje transakcji, zwraca plan/scenariusze/ryzyka/checklistę. Każda rekomendacja ma przycisk „Zatwierdź" / „Odrzuć" zapisywany w decision_logs (localStorage na razie).

## Styl

Reużyjemy istniejących tokenów: `surface-glass`, `bull/bear/warning`, `ChangePill`, `Card variant="premium"`, układ z `src/routes/index.tsx`. Brak nowych palet.

## Mode Switcher

Na `/` na samej górze dwa duże kafelki (premium card, ikony):
- „Analizator Krypto" → zostaje na `/`
- „Globalny Portal Giełdowy" → `/gielda`
Zapamiętany ostatni wybór w localStorage; przy powrocie na `/` ostatni wybór jest zaznaczony.

## Plik SEO/sitemap
- `seoHead` dla każdej nowej trasy.
- Dodać 11 nowych ścieżek do `sitemap[.]xml.tsx`.

## Czego NIE robimy w tym etapie
- Żadnych migracji DB.
- Żadnych płatnych API.
- Żadnego refaktoru istniejącego krypto.
- Brak realnych transakcji w agent module.

## Test plan
- `bun run typecheck`
- ręczna nawigacja: `/` → switcher → `/gielda` → wszystkie sekcje
- prywatne trasy bez logowania → redirect `/login`
