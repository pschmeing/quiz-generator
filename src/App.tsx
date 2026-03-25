import { useState } from 'react'
import type { Quiz, QuizConfig, PublishedQuiz } from './types'
import { generateQuiz } from './api'
import QuizInput from './components/QuizInput'
import QuizReview from './components/QuizReview'
import StudentView from './components/StudentView'
import ExportView from './components/ExportView'
import PublishModal from './components/PublishModal'
import TeacherDashboard from './components/TeacherDashboard'
import StudentLogin from './components/StudentLogin'
import OnlineStudentView from './components/OnlineStudentView'

type View = 'input' | 'loading' | 'review' | 'student' | 'export' | 'dashboard' | 'teacher-login' | 'student-login' | 'online-quiz'

const TEACHER_PASSWORD = 'test2026'

function App() {
  const [view, setView] = useState<View>('input')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportMode, setExportMode] = useState<'student' | 'teacher'>('student')
  const [showPublish, setShowPublish] = useState(false)
  const [onlineQuiz, setOnlineQuiz] = useState<PublishedQuiz | null>(null)
  const [studentName, setStudentName] = useState('')
  const [teacherAuth, setTeacherAuth] = useState(false)
  const [teacherPw, setTeacherPw] = useState('')
  const [teacherPwError, setTeacherPwError] = useState(false)

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
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1
              className="text-2xl font-bold cursor-pointer"
              onClick={() => setView('input')}
            >
              Quiz Generator
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('student-login')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              Test beitreten
            </button>
            <button
              onClick={() => {
                if (teacherAuth) {
                  setView('dashboard')
                } else {
                  setTeacherPw('')
                  setTeacherPwError(false)
                  setView('teacher-login')
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
            >
              Dashboard
            </button>
          </div>
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
            onPublish={() => setShowPublish(true)}
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

        {view === 'teacher-login' && (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setView('input')}
              className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center gap-1"
            >
              &larr; Zurück
            </button>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Lehrer-Zugang</h3>
              <p className="text-sm text-slate-500 mb-4">
                Bitte Passwort eingeben, um das Dashboard zu öffnen.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (teacherPw === TEACHER_PASSWORD) {
                    setTeacherAuth(true)
                    setTeacherPwError(false)
                    setView('dashboard')
                  } else {
                    setTeacherPwError(true)
                  }
                }}
                className="space-y-4"
              >
                <input
                  type="password"
                  value={teacherPw}
                  onChange={(e) => { setTeacherPw(e.target.value); setTeacherPwError(false) }}
                  placeholder="Passwort"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                  autoFocus
                />
                {teacherPwError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    Falsches Passwort
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!teacherPw.trim()}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anmelden
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <TeacherDashboard onBack={() => setView('input')} />
        )}

        {view === 'student-login' && (
          <StudentLogin
            onStart={(q, name) => {
              setOnlineQuiz(q)
              setStudentName(name)
              setView('online-quiz')
            }}
            onBack={() => setView('input')}
          />
        )}

        {view === 'online-quiz' && onlineQuiz && (
          <OnlineStudentView
            quiz={onlineQuiz}
            studentName={studentName}
            onFinished={() => setView('input')}
          />
        )}
      </main>

      {showPublish && quiz && (
        <PublishModal
          quiz={quiz}
          onClose={() => setShowPublish(false)}
          onPublished={() => {}}
        />
      )}
    </div>
  )
}

export default App
