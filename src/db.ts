import { supabase } from './supabase'
import type { Quiz, PublishedQuiz, QuizSession, StudentAnswer } from './types'

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function publishQuiz(quiz: Quiz, teacherPassword: string): Promise<PublishedQuiz> {
  const accessCode = generateAccessCode()

  const { data: hash, error: hashError } = await supabase
    .rpc('hash_password', { password: teacherPassword })

  if (hashError) throw new Error(`Fehler beim Hashen: ${hashError.message}`)

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      title: quiz.title,
      questions: quiz.questions,
      access_code: accessCode,
      teacher_password_hash: hash,
    })
    .select()
    .single()

  if (error) throw new Error(`Fehler beim Veröffentlichen: ${error.message}`)
  return data as PublishedQuiz
}

export async function fetchQuizByCode(code: string): Promise<PublishedQuiz | null> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('access_code', code.toUpperCase().trim())
    .single()

  if (error) return null
  return data as PublishedQuiz
}

export async function submitQuizSession(
  quizId: string,
  studentName: string,
  answers: StudentAnswer[],
  score: number,
  total: number
): Promise<QuizSession> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      quiz_id: quizId,
      student_name: studentName,
      score,
      total,
      answers,
    })
    .select()
    .single()

  if (error) throw new Error(`Fehler beim Speichern: ${error.message}`)
  return data as QuizSession
}

export async function fetchPublishedQuizzes(): Promise<PublishedQuiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Fehler beim Laden: ${error.message}`)
  return (data ?? []) as PublishedQuiz[]
}

export async function fetchSessionsForQuiz(accessCode: string, password: string): Promise<QuizSession[]> {
  const { data, error } = await supabase
    .rpc('get_quiz_results', { p_access_code: accessCode, p_password: password })

  if (error) throw new Error(`Fehler: ${error.message}`)
  return (data ?? []) as QuizSession[]
}

export async function fetchSessionsByQuizId(quizId: string): Promise<QuizSession[]> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('completed_at', { ascending: false })

  if (error) throw new Error(`Fehler beim Laden: ${error.message}`)
  return (data ?? []) as QuizSession[]
}
