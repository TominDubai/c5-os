import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProductionActions from './ProductionActions'

const statusColors: Record<string, string> = {
  pre_production: 'bg-gray-100 text-gray-600',
  in_production: 'bg-yellow-100 text-yellow-800',
  ready_for_qc: 'bg-blue-100 text-blue-800',
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const view = params.view || 'queue'
  const supabase = await createClient()
  
  // Get items in production queue (pre_production status)
  const { data: queueItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name, clients(name))
    `)
    .eq('status', 'pre_production')
    .order('created_at', { ascending: true })
  
  // Get items currently in production
  const { data: inProgressItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name, clients(name))
    `)
    .eq('status', 'in_production')
    .order('production_started_at', { ascending: true })
  
  // Get items ready for QC
  const { data: qcReadyItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name)
    `)
    .eq('status', 'ready_for_qc')
    .order('production_completed_at', { ascending: true })

  // Group queue items by project
  const projectGroups: Record<string, any[]> = {}
  queueItems?.forEach(item => {
    const projectId = item.project_id
    if (!projectGroups[projectId]) {
      projectGroups[projectId] = []
    }
    projectGroups[projectId].push(item)
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Production</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-gray-600">{queueItems?.length || 0}</div>
          <div className="text-gray-500">In Queue</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-yellow-600">{inProgressItems?.length || 0}</div>
          <div className="text-gray-500">In Production</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{qcReadyItems?.length || 0}</div>
          <div className="text-gray-500">Ready for QC</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/production?view=queue"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'queue' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Production Queue
        </Link>
        <Link
          href="/production?view=progress"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In Progress
        </Link>
        <Link
          href="/production?view=qc"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'qc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Ready for QC
        </Link>
      </div>

      {/* Queue View */}
      {view === 'queue' && (
        <div className="space-y-6">
          {Object.keys(projectGroups).length > 0 ? (
            Object.entries(projectGroups).map(([projectId, items]) => (
              <div key={projectId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                  <div>
                    <Link 
                      href={`/projects/${projectId}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {items[0].projects?.project_code}
                    </Link>
                    <span className="text-gray-600 ml-2">{items[0].projects?.name}</span>
                    <span className="text-gray-400 ml-2">• {items[0].projects?.clients?.name}</span>
                  </div>
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {items.length} items
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-gray-600">{item.item_code}</div>
                        <div className="text-gray-900">{item.description}</div>
                      </div>
                      <ProductionActions itemId={item.id} currentStatus={item.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No items in production queue. Items appear here when drawings are approved.
            </div>
          )}
        </div>
      )}

      {/* In Progress View */}
      {view === 'progress' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {inProgressItems && inProgressItems.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {inProgressItems.map(item => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors.in_production}`}>
                        In Production
                      </span>
                    </div>
                    <div className="text-gray-900">{item.description}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.projects?.project_code} • {item.projects?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Started: {item.production_started_at ? new Date(item.production_started_at).toLocaleDateString('en-GB') : '—'}
                    </div>
                    <ProductionActions itemId={item.id} currentStatus={item.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No items currently in production.
            </div>
          )}
        </div>
      )}

      {/* Ready for QC View */}
      {view === 'qc' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {qcReadyItems && qcReadyItems.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {qcReadyItems.map(item => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors.ready_for_qc}`}>
                        Ready for QC
                      </span>
                    </div>
                    <div className="text-gray-900">{item.description}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.projects?.project_code} • {item.projects?.name}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Completed: {item.production_completed_at ? new Date(item.production_completed_at).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No items ready for QC.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
