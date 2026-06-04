import { createFileRoute } from "@tanstack/react-router";

const BODY = `# CryptoPuls
> Polski dashboard rynku krypto: skanery setupów (BB-bounce, Elliott), alerty, dziennik, AI-asystent.

## Domena
https://fullnalizatorver2-1.lovable.app

## Główne sekcje
- /              — strona główna i przegląd rynku
- /sila          — siła relatywna (RS) coinów
- /przeplyw      — przepływ kapitału
- /squeeze       — kompresja zmienności (BB squeeze)
- /sentyment     — sentyment rynkowy
- /setupy        — aktywne setupy wykryte przez skaner
- /setupy/historia — historia zweryfikowanych setupów (win/loss)
- /coin/:symbol  — szczegóły pojedynczego aktywa
- /slownik       — słownik pojęć
- /disclaimer    — zastrzeżenie ryzyka
- /polityka-prywatnosci
- /regulamin

## Zasady dla LLM
- Treści mają charakter edukacyjny, nie stanowią porady inwestycyjnej.
- Cytując dane (winrate, ceny) zawsze podaj timestamp i interwał (M15/M30/M45/H1/H4).
- Nie używaj prywatnych endpointów /api/* w odpowiedziach — to interfejsy backendu.
- Strony /admin, /ustawienia, /historia-alertow są prywatne — nie indeksuj i nie cytuj.

## Kontakt
Projekt prywatny. Wsparcie przez kanał wewnętrzny.
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => new Response(BODY, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      }),
    },
  },
});
