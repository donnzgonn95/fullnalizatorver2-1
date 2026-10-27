# Fullanalizator 2.1 — Marktanalyseplattform

**Sprache / Language / Język:** 🇬🇧 [English](README.md) · 🇩🇪 **Deutsch** · 🇵🇱 [Polski](README.pl.md)

## Projektbeschreibung

Fullanalizator 2.1 ist eine webbasierte Plattform zur Marktanalyse. Sie bündelt Marktdaten, Analysemodule und Visualisierungen in einer Anwendung. Der Schwerpunkt liegt auf Recherche und Entscheidungsunterstützung, nicht auf automatisiertem Live-Handel.

## Zentrale Funktionen

- Live-Kurse und Candlestick-Daten aus konfigurierten Datenquellen
- Globaler Setup-Scanner und Überprüfung erkannter Setups
- Technische Analyse und musterbasierte Setup-Erkennung
- Ansichten zu Marktregimen und Marktstimmung
- KI-gestützte Analyse, Zusammenfassungen und Berichte
- Risikoeinstellungen sowie Paper-Trading- und Recherchemodule
- Webhook-Benachrichtigungen und Administrationsbereich
- Benutzeranmeldung und rollenbasierte Zugriffskontrolle

## Technologie

- React 19, TypeScript, TanStack Start und Vite
- Tailwind CSS und shadcn/ui
- Supabase / Lovable Cloud
- Serverseitige Funktionen und geplante Jobs
- Marktdiagramme und interaktive Datenvisualisierung
- KI-Gateway-Integration

## Architektur im Überblick

Geplante Jobs starten das Scannen, die Überprüfung von Setups und Benachrichtigungsabläufe. Analyseergebnisse werden gespeichert und in der Anwendung dargestellt. Benutzerspezifische Einstellungen und administrative Aktionen werden durch Authentifizierung und Berechtigungsprüfungen getrennt.

## Oberflächendesign

Die Anwendung bietet zwei visuelle Themen:
- **Dark Cockpit** — dunkle, kontrastreiche Analyseoberfläche
- **Institutional Light** — helle, zurückhaltende Dashboard-Ansicht

## Entwicklungsstand

Dieses Repository beschreibt die Implementierung und die vorgesehenen Abläufe der Anwendung. Die Verfügbarkeit externer Anbieter, die Deployment-Konfiguration und das Verhalten in Produktion müssen in der jeweiligen Zielumgebung geprüft werden. Das Projekt dient der Analyse und Simulation und führt keine realen Handelsaufträge aus.

## Hinweis

Marktanalysen dienen ausschließlich der Information und sind keine Anlageberatung. Historische oder generierte Signale garantieren keine zukünftigen Ergebnisse.
