'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface Document {
  id: string
  name: string
  storage_path: string
  file_size: number | null
  source: string
  created_at: string
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentRow({ doc }: { doc: Document }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    setLoading(false)
  }

  return (
    <li className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <span className="text-xl">📄</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
          <p className="text-xs text-gray-500">
            {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-GB')}
            {doc.source === 'docusign' && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">DocuSign</span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Download'}
      </button>
    </li>
  )
}
