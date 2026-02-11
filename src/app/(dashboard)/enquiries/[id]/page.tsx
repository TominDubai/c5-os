import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EnquiryStatusUpdate from './EnquiryStatusUpdate'

const statusColors: Record<string, string> = {
  new: 'bg-green-100 text-green-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
}

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: enquiry, error } = await supabase
    .from('enquiries')
    .select(`
      *,
      clients(id, name, company, email, phone)
    `)
    .eq('id', id)
    .single()
  
  if (error || !enquiry) {
    notFound()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/enquiries"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Enquiries
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {enquiry.enquiry_number}
          </h1>
          <p className="text-gray-600">
            {enquiry.clients?.name || enquiry.client_name || 'Unknown Client'}
            {enquiry.clients?.company && ` • ${enquiry.clients.company}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[enquiry.status]}`}>
            {enquiry.status.charAt(0).toUpperCase() + enquiry.status.slice(1)}
          </span>
          {enquiry.status !== 'won' && enquiry.status !== 'lost' && (
            <Link
              href={`/quotes/new?enquiry=${enquiry.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Quote
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Project Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
            
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Project Type</dt>
                <dd className="text-gray-900 capitalize">
                  {enquiry.project_type?.replace('_', ' ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Location</dt>
                <dd className="text-gray-900">{enquiry.location || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Source</dt>
                <dd className="text-gray-900">{enquiry.source || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {new Date(enquiry.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>

            {enquiry.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dt className="text-sm text-gray-500 mb-1">Description</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{enquiry.description}</dd>
              </div>
            )}
          </div>

          {/* Client Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h2>
            
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Name</dt>
                <dd className="text-gray-900">
                  {enquiry.clients?.name || enquiry.client_name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Company</dt>
                <dd className="text-gray-900">{enquiry.clients?.company || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-gray-900">
                  {enquiry.clients?.email || enquiry.client_email ? (
                    <a
                      href={`mailto:${enquiry.clients?.email || enquiry.client_email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {enquiry.clients?.email || enquiry.client_email}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-gray-900">
                  {enquiry.clients?.phone || enquiry.client_phone ? (
                    <a
                      href={`tel:${enquiry.clients?.phone || enquiry.client_phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {enquiry.clients?.phone || enquiry.client_phone}
                    </a>
                  ) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Attachments Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
            <p className="text-gray-500 text-center py-4">
              No attachments yet. Upload renderings and concept images.
            </p>
            <button className="w-full mt-2 border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:border-blue-500 hover:text-blue-500">
              + Upload Files
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <EnquiryStatusUpdate enquiryId={enquiry.id} currentStatus={enquiry.status} />

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/quotes/new?enquiry=${enquiry.id}`}
                className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                Create Quote
              </Link>
              <button className="block w-full text-center border border-gray-300 py-2 px-4 rounded-md text-gray-700 hover:bg-gray-50">
                Edit Enquiry
              </button>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity</h3>
            <p className="text-gray-500 text-sm">No activity yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
