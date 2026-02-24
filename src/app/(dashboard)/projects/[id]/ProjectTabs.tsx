'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SiteItemList, DailyReportForm } from './SiteActions'

const itemStatusColors: Record<string, string> = {
  awaiting_drawings: 'bg-amber-100 text-amber-800',
  in_design: 'bg-yellow-100 text-yellow-800',
  drawings_complete: 'bg-cyan-100 text-cyan-800',
  awaiting_client_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-lime-100 text-lime-800',
  production_scheduling: 'bg-gray-100 text-gray-600',
  in_production: 'bg-blue-100 text-blue-800',
  ready_for_qc: 'bg-indigo-100 text-indigo-800',
  qc_failed: 'bg-red-100 text-red-800',
  ready_for_dispatch: 'bg-purple-100 text-purple-800',
  dispatched: 'bg-violet-100 text-violet-800',
  on_site: 'bg-pink-100 text-pink-800',
  installed: 'bg-teal-100 text-teal-800',
  qs_verified: 'bg-green-100 text-green-800',
}

const itemStatusLabels: Record<string, string> = {
  awaiting_drawings: '📋 Awaiting Drawings',
  in_design: '🎨 In Design',
  drawings_complete: '✏️ Drawings Complete',
  awaiting_client_approval: '⏳ Awaiting Approval',
  approved: '✅ Approved',
  production_scheduling: '📅 Scheduling',
  in_production: '🏭 In Production',
  ready_for_qc: '🔍 Ready for QC',
  qc_failed: '❌ QC Failed',
  ready_for_dispatch: '📦 Ready to Ship',
  dispatched: '🚚 Dispatched',
  on_site: '📍 On Site',
  installed: '🔧 Installed',
  qs_verified: '✅ QS Verified',
}

interface ProjectTabsProps {
  project: any
  activeTab: string
  itemStats: {
    total: number
    awaiting_drawings: number
    in_design: number
    drawings_complete: number
    approved: number
    in_production: number
    dispatched: number
    installed: number
    verified: number
  }
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'Items' },
  { id: 'drawings', label: 'Drawings' },
  { id: 'production', label: 'Production' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'site', label: 'Site' },
  { id: 'documents', label: 'Documents' },
]

export default function ProjectTabs({ project, activeTab, itemStats }: ProjectTabsProps) {
  const pathname = usePathname()

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`${pathname}?tab=${tab.id}`}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} itemStats={itemStats} />
      )}
      {activeTab === 'items' && (
        <ItemsTab project={project} />
      )}
      {activeTab === 'drawings' && (
        <DrawingsTab project={project} />
      )}
      {activeTab === 'production' && (
        <ProductionTab project={project} />
      )}
      {activeTab === 'dispatch' && (
        <DispatchTab project={project} />
      )}
      {activeTab === 'site' && (
        <SiteTab project={project} />
      )}
      {activeTab === 'documents' && (
        <DocumentsTab project={project} />
      )}
    </div>
  )
}

