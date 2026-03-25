import type { Quiz, QuizConfig } from './types'

export async function generateQuiz(config: QuizConfig): Promise<Quiz> {
  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: config.topic,
      difficulty: config.difficulty,
      audience: config.audience,
      questionCount: config.questionCount ?? 10,
      optionCount: config.optionCount ?? 4,
      defaultType: config.defaultType ?? 'single',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API-Fehler: ${response.status} – ${error}`)
  }

  return (await response.json()) as Quiz
}
