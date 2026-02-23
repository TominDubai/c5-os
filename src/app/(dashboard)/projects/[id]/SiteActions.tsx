'use client'

import { useState } from 'react'

interface Item {
  id: string
  item_code: string
  description: string
  status: string
  floor_code?: string
  room_code?: string
}

interface SnagFormState {
  itemId: string | null
  open: boolean
}

const STATUS_COLORS: Record<string, string> = {
  dispatched: 'bg-violet-100 text-violet-700',
  on_site: 'bg-orange-100 text-orange-700',
  installed: 'bg-teal-100 text-teal-700',
  qs_verified: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  dispatched: '🚚 En Route',
  on_site: '📍 On Site',
  installed: '🔧 Installed',
  qs_verified: '✅ QS Verified',
}

const NEXT_ACTION: Record<string, { label: string; color: string }> = {
  dispatched: { label: 'Confirm Received', color: 'bg-orange-600 hover:bg-orange-700' },
  on_site: { label: 'Mark Installed', color: 'bg-teal-600 hover:bg-teal-700' },
}

export function SiteItemList({
  items,
  projectId,
}: {
  items: Item[]
  projectId: string
}) {
  const [localItems, setLocalItems] = useState(items)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [snagForm, setSnagForm] = useState<SnagFormState>({ itemId: null, open: false })

  const advance = async (itemId: string) => {
    setAdvancing(itemId)
    try {
      const res = await fetch(`/api/site/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalItems(prev =>
        prev.map(i => i.id === itemId ? { ...i, status: data.newStatus } : i)
      )
    } catch (err: any) {
      alert(err.message || 'Failed to update item')
    } finally {
      setAdvancing(null)
    }
  }

  const dispatched = localItems.filter(i => i.status === 'dispatched')
  const onSite = localItems.filter(i => i.status === 'on_site')
  const installed = localItems.filter(i => i.status === 'installed')
  const verified = localItems.filter(i => i.status === 'qs_verified')

  const renderGroup = (title: string, groupItems: Item[], showActions = true) => {
    if (groupItems.length === 0) return null
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-medium text-gray-700 text-sm">{title} ({groupItems.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {groupItems.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{item.description}</p>
                {item.floor_code && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.floor_code} · {item.room_code}</p>
                )}
              </div>
              {showActions && (
                <div className="flex items-center gap-2 ml-4">
                  {NEXT_ACTION[item.status] && (
                    <button
                      onClick={() => advance(item.id)}
                      disabled={advancing === item.id}
                      className={`text-xs text-white px-3 py-1.5 rounded ${NEXT_ACTION[item.status].color} disabled:opacity-50`}
                    >
                      {advancing === item.id ? '…' : NEXT_ACTION[item.status].label}
                    </button>
                  )}
                  {['on_site', 'installed'].includes(item.status) && (
                    <button
                      onClick={() => setSnagForm({ itemId: item.id, open: true })}
                      className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded hover:bg-red-50"
                    >
                      + Snag
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {localItems.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          No items on site yet — items will appear here once dispatched.
        </div>
      )}

      {renderGroup('🚚 En Route', dispatched)}
      {renderGroup('📍 On Site — Awaiting Installation', onSite)}
      {renderGroup('🔧 Installed — Awaiting QC', installed)}
      {renderGroup('✅ QS Verified', verified, false)}

      {/* Snag modal */}
      {snagForm.open && (
        <SnagModal
          projectId={projectId}
          itemId={snagForm.itemId}
          onClose={() => setSnagForm({ itemId: null, open: false })}
        />
      )}
    </div>
  )
}

function SnagModal({
  projectId,
  itemId,
  onClose,
}: {
  projectId: string
  itemId: string | null
  onClose: () => void
}) {
  const [form, setForm] = useState({ description: '', severity: 'minor', location: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/site/snags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, project_item_id: itemId, ...form }),
      })
      if (!res.ok) throw new Error('Failed to raise snag')
      setDone(true)
      setTimeout(onClose, 1200)
    } catch {
      alert('Failed to raise snag')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-medium text-gray-800">Snag raised</p>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900 mb-4">Raise Snag</h3>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
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
                  disabled={loading}
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
          </>
        )}
      </div>
    </div>
  )
}

export function DailyReportForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    report_date: today,
    weather: '',
    work_completed: '',
    issues: '',
    attendance_count: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/site/daily-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...form }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      setSuccess(true)
      setOpen(false)
    } catch {
      alert('Failed to submit report')
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
        {success ? '✓ Report Submitted' : '+ Daily Report'}
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Daily Site Report</h3>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={form.report_date}
              onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Weather</label>
            <select
              value={form.weather}
              onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">— Select —</option>
              <option value="sunny">Sunny</option>
              <option value="cloudy">Cloudy</option>
              <option value="rainy">Rainy</option>
              <option value="hot">Hot</option>
              <option value="windy">Windy</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Staff on Site</label>
          <input
            type="number"
            min="0"
            value={form.attendance_count}
            onChange={e => setForm(f => ({ ...f, attendance_count: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Work Completed</label>
          <textarea
            rows={3}
            value={form.work_completed}
            onChange={e => setForm(f => ({ ...f, work_completed: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Describe work completed today..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Issues / Notes</label>
          <textarea
            rows={2}
            value={form.issues}
            onChange={e => setForm(f => ({ ...f, issues: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Any issues or blockers..."
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit Report'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
