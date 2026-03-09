'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  full_name: string
  role: string
}

interface ProjectAssignmentsProps {
  projectId: string
  pmId: string | null
  designerId: string | null
  pmName: string | null
  designerName: string | null
}

export default function ProjectAssignments({
  projectId,
  pmId,
  designerId,
  pmName,
  designerName,
}: ProjectAssignmentsProps) {
  const supabase = createClient()
  const router = useRouter()
  const [pms, setPms] = useState<User[]>([])
  const [designers, setDesigners] = useState<User[]>([])
  const [savingPm, setSavingPm] = useState(false)
  const [savingDesigner, setSavingDesigner] = useState(false)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (data) {
          setPms(data.filter((u) => ['pm', 'admin', 'operations'].includes(u.role)))
          setDesigners(data.filter((u) => ['designer', 'design_lead', 'admin'].includes(u.role)))
        }
      })
  }, [])

  const updatePm = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSavingPm(true)
    await supabase
      .from('projects')
      .update({ pm_id: e.target.value || null, updated_at: new Date().toISOString() })
      .eq('id', projectId)
    setSavingPm(false)
    router.refresh()
  }

  const updateDesigner = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSavingDesigner(true)
    await supabase
      .from('projects')
      .update({ designer_id: e.target.value || null, updated_at: new Date().toISOString() })
      .eq('id', projectId)
    setSavingDesigner(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow px-6 py-4 flex items-center gap-8">
      <span className="text-sm font-semibold text-gray-500 shrink-0">Team</span>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">👷 PM</label>
        <select
          defaultValue={pmId || ''}
          onChange={updatePm}
          disabled={savingPm}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">Unassigned</option>
          {pms.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">✏️ Designer</label>
        <select
          defaultValue={designerId || ''}
          onChange={updateDesigner}
          disabled={savingDesigner}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">Unassigned</option>
          {designers.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