function OverviewTab({ project, itemStats }: { project: any; itemStats: any }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Project Info */}
      <div className="col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="text-gray-900 capitalize">{project.project_type?.replace('_', ' ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Site Address</dt>
              <dd className="text-gray-900">{project.site_address || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Start Date</dt>
              <dd className="text-gray-900">
                {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Target Completion</dt>
              <dd className="text-gray-900">
                {project.target_completion ? new Date(project.target_completion).toLocaleDateString('en-GB') : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Item Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(itemStats).filter(([key]) => key !== 'total').map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-600 capitalize">
                  {status.replace('_', ' ')}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all"
                    style={{ width: `${itemStats.total > 0 ? ((count as number) / itemStats.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium">{count as number}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Client */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Client</h3>
          <div className="text-gray-900 font-medium">{project.clients?.name}</div>
          {project.clients?.company && (
            <div className="text-gray-600 text-sm">{project.clients.company}</div>
          )}
          {project.clients?.phone && (
            <a href={`tel:${project.clients.phone}`} className="text-blue-600 text-sm block mt-2">
              {project.clients.phone}
            </a>
          )}
        </div>

        {/* Financials */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Financials</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Contract</dt>
              <dd className="font-medium">AED {project.contract_value?.toLocaleString() || '0'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Invoiced</dt>
              <dd className="font-medium">AED {project.invoiced_amount?.toLocaleString() || '0'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Paid</dt>
              <dd className="font-medium text-green-600">AED {project.paid_amount?.toLocaleString() || '0'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function ItemsTab({ project }: { project: any }) {
  const items = project.project_items || []
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.length > 0 ? (
            items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-blue-600">{item.item_code}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.floor_code || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.room_code || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${itemStatusColors[item.status] || 'bg-gray-100'}`}>
                    {itemStatusLabels[item.status] || item.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                No items in this project yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function DrawingsTab({ project }: { project: any }) {
  const items = project.project_items || []
  
  const awaitingDrawings = items.filter((i: any) => i.status === 'awaiting_drawings')
  const inDesign = items.filter((i: any) => i.status === 'in_design')
  const drawingsComplete = items.filter((i: any) => i.status === 'drawings_complete')
  const awaitingApproval = items.filter((i: any) => i.status === 'awaiting_client_approval')
  const approved = items.filter((i: any) => i.status === 'approved')
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{awaitingDrawings.length}</div>
          <div className="text-xs text-amber-600">Awaiting Drawings</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{inDesign.length}</div>
          <div className="text-xs text-yellow-600">In Design</div>
        </div>
        <div className="bg-cyan-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-700">{drawingsComplete.length}</div>
          <div className="text-xs text-cyan-600">Drawings Complete</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">{awaitingApproval.length}</div>
          <div className="text-xs text-orange-600">Awaiting Approval</div>
        </div>
        <div className="bg-lime-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-lime-700">{approved.length}</div>
          <div className="text-xs text-lime-600">Approved</div>
        </div>
      </div>

      {/* Awaiting Drawings */}
      {awaitingDrawings.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-amber-50">
            <h3 className="font-semibold text-amber-900">📋 Awaiting Drawings ({awaitingDrawings.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {awaitingDrawings.map((item: any) => (
              <DrawingItemRow key={item.id} item={item} projectId={project.id} />
            ))}
          </div>
        </div>
      )}

      {/* In Design */}
      {inDesign.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-yellow-50">
            <h3 className="font-semibold text-yellow-900">🎨 In Design ({inDesign.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {inDesign.map((item: any) => (
              <DrawingItemRow key={item.id} item={item} projectId={project.id} />
            ))}
          </div>
        </div>
      )}

      {/* Drawings Complete */}
      {drawingsComplete.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-cyan-50">
            <h3 className="font-semibold text-cyan-900">✏️ Drawings Complete ({drawingsComplete.length})</h3>
            <p className="text-sm text-cyan-700 mt-1">Ready to send to client for approval</p>
          </div>
          <div className="p-4 space-y-2">
            {drawingsComplete.map((item: any) => (
              <DrawingItemRow key={item.id} item={item} projectId={project.id} />
            ))}
          </div>
        </div>
      )}

      {/* Awaiting Client Approval */}
      {awaitingApproval.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-orange-50">
            <h3 className="font-semibold text-orange-900">⏳ Awaiting Client Approval ({awaitingApproval.length})</h3>
          </div>
          <div className="p-4 space-y-2">
            {awaitingApproval.map((item: any) => (
              <DrawingItemRow key={item.id} item={item} projectId={project.id} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {awaitingDrawings.length === 0 && inDesign.length === 0 && drawingsComplete.length === 0 && awaitingApproval.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8 text-gray-500">
            {approved.length > 0 ? (
              <p>✅ All drawings approved! Items ready for production scheduling.</p>
            ) : (
              <p>No items in the design phase.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DrawingItemRow({ item, projectId }: { item: any; projectId: string }) {
  const updateStatus = async (newStatus: string) => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    const { error } = await supabase
      .from('project_items')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    if (error) {
      alert('Failed to update status: ' + error.message)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${itemStatusColors[item.status]}`}>
            {itemStatusLabels[item.status]}
          </span>
        </div>
        <div className="text-sm text-gray-900 mt-1">{item.description}</div>
        {item.floor_code && (
          <div className="text-xs text-gray-500 mt-1">
            {item.floor_code} • {item.room_code}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {item.status === 'awaiting_drawings' && (
          <button
            onClick={() => updateStatus('in_design')}
            className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700"
          >
            Start Design
          </button>
        )}
        {item.status === 'in_design' && (
          <button
            onClick={() => updateStatus('drawings_complete')}
            className="text-xs bg-cyan-600 text-white px-3 py-1.5 rounded hover:bg-cyan-700"
          >
            Mark Complete
          </button>
        )}
        {item.status === 'drawings_complete' && (
          <button
            onClick={() => updateStatus('awaiting_client_approval')}
            className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700"
          >
            Send for Approval
          </button>
        )}
        {item.status === 'awaiting_client_approval' && (
          <button
            onClick={() => updateStatus('approved')}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
          >
            Mark Approved
          </button>
        )}
        {item.status === 'approved' && (
          <button
            onClick={() => updateStatus('production_scheduling')}
            className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700"
          >
            → Schedule Production
          </button>
        )}
      </div>
    </div>
  )
}

function ProductionTab({ project }: { project: any }) {
  const inProduction = project.project_items?.filter((i: any) => 
    ['in_production', 'ready_for_qc'].includes(i.status)
  ) || []
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {inProduction.length > 0 ? (
        <div className="space-y-4">
          {inProduction.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-mono text-sm text-blue-600">{item.item_code}</div>
                <div className="text-gray-900">{item.description}</div>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${itemStatusColors[item.status]}`}>
                {itemStatusLabels[item.status]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No items currently in production.
        </div>
      )}
    </div>
  )
}

function DispatchTab({ project }: { project: any }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center py-8 text-gray-500">
        <p>No dispatches yet.</p>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create Dispatch
        </button>
      </div>
    </div>
  )
}

function SiteTab({ project }: { project: any }) {
  const siteItems = project.project_items?.filter((i: any) =>
    ['dispatched', 'on_site', 'installed', 'qs_verified'].includes(i.status)
  ) || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{siteItems.length} items in site phase</p>
        <DailyReportForm projectId={project.id} />
      </div>
      <SiteItemList items={siteItems} projectId={project.id} />
    </div>
  )
}

function DocumentsTab({ project }: { project: any }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center py-8 text-gray-500">
        <p>No documents uploaded yet.</p>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Upload Document
        </button>
      </div>
    </div>
  )
}
