import { useState } from 'react'
import type { Quiz, QuizConfig } from './types'
import { generateQuiz } from './api'
import QuizInput from './components/QuizInput'
import QuizReview from './components/QuizReview'
import StudentView from './components/StudentView'
import ExportView from './components/ExportView'

type View = 'input' | 'loading' | 'review' | 'student' | 'export'

function App() {
  const [view, setView] = useState<View>('input')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportMode, setExportMode] = useState<'student' | 'teacher'>('student')

  async function handleGenerate(config: QuizConfig) {
    setView('loading')
    setError(null)
    try {
      const result = await generateQuiz(config)
      setQuiz(result)
      setView('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ein Fehler ist aufgetreten.')
      setView('input')
    }
  }

  function handleExport(mode: 'student' | 'teacher') {
    setExportMode(mode)
    setView('export')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-600 text-white py-4 shadow-md no-print">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h1 className="text-2xl font-bold">Quiz Generator</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 print-container">
        {view === 'input' && (
          <QuizInput onGenerate={handleGenerate} error={error} />
        )}

        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-lg text-slate-600">Quiz wird generiert...</p>
          </div>
        )}

        {view === 'review' && quiz && (
          <QuizReview
            quiz={quiz}
            onStartQuiz={() => setView('student')}
            onExport={handleExport}
            onRegenerate={() => setView('input')}
          />
        )}

        {view === 'student' && quiz && (
          <StudentView quiz={quiz} onBack={() => setView('review')} />
        )}

        {view === 'export' && quiz && (
          <ExportView
            quiz={quiz}
            mode={exportMode}
            onBack={() => setView('review')}
          />
        )}
      </main>
    </div>
  )
}

export default App
