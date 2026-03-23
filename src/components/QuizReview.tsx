import type { Quiz } from '../types'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

interface Props {
  quiz: Quiz
  onStartQuiz: () => void
  onExport: (mode: 'student' | 'teacher') => void
  onRegenerate: () => void
}

export default function QuizReview({ quiz, onStartQuiz, onExport, onRegenerate }: Props) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{quiz.title}</h2>
        <span className="text-sm text-slate-500">{quiz.questions.length} Fragen</span>
      </div>

      <div className="space-y-4 mb-8">
        {quiz.questions.map((q) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="font-medium text-slate-800 mb-3">
              {q.id}. {q.question}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OPTION_KEYS.map((key) => (
                <div
                  key={key}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    key === q.correct
                      ? 'bg-green-50 border-2 border-green-400 text-green-800 font-medium'
                      : 'bg-slate-50 border border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-medium">{key})</span> {q.options[key]}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500 italic">
              {q.explanation}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-center sticky bottom-4">
        <button
          onClick={onStartQuiz}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Quiz starten
        </button>
        <button
          onClick={() => onExport('student')}
          className="bg-white text-slate-700 px-6 py-3 rounded-lg font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Schülerversion
        </button>
        <button
          onClick={() => onExport('teacher')}
          className="bg-white text-slate-700 px-6 py-3 rounded-lg font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Lehrerlösung
        </button>
        <button
          onClick={onRegenerate}
          className="bg-white text-slate-700 px-6 py-3 rounded-lg font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Neu generieren
        </button>
      </div>
    </div>
  )
}
