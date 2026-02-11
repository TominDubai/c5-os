import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get project counts by status
  const { data: projects } = await supabase
    .from('projects')
    .select('id, status, contract_value')
  
  const projectStats = {
    total: projects?.length || 0,
    inDesign: projects?.filter(p => ['design_pending', 'in_design'].includes(p.status)).length || 0,
    inProduction: projects?.filter(p => p.status === 'in_production').length || 0,
    onSite: projects?.filter(p => p.status === 'in_installation').length || 0,
    completed: projects?.filter(p => p.status === 'completed').length || 0,
    pipeline: projects?.reduce((sum, p) => sum + (p.contract_value || 0), 0) || 0,
  }

  // Get item counts by status
  const { data: items } = await supabase
    .from('project_items')
    .select('id, status')
  
  const itemStats = {
    total: items?.length || 0,
    preProduction: items?.filter(i => i.status === 'pre_production').length || 0,
    inProduction: items?.filter(i => i.status === 'in_production').length || 0,
    readyForQC: items?.filter(i => i.status === 'ready_for_qc').length || 0,
    readyToShip: items?.filter(i => i.status === 'ready_for_dispatch').length || 0,
    onSite: items?.filter(i => ['on_site', 'installed'].includes(i.status)).length || 0,
    verified: items?.filter(i => i.status === 'qs_verified').length || 0,
  }

  // Get enquiry counts
  const { data: enquiries } = await supabase
    .from('enquiries')
    .select('id, status')
  
  const enquiryStats = {
    new: enquiries?.filter(e => e.status === 'new').length || 0,
    reviewing: enquiries?.filter(e => e.status === 'reviewing').length || 0,
  }

  // Get pending quotes
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, total')
    .in('status', ['draft', 'sent'])
  
  const quoteStats = {
    pending: quotes?.length || 0,
    value: quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0,
  }

  // Get items needing attention (stuck > 3 days)
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  
  const { data: stuckItems } = await supabase
    .from('project_items')
    .select('id, item_code, status, projects(project_code, name)')
    .eq('status', 'ready_for_qc')
    .lt('production_completed_at', threeDaysAgo.toISOString())
    .limit(5)

  // Get today's dispatches
  const today = new Date().toISOString().split('T')[0]
  const { data: todayDispatches } = await supabase
    .from('dispatches')
    .select('id, dispatch_number, projects(project_code, name), status')
    .eq('scheduled_date', today)

  // Get recent activity
  const { data: recentActivity } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-gray-500">
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/projects" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-gray-900">{projectStats.total}</div>
          <div className="text-gray-600">Active Projects</div>
          <div className="text-sm text-gray-400 mt-1">
            {projectStats.inDesign} design • {projectStats.inProduction} production • {projectStats.onSite} site
          </div>
        </Link>
        <Link href="/items" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-gray-900">{itemStats.inProduction}</div>
          <div className="text-gray-600">Items in Production</div>
          <div className="text-sm text-gray-400 mt-1">
            {itemStats.readyForQC} ready for QC
          </div>
        </Link>
        <Link href="/dispatch?view=ready" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-600">{itemStats.readyToShip}</div>
          <div className="text-gray-600">Ready to Ship</div>
          <div className="text-sm text-gray-400 mt-1">
            {itemStats.onSite} on site
          </div>
        </Link>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">
            AED {(projectStats.pipeline / 1000).toFixed(0)}K
          </div>
          <div className="text-gray-600">Pipeline Value</div>
          <div className="text-sm text-gray-400 mt-1">
            {quoteStats.pending} pending quotes
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Item Flow */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Flow</h2>
            <div className="grid grid-cols-6 gap-2 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{itemStats.preProduction}</div>
                <div className="text-xs text-gray-500">Pre-Prod</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{itemStats.inProduction}</div>
                <div className="text-xs text-gray-500">In Prod</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{itemStats.readyForQC}</div>
                <div className="text-xs text-gray-500">QC Queue</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{itemStats.readyToShip}</div>
                <div className="text-xs text-gray-500">To Ship</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{itemStats.onSite}</div>
                <div className="text-xs text-gray-500">On Site</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{itemStats.verified}</div>
                <div className="text-xs text-gray-500">Verified</div>
              </div>
            </div>
          </div>

          {/* Attention Needed */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Attention Needed</h2>
            {(stuckItems && stuckItems.length > 0) || (todayDispatches && todayDispatches.length > 0) ? (
              <div className="space-y-3">
                {stuckItems?.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="text-red-800">🔴 QC waiting &gt;3 days: </span>
                      <span className="font-mono text-sm">{item.item_code}</span>
                      <span className="text-gray-600 text-sm ml-2">
                        ({(item.projects as any)?.project_code})
                      </span>
                    </div>
                    <Link href="/qc" className="text-red-600 text-sm hover:underline">
                      View QC
                    </Link>
                  </div>
                ))}
                {todayDispatches?.map(dispatch => (
                  <div key={dispatch.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="text-blue-800">🚚 Today&apos;s dispatch: </span>
                      <span className="font-medium">{dispatch.dispatch_number}</span>
                      <span className="text-gray-600 text-sm ml-2">
                        ({(dispatch.projects as any)?.name})
                      </span>
                    </div>
                    <Link href="/dispatch?view=active" className="text-blue-600 text-sm hover:underline">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                ✅ No urgent items needing attention
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/enquiries/new"
                className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                + New Enquiry
              </Link>
              <Link
                href="/quotes/new"
                className="block w-full text-center border border-gray-300 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-50"
              >
                + New Quote
              </Link>
              <Link
                href="/dispatch/new"
                className="block w-full text-center border border-gray-300 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-50"
              >
                + Create Dispatch
              </Link>
            </div>
          </div>

          {/* New Enquiries */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Enquiries</h3>
              <Link href="/enquiries" className="text-blue-600 text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New</span>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-sm font-medium">
                  {enquiryStats.new}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reviewing</span>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-sm font-medium">
                  {enquiryStats.reviewing}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Quotes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Pending Quotes</h3>
              <Link href="/quotes" className="text-blue-600 text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              AED {quoteStats.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              {quoteStats.pending} quotes awaiting response
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
