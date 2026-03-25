import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchQuizByCode } from '../db'
import { GraduationCap, LogIn, ArrowRight } from 'lucide-react'

export default function StudentHome() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user, teacher } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setError('Bitte gib einen 6-stelligen Code ein.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const quiz = await fetchQuizByCode(trimmed)
      if (!quiz) {
        setError('Kein Test mit diesem Code gefunden.')
        return
      }
      navigate(`/quiz/${quiz.id}/take`)
    } catch {
      setError('Fehler beim Laden des Tests.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100dvh-4rem)] bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4 -mx-4 -my-6 overflow-hidden">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-2">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Quiz Generator
          </h1>
          <p className="text-gray-500 text-lg">
            {user ? `Hallo, ${teacher?.display_name || user.email?.split('@')[0]}!` : 'Erstelle und teile Tests mit KI'}
          </p>
        </div>

        {/* Primary: Login CTA (only for guests) */}
        {!user && (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Anmelden
          </Link>
        )}

        {/* Secondary: Join test */}
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-5 sm:p-6 space-y-4">
          <p className="text-sm font-medium text-gray-700">
            {user ? 'Test beitreten' : 'Oder direkt einem Test beitreten'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                setError('')
              }}
              placeholder="ABCD12"
              className="w-full text-center font-mono text-xl sm:text-2xl tracking-[0.2em] sm:tracking-widest uppercase px-3 sm:px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 placeholder:text-gray-300"
              autoFocus={!!user}
            />

            {error && (
              <p className="text-sm text-danger-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className={`w-full py-2.5 px-4 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                user
                  ? 'bg-primary-600 hover:bg-primary-700 text-white disabled:bg-gray-300'
                  : 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400'
              } disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Laden...
                </>
              ) : (
                <>
                  Beitreten
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
