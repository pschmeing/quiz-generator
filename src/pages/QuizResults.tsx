import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import type { QuizQuestion, StudentAnswer } from '../types'
import type { PublishedQuiz } from '../types'
import { useEffect } from 'react'

interface ResultsState {
  score: number
  total: number
  answers: StudentAnswer[]
  quiz: PublishedQuiz
}

export default function QuizResults() {
  const { id: _id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ResultsState | null

  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true })
    }
  }, [state, navigate])

  if (!state) return null

  const { score, total, answers, quiz } = state
  const percentage = Math.round((score / total) * 100)

  // Color based on score
  const scoreColor =
    percentage >= 70
      ? { ring: 'text-success-500', bg: 'bg-success-50', text: 'text-success-700' }
      : percentage >= 50
        ? { ring: 'text-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' }
        : { ring: 'text-danger-500', bg: 'bg-danger-50', text: 'text-danger-700' }

  const heading = percentage >= 70 ? 'Gut gemacht!' : 'Weiter üben!'

  // SVG progress ring
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  function getQuestionById(questionId: number): QuizQuestion | undefined {
    return quiz.questions.find((q) => q.id === questionId)
  }

  function formatAnswer(value: string | string[], question: QuizQuestion): string {
    const keys = Array.isArray(value) ? value : [value]
    return keys.map((k) => question.options[k] || k).join(', ')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Score card */}
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-6 sm:p-8 text-center space-y-4">
          {/* Progress ring */}
          <div className="inline-flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-100"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={`${scoreColor.ring} transition-all duration-1000 ease-out`}
              />
            </svg>
            <span className={`absolute text-3xl font-bold ${scoreColor.text}`}>
              {percentage}%
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{heading}</h1>
          <p className="text-gray-600">
            Du hast <span className="font-semibold">{score} von {total}</span> Fragen richtig beantwortet.
          </p>
        </div>

        {/* Detailed results */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Detaillierte Auswertung</h2>

          {answers.map((answer, index) => {
            const question = getQuestionById(answer.question_id)
            if (!question) return null

            return (
              <div
                key={answer.question_id}
                className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-4 sm:p-5 space-y-3"
              >
                {/* Question header */}
                <div className="flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                      answer.is_correct ? 'bg-success-500' : 'bg-danger-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <p className="font-medium text-gray-900 leading-snug">
                    {question.question}
                  </p>
                </div>

                {/* Student answer */}
                <div className="ml-10 space-y-2">
                  <div className="flex items-start gap-2">
                    {answer.is_correct ? (
                      <CheckCircle className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        answer.is_correct ? 'text-success-700' : 'text-danger-700'
                      }`}
                    >
                      {formatAnswer(answer.selected, question)}
                      {!answer.selected || (Array.isArray(answer.selected) && answer.selected.length === 0)
                        ? 'Keine Antwort'
                        : ''}
                    </span>
                  </div>

                  {/* Correct answer if wrong */}
                  {!answer.is_correct && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-success-700">
                        {formatAnswer(answer.correct, question)}
                      </span>
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <p className="text-xs text-gray-500 mt-1">
                      {question.explanation}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Back button */}
        <div className="text-center pb-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Startseite
          </button>
        </div>
      </div>
    </div>
  )
}
