import { createClient } from '@/lib/supabase/server'
import { UserTable } from './UserTable'
import { InviteUserForm } from './InviteUserForm'

const ROLE_DESCRIPTIONS = [
  { role: 'Admin', desc: 'Full access — all modules, settings, approvals', dept: 'Leadership' },
  { role: 'Operations', desc: 'All modules and reports', dept: 'Leadership' },
  { role: 'Estimator', desc: 'Enquiries, quotes, item codes', dept: 'Admin' },
  { role: 'Design Lead', desc: 'Design module, assign drawings, all projects', dept: 'Design' },
  { role: 'Designer', desc: 'Assigned projects only — upload drawings', dept: 'Design' },
  { role: 'Production Manager', desc: 'Production scheduling and item status', dept: 'Production' },
  { role: 'QS', desc: 'Workshop QC and site QC — pass/fail items', dept: 'Production' },
  { role: 'Stores', desc: 'Dispatch creation and inventory', dept: 'Production' },
  { role: 'Project Manager', desc: 'Assigned projects, site management, daily reports', dept: 'Projects' },
  { role: 'Site Staff', desc: 'Daily reports (mobile)', dept: 'Projects' },
  { role: 'Driver', desc: 'Dispatch confirmation (mobile)', dept: 'Projects' },
]

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', currentUser!.id)
    .single()

  const isAdmin = currentProfile?.role === 'admin' || currentProfile?.role === 'operations'

  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, role, department, is_active, phone')
    .order('full_name')

  const activeCount = users?.filter(u => u.is_active).length || 0
  const inactiveCount = users?.filter(u => !u.is_active).length || 0

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, roles and system configuration</p>
      </div>

      {/* ── USERS ── */}
      <section className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Users</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {activeCount} active · {inactiveCount} inactive
              </p>
            </div>
            {isAdmin && <InviteUserForm />}
          </div>
        </div>
        <div className="p-6">
          <UserTable users={users || []} />
        </div>
      </section>

      {/* ── ROLES REFERENCE ── */}
      <section className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Role Reference</h2>
          <p className="text-sm text-gray-500 mt-0.5">What each role can access</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ROLE_DESCRIPTIONS.map(r => (
              <div key={r.role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{r.role}</span>
                    <span className="text-xs text-gray-400">· {r.dept}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPANY ── */}
      <section className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Company</h2>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Company Name</span>
              <p className="font-medium text-gray-900 mt-0.5">Concept 5 Kitchen & Wood Industries LLC</p>
            </div>
            <div>
              <span className="text-gray-500">Location</span>
              <p className="font-medium text-gray-900 mt-0.5">Dubai, UAE</p>
            </div>
            <div>
              <span className="text-gray-500">System</span>
              <p className="font-medium text-gray-900 mt-0.5">Concept 5 OS</p>
            </div>
            <div>
              <span className="text-gray-500">Currency</span>
              <p className="font-medium text-gray-900 mt-0.5">AED (UAE Dirham)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
