'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ProjectActionsProps {
  projectId: string
  projectName: string
}

export default function ProjectActions({ projectId, projectName }: ProjectActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const deleteProject = async () => {
    setLoading(true)
    
    try {
      // Delete project items first
      const { error: itemsError } = await supabase
        .from('project_items')
        .delete()
        .eq('project_id', projectId)
      
      if (itemsError) {
        console.error('Items delete error:', itemsError)
        alert(`Failed to delete items: ${itemsError.message}`)
        setLoading(false)
        return
      }
      
      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
      
      console.log('Delete error:', error)
      
      if (error) {
        alert(`Failed to delete project: ${error.message}`)
        setLoading(false)
        return
      }
      
      alert('Deleted!')
      router.push('/projects')
      router.refresh()
    } catch (err: any) {
      console.error('Delete error:', err)
      alert(`Failed to delete: ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowDeleteModal(true)}
        className="text-red-600 hover:text-red-800 text-sm"
      >
        🗑️ Delete Project
      </button>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Project?</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete <strong>{projectName}</strong> and all its items. This cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={deleteProject}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : '🗑️ Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
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
