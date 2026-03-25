import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchSubjects, createSubject, updateSubject, deleteSubject } from '../../db'
import type { Subject } from '../../types'
import { Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react'

export default function SubjectsPage() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadSubjects()
  }, [user])

  async function loadSubjects() {
    if (!user) return
    try {
      const data = await fetchSubjects(user.id)
      setSubjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !user) return
    setError(null)
    try {
      await createSubject(newName, user.id)
      setNewName('')
      await loadSubjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setError(null)
    try {
      await updateSubject(id, editName)
      setEditingId(null)
      await loadSubjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Fach "${name}" wirklich löschen? Tests behalten das Fach nicht mehr.`)) return
    setError(null)
    try {
      await deleteSubject(id)
      await loadSubjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id)
    setEditName(subject.name)
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fächer verwalten</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Add form */}
      <form onSubmit={handleCreate} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neues Fach..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
      </form>

      {/* List */}
      {subjects.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Noch keine Fächer angelegt.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg divide-y divide-gray-100">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center gap-3 px-5 py-3">
              {editingId === subject.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(subject.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button
                    onClick={() => handleUpdate(subject.id)}
                    className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-900">{subject.name}</span>
                  <button
                    onClick={() => startEdit(subject)}
                    className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id, subject.name)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
