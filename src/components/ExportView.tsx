import type { Quiz } from '../types'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

interface Props {
  quiz: Quiz
  mode: 'student' | 'teacher'
  onBack: () => void
}

export default function ExportView({ quiz, mode, onBack }: Props) {
  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <div className="flex gap-3 mb-6 no-print">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Drucken / PDF speichern
        </button>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Zurück
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">{quiz.title}</h2>
          <p className="text-slate-500 mt-1">
            {mode === 'teacher' ? 'Lehrerlösung' : 'Quiz'} &middot; {quiz.questions.length} Fragen
          </p>
        </div>

        <div className="space-y-6">
          {quiz.questions.map((q) => (
            <div key={q.id} className="border-b border-slate-100 pb-5 last:border-b-0">
              <p className="font-medium text-slate-800 mb-3">
                {q.id}. {q.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OPTION_KEYS.map((key) => (
                  <div
                    key={key}
                    className={`px-3 py-2 rounded text-sm ${
                      mode === 'teacher' && key === q.correct
                        ? 'bg-green-50 border border-green-400 text-green-800 font-medium'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="font-medium">{key})</span> {q.options[key]}
                  </div>
                ))}
              </div>
              {mode === 'teacher' && (
                <p className="mt-2 text-sm text-slate-500 italic">
                  {q.explanation}
                </p>
              )}
              {mode === 'student' && (
                <div className="mt-2 text-sm text-slate-400">
                  Antwort: _____
                </div>
              )}
            </div>
          ))}
        </div>

        {mode === 'student' && (
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-sm text-slate-400">
            Name: __________________________ &nbsp;&nbsp; Datum: ______________
          </div>
        )}
      </div>
    </div>
  )
}
