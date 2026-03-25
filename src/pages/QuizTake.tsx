import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchQuizById, submitQuizSession } from '../db'
import { useAuth } from '../contexts/AuthContext'
import { Keyboard } from 'lucide-react'
import type { PublishedQuiz, QuizQuestion, StudentAnswer } from '../types'

export default function QuizTake() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, teacher } = useAuth()

  const [quiz, setQuiz] = useState<PublishedQuiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<number, string | string[]>>(new Map())
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [nameConfirmed, setNameConfirmed] = useState(false)

  // Determine student name from auth
  useEffect(() => {
    if (user) {
      setStudentName(teacher?.display_name || user.email || '')
      setNameConfirmed(true)
    }
  }, [user, teacher])

  // Fetch quiz
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        const data = await fetchQuizById(id!)
        if (cancelled) return
        if (!data) {
          setError('Test nicht gefunden.')
          return
        }
        if (data.status !== 'published') {
          setError('Dieser Test ist nicht mehr verfügbar.')
          return
        }
        setQuiz(data)
      } catch {
        if (!cancelled) setError('Fehler beim Laden des Tests.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  const currentQuestion: QuizQuestion | undefined = quiz?.questions[currentIndex]
  const isLastQuestion = quiz ? currentIndex === quiz.questions.length - 1 : false
  const optionKeys = currentQuestion ? Object.keys(currentQuestion.options).sort() : []

  const advanceToNext = useCallback(() => {
    if (!quiz || !currentQuestion) return

    // Save the answer
    const newAnswers = new Map(answers)
    if (currentQuestion.type === 'multiple') {
      newAnswers.set(currentQuestion.id, [...selectedOptions])
    }
    // Single choice answers are already saved on selection
    setAnswers(newAnswers)

    if (isLastQuestion) return

    setCurrentIndex((prev) => prev + 1)
    setSelectedOptions([])
  }, [quiz, currentQuestion, answers, selectedOptions, isLastQuestion])

  const selectSingleChoice = useCallback((key: string) => {
    if (!currentQuestion) return
    const newAnswers = new Map(answers)
    newAnswers.set(currentQuestion.id, key)
    setAnswers(newAnswers)

    if (!isLastQuestion) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setSelectedOptions([])
      }, 200)
    }
  }, [currentQuestion, answers, isLastQuestion])

  const toggleMultipleChoice = useCallback((key: string) => {
    setSelectedOptions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentQuestion || !nameConfirmed) return

    function handleKeyDown(e: KeyboardEvent) {
      const num = parseInt(e.key)
      if (num >= 1 && num <= optionKeys.length) {
        const key = optionKeys[num - 1]
        if (currentQuestion!.type === 'single') {
          selectSingleChoice(key)
        } else {
          toggleMultipleChoice(key)
        }
      }

      if (e.key === 'Enter' && currentQuestion!.type === 'multiple' && selectedOptions.length > 0) {
        advanceToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, nameConfirmed, optionKeys, selectSingleChoice, toggleMultipleChoice, advanceToNext, selectedOptions])

  async function handleSubmit() {
    if (!quiz || !id) return
    setSubmitting(true)

    // Finalize last answer for multiple choice
    const finalAnswers = new Map(answers)
    if (currentQuestion?.type === 'multiple' && selectedOptions.length > 0) {
      finalAnswers.set(currentQuestion.id, [...selectedOptions])
    }

    const studentAnswers: StudentAnswer[] = quiz.questions.map((q) => {
      const selected = finalAnswers.get(q.id) ?? (q.type === 'multiple' ? [] : '')
      const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct]
      const selectedArr = Array.isArray(selected) ? selected : [selected]
      const isCorrect =
        correctArr.length === selectedArr.length &&
        correctArr.every((c) => selectedArr.includes(c))

      return {
        question_id: q.id,
        selected,
        correct: q.correct,
        is_correct: isCorrect,
      }
    })

    const score = studentAnswers.filter((a) => a.is_correct).length
    const total = quiz.questions.length

    try {
      await submitQuizSession(
        id,
        studentName,
        studentAnswers,
        score,
        total,
        user?.email
      )
      navigate(`/quiz/${id}/results`, {
        state: { score, total, answers: studentAnswers, quiz },
      })
    } catch {
      setError('Fehler beim Absenden.')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Fehler</h2>
          <p className="text-gray-600">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    )
  }

  // Name input for guests
  if (!nameConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-6 sm:p-8 max-w-sm w-full space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Dein Name</h2>
            <p className="text-sm text-gray-500 mt-1">Wie heißt du?</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (studentName.trim()) setNameConfirmed(true)
            }}
            className="space-y-4"
          >
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Vor- und Nachname"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
              autoFocus
            />
            <button
              type="submit"
              disabled={!studentName.trim()}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Test starten
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!quiz || !currentQuestion) return null

  const progress = ((currentIndex + 1) / quiz.questions.length) * 100
  const currentAnswer = answers.get(currentQuestion.id)
  const isSingle = currentQuestion.type === 'single'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/20 px-4 py-3.5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">
              Frage {currentIndex + 1} von {quiz.questions.length}
            </span>
            <span className="text-gray-400 truncate ml-3 max-w-[40%] text-right">{quiz.title}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {/* Question text */}
          <div className="space-y-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {currentQuestion.question}
            </p>
            {!isSingle && (
              <p className="text-sm text-gray-500">Mehrere Antworten möglich</p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {optionKeys.map((key, index) => {
              const isSelected = isSingle
                ? currentAnswer === key
                : selectedOptions.includes(key)

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isSingle) {
                      selectSingleChoice(key)
                    } else {
                      toggleMultipleChoice(key)
                    }
                  }}
                  className={`w-full min-h-[48px] flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left
                    ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                      ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-gray-800 font-medium">
                    {currentQuestion.options[key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-3 pt-2">
            {/* Multiple choice confirm / Last question submit */}
            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  (isSingle ? !currentAnswer : selectedOptions.length === 0)
                }
                className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'Wird abgegeben...' : 'Abgeben'}
              </button>
            ) : (
              !isSingle &&
              selectedOptions.length > 0 && (
                <button
                  onClick={advanceToNext}
                  className="w-full sm:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Weiter
                </button>
              )
            )}

            {/* Keyboard hint */}
            <p className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Keyboard className="w-3.5 h-3.5" />
              Drücke 1-{optionKeys.length} zum Auswählen
              {!isSingle && ', Enter zum Bestätigen'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
