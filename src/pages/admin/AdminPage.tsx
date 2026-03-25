import { useState, useEffect } from 'react'
import { fetchAllTeachers, approveTeacher, revokeTeacher, makeAdmin, revokeAdmin } from '../../db'
import { useAuth } from '../../contexts/AuthContext'
import { Shield, ShieldPlus, ShieldMinus, Check, X, Users } from 'lucide-react'

interface Teacher {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'teacher'
  approved: boolean
  created_at: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function loadTeachers() {
    setLoading(true)
    try {
      const data = await fetchAllTeachers()
      setTeachers((data ?? []) as Teacher[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeachers()
  }, [])

  async function handleApprove(teacherId: string) {
    setActionLoading(teacherId)
    await approveTeacher(teacherId)
    await loadTeachers()
    setActionLoading(null)
  }

  async function handleRevoke(teacherId: string) {
    setActionLoading(teacherId)
    await revokeTeacher(teacherId)
    await loadTeachers()
    setActionLoading(null)
  }

  async function handleMakeAdmin(teacherId: string) {
    if (!confirm('Diesen Lehrer wirklich zum Admin machen?')) return
    setActionLoading(teacherId)
    await makeAdmin(teacherId)
    await loadTeachers()
    setActionLoading(null)
  }

  async function handleRevokeAdmin(teacherId: string) {
    if (!confirm('Admin-Rechte wirklich entziehen?')) return
    setActionLoading(teacherId)
    await revokeAdmin(teacherId)
    await loadTeachers()
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Verwaltung</h1>
      </div>

      {teachers.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Keine Lehrer registriert.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg divide-y divide-gray-100">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="px-4 sm:px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{teacher.display_name ?? teacher.email}</p>
                  {teacher.display_name && (
                    <p className="text-sm text-gray-500 truncate">{teacher.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    teacher.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {teacher.role === 'admin' ? 'Admin' : 'Lehrer'}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    teacher.approved
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {teacher.approved ? 'Freigeschaltet' : 'Wartend'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {teacher.role !== 'admin' && (
                  teacher.approved ? (
                    <button
                      onClick={() => handleRevoke(teacher.id)}
                      disabled={actionLoading === teacher.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Sperren
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApprove(teacher.id)}
                      disabled={actionLoading === teacher.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Freischalten
                    </button>
                  )
                )}
                {teacher.id !== user?.id && (
                  teacher.role === 'admin' ? (
                    <button
                      onClick={() => handleRevokeAdmin(teacher.id)}
                      disabled={actionLoading === teacher.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    >
                      <ShieldMinus className="h-3.5 w-3.5" />
                      Admin entziehen
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMakeAdmin(teacher.id)}
                      disabled={actionLoading === teacher.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
                    >
                      <ShieldPlus className="h-3.5 w-3.5" />
                      Zum Admin
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
