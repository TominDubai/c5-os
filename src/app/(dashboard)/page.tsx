import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isDemoMode = !supabaseUrl || supabaseUrl.includes('placeholder')

  let projectStats, itemStats, enquiryStats, quoteStats, stuckItems, todayDispatches, recentActivity

  if (isDemoMode) {
    // Demo data
    projectStats = {
      total: 12,
      inDesign: 3,
      inProduction: 5,
      onSite: 2,
      completed: 2,
      pipeline: 245000,
    }

    itemStats = {
      total: 156,
      preProduction: 23,
      inProduction: 45,
      readyForQC: 18,
      readyToShip: 32,
      onSite: 28,
      verified: 10,
    }

    enquiryStats = {
      new: 8,
      reviewing: 3,
    }

    quoteStats = {
      pending: 5,
      value: 89000,
    }

    stuckItems = [
      { id: '1', item_code: '2601-K-GF-RM01-101', status: 'ready_for_qc', projects: { project_code: 'C5-2026-001', name: 'Villa Al Reef' } },
      { id: '2', item_code: '2601-W-FF-RM02-201', status: 'ready_for_qc', projects: { project_code: 'C5-2026-002', name: 'Palm Heights' } },
    ]

    todayDispatches = [
      { id: '1', dispatch_number: 'DSP-2026-001', projects: { project_code: 'C5-2026-001', name: 'Villa Al Reef' }, status: 'scheduled' },
    ]

    recentActivity = [
      { id: '1', action: 'Drawing approved', details: 'Kitchen drawings approved for Villa Al Reef', created_at: new Date().toISOString() },
      { id: '2', action: 'Item completed', details: 'Wardrobe item 2601-W-FF-RM02-201 completed QC', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: '3', action: 'Project created', details: 'New project Palm Heights created from quote', created_at: new Date(Date.now() - 7200000).toISOString() },
    ]
  } else {
    const supabase = await createClient()

    // Get project counts by status
    const { data: projects } = await supabase
      .from('projects')
      .select('id, status, contract_value')

    projectStats = {
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

    itemStats = {
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

    enquiryStats = {
      new: enquiries?.filter(e => e.status === 'new').length || 0,
      reviewing: enquiries?.filter(e => e.status === 'reviewing').length || 0,
    }

    // Get pending quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, status, total')
      .in('status', ['draft', 'sent'])

    quoteStats = {
      pending: quotes?.length || 0,
      value: quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0,
    }

    // Get items needing attention (stuck > 3 days)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: stuckItemsData } = await supabase
      .from('project_items')
      .select('id, item_code, status, projects(project_code, name)')
      .eq('status', 'ready_for_qc')
      .lt('production_completed_at', threeDaysAgo.toISOString())
      .limit(5)

    stuckItems = stuckItemsData || []

    // Get today's dispatches
    const today = new Date().toISOString().split('T')[0]
    const { data: dispatchesData } = await supabase
      .from('dispatches')
      .select('id, dispatch_number, projects(project_code, name), status')
      .eq('scheduled_date', today)

    todayDispatches = dispatchesData || []

    // Get recent activity
    const { data: activityData } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    recentActivity = activityData || []
  }

  return (
    <div className="space-y-6">
      {isDemoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Demo Mode Active</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Showing sample data. Configure Supabase to connect to a real database.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
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
      <div className="grid grid-cols-4 gap-4">
        <Link href="/projects" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl font-bold text-gray-900">{projectStats.total}</div>
          <div className="text-gray-600">Active Projects</div>
          <div className="text-sm text-gray-400 mt-1">
            {projectStats.inDesign} design • {projectStats.inProduction} production • {projectStats.onSite} site
          </div>
        </Link>

        <Link href="/items" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl font-bold text-gray-900">{itemStats.inProduction}</div>
          <div className="text-gray-600">Items in Production</div>
          <div className="text-sm text-gray-400 mt-1">
            {itemStats.readyForQC} ready for QC
          </div>
        </Link>

        <Link href="/dispatch?view=ready" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
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

      {/* Item Flow */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Status Flow</h2>
        <div className="grid grid-cols-6 gap-2 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{itemStats.preProduction}</div>
            <div className="text-xs text-gray-500">Pre-Production</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{itemStats.inProduction}</div>
            <div className="text-xs text-gray-500">In Production</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{itemStats.readyForQC}</div>
            <div className="text-xs text-gray-500">Ready for QC</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{itemStats.readyToShip}</div>
            <div className="text-xs text-gray-500">Ready to Ship</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{itemStats.onSite}</div>
            <div className="text-xs text-gray-500">On Site</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{itemStats.verified}</div>
            <div className="text-xs text-gray-500">QS Verified</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">New Enquiries</h3>
          <div className="mt-2 flex items-baseline">
            <div className="text-3xl font-bold text-gray-900">{enquiryStats.new}</div>
            <div className="ml-2 text-sm text-gray-500">
              {enquiryStats.reviewing} reviewing
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Quotes</h3>
          <div className="mt-2 flex items-baseline">
            <div className="text-3xl font-bold text-gray-900">{quoteStats.pending}</div>
            <div className="ml-2 text-sm text-gray-500">
              AED {(quoteStats.value / 1000).toFixed(0)}K value
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Today's Dispatch</h3>
          <div className="mt-2 flex items-baseline">
            <div className="text-3xl font-bold text-gray-900">{todayDispatches.length}</div>
            <div className="ml-2 text-sm text-gray-500">scheduled</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full"></div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="mt-1 text-xs text-gray-500">{activity.details}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}
