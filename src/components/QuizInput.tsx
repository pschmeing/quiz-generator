import { useState } from 'react'
import type { QuizConfig, Difficulty, Audience } from '../types'

const DIFFICULTIES: Difficulty[] = ['Einfach', 'Mittel', 'Schwer']
const AUDIENCES: Audience[] = ['Berufskolleg', 'Gymnasium', 'Universität']

interface Props {
  onGenerate: (config: QuizConfig) => void
  error: string | null
}

export default function QuizInput({ onGenerate, error }: Props) {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [audience, setAudience] = useState<Audience | ''>('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    onGenerate({
      topic: topic.trim(),
      difficulty: difficulty || undefined,
      audience: audience || undefined,
    })
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          Quiz erstellen
        </h2>
        <p className="text-slate-500">
          Gib ein Thema ein und lass ein Quiz mit 10 Fragen generieren.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1">
            Thema eingeben
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="z.B. Photosynthese, Zweiter Weltkrieg, Python Grundlagen..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 mb-1">
              Schwierigkeitsgrad
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 bg-white"
            >
              <option value="">Optional</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-slate-700 mb-1">
              Zielgruppe
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience | '')}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 bg-white"
            >
              <option value="">Optional</option>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!topic.trim()}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Quiz generieren
        </button>
      </form>
    </div>
  )
}
