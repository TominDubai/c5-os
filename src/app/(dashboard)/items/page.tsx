import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pre_production: 'bg-gray-100 text-gray-600',
  in_production: 'bg-yellow-100 text-yellow-800',
  ready_for_qc: 'bg-blue-100 text-blue-800',
  qc_failed: 'bg-red-100 text-red-800',
  ready_for_dispatch: 'bg-purple-100 text-purple-800',
  dispatched: 'bg-indigo-100 text-indigo-800',
  on_site: 'bg-orange-100 text-orange-800',
  installed: 'bg-teal-100 text-teal-800',
  qs_verified: 'bg-green-100 text-green-800',
}

const statusLabels: Record<string, string> = {
  pre_production: '⚪ Pre-Production',
  in_production: '🟡 In Production',
  ready_for_qc: '🔵 Ready for QC',
  qc_failed: '🔴 QC Failed',
  ready_for_dispatch: '🟣 Ready to Ship',
  dispatched: '🚚 Dispatched',
  on_site: '📍 On Site',
  installed: '🔧 Installed',
  qs_verified: '✅ QS Verified',
}

const statusFlow = [
  'pre_production',
  'in_production', 
  'ready_for_qc',
  'ready_for_dispatch',
  'dispatched',
  'on_site',
  'installed',
  'qs_verified',
]

export default async function ItemTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; project?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  let query = supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name)
    `)
    .order('item_code', { ascending: true })
  
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  
  if (params.q) {
    query = query.ilike('item_code', `%${params.q}%`)
  }
  
  if (params.project) {
    query = query.eq('project_id', params.project)
  }
  
  const { data: items, error } = await query.limit(100)
  
  // Get status counts
  const { data: statusCounts } = await supabase
    .from('project_items')
    .select('status')
  
  const counts: Record<string, number> = {}
  statusCounts?.forEach((item) => {
    counts[item.status] = (counts[item.status] || 0) + 1
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Item Tracker</h1>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              name="q"
              defaultValue={params.q || ''}
              placeholder="Search item code (e.g., 26VP-K-GF-RM01-003)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href="/items"
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            !params.status || params.status === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({Object.values(counts).reduce((a, b) => a + b, 0)})
        </Link>
        {statusFlow.map((status) => (
          <Link
            key={status}
            href={`/items?status=${status}`}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              params.status === status
                ? 'bg-blue-600 text-white'
                : `${statusColors[status]} hover:opacity-80`
            }`}
          >
            {statusLabels[status]?.split(' ')[0]} {counts[status] || 0}
          </Link>
        ))}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items && items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link 
                      href={`/projects/${item.projects?.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {item.projects?.project_code}
                    </Link>
                    <span className="text-gray-500 block text-xs">{item.projects?.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link 
                      href={`/items/${item.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Journey
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {params.q ? (
                    <>No items found matching &quot;{params.q}&quot;</>
                  ) : (
                    <>No items found. Items are created when projects are started from approved quotes.</>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
