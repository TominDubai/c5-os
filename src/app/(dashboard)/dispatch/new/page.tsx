import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateDispatchForm from './CreateDispatchForm'

export default async function NewDispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Items ready for dispatch — optionally filtered by project
  let query = supabase
    .from('project_items')
    .select(`*, projects(id, project_code, name, site_address, clients(name))`)
    .eq('status', 'ready_for_dispatch')
    .order('workshop_qc_at', { ascending: true })

  if (params.project) {
    query = query.eq('project_id', params.project)
  }

  const { data: readyItems } = await query

  // Drivers
  const { data: drivers } = await supabase
    .from('users')
    .select('id, full_name')
    .in('role', ['driver', 'admin', 'operations'])
    .eq('is_active', true)
    .order('full_name')

  // Get next dispatch number
  const { count } = await supabase
    .from('dispatches')
    .select('id', { count: 'exact', head: true })

  const nextNumber = `DIS-${String((count || 0) + 1).padStart(3, '0')}`

  if (!readyItems || readyItems.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/dispatch" className="text-gray-500 hover:text-gray-700">← Dispatch</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No items ready for dispatch.
          {params.project && (
            <div className="mt-2">
              <Link href="/dispatch/new" className="text-blue-600 hover:underline text-sm">
                View all projects with ready items
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Group by project for the form
  const projectGroups: Record<string, { info: any; items: any[] }> = {}
  readyItems.forEach((item) => {
    const key = item.project_id
    if (!projectGroups[key]) {
      projectGroups[key] = { info: item.projects, items: [] }
    }
    projectGroups[key].items.push(item)
  })

  return (
    <div>
      <div className="mb-6">
        <Link href="/dispatch" className="text-gray-500 hover:text-gray-700">← Dispatch</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create Dispatch</h1>
        <p className="text-gray-500 text-sm mt-1">
          {nextNumber} · Select items, assign driver and schedule delivery
        </p>
      </div>

      <CreateDispatchForm
        dispatchNumber={nextNumber}
        projectGroups={projectGroups}
        drivers={drivers || []}
        preselectedProject={params.project || null}
      />
    </div>
  )
}
