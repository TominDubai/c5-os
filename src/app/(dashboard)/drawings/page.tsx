'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Drawing {
  id: string
  drawing_code: string
  description: string
  status: string
  assigned_to: string | null
  file_url: string | null
  revision: number
  completed_at: string | null
  project: {
    id: string
    project_code: string
    name: string
  }
  item: {
    item_code: string
  } | null
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
  sent_for_approval: 'Sent for Approval',
  approved: 'Approved',
  revision_required: 'Revision Required',
}

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadDrawings()
  }, [filter])

  const loadDrawings = async () => {
    setLoading(true)
    let query = supabase
      .from('shop_drawings')
      .select(`
        *,
        project:projects(id, project_code, name),
        item:project_items(item_code)
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading drawings:', error)
    } else {
      setDrawings(data || [])
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() }
    
    if (newStatus === 'in_progress') {
      updates.started_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('shop_drawings')
      .update(updates)
      .eq('id', id)

    if (!error) {
      loadDrawings()
    }
  }

  const statusCounts = {
    all: drawings.length,
    pending: drawings.filter(d => d.status === 'pending').length,
    in_progress: drawings.filter(d => d.status === 'in_progress').length,
    completed: drawings.filter(d => d.status === 'completed').length,
    sent_for_approval: drawings.filter(d => d.status === 'sent_for_approval').length,
    approved: drawings.filter(d => d.status === 'approved').length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shop Drawings</h1>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
          { key: 'sent_for_approval', label: 'Awaiting Approval' },
          { key: 'approved', label: 'Approved' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === s.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {s.label} ({statusCounts[s.key as keyof typeof statusCounts] || 0})
          </button>
        ))}
      </div>

      {/* Drawings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drawing Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rev</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : drawings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No drawings found
                </td>
              </tr>
            ) : (
              drawings.map((drawing) => (
                <tr key={drawing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-blue-600">{drawing.drawing_code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Link 
                      href={`/projects/${drawing.project?.id}`}
                      className="text-sm text-gray-900 hover:text-blue-600"
                    >
                      {drawing.project?.project_code}
                    </Link>
                    <p className="text-xs text-gray-500">{drawing.project?.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {drawing.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[drawing.status]}`}>
                      {statusLabels[drawing.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    R{drawing.revision}
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
                      {drawing.file_url && (
                        <a
                          href={drawing.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
