'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProjectItem {
  id: string
  item_code: string
  description: string
  value: number
  project_id: string
  projects?: { project_code: string; name: string; clients?: { name: string } }
}

interface ScheduleEntry {
  id: string
  project_item_id: string
  scheduled_week: string
  project_items?: { id: string; item_code: string; description: string; value: number; project_id: string; projects?: { project_code: string; name: string } }
}

interface WeekData {
  week: string
  entries: ScheduleEntry[]
  totalValue: number
}

interface Props {
  unscheduledItems: ProjectItem[]
  weeklySchedule: WeekData[]
  weeks: string[]
  target: number
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatAED(val: number) {
  if (val >= 1_000_000) return `AED ${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `AED ${(val / 1_000).toFixed(0)}k`
  return `AED ${val.toLocaleString()}`
}

export default function ProductionScheduler({ unscheduledItems, weeklySchedule, weeks, target }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [selectedWeek, setSelectedWeek] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const scheduleItem = async (itemId: string) => {
    const week = selectedWeek[itemId]
    if (!week) return
    setLoading(itemId)

    const { error } = await supabase.from('production_schedule').insert({
      project_item_id: itemId,
      scheduled_week: week,
      scheduled_by: (await supabase.auth.getUser()).data.user?.id,
    })

    if (error) {
      alert('Failed to schedule: ' + error.message)
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  const unscheduleItem = async (entryId: string) => {
    setLoading(entryId)
    await supabase.from('production_schedule').delete().eq('id', entryId)
    router.refresh()
    setLoading(null)
  }

  const startProduction = async (itemId: string) => {
    setLoading(itemId)
    await supabase
      .from('project_items')
      .update({ status: 'in_production', production_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', itemId)
    router.refresh()
    setLoading(null)
  }

  // Group unscheduled by project
  const projectGroups: Record<string, { info: any; items: ProjectItem[] }> = {}
  unscheduledItems.forEach((item) => {
    const key = item.project_id
    if (!projectGroups[key]) {
      projectGroups[key] = { info: item.projects, items: [] }
    }
    projectGroups[key].items.push(item)
  })

  return (
    <div className="space-y-8">
      {/* Unscheduled Pool */}
      {unscheduledItems.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📋 To Schedule ({unscheduledItems.length} items)
          </h2>
          <div className="space-y-4">
            {Object.entries(projectGroups).map(([projectId, { info, items }]) => (
              <div key={projectId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-3 bg-amber-50 border-b flex justify-between items-center">
                  <div>
                    <Link href={`/projects/${projectId}`} className="font-semibold text-blue-600 hover:underline text-sm">
                      {info?.project_code}
                    </Link>
                    <span className="text-gray-600 text-sm ml-2">{info?.name}</span>
                    <span className="text-gray-400 text-sm ml-2">• {info?.clients?.name}</span>
                  </div>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                    {items.length} unscheduled
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                          <span className="text-gray-900 text-sm">{item.description}</span>
                        </div>
                        {item.value > 0 && (
                          <span className="text-xs text-gray-500">{formatAED(item.value)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedWeek[item.id] || ''}
                          onChange={(e) => setSelectedWeek((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select week...</option>
                          {weeks.map((w) => {
                            const weekData = weeklySchedule.find((wk) => wk.week === w)
                            const pct = weekData ? Math.round((weekData.totalValue / 1_000_000) * 100) : 0
                            return (
                              <option key={w} value={w}>
                                w/c {formatWeek(w)} — {pct}% full
                              </option>
                            )
                          })}
                        </select>
                        <button
                          onClick={() => scheduleItem(item.id)}
                          disabled={!selectedWeek[item.id] || loading === item.id}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-40"
                        >
                          {loading === item.id ? '...' : 'Schedule'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unscheduledItems.length === 0 && weeklySchedule.every((w) => w.entries.length === 0) && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No items ready for production scheduling. Items appear here once drawings are approved.
        </div>
      )}

      {/* Weekly Schedule Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Weekly Schedule</h2>
        <div className="grid grid-cols-3 gap-4">
          {weeklySchedule.map(({ week, entries, totalValue }) => {
            const pct = Math.min((totalValue / target) * 100, 100)
            const over = totalValue > target
            return (
              <div key={week} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Week header */}
                <div className={`px-4 py-3 border-b ${over ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 text-sm">w/c {formatWeek(week)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      over ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {entries.length} items
                    </span>
                  </div>
                  {/* Value progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={over ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {formatAED(totalValue)}
                      </span>
                      <span className="text-gray-400">of 1M target</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {over && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ Over target by {formatAED(totalValue - target)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scheduled items */}
                <div className="divide-y divide-gray-100">
                  {entries.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      No items scheduled
                    </div>
                  ) : (
                    entries.map((entry) => (
                      <div key={entry.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-blue-600 shrink-0">
                              {entry.project_items?.item_code}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                              {entry.project_items?.projects?.project_code}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 truncate mt-0.5">
                            {entry.project_items?.description}
                          </p>
                          {(entry.project_items?.value || 0) > 0 && (
                            <p className="text-xs text-gray-400">{formatAED(entry.project_items!.value)}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2 shrink-0">
                          <button
                            onClick={() => startProduction(entry.project_item_id)}
                            disabled={loading === entry.project_item_id}
                            title="Start Production"
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {loading === entry.project_item_id ? '...' : '▶ Start'}
                          </button>
                          <button
                            onClick={() => unscheduleItem(entry.id)}
                            disabled={loading === entry.id}
                            title="Remove from schedule"
                            className="text-xs text-gray-400 hover:text-red-500 px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
