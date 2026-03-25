import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Briefcase, Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'student' | 'teacher'

export default function Login() {
  const { user, isTeacher, loading: authLoading, signIn, signUp, sendMagicLink } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('student')
  const [isSignup, setIsSignup] = useState(false)
  const [studentMode, setStudentMode] = useState<'magic' | 'register'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (user && isTeacher) {
      navigate('/teacher')
    } else if (user) {
      navigate('/')
    }
  }, [user, isTeacher, authLoading, navigate])

  function resetMessages() {
    setError(null)
    setSuccess(null)
  }

  async function handleStudentSubmit(e: FormEvent) {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    if (studentMode === 'magic') {
      const { error } = await sendMagicLink(email)
      if (error) {
        setError(error)
      } else {
        setSuccess('Link wurde gesendet! Schau in deinem Postfach nach.')
      }
    } else {
      if (isSignup) {
        const { error } = await signUp(email, password)
        if (error) {
          setError(error)
        } else {
          setSuccess('Registrierung erfolgreich! Bestaetige deine E-Mail.')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) setError(error)
      }
    }
    setLoading(false)
  }

  async function handleTeacherSubmit(e: FormEvent) {
    e.preventDefault()
    resetMessages()
    setLoading(true)
    if (isSignup) {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error)
      } else {
        setSuccess('Registrierung erfolgreich! Bitte bestaetige deine E-Mail.')
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error)
      }
    }
    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cyan-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyan-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-primary-900 text-center mb-2">
          Quiz beitreten
        </h1>
        <p className="text-sm text-primary-900/60 text-center mb-6">
          Melde dich an, um loszulegen
        </p>

        {/* Mode Toggle */}
        <div className="flex bg-cyan-100 rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('student')
              resetMessages()
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              mode === 'student'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-primary-900/70 hover:text-primary-900'
            }`}
          >
            <GraduationCap size={18} />
            Schueler
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('teacher')
              resetMessages()
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              mode === 'teacher'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-primary-900/70 hover:text-primary-900'
            }`}
          >
            <Briefcase size={18} />
            Lehrer
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Student Form */}
        {mode === 'student' && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <label htmlFor="student-email" className="block text-sm font-medium text-primary-900 mb-1">
                E-Mail
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-900/40" />
                <input
                  id="student-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:border-primary-600 text-sm text-primary-900 placeholder:text-gray-400 transition-all"
                />
              </div>
            </div>

            {studentMode === 'register' && (
              <div>
                <label htmlFor="student-password" className="block text-sm font-medium text-primary-900 mb-1">
                  Passwort
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-900/40" />
                  <input
                    id="student-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:border-primary-600 text-sm text-primary-900 placeholder:text-gray-400 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (studentMode === 'magic' ? 'Wird gesendet...' : (isSignup ? 'Wird registriert...' : 'Wird angemeldet...'))
                : (studentMode === 'magic' ? 'Bestaetigungslink senden' : (isSignup ? 'Registrieren' : 'Anmelden'))}
              {!loading && <ArrowRight size={16} />}
            </button>

            {studentMode === 'magic' ? (
              <p className="text-sm text-center text-primary-900/60">
                Oder{' '}
                <button type="button" onClick={() => { setStudentMode('register'); resetMessages() }} className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                  mit Passwort registrieren
                </button>
              </p>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-sm text-primary-900/60">
                <p>
                  {isSignup ? 'Schon ein Konto?' : 'Noch kein Konto?'}{' '}
                  <button type="button" onClick={() => { setIsSignup(!isSignup); resetMessages() }} className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                    {isSignup ? 'Anmelden' : 'Registrieren'}
                  </button>
                </p>
                <button type="button" onClick={() => { setStudentMode('magic'); resetMessages() }} className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2">
                  Magic Link nutzen
                </button>
              </div>
            )}
          </form>
        )}

        {/* Teacher Form */}
        {mode === 'teacher' && (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label htmlFor="teacher-email" className="block text-sm font-medium text-primary-900 mb-1">
                E-Mail
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-900/40" />
                <input
                  id="teacher-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lehrer@schule.de"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:border-primary-600 text-sm text-primary-900 placeholder:text-gray-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="teacher-password" className="block text-sm font-medium text-primary-900 mb-1">
                Passwort
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-900/40" />
                <input
                  id="teacher-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:border-primary-600 text-sm text-primary-900 placeholder:text-gray-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (isSignup ? 'Wird registriert...' : 'Wird angemeldet...')
                : (isSignup ? 'Registrieren' : 'Anmelden')}
              {!loading && <ArrowRight size={16} />}
            </button>

            <p className="text-sm text-center text-primary-900/60">
              {isSignup ? 'Schon ein Konto?' : 'Noch kein Konto?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup)
                  resetMessages()
                }}
                className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2"
              >
                {isSignup ? 'Anmelden' : 'Registrieren'}
              </button>
            </p>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-medium text-primary-900/40 tracking-wider">ODER</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Guest Link */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-gray-200 hover:border-primary-600/30 hover:bg-primary-600/5 text-primary-900/70 hover:text-primary-900 font-medium rounded-lg text-sm transition-all"
        >
          Ohne Anmeldung beitreten
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
