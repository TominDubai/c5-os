import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-800',
  in_production: 'bg-yellow-100 text-yellow-800',
  waiting_client_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  sent_to_production: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  queued: 'Queued',
  in_production: 'In Production',
  waiting_client_approval: 'Waiting Client Approval',
  approved: 'Approved',
  sent_to_production: 'Sent to Production',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
}

const statusEmoji: Record<string, string> = {
  queued: '📋',
  in_production: '🎨',
  waiting_client_approval: '⏳',
  approved: '✅',
  sent_to_production: '🏭',
  on_hold: '⏸️',
  cancelled: '🚫',
}

export default async function DesignPage() {
  const supabase = await createClient()

  // Get all drawing requirements with project info
  const { data: drawingReqs, error } = await supabase
    .from('drawing_requirements')
    .select(`
      *,
      projects(id, project_code, name, status),
      users!drawing_requirements_assigned_to_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  console.log('Drawing requirements query:', JSON.stringify({ 
    count: drawingReqs?.length, 
    drawingReqs: drawingReqs?.map(d => ({ id: d.id, title: d.title, status: d.status })),
    error 
  }, null, 2))

  // Group by status for dashboard view
  const queued = drawingReqs?.filter((d) => d.status === 'queued') || []
  const inProduction = drawingReqs?.filter((d) => d.status === 'in_production') || []
  const waitingApproval = drawingReqs?.filter((d) => d.status === 'waiting_client_approval') || []
  const approved = drawingReqs?.filter((d) => d.status === 'approved') || []
  const sentToProduction = drawingReqs?.filter((d) => d.status === 'sent_to_production') || []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Design Management</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-600">{queued.length}</div>
          <div className="text-gray-600 text-sm">📋 Queued</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{inProduction.length}</div>
          <div className="text-gray-600 text-sm">🎨 In Production</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-orange-600">{waitingApproval.length}</div>
          <div className="text-gray-600 text-sm">⏳ Awaiting Client</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{approved.length}</div>
          <div className="text-gray-600 text-sm">✅ Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{sentToProduction.length}</div>
          <div className="text-gray-600 text-sm">🏭 In Production</div>
        </div>
      </div>

      {/* Drawing Requirements Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">All Drawing Requirements</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drawing #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {drawingReqs && drawingReqs.length > 0 ? (
              drawingReqs.map((req: any) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-blue-600">
                    <Link href={`/design/${req.id}`} className="hover:underline">
                      {req.drawing_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{req.title}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/projects/${req.projects.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {req.projects.project_code}
                    </Link>
                    <div className="text-gray-500 text-xs">{req.projects.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {req.floor_code && `${req.floor_code}`}
                    {req.room_code && ` / ${req.room_code}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {req.users?.full_name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                      {statusEmoji[req.status]} {statusLabels[req.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {req.due_date ? new Date(req.due_date).toLocaleDateString('en-GB') : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No drawing requirements yet. Convert a quote to a project to auto-generate them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
