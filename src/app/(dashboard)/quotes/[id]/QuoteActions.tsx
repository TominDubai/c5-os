'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteActionsProps {
  quoteId: string
  currentStatus: string
  clientId: string | null
  enquiryId: string | null
}

export default function QuoteActions({ quoteId, currentStatus, clientId, enquiryId }: QuoteActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [siteAddress, setSiteAddress] = useState('')

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
          project_type: quote.enquiry_id ? null : 'other', // Will be set from enquiry if available
          contract_value: quote.total,
          status: 'design_pending',
          start_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single()
      
      if (projectError || !project) throw new Error('Failed to create project')
      
      // Create project items from quote items
      const projectItems = quote.quote_items.map((item: any) => ({
        project_id: project.id,
        quote_item_id: item.id,
        item_code: item.item_code,
        description: item.description,
        type_code: item.type_code,
        floor_code: item.floor_code,
        room_code: item.room_code,
        sequence: item.sequence,
        quantity: item.quantity,
        status: 'pre_production',
      }))
      
      const { error: itemsError } = await supabase
        .from('project_items')
        .insert(projectItems)
      
      if (itemsError) throw new Error('Failed to create project items')
      
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
      
      // Navigate to the new project
      router.push(`/projects/${project.id}`)
      router.refresh()
      
    } catch (err: any) {
      console.error('Error converting to project:', err)
      alert(err.message || 'Failed to convert to project')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
        <div className="space-y-2">
          {currentStatus === 'draft' && (
            <>
              <button
                onClick={() => updateStatus('sent')}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '...' : '📤 Mark as Sent'}
              </button>
              <button
                onClick={() => updateStatus('approved')}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '...' : '✅ Mark as Approved'}
              </button>
            </>
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
          
          {currentStatus === 'approved' && (
            <button
              onClick={() => setShowConvertModal(true)}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              🚀 Convert to Project
            </button>
          )}
          
          {currentStatus === 'rejected' && (
            <div className="text-center text-gray-500 py-2">
              Quote was rejected
            </div>
          )}
        </div>
      </div>

      {/* Convert to Project Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Convert to Project</h3>
            <p className="text-gray-600 mb-4">
              This will create a new project with all quote items ready for production scheduling.
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
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={convertToProject}
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : '🚀 Create Project'}
              </button>
              <button
                onClick={() => {
                  setShowConvertModal(false)
                  setProjectName('')
                  setSiteAddress('')
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
