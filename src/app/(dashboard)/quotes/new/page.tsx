'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface QuoteItem {
  id: string
  item_code: string
  image_url: string | null
  image_file?: File
  description: string
  size: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
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
  { code: 'TF', name: 'Third Floor' },
  { code: 'RF', name: 'Roof' },
]

const unitTypes = [
  { code: 'NO.', name: 'Number' },
  { code: 'SQM', name: 'Square Metre' },
  { code: 'LM', name: 'Linear Metre' },
  { code: 'SET', name: 'Set' },
  { code: 'LOT', name: 'Lot' },
]

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const enquiryId = searchParams.get('enquiry')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobCode, setJobCode] = useState('XX')
  const [importing, setImporting] = useState(false)
  const [importedItems, setImportedItems] = useState<any[]>([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_name: '',
    client_id: null as string | null,
    site_address: '',
    revision: 0,
  })
  
  const [items, setItems] = useState<QuoteItem[]>([])
  const [newItem, setNewItem] = useState({
    type_code: 'K',
    floor_code: 'GF',
    room: '01',
    description: '',
    size: '',
    unit: 'NO.',
    quantity: 1,
    unit_price: 0,
    image_file: null as File | null,
    image_preview: null as string | null,
  })

  // Track sequence numbers per type+floor+room combination
  const [sequences, setSequences] = useState<Record<string, number>>({})

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
      // Extract job code from enquiry number (ENQ-2026-001 -> 01)
      const match = enquiry.enquiry_number?.match(/ENQ-\d{4}-(\d+)/)
      if (match) {
        setJobCode(match[1].slice(-2).padStart(2, '0'))
      }
      
      setFormData({
        title: `${enquiry.project_type?.replace('_', ' ') || 'Project'} - ${enquiry.location || enquiry.client_name || 'New Quote'}`,
        description: enquiry.description || '',
        client_name: enquiry.client_name || '',
        client_id: enquiry.client_id,
        site_address: enquiry.location || '',
        revision: 0,
      })
    }
  }

  const generateItemCode = () => {
    const year = new Date().getFullYear().toString().slice(-2)
    const key = `${newItem.type_code}-${newItem.floor_code}-RM${newItem.room.padStart(2, '0')}`
    const currentSeq = sequences[key] || 0
    const nextSeq = currentSeq + 1
    
    const room = `RM${newItem.room.padStart(2, '0')}`
    const seq = nextSeq.toString().padStart(3, '0')
    
    return {
      code: `${year}${jobCode}-${newItem.type_code}-${newItem.floor_code}-${room}-${seq}`,
      key,
      seq: nextSeq,
    }
  }

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/parse-boq', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF')
      }
      
      if (data.items && data.items.length > 0) {
        setImportedItems(data.items)
        setShowImportPreview(true)
      } else {
        setError('No BOQ items found in the PDF')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import PDF')
    } finally {
      setImporting(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const addImportedItems = () => {
    const year = new Date().getFullYear().toString().slice(-2)
    let currentSequences = { ...sequences }
    
    const newItems: QuoteItem[] = importedItems.map((item, index) => {
      // Default to Joinery type, Ground Floor for imported items
      const typeCode = 'J'
      const floorCode = 'GF'
      const room = '01'
      const key = `${typeCode}-${floorCode}-RM${room}`
      const currentSeq = currentSequences[key] || 0
      const nextSeq = currentSeq + 1
      currentSequences[key] = nextSeq
      
      const itemCode = `${year}${jobCode}-${typeCode}-${floorCode}-RM${room}-${nextSeq.toString().padStart(3, '0')}`
      
      return {
        id: crypto.randomUUID(),
        item_code: itemCode,
        image_url: null,
        description: item.description || '',
        size: item.size || '',
        unit: item.unit || 'NO.',
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
      }
    })
    
    setItems([...items, ...newItems])
    setSequences(currentSequences)
    setImportedItems([])
    setShowImportPreview(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewItem({
          ...newItem,
          image_file: file,
          image_preview: reader.result as string,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const addItem = () => {
    if (!newItem.description) {
      alert('Please fill in description')
      return
    }

    const { code, key, seq } = generateItemCode()
    
    const item: QuoteItem = {
      id: crypto.randomUUID(),
      item_code: code,
      image_url: newItem.image_preview,
      image_file: newItem.image_file || undefined,
      description: newItem.description,
      size: newItem.size,
      unit: newItem.unit,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      amount: newItem.quantity * newItem.unit_price,
    }

    setItems([...items, item])
    setSequences({ ...sequences, [key]: seq })
    
    // Reset form but keep type/floor/room for quick entry
    setNewItem({
      ...newItem,
      description: '',
      size: '',
      unit_price: 0,
      quantity: 1,
      image_file: null,
      image_preview: null,
    })
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
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
          site_address: formData.site_address || null,
          revision: formData.revision,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          status: 'draft',
        }])
        .select()
        .single()

      if (quoteError) throw quoteError

      // Upload images and create quote items
      const quoteItems = await Promise.all(items.map(async (item, index) => {
        let imageUrl = null
        
        if (item.image_file) {
          const fileExt = item.image_file.name.split('.').pop()
          const fileName = `${quote.id}/${item.id}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('quote-images')
            .upload(fileName, item.image_file)
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('quote-images')
              .getPublicUrl(fileName)
            imageUrl = urlData.publicUrl
          }
        }
        
        return {
          quote_id: quote.id,
          item_code: item.item_code,
          image_url: imageUrl,
          description: item.description,
          size: item.size || null,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.amount,
          sort_order: index,
        }
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
    <div className="max-w-6xl mx-auto">
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
                placeholder="e.g., Kitchen & Wardrobes - Villa Palm Jumeirah"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Code (for item codes)
              </label>
              <input
                type="text"
                value={jobCode}
                onChange={(e) => setJobCode(e.target.value.slice(0, 2).toUpperCase())}
                maxLength={2}
                placeholder="XX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Address
              </label>
              <input
                type="text"
                value={formData.site_address}
                onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
                placeholder="e.g., Villa 16 Street 12 Meadows 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
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

        {/* Import from PDF */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Import from PDF</h2>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
              importing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}>
              {importing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Parsing...
                </>
              ) : (
                <>
                  📄 Upload PDF
                </>
              )}
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfImport}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Upload an existing quote PDF to automatically extract BOQ items
          </p>
        </div>

        {/* Import Preview Modal */}
        {showImportPreview && importedItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                📋 Imported Items Preview ({importedItems.length} items)
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportedItems([])
                    setShowImportPreview(false)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addImportedItems}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  ✓ Add All to BOQ
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-yellow-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-100">
                  {importedItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.size || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-center">{item.unit || 'NO.'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity || 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">AED {(item.unit_price || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                        AED {((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-yellow-700 mt-4">
              ⚠️ Items will be assigned Joinery (J) type codes. You can edit them after adding.
            </p>
          </div>
        )}

        {/* Add Item Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add BOQ Item Manually</h2>
          
          {/* Row 1: Code generation fields */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newItem.type_code}
                onChange={(e) => setNewItem({ ...newItem, type_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {itemTypes.map((type) => (
                  <option key={type.code} value={type.code}>{type.code} - {type.name}</option>
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
                  <option key={floor.code} value={floor.code}>{floor.code} - {floor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room #</label>
              <input
                type="text"
                value={newItem.room}
                onChange={(e) => setNewItem({ ...newItem, room: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generated Code</label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md font-mono text-sm">
                {generateItemCode().code}
              </div>
            </div>
          </div>

          {/* Row 2: Image upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {newItem.image_preview && (
                <img 
                  src={newItem.image_preview} 
                  alt="Preview" 
                  className="h-16 w-16 object-cover rounded border"
                />
              )}
            </div>
          </div>

          {/* Row 3: Description and Size */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                type="text"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Base cabinet with soft close drawers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size (WxHxD mm)</label>
              <input
                type="text"
                value={newItem.size}
                onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 600 x 900 x 550"
              />
            </div>
          </div>

          {/* Row 4: Unit, Qty, Price */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {unitTypes.map((unit) => (
                  <option key={unit.code} value={unit.code}>{unit.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                AED {(newItem.quantity * newItem.unit_price).toLocaleString()}
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-medium"
              >
                + Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Items List (BOQ Table) */}
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Bill of Quantity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">S/No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size (mm)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-4">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-12 w-12 object-cover rounded" />
                        ) : (
                          <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-mono text-blue-600">{item.item_code}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.size || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 text-center">{item.unit}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">AED {item.unit_price.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right font-medium">AED {item.amount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                      No items added yet. Use the form above to add BOQ items.
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-right text-sm text-gray-600">Subtotal</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">AED {subtotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-right text-sm text-gray-600">VAT ({vatRate}%)</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">AED {vatAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan={8} className="px-4 py-3 text-right text-sm font-semibold text-blue-900">Total (inc. VAT)</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-blue-900">AED {total.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : 'Create Quote'}
          </button>
          <Link
            href="/quotes"
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
