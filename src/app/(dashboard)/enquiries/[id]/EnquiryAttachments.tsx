'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Attachment {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  created_at: string
}

export default function EnquiryAttachments({ enquiryId }: { enquiryId: string }) {
  const supabase = createClient()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAttachments()
  }, [])

  const loadAttachments = async () => {
    const { data } = await supabase
      .from('enquiry_attachments')
      .select('*')
      .eq('enquiry_id', enquiryId)
      .order('created_at', { ascending: false })
    if (data) setAttachments(data)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()

    for (const file of Array.from(files)) {
      const fileName = `${enquiryId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('enquiry-files')
        .upload(fileName, file)

      if (uploadError) {
        alert(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      await supabase.from('enquiry_attachments').insert({
        enquiry_id: enquiryId,
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.id,
      })
    }

    setUploading(false)
    loadAttachments()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (attachment: Attachment) => {
    const { data } = await supabase.storage
      .from('enquiry-files')
      .createSignedUrl(attachment.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete "${attachment.file_name}"?`)) return
    await supabase.storage.from('enquiry-files').remove([attachment.file_path])
    await supabase.from('enquiry_attachments').delete().eq('id', attachment.id)
    loadAttachments()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>

      {attachments.length > 0 && (
        <ul className="space-y-2 mb-4">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.file_name}</p>
                  <p className="text-xs text-gray-500">{formatSize(a.file_size)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(a)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {attachments.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-3 mb-3">
          No attachments yet — upload drawings, renderings or spec documents.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 transition-colors"
      >
        {uploading ? 'Uploading...' : '+ Upload Files'}
      </button>
    </div>
  )
}
