import type { Quiz, QuizConfig } from './types'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function generateQuiz(config: QuizConfig): Promise<Quiz> {
  const difficultyHint = config.difficulty
    ? ` Der Schwierigkeitsgrad soll "${config.difficulty}" sein.`
    : ''
  const audienceHint = config.audience
    ? ` Die Zielgruppe ist "${config.audience}".`
    : ''

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'Du bist ein erfahrener Lehrer. Erstelle genau 10 Multiple-Choice-Aufgaben zum angegebenen Thema. Jede Aufgabe hat genau 4 Antwortmöglichkeiten (A, B, C, D), wobei genau eine richtig ist. Antworte NUR mit validem JSON ohne Markdown-Blöcke: { "title": "Thema", "questions": [ { "id": 1, "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "correct": "A", "explanation": "Kurze Erklärung warum diese Antwort richtig ist" } ] } WICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Formatierung. Kein ```json Block.',
      messages: [
        {
          role: 'user',
          content: `Erstelle ein Quiz zum Thema: ${config.topic}.${difficultyHint}${audienceHint}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API-Fehler: ${response.status} – ${error}`)
  }

  const data = await response.json()
  const content = data.content[0].text
  // Strip markdown code blocks if present
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned) as Quiz
}
