# LS-Integration: Quiz aus Lernsituation generieren

## Zusammenfassung

Neuer Tab "Aus Lernsituation" auf `/teacher/new`. Lehrer laden teach-ai Markdown-Dateien hoch oder fuegen Text ein. Ein clientseitiger Parser extrahiert Lernziele als Checkboxen. Der gesamte Kontext geht an Claude (Sonnet 4.6) mit Fokus auf die ausgewaehlten Lernziele. Budget-Limit: 5ct pro Quiz.

## Kontext

- **quiz-generator**: React SPA (Vite) + Supabase + Vercel Serverless Function. Generiert MC-Quizzes via Anthropic API.
- **teach-ai**: Claude/GPT Skill fuer Unterrichtsplanung am Berufskolleg NRW. Erzeugt Lernsituationen (LS) als Markdown-Dateien mit strukturierten Lernzielen, Handlungsphasen und Materialtabellen.
- **Ziel**: Lehrer, die mit teach-ai planen, koennen direkt aus ihren LS-Dateien passgenaue Quizzes generieren — aligned mit Lernzielen und Taxonomiestufen.

## UI-Design

### Tab-Struktur auf `/teacher/new`

```
[ Thema eingeben ]  [ Aus Lernsituation ]
```

- "Thema eingeben" bleibt unveraendert (bestehender Flow)
- "Aus Lernsituation" ist der neue Tab

### Flow im "Aus Lernsituation"-Tab

**Schritt 1: Input**

Drop-Zone fuer `.md`-Dateien:
- Drag & Drop oder Klick oeffnet Dateibrowser
- Max 2 Dateien, max 100 KB pro Datei
- Nur `.md` akzeptiert
- Nach Upload: Dateiname(n) mit X zum Entfernen anzeigen

Darunter: Link "Kein .md-File?" — Klick klappt eine Textarea auf (ersetzt die Drop-Zone):
- Grosse Textarea (6-8 Zeilen)
- Zeichenzaehler mit Budget-Hinweis (z.B. "~3.200 von max ~50.000 Zeichen")
- Zurueck-Link "Doch lieber Datei hochladen?" stellt die Drop-Zone wieder her

**Schritt 2: Lernziel-Auswahl (nur bei `.md`-Upload)**

Nach dem Upload parst der Client die Markdown-Datei(en) und zeigt extrahierte Lernziele als Checkboxen:

```
Lernziele aus ls-02-sql-grundlagen.md:
  [x] Die Lernenden koennen JOIN-Typen analysieren [B4, AFB II]
  [x] Die Lernenden koennen SELECT-Abfragen schreiben [C3, AFB II]
  [x] Die Lernenden koennen Normalisierung erklaeren [B2, AFB I]
```

- Alle vorausgewaehlt
- Lehrer kann einzelne abwaehlen
- Mindestens 1 Lernziel muss ausgewaehlt sein
- Bei Text-Einfuegen: Keine Checkboxen, Text geht direkt als Kontext rein

**Schritt 3: Einstellungen**

Wie im bestehenden Tab, aber ohne Zielgruppe (kommt aus der LS):
- Fragenanzahl (5-30, Default 10)
- Schwierigkeit (Einfach / Mittel / Schwer / Optional)
- SC/MC Toggle + Antwortoptionen (2-6, Default 4)

**Schritt 4: Generieren**

Button "Quiz generieren" — identisch zum bestehenden Flow. Danach: Quiz-Preview, Speichern, Bearbeiten, Veroeffentlichen wie gehabt.

## Parsing-Logik (clientseitig)

### Lernziel-Extraktion

Regex-basiert auf dem teach-ai Format:

1. Finde `### Lernziele` oder `## Lernziele` Heading
2. Extrahiere nachfolgende Listenpunkte (`- Die Lernenden koennen...`)
3. Parse optional Taxonomie-Tag am Ende: `[B4, AFB II]`
4. Stoppe bei naechstem Heading oder Leerzeile nach den Listenpunkten

```typescript
interface ParsedGoal {
  text: string          // "Die Lernenden koennen JOIN-Typen analysieren"
  taxonomy?: string     // "B4"
  afb?: string          // "AFB II"
  raw: string           // Volle Zeile inkl. Tag
}
```

### Fallback

Wenn kein `### Lernziele`-Abschnitt gefunden wird:
- Hinweis anzeigen: "Keine Lernziele erkannt — der gesamte Dateiinhalt wird als Kontext verwendet."
- Keine Checkboxen, Datei geht komplett als Kontext rein (wie bei Text-Einfuegen)

## API-Aenderungen

### `api/generate-quiz.ts`

Neue optionale Parameter im Request Body:

```typescript
interface GenerateQuizRequest {
  // Bestehend:
  topic: string
  difficulty?: Difficulty
  audience?: Audience
  questionCount?: number
  optionCount?: number
  defaultType?: 'single' | 'multiple'
  // Neu:
  lsContext?: string         // Gesamter Markdown-Inhalt (1-2 Dateien konkateniert)
  selectedGoals?: string[]   // Ausgewaehlte Lernziele (Rohtext)
}
```

### Erweiterter System-Prompt

Wenn `lsContext` vorhanden:

```
Du bist ein erfahrener Lehrer am Berufskolleg. Dir liegt eine Lernsituation vor.
Erstelle genau {count} Multiple-Choice-Aufgaben basierend auf dieser Lernsituation.
{selectedGoals ? "Fokussiere die Fragen auf folgende Lernziele:\n" + goals : ""}
Die Fragen sollen auf der Taxonomiestufe der Lernziele liegen (nicht nur Faktenwissen).
{difficultyHint}
...
```

Der `topic`-Parameter wird bei LS-Modus nicht benoetigt (kann leer sein oder aus dem LS-Titel abgeleitet werden).

### Budget-Guard

Vor dem Anthropic API-Call:
1. Token-Schaetzung: `(systemPrompt.length + lsContext.length + selectedGoals.join().length) / 4`
2. Kosten-Schaetzung: `(inputTokens * 3 + 2000 * 15) / 1_000_000`
3. Wenn > $0.05: HTTP 413 mit Meldung "Zu viel Kontext — bitte weniger Text oder weniger Dateien."

## Limits

| Parameter | Wert | Begruendung |
|---|---|---|
| Max Dateien | 2 | 1-2 LS pro Quiz realistisch |
| Max pro Datei | 100 KB | ~25.000 Woerter, weit mehr als jede LS |
| Max Kosten/Quiz | 5ct | Budget-Guard serverseitig |
| Dateityp | `.md` | teach-ai Output ist Markdown |
| Modell | Sonnet 4.6 | Einheitlich, gute Qualitaet |

## Was sich nicht aendert

- Quiz-Datenmodell (Supabase) — keine Schema-Aenderung noetig
- Quiz-Preview, Editor, Veroeffentlichung — identischer Flow nach Generierung
- Bestehender "Thema eingeben"-Tab — bleibt komplett unveraendert
- Schuelerseitige Erfahrung — keine Aenderung

## Nicht im Scope (spaeter)

- Handlungsphasen als auswaehlbare Bloecke im Themenselector
- PDF/DOCX-Upload mit serverseitigem Parsing
- Quiz aus beliebigem Dokument (nicht-teach-ai)

Diese Items sind als TODOs in Obsidian erfasst.
