'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Drawing {
  id: string
  drawing_code: string
  description: string
  status: string
  assigned_to: string | null
  file_url: string | null
  file_name: string | null
  revision: number
  completed_at: string | null
  designer_notes: string | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  sent_for_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  revision_required: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  sent_for_approval: 'Awaiting Approval',
  approved: 'Approved',
  revision_required: 'Revision Required',
}

export default function ProjectDrawingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<any>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    
    // Load project
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    
    setProject(projectData)

    // Load drawings
    const { data: drawingsData } = await supabase
      .from('shop_drawings')
      .select('*')
      .eq('project_id', id)
      .order('drawing_code')

    setDrawings(drawingsData || [])
    setLoading(false)
  }

  const generateDrawings = async () => {
    setGenerating(true)
    
    // Get project items that don't have drawings yet
    const { data: items } = await supabase
      .from('project_items')
      .select('id, item_code, description')
      .eq('project_id', id)

    if (!items || items.length === 0) {
      alert('No items found in this project')
      setGenerating(false)
      return
    }

    // Get existing drawing item_ids
    const existingItemIds = drawings
      .filter(d => d.item_id)
      .map(d => d.item_id)

    // Create drawings for items that don't have one
    const newDrawings = items
      .filter(item => !existingItemIds.includes(item.id))
      .map(item => ({
        project_id: id,
        item_id: item.id,
        drawing_code: `DWG-${item.item_code}`,
        description: item.description,
        status: 'pending',
        revision: 1,
      }))

    if (newDrawings.length === 0) {
      alert('All items already have drawings')
      setGenerating(false)
      return
    }

    const { error } = await supabase
      .from('shop_drawings')
      .insert(newDrawings)

    if (error) {
      console.error('Error generating drawings:', error)
      alert('Failed to generate drawings')
    } else {
      loadData()
    }
    
    setGenerating(false)
  }

  const updateStatus = async (drawingId: string, newStatus: string) => {
    const updates: any = { 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    }
    
    if (newStatus === 'in_progress') {
      updates.started_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    await supabase
      .from('shop_drawings')
      .update(updates)
      .eq('id', drawingId)

    loadData()
  }

  const handleFileUpload = async (drawingId: string, file: File) => {
    setUploadingId(drawingId)
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${id}/${drawingId}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('drawings')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      alert('Failed to upload file')
      setUploadingId(null)
      return
    }

    const { data: urlData } = supabase.storage
      .from('drawings')
      .getPublicUrl(fileName)

    await supabase
      .from('shop_drawings')
      .update({
        file_url: urlData.publicUrl,
        file_name: file.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', drawingId)

    setUploadingId(null)
    loadData()
  }

  const completedCount = drawings.filter(d => ['completed', 'sent_for_approval', 'approved'].includes(d.status)).length
  const totalCount = drawings.length
  const allCompleted = totalCount > 0 && drawings.every(d => d.status === 'completed')
  const allApproved = totalCount > 0 && drawings.every(d => d.status === 'approved')

  const sendForApproval = async () => {
    // Update all completed drawings to sent_for_approval
    await supabase
      .from('shop_drawings')
      .update({ 
        status: 'sent_for_approval',
        sent_for_approval_at: new Date().toISOString()
      })
      .eq('project_id', id)
      .eq('status', 'completed')

    // TODO: Trigger DocuSign integration here
    alert('Drawings marked as sent for approval. DocuSign integration coming soon!')
    loadData()
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/projects/${id}`} className="text-blue-600 hover:underline text-sm">
            ← Back to Project
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Shop Drawings</h1>
          <p className="text-gray-600">{project?.name}</p>
        </div>
        <div className="flex gap-3">
          {drawings.length === 0 && (
            <button
              onClick={generateDrawings}
              disabled={generating}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : '📋 Generate Drawing List'}
            </button>
          )}
          {allCompleted && !allApproved && (
            <button
              onClick={sendForApproval}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              ✉️ Send for Client Approval
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{completedCount} / {totalCount} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Drawings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drawing Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {drawings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No drawings yet. Click "Generate Drawing List" to create drawings from project items.
                </td>
              </tr>
            ) : (
              drawings.map((drawing) => (
                <tr key={drawing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-blue-600 text-sm">
                    {drawing.drawing_code}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {drawing.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[drawing.status]}`}>
                      {statusLabels[drawing.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {drawing.file_url ? (
                      <a 
                        href={drawing.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        📄 {drawing.file_name || 'View'}
                      </a>
                    ) : (
                      <label className="cursor-pointer text-sm text-gray-500 hover:text-blue-600">
                        {uploadingId === drawing.id ? 'Uploading...' : '📤 Upload'}
                        <input
                          type="file"
                          accept=".pdf,.dwg,.dxf,.png,.jpg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(drawing.id, file)
                          }}
                          disabled={uploadingId === drawing.id}
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {drawing.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(drawing.id, 'in_progress')}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Start
                        </button>
                      )}
                      {drawing.status === 'in_progress' && (
                        <button
                          onClick={() => updateStatus(drawing.id, 'completed')}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Complete
                        </button>
                      )}
                      {drawing.status === 'revision_required' && (
                        <button
                          onClick={() => updateStatus(drawing.id, 'in_progress')}
                          className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                        >
                          Revise
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {allApproved && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✅ All drawings approved! Project is ready for production.</p>
        </div>
      )}
    </div>
  )
}
