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

export interface PublishedQuiz {
  id: string
  title: string
  questions: QuizQuestion[]
  access_code: string
  created_at: string
}

export interface QuizSession {
  id: string
  quiz_id: string
  student_name: string
  score: number
  total: number
  answers: StudentAnswer[]
  completed_at: string
}

export interface StudentAnswer {
  question_id: number
  selected: string
  correct: string
  is_correct: boolean
}
