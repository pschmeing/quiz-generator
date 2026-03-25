import { useState } from 'react'
import type { Quiz, PublishedQuiz } from '../types'
import { publishQuiz } from '../db'

interface Props {
  quiz: Quiz
  onClose: () => void
  onPublished: (published: PublishedQuiz) => void
}

export default function PublishModal({ quiz, onClose, onPublished }: Props) {
  const [loading, setLoading] = useState(false)
  const [published, setPublished] = useState<PublishedQuiz | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [password, setPassword] = useState('')

  async function handlePublish() {
    if (!password.trim()) {
      setError('Bitte ein Lehrer-Passwort eingeben.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await publishQuiz(quiz, password)
      setPublished(result)
      onPublished(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Veröffentlichen')
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    if (!published) return
    navigator.clipboard.writeText(published.access_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {!published ? (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Quiz veröffentlichen</h3>
            <p className="text-slate-500 mb-4">
              "{quiz.title}" wird für Schüler freigegeben. Du erhältst einen Zugangscode.
            </p>
            <div className="mb-4">
              <label htmlFor="teacher-pw" className="block text-sm font-medium text-slate-700 mb-1">
                Lehrer-Passwort
              </label>
              <input
                id="teacher-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort für Ergebnis-Zugriff"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                Wird benötigt, um die Ergebnisse im Dashboard einzusehen.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handlePublish}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Quiz veröffentlicht!</h3>
            <p className="text-slate-500 mb-4">
              Teile diesen Zugangscode mit deinen Schülern:
            </p>
            <div className="bg-slate-100 rounded-xl p-6 text-center mb-4">
              <p className="text-4xl font-mono font-bold tracking-widest text-blue-600">
                {published.access_code}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyCode}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {copied ? 'Kopiert!' : 'Code kopieren'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Schließen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
