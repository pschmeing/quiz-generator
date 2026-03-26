import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchTeacherQuizzes, fetchSessionCount, fetchSubjects, fetchClasses, deleteQuiz, duplicateQuiz } from '../../db'
import type { PublishedQuiz, QuizStatus, Subject, SchoolClass } from '../../types'
import { Plus, FileText, Users, Calendar, Hash, BookOpen, GraduationCap, Trash2, Edit, Copy, Share2, Link as LinkIcon } from 'lucide-react'

const statusFilters: { label: string; statuses: QuizStatus[] }[] = [
  { label: 'Alle', statuses: ['draft', 'published', 'closed', 'archived'] },
  { label: 'Aktiv', statuses: ['published'] },
  { label: 'Abgeschlossen', statuses: ['closed'] },
  { label: 'Entwurf', statuses: ['draft'] },
  { label: 'Archiv', statuses: ['archived'] },
]

const statusConfig: Record<QuizStatus, { label: string; classes: string }> = {
  draft: { label: 'Entwurf', classes: 'bg-gray-100 text-gray-700' },
  published: { label: 'Aktiv', classes: 'bg-green-100 text-green-700' },
  closed: { label: 'Geschlossen', classes: 'bg-orange-100 text-orange-700' },
  archived: { label: 'Archiviert', classes: 'bg-slate-100 text-slate-700' },
}

export default function TeacherTests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<PublishedQuiz[]>([])
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({})
  const [activeFilter, setActiveFilter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterClass, setFilterClass] = useState<string>('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      fetchTeacherQuizzes(user.id),
      fetchSubjects(user.id),
      fetchClasses(user.id),
    ])
      .then(async ([quizData, subjectData, classData]) => {
        setQuizzes(quizData)
        setSubjects(subjectData)
        setClasses(classData)
        // Fetch session counts for published quizzes
        const published = quizData.filter((q) => q.status === 'published')
        const counts: Record<string, number> = {}
        await Promise.all(
          published.map(async (q) => {
            const c = await fetchSessionCount(q.id)
            counts[q.id] = c.total
          })
        )
        setSessionCounts(counts)
      })
      .finally(() => setLoading(false))
  }, [user])

  const filtered = quizzes.filter((q) => {
    if (!statusFilters[activeFilter].statuses.includes(q.status)) return false
    if (filterSubject && q.subject_id !== filterSubject) return false
    if (filterClass && q.class_id !== filterClass) return false
    return true
  })

  async function handleDeleteQuiz(e: React.MouseEvent, quizId: string) {
    e.stopPropagation()
    if (!confirm('Möchtest du den Test wirklich unwiderruflich löschen? Das kann nicht rückgängig gemacht werden.')) return
    await deleteQuiz(quizId)
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
  }

  async function handleDuplicateQuiz(e: React.MouseEvent, quizId: string) {
    e.stopPropagation()
    if (!user) return
    const copy = await duplicateQuiz(quizId, user.id)
    setQuizzes((prev) => [copy, ...prev])
  }

  function handleCopyLink(e: React.MouseEvent, accessCode: string) {
    e.stopPropagation()
    const url = `${window.location.origin}/join/${accessCode}`
    navigator.clipboard.writeText(url)
  }

  function handleShareQuiz(e: React.MouseEvent, quiz: PublishedQuiz) {
    e.stopPropagation()
    const url = `${window.location.origin}/join/${quiz.access_code}`
    if (navigator.share) {
      navigator.share({ title: quiz.title, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meine Tests</h1>
        <Link
          to="/teacher/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Test
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusFilters.map((sf, i) => (
          <button
            key={sf.label}
            onClick={() => setActiveFilter(i)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === i
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(subjects.length > 0 || classes.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {subjects.length > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              >
                <option value="">Alle Fächer</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {classes.length > 0 && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-gray-400" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              >
                <option value="">Alle Klassen</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {(filterSubject || filterClass) && (
            <button
              onClick={() => { setFilterSubject(''); setFilterClass('') }}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Keine Tests gefunden.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((quiz) => {
            const cfg = statusConfig[quiz.status]
            return (
              <div
                key={quiz.id}
                onClick={() => navigate(`/teacher/quiz/${quiz.id}`)}
                className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-4 sm:p-5 text-left hover:shadow-xl transition-shadow w-full overflow-hidden cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 break-words">
                        {quiz.title}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-4 w-4" />
                          {quiz.questions.length} Fragen
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Hash className="h-4 w-4" />
                          <span className="font-mono">{quiz.access_code}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(quiz.created_at).toLocaleDateString('de-DE')}
                        </span>
                        {quiz.subject && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                            {quiz.subject.name}
                          </span>
                        )}
                        {quiz.class && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-xs font-medium">
                            {quiz.class.name}
                          </span>
                        )}
                        {quiz.status === 'published' && sessionCounts[quiz.id] !== undefined && (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {sessionCounts[quiz.id]} Teilnehmer
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/teacher/quiz/${quiz.id}/edit`) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicateQuiz(e, quiz.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Duplizieren"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleCopyLink(e, quiz.access_code)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Beitrittslink kopieren"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleShareQuiz(e, quiz)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Teilen"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
