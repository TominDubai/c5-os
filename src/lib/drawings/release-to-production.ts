/**
 * Release items to production when a drawing is approved
 * NOW: Releases only the items linked to THIS drawing (not all project items)
 */

import { SupabaseClient } from '@supabase/supabase-js'

export async function releaseDrawingItemsToProduction(
  supabase: SupabaseClient,
  drawingId: string,
  projectId: string
) {
  console.log(`Releasing items for drawing ${drawingId} to production...`)

  // Get items linked to this drawing
  const { data: drawingItems, error: itemsError } = await supabase
    .from('drawing_requirement_items')
    .select('project_item_id')
    .eq('drawing_requirement_id', drawingId)

  if (itemsError || !drawingItems || drawingItems.length === 0) {
    console.error('Failed to fetch drawing items:', itemsError)
    return false
  }

  const itemIds = drawingItems.map(di => di.project_item_id)
  console.log(`Found ${itemIds.length} items to release`)

  // Move these specific items from pending_design to pre_production
  const { error: updateError } = await supabase
    .from('project_items')
    .update({ 
      status: 'pre_production',
      updated_at: new Date().toISOString()
    })
    .in('id', itemIds)
    .eq('status', 'pending_design')

  if (updateError) {
    console.error('Failed to release items to production:', updateError)
    return false
  }

  console.log(`Released ${itemIds.length} items to production`)

  // Check if ALL items for this project are now in production or beyond
  const { data: pendingItems } = await supabase
    .from('project_items')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'pending_design')

  // If no items are pending_design anymore, update project status
  if (!pendingItems || pendingItems.length === 0) {
    await supabase
      .from('projects')
      .update({ 
        status: 'in_production',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
    
    console.log(`All items released - project ${projectId} moved to in_production`)
  }

  return true
}
