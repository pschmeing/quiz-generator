import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchQuizById, updateQuiz, publishDraft } from '../../db'
import type { PublishedQuiz, QuizQuestion } from '../../types'
import { Plus, Trash2, Save, Send, GripVertical, ArrowLeft } from 'lucide-react'

export default function QuizEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<PublishedQuiz | null>(null)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchQuizById(id).then((q) => {
      if (q) {
        setQuiz(q)
        setTitle(q.title)
        setQuestions(q.questions)
      }
      setLoading(false)
    })
  }, [id])

  function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)))
  }

  function updateOption(qIndex: number, optKey: string, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: { ...q.options, [optKey]: value } } : q
      )
    )
  }

  function toggleCorrect(qIndex: number, optKey: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        if (q.type === 'single') {
          return { ...q, correct: optKey }
        }
        // Multiple choice
        const currentCorrect = Array.isArray(q.correct) ? q.correct : [q.correct]
        const newCorrect = currentCorrect.includes(optKey)
          ? currentCorrect.filter((c) => c !== optKey)
          : [...currentCorrect, optKey]
        return { ...q, correct: newCorrect.length > 0 ? newCorrect : currentCorrect }
      })
    )
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function addQuestion() {
    const newId = Math.max(0, ...questions.map((q) => q.id)) + 1
    setQuestions((prev) => [
      ...prev,
      {
        id: newId,
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        correct: 'A',
        type: 'single',
        explanation: '',
      },
    ])
  }

  async function handleSave() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await updateQuiz(id, { title, questions })
      navigate(`/teacher/quiz/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await updateQuiz(id, { title, questions })
      await publishDraft(id)
      navigate(`/teacher/quiz/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Veröffentlichen')
    } finally {
      setSaving(false)
    }
  }

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
      </div>
    )
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate(`/teacher/quiz/${id}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </button>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-primary-500 outline-none w-full pb-1 transition-colors"
          placeholder="Titel eingeben..."
        />
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, qIndex) => (
          <div
            key={q.id}
            className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-5"
          >
            <div className="flex items-start gap-3">
              <GripVertical className="h-5 w-5 text-gray-300 mt-2 flex-shrink-0 cursor-grab" />
              <div className="flex-1 space-y-4">
                {/* Question text */}
                <div className="flex items-start gap-3">
                  <span className="text-sm font-bold text-primary-600 mt-2">{qIndex + 1}.</span>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                    rows={2}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-none transition-colors"
                    placeholder="Frage eingeben..."
                  />
                </div>

                {/* Type toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(qIndex, {
                        type: q.type === 'single' ? 'multiple' : 'single',
                        correct: q.type === 'single'
                          ? [Array.isArray(q.correct) ? q.correct[0] : q.correct]
                          : Array.isArray(q.correct)
                            ? q.correct[0]
                            : q.correct,
                      })
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      q.type === 'multiple' ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        q.type === 'multiple' ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-500">
                    {q.type === 'single' ? 'Single Choice' : 'Multiple Choice'}
                  </span>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(q.options).map(([key, value]) => {
                    const isCorrect = Array.isArray(q.correct)
                      ? q.correct.includes(key)
                      : q.correct === key
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(qIndex, key)}
                          className={`flex-shrink-0 h-5 w-5 rounded-${q.type === 'single' ? 'full' : 'md'} border-2 flex items-center justify-center transition-colors ${
                            isCorrect
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isCorrect && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className="text-xs font-bold text-gray-400 w-4">{key}</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateOption(qIndex, key, e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                          placeholder={`Option ${key}`}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
                  placeholder="Erklärung (optional)"
                />
              </div>

              {/* Delete button */}
              <button
                onClick={() => removeQuestion(qIndex)}
                disabled={questions.length <= 1}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                title="Frage löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add question button */}
      <button
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors mb-8"
      >
        <Plus className="h-4 w-4" />
        Frage hinzufügen
      </button>

      {/* Bottom actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(`/teacher/quiz/${id}`)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          Speichern
        </button>
        {quiz.status === 'draft' && (
          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            Veröffentlichen
          </button>
        )}
      </div>
    </div>
  )
}
