import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SitePage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: onSiteItems },
    { data: todayDispatches },
    { data: openSnags },
    { data: recentReports },
  ] = await Promise.all([
    supabase
      .from('project_items')
      .select('id, item_code, description, status, floor_code, room_code, dispatched_at, received_on_site_at, installed_at, projects(id, project_code, name, site_address, pm_id, users!projects_pm_id_fkey(full_name))')
      .in('status', ['dispatched', 'on_site', 'installed'])
      .order('dispatched_at', { ascending: false }),

    supabase
      .from('dispatches')
      .select('id, dispatch_number, status, vehicle_number, scheduled_time, projects(id, project_code, name)')
      .eq('scheduled_date', today),

    supabase
      .from('snags')
      .select('id, snag_number, description, severity, status, created_at, projects(id, project_code, name)')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('daily_reports')
      .select('id, report_date, work_completed, attendance_count, projects(project_code, name), users!daily_reports_submitted_by_fkey(full_name)')
      .order('report_date', { ascending: false })
      .limit(10),
  ])

  // Group on-site items by project
  const byProject: Record<string, { project: any; dispatched: any[]; on_site: any[]; installed: any[] }> = {}
  onSiteItems?.forEach(item => {
    const proj = item.projects as any
    if (!proj) return
    if (!byProject[proj.id]) byProject[proj.id] = { project: proj, dispatched: [], on_site: [], installed: [] }
    if (item.status === 'dispatched') byProject[proj.id].dispatched.push(item)
    else if (item.status === 'on_site') byProject[proj.id].on_site.push(item)
    else if (item.status === 'installed') byProject[proj.id].installed.push(item)
  })

  const totalOnSite = onSiteItems?.filter(i => i.status === 'on_site').length || 0
  const totalDispatched = onSiteItems?.filter(i => i.status === 'dispatched').length || 0
  const totalInstalled = onSiteItems?.filter(i => i.status === 'installed').length || 0
  const criticalSnags = openSnags?.filter(s => s.severity === 'critical').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-violet-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-violet-700">{totalDispatched}</div>
          <div className="text-sm text-violet-600 mt-1">En Route</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-700">{totalOnSite}</div>
          <div className="text-sm text-orange-600 mt-1">On Site</div>
        </div>
        <div className="bg-teal-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-teal-700">{totalInstalled}</div>
          <div className="text-sm text-teal-600 mt-1">Installed</div>
        </div>
        <div className={`rounded-lg p-4 text-center ${criticalSnags > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`text-3xl font-bold ${criticalSnags > 0 ? 'text-red-700' : 'text-gray-500'}`}>
            {openSnags?.length || 0}
          </div>
          <div className={`text-sm mt-1 ${criticalSnags > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            Open Snags {criticalSnags > 0 ? `(${criticalSnags} critical)` : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">

          {/* Today's dispatches */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Today's Deliveries</h2>
              <Link href="/dispatch" className="text-blue-600 text-sm hover:underline">View all dispatches</Link>
            </div>
            <div className="p-4">
              {todayDispatches && todayDispatches.length > 0 ? (
                <div className="space-y-3">
                  {todayDispatches.map(d => {
                    const proj = d.projects as any
                    const statusColors: Record<string, string> = {
                      pending: 'bg-gray-100 text-gray-700',
                      loaded: 'bg-blue-100 text-blue-700',
                      in_transit: 'bg-yellow-100 text-yellow-700',
                      delivered: 'bg-green-100 text-green-700',
                      partial_delivery: 'bg-orange-100 text-orange-700',
                    }
                    return (
                      <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">{d.dispatch_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[d.status] || 'bg-gray-100'}`}>
                              {d.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5">
                            {proj?.name} {d.scheduled_time && `· ${d.scheduled_time.slice(0, 5)}`}
                            {d.vehicle_number && ` · ${d.vehicle_number}`}
                          </div>
                        </div>
                        <Link href={`/dispatch`} className="text-blue-600 text-sm hover:underline">View</Link>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm py-4 text-center">No deliveries scheduled for today</p>
              )}
            </div>
          </div>

          {/* Items by project */}
          {Object.values(byProject).length > 0 ? (
            Object.values(byProject).map(({ project: proj, dispatched, on_site, installed }) => (
              <div key={proj.id} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/projects/${proj.id}?tab=site`} className="font-mono text-blue-600 hover:underline font-medium">
                        {proj.project_code}
                      </Link>
                      <span className="text-gray-700">{proj.name}</span>
                    </div>
                    {proj.site_address && <p className="text-xs text-gray-500 mt-0.5">{proj.site_address}</p>}
                  </div>
                  <div className="flex gap-3 text-sm">
                    {dispatched.length > 0 && <span className="text-violet-600">{dispatched.length} en route</span>}
                    {on_site.length > 0 && <span className="text-orange-600">{on_site.length} on site</span>}
                    {installed.length > 0 && <span className="text-teal-600">{installed.length} installed</span>}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {[...dispatched, ...on_site, ...installed].slice(0, 8).map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                        <span className="text-sm text-gray-700">{item.description}</span>
                        {item.floor_code && <span className="text-xs text-gray-400">{item.floor_code}</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'dispatched' ? 'bg-violet-100 text-violet-700' :
                        item.status === 'on_site' ? 'bg-orange-100 text-orange-700' :
                        'bg-teal-100 text-teal-700'
                      }`}>
                        {item.status === 'dispatched' ? 'En Route' : item.status === 'on_site' ? 'On Site' : 'Installed'}
                      </span>
                    </div>
                  ))}
                  {[...dispatched, ...on_site, ...installed].length > 8 && (
                    <div className="px-6 py-3 text-sm text-gray-400">
                      +{[...dispatched, ...on_site, ...installed].length - 8} more items —{' '}
                      <Link href={`/projects/${proj.id}?tab=site`} className="text-blue-600 hover:underline">
                        View all in project
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              No items currently on site
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Open snags */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Open Snags</h3>
            </div>
            <div className="p-4 space-y-2">
              {openSnags && openSnags.length > 0 ? (
                openSnags.slice(0, 8).map(snag => {
                  const proj = snag.projects as any
                  const severityColors: Record<string, string> = {
                    critical: 'bg-red-100 text-red-700',
                    major: 'bg-orange-100 text-orange-700',
                    minor: 'bg-yellow-100 text-yellow-700',
                  }
                  return (
                    <div key={snag.id} className="p-2 border border-gray-100 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${severityColors[snag.severity] || 'bg-gray-100'}`}>
                          {snag.severity}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{proj?.project_code}</span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{snag.description}</p>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-green-600 text-center py-4">✓ No open snags</p>
              )}
            </div>
          </div>

          {/* Recent daily reports */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Recent Daily Reports</h3>
            </div>
            <div className="p-4 space-y-2">
              {recentReports && recentReports.length > 0 ? (
                recentReports.map(report => {
                  const proj = report.projects as any
                  const submitter = report.users as any
                  return (
                    <div key={report.id} className="p-2 border border-gray-100 rounded text-xs">
                      <div className="flex justify-between text-gray-500 mb-0.5">
                        <span className="font-mono font-medium">{proj?.project_code}</span>
                        <span>{new Date(report.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-gray-700 line-clamp-2">{report.work_completed || '—'}</p>
                      {report.attendance_count && (
                        <p className="text-gray-400 mt-0.5">{report.attendance_count} staff</p>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No reports yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
