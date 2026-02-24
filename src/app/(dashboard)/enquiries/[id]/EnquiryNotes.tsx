'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Note {
  id: string
  content: string
  created_at: string
  users: { full_name: string } | null
}

export default function EnquiryNotes({ enquiryId }: { enquiryId: string }) {
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    const { data } = await supabase
      .from('enquiry_notes')
      .select('*, users(full_name)')
      .eq('enquiry_id', enquiryId)
      .order('created_at', { ascending: false })
    if (data) setNotes(data as Note[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('enquiry_notes').insert({
      enquiry_id: enquiryId,
      content: content.trim(),
      created_by: user?.id,
    })
    setContent('')
    setSaving(false)
    loadNotes()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>

      <form onSubmit={handleSubmit} className="mb-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note — meeting details, scope updates, client feedback..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 resize-none"
        />
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Note'}
        </button>
      </form>

      {notes.length > 0 ? (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.id} className="border-l-4 border-blue-200 pl-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {note.users?.full_name || 'Unknown'} &middot;{' '}
                {new Date(note.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">No notes yet.</p>
      )}
    </div>
  )
}
