/**
 * Auto-generate drawing requirements from quote items
 * Groups items by floor + room to create logical drawing packages
 */

interface QuoteItem {
  id: string
  item_code: string
  description: string
  type_code: string | null
  floor_code: string | null
  room_code: string | null
  sequence: number | null
  quantity: number
}

interface DrawingRequirementGroup {
  title: string
  type_code: string | null
  floor_code: string | null
  room_code: string | null
  items: QuoteItem[]
}

/**
 * Group quote items by floor + room for drawing requirements
 * NOW: Creates one drawing per item (1:1 mapping)
 */
export function groupItemsForDrawings(items: QuoteItem[]): DrawingRequirementGroup[] {
  // Create one group per item
  return items.map((item) => {
    const floor = item.floor_code || 'UNKNOWN'
    const room = item.room_code || 'GENERAL'
    const type = item.type_code || 'OTHER'
    
    const floorName = getFloorName(floor)
    const roomName = room === 'GENERAL' ? '' : ` - ${room}`
    const typeName = item.type_code ? getTypeName(item.type_code) : 'Item'
    
    // Use item description or code as title
    const title = item.description || item.item_code || 'Item'
    
    return {
      title: title.substring(0, 100), // Limit title length
      type_code: item.type_code,
      floor_code: item.floor_code,
      room_code: item.room_code === 'GENERAL' ? null : item.room_code,
      items: [item], // Only this one item
    }
  })
}

function getFloorName(code: string): string {
  const floors: Record<string, string> = {
    BF: 'Basement Floor',
    GF: 'Ground Floor',
    FF: 'First Floor',
    SF: 'Second Floor',
    TF: 'Third Floor',
    RF: 'Roof Floor',
    UNKNOWN: 'Unknown Floor',
  }
  return floors[code] || code
}

function getTypeName(code: string): string {
  const types: Record<string, string> = {
    K: 'Kitchen',
    W: 'Wardrobes',
    V: 'Vanity',
    T: 'TV Unit',
    J: 'Joinery',
  }
  return types[code] || code
}

/**
 * Create drawing requirements and link items (for server actions)
 */
export async function createDrawingRequirementsForProject(
  supabase: any,
  projectId: string,
  projectItems: Array<{ id: string; item_code: string; description: string; type_code: string | null; floor_code: string | null; room_code: string | null; sequence: number | null; quantity: number }>
) {
  // Group items
  const groups = groupItemsForDrawings(projectItems)

  for (const group of groups) {
    // Create drawing requirement
    const { data: drawingReq, error: reqError } = await supabase
      .from('drawing_requirements')
      .insert([{
        project_id: projectId,
        title: group.title,
        type_code: group.type_code,
        floor_code: group.floor_code,
        room_code: group.room_code,
        status: 'queued',
      }])
      .select()
      .single()

    if (reqError) {
      console.error('Failed to create drawing requirement:', reqError)
      throw new Error(`Failed to create drawing requirement: ${reqError.message}`)
    }

    // Link items to this drawing requirement
    const linkRecords = group.items.map((item) => ({
      drawing_requirement_id: drawingReq.id,
      project_item_id: item.id,
    }))

    const { error: linkError } = await supabase
      .from('drawing_requirement_items')
      .insert(linkRecords)

    if (linkError) {
      console.error('Failed to link items to drawing requirement:', linkError)
      throw new Error(`Failed to link items: ${linkError.message}`)
    }
  }

  return groups.length
}
