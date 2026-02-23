import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: projects },
    { data: quotes },
    { data: enquiries },
    { data: items },
    { data: invoices },
    { data: snags },
    { data: dispatches },
  ] = await Promise.all([
    supabase.from('projects').select('id, status, contract_value, invoiced_amount, paid_amount, pm_id, created_at, actual_completion, target_completion, users!projects_pm_id_fkey(full_name)'),
    supabase.from('quotes').select('id, status, total, created_at'),
    supabase.from('enquiries').select('id, status, created_at'),
    supabase.from('project_items').select('id, status, workshop_qc_passed, site_qc_passed, type_code'),
    supabase.from('invoices').select('id, invoice_type, amount, status, due_date'),
    supabase.from('snags').select('id, status, severity'),
    supabase.from('dispatches').select('id, status'),
  ])

  // ── Financial ────────────────────────────────────────────────
  const totalPipeline = projects?.reduce((s, p) => s + (p.contract_value || 0), 0) || 0
  const totalInvoiced = projects?.reduce((s, p) => s + (p.invoiced_amount || 0), 0) || 0
  const totalPaid = projects?.reduce((s, p) => s + (p.paid_amount || 0), 0) || 0
  const totalOutstanding = totalInvoiced - totalPaid

  const overdueInvoices = invoices?.filter(i => i.status === 'overdue') || []
  const overdueValue = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0)

  const pendingQuoteValue = quotes
    ?.filter(q => ['draft', 'sent'].includes(q.status))
    .reduce((s, q) => s + (q.total || 0), 0) || 0

  // ── Projects ─────────────────────────────────────────────────
  const projectsByStatus = {
    design_pending: projects?.filter(p => p.status === 'design_pending').length || 0,
    in_design: projects?.filter(p => p.status === 'in_design').length || 0,
    design_approved: projects?.filter(p => p.status === 'design_approved').length || 0,
    in_production: projects?.filter(p => p.status === 'in_production').length || 0,
    in_installation: projects?.filter(p => p.status === 'in_installation').length || 0,
    completed: projects?.filter(p => p.status === 'completed').length || 0,
    on_hold: projects?.filter(p => p.status === 'on_hold').length || 0,
  }

  // PM workload
  const pmWorkload: Record<string, { name: string; active: number; value: number }> = {}
  projects?.forEach(p => {
    if (!p.pm_id) return
    const pm = p.users as any
    const name = pm?.full_name || 'Unknown'
    if (!pmWorkload[p.pm_id]) pmWorkload[p.pm_id] = { name, active: 0, value: 0 }
    if (!['completed', 'cancelled'].includes(p.status)) {
      pmWorkload[p.pm_id].active++
      pmWorkload[p.pm_id].value += p.contract_value || 0
    }
  })

  // Overdue projects
  const today = new Date().toISOString().split('T')[0]
  const overdueProjects = projects?.filter(
    p => p.target_completion && p.target_completion < today && !['completed', 'cancelled'].includes(p.status)
  ) || []

  // ── Enquiry → Quote → Project funnel ─────────────────────────
  const enquiryTotal = enquiries?.length || 0
  const enquiryWon = enquiries?.filter(e => e.status === 'won').length || 0
  const enquiryLost = enquiries?.filter(e => e.status === 'lost').length || 0
  const quoteTotal = quotes?.length || 0
  const quoteApproved = quotes?.filter(q => q.status === 'approved' || q.status === 'converted').length || 0
  const quoteConversionRate = quoteTotal > 0 ? Math.round((quoteApproved / quoteTotal) * 100) : 0
  const enquiryConversionRate = enquiryTotal > 0 ? Math.round((enquiryWon / enquiryTotal) * 100) : 0

  // ── Production & Items ────────────────────────────────────────
  const itemsByStatus = {
    pre_production: items?.filter(i => i.status === 'pre_production').length || 0,
    in_production: items?.filter(i => i.status === 'in_production').length || 0,
    ready_for_qc: items?.filter(i => i.status === 'ready_for_qc').length || 0,
    qc_failed: items?.filter(i => i.status === 'qc_failed').length || 0,
    ready_for_dispatch: items?.filter(i => i.status === 'ready_for_dispatch').length || 0,
    dispatched: items?.filter(i => i.status === 'dispatched').length || 0,
    on_site: items?.filter(i => i.status === 'on_site').length || 0,
    installed: items?.filter(i => i.status === 'installed').length || 0,
    qs_verified: items?.filter(i => i.status === 'qs_verified').length || 0,
  }
  const totalItems = items?.length || 0

  // Items by type
  const itemsByType: Record<string, number> = {}
  items?.forEach(i => {
    const t = i.type_code || 'Unknown'
    itemsByType[t] = (itemsByType[t] || 0) + 1
  })

  // ── QC ───────────────────────────────────────────────────────
  const workshopQCDone = items?.filter(i => i.workshop_qc_passed !== null).length || 0
  const workshopQCPassed = items?.filter(i => i.workshop_qc_passed === true).length || 0
  const workshopPassRate = workshopQCDone > 0 ? Math.round((workshopQCPassed / workshopQCDone) * 100) : 0

  const siteQCDone = items?.filter(i => i.site_qc_passed !== null).length || 0
  const siteQCPassed = items?.filter(i => i.site_qc_passed === true).length || 0
  const sitePassRate = siteQCDone > 0 ? Math.round((siteQCPassed / siteQCDone) * 100) : 0

  // ── Snags ─────────────────────────────────────────────────────
  const openSnags = snags?.filter(s => s.status === 'open').length || 0
  const criticalSnags = snags?.filter(s => s.severity === 'critical' && s.status === 'open').length || 0
  const majorSnags = snags?.filter(s => s.severity === 'major' && s.status === 'open').length || 0
  const fixedSnags = snags?.filter(s => ['fixed', 'verified'].includes(s.status)).length || 0

  const typeLabels: Record<string, string> = { K: 'Kitchen', W: 'Wardrobes', V: 'Vanity', T: 'TV Unit', J: 'Joinery' }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── FINANCIAL ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Financial Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Pipeline</div>
            <div className="text-2xl font-bold text-gray-900">AED {(totalPipeline / 1000).toFixed(0)}K</div>
            <div className="text-xs text-gray-400 mt-1">{projects?.filter(p => !['completed','cancelled'].includes(p.status)).length} active projects</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Invoiced</div>
            <div className="text-2xl font-bold text-blue-600">AED {(totalInvoiced / 1000).toFixed(0)}K</div>
            <div className="text-xs text-gray-400 mt-1">of AED {(totalPipeline / 1000).toFixed(0)}K pipeline</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Collected</div>
            <div className="text-2xl font-bold text-green-600">AED {(totalPaid / 1000).toFixed(0)}K</div>
            <div className="text-xs text-gray-400 mt-1">AED {(totalOutstanding / 1000).toFixed(0)}K outstanding</div>
          </div>
          <div className={`bg-white rounded-lg shadow p-5 ${overdueValue > 0 ? 'border-l-4 border-red-400' : ''}`}>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overdue Invoices</div>
            <div className={`text-2xl font-bold ${overdueValue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {overdueInvoices.length > 0 ? `AED ${(overdueValue / 1000).toFixed(0)}K` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">{overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''} overdue</div>
          </div>
        </div>

        {/* Pending quotes */}
        <div className="mt-3 bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Pending Quote Value</span>
            <span className="text-xs text-gray-400 ml-2">(draft + sent)</span>
          </div>
          <div className="text-lg font-bold text-amber-600">AED {pendingQuoteValue.toLocaleString()}</div>
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Projects by Status</h2>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3 text-center">
            {[
              { label: 'Design Pending', value: projectsByStatus.design_pending, color: 'bg-gray-100 text-gray-700' },
              { label: 'In Design', value: projectsByStatus.in_design, color: 'bg-purple-100 text-purple-700' },
              { label: 'Design Approved', value: projectsByStatus.design_approved, color: 'bg-blue-100 text-blue-700' },
              { label: 'In Production', value: projectsByStatus.in_production, color: 'bg-yellow-100 text-yellow-700' },
              { label: 'Installation', value: projectsByStatus.in_installation, color: 'bg-orange-100 text-orange-700' },
              { label: 'Completed', value: projectsByStatus.completed, color: 'bg-green-100 text-green-700' },
              { label: 'On Hold', value: projectsByStatus.on_hold, color: 'bg-red-100 text-red-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* PM Workload */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">PM Workload</h3>
            {Object.keys(pmWorkload).length === 0 ? (
              <p className="text-sm text-gray-400">No PMs assigned</p>
            ) : (
              <div className="space-y-2">
                {Object.values(pmWorkload)
                  .sort((a, b) => b.active - a.active)
                  .map(pm => (
                    <div key={pm.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{pm.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{pm.active} projects</span>
                        <span className="font-medium text-gray-900">AED {(pm.value / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Overdue Projects */}
          <div className={`bg-white rounded-lg shadow p-5 ${overdueProjects.length > 0 ? 'border-l-4 border-red-400' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Overdue Projects
              {overdueProjects.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{overdueProjects.length}</span>
              )}
            </h3>
            {overdueProjects.length === 0 ? (
              <p className="text-sm text-green-600">✓ No projects overdue</p>
            ) : (
              <div className="space-y-2">
                {overdueProjects.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <Link href={`/projects/${p.id}`} className="text-red-600 hover:underline font-mono">{(p as any).project_code}</Link>
                    <span className="text-gray-500">Due {new Date(p.target_completion!).toLocaleDateString('en-GB')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ENQUIRY FUNNEL ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Sales Pipeline</h2>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-4">
            {/* Enquiries */}
            <div className="flex-1 text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-700">{enquiryTotal}</div>
              <div className="text-sm text-gray-500 mt-1">Enquiries</div>
              <div className="text-xs text-gray-400 mt-1">{enquiryWon} won · {enquiryLost} lost</div>
            </div>
            <div className="text-gray-300 text-2xl">→</div>
            {/* Quotes */}
            <div className="flex-1 text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-700">{quoteTotal}</div>
              <div className="text-sm text-blue-600 mt-1">Quotes</div>
              <div className="text-xs text-gray-400 mt-1">{quoteApproved} approved</div>
            </div>
            <div className="text-gray-300 text-2xl">→</div>
            {/* Projects */}
            <div className="flex-1 text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-700">{projects?.length || 0}</div>
              <div className="text-sm text-green-600 mt-1">Projects</div>
              <div className="text-xs text-gray-400 mt-1">{projectsByStatus.completed} completed</div>
            </div>
            <div className="flex flex-col gap-2 ml-4 pl-4 border-l border-gray-200">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{enquiryConversionRate}%</div>
                <div className="text-xs text-gray-500">Enquiry → Win</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{quoteConversionRate}%</div>
                <div className="text-xs text-gray-500">Quote → Approved</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTION ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Production & Items</h2>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2 text-center text-sm">
            {[
              { label: 'Pre-Prod', value: itemsByStatus.pre_production, color: 'bg-gray-100 text-gray-600' },
              { label: 'In Prod', value: itemsByStatus.in_production, color: 'bg-yellow-100 text-yellow-700' },
              { label: 'QC Queue', value: itemsByStatus.ready_for_qc, color: 'bg-blue-100 text-blue-700' },
              { label: 'QC Failed', value: itemsByStatus.qc_failed, color: 'bg-red-100 text-red-700' },
              { label: 'To Dispatch', value: itemsByStatus.ready_for_dispatch, color: 'bg-purple-100 text-purple-700' },
              { label: 'Dispatched', value: itemsByStatus.dispatched, color: 'bg-indigo-100 text-indigo-700' },
              { label: 'On Site', value: itemsByStatus.on_site, color: 'bg-orange-100 text-orange-700' },
              { label: 'Installed', value: itemsByStatus.installed, color: 'bg-teal-100 text-teal-700' },
              { label: 'Verified', value: itemsByStatus.qs_verified, color: 'bg-green-100 text-green-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg p-2 ${s.color}`}>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-400 text-right">{totalItems} total items across all projects</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Items by type */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Items by Type</h3>
            <div className="space-y-2">
              {Object.entries(itemsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => (
                  <div key={code} className="flex items-center gap-2">
                    <div className="w-24 text-sm text-gray-600">{typeLabels[code] || code}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-400 h-4 rounded-full"
                        style={{ width: `${totalItems > 0 ? (count / totalItems) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="w-8 text-sm font-medium text-gray-700 text-right">{count}</div>
                  </div>
                ))}
              {Object.keys(itemsByType).length === 0 && (
                <p className="text-sm text-gray-400">No items yet</p>
              )}
            </div>
          </div>

          {/* QC Rates */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">QC Pass Rates</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Workshop QC</span>
                  <span className="font-medium">{workshopQCPassed}/{workshopQCDone} — {workshopPassRate}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${workshopPassRate >= 90 ? 'bg-green-500' : workshopPassRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${workshopPassRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Site QC</span>
                  <span className="font-medium">{siteQCPassed}/{siteQCDone} — {sitePassRate}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${sitePassRate >= 90 ? 'bg-green-500' : sitePassRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${sitePassRate}%` }}
                  />
                </div>
              </div>
              {workshopQCDone === 0 && siteQCDone === 0 && (
                <p className="text-sm text-gray-400">No QC records yet</p>
              )}
            </div>

            {/* Snags summary */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Open Snags</h3>
              {openSnags === 0 ? (
                <p className="text-sm text-green-600">✓ No open snags</p>
              ) : (
                <div className="flex gap-3 text-sm">
                  {criticalSnags > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-medium">{criticalSnags} critical</span>
                  )}
                  {majorSnags > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">{majorSnags} major</span>
                  )}
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">{openSnags} total open</span>
                  <span className="bg-green-100 text-green-600 px-2 py-1 rounded">{fixedSnags} fixed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
