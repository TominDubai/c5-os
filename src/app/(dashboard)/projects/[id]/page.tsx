import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProjectTabs from './ProjectTabs'

const statusColors: Record<string, string> = {
  design_pending: 'bg-gray-100 text-gray-800',
  in_design: 'bg-yellow-100 text-yellow-800',
  design_approved: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  in_installation: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  design_pending: '⏳ Design Pending',
  in_design: '🎨 In Design',
  design_approved: '✅ Design Approved',
  in_production: '🏭 In Production',
  in_installation: '🔧 Installation',
  completed: '✅ Completed',
  on_hold: '⏸️ On Hold',
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients(id, name, company, email, phone),
      quotes(id, quote_number, total),
      project_items(*)
    `)
    .eq('id', id)
    .single()
  
  if (error || !project) {
    notFound()
  }

  // Calculate item stats
  const items = project.project_items || []
  const itemStats = {
    total: items.length,
    pre_production: items.filter((i: any) => i.status === 'pre_production').length,
    in_production: items.filter((i: any) => i.status === 'in_production').length,
    ready_for_qc: items.filter((i: any) => i.status === 'ready_for_qc').length,
    dispatched: items.filter((i: any) => ['dispatched', 'on_site'].includes(i.status)).length,
    installed: items.filter((i: any) => i.status === 'installed').length,
    verified: items.filter((i: any) => i.status === 'qs_verified').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/projects" className="text-gray-500 hover:text-gray-700">
              ← Projects
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-blue-600">{project.project_code}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
              {statusLabels[project.status] || project.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{project.name}</h1>
          <p className="text-gray-600">
            {project.clients?.name}
            {project.clients?.company && ` • ${project.clients.company}`}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            AED {project.contract_value?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-500">Contract Value</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{itemStats.pre_production}</div>
          <div className="text-xs text-gray-500">Pre-Prod</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{itemStats.in_production}</div>
          <div className="text-xs text-gray-500">In Prod</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{itemStats.ready_for_qc}</div>
          <div className="text-xs text-gray-500">QC Queue</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{itemStats.dispatched}</div>
          <div className="text-xs text-gray-500">Dispatched</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{itemStats.installed}</div>
          <div className="text-xs text-gray-500">Installed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{itemStats.verified}</div>
          <div className="text-xs text-gray-500">Verified</div>
        </div>
      </div>

      {/* Tabs */}
      <ProjectTabs 
        project={project} 
        activeTab={tab}
        itemStats={itemStats}
      />
    </div>
  )
}
