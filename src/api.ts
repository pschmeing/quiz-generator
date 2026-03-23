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
        'Du bist ein erfahrener Lehrer. Erstelle genau 10 Multiple-Choice-Aufgaben zum angegebenen Thema. Jede Aufgabe hat genau 4 Antwortmöglichkeiten (A, B, C, D), wobei genau eine richtig ist. Antworte NUR mit validem JSON ohne Markdown-Blöcke: { "title": "Thema", "questions": [ { "id": 1, "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "correct": "A", "explanation": "Kurze Erklärung warum diese Antwort richtig ist" } ] }',
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
  const text = data.content[0].text
  return JSON.parse(text) as Quiz
}
