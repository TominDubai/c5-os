import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DrawingActions from './DrawingActions'

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
  queued: '📋 Queued',
  in_production: '🎨 In Production',
  waiting_client_approval: '⏳ Waiting Client Approval',
  approved: '✅ Approved',
  sent_to_production: '🏭 Sent to Production',
  on_hold: '⏸️ On Hold',
  cancelled: '🚫 Cancelled',
}

export default async function DrawingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: drawing, error } = await supabase
    .from('drawing_requirements')
    .select(`
      *,
      projects(id, project_code, name, status),
      users!drawing_requirements_assigned_to_fkey(id, full_name),
      reviewed_by_user:users!drawing_requirements_reviewed_by_fkey(full_name),
      released_by_user:users!drawing_requirements_released_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (error || !drawing) {
    notFound()
  }

  // Get items for this drawing
  const { data: drawingItems } = await supabase
    .from('drawing_requirement_items')
    .select(`
      *,
      project_items(*)
    `)
    .eq('drawing_requirement_id', id)

  // Get all designers for assignment dropdown
  const { data: designers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'designer')
    .order('full_name')

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-9">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/design" className="text-gray-500 hover:text-gray-700">
              ← Design Management
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-blue-600">{drawing.drawing_number}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[drawing.status]}`}>
              {statusLabels[drawing.status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{drawing.title}</h1>
          <Link 
            href={`/projects/${drawing.projects.id}`}
            className="text-blue-600 hover:underline"
          >
            {drawing.projects.project_code} - {drawing.projects.name}
          </Link>
        </div>

        {/* Drawing Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Drawing Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Type</span>
              <p className="font-medium">{drawing.type_code || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Floor</span>
              <p className="font-medium">{drawing.floor_code || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Room</span>
              <p className="font-medium">{drawing.room_code || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Due Date</span>
              <p className="font-medium">
                {drawing.due_date ? new Date(drawing.due_date).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
          </div>

          {drawing.notes && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">Notes</span>
              <p className="text-gray-900 mt-1">{drawing.notes}</p>
            </div>
          )}
        </div>

        {/* Items Covered */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              Items Covered ({drawingItems?.length || 0})
            </h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {drawingItems && drawingItems.length > 0 ? (
                drawingItems.map((di: any) => (
                  <tr key={di.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-blue-600">
                      {di.project_items?.item_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {di.project_items?.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {di.project_items?.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {di.project_items?.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No items linked to this drawing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      <div className="col-span-3 space-y-6">
        {/* Assignment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignment</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Designer:</span>
              <p className="font-medium">{drawing.users?.full_name || 'Not assigned'}</p>
            </div>
            {drawing.assigned_at && (
              <div>
                <span className="text-gray-600">Assigned:</span>
                <p>{new Date(drawing.assigned_at).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            {drawing.started_at && (
              <div>
                <span className="text-gray-600">Started:</span>
                <p>{new Date(drawing.started_at).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            {drawing.completed_at && (
              <div>
                <span className="text-gray-600">Completed:</span>
                <p>{new Date(drawing.completed_at).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            {drawing.approved_at && (
              <div>
                <span className="text-gray-600">Approved:</span>
                <p>{new Date(drawing.approved_at).toLocaleDateString('en-GB')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <DrawingActions
          drawingId={drawing.id}
          drawingNumber={drawing.drawing_number}
          drawingTitle={drawing.title}
          currentStatus={drawing.status}
          assignedTo={drawing.assigned_to}
          designers={designers || []}
        />
      </div>
    </div>
  )
}
