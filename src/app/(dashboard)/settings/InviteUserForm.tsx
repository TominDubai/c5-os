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

export function InviteUserForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'site_staff', department: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/settings/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite user')
      setResult({ success: `Invite sent to ${form.email}` })
      setForm({ email: '', full_name: '', role: 'site_staff', department: '' })
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        + Invite User
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Invite New User</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="e.g. Mohammad Basim"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="name@concept5.ae"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
          <select
            value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          {result?.success && <p className="text-green-600 text-sm mb-2">✓ {result.success}</p>}
          {result?.error && <p className="text-red-600 text-sm mb-2">✗ {result.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
            >
              {loading ? 'Sending invite…' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setResult(null) }}
              className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
