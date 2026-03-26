import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchQuizById, submitQuizSession } from '../db'
import { useAuth } from '../contexts/AuthContext'
import { Keyboard, Mail, Lock, ArrowRight, ChevronLeft, User } from 'lucide-react'
import type { PublishedQuiz, QuizQuestion, StudentAnswer } from '../types'

export default function QuizTake() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, teacher, signIn, signUp, sendMagicLink } = useAuth()

  const [quiz, setQuiz] = useState<PublishedQuiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<number, string | string[]>>(new Map())
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [nameConfirmed, setNameConfirmed] = useState(false)
  // Auth form state for guest entry
  const [entryMode, setEntryMode] = useState<'login' | 'name'>('login')
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic'>('password')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

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

  // Auth submit handler for guest login
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    setAuthLoading(true)

    if (loginMethod === 'magic') {
      const { error } = await sendMagicLink(authEmail)
      if (error) {
        setAuthError(error)
      } else {
        setAuthSuccess('Link wurde gesendet! Schau in deinem Postfach nach.')
      }
    } else if (isSignup) {
      const { error } = await signUp(authEmail, authPassword)
      if (error) {
        setAuthError(error)
      } else {
        setAuthSuccess('Registrierung erfolgreich! Bestätige deine E-Mail.')
      }
    } else {
      const { error } = await signIn(authEmail, authPassword)
      if (error) setAuthError(error)
    }
    setAuthLoading(false)
  }

  const currentQuestion: QuizQuestion | undefined = quiz?.questions[currentIndex]
  const isLastQuestion = quiz ? currentIndex === quiz.questions.length - 1 : false
  const isFirstQuestion = currentIndex === 0
  const optionKeys = currentQuestion ? Object.keys(currentQuestion.options).sort() : []

  // Restore selectedOptions when navigating between questions
  useEffect(() => {
    if (!quiz) return
    const q = quiz.questions[currentIndex]
    if (q?.type === 'multiple') {
      const saved = answers.get(q.id)
      setSelectedOptions(Array.isArray(saved) ? [...saved] : [])
    } else {
      setSelectedOptions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  const advanceToNext = useCallback(() => {
    if (!quiz || !currentQuestion || isLastQuestion) return

    // Save multiple choice answer before leaving
    if (currentQuestion.type === 'multiple') {
      setAnswers((prev) => {
        const newAnswers = new Map(prev)
        newAnswers.set(currentQuestion.id, [...selectedOptions])
        return newAnswers
      })
    }

    setCurrentIndex((prev) => prev + 1)
  }, [quiz, currentQuestion, selectedOptions, isLastQuestion])

  const goBack = useCallback(() => {
    if (!quiz || !currentQuestion || isFirstQuestion) return

    // Save multiple choice answer before leaving
    if (currentQuestion.type === 'multiple' && selectedOptions.length > 0) {
      setAnswers((prev) => {
        const newAnswers = new Map(prev)
        newAnswers.set(currentQuestion.id, [...selectedOptions])
        return newAnswers
      })
    }

    setCurrentIndex((prev) => prev - 1)
  }, [quiz, currentQuestion, isFirstQuestion, selectedOptions])

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

      if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && !isFirstQuestion) {
        e.preventDefault()
        goBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, nameConfirmed, optionKeys, selectSingleChoice, toggleMultipleChoice, advanceToNext, goBack, selectedOptions, isFirstQuestion])

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

  // Guest entry: login or name-only
  if (!nameConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-6 sm:p-8 max-w-sm w-full space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">{quiz?.title || 'Test beitreten'}</h2>
            <p className="text-sm text-gray-500 mt-1">Melde dich an, um den Test zu starten</p>
          </div>

          {/* Toggle: E-Mail / Nur Name */}
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => { setEntryMode('login'); setAuthError(null); setAuthSuccess(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                entryMode === 'login'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail size={15} />
              E-Mail
            </button>
            <button
              type="button"
              onClick={() => { setEntryMode('name'); setAuthError(null); setAuthSuccess(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                entryMode === 'name'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User size={15} />
              Nur Name
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {authSuccess}
            </div>
          )}

          {entryMode === 'login' ? (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="deine@email.de"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {loginMethod === 'password' && (
                <div>
                  <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="auth-password"
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading
                  ? (loginMethod === 'magic' ? 'Wird gesendet...' : (isSignup ? 'Wird registriert...' : 'Wird angemeldet...'))
                  : (loginMethod === 'magic' ? 'Magic Link senden' : (isSignup ? 'Registrieren' : 'Anmelden'))}
                {!authLoading && <ArrowRight size={16} />}
              </button>

              {loginMethod === 'password' ? (
                <div className="flex flex-col items-center gap-1.5 text-sm text-gray-500">
                  <p>
                    {isSignup ? 'Schon ein Konto?' : 'Noch kein Konto?'}{' '}
                    <button type="button" onClick={() => { setIsSignup(!isSignup); setAuthError(null); setAuthSuccess(null) }} className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                      {isSignup ? 'Anmelden' : 'Registrieren'}
                    </button>
                  </p>
                  <button type="button" onClick={() => { setLoginMethod('magic'); setAuthError(null); setAuthSuccess(null) }} className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                    Magic Link nutzen
                  </button>
                </div>
              ) : (
                <p className="text-sm text-center text-gray-500">
                  Oder{' '}
                  <button type="button" onClick={() => { setLoginMethod('password'); setAuthError(null); setAuthSuccess(null) }} className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                    mit Passwort anmelden
                  </button>
                </p>
              )}
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (studentName.trim()) setNameConfirmed(true)
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Dein Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="guest-name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Vor- und Nachname"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!studentName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Test starten
                <ArrowRight size={16} />
              </button>
            </form>
          )}
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
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Back button */}
              {!isFirstQuestion && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 font-medium rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </button>
              )}

              {/* Multiple choice confirm / Last question submit */}
              {isLastQuestion ? (
                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    (isSingle ? !currentAnswer : selectedOptions.length === 0)
                  }
                  className="flex-1 sm:flex-none px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {submitting ? 'Wird abgegeben...' : 'Abgeben'}
                </button>
              ) : (
                !isSingle &&
                selectedOptions.length > 0 && (
                  <button
                    onClick={advanceToNext}
                    className="flex-1 sm:flex-none px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Weiter
                  </button>
                )
              )}
            </div>

            {/* Keyboard hint */}
            <p className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Keyboard className="w-3.5 h-3.5" />
              Drücke 1-{optionKeys.length} zum Auswählen
              {!isSingle && ', Enter zum Bestätigen'}
              {!isFirstQuestion && ', ← zum Zurückgehen'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
