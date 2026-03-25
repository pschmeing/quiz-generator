import { supabase } from './supabase'
import type { Quiz, PublishedQuiz, QuizSession, QuizStatus, StudentAnswer } from './types'

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// --- Quiz CRUD ---

export async function saveQuizDraft(quiz: Quiz, userId: string): Promise<PublishedQuiz> {
  const accessCode = generateAccessCode()
  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      title: quiz.title,
      questions: quiz.questions,
      access_code: accessCode,
      status: 'draft' as QuizStatus,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw new Error(`Fehler beim Speichern: ${error.message}`)
  return data as PublishedQuiz
}

export async function publishQuiz(quiz: Quiz, userId: string): Promise<PublishedQuiz> {
  const accessCode = generateAccessCode()
  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      title: quiz.title,
      questions: quiz.questions,
      access_code: accessCode,
      status: 'published' as QuizStatus,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw new Error(`Fehler beim Veröffentlichen: ${error.message}`)
  return data as PublishedQuiz
}

export async function updateQuiz(quizId: string, updates: Partial<Pick<PublishedQuiz, 'title' | 'questions' | 'status'>>): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .update(updates)
    .eq('id', quizId)

  if (error) throw new Error(`Fehler beim Aktualisieren: ${error.message}`)
}

export async function publishDraft(quizId: string): Promise<PublishedQuiz> {
  const { data, error } = await supabase
    .from('quizzes')
    .update({ status: 'published' as QuizStatus })
    .eq('id', quizId)
    .select()
    .single()

  if (error) throw new Error(`Fehler beim Veröffentlichen: ${error.message}`)
  return data as PublishedQuiz
}

export async function closeQuiz(quizId: string): Promise<void> {
  await updateQuiz(quizId, { status: 'closed' })
}

export async function archiveQuiz(quizId: string): Promise<void> {
  await updateQuiz(quizId, { status: 'archived' })
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)

  if (error) throw new Error(`Fehler beim Löschen: ${error.message}`)
}

// --- Quiz Queries ---

export async function fetchQuizById(quizId: string): Promise<PublishedQuiz | null> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single()

  if (error) return null
  return data as PublishedQuiz
}

export async function fetchQuizByCode(code: string): Promise<PublishedQuiz | null> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('access_code', code.toUpperCase().trim())
    .eq('status', 'published')
    .single()

  if (error) return null
  return data as PublishedQuiz
}

export async function fetchTeacherQuizzes(userId: string): Promise<PublishedQuiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Fehler beim Laden: ${error.message}`)
  return (data ?? []) as PublishedQuiz[]
}

// --- Sessions ---

export async function submitQuizSession(
  quizId: string,
  studentName: string,
  answers: StudentAnswer[],
  score: number,
  total: number,
  studentEmail?: string,
): Promise<QuizSession> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      quiz_id: quizId,
      student_name: studentName,
      student_email: studentEmail,
      score,
      total,
      answers,
    })
    .select()
    .single()

  if (error) throw new Error(`Fehler beim Speichern: ${error.message}`)
  return data as QuizSession
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

export async function fetchSessionCount(quizId: string): Promise<{ total: number; completed: number }> {
  const { count, error } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)

  if (error) return { total: 0, completed: 0 }
  return { total: count ?? 0, completed: count ?? 0 }
}

// --- Rate Limiting ---

export async function countTodayQuizzes(userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from('quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)
    .gte('created_at', today.toISOString())

  if (error) return 0
  return count ?? 0
}

// --- Admin ---

export async function fetchAllTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Fehler: ${error.message}`)
  return data
}

export async function approveTeacher(teacherId: string) {
  const { error } = await supabase
    .from('teachers')
    .update({ approved: true })
    .eq('id', teacherId)

  if (error) throw new Error(`Fehler: ${error.message}`)
}

export async function revokeTeacher(teacherId: string) {
  const { error } = await supabase
    .from('teachers')
    .update({ approved: false })
    .eq('id', teacherId)

  if (error) throw new Error(`Fehler: ${error.message}`)
}

export async function makeAdmin(teacherId: string) {
  const { error } = await supabase
    .from('teachers')
    .update({ role: 'admin' })
    .eq('id', teacherId)

  if (error) throw new Error(`Fehler: ${error.message}`)
}

export async function revokeAdmin(teacherId: string) {
  const { error } = await supabase
    .from('teachers')
    .update({ role: 'teacher' })
    .eq('id', teacherId)

  if (error) throw new Error(`Fehler: ${error.message}`)
}
