'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteActionsProps {
  quoteId: string
  currentStatus: string
  approvalStatus?: string
  clientId: string | null
  enquiryId: string | null
  paymentReceived?: boolean
  quoteTotal?: number
}

export default function QuoteActions({
  quoteId,
  currentStatus,
  approvalStatus = 'not_requested',
  clientId,
  enquiryId,
  paymentReceived = false,
  quoteTotal = 0
}: QuoteActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showDocuSignModal, setShowDocuSignModal] = useState(false)

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(quoteTotal.toString())
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Convert form state
  const [projectName, setProjectName] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [designDueDate, setDesignDueDate] = useState('')
  const [designerEmail, setDesignerEmail] = useState('')

  // DocuSign form state
  const [signerEmail, setSignerEmail] = useState('')
  const [signerName, setSignerName] = useState('')

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    
    if (newStatus === 'sent') {
      updates.sent_at = new Date().toISOString()
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 30)
      updates.valid_until = validUntil.toISOString().split('T')[0]
    }
    if (newStatus === 'approved') {
      updates.approved_at = new Date().toISOString()
    }
    if (newStatus === 'rejected') {
      updates.rejected_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', quoteId)
    
    if (error) {
      alert('Failed to update status')
    } else {
      router.refresh()
    }
    
    setLoading(false)
  }

  const confirmPayment = async () => {
    if (!paymentAmount || !paymentDate) {
      alert('Please enter payment amount and date')
      return
    }
    
    setLoading(true)
    
    const { error } = await supabase
      .from('quotes')
      .update({
        payment_received: true,
        payment_amount: parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_reference: paymentReference || null,
        payment_method: paymentMethod,
        payment_notes: paymentNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
    
    if (error) {
      alert('Failed to confirm payment: ' + error.message)
    } else {
      setShowPaymentModal(false)
      router.refresh()
    }
    
    setLoading(false)
  }

  const convertToProject = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name')
      return
    }
    
    setLoading(true)
    
    try {
      // Get the quote with items
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', quoteId)
        .single()
      
      if (quoteError || !quote) throw new Error('Failed to fetch quote')
      
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          quote_id: quoteId,
          client_id: clientId,
          name: projectName,
          site_address: siteAddress || null,
          project_type: quote.enquiry_id ? null : 'other',
          contract_value: quote.total,
          status: 'design_pending',
          start_date: new Date().toISOString().split('T')[0],
          design_due_date: designDueDate || null,
        }])
        .select()
        .single()
      
      if (projectError || !project) throw new Error('Failed to create project')
      
      // Create project items from quote items - status: awaiting_drawings
      if (quote.quote_items && quote.quote_items.length > 0) {
        const projectItems = quote.quote_items.map((item: any) => ({
          project_id: project.id,
          quote_item_id: item.id,
          item_code: item.item_code,
          description: item.description,
          type_code: item.type_code || null,
          floor_code: item.floor_code || null,
          room_code: item.room_code || null,
          sequence: item.sequence || null,
          quantity: Math.round(Number(item.quantity) || 1),
          status: 'awaiting_drawings', // NEW: Start in drawings phase
        }))
        
        const { error: itemsError } = await supabase
          .from('project_items')
          .insert(projectItems)
        
        if (itemsError) {
          throw new Error(`Failed to create items: ${itemsError.message}`)
        }
      }
      
      // Update quote status to converted
      await supabase
        .from('quotes')
        .update({ status: 'converted', updated_at: new Date().toISOString() })
        .eq('id', quoteId)
      
      // Update enquiry status if applicable
      if (enquiryId) {
        await supabase
          .from('enquiries')
          .update({ status: 'won', updated_at: new Date().toISOString() })
          .eq('id', enquiryId)
      }
      
      // Send email notification to design team
      if (designerEmail) {
        try {
          await fetch('/api/notify-design-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              projectName,
              itemCount: quote.quote_items?.length || 0,
              designDueDate,
              designerEmail,
            }),
          })
          
          // Mark as notified
          await supabase
            .from('projects')
            .update({ design_team_notified_at: new Date().toISOString() })
            .eq('id', project.id)
        } catch (e) {
          console.error('Failed to send design team notification:', e)
          // Don't block project creation if email fails
        }
      }
      
      // Navigate to the new project
      router.push(`/projects/${project.id}`)
      router.refresh()
      
    } catch (err: any) {
      console.error('Error converting to project:', err)
      alert(err.message || 'Failed to convert to project')
      setLoading(false)
    }
  }

  const sendViaDocuSign = async () => {
    if (!signerEmail || !signerName) {
      alert('Please enter signer name and email')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/docusign/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          signerEmail,
          signerName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send via DocuSign')
      }

      const result = await response.json()

      alert(`✅ Quote sent via DocuSign!\nEnvelope ID: ${result.envelopeId}`)
      setShowDocuSignModal(false)
      router.refresh()

    } catch (err: any) {
      console.error('Error sending via DocuSign:', err)
      alert(err.message || 'Failed to send via DocuSign')
    }

    setLoading(false)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
        <div className="space-y-2">
          {currentStatus === 'draft' && approvalStatus === 'approved' && (
            <>
              <button
                onClick={() => setShowDocuSignModal(true)}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? '...' : '✍️ Send via DocuSign'}
              </button>
              <button
                onClick={() => updateStatus('sent')}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '...' : '📤 Mark as Sent'}
              </button>
            </>
          )}

          {currentStatus === 'draft' && approvalStatus !== 'approved' && (
            <div className="bg-orange-50 text-orange-700 text-sm px-3 py-2 rounded-md">
              Quote must be internally approved before sending to client.
            </div>
          )}
          
          {currentStatus === 'sent' && (
            <>
              <button
                onClick={() => updateStatus('approved')}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '...' : '✅ Mark as Approved'}
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                disabled={loading}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '...' : '❌ Mark as Rejected'}
              </button>
            </>
          )}
          
          {currentStatus === 'approved' && !paymentReceived && (
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={loading}
              className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              💰 Confirm Payment Received
            </button>
          )}
          
          {currentStatus === 'approved' && paymentReceived && (
            <>
              <div className="bg-green-50 text-green-800 px-3 py-2 rounded-md text-sm mb-2">
                ✅ Payment received
              </div>
              <button
                onClick={() => setShowConvertModal(true)}
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                🚀 Convert to Project
              </button>
            </>
          )}
          
          {currentStatus === 'converted' && (
            <div className="text-center text-green-600 py-2 font-medium">
              ✅ Converted to Project
            </div>
          )}
          
          {currentStatus === 'rejected' && (
            <div className="text-center text-gray-500 py-2">
              Quote was rejected
            </div>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Confirm Payment</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Received (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., TRN123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmPayment}
                disabled={loading}
                className="flex-1 bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : '✅ Confirm Payment'}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Convert to Project</h3>
            <p className="text-gray-600 mb-4">
              Items will be sent to the design team for drawings.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Kitchen - Villa Palm Jumeirah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Address
                </label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g., Villa 23, Palm Jumeirah, Dubai"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Design Due Date
                </label>
                <input
                  type="date"
                  value={designDueDate}
                  onChange={(e) => setDesignDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Design Team Email (for notification)
                </label>
                <input
                  type="email"
                  value={designerEmail}
                  onChange={(e) => setDesignerEmail(e.target.value)}
                  placeholder="e.g., design@concept5.ae"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={convertToProject}
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : '🚀 Create Project & Notify Design'}
              </button>
              <button
                onClick={() => {
                  setShowConvertModal(false)
                  setProjectName('')
                  setSiteAddress('')
                  setDesignDueDate('')
                  setDesignerEmail('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DocuSign Send Modal */}
      {showDocuSignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">✍️ Send via DocuSign</h3>
            <p className="text-gray-600 mb-4">
              Send this quote to the client for electronic signature.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Name *
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g., John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Email *
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={sendViaDocuSign}
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : '✍️ Send for Signature'}
              </button>
              <button
                onClick={() => {
                  setShowDocuSignModal(false)
                  setSignerEmail('')
                  setSignerName('')
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
