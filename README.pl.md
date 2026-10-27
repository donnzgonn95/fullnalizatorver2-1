# Fullanalizator 2.1 — platforma analizy rynku

**Język / Language / Sprache:** 🇬🇧 [English](README.md) · 🇩🇪 [Deutsch](README.de.md) · 🇵🇱 **Polski**

## Opis projektu

Fullanalizator 2.1 to internetowa platforma analityczna, która łączy dane rynkowe, moduły analizy i wizualizacje w jednej aplikacji. Jej celem jest prowadzenie analiz i wspieranie decyzji, a nie automatyczne zawieranie transakcji na żywo.

## Najważniejsze funkcje

- Bieżące ceny i dane świecowe z skonfigurowanych źródeł
- Globalny skaner setupów i weryfikacja ich statusu
- Analiza techniczna i wykrywanie setupów na podstawie wzorców
- Widoki reżimów rynkowych i sentymentu
- Analizy, podsumowania i raporty wspierane przez AI
- Ustawienia kontroli ryzyka oraz moduły paper tradingu i badań
- Powiadomienia webhook i panel administracyjny
- Logowanie użytkowników i kontrola dostępu oparta na rolach

## Technologie

- React 19, TypeScript, TanStack Start i Vite
- Tailwind CSS i shadcn/ui
- Supabase / Lovable Cloud
- Funkcje serwerowe i zadania cykliczne
- Wykresy rynkowe i interaktywne wizualizacje danych
- Integracja z bramą AI

## Architektura w skrócie

Zadania cykliczne uruchamiają skanowanie, weryfikację setupów i powiadomienia. Wyniki analiz są zapisywane i prezentowane w aplikacji. Ustawienia użytkowników oraz operacje administracyjne są rozdzielone za pomocą uwierzytelniania i kontroli uprawnień.

## Motywy interfejsu

Aplikacja oferuje dwa motywy:
- **Dark Cockpit** — ciemny, kontrastowy panel analityczny
- **Institutional Light** — jasny, stonowany dashboard

## Stan rozwoju

Repozytorium opisuje implementację aplikacji i planowane przepływy pracy. Dostępność usług zewnętrznych, konfigurację wdrożenia i zachowanie produkcyjne należy zweryfikować w środowisku docelowym. Projekt służy analizie i symulacji; nie wykonuje rzeczywistych transakcji.

## Zastrzeżenie

Analizy rynkowe mają charakter informacyjny i nie stanowią porady inwestycyjnej. Historyczne ani generowane sygnały nie gwarantują przyszłych wyników.
