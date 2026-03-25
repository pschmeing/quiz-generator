import { useState } from 'react'
import type { PublishedQuiz } from '../types'
import { fetchQuizByCode } from '../db'

interface Props {
  onStart: (quiz: PublishedQuiz, studentName: string) => void
  onBack: () => void
}

export default function StudentLogin({ onStart, onBack }: Props) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return

    setLoading(true)
    setError(null)

    const quiz = await fetchQuizByCode(code)
    if (!quiz) {
      setError('Kein Quiz mit diesem Code gefunden.')
      setLoading(false)
      return
    }

    onStart(quiz, name.trim())
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Test beitreten</h2>
        <p className="text-slate-500">Gib den Zugangscode und deinen Namen ein.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
            Zugangscode
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="z.B. ABC123"
            maxLength={6}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400 text-center text-2xl font-mono tracking-widest"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Dein Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vorname Nachname"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!code.trim() || !name.trim() || loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Wird geladen...' : 'Test starten'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          Zurück zur Startseite
        </button>
      </form>
    </div>
  )
}
