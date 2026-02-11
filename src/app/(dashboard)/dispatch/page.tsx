import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  loaded: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  partial_delivery: 'bg-orange-100 text-orange-800',
}

const statusLabels: Record<string, string> = {
  pending: '⏳ Pending',
  loaded: '📦 Loaded',
  in_transit: '🚚 In Transit',
  delivered: '✅ Delivered',
  partial_delivery: '⚠️ Partial',
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const view = params.view || 'ready'
  const supabase = await createClient()
  
  // Items ready for dispatch
  const { data: readyItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name, site_address, clients(name))
    `)
    .eq('status', 'ready_for_dispatch')
    .order('workshop_qc_at', { ascending: true })
  
  // Active dispatches
  const { data: dispatches } = await supabase
    .from('dispatches')
    .select(`
      *,
      projects(project_code, name, site_address),
      dispatch_items(
        id,
        project_item_id,
        delivered,
        project_items(item_code, description)
      )
    `)
    .in('status', ['pending', 'loaded', 'in_transit'])
    .order('scheduled_date', { ascending: true })
  
  // Recent deliveries
  const { data: recentDeliveries } = await supabase
    .from('dispatches')
    .select(`
      *,
      projects(project_code, name)
    `)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(10)

  // Group ready items by project
  const readyGroups: Record<string, any[]> = {}
  readyItems?.forEach(item => {
    const key = item.project_id
    if (!readyGroups[key]) readyGroups[key] = []
    readyGroups[key].push(item)
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
        <Link
          href="/dispatch/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + Create Dispatch
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{readyItems?.length || 0}</div>
          <div className="text-gray-500">Ready to Ship</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{dispatches?.length || 0}</div>
          <div className="text-gray-500">Active Dispatches</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{recentDeliveries?.length || 0}</div>
          <div className="text-gray-500">Recent Deliveries</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/dispatch?view=ready"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'ready' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ready to Ship
        </Link>
        <Link
          href="/dispatch?view=active"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active Dispatches
        </Link>
        <Link
          href="/dispatch?view=history"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Delivery History
        </Link>
      </div>

      {/* Ready to Ship View */}
      {view === 'ready' && (
        <div className="space-y-6">
          {Object.keys(readyGroups).length > 0 ? (
            Object.entries(readyGroups).map(([projectId, items]) => (
              <div key={projectId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-purple-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <Link 
                        href={`/projects/${projectId}`}
                        className="font-semibold text-purple-600 hover:underline"
                      >
                        {items[0].projects?.project_code}
                      </Link>
                      <span className="text-gray-600 ml-2">{items[0].projects?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                        {items.length} items
                      </span>
                      <Link
                        href={`/dispatch/new?project=${projectId}`}
                        className="bg-purple-600 text-white px-4 py-1 rounded-md text-sm hover:bg-purple-700"
                      >
                        Create Dispatch
                      </Link>
                    </div>
                  </div>
                  {items[0].projects?.site_address && (
                    <div className="text-sm text-gray-500 mt-1">
                      📍 {items[0].projects.site_address}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center hover:bg-gray-50">
                      <div className="flex-1">
                        <span className="font-mono text-sm text-gray-600">{item.item_code}</span>
                        <span className="text-gray-400 mx-2">—</span>
                        <span className="text-gray-900">{item.description}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        QC: {item.workshop_qc_at ? new Date(item.workshop_qc_at).toLocaleDateString('en-GB') : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No items ready for dispatch. Items appear here after passing workshop QC.
            </div>
          )}
        </div>
      )}

      {/* Active Dispatches View */}
      {view === 'active' && (
        <div className="space-y-4">
          {dispatches && dispatches.length > 0 ? (
            dispatches.map(dispatch => (
              <div key={dispatch.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{dispatch.dispatch_number}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[dispatch.status]}`}>
                        {statusLabels[dispatch.status]}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      {dispatch.projects?.project_code} • {dispatch.projects?.name}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Scheduled: {dispatch.scheduled_date ? new Date(dispatch.scheduled_date).toLocaleDateString('en-GB') : '—'}</div>
                    {dispatch.vehicle_number && <div>Vehicle: {dispatch.vehicle_number}</div>}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {dispatch.dispatch_items?.length || 0} items
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No active dispatches.
            </div>
          )}
        </div>
      )}

      {/* Delivery History View */}
      {view === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {recentDeliveries && recentDeliveries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatch #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentDeliveries.map(dispatch => (
                  <tr key={dispatch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{dispatch.dispatch_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {dispatch.projects?.project_code} • {dispatch.projects?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {dispatch.delivered_at ? new Date(dispatch.delivered_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[dispatch.status]}`}>
                        {statusLabels[dispatch.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No delivery history yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
