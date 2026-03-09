'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Per-item delivery toggle
interface ItemProps {
  dispatchItemId: string
  projectItemId: string
  delivered: boolean
  dispatchId?: never
  dispatchStatus?: never
  allDelivered?: never
}

// Dispatch-level status actions
interface DispatchProps {
  dispatchId: string
  dispatchStatus: string
  allDelivered: boolean
  dispatchItemId?: never
  projectItemId?: never
  delivered?: never
}

type Props = ItemProps | DispatchProps

export default function DeliveryActions(props: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Item-level: mark individual item delivered / not delivered
  if ('dispatchItemId' in props && props.dispatchItemId) {
    const { dispatchItemId, projectItemId, delivered } = props

    const toggleDelivered = async () => {
      setLoading(true)
      const now = new Date().toISOString()
      const newDelivered = !delivered

      await supabase
        .from('dispatch_items')
        .update({ delivered: newDelivered, delivered_at: newDelivered ? now : null })
        .eq('id', dispatchItemId)

      // Update project item status
      await supabase
        .from('project_items')
        .update({
          status: newDelivered ? 'on_site' : 'dispatched',
          received_on_site_at: newDelivered ? now : null,
          updated_at: now,
        })
        .eq('id', projectItemId)

      router.refresh()
      setLoading(false)
    }

    if (delivered) {
      return (
        <button
          onClick={toggleDelivered}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {loading ? '...' : 'Undo'}
        </button>
      )
    }

    return (
      <button
        onClick={toggleDelivered}
        disabled={loading}
        className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? '...' : '✓ Delivered'}
      </button>
    )
  }

  // Dispatch-level status progression
  const { dispatchId, dispatchStatus, allDelivered } = props as DispatchProps

  const updateDispatchStatus = async (newStatus: string) => {
    setLoading(true)
    const now = new Date().toISOString()
    const extra: Record<string, any> = { status: newStatus, updated_at: now }
    if (newStatus === 'loaded') extra.loaded_at = now
    if (newStatus === 'in_transit') extra.departed_at = now
    if (newStatus === 'delivered') extra.delivered_at = now

    await supabase.from('dispatches').update(extra).eq('id', dispatchId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Dispatch Status</h3>

      {dispatchStatus === 'pending' && (
        <button
          onClick={() => updateDispatchStatus('loaded')}
          disabled={loading}
          className="w-full bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm"
        >
          {loading ? '...' : '📦 Mark as Loaded'}
        </button>
      )}

      {dispatchStatus === 'loaded' && (
        <button
          onClick={() => updateDispatchStatus('in_transit')}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? '...' : '🚚 Mark as In Transit'}
        </button>
      )}

      {dispatchStatus === 'in_transit' && (
        <button
          onClick={() => updateDispatchStatus('delivered')}
          disabled={loading || !allDelivered}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {loading ? '...' : '✅ Complete Delivery'}
        </button>
      )}

      {dispatchStatus === 'in_transit' && !allDelivered && (
        <p className="text-xs text-gray-500 text-center">
          Tick all items as delivered before completing
        </p>
      )}
    </div>
  )
}
