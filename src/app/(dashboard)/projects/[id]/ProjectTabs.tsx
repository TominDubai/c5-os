'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SiteItemList, DailyReportForm } from './SiteActions'
import CompletionTab from './CompletionTab'

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
  { id: 'financials', label: '💰 Financials' },
  { id: 'completion', label: '🏁 Completion' },
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
      {activeTab === 'financials' && (
        <FinancialsTab project={project} />
      )}
      {activeTab === 'completion' && (
        <CompletionTab
          projectId={project.id}
          projectStatus={project.status}
          contractValue={project.contract_value || 0}
          totalItems={itemStats.total}
          verifiedItems={itemStats.verified}
        />
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
      {/* Link to shop drawings: generate list + upload files */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between border border-blue-100">
        <p className="text-gray-700">
          Manage shop drawings: generate a drawing list from project items and upload PDFs or other files.
        </p>
        <Link
          href={`/projects/${project.id}/drawings`}
          className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          📤 Open shop drawings &amp; upload
        </Link>
      </div>

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

const dispatchStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  loaded: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  partial_delivery: 'bg-orange-100 text-orange-800',
}

const dispatchStatusLabels: Record<string, string> = {
  pending: '⏳ Pending',
  loaded: '📦 Loaded',
  in_transit: '🚚 In Transit',
  delivered: '✅ Delivered',
  partial_delivery: '⚠️ Partial',
}

interface DispatchItem {
  id: string
  delivered: boolean
}

interface Dispatch {
  id: string
  dispatch_number: string
  status: string
  scheduled_date: string | null
  notes: string | null
  dispatch_items: DispatchItem[]
}

function DispatchTab({ project }: { project: any }) {
  const supabase = createClient()
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('dispatches')
        .select('id, dispatch_number, status, scheduled_date, notes, dispatch_items(id, delivered)')
        .eq('project_id', project.id)
        .order('scheduled_date', { ascending: false })
      setDispatches((data as Dispatch[]) || [])
      setLoading(false)
    }
    load()
  }, [project.id])

  const readyItems = project.project_items?.filter(
    (i: any) => i.status === 'ready_for_dispatch'
  ) || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {dispatches.length} dispatch{dispatches.length !== 1 ? 'es' : ''} for this project
          {readyItems.length > 0 && (
            <span className="ml-2 text-purple-600 font-medium">
              · {readyItems.length} item{readyItems.length !== 1 ? 's' : ''} ready to ship
            </span>
          )}
        </p>
        <Link
          href={`/dispatch/new?project=${project.id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Create Dispatch
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 animate-pulse">
          Loading dispatches…
        </div>
      ) : dispatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium mb-1">No dispatches yet</p>
          <p className="text-sm mb-4">
            {readyItems.length > 0
              ? `${readyItems.length} item${readyItems.length !== 1 ? 's are' : ' is'} ready to be dispatched.`
              : 'Items will appear here once they pass workshop QC.'}
          </p>
          {readyItems.length > 0 && (
            <Link
              href={`/dispatch/new?project=${project.id}`}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Create First Dispatch
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map((d) => {
            const total = d.dispatch_items?.length || 0
            const delivered = d.dispatch_items?.filter((i) => i.delivered).length || 0
            const pct = total > 0 ? Math.round((delivered / total) * 100) : 0
            return (
              <Link
                key={d.id}
                href={`/dispatch/${d.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {d.dispatch_number}
                    </span>
                    {d.scheduled_date && (
                      <span className="ml-3 text-sm text-gray-500">
                        {new Date(d.scheduled_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dispatchStatusColors[d.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {dispatchStatusLabels[d.status] || d.status}
                  </span>
                </div>

                {total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{delivered} / {total} items delivered</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          pct === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {d.notes && (
                  <p className="mt-2 text-xs text-gray-500 truncate">{d.notes}</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
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

// ─── Financials Tab ──────────────────────────────────────────────────────────

const INVOICE_TYPE_LABELS: Record<string, string> = {
  deposit: '🏦 Deposit',
  progress: '📈 Progress',
  final: '🏁 Final',
  retention: '🔒 Retention',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
}

interface FinancialInvoice {
  id: string
  invoice_number: string
  invoice_type: string
  amount: number
  percentage: number | null
  status: string
  issued_at: string | null
  due_date: string | null
  paid_at: string | null
  payment_method: string | null
  notes: string | null
}

function FinancialsTab({ project }: { project: any }) {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<FinancialInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'progress' | 'final' | 'retention'>('progress')
  const [formAmount, setFormAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_type, amount, percentage, status, issued_at, due_date, paid_at, payment_method, notes')
      .eq('project_id', project.id)
      .order('issued_at', { ascending: true })
    setInvoices((data as FinancialInvoice[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [project.id])

  const totalInvoiced = invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? i.amount : 0), 0)
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const contractValue = project.contract_value || 0
  const invoicedPct = contractValue > 0 ? Math.round((totalInvoiced / contractValue) * 100) : 0
  const paidPct = contractValue > 0 ? Math.round((totalPaid / contractValue) * 100) : 0

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(formAmount)
    if (!amount || amount <= 0) return
    setSubmitting(true)
    const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true })
    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`
    await supabase.from('invoices').insert({
      project_id: project.id,
      invoice_number: invoiceNumber,
      invoice_type: formType,
      amount,
      percentage: contractValue > 0 ? parseFloat(((amount / contractValue) * 100).toFixed(1)) : null,
      status: 'draft',
      issued_at: new Date().toISOString(),
      notes: formNotes || null,
    })
    setFormAmount('')
    setFormNotes('')
    setShowForm(false)
    setSubmitting(false)
    await load()
  }

  async function updateStatus(invoiceId: string, status: string) {
    setActionLoading(invoiceId)
    await supabase.from('invoices').update({
      status,
      ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', invoiceId)
    await load()
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 mb-1">Contract Value</div>
          <div className="text-2xl font-bold text-gray-900">
            AED {contractValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 mb-1">Invoiced</div>
          <div className="text-2xl font-bold text-blue-700">
            AED {totalInvoiced.toLocaleString()}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{invoicedPct}% of contract</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(invoicedPct, 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 mb-1">Received</div>
          <div className="text-2xl font-bold text-green-700">
            AED {totalPaid.toLocaleString()}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{paidPct}% of contract</span>
              <span className="text-orange-600">
                Outstanding: AED {(totalInvoiced - totalPaid).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(paidPct, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Invoices</h3>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New Invoice'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createInvoice} className="px-5 py-4 bg-blue-50 border-b space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="progress">Progress Payment</option>
                  <option value="final">Final Invoice</option>
                  <option value="retention">Retention Release</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount (AED)
                  {contractValue > 0 && formAmount && (
                    <span className="text-blue-600 ml-1">
                      = {((parseFloat(formAmount) / contractValue) * 100).toFixed(1)}%
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional…"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-3xl mb-2">💰</div>
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">
              The deposit invoice is created automatically when a quote converts.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-mono text-sm font-medium text-gray-900">{inv.invoice_number}</div>
                    {inv.notes && <div className="text-xs text-gray-400 mt-0.5">{inv.notes}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                    AED {inv.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {inv.percentage != null ? `${inv.percentage}%` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                    {inv.paid_at && (
                      <div className="text-xs text-green-600 mt-0.5">
                        {new Date(inv.paid_at).toLocaleDateString('en-GB')}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {inv.issued_at
                      ? new Date(inv.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {inv.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(inv.id, 'sent')}
                          disabled={actionLoading === inv.id}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Mark Sent
                        </button>
                      )}
                      {inv.status === 'sent' && (
                        <button
                          onClick={() => updateStatus(inv.id, 'paid')}
                          disabled={actionLoading === inv.id}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                      {['draft', 'sent'].includes(inv.status) && (
                        <button
                          onClick={() => updateStatus(inv.id, 'cancelled')}
                          disabled={actionLoading === inv.id}
                          className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'contract', label: '📋 Contract' },
  { value: 'quote', label: '📝 Quote' },
  { value: 'drawing', label: '✏️ Drawing' },
  { value: 'photo', label: '📷 Photo' },
  { value: 'invoice', label: '💰 Invoice' },
  { value: 'report', label: '📄 Report' },
  { value: 'other', label: '📎 Other' },
]

interface ProjectDocument {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  category: string
  description: string | null
  created_at: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentsTab({ project }: { project: any }) {
  const supabase = createClient()
  const [docs, setDocs] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadDocs() {
    const { data } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    setDocs((data as ProjectDocument[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadDocs() }, [project.id])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    try {
      const ext = selectedFile.name.split('.').pop()
      const path = `${project.id}/${Date.now()}-${selectedFile.name}`

      const { error: storageErr } = await supabase.storage
        .from('project-documents')
        .upload(path, selectedFile)

      if (storageErr) throw new Error(storageErr.message)

      const { error: dbErr } = await supabase.from('project_documents').insert({
        project_id: project.id,
        file_name: selectedFile.name,
        file_path: path,
        file_size: selectedFile.size,
        mime_type: selectedFile.type || null,
        category,
        description: description || null,
      })

      if (dbErr) throw new Error(dbErr.message)

      setSelectedFile(null)
      setDescription('')
      setCategory('other')
      setShowForm(false)
      await loadDocs()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc: ProjectDocument) {
    const { data } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleDelete(doc: ProjectDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    setDeletingId(doc.id)
    await supabase.storage.from('project-documents').remove([doc.file_path])
    await supabase.from('project_documents').delete().eq('id', doc.id)
    setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    setDeletingId(null)
  }

  const categoryLabel = (val: string) =>
    CATEGORIES.find((c) => c.value === val)?.label ?? val

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setShowForm((s) => !s); setError(null) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Upload Document'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleUpload}
          className="bg-white rounded-lg shadow p-5 space-y-4 border border-blue-100"
        >
          <h3 className="text-sm font-semibold text-gray-900">Upload Document</h3>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">File *</label>
            <input
              type="file"
              required
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 animate-pulse">
          Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <div className="text-4xl mb-3">📁</div>
          <p className="font-medium mb-1">No documents yet</p>
          <p className="text-sm">Upload contracts, drawings, photos, invoices and more.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{doc.file_name}</div>
                    {doc.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{doc.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {categoryLabel(doc.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatBytes(doc.file_size)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingId === doc.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
