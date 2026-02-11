'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface QuoteItem {
  id: string
  item_code: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

const itemTypes = [
  { code: 'K', name: 'Kitchen' },
  { code: 'W', name: 'Wardrobes' },
  { code: 'V', name: 'Vanity' },
  { code: 'T', name: 'TV Unit' },
  { code: 'J', name: 'Joinery' },
]

const floorCodes = [
  { code: 'BF', name: 'Basement' },
  { code: 'GF', name: 'Ground Floor' },
  { code: 'FF', name: 'First Floor' },
  { code: 'SF', name: 'Second Floor' },
]

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const enquiryId = searchParams.get('enquiry')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_name: '',
    client_id: null as string | null,
  })
  
  const [items, setItems] = useState<QuoteItem[]>([])
  const [newItem, setNewItem] = useState({
    type_code: 'K',
    floor_code: 'GF',
    room: '01',
    sequence: 1,
    description: '',
    quantity: 1,
    unit_price: 0,
  })

  // Load enquiry data if coming from an enquiry
  useEffect(() => {
    if (enquiryId) {
      loadEnquiry()
    }
  }, [enquiryId])

  const loadEnquiry = async () => {
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', enquiryId)
      .single()
    
    if (enquiry) {
      setFormData({
        title: `${enquiry.project_type?.replace('_', ' ') || 'Project'} - ${enquiry.location || enquiry.client_name || 'New Quote'}`,
        description: enquiry.description || '',
        client_name: enquiry.client_name || '',
        client_id: enquiry.client_id,
      })
    }
  }

  const generateItemCode = () => {
    const year = new Date().getFullYear().toString().slice(-2)
    const job = 'XX' // Will be replaced with actual job code
    const room = `RM${newItem.room.padStart(2, '0')}`
    const seq = newItem.sequence.toString().padStart(3, '0')
    return `${year}${job}-${newItem.type_code}-${newItem.floor_code}-${room}-${seq}`
  }

  const addItem = () => {
    if (!newItem.description || newItem.unit_price <= 0) {
      alert('Please fill in description and price')
      return
    }

    const item: QuoteItem = {
      id: crypto.randomUUID(),
      item_code: generateItemCode(),
      description: newItem.description,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total_price: newItem.quantity * newItem.unit_price,
    }

    setItems([...items, item])
    setNewItem({
      ...newItem,
      sequence: newItem.sequence + 1,
      description: '',
      quantity: 1,
      unit_price: 0,
    })
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
  const vatRate = 5
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (items.length === 0) {
      setError('Please add at least one item')
      return
    }
    
    setError('')
    setLoading(true)

    try {
      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          enquiry_id: enquiryId || null,
          client_id: formData.client_id,
          title: formData.title,
          description: formData.description || null,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          status: 'draft',
        }])
        .select()
        .single()

      if (quoteError) throw quoteError

      // Create quote items
      const quoteItems = items.map((item, index) => ({
        quote_id: quote.id,
        item_code: item.item_code,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        sort_order: index,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) throw itemsError

      // Update enquiry status if applicable
      if (enquiryId) {
        await supabase
          .from('enquiries')
          .update({ status: 'quoted' })
          .eq('id', enquiryId)
      }

      router.push(`/quotes/${quote.id}`)
      router.refresh()
    } catch (err: any) {
      console.error('Error creating quote:', err)
      setError(err.message || 'Failed to create quote')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Quote</h1>
        <Link href="/quotes" className="text-gray-600 hover:text-gray-800">
          ← Back to Quotes
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Quote Details */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Details</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Kitchen - Villa Palm Jumeirah"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Add Item Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Item</h2>
          
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newItem.type_code}
                onChange={(e) => setNewItem({ ...newItem, type_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {itemTypes.map((type) => (
                  <option key={type.code} value={type.code}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <select
                value={newItem.floor_code}
                onChange={(e) => setNewItem({ ...newItem, floor_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {floorCodes.map((floor) => (
                  <option key={floor.code} value={floor.code}>{floor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <input
                type="text"
                value={newItem.room}
                onChange={(e) => setNewItem({ ...newItem, room: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="01"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Base cabinet 600mm"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (AED)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.unit_price || ''}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                AED {(newItem.quantity * newItem.unit_price).toLocaleString()}
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                + Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.item_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">AED {item.unit_price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">AED {item.total_price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No items added yet. Use the form above to add items.
                  </td>
                </tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm text-gray-600">Subtotal</td>
                  <td className="px-6 py-3 text-right text-sm font-medium">AED {subtotal.toLocaleString()}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm text-gray-600">VAT ({vatRate}%)</td>
                  <td className="px-6 py-3 text-right text-sm font-medium">AED {vatAmount.toLocaleString()}</td>
                  <td></td>
                </tr>
                <tr className="bg-blue-50">
                  <td colSpan={4} className="px-6 py-3 text-right text-sm font-semibold text-blue-900">Total</td>
                  <td className="px-6 py-3 text-right text-lg font-bold text-blue-900">AED {total.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Quote'}
          </button>
          <Link
            href="/quotes"
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
