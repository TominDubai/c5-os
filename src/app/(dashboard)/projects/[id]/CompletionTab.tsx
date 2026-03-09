'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  projectStatus: string
  contractValue: number
  totalItems: number
  verifiedItems: number
}

interface Snag {
  id: string
  snag_number: string
  description: string
  severity: 'minor' | 'major' | 'critical'
  location: string | null
  status: string
  created_at: string
  project_items?: { item_code: string }[] | null
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: string
  amount: number
  status: string
  issued_at: string | null
  paid_at: string | null
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  major: 'bg-orange-100 text-orange-700 border-orange-200',
  minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const invoiceStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

export default function CompletionTab({ projectId, projectStatus, contractValue, totalItems, verifiedItems }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [snags, setSnags] = useState<Snag[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceType, setInvoiceType] = useState<'progress' | 'final'>('final')

  const openSnags = snags.filter((s) => ['open', 'in_progress'].includes(s.status))
  const allItemsVerified = totalItems > 0 && verifiedItems === totalItems
  const allSnagsResolved = openSnags.length === 0
  const canComplete = allItemsVerified && allSnagsResolved && projectStatus !== 'completed'

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const [{ data: snagData }, { data: invoiceData }] = await Promise.all([
      supabase
        .from('snags')
        .select('id, snag_number, description, severity, location, status, created_at, project_items(item_code)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_type, amount, status, issued_at, paid_at')
        .eq('project_id', projectId)
        .order('issued_at', { ascending: true }),
    ])
    if (snagData) setSnags(snagData)
    if (invoiceData) setInvoices(invoiceData)
    setLoading(false)
  }

