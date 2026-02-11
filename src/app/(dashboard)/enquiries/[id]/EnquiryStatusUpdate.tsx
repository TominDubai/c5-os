'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const statuses = [
  { value: 'new', label: '🟢 New' },
  { value: 'reviewing', label: '🟡 Reviewing' },
  { value: 'quoted', label: '🔵 Quoted' },
  { value: 'won', label: '✅ Won' },
  { value: 'lost', label: '❌ Lost' },
]

export default function EnquiryStatusUpdate({
  enquiryId,
  currentStatus,
}: {
  enquiryId: string
  currentStatus: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    
    setLoading(true)
    
    const { error } = await supabase
      .from('enquiries')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', enquiryId)
    
    if (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } else {
      router.refresh()
    }
    
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
      <div className="space-y-2">
        {statuses.map((status) => (
          <button
            key={status.value}
            onClick={() => handleStatusChange(status.value)}
            disabled={loading || status.value === currentStatus}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              status.value === currentStatus
                ? 'bg-blue-100 text-blue-800 font-medium'
                : 'hover:bg-gray-100 text-gray-700'
            } disabled:opacity-50`}
          >
            {status.label}
            {status.value === currentStatus && ' ✓'}
          </button>
        ))}
      </div>
    </div>
  )
}
