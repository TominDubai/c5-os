'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  full_name: string
  role: string
}

export default function QuoteAssignedTo({
  quoteId,
  currentAssignedTo,
  users,
}: {
  quoteId: string
  currentAssignedTo: string | null
  users: User[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSaving(true)
    await supabase
      .from('quotes')
      .update({ assigned_to: e.target.value || null, updated_at: new Date().toISOString() })
      .eq('id', quoteId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned QS</h3>
      <select
        defaultValue={currentAssignedTo || ''}
        onChange={handleChange}
        disabled={saving}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name}
          </option>
        ))}
      </select>
    </div>
  )
}
