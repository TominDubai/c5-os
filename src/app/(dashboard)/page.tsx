import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Placeholder stats - will be replaced with real data
  const stats = {
    activeProjects: 0,
    inDesign: 0,
    itemsInProduction: 0,
    pipeline: 0,
  }

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-gray-900">{stats.activeProjects}</div>
          <div className="text-gray-600">Active Projects</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-gray-900">{stats.inDesign}</div>
          <div className="text-gray-600">In Design</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-gray-900">{stats.itemsInProduction}</div>
          <div className="text-gray-600">Items in Production</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">AED {stats.pipeline.toLocaleString()}</div>
          <div className="text-gray-600">Pipeline</div>
        </div>
      </div>

      {/* Attention Needed */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Attention Needed</h2>
        <div className="text-gray-500 text-center py-4">
          No alerts at this time
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-gray-500 text-center py-4">
          No recent activity
        </div>
      </div>
    </div>
  )
}
