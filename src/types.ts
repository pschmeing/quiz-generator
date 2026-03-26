export interface QuizQuestion {
  id: number
  question: string
  options: Record<string, string>
  correct: string | string[]
  type: 'single' | 'multiple'
  explanation: string
}

export interface Quiz {
  title: string
  questions: QuizQuestion[]
}

export type Difficulty = 'Einfach' | 'Mittel' | 'Schwer'
export type Audience = 'Berufskolleg' | 'Gymnasium' | 'Universität'
export type QuizStatus = 'draft' | 'published' | 'closed' | 'archived'

export interface Subject {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface SchoolClass {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface QuizConfig {
  topic: string
  difficulty?: Difficulty
  audience?: Audience
  questionCount?: number
  optionCount?: number
  defaultType?: 'single' | 'multiple'
  lsContext?: string
  selectedGoals?: string[]
}

export interface PublishedQuiz {
  id: string
  title: string
  questions: QuizQuestion[]
  access_code: string
  status: QuizStatus
  created_by: string | null
  created_at: string
  subject_id?: string | null
  class_id?: string | null
  subject?: Subject | null
  class?: SchoolClass | null
}

export interface QuizSession {
  id: string
  quiz_id: string
  student_name: string
  student_email?: string
  score: number
  total: number
  answers: StudentAnswer[]
  completed_at: string
}

export interface StudentAnswer {
  question_id: number
  selected: string | string[]
  correct: string | string[]
  is_correct: boolean
}
