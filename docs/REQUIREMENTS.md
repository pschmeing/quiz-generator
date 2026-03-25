# Requirements

## Functional
- Lehrer können sich registrieren (E-Mail/Passwort) und werden von Admin freigeschaltet
- Lehrer können KI-generierte Quizze erstellen mit konfigurierbarer Fragenanzahl und Antworttyp
- Lehrer können Quizze nachträglich bearbeiten (Fragen, Antworten, Optionen)
- Lehrer können Quizze als Entwurf speichern oder veröffentlichen
- Veröffentlichte Quizze haben einen 6-stelligen Zugangscode und einen Beitrittslink
- Lehrer sehen Live-Teilnehmerstatus bei aktiven Tests (30s Polling)
- Lehrer können Tests schließen, archivieren, löschen und Ergebnisse exportieren
- Lehrer können Tests mit anderen Lehrern teilen (Share-Link zum Kopieren)
- Lehrer können ähnliche Tests aus Vorlagen generieren
- Schüler treten via Code oder Link bei, geben Namen ein
- Schüler nutzen Keyboard-Shortcuts (1-4, Enter) zur schnellen Beantwortung
- Schüler sehen nach Abgabe ihre Ergebnisse mit richtigen Antworten
- Admin kann Lehrer freischalten/sperren und globale Einstellungen verwalten

## Non-Functional
- Responsive Design (Mobile-first für Schüler)
- Deutsche UI-Sprache
- Deployment auf Vercel (multi.philippschmeing.com)
- Supabase für Auth + Datenbank

## Constraints
- Anthropic API für Quiz-Generierung (serverseitig, Key nicht im Client)
- Supabase Free Tier
- Vercel Hobby Plan
