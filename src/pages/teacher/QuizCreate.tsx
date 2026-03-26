import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { generateQuiz } from '../../api'
import { saveQuizDraft, publishQuiz, countTodayQuizzes, fetchSubjects, fetchClasses } from '../../db'
import type { QuizConfig, Quiz, Subject, SchoolClass } from '../../types'
import { Sparkles, Save, Send, Edit, Upload, X, FileText, Loader2 } from 'lucide-react'
import { extractTopics, type ParsedTopic } from '../../utils/parseLsMarkdown'

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

  // LS tab state
  const [activeTab, setActiveTab] = useState<'topic' | 'ls'>('topic')
  const [lsFiles, setLsFiles] = useState<{ name: string; content: string }[]>([])
  const [topics, setTopics] = useState<ParsedTopic[]>([])
  const [selectedTopicIndices, setSelectedTopicIndices] = useState<Set<number>>(new Set())
  const [extractingTopics, setExtractingTopics] = useState(false)
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchSubjects(user.id), fetchClasses(user.id)]).then(
      ([s, c]) => { setSubjects(s); setClasses(c) }
    )
  }, [user])

  const DAILY_LIMIT = 2
  const MAX_FILES = 2
  const MAX_FILE_SIZE = 100 * 1024 // 100 KB

  async function runTopicExtraction(files: { name: string; content: string }[]) {
    setExtractingTopics(true)
    try {
      const combined = files.map((f) => f.content).join('\n\n---\n\n')
      const extracted = await extractTopics(combined)
      setTopics(extracted)
      setSelectedTopicIndices(new Set(extracted.map((_, i) => i)))
    } catch {
      setTopics([])
      setSelectedTopicIndices(new Set())
    } finally {
      setExtractingTopics(false)
    }
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, MAX_FILES - lsFiles.length)
    const errors: string[] = []

    Promise.all(
      newFiles.map(async (file) => {
        if (!file.name.endsWith('.md')) {
          errors.push(`${file.name}: Nur .md-Dateien erlaubt`)
          return null
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: Datei zu groß (max 100 KB)`)
          return null
        }
        const content = await file.text()
        return { name: file.name, content }
      })
    ).then((results) => {
      const valid = results.filter((r): r is { name: string; content: string } => r !== null)
      if (errors.length > 0) {
        setError(errors.join('. '))
      }
      if (valid.length > 0) {
        const updated = [...lsFiles, ...valid].slice(0, MAX_FILES)
        setLsFiles(updated)
        runTopicExtraction(updated)
      }
    })
  }

  function removeFile(index: number) {
    const updated = lsFiles.filter((_, i) => i !== index)
    setLsFiles(updated)
    if (updated.length > 0) {
      runTopicExtraction(updated)
    } else {
      setTopics([])
      setSelectedTopicIndices(new Set())
    }
  }

  function toggleTopic(index: number) {
    setSelectedTopicIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const isLsMode = activeTab === 'ls'
    const hasLsInput = lsFiles.length > 0 || pastedText.trim().length > 0
    const hasTopicInput = config.topic.trim().length > 0

    if (isLsMode && !hasLsInput) return
    if (!isLsMode && !hasTopicInput) return

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

      let genConfig = { ...config }

      if (isLsMode) {
        const lsContext = lsFiles.length > 0
          ? lsFiles.map((f) => f.content).join('\n\n---\n\n')
          : pastedText.trim()

        const selectedTopics = topics.length > 0
          ? topics.filter((_, i) => selectedTopicIndices.has(i)).map((t) => t.label)
          : undefined

        genConfig = {
          ...genConfig,
          topic: genConfig.topic || 'Lernsituation',
          lsContext,
          selectedGoals: selectedTopics,
        }
      }

      const result = await generateQuiz(genConfig)
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
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('topic')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'topic'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Thema eingeben
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ls')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'ls'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Aus Lernsituation
            </button>
          </div>

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

          {/* Topic tab */}
          {activeTab === 'topic' && (
            <>
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
            </>
          )}

          {/* LS tab */}
          {activeTab === 'ls' && (
            <>
              {/* File upload or text paste */}
              {!showTextFallback ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFileSelect(e.target.files)
                      e.target.value = ''
                    }}
                  />

                  {lsFiles.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOver(false)
                        handleFileSelect(e.dataTransfer.files)
                      }}
                      className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                        dragOver
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700">
                        Lernsituation hochladen
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        .md-Datei hierher ziehen oder klicken (max. 2 Dateien, je 100 KB)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lsFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                          <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                          <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {lsFiles.length < MAX_FILES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
                        >
                          + Weitere Datei hinzufügen
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowTextFallback(true)}
                    className="mt-2 text-xs text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    Kein .md-File? Text einfügen
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="pastedText" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Text einfügen
                  </label>
                  <textarea
                    id="pastedText"
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Lernziele, Unterrichtsinhalte oder beliebigen Text hier einfügen..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors resize-y"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <button
                      type="button"
                      onClick={() => { setShowTextFallback(false); setPastedText('') }}
                      className="text-xs text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      Doch lieber Datei hochladen?
                    </button>
                    <span className="text-xs text-gray-400">
                      ~{Math.ceil(pastedText.length / 4).toLocaleString()} von max ~50.000 Zeichen
                    </span>
                  </div>
                </div>
              )}

              {/* Topic extraction loading */}
              {extractingTopics && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Themenfelder werden erkannt...
                </div>
              )}

              {/* Parsed topics */}
              {!extractingTopics && topics.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Themenfelder</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleTopic(i)}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                          selectedTopicIndices.has(i)
                            ? 'bg-primary-100 text-primary-700 border border-primary-300'
                            : 'bg-gray-100 text-gray-400 border border-gray-200 line-through'
                        }`}
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Klicke auf ein Themenfeld, um es ein-/auszuschließen.</p>
                </div>
              )}

              {/* LS settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ls-questionCount" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Anzahl Fragen
                  </label>
                  <input
                    id="ls-questionCount"
                    type="number"
                    min={5}
                    max={30}
                    value={config.questionCount}
                    onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) || 5 })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="ls-difficulty" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Schwierigkeit
                  </label>
                  <select
                    id="ls-difficulty"
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
              </div>
            </>
          )}

          {/* Shared settings */}
          {activeTab === 'ls' && (
            <div>
              <label htmlFor="ls-optionCount" className="block text-sm font-medium text-gray-700 mb-1.5">
                Antwortoptionen
              </label>
              <input
                id="ls-optionCount"
                type="number"
                min={2}
                max={6}
                value={config.optionCount}
                onChange={(e) => setConfig({ ...config, optionCount: parseInt(e.target.value) || 4 })}
                className="w-full max-w-[200px] rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
              />
            </div>
          )}

          {activeTab === 'topic' && (
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
          )}

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
            disabled={generating || (activeTab === 'topic' && !config.topic.trim()) || (activeTab === 'ls' && lsFiles.length === 0 && !pastedText.trim())}
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
