import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { generateQuiz } from '../../api'
import { saveQuizDraft, publishQuiz, countTodayQuizzes, fetchSubjects, fetchClasses } from '../../db'
import type { QuizConfig, Quiz, Subject, SchoolClass } from '../../types'
import { Sparkles, Save, Send, Edit } from 'lucide-react'

export default function QuizCreate() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [config, setConfig] = useState<QuizConfig>({
    topic: '',
    questionCount: 10,
    optionCount: 4,
    defaultType: 'single',
  })
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [customTitle, setCustomTitle] = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([fetchSubjects(user.id), fetchClasses(user.id)]).then(
      ([s, c]) => { setSubjects(s); setClasses(c) }
    )
  }, [user])

  const DAILY_LIMIT = 2

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!config.topic.trim() || !user) return
    setGenerating(true)
    setError(null)
    try {
      if (!isAdmin) {
        const todayCount = await countTodayQuizzes(user.id)
        if (todayCount >= DAILY_LIMIT) {
          setError(`Tageslimit erreicht (${DAILY_LIMIT} Tests pro Tag). Versuche es morgen erneut.`)
          setGenerating(false)
          return
        }
      }
      const result = await generateQuiz(config)
      if (customTitle.trim()) {
        result.title = customTitle.trim()
      }
      setQuiz(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Generierung')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveDraft() {
    if (!quiz || !user) return
    setSaving(true)
    try {
      const opts = { subject_id: selectedSubject || null, class_id: selectedClass || null }
      const saved = await saveQuizDraft(quiz, user.id, opts)
      navigate(`/teacher/quiz/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndEdit() {
    if (!quiz || !user) return
    setSaving(true)
    try {
      const opts = { subject_id: selectedSubject || null, class_id: selectedClass || null }
      const saved = await saveQuizDraft(quiz, user.id, opts)
      navigate(`/teacher/quiz/${saved.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!quiz || !user) return
    setSaving(true)
    try {
      const opts = { subject_id: selectedSubject || null, class_id: selectedClass || null }
      const published = await publishQuiz(quiz, user.id, opts)
      navigate(`/teacher/quiz/${published.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Veröffentlichen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Neuer Test erstellen</h1>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generation form */}
      {!quiz && (
        <form onSubmit={handleGenerate} className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-6 space-y-5">
          <div>
            <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700 mb-1.5">
              Titel (optional)
            </label>
            <input
              id="customTitle"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="z.B. Biologie-Test Klasse 10a..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
            />
          </div>

          {(subjects.length > 0 || classes.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.length > 0 && (
                <div>
                  <label htmlFor="gen-subject" className="block text-sm font-medium text-gray-700 mb-1.5">Fach</label>
                  <select
                    id="gen-subject"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                  >
                    <option value="">Kein Fach</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {classes.length > 0 && (
                <div>
                  <label htmlFor="gen-class" className="block text-sm font-medium text-gray-700 mb-1.5">Klasse</label>
                  <select
                    id="gen-class"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                  >
                    <option value="">Keine Klasse</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1.5">
              Thema
            </label>
            <input
              id="topic"
              type="text"
              required
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
              placeholder="z.B. Photosynthese, Dreisatz, Europäische Union..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-1.5">
                Anzahl Fragen
              </label>
              <input
                id="questionCount"
                type="number"
                min={5}
                max={30}
                value={config.questionCount}
                onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) || 5 })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1.5">
                Schwierigkeit
              </label>
              <select
                id="difficulty"
                value={config.difficulty ?? ''}
                onChange={(e) => setConfig({ ...config, difficulty: e.target.value as QuizConfig['difficulty'] || undefined })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              >
                <option value="">Optional</option>
                <option value="Einfach">Einfach</option>
                <option value="Mittel">Mittel</option>
                <option value="Schwer">Schwer</option>
              </select>
            </div>
            <div>
              <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1.5">
                Zielgruppe
              </label>
              <select
                id="audience"
                value={config.audience ?? ''}
                onChange={(e) => setConfig({ ...config, audience: e.target.value as QuizConfig['audience'] || undefined })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              >
                <option value="">Optional</option>
                <option value="Berufskolleg">Berufskolleg</option>
                <option value="Gymnasium">Gymnasium</option>
                <option value="Universität">Universität</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="optionCount" className="block text-sm font-medium text-gray-700 mb-1.5">
              Antwortoptionen
            </label>
            <input
              id="optionCount"
              type="number"
              min={2}
              max={6}
              value={config.optionCount}
              onChange={(e) => setConfig({ ...config, optionCount: parseInt(e.target.value) || 4 })}
              className="w-full max-w-[200px] rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  defaultType: config.defaultType === 'single' ? 'multiple' : 'single',
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.defaultType === 'multiple' ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.defaultType === 'multiple' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-gray-700">
                Standard: {config.defaultType === 'single' ? 'Single Choice' : 'Multiple Choice'}
              </span>
              <p className="text-xs text-gray-500">
                {config.defaultType === 'single'
                  ? 'Jede Frage hat genau eine richtige Antwort'
                  : 'Fragen können mehrere richtige Antworten haben'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating || !config.topic.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Quiz wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Quiz generieren
              </>
            )}
          </button>
        </form>
      )}

      {/* Quiz preview */}
      {quiz && (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <label htmlFor="quiz-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Titel
              </label>
              <input
                id="quiz-title"
                type="text"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-lg font-semibold text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">{quiz.questions.length} Fragen generiert</p>

            {/* Subject & Class selection */}
            {(subjects.length > 0 || classes.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {subjects.length > 0 && (
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">Fach</label>
                    <select
                      id="subject"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                    >
                      <option value="">Kein Fach</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                {classes.length > 0 && (
                  <div>
                    <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1.5">Klasse</label>
                    <select
                      id="class"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                    >
                      <option value="">Keine Klasse</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {quiz.questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(q.options).map(([key, value]) => {
                      const isCorrect = Array.isArray(q.correct)
                        ? q.correct.includes(key)
                        : q.correct === key
                      return (
                        <div
                          key={key}
                          className={`rounded-md px-3 py-2 text-sm ${
                            isCorrect
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : 'bg-gray-50 border border-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      )
                    })}
                  </div>
                  {q.explanation && (
                    <p className="mt-2 text-xs text-gray-500">
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              Als Entwurf speichern
            </button>
            <button
              onClick={handleSaveAndEdit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Bearbeiten
            </button>
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              Veröffentlichen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
