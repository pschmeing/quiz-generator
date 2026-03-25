import type { PublishedQuiz, QuizSession } from '../types'

interface Props {
  quiz: PublishedQuiz
  sessions: QuizSession[]
}

export default function ResultsExport({ quiz, sessions }: Props) {
  function exportCSV() {
    const header = ['Name', 'Punkte', 'Gesamt', 'Prozent', 'Zeitpunkt']
    const rows = sessions.map((s) => [
      s.student_name,
      String(s.score),
      String(s.total),
      `${Math.round((s.score / s.total) * 100)}%`,
      new Date(s.completed_at).toLocaleString('de-DE'),
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quiz.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, '')}_Ergebnisse.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportDetailedCSV() {
    const questions = quiz.questions
    const header = [
      'Name',
      'Punkte',
      'Gesamt',
      'Prozent',
      ...questions.map((q) => `Frage ${q.id}: ${q.question.slice(0, 50)}`),
      'Zeitpunkt',
    ]

    const rows = sessions.map((s) => {
      const answerMap = new Map(s.answers.map((a) => [a.question_id, a]))
      return [
        s.student_name,
        String(s.score),
        String(s.total),
        `${Math.round((s.score / s.total) * 100)}%`,
        ...questions.map((q) => {
          const a = answerMap.get(q.id)
          if (!a) return '-'
          return a.is_correct ? `${a.selected} (richtig)` : `${a.selected} (falsch, richtig: ${a.correct})`
        }),
        new Date(s.completed_at).toLocaleString('de-DE'),
      ]
    })

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quiz.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, '')}_Detailauswertung.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-3 mb-6">
      <button
        onClick={exportCSV}
        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
      >
        CSV Export (Übersicht)
      </button>
      <button
        onClick={exportDetailedCSV}
        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
      >
        CSV Export (Detail)
      </button>
    </div>
  )
}
