import { useEffect, useState } from 'react'
import type { PublishedQuiz, QuizSession } from '../types'
import { fetchPublishedQuizzes, fetchSessionsByQuizId } from '../db'
import ResultsExport from './ResultsExport'

interface Props {
  onBack: () => void
}

export default function TeacherDashboard({ onBack }: Props) {
  const [quizzes, setQuizzes] = useState<PublishedQuiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<PublishedQuiz | null>(null)
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuizzes()
  }, [])

  async function loadQuizzes() {
    setLoading(true)
    try {
      const data = await fetchPublishedQuizzes()
      setQuizzes(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function selectQuiz(quiz: PublishedQuiz) {
    setSelectedQuiz(quiz)
    setSessionsLoading(true)
    setError(null)
    try {
      const data = await fetchSessionsByQuizId(quiz.id)
      setSessions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Ergebnisse')
    } finally {
      setSessionsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-lg text-slate-600">Lade Dashboard...</p>
      </div>
    )
  }

  if (selectedQuiz) {
    const avg = sessions.length > 0
      ? Math.round(sessions.reduce((s, r) => s + r.score, 0) / sessions.length * 10) / 10
      : 0

    return (
      <div>
        <button
          onClick={() => { setSelectedQuiz(null); setSessions([]) }}
          className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center gap-1"
        >
          &larr; Zurück zur Übersicht
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{selectedQuiz.title}</h2>
            <p className="text-slate-500">
              Code: <span className="font-mono font-bold">{selectedQuiz.access_code}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-blue-50 px-4 py-2 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
              <p className="text-xs text-blue-500">Teilnahmen</p>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{avg}</p>
              <p className="text-xs text-green-500">Durchschnitt</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {sessionsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-600">Lade Ergebnisse...</p>
          </div>
        ) : (
          <>
            {sessions.length > 0 && (
              <ResultsExport quiz={selectedQuiz} sessions={sessions} />
            )}

            {sessions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                Noch keine Teilnahmen vorhanden.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Ergebnis</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Prozent</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Zeitpunkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const pct = Math.round((s.score / s.total) * 100)
                      return (
                        <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 font-medium text-slate-800">{s.student_name}</td>
                          <td className="px-4 py-3 text-slate-600">{s.score} / {s.total}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                              pct >= 70 ? 'bg-green-100 text-green-700' :
                              pct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {new Date(s.completed_at).toLocaleString('de-DE')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Veröffentlichte Tests</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Zurück
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
          Noch keine Tests veröffentlicht.
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <button
              key={q.id}
              onClick={() => selectQuiz(q)}
              className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-left hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800">{q.title}</h3>
                  <p className="text-sm text-slate-500">
                    Code: <span className="font-mono font-bold">{q.access_code}</span> &middot;{' '}
                    {q.questions.length} Fragen &middot;{' '}
                    {new Date(q.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <span className="text-slate-400">&rarr;</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
