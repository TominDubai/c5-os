'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteDeleteProps {
  quoteId: string
  quoteNumber: string
}

export default function QuoteDelete({ quoteId, quoteNumber }: QuoteDeleteProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const deleteQuote = async () => {
    setLoading(true)
    
    try {
      // Delete quote items first
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId)
      
      // Delete the quote
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId)
      
      if (error) throw error
      
      router.push('/quotes')
      router.refresh()
    } catch (err: any) {
      alert('Failed to delete: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-red-600 hover:text-red-800 text-sm"
      >
        🗑️ Delete Quote
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Quote?</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete <strong>{quoteNumber}</strong> and all its items. This cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={deleteQuote}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : '🗑️ Yes, Delete'}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
