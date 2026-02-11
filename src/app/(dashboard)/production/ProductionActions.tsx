'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ProductionActionsProps {
  itemId: string
  currentStatus: string
}

export default function ProductionActions({ itemId, currentStatus }: ProductionActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const updateStatus = async (newStatus: string, extraFields: Record<string, any> = {}) => {
    setLoading(true)
    
    const { error } = await supabase
      .from('project_items')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...extraFields 
      })
      .eq('id', itemId)
    
    if (error) {
      console.error('Error updating item:', error)
      alert('Failed to update item status')
    } else {
      router.refresh()
    }
    
    setLoading(false)
  }

  if (currentStatus === 'pre_production') {
    return (
      <button
        onClick={() => updateStatus('in_production', { production_started_at: new Date().toISOString() })}
        disabled={loading}
        className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm"
      >
        {loading ? '...' : 'Start Production'}
      </button>
    )
  }

  if (currentStatus === 'in_production') {
    return (
      <button
        onClick={() => updateStatus('ready_for_qc', { production_completed_at: new Date().toISOString() })}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
      >
        {loading ? '...' : 'Mark Complete → QC'}
      </button>
    )
  }

  return null
}
