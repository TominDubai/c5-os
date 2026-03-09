import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProductionScheduler from './ProductionScheduler'

// Get Monday of the week for a given date
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Generate next N week Monday dates as ISO strings
function getUpcomingWeeks(n: number): string[] {
  const weeks: string[] = []
  const monday = getMonday(new Date())
  for (let i = 0; i < n; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i * 7)
    weeks.push(d.toISOString().split('T')[0])
  }
  return weeks
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const view = params.view || 'schedule'
  const supabase = await createClient()

  // All items ready for scheduling (drawings approved)
  const { data: schedulingItems } = await supabase
    .from('project_items')
    .select(`*, projects(id, project_code, name, clients(name))`)
    .eq('status', 'production_scheduling')
    .order('created_at', { ascending: true })

  // All existing production schedule entries for upcoming weeks
  const weeks = getUpcomingWeeks(6)
  const { data: scheduleEntries } = await supabase
    .from('production_schedule')
    .select(`*, project_items(id, item_code, description, value, project_id, projects(project_code, name))`)
    .gte('scheduled_week', weeks[0])
    .order('scheduled_week', { ascending: true })

  // In production items
  const { data: inProductionItems } = await supabase
    .from('project_items')
    .select(`*, projects(id, project_code, name, clients(name))`)
    .eq('status', 'in_production')
    .order('production_started_at', { ascending: true })

  // QC ready items
  const { data: qcReadyItems } = await supabase
    .from('project_items')
    .select(`*, projects(id, project_code, name)`)
    .eq('status', 'ready_for_qc')
    .order('production_completed_at', { ascending: true })

  // Determine which items are already scheduled
  const scheduledItemIds = new Set(
    scheduleEntries?.map((e) => e.project_item_id) || []
  )
  const unscheduledItems = schedulingItems?.filter(
    (item) => !scheduledItemIds.has(item.id)
  ) || []

  // Build weekly map
  const weeklySchedule = weeks.map((week) => {
    const entries = scheduleEntries?.filter((e) => e.scheduled_week === week) || []
    const totalValue = entries.reduce(
      (sum, e) => sum + (e.project_items?.value || 0),
      0
    )
    return { week, entries, totalValue }
  })

  const TARGET = 1_000_000

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Production</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-3xl font-bold text-orange-600">{unscheduledItems.length}</div>
          <div className="text-gray-500 text-sm">To Schedule</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-3xl font-bold text-yellow-600">{scheduledItemIds.size}</div>
          <div className="text-gray-500 text-sm">Scheduled</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-3xl font-bold text-blue-600">{inProductionItems?.length || 0}</div>
          <div className="text-gray-500 text-sm">In Production</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-3xl font-bold text-purple-600">{qcReadyItems?.length || 0}</div>
          <div className="text-gray-500 text-sm">Ready for QC</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'schedule', label: '📅 Schedule' },
          { key: 'inprogress', label: '🏭 In Production' },
          { key: 'qc', label: '🔍 QC Ready' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/production?view=${tab.key}`}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              view === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Schedule View */}
      {view === 'schedule' && (
        <ProductionScheduler
          unscheduledItems={unscheduledItems}
          weeklySchedule={weeklySchedule}
          weeks={weeks}
          target={TARGET}
        />
      )}

      {/* In Production View */}
      {view === 'inprogress' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {inProductionItems && inProductionItems.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {inProductionItems.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                      <Link href={`/projects/${item.project_id}`} className="text-sm text-gray-500 hover:underline">
                        {item.projects?.project_code} — {item.projects?.name}
                      </Link>
                    </div>
                    <div className="text-gray-900 mt-0.5">{item.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Started: {item.production_started_at ? new Date(item.production_started_at).toLocaleDateString('en-GB') : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {item.value > 0 && (
                      <span className="text-sm font-medium text-gray-700">
                        AED {Number(item.value).toLocaleString()}
                      </span>
                    )}
                    <MarkCompleteButton itemId={item.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">No items currently in production.</div>
          )}
        </div>
      )}

      {/* QC Ready View */}
      {view === 'qc' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {qcReadyItems && qcReadyItems.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {qcReadyItems.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                      <Link href={`/projects/${item.project_id}`} className="text-sm text-gray-500 hover:underline">
                        {item.projects?.project_code} — {item.projects?.name}
                      </Link>
                    </div>
                    <div className="text-gray-900 mt-0.5">{item.description}</div>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    🔍 Awaiting QC
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">No items ready for QC.</div>
          )}
        </div>
      )}
    </div>
  )
}

// Inline server-safe button wrapper (client action handled in scheduler)
function MarkCompleteButton({ itemId }: { itemId: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase
        .from('project_items')
        .update({ status: 'ready_for_qc', production_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', itemId)
    }}>
      <button
        type="submit"
        className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700"
      >
        Mark Complete → QC
      </button>
    </form>
  )
}
