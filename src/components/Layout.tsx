import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, GraduationCap, LayoutDashboard } from 'lucide-react'

export default function Layout() {
  const { user, teacher, isTeacher, signOut } = useAuth()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isTeacherArea = location.pathname.startsWith('/teacher') || location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-primary-50 font-sans">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-primary-100 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <GraduationCap className="w-7 h-7 text-primary-600 group-hover:text-primary-700 transition-colors" />
            <span className="text-lg font-bold text-primary-900">Quiz Generator</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-3">
            {/* In teacher area: show "Test beitreten" link */}
            {isTeacherArea && (
              <Link
                to="/"
                className="px-3 sm:px-4 py-2.5 text-sm font-medium text-primary-700 hover:text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
              >
                Test beitreten
              </Link>
            )}

            {/* On home / other pages: show Dashboard link */}
            {!isTeacherArea && isTeacher && (
              <Link
                to="/teacher"
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-sm text-primary-600 hidden sm:block max-w-[150px] truncate">
                  {teacher?.display_name ?? user.email}
                </span>
                <button
                  onClick={signOut}
                  className="p-2.5 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors cursor-pointer"
                  title="Abmelden"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : !isHome ? (
              <Link
                to="/login"
                className="px-3 sm:px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Anmelden
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 print-container">
        <Outlet />
      </main>
    </div>
  )
}