  const resolveSnag = async (snagId: string) => {
    setActionLoading(snagId)
    await supabase
      .from('snags')
      .update({ status: 'fixed', fixed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', snagId)
    await load()
    setActionLoading(null)
  }

  const createInvoice = async () => {
    const amount = parseFloat(invoiceAmount)
    if (!amount || amount <= 0) return alert('Enter a valid amount')
    setActionLoading('invoice')

    const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true })
    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`

    const { error } = await supabase.from('invoices').insert({
      project_id: projectId,
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      amount,
      status: 'draft',
      issued_at: new Date().toISOString(),
    })

    if (error) {
      alert('Failed to create invoice: ' + error.message)
    } else {
      setShowInvoiceForm(false)
      setInvoiceAmount('')
      await load()
    }
    setActionLoading(null)
  }

  const markInvoiceSent = async (invoiceId: string) => {
    setActionLoading(invoiceId)
    await supabase.from('invoices').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', invoiceId)
    await load()
    setActionLoading(null)
  }

  const markInvoicePaid = async (invoiceId: string) => {
    setActionLoading(invoiceId)
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', invoiceId)
    await load()
    setActionLoading(null)
  }

  const closeProject = async () => {
    if (!canComplete) return
    if (!confirm('Mark this project as completed? This will archive it.')) return
    setActionLoading('close')
    await supabase
      .from('projects')
      .update({ status: 'completed', actual_completion: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', projectId)
    router.refresh()
    setActionLoading(null)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading completion data...</div>
  }

  if (projectStatus === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800">Project Completed</h2>
        <p className="text-green-600 mt-1">This project has been closed and archived.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Main content */}
      <div className="col-span-2 space-y-6">

        {/* Completion Checklist */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Completion Checklist</h2>
          <div className="space-y-3">
            <ChecklistItem
              done={allItemsVerified}
              label="All items QS verified"
              detail={`${verifiedItems} / ${totalItems} items verified`}
            />
            <ChecklistItem
              done={allSnagsResolved}
              label="All snags resolved"
              detail={openSnags.length > 0 ? `${openSnags.length} open snag${openSnags.length > 1 ? 's' : ''} remaining` : 'No open snags'}
            />
            <ChecklistItem
              done={invoices.some((i) => i.invoice_type === 'final')}
              label="Final invoice issued"
              detail={invoices.some((i) => i.invoice_type === 'final') ? 'Final invoice created' : 'Not yet issued'}
            />
          </div>
        </div>

        {/* Open Snags */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">
              Snag List
              {openSnags.length > 0 && (
                <span className="ml-2 text-sm text-red-600">({openSnags.length} open)</span>
              )}
            </h2>
          </div>
          {snags.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No snags raised for this project.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {snags.map((snag) => (
                <div key={snag.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500">{snag.snag_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColors[snag.severity]}`}>
                        {snag.severity}
                      </span>
                      {['open', 'in_progress'].includes(snag.status) ? (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Open</span>
                      ) : (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">✓ Fixed</span>
                      )}
                      {snag.project_items?.[0]?.item_code && (
                        <span className="text-xs font-mono text-blue-600">{snag.project_items[0].item_code}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900">{snag.description}</p>
                    {snag.location && <p className="text-xs text-gray-500 mt-0.5">📍 {snag.location}</p>}
                  </div>
                  {['open', 'in_progress'].includes(snag.status) && (
                    <button
                      onClick={() => resolveSnag(snag.id)}
                      disabled={actionLoading === snag.id}
                      className="shrink-0 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === snag.id ? '...' : '✓ Mark Fixed'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Invoices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Invoices</h3>
            <button
              onClick={() => setShowInvoiceForm(!showInvoiceForm)}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              + New
            </button>
          </div>

          {showInvoiceForm && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as 'progress' | 'final')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="progress">Progress Payment</option>
                  <option value="final">Final Invoice</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount (AED)</label>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder={contractValue > 0 ? `Contract: ${contractValue.toLocaleString()}` : 'Enter amount'}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createInvoice}
                  disabled={actionLoading === 'invoice'}
                  className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'invoice' ? '...' : 'Create'}
                </button>
                <button onClick={() => setShowInvoiceForm(false)} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {invoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-mono text-xs text-gray-600">{inv.invoice_number}</span>
                      <span className="text-xs text-gray-400 ml-2 capitalize">{inv.invoice_type}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${invoiceStatusColors[inv.status] || 'bg-gray-100'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    AED {inv.amount?.toLocaleString()}
                  </div>
                  {inv.paid_at && (
                    <div className="text-xs text-green-600 mt-1">
                      Paid {new Date(inv.paid_at).toLocaleDateString('en-GB')}
                    </div>
                  )}
                  {inv.status === 'draft' && (
                    <button
                      onClick={() => markInvoiceSent(inv.id)}
                      disabled={actionLoading === inv.id}
                      className="mt-2 w-full text-xs bg-blue-600 text-white py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === inv.id ? '...' : 'Mark Sent'}
                    </button>
                  )}
                  {inv.status === 'sent' && (
                    <button
                      onClick={() => markInvoicePaid(inv.id)}
                      disabled={actionLoading === inv.id}
                      className="mt-2 w-full text-xs bg-green-600 text-white py-1 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === inv.id ? '...' : 'Mark Paid'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Project */}
        <div className={`rounded-lg p-6 ${canComplete ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
          <h3 className={`font-semibold mb-2 ${canComplete ? 'text-green-900' : 'text-gray-600'}`}>
            Close Project
          </h3>
          {!canComplete && (
            <p className="text-xs text-gray-500 mb-3">
              {!allItemsVerified && 'All items must be QS verified. '}
              {!allSnagsResolved && 'All snags must be resolved. '}
            </p>
          )}
          <button
            onClick={closeProject}
            disabled={!canComplete || actionLoading === 'close'}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
              canComplete
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } disabled:opacity-60`}
          >
            {actionLoading === 'close' ? 'Closing...' : '✅ Mark Project Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border ${done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
        {done ? '✓' : '○'}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? 'text-green-900' : 'text-gray-700'}`}>{label}</p>
        <p className={`text-xs ${done ? 'text-green-600' : 'text-gray-500'}`}>{detail}</p>
      </div>
    </div>
  )
}
