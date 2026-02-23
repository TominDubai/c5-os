interface InvoiceInfoProps {
  invoices: any[]
  projectStatus: string
}

export default function InvoiceInfo({ invoices, projectStatus }: InvoiceInfoProps) {
  const depositInvoice = invoices?.find((inv: any) => inv.invoice_type === 'deposit')

  if (!depositInvoice) return null

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">💰 Deposit Invoice</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Invoice #</span>
          <span className="font-mono text-sm font-medium">{depositInvoice.invoice_number}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="text-lg font-bold text-gray-900">
            AED {depositInvoice.amount?.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Percentage</span>
          <span className="text-sm font-medium">{depositInvoice.percentage}%</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Status</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[depositInvoice.status]}`}>
            {depositInvoice.status === 'draft' && '📝 Draft'}
            {depositInvoice.status === 'sent' && '📤 Sent'}
            {depositInvoice.status === 'paid' && '✅ Paid'}
            {depositInvoice.status === 'overdue' && '⚠️ Overdue'}
            {depositInvoice.status === 'cancelled' && '🚫 Cancelled'}
          </span>
        </div>

        {depositInvoice.issued_at && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Issued</span>
            <span className="text-sm">
              {new Date(depositInvoice.issued_at).toLocaleDateString('en-GB')}
            </span>
          </div>
        )}

        {depositInvoice.paid_at && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Paid</span>
            <span className="text-sm text-green-600 font-medium">
              {new Date(depositInvoice.paid_at).toLocaleDateString('en-GB')}
            </span>
          </div>
        )}

        {depositInvoice.payment_method && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Method</span>
            <span className="text-sm capitalize">
              {depositInvoice.payment_method.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {projectStatus === 'awaiting_deposit' && depositInvoice.status !== 'paid' && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Mark deposit as paid above to generate project items and drawings.
          </p>
        </div>
      )}
    </div>
  )
}
