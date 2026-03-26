import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface TeacherProfile {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'teacher'
  approved: boolean
}

interface AuthState {
  user: User | null
  session: Session | null
  teacher: TeacherProfile | null
  loading: boolean
  profileLoading: boolean
  isTeacher: boolean
  isAdmin: boolean
  isApproved: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  sendMagicLink: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  async function fetchTeacherProfile(userId: string) {
    setProfileLoading(true)
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', userId)
      .single()
    setTeacher(data as TeacherProfile | null)
    setProfileLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTeacherProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTeacherProfile(session.user.id)
      } else {
        setTeacher(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setTeacher(null)
  }

  async function sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  const isTeacher = teacher?.role === 'teacher' || teacher?.role === 'admin'
  const isAdmin = teacher?.role === 'admin'
  const isApproved = teacher?.approved === true

  return (
    <AuthContext.Provider value={{
      user, session, teacher, loading, profileLoading,
      isTeacher, isAdmin, isApproved,
      signIn, signUp, signOut, sendMagicLink,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
