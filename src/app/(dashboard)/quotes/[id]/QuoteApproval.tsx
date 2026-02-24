'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteApprovalProps {
  quoteId: string
  approvalStatus: string
  approvalNotes: string | null
  approvedByName: string | null
  approvalCompletedAt: string | null
  quoteStatus: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  not_requested: { label: 'Not Submitted', color: 'bg-gray-100 text-gray-700' },
  pending:       { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' },
  approved:      { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected:      { label: 'Rejected', color: 'bg-red-100 text-red-800' },
}

export default function QuoteApproval({
  quoteId,
  approvalStatus,
  approvalNotes,
  approvedByName,
  approvalCompletedAt,
  quoteStatus,
}: QuoteApprovalProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const config = statusConfig[approvalStatus] || statusConfig.not_requested

  const submitForApproval = async () => {
    setLoading(true)
    await supabase
      .from('quotes')
      .update({
        approval_status: 'pending',
        approval_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
    setLoading(false)
    router.refresh()
  }

  const approve = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('quotes')
      .update({
        approval_status: 'approved',
        approved_by: user?.id,
        approval_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
    setLoading(false)
    router.refresh()
  }

  const reject = async () => {
    if (!notes.trim()) return
    setLoading(true)
    await supabase
      .from('quotes')
      .update({
        approval_status: 'rejected',
        approval_notes: notes.trim(),
        approval_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
    setLoading(false)
    setShowRejectForm(false)
    router.refresh()
  }

  const resubmit = async () => {
    setLoading(true)
    await supabase
      .from('quotes')
      .update({
        approval_status: 'pending',
        approval_notes: null,
        approved_by: null,
        approval_requested_at: new Date().toISOString(),
        approval_completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
    setLoading(false)
    router.refresh()
  }

  // Don't show for converted/rejected quotes
  if (quoteStatus === 'converted') return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Internal Approval</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Not submitted yet */}
      {approvalStatus === 'not_requested' && (
        <button
          onClick={submitForApproval}
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 disabled:opacity-50 text-sm"
        >
          {loading ? 'Submitting...' : '📋 Submit for Approval'}
        </button>
      )}

      {/* Pending — show approve/reject buttons */}
      {approvalStatus === 'pending' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Awaiting approval from Tom, Aftab or Jinky.
          </p>
          {!showRejectForm ? (
            <>
              <button
                onClick={approve}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {loading ? '...' : '✅ Approve Quote'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                className="w-full border border-red-300 text-red-600 py-2 px-4 rounded-md hover:bg-red-50 text-sm"
              >
                ❌ Reject
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={reject}
                  disabled={loading || !notes.trim()}
                  className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  {loading ? '...' : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approved */}
      {approvalStatus === 'approved' && (
        <div className="text-sm text-gray-600">
          <p className="text-green-700 font-medium mb-1">✅ Approved — ready to send to client</p>
          {approvedByName && (
            <p className="text-xs text-gray-500">
              By {approvedByName}
              {approvalCompletedAt && ` on ${new Date(approvalCompletedAt).toLocaleDateString('en-GB')}`}
            </p>
          )}
        </div>
      )}

      {/* Rejected */}
      {approvalStatus === 'rejected' && (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-md p-3">
            <p className="text-sm text-red-700 font-medium">❌ Rejected</p>
            {approvalNotes && (
              <p className="text-sm text-red-600 mt-1">{approvalNotes}</p>
            )}
          </div>
          <button
            onClick={resubmit}
            disabled={loading}
            className="w-full border border-orange-300 text-orange-600 py-2 px-4 rounded-md hover:bg-orange-50 text-sm"
          >
            {loading ? '...' : '📋 Resubmit for Approval'}
          </button>
        </div>
      )}
    </div>
  )
}
