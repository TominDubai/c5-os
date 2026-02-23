'use client'

import { useState } from 'react'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'operations', label: 'Operations' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'design_lead', label: 'Design Lead' },
  { value: 'designer', label: 'Designer' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'qs', label: 'QS' },
  { value: 'stores', label: 'Stores' },
  { value: 'pm', label: 'Project Manager' },
  { value: 'site_staff', label: 'Site Staff' },
  { value: 'driver', label: 'Driver' },
]

const DEPARTMENTS = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'design', label: 'Design' },
  { value: 'production', label: 'Production' },
  { value: 'projects', label: 'Projects' },
  { value: 'admin', label: 'Admin' },
]

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  operations: 'bg-purple-100 text-purple-700',
  estimator: 'bg-blue-100 text-blue-700',
  design_lead: 'bg-indigo-100 text-indigo-700',
  designer: 'bg-indigo-50 text-indigo-600',
  production_manager: 'bg-yellow-100 text-yellow-700',
  qs: 'bg-orange-100 text-orange-700',
  stores: 'bg-amber-100 text-amber-700',
  pm: 'bg-green-100 text-green-700',
  site_staff: 'bg-teal-100 text-teal-700',
  driver: 'bg-gray-100 text-gray-700',
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
  phone: string | null
}

export function UserTable({ users }: { users: User[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<User>>({})
  const [localUsers, setLocalUsers] = useState(users)

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditData({ role: user.role, department: user.department, is_active: user.is_active })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = async (userId: string) => {
    setSaving(userId)
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (!res.ok) throw new Error('Failed to save')
      setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editData } as User : u))
      setEditingId(null)
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(null)
    }
  }

  const toggleActive = async (user: User) => {
    setSaving(user.id)
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      if (!res.ok) throw new Error()
      setLocalUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    } catch {
      alert('Failed to update user')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 font-semibold text-gray-700">Name</th>
            <th className="pb-3 font-semibold text-gray-700">Email</th>
            <th className="pb-3 font-semibold text-gray-700">Role</th>
            <th className="pb-3 font-semibold text-gray-700">Department</th>
            <th className="pb-3 font-semibold text-gray-700">Status</th>
            <th className="pb-3 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {localUsers.map(user => (
            <tr key={user.id} className={`${!user.is_active ? 'opacity-50' : ''}`}>
              <td className="py-3 font-medium text-gray-900">{user.full_name}</td>
              <td className="py-3 text-gray-600">{user.email}</td>
              <td className="py-3">
                {editingId === user.id ? (
                  <select
                    value={editData.role}
                    onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLES.find(r => r.value === user.role)?.label || user.role}
                  </span>
                )}
              </td>
              <td className="py-3">
                {editingId === user.id ? (
                  <select
                    value={editData.department || ''}
                    onChange={e => setEditData(d => ({ ...d, department: e.target.value || null }))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-600 capitalize">{user.department || '—'}</span>
                )}
              </td>
              <td className="py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  {editingId === user.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(user.id)}
                        disabled={saving === user.id}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        {saving === user.id ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(user)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={saving === user.id}
                        className={`${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'} disabled:opacity-50`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {localUsers.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400">No users found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
