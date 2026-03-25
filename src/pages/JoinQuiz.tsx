import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchQuizByCode } from '../db'

export default function JoinQuiz() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }

    let cancelled = false

    async function joinQuiz() {
      try {
        const quiz = await fetchQuizByCode(code!)
        if (cancelled) return
        if (!quiz) {
          setError('Kein Test mit diesem Code gefunden.')
          return
        }
        navigate(`/quiz/${quiz.id}/take`, { replace: true })
      } catch {
        if (!cancelled) {
          setError('Fehler beim Laden des Tests.')
        }
      }
    }

    joinQuiz()
    return () => { cancelled = true }
  }, [code, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900">Fehler</h2>
          <p className="text-gray-600">{error}</p>
          <a
            href="/"
            className="inline-block mt-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-gray-600 font-medium">Test wird geladen...</p>
      </div>
    </div>
  )
}
