'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  quoteId: string
  envelopeId: string
  status: string
}

export default function DocuSignStatus({ quoteId, envelopeId, status: initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/docusign/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      })
      const data = await res.json()
      if (data.status) {
        setStatus(data.status)
        router.refresh()
      } else {
        alert(data.error || 'Failed to check status')
      }
    } catch {
      alert('Failed to check status')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">✍️ DocuSign</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <dt className="text-gray-500">Status</dt>
          <dd>
            {status === 'completed' ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">Signed</span>
            ) : status === 'sent' ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Awaiting Signature</span>
            ) : status === 'declined' ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">Declined</span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">{status}</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Envelope ID</dt>
          <dd className="text-gray-600 font-mono text-xs truncate max-w-32" title={envelopeId}>
            {envelopeId.slice(0, 8)}…
          </dd>
        </div>
      </dl>
      <button
        onClick={refresh}
        disabled={loading || status === 'completed'}
        className="mt-3 w-full text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Checking...' : status === 'completed' ? '✅ Signed' : '↻ Refresh Status'}
      </button>
    </div>
  )
}
