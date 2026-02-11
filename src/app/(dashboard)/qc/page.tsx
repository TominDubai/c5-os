import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import QCActions from './QCActions'

export default async function QCPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const view = params.view || 'workshop'
  const supabase = await createClient()
  
  // Workshop QC - items ready for QC
  const { data: workshopItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name, clients(name))
    `)
    .eq('status', 'ready_for_qc')
    .order('production_completed_at', { ascending: true })
  
  // Site QC - items installed, need verification
  const { data: siteItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name, site_address, clients(name))
    `)
    .eq('status', 'installed')
    .order('installed_at', { ascending: true })
  
  // QC Failed items
  const { data: failedItems } = await supabase
    .from('project_items')
    .select(`
      *,
      projects(id, project_code, name)
    `)
    .eq('status', 'qc_failed')
    .order('workshop_qc_at', { ascending: false })

  // Group by project
  const groupByProject = (items: any[] | null) => {
    const groups: Record<string, any[]> = {}
    items?.forEach(item => {
      const key = item.project_id
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }

  const workshopGroups = groupByProject(workshopItems)
  const siteGroups = groupByProject(siteItems)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{workshopItems?.length || 0}</div>
          <div className="text-gray-500">Workshop QC Queue</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-orange-600">{siteItems?.length || 0}</div>
          <div className="text-gray-500">Site QC Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-red-600">{failedItems?.length || 0}</div>
          <div className="text-gray-500">QC Failed</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/qc?view=workshop"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'workshop' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🏭 Workshop QC
        </Link>
        <Link
          href="/qc?view=site"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'site' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📍 Site QC
        </Link>
        <Link
          href="/qc?view=failed"
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            view === 'failed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ❌ Failed Items
        </Link>
      </div>

      {/* Workshop QC View */}
      {view === 'workshop' && (
        <div className="space-y-6">
          {Object.keys(workshopGroups).length > 0 ? (
            Object.entries(workshopGroups).map(([projectId, items]) => (
              <div key={projectId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b flex justify-between items-center">
                  <div>
                    <Link 
                      href={`/projects/${projectId}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {items[0].projects?.project_code}
                    </Link>
                    <span className="text-gray-600 ml-2">{items[0].projects?.name}</span>
                  </div>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {items.length} items to check
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-gray-600">{item.item_code}</div>
                        <div className="text-gray-900">{item.description}</div>
                      </div>
                      <QCActions itemId={item.id} qcType="workshop" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              ✅ No items waiting for workshop QC
            </div>
          )}
        </div>
      )}

      {/* Site QC View */}
      {view === 'site' && (
        <div className="space-y-6">
          {Object.keys(siteGroups).length > 0 ? (
            Object.entries(siteGroups).map(([projectId, items]) => (
              <div key={projectId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-orange-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <Link 
                        href={`/projects/${projectId}`}
                        className="font-semibold text-orange-600 hover:underline"
                      >
                        {items[0].projects?.project_code}
                      </Link>
                      <span className="text-gray-600 ml-2">{items[0].projects?.name}</span>
                    </div>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                      {items.length} items to verify
                    </span>
                  </div>
                  {items[0].projects?.site_address && (
                    <div className="text-sm text-gray-500 mt-1">
                      📍 {items[0].projects.site_address}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-gray-600">{item.item_code}</div>
                        <div className="text-gray-900">{item.description}</div>
                        <div className="text-sm text-gray-500">
                          Installed: {item.installed_at ? new Date(item.installed_at).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </div>
                      <QCActions itemId={item.id} qcType="site" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              ✅ No items waiting for site QC
            </div>
          )}
        </div>
      )}

      {/* Failed Items View */}
      {view === 'failed' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {failedItems && failedItems.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {failedItems.map(item => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-red-600">{item.item_code}</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                          QC Failed
                        </span>
                      </div>
                      <div className="text-gray-900">{item.description}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {item.projects?.project_code} • {item.projects?.name}
                      </div>
                    </div>
                  </div>
                  {item.workshop_qc_notes && (
                    <div className="mt-2 p-3 bg-red-50 rounded-md text-sm text-red-800">
                      <strong>Reason:</strong> {item.workshop_qc_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              ✅ No failed QC items
            </div>
          )}
        </div>
      )}
    </div>
  )
}
