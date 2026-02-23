import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all notifications for current user
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return new Date(timestamp).toLocaleDateString('en-GB')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project_created': return '🎨'
      case 'drawing_assigned': return '📐'
      case 'drawing_approved': return '👀'
      case 'item_ready_for_qc': return '✅'
      case 'dispatch_scheduled': return '🚚'
      default: return '🔔'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>

      {notifications && notifications.length > 0 ? (
        <div className="bg-white rounded-lg shadow divide-y">
          {notifications.map((notif: any) => (
            <div
              key={notif.id}
              className={`p-6 ${!notif.read ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{getTypeIcon(notif.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`${!notif.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                        {notif.title}
                      </h3>
                      <p className="text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-sm text-gray-400 mt-2">{getTimeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.read && (
                      <span className="ml-4 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        New
                      </span>
                    )}
                  </div>
                  {notif.link_url && (
                    <Link
                      href={notif.link_url}
                      className="inline-block mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="text-gray-600 text-lg">No notifications yet</p>
          <p className="text-gray-500 text-sm mt-2">
            You'll be notified when there's important activity
          </p>
        </div>
      )}
    </div>
  )
}
