import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import QuoteActions from './QuoteActions'
import QuoteDelete from './QuoteDelete'
import QuoteAssignedTo from './QuoteAssignedTo'
import QuoteApproval from './QuoteApproval'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-emerald-100 text-emerald-800',
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const [{ data: quote, error }, { data: users }] = await Promise.all([
    supabase
      .from('quotes')
      .select(`
        *,
        clients(id, name, company, email, phone),
        enquiries(id, enquiry_number),
        quote_items(*),
        approved_by_user:users!quotes_approved_by_fkey(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('is_active', true)
      .order('full_name'),
  ])

  if (error || !quote) {
    notFound()
  }

  // Check if already converted to project
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, project_code')
    .eq('quote_id', id)
    .single()

  const items = quote.quote_items || []

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/quotes" className="text-gray-500 hover:text-gray-700">
              ← Quotes
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[quote.status]}`}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </span>
          </div>
          <p className="text-gray-600 mt-1">{quote.title}</p>
          {quote.clients && (
            <p className="text-gray-500">
              {quote.clients.name}
              {quote.clients.company && ` • ${quote.clients.company}`}
            </p>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            AED {quote.total?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-500 mb-2">
            Subtotal: AED {quote.subtotal?.toLocaleString() || '0'} + VAT
          </div>
          {!existingProject && (
            <QuoteDelete quoteId={quote.id} quoteNumber={quote.quote_number} />
          )}
        </div>
      </div>

      {/* Converted Banner */}
      {existingProject && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-emerald-800 font-medium">✅ Converted to Project</span>
              <span className="text-emerald-600 ml-2">{existingProject.project_code}</span>
            </div>
            <Link
              href={`/projects/${existingProject.id}`}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
            >
              View Project
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Items Table */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Quote Items ({items.length})</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm font-mono text-blue-600">{item.item_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      AED {item.unit_price?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      AED {item.total_price?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm text-gray-600">Subtotal</td>
                  <td className="px-6 py-3 text-right text-sm font-medium">
                    AED {quote.subtotal?.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm text-gray-600">
                    VAT ({quote.vat_rate}%)
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium">
                    AED {quote.vat_amount?.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td colSpan={4} className="px-6 py-3 text-right font-semibold text-blue-900">Total</td>
                  <td className="px-6 py-3 text-right text-lg font-bold text-blue-900">
                    AED {quote.total?.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned QS — only for draft quotes */}
          {quote.status === 'draft' && (
            <QuoteAssignedTo
              quoteId={quote.id}
              currentAssignedTo={quote.assigned_to}
              users={users || []}
            />
          )}

          {/* Internal Approval — only for draft quotes */}
          {quote.status === 'draft' && !existingProject && (
            <QuoteApproval
              quoteId={quote.id}
              approvalStatus={quote.approval_status || 'not_requested'}
              approvalNotes={quote.approval_notes}
              approvedByName={(quote as any).approved_by_user?.full_name || null}
              approvalCompletedAt={quote.approval_completed_at}
              quoteStatus={quote.status}
            />
          )}

          {/* Actions */}
          {!existingProject && (
            <QuoteActions
              quoteId={quote.id}
              currentStatus={quote.status}
              approvalStatus={quote.approval_status || 'not_requested'}
              clientId={quote.client_id}
              enquiryId={quote.enquiry_id}
              paymentReceived={quote.payment_received || false}
              quoteTotal={quote.total || 0}
            />
          )}
          
          {/* Payment Info */}
          {quote.payment_received && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">💰 Payment</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Amount</dt>
                  <dd className="text-gray-900 font-medium">
                    AED {quote.payment_amount?.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date</dt>
                  <dd className="text-gray-900">
                    {quote.payment_date ? new Date(quote.payment_date).toLocaleDateString('en-GB') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Method</dt>
                  <dd className="text-gray-900 capitalize">
                    {quote.payment_method?.replace('_', ' ') || '—'}
                  </dd>
                </div>
                {quote.payment_reference && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Reference</dt>
                    <dd className="text-gray-900">{quote.payment_reference}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Quote Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {new Date(quote.created_at).toLocaleDateString('en-GB')}
                </dd>
              </div>
              {quote.sent_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sent</dt>
                  <dd className="text-gray-900">
                    {new Date(quote.sent_at).toLocaleDateString('en-GB')}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Valid Until</dt>
                <dd className="text-gray-900">
                  {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-GB') : '—'}
                </dd>
              </div>
              {quote.enquiries && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Enquiry</dt>
                  <dd>
                    <Link
                      href={`/enquiries/${quote.enquiries.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {quote.enquiries.enquiry_number}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Client */}
          {quote.clients && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Client</h3>
              <div className="text-gray-900 font-medium">{quote.clients.name}</div>
              {quote.clients.company && (
                <div className="text-gray-600 text-sm">{quote.clients.company}</div>
              )}
              {quote.clients.email && (
                <a href={`mailto:${quote.clients.email}`} className="text-blue-600 text-sm block mt-2">
                  {quote.clients.email}
                </a>
              )}
              {quote.clients.phone && (
                <a href={`tel:${quote.clients.phone}`} className="text-blue-600 text-sm block">
                  {quote.clients.phone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
