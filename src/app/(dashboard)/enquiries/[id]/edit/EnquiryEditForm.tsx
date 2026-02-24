'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const projectTypes = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'wardrobes', label: 'Wardrobes' },
  { value: 'vanity', label: 'Vanity' },
  { value: 'tv_unit', label: 'TV Unit' },
  { value: 'full_fitout', label: 'Full Fit-out' },
  { value: 'other', label: 'Other' },
]

const sourceOptions = [
  'Referral',
  'Website',
  'Social Media',
  'Exhibition',
  'Repeat Client',
  'Other',
]

interface Enquiry {
  id: string
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  project_type: string | null
  location: string | null
  source: string | null
  description: string | null
}

export default function EnquiryEditForm({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    client_name: enquiry.client_name || '',
    client_email: enquiry.client_email || '',
    client_phone: enquiry.client_phone || '',
    project_type: enquiry.project_type || '',
    location: enquiry.location || '',
    source: enquiry.source || '',
    description: enquiry.description || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: updateError } = await supabase
      .from('enquiries')
      .update({
        client_name: formData.client_name,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        project_type: formData.project_type || null,
        location: formData.location || null,
        source: formData.source || null,
        description: formData.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enquiry.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push(`/enquiries/${enquiry.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Enquiry</h1>
        <Link href={`/enquiries/${enquiry.id}`} className="text-gray-600 hover:text-gray-800">
          ← Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                id="client_name"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="client_email"
                  name="client_email"
                  value={formData.client_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="client_phone"
                  name="client_phone"
                  value={formData.client_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="project_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type
                </label>
                <select
                  id="project_type"
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  {projectTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select source...</option>
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Dubai Marina, Palm Jumeirah"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Project details, requirements, special notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/enquiries/${enquiry.id}`}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
