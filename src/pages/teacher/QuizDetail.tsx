import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  fetchQuizById,
  fetchSessionsByQuizId,
  closeQuiz,
  archiveQuiz,
  deleteQuiz,
  publishDraft,
  revertToDraft,
  duplicateQuiz,
  updateQuiz,
} from '../../db'
import type { PublishedQuiz, QuizSession, Violation } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft,
  Edit,
  Users,
  BarChart3,
  Copy,
  Link as LinkIcon,
  Archive,
  Trash2,
  Share2,
  Download,
  RefreshCw,
  RotateCcw,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Hash,
  ShieldAlert,
} from 'lucide-react'

const statusConfig = {
  draft: { label: 'Entwurf', classes: 'bg-gray-100 text-gray-700' },
  published: { label: 'Aktiv', classes: 'bg-green-100 text-green-700' },
  closed: { label: 'Geschlossen', classes: 'bg-orange-100 text-orange-700' },
  archived: { label: 'Archiviert', classes: 'bg-slate-100 text-slate-700' },
}

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<PublishedQuiz | null>(null)
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const { user } = useAuth()

  const loadData = useCallback(async () => {
    if (!id) return
    const q = await fetchQuizById(id)
    setQuiz(q)
    if (q && (q.status === 'published' || q.status === 'closed')) {
      const s = await fetchSessionsByQuizId(id)
      setSessions(s)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Poll sessions every 30s for published quizzes
  useEffect(() => {
    if (!quiz || quiz.status !== 'published' || !id) return
    const interval = setInterval(async () => {
      const s = await fetchSessionsByQuizId(id)
      setSessions(s)
    }, 30_000)
    return () => clearInterval(interval)
  }, [quiz, id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Test nicht gefunden.</p>
        <Link to="/teacher" className="text-primary-600 hover:underline mt-2 inline-block">
          Zurück zur Übersicht
        </Link>
      </div>
    )
  }

  const cfg = statusConfig[quiz.status]
  const completedSessions = sessions.filter((s) => s.completed_at)
  const avgScore =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / completedSessions.length
      : 0

  async function handleClose() {
    if (!id || !confirm('Möchtest du den Test wirklich schließen? Neue Teilnahmen sind dann nicht mehr möglich.')) return
    setActionLoading(true)
    await closeQuiz(id)
    await loadData()
    setActionLoading(false)
  }

  async function handleArchive() {
    if (!id) return
    setActionLoading(true)
    await archiveQuiz(id)
    await loadData()
    setActionLoading(false)
  }

  async function handleDelete() {
    if (!id || !confirm('Möchtest du den Test wirklich unwiderruflich löschen?')) return
    setActionLoading(true)
    await deleteQuiz(id)
    navigate('/teacher')
  }

  async function handlePublish() {
    if (!id) return
    setActionLoading(true)
    await publishDraft(id)
    await loadData()
    setActionLoading(false)
  }

  async function handleRevertToDraft() {
    if (!id) return
    const hasParticipants = sessions.length > 0
    const message = hasParticipants
      ? `Achtung: Dieser Test hat bereits ${sessions.length} Teilnehmer. Wenn du ihn zurück auf Entwurf setzt, können keine neuen Teilnahmen stattfinden und der Beitrittslink wird ungültig. Fortfahren?`
      : 'Test zurück auf Entwurf setzen?'
    if (!confirm(message)) return
    setActionLoading(true)
    await revertToDraft(id)
    await loadData()
    setActionLoading(false)
  }

  async function handleDuplicate() {
    if (!id || !user) return
    setActionLoading(true)
    try {
      const copy = await duplicateQuiz(id, user.id)
      navigate(`/teacher/quiz/${copy.id}`)
    } catch {
      setActionLoading(false)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/join/${quiz!.access_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(quiz!.access_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  function handleShare() {
    const url = `${window.location.origin}/join/${quiz!.access_code}`
    if (navigator.share) {
      navigator.share({ title: quiz!.title, url })
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleExportCSV() {
    if (sessions.length === 0) return
    const header = 'Name,Ergebnis,Prozent,Zeitpunkt\n'
    const rows = sessions
      .map((s) => {
        const pct = Math.round((s.score / s.total) * 100)
        const date = new Date(s.completed_at).toLocaleString('de-DE')
        return `"${s.student_name}",${s.score}/${s.total},${pct}%,"${date}"`
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quiz!.title.replace(/\s+/g, '_')}_Ergebnisse.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/teacher"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{quiz.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}>
              {cfg.label}
            </span>
            {quiz.subject && (
              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                {quiz.subject.name}
              </span>
            )}
            {quiz.class && (
              <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2.5 py-0.5 text-xs font-medium">
                {quiz.class.name}
              </span>
            )}
            <button
              onClick={async () => {
                if (!id) return
                const newVal = !quiz.test_mode
                await updateQuiz(id, { test_mode: newVal })
                setQuiz({ ...quiz, test_mode: newVal })
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                quiz.test_mode
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={quiz.test_mode ? 'Prüfungsmodus deaktivieren' : 'Prüfungsmodus aktivieren'}
            >
              <ShieldAlert className="h-3 w-3" />
              Prüfungsmodus {quiz.test_mode ? 'an' : 'aus'}
            </button>
          </div>
        </div>
        {/* Icon actions: Bearbeiten, Duplizieren, Löschen, Teilen */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`/teacher/quiz/${id}/edit`}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Bearbeiten"
          >
            <Edit className="h-5 w-5" />
          </Link>
          <button
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Duplizieren"
          >
            <Copy className="h-5 w-5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            title="Löschen"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Teilen"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {(quiz.status === 'published' || quiz.status === 'closed') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-primary-600" />
              <h3 className="text-sm font-medium text-gray-500">Teilnehmer</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{sessions.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {completedSessions.length} fertig, {sessions.length - completedSessions.length} offen
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              <h3 className="text-sm font-medium text-gray-500">Durchschnitt</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {completedSessions.length > 0 ? `${Math.round(avgScore)}%` : '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {completedSessions.length > 0
                ? `Basierend auf ${completedSessions.length} Ergebnissen`
                : 'Noch keine Ergebnisse'}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons — text buttons left */}
      <div className="flex flex-wrap gap-2 mb-8">
        {quiz.status === 'published' && (
          <>
            <button
              onClick={handleRevertToDraft}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Zurück zu Entwurf
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LinkIcon className="h-4 w-4" />
              {copied ? 'Kopiert!' : 'Beitrittslink kopieren'}
            </button>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Hash className="h-4 w-4" />
              <span className="font-mono">{codeCopied ? 'Kopiert!' : quiz.access_code}</span>
              <Copy className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </>
        )}
        {quiz.status === 'closed' && (
          <>
            <button
              onClick={handleRevertToDraft}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Zurück zu Entwurf
            </button>
            <button
              onClick={handleArchive}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Archive className="h-4 w-4" />
              Archivieren
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <Link
              to="/teacher/new"
              state={{ quiz }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Ähnlichen Test erstellen
            </Link>
          </>
        )}
        {quiz.status === 'draft' && (
          <>
            <button
              onClick={handlePublish}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              Veröffentlichen
            </button>
          </>
        )}
        {quiz.status === 'archived' && (
          <Link
            to="/teacher/new"
            state={{ quiz }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Ähnlichen Test erstellen
          </Link>
        )}
      </div>

      {/* Results */}
      {(quiz.status === 'published' || quiz.status === 'closed') && sessions.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ergebnisse</h2>
            {quiz.status === 'published' && (
              <button
                onClick={handleClose}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-warning bg-amber-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Test schließen</span>
                <span className="sm:hidden">Schließen</span>
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {sessions
              .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
              .map((session) => {
                const pct = Math.round((session.score / session.total) * 100)
                const pctColor =
                  pct >= 80
                    ? 'bg-green-100 text-green-700'
                    : pct >= 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                const isExpanded = expandedSession === session.id
                return (
                  <div key={session.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{session.student_name}</p>
                        <p className="text-sm text-gray-500 sm:hidden">
                          {session.score}/{session.total} &middot; {new Date(session.completed_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <span className="hidden sm:inline text-sm text-gray-700">
                        {session.score} / {session.total}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pctColor}`}>
                        {pct}%
                      </span>
                      {session.violations && session.violations.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                          <ShieldAlert className="h-3 w-3" />
                          {session.violations.length}
                        </span>
                      )}
                      <span className="hidden sm:inline text-sm text-gray-500">
                        {new Date(session.completed_at).toLocaleString('de-DE')}
                      </span>
                      <span className="text-gray-400 shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </button>
                    {isExpanded && session.answers && (
                      <div className="px-4 sm:px-5 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                        {/* Violations */}
                        {session.violations && session.violations.length > 0 && (
                          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1.5">
                              <ShieldAlert className="h-4 w-4" />
                              {session.violations.length} Auffälligkeit{session.violations.length !== 1 ? 'en' : ''}
                            </p>
                            <div className="space-y-1">
                              {(session.violations as Violation[]).map((v, vi) => {
                                const labels: Record<string, string> = {
                                  tab_hidden: 'Tab gewechselt',
                                  fullscreen_exit: 'Vollbild verlassen',
                                  focus_lost: 'Fokusverlust',
                                  resize: 'Fenster verkleinert',
                                  copy_paste: 'Copy/Paste-Versuch',
                                }
                                return (
                                  <p key={vi} className="text-xs text-amber-700 flex items-center gap-2">
                                    <span className="font-medium">{labels[v.type] ?? v.type}</span>
                                    <span className="text-amber-500">
                                      {new Date(v.timestamp).toLocaleTimeString('de-DE')}
                                    </span>
                                    {v.duration_ms != null && (
                                      <span className="text-amber-500">
                                        ({Math.round(v.duration_ms / 1000)}s)
                                      </span>
                                    )}
                                  </p>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          {session.answers.map((answer, ai) => {
                            const question = quiz!.questions[ai]
                            if (!question) return null
                            return (
                              <div key={ai} className="flex items-start gap-2 text-sm">
                                {answer.is_correct ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-gray-700 break-words">{question.question}</p>
                                  <p className="text-sm text-gray-500 break-words">
                                    Antwort: {Array.isArray(answer.selected) ? answer.selected.join(', ') : answer.selected}
                                    {!answer.is_correct && (
                                      <span className="text-green-600 ml-2">
                                        Richtig: {Array.isArray(answer.correct) ? answer.correct.join(', ') : answer.correct}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
