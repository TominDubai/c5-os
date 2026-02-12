import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  design_pending: 'bg-gray-100 text-gray-800',
  in_design: 'bg-yellow-100 text-yellow-800',
  design_approved: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  in_installation: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-600',
}

const statusLabels: Record<string, string> = {
  design_pending: '⏳ Design Pending',
  in_design: '🎨 In Design',
  design_approved: '✅ Design Approved',
  in_production: '🏭 In Production',
  in_installation: '🔧 Installation',
  completed: '✅ Completed',
  on_hold: '⏸️ On Hold',
  cancelled: '❌ Cancelled',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  let query = supabase
    .from('projects')
    .select(`
      *,
      clients(name, company),
      project_items(id, status)
    `)
    .order('created_at', { ascending: false })
  
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  
  const { data: projects, error } = await query
  
  if (error) {
    console.error('Error fetching projects:', error)
  }

  // Calculate progress for each project
  const projectsWithProgress = projects?.map(project => {
    const items = project.project_items || []
    const total = items.length
    const completed = items.filter((i: any) => i.status === 'qs_verified').length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    return { ...project, itemCount: total, completedCount: completed, progress }
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'in_design', label: 'Design' },
          { key: 'in_production', label: 'Production' },
          { key: 'in_installation', label: 'Installation' },
          { key: 'completed', label: 'Completed' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/projects${tab.key === 'all' ? '' : `?status=${tab.key}`}`}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              (params.status || 'all') === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4">
        {projectsWithProgress && projectsWithProgress.length > 0 ? (
          projectsWithProgress.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-blue-600">{project.project_code}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                      {statusLabels[project.status] || project.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mt-1">{project.name}</h3>
                  <p className="text-gray-600 text-sm">
                    {project.clients?.name}
                    {project.clients?.company && ` • ${project.clients.company}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    AED {project.contract_value?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {project.project_type?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{project.itemCount} items</span>
                  <span>{project.progress}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No projects found.</p>
            <p className="text-sm text-gray-400">
              Projects are created when quotes are approved and paid.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
