'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SnagItem {
  id: string
  snag_number: string
  description: string
  severity: 'minor' | 'major' | 'critical'
  status: string
  location: string | null
  created_at: string
  projects: { id: string; project_code: string; name: string } | null
}

interface Props {
  initialSnags: SnagItem[]
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  major: 'bg-orange-100 text-orange-700 border-orange-200',
  minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

export default function SnagSection({ initialSnags }: Props) {
  const supabase = createClient()
  const [snags, setSnags] = useState<SnagItem[]>(initialSnags)
  const [fixing, setFixing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'major' | 'minor'>('all')
  const [showRaise, setShowRaise] = useState(false)

  const markFixed = async (snagId: string) => {
    setFixing(snagId)
    await supabase
      .from('snags')
      .update({ status: 'fixed', fixed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', snagId)
    setSnags(prev => prev.filter(s => s.id !== snagId))
    setFixing(null)
  }

  const counts = {
    critical: snags.filter(s => s.severity === 'critical').length,
    major: snags.filter(s => s.severity === 'major').length,
    minor: snags.filter(s => s.severity === 'minor').length,
  }

  const filtered = filter === 'all' ? snags : snags.filter(s => s.severity === filter)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900">
            Open Snags
            {snags.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">({snags.length})</span>
            )}
          </h2>
          <div className="flex gap-1.5">
            {(['all', 'critical', 'major', 'minor'] as const).map(f => {
              const label = f === 'all' ? `All (${snags.length})` : `${f} (${counts[f]})`
              const active = filter === f
              const accentClass =
                f === 'critical' && active ? 'bg-red-600 text-white border-red-600' :
                f === 'major' && active ? 'bg-orange-500 text-white border-orange-500' :
                f === 'minor' && active ? 'bg-yellow-500 text-white border-yellow-500' :
                active ? 'bg-gray-800 text-white border-gray-800' :
                'border-gray-300 text-gray-600 hover:border-gray-400'
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${accentClass}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        <button
          onClick={() => setShowRaise(true)}
          className="bg-red-600 text-white text-sm px-4 py-1.5 rounded hover:bg-red-700"
        >
          + Raise Snag
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          {snags.length === 0 ? '✓ No open snags' : 'No snags matching this filter'}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map(snag => {
            const proj = snag.projects
            return (
              <div key={snag.id} className="px-6 py-4 flex items-start gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{snag.snag_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${severityColors[snag.severity]}`}>
                      {snag.severity}
                    </span>
                    {proj && (
                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {proj.project_code}
                      </span>
                    )}
                    {snag.location && (
                      <span className="text-xs text-gray-400">📍 {snag.location}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{snag.description}</p>
                  {proj && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(snag.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' · '}{proj.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => markFixed(snag.id)}
                  disabled={fixing === snag.id}
                  className="shrink-0 bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  {fixing === snag.id ? '...' : '✓ Mark Fixed'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showRaise && (
        <RaiseSnagModal
          onClose={() => setShowRaise(false)}
          onCreated={(newSnag) => {
            setSnags(prev => [newSnag, ...prev])
            setShowRaise(false)
          }}
        />
      )}
    </div>
  )
}

function RaiseSnagModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (snag: SnagItem) => void
}) {
  const supabase = createClient()
  const [projects, setProjects] = useState<{ id: string; project_code: string; name: string }[]>([])
  const [form, setForm] = useState({ project_id: '', description: '', severity: 'minor', location: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, project_code, name')
      .not('status', 'eq', 'completed')
      .order('project_code')
      .then(({ data }) => { if (data) setProjects(data) })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.project_id || !form.description.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/site/snags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { data: snag } = await supabase
        .from('snags')
        .select('id, snag_number, description, severity, status, location, created_at, projects(id, project_code, name)')
        .eq('id', data.snag.id)
        .single()

      if (snag) onCreated(snag as unknown as SnagItem)
    } catch (err: any) {
      alert(err.message || 'Failed to raise snag')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Raise Snag</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
            <select
              required
              value={form.project_id}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Describe the snag..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="e.g. Kitchen GF"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !form.project_id}
              className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Raising…' : 'Raise Snag'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
