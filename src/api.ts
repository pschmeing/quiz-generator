import type { Quiz, QuizConfig } from './types'

export async function generateQuiz(config: QuizConfig): Promise<Quiz> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)

  let response: Response
  try {
    response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: config.topic,
        difficulty: config.difficulty,
        audience: config.audience,
        questionCount: config.questionCount ?? 10,
        optionCount: config.optionCount ?? 4,
        defaultType: config.defaultType ?? 'single',
        lsContext: config.lsContext,
        selectedGoals: config.selectedGoals,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Zeitüberschreitung — die Generierung hat zu lange gedauert. Bitte versuche es erneut.')
    }
    throw new Error('Netzwerkfehler — bitte prüfe deine Internetverbindung.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API-Fehler: ${response.status} – ${error}`)
  }

  const data = await response.json()

  if (!data || !Array.isArray(data.questions)) {
    throw new Error('Ungültige Antwort vom Server — kein gültiges Quiz erhalten.')
  }

  return data as Quiz
}
