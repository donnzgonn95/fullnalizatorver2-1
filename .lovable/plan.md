## Cel

Zanim ruszamy z paper tradingiem, kontami i mobile, dopracowujemy to, co już mamy: spójny design system, lepszy UX na kluczowych ścieżkach i porządne SEO na wszystkich stronach. Efekt: aplikacja gotowa do pokazania użytkownikom testowym.

---

## 1. Design system — spójność wizualna

**Audyt tokenów `src/styles.css`**
- Sprawdzić wszystkie zmienne `oklch` (background, foreground, primary, bull, bear, warning, muted, accent) pod kątem kontrastu WCAG AA w trybie ciemnym.
- Dodać brakujące semantyczne tokeny, jeśli komponenty hardkodują kolory (`text-green-500`, `bg-red-900` itp.).

**Refaktor komponentów łamiących system**
- Przeskanować `src/components/` i `src/routes/` w poszukiwaniu klas typu `text-white`, `bg-black`, `text-green-*`, `text-red-*` → zamienić na `text-foreground`, `text-bull`, `text-bear`.
- Ujednolicić stany hover/focus/active na przyciskach i kartach (jeden wzorzec ringu i transition).

**Hierarchia typograficzna**
- Skala nagłówków (h1/h2/h3) zdefiniowana globalnie w `styles.css` zamiast ad-hoc na stronach.
- Jeden font dla nagłówków + jeden dla liczb (`.num`) — sprawdzić, czy `.num` jest spójnie używane wszędzie, gdzie pojawiają się ceny/procenty.

**Mikro-animacje (framer-motion)**
- Dodać delikatne `fade+slide` na wejście kart (staggered) na `/` i `/coin/$symbol`.
- Animowany akcent przy zmianie ceny live (flash zielony/czerwony na 200ms).

---

## 2. UX — kluczowe ścieżki

**Strona główna (`/`)**
- Sekcja „Co robić teraz?" — dodać widoczny CTA „Otwórz top setup" (deeplink do najmocniejszego coina).
- Watchlista: pusty stan z onboardingiem („Dodaj pierwszy coin →") zamiast pustej karty.
- Pasek statusu połączenia (Binance live / demo) bardziej widoczny jako pill w headerze, nie tylko ikona.

**Strona coina (`/coin/$symbol`)**
- Sticky nagłówek z ceną, zmianą 24h i przyciskiem „Dodaj do ulubionych" — żeby były widoczne podczas scrolla.
- Przełączniki interwałów (1D/7D/30D/90D/1Y) jako jeden segmented control zamiast osobnych przycisków.
- Panel wskaźników — collapsible „Wskaźniki techniczne" (SMA/EMA/RSI) zwinięty domyślnie na mobile.
- Loading skeletony zamiast spinnerów na wykresie.

**Wyszukiwarka coinów**
- Skrót klawiszowy `Cmd/Ctrl+K` otwierający wyszukiwarkę globalnie (Command Menu).
- Ostatnio przeglądane coiny u góry wyników.

**Watchlista i alerty**
- Drag & drop do zmiany kolejności w watchliście.
- Toast „Alert ustawiony ✓" z linkiem „Cofnij" po dodaniu wyzwalacza.
- Wskaźnik liczby aktywnych alertów per coin na karcie watchlisty.

**Asystent AI (`/asystent`)**
- Predefiniowane prompty („Przeanalizuj BTC", „Setup na dziś", „Co z reżimem rynku?") jako chipy nad inputem.
- Wskaźnik „pisze…" w czasie streamingu.
- Licznik kosztu dziennego widoczny stale w headerze chatu (mały badge).

**Mobile (telefon)**
- Bottom navigation zamiast scrollowanego topowego menu.
- Sprawdzić, czy wszystkie tabele (`/sila`, `/historia-alertow`) mają sensowny widok na <400px (karty zamiast tabel).

---

## 3. SEO — meta i struktura

**Audyt `head()` per route**
- Każdy plik w `src/routes/` musi mieć unikalny `title` (<60 znaków) i `description` (<160 znaków).
- Dodać `og:title`, `og:description`, `og:type` na wszystkich stronach.
- `/coin/$symbol` — dynamiczny title typu „Bitcoin (BTC) — cena, wykres, RSI · CryptoPuls".

**Strukturalne ulepszenia**
- Jeden `<h1>` per strona (sprawdzić — niektóre routes mają 0 lub 2).
- Semantyczne tagi: `<main>`, `<nav>`, `<article>`, `<section>` zamiast samych `<div>`.
- `alt` na wszystkich obrazach coinów (logo CoinGecko).

**JSON-LD**
- Strona coina: schema.org `FinancialProduct` z aktualną ceną.
- Słownik (`/slownik`): `DefinedTermSet` dla lepszej indeksacji terminów.

**Sitemap + robots**
- `src/routes/sitemap[.]xml.tsx` — generowany dynamicznie z listy top 100 coinów.
- `public/robots.txt` z linkiem do sitemap.

**Performance (wpływa na SEO)**
- Lazy-load dla `CandlestickChart` (ciężki) i `RSIChart` na stronie coina.
- Preconnect do `api.coingecko.com` i `stream.binance.com` w root head.

---

## 4. Drobne poprawki techniczne

- Dodać `error-boundary` na każdą route z `errorComponent` i `notFoundComponent` (część już ma, część nie).
- Sprawdzić console.warn/error w preview i wyciszyć zbędne logi produkcyjne.
- Zapewnić, że wszystkie `useEffect` z subskrypcjami (Binance WS, alerty) mają cleanup.

---

## Plan wykonania (kolejność)

1. **Design audit** — przeskanowanie kolorów + refaktor tokenów (1 iteracja)
2. **SEO sweep** — head() na wszystkich routes + sitemap + JSON-LD (1 iteracja)
3. **UX strony coina** — sticky header, segmented control, command menu Cmd+K (1 iteracja)
4. **UX dashboard + watchlista** — pusty stan, toasty, drag&drop, mobile bottom nav (1 iteracja)
5. **Performance + polish** — lazy load, animacje, skeletony (1 iteracja)

Każdy krok = osobna iteracja, żeby łatwo cofnąć, gdyby coś poszło nie tak.

---

## Pytania przed startem

1. Czy chcesz zachować aktualną paletę (ciemny + akcenty bull/bear), czy mam zaproponować świeży kierunek wizualny (np. bardziej „premium fintech" w stylu Robinhood/Phantom)?
2. Od którego z 5 kroków zaczynamy? Sugeruję **Design audit + SEO sweep** w jednej iteracji jako fundament pod resztę.
