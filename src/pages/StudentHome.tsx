import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchQuizByCode } from '../db'
import { GraduationCap } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-2">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Test beitreten
          </h1>
          <p className="text-gray-500 text-lg">
            Bereit für deinen nächsten Test?
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
          {user && (
            <p className="text-sm text-gray-600">
              Angemeldet als{' '}
              <span className="font-medium text-gray-900">
                {teacher?.display_name || user.email}
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  setError('')
                }}
                placeholder="ABCD12"
                className="w-full text-center font-mono text-2xl tracking-widest uppercase px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 placeholder:text-gray-300"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-danger-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Laden...
                </span>
              ) : (
                'Beitreten'
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        {!user && (
          <p className="text-sm text-gray-500">
            Lehrkraft?{' '}
            <a
              href="/login"
              className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2"
            >
              Anmelden
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
