import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: React.ReactNode
  requireTeacher?: boolean
  requireAdmin?: boolean
  requireApproved?: boolean
}

export default function ProtectedRoute({ children, requireTeacher, requireAdmin, requireApproved }: Props) {
  const { user, loading, isTeacher, isAdmin, isApproved } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireTeacher && !isTeacher) return <Navigate to="/" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/teacher" replace />
  if (requireApproved && !isApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-8 text-center max-w-md shadow-lg">
          <h2 className="text-xl font-bold text-primary-900 mb-2">Warte auf Freischaltung</h2>
          <p className="text-primary-700">
            Dein Account muss von einem Administrator freigeschaltet werden, bevor du Tests erstellen kannst.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
