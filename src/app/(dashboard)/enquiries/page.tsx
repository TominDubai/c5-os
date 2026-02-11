import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  new: 'bg-green-100 text-green-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  new: '🟢 New',
  reviewing: '🟡 Reviewing',
  quoted: '🔵 Quoted',
  won: '✅ Won',
  lost: '❌ Lost',
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  let query = supabase
    .from('enquiries')
    .select(`
      *,
      clients(name, company)
    `)
    .order('created_at', { ascending: false })
  
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  
  const { data: enquiries, error } = await query
  
  if (error) {
    console.error('Error fetching enquiries:', error)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <Link
          href="/enquiries/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + New Enquiry
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'new', 'reviewing', 'quoted', 'won', 'lost'].map((status) => (
          <Link
            key={status}
            href={`/enquiries${status === 'all' ? '' : `?status=${status}`}`}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              (params.status || 'all') === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : statusLabels[status] || status}
          </Link>
        ))}
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enquiry #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enquiries && enquiries.length > 0 ? (
              enquiries.map((enquiry) => (
                <tr key={enquiry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    <Link href={`/enquiries/${enquiry.id}`}>
                      {enquiry.enquiry_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {enquiry.clients?.name || enquiry.client_name || '—'}
                    {(enquiry.clients?.company || enquiry.client_name) && (
                      <span className="text-gray-500 block text-xs">
                        {enquiry.clients?.company}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                    {enquiry.project_type?.replace('_', ' ') || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[enquiry.status] || 'bg-gray-100'}`}>
                      {statusLabels[enquiry.status] || enquiry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(enquiry.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/enquiries/${enquiry.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      View
                    </Link>
                    {enquiry.status === 'new' && (
                      <Link
                        href={`/quotes/new?enquiry=${enquiry.id}`}
                        className="text-green-600 hover:text-green-800"
                      >
                        Create Quote
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No enquiries found.{' '}
                  <Link href="/enquiries/new" className="text-blue-600 hover:underline">
                    Create your first enquiry
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
