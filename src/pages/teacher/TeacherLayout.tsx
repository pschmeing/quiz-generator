import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LayoutDashboard, Plus, BookOpen, GraduationCap, Shield } from 'lucide-react'

const navItems = [
  { to: '/teacher', label: 'Meine Tests', icon: LayoutDashboard, end: true },
  { to: '/teacher/new', label: 'Neuer Test', icon: Plus },
  { to: '/teacher/subjects', label: 'Fächer', icon: BookOpen },
  { to: '/teacher/classes', label: 'Klassen', icon: GraduationCap },
]

export default function TeacherLayout() {
  const { isAdmin } = useAuth()

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-medium transition-colors min-w-[56px] ${
      isActive
        ? 'text-primary-700'
        : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 font-sans">
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:top-16 md:bottom-0 md:left-0 md:flex md:w-64 md:flex-col md:z-40">
        <div className="flex flex-1 flex-col bg-white/80 backdrop-blur-md border-r border-white/20 shadow-lg px-4 py-6">
          <div className="mb-8 px-4">
            <h1 className="text-xl font-bold text-primary-700">teach-ai:quizzer</h1>
            <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">Lehrerbereich</p>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClasses}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={linkClasses}>
                <Shield className="h-5 w-5" />
                Admin
              </NavLink>
            )}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex md:hidden items-center justify-around bg-white/80 backdrop-blur-md border-t border-white/20 shadow-lg py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={mobileLinkClasses}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin" className={mobileLinkClasses}>
            <Shield className="h-5 w-5" />
            Admin
          </NavLink>
        )}
      </nav>
    </div>
  )
}
