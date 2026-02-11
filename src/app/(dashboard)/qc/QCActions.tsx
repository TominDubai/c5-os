'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QCActionsProps {
  itemId: string
  qcType: 'workshop' | 'site'
}

export default function QCActions({ itemId, qcType }: QCActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [failReason, setFailReason] = useState('')

  const handlePass = async () => {
    setLoading(true)
    
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    
    if (qcType === 'workshop') {
      updates.status = 'ready_for_dispatch'
      updates.workshop_qc_passed = true
      updates.workshop_qc_at = new Date().toISOString()
    } else {
      updates.status = 'qs_verified'
      updates.site_qc_passed = true
      updates.site_qc_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('project_items')
      .update(updates)
      .eq('id', itemId)
    
    if (error) {
      console.error('Error:', error)
      alert('Failed to update')
    } else {
      router.refresh()
    }
    
    setLoading(false)
  }

  const handleFail = async () => {
    if (!failReason.trim()) {
      alert('Please enter a reason for failure')
      return
    }
    
    setLoading(true)
    
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    
    if (qcType === 'workshop') {
      updates.status = 'qc_failed'
      updates.workshop_qc_passed = false
      updates.workshop_qc_at = new Date().toISOString()
      updates.workshop_qc_notes = failReason
    } else {
      updates.status = 'installed' // Back to installed for rework
      updates.site_qc_passed = false
      updates.site_qc_at = new Date().toISOString()
      updates.site_qc_notes = failReason
    }
    
    const { error } = await supabase
      .from('project_items')
      .update(updates)
      .eq('id', itemId)
    
    if (error) {
      console.error('Error:', error)
      alert('Failed to update')
    } else {
      setShowFailModal(false)
      setFailReason('')
      router.refresh()
    }
    
    setLoading(false)
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handlePass}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 text-sm"
        >
          {loading ? '...' : '✓ Pass'}
        </button>
        <button
          onClick={() => setShowFailModal(true)}
          disabled={loading}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 text-sm"
        >
          ✗ Fail
        </button>
      </div>

      {/* Fail Modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">QC Failed</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for failure:</p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
              placeholder="Describe the issue..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleFail}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Submit Failure'}
              </button>
              <button
                onClick={() => {
                  setShowFailModal(false)
                  setFailReason('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
