'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DepositConfirmationProps {
  projectId: string
  depositAmount: number
  invoiceNumber: string
}

export default function DepositConfirmation({
  projectId,
  depositAmount,
  invoiceNumber,
}: DepositConfirmationProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentReference, setPaymentReference] = useState('')
  const [loading, setLoading] = useState(false)

  const confirmPayment = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod, paymentReference }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(`Error: ${data.error}`)
        return
      }
      setShowModal(false)
      router.refresh()
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-amber-800">⏳ Awaiting Deposit Payment</div>
          <div className="text-sm text-amber-700 mt-0.5">
            {invoiceNumber} · AED {depositAmount.toLocaleString()}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
        >
          ✅ Confirm Payment Received
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Confirm Deposit Received</h3>
            <p className="text-sm text-gray-500 mb-4">
              {invoiceNumber} · AED {depositAmount.toLocaleString()}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference / Transaction ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="e.g. TXN-123456"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmPayment}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Confirming...' : '✅ Confirm Payment'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
