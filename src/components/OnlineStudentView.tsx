import { useState } from 'react'
import type { PublishedQuiz, StudentAnswer } from '../types'
import { submitQuizSession } from '../db'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

interface Props {
  quiz: PublishedQuiz
  studentName: string
  onFinished: () => void
}

export default function OnlineStudentView({ quiz, studentName, onFinished }: Props) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const question = quiz.questions[current]
  const total = quiz.questions.length

  function selectAnswer(key: string) {
    if (finished) return
    setAnswers((prev) => ({ ...prev, [current]: key }))
  }

  async function handleFinish() {
    setFinished(true)
    setSubmitting(true)
    setError(null)

    const studentAnswers: StudentAnswer[] = quiz.questions.map((q, i) => ({
      question_id: q.id,
      selected: answers[i] ?? '',
      correct: q.correct,
      is_correct: answers[i] === q.correct,
    }))

    const score = studentAnswers.filter((a) => a.is_correct).length

    try {
      await submitQuizSession(quiz.id, studentName, studentAnswers, score, total)
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (current < total - 1) {
      setCurrent(current + 1)
    } else {
      handleFinish()
    }
  }

  function prev() {
    if (current > 0) setCurrent(current - 1)
  }

  const correctCount = quiz.questions.filter(
    (q, i) => answers[i] === q.correct
  ).length

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Ergebnis</h2>
          <p className="text-slate-500 mb-4">{studentName}</p>
          <p className="text-5xl font-bold text-blue-600 my-4">
            {correctCount} / {total}
          </p>
          <p className="text-lg text-slate-500">
            {correctCount === total
              ? 'Perfekt! Alle Fragen richtig!'
              : correctCount >= total * 0.7
                ? 'Gut gemacht!'
                : 'Weiter üben!'}
          </p>
          {submitting && (
            <p className="text-sm text-slate-400 mt-2">Ergebnis wird gespeichert...</p>
          )}
          {submitted && (
            <p className="text-sm text-green-600 mt-2">Ergebnis gespeichert!</p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        <div className="space-y-4 mb-8">
          {quiz.questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct
            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl shadow-sm border p-5 ${
                  isCorrect ? 'border-green-300' : 'border-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 text-lg ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {isCorrect ? '\u2713' : '\u2717'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 mb-2">
                      {q.id}. {q.question}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-red-600 mb-1">
                        Deine Antwort: {answers[i] ?? 'Keine'}) {answers[i] ? q.options[answers[i] as keyof typeof q.options] : ''}
                      </p>
                    )}
                    <p className="text-sm text-green-700">
                      Richtig: {q.correct}) {q.options[q.correct]}
                    </p>
                    <p className="text-sm text-slate-500 mt-1 italic">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onFinished}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{quiz.title}</h2>
          <p className="text-sm text-slate-500">{studentName}</p>
        </div>
        <span className="text-sm text-slate-500">
          Frage {current + 1} von {total}
        </span>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <p className="text-lg font-medium text-slate-800 mb-4">
          {question.id}. {question.question}
        </p>
        <div className="space-y-3">
          {OPTION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => selectAnswer(key)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                answers[current] === key
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <span className="font-medium">{key})</span> {question.options[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={prev}
          disabled={current === 0}
          className="px-6 py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Zurück
        </button>
        <button
          onClick={next}
          disabled={answers[current] === undefined}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {current === total - 1 ? 'Abgeben' : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
