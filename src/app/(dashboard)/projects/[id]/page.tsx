import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProjectTabs from './ProjectTabs'
import ProjectActions from './ProjectActions'
import ProjectAssignments from './ProjectAssignments'
import DepositConfirmation from './DepositConfirmation'

const statusColors: Record<string, string> = {
  awaiting_deposit: 'bg-amber-100 text-amber-800',
  design_pending: 'bg-gray-100 text-gray-800',
  in_design: 'bg-yellow-100 text-yellow-800',
  design_approved: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  in_installation: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  awaiting_deposit: '💳 Awaiting Deposit',
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
      project_items(*),
      invoices(id, invoice_number, invoice_type, amount, status, paid_at, payment_method),
      pm:users!projects_pm_id_fkey(id, full_name),
      designer:users!projects_designer_id_fkey(id, full_name)
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
    awaiting_drawings: items.filter((i: any) => i.status === 'awaiting_drawings').length,
    in_design: items.filter((i: any) => i.status === 'in_design').length,
    drawings_complete: items.filter((i: any) => ['drawings_complete', 'awaiting_client_approval'].includes(i.status)).length,
    approved: items.filter((i: any) => ['approved', 'production_scheduling'].includes(i.status)).length,
    in_production: items.filter((i: any) => ['in_production', 'ready_for_qc'].includes(i.status)).length,
    dispatched: items.filter((i: any) => ['ready_for_dispatch', 'dispatched', 'on_site'].includes(i.status)).length,
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
          <div className="text-sm text-gray-500 mb-2">Contract Value</div>
          <ProjectActions projectId={project.id} projectName={project.name} />
        </div>
      </div>

      {/* Deposit Confirmation Banner */}
      {project.status === 'awaiting_deposit' && (() => {
        const depositInvoice = (project as any).invoices?.find((inv: any) => inv.invoice_type === 'deposit')
        return depositInvoice ? (
          <div className="mb-6">
            <DepositConfirmation
              projectId={project.id}
              depositAmount={depositInvoice.amount}
              invoiceNumber={depositInvoice.invoice_number}
            />
          </div>
        ) : null
      })()}

      {/* Team Assignment */}
      <ProjectAssignments
        projectId={project.id}
        pmId={project.pm_id}
        designerId={project.designer_id}
        pmName={(project as any).pm?.full_name || null}
        designerName={(project as any).designer?.full_name || null}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-8 gap-3 mb-6 mt-6">
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{itemStats.awaiting_drawings}</div>
          <div className="text-xs text-gray-500">Drawings</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-yellow-600">{itemStats.in_design}</div>
          <div className="text-xs text-gray-500">In Design</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-cyan-600">{itemStats.drawings_complete}</div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-lime-600">{itemStats.approved}</div>
          <div className="text-xs text-gray-500">Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{itemStats.in_production}</div>
          <div className="text-xs text-gray-500">In Prod</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-purple-600">{itemStats.dispatched}</div>
          <div className="text-xs text-gray-500">Shipped</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-teal-600">{itemStats.installed}</div>
          <div className="text-xs text-gray-500">Installed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-xl font-bold text-green-600">{itemStats.verified}</div>
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
