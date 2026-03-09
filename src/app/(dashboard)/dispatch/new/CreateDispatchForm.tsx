'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Item {
  id: string
  item_code: string
  description: string
  project_id: string
}

interface ProjectGroup {
  info: { id: string; project_code: string; name: string; site_address?: string; clients?: { name: string } }
  items: Item[]
}

interface Driver {
  id: string
  full_name: string
}

interface Props {
  dispatchNumber: string
  projectGroups: Record<string, ProjectGroup>
  drivers: Driver[]
  preselectedProject: string | null
}

export default function CreateDispatchForm({ dispatchNumber, projectGroups, drivers, preselectedProject }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const projectIds = Object.keys(projectGroups)

  // If only one project or preselected, use that; otherwise show project picker
  const [selectedProject, setSelectedProject] = useState<string>(
    preselectedProject || (projectIds.length === 1 ? projectIds[0] : '')
  )
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [driverId, setDriverId] = useState('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [siteContact, setSiteContact] = useState('')
  const [sitePhone, setSitePhone] = useState('')
  const [loading, setLoading] = useState(false)

  const currentGroup = selectedProject ? projectGroups[selectedProject] : null
  const currentItems = currentGroup?.items || []

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedItems.size === currentItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(currentItems.map((i) => i.id)))
    }
  }

  const handleSubmit = async () => {
    if (!selectedProject) return alert('Please select a project')
    if (selectedItems.size === 0) return alert('Please select at least one item')
    if (!driverId) return alert('Please assign a driver')
    if (!scheduledDate) return alert('Please set a delivery date')

    setLoading(true)

    try {
      // Create the dispatch record
      const { data: dispatch, error: dispatchError } = await supabase
        .from('dispatches')
        .insert({
          dispatch_number: dispatchNumber,
          project_id: selectedProject,
          driver_id: driverId,
          vehicle_number: vehicleNumber || null,
          site_contact_name: siteContact || null,
          site_contact_phone: sitePhone || null,
          scheduled_date: scheduledDate,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single()

      if (dispatchError || !dispatch) throw new Error(dispatchError?.message || 'Failed to create dispatch')

      // Create dispatch items
      const dispatchItems = Array.from(selectedItems).map((itemId) => ({
        dispatch_id: dispatch.id,
        project_item_id: itemId,
        delivered: false,
      }))

      const { error: itemsError } = await supabase.from('dispatch_items').insert(dispatchItems)
      if (itemsError) throw new Error(itemsError.message)

      // Update item statuses to dispatched
      const { error: statusError } = await supabase
        .from('project_items')
        .update({ status: 'dispatched', dispatched_at: new Date().toISOString(), dispatch_id: dispatch.id, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedItems))

      if (statusError) throw new Error(statusError.message)

      router.push(`/dispatch/${dispatch.id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to create dispatch')
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Item Selection */}
      <div className="col-span-2 space-y-4">
        {/* Project picker — only if multiple projects */}
        {projectIds.length > 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Select Project</h3>
            <div className="grid grid-cols-2 gap-3">
              {projectIds.map((pid) => {
                const g = projectGroups[pid]
                return (
                  <button
                    key={pid}
                    onClick={() => { setSelectedProject(pid); setSelectedItems(new Set()) }}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedProject === pid
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-mono text-sm text-blue-600">{g.info.project_code}</div>
                    <div className="text-sm font-medium text-gray-900">{g.info.name}</div>
                    <div className="text-xs text-gray-500">{g.items.length} items ready</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Items list */}
        {currentGroup && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-900">{currentGroup.info.project_code}</span>
                <span className="text-gray-600 ml-2">{currentGroup.info.name}</span>
                {currentGroup.info.site_address && (
                  <div className="text-sm text-gray-500 mt-0.5">📍 {currentGroup.info.site_address}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{selectedItems.size} / {currentItems.length} selected</span>
                <button onClick={toggleAll} className="text-sm text-blue-600 hover:underline">
                  {selectedItems.size === currentItems.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {currentItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <span className="font-mono text-sm text-blue-600">{item.item_code}</span>
                    <span className="text-gray-900 ml-3 text-sm">{item.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Dispatch Details */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Dispatch Details</h3>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Dispatch #</label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-mono text-gray-700">
              {dispatchNumber}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Driver *</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Delivery Date *</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Vehicle / Truck #</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. DXB-12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Site Contact</label>
            <input
              type="text"
              value={siteContact}
              onChange={(e) => setSiteContact(e.target.value)}
              placeholder="Contact name on site"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Site Contact Phone</label>
            <input
              type="tel"
              value={sitePhone}
              onChange={(e) => setSitePhone(e.target.value)}
              placeholder="+971 50 000 0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || selectedItems.size === 0 || !driverId || !selectedProject}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : `📦 Create Dispatch (${selectedItems.size} items)`}
        </button>
      </div>
    </div>
  )
}
