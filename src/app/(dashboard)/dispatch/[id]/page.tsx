import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeliveryActions from './DeliveryActions'

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

export default async function DispatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: dispatch, error } = await supabase
    .from('dispatches')
    .select(`
      *,
      projects(id, project_code, name, site_address, clients(name, phone)),
      driver:users!dispatches_driver_id_fkey(full_name),
      dispatch_items(
        id,
        delivered,
        delivered_at,
        project_item_id,
        project_items(id, item_code, description, status, floor_code, room_code)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !dispatch) notFound()

  const items = dispatch.dispatch_items || []
  const deliveredCount = items.filter((i: any) => i.delivered).length

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dispatch" className="text-gray-500 hover:text-gray-700">← Dispatch</Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{dispatch.dispatch_number}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[dispatch.status]}`}>
                {statusLabels[dispatch.status]}
              </span>
            </div>
            <div className="text-gray-600 mt-1">
              {dispatch.projects?.project_code} — {dispatch.projects?.name}
            </div>
            {dispatch.projects?.site_address && (
              <div className="text-sm text-gray-500 mt-1">📍 {dispatch.projects.site_address}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{deliveredCount} / {items.length}</div>
            <div className="text-sm text-gray-500">Items Delivered</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Delivery List */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Delivery List ({items.length} items)</h2>
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${items.length > 0 ? (deliveredCount / items.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {items.length > 0 ? Math.round((deliveredCount / items.length) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`px-6 py-4 flex items-center justify-between ${item.delivered ? 'bg-green-50' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-sm ${item.delivered ? 'text-green-600' : 'text-blue-600'}`}>
                        {item.project_items?.item_code}
                      </span>
                      {item.delivered && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                    <div className={`text-sm mt-0.5 ${item.delivered ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.project_items?.description}
                    </div>
                    {(item.project_items?.floor_code || item.project_items?.room_code) && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.project_items.floor_code} • {item.project_items.room_code}
                      </div>
                    )}
                    {item.delivered_at && (
                      <div className="text-xs text-green-600 mt-0.5">
                        {new Date(item.delivered_at).toLocaleString('en-GB')}
                      </div>
                    )}
                  </div>
                  {dispatch.status !== 'delivered' && (
                    <DeliveryActions
                      dispatchItemId={item.id}
                      projectItemId={item.project_items?.id}
                      delivered={item.delivered}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Dispatch Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Driver</dt>
                <dd className="text-gray-900 font-medium">{(dispatch as any).driver?.full_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Vehicle</dt>
                <dd className="text-gray-900">{dispatch.vehicle_number || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Scheduled Date</dt>
                <dd className="text-gray-900">
                  {dispatch.scheduled_date
                    ? new Date(dispatch.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                    : '—'}
                </dd>
              </div>
              {dispatch.site_contact_name && (
                <div>
                  <dt className="text-xs text-gray-500">Site Contact</dt>
                  <dd className="text-gray-900">{dispatch.site_contact_name}</dd>
                  {dispatch.site_contact_phone && (
                    <a href={`tel:${dispatch.site_contact_phone}`} className="text-blue-600 text-sm block">
                      {dispatch.site_contact_phone}
                    </a>
                  )}
                </div>
              )}
              {dispatch.projects?.clients && (
                <div>
                  <dt className="text-xs text-gray-500">Client</dt>
                  <dd className="text-gray-900">{dispatch.projects.clients.name}</dd>
                  {dispatch.projects.clients.phone && (
                    <a href={`tel:${dispatch.projects.clients.phone}`} className="text-blue-600 text-sm block">
                      {dispatch.projects.clients.phone}
                    </a>
                  )}
                </div>
              )}
            </dl>
          </div>

          {/* Status Actions */}
          {dispatch.status !== 'delivered' && (
            <DeliveryActions
              dispatchId={dispatch.id}
              dispatchStatus={dispatch.status}
              allDelivered={deliveredCount === items.length && items.length > 0}
            />
          )}

          {dispatch.status === 'delivered' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium">✅ Delivery Complete</p>
              <p className="text-green-600 text-sm mt-1">
                {dispatch.delivered_at
                  ? new Date(dispatch.delivered_at).toLocaleDateString('en-GB')
                  : ''}
              </p>
            </div>
          )}

          <Link
            href={`/projects/${dispatch.project_id}`}
            className="block text-center text-sm text-blue-600 hover:underline"
          >
            View Project →
          </Link>
        </div>
      </div>
    </div>
  )
}
