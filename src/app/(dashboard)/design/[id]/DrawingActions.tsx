'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { notifyDesignerAssignment } from '@/lib/notifications'
import { releaseDrawingItemsToProduction } from '@/lib/drawings/release-to-production'

interface DrawingActionsProps {
  drawingId: string
  drawingNumber: string
  drawingTitle: string
  currentStatus: string
  assignedTo: string | null
  designers: Array<{ id: string; full_name: string }>
}

export default function DrawingActions({
  drawingId,
  drawingNumber,
  drawingTitle,
  currentStatus,
  assignedTo,
  designers,
}: DrawingActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDesigner, setSelectedDesigner] = useState(assignedTo || '')
  const [dueDate, setDueDate] = useState('')

  const updateStatus = async (newStatus: string) => {
    console.log('updateStatus called:', { currentStatus, newStatus, loading })
    setLoading(true)

    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Auto-set reviewed_by when transitioning to waiting_client_approval
    if (newStatus === 'waiting_client_approval') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        updates.reviewed_by = user.id
        updates.reviewed_at = new Date().toISOString()
      }
    }

    // Auto-set released_by when sending to production
    if (newStatus === 'sent_to_production') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        updates.released_by = user.id
      }
    }

    const { error, data } = await supabase
      .from('drawing_requirements')
      .update(updates)
      .eq('id', drawingId)
      .select('project_id')
      .single()

    if (error) {
      alert('Failed to update status')
      console.error(error)
    } else {
      // If sent to production, release THIS drawing's items
      if (newStatus === 'sent_to_production' && data?.project_id) {
        await releaseDrawingItemsToProduction(supabase, drawingId, data.project_id)
      }
      
      router.refresh()
    }

    setLoading(false)
  }

  const assignDesigner = async () => {
    if (!selectedDesigner) {
      alert('Please select a designer')
      return
    }

    setLoading(true)

    const updates: Record<string, any> = {
      assigned_to: selectedDesigner,
      assigned_at: new Date().toISOString(),
      status: 'in_production', // Start immediately when assigned
      updated_at: new Date().toISOString(),
    }

    if (dueDate) {
      updates.due_date = dueDate
    }

    const { error } = await supabase
      .from('drawing_requirements')
      .update(updates)
      .eq('id', drawingId)

    if (error) {
      alert('Failed to assign designer')
      setLoading(false)
    } else {
      // 🔔 NOTIFY designer about assignment
      try {
        await notifyDesignerAssignment(
          supabase,
          selectedDesigner,
          drawingId,
          drawingNumber,
          drawingTitle,
          dueDate
        )
      } catch (notifError) {
        console.error('Failed to send notification:', notifError)
        // Don't fail the assignment if notification fails
      }
      
      setShowAssignModal(false)
      router.refresh()
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
        <div className="space-y-2">
          {currentStatus === 'queued' && (
            <button
              onClick={() => setShowAssignModal(true)}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              👤 Assign Designer
            </button>
          )}

          {currentStatus === 'in_production' && (
            <>
              <button
                onClick={() => updateStatus('waiting_client_approval')}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                📤 Submit for Client Approval
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                disabled={loading}
                className="w-full border border-gray-300 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-50"
              >
                🔄 Reassign Designer
              </button>
              <button
                onClick={() => updateStatus('on_hold')}
                disabled={loading}
                className="w-full border border-gray-300 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-50"
              >
                ⏸️ Put On Hold
              </button>
            </>
          )}

          {currentStatus === 'waiting_client_approval' && (
            <>
              <div className="text-center text-orange-600 py-2 font-medium text-sm">
                ⏳ Waiting for client approval via DocuSign
              </div>
              <button
                onClick={() => updateStatus('approved')}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                ✅ Mark as Approved
              </button>
              <button
                onClick={() => updateStatus('in_production')}
                disabled={loading}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                ❌ Client Requested Changes
              </button>
            </>
          )}

          {currentStatus === 'approved' && (
            <>
              <div className="text-center text-green-600 py-2 font-medium">
                ✅ Client Approved
              </div>
              <button
                onClick={() => updateStatus('sent_to_production')}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                🏭 Release to Production
              </button>
            </>
          )}

          {currentStatus === 'sent_to_production' && (
            <div className="text-center text-blue-600 py-2 font-medium">
              🏭 Released to Production Team
            </div>
          )}

          {currentStatus === 'on_hold' && (
            <button
              onClick={() => updateStatus('in_production')}
              disabled={loading}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              ▶️ Resume Production
            </button>
          )}

          {currentStatus === 'cancelled' && (
            <div className="text-center text-gray-600 py-2 font-medium">
              🚫 Cancelled
            </div>
          )}
        </div>
      </div>

      {/* Assign Designer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Designer</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designer *
                </label>
                <select
                  value={selectedDesigner}
                  onChange={(e) => setSelectedDesigner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                >
                  <option value="">Select a designer...</option>
                  {designers.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={assignDesigner}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign & Start'}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedDesigner(assignedTo || '')
                  setDueDate('')
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
