export interface QuizQuestion {
  id: number
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  correct: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export interface Quiz {
  title: string
  questions: QuizQuestion[]
}

export type Difficulty = 'Einfach' | 'Mittel' | 'Schwer'
export type Audience = 'Berufskolleg' | 'Gymnasium' | 'Universität'

export interface QuizConfig {
  topic: string
  difficulty?: Difficulty
  audience?: Audience
}
