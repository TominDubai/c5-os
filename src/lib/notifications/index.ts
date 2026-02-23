/**
 * Notification Helper Functions
 * Send in-app and email notifications to users
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: 'project_created' | 'drawing_assigned' | 'drawing_approved' | 'item_ready_for_qc' | 'dispatch_scheduled' | 'general'
  entityType?: string
  entityId?: string
  linkUrl?: string
}

/**
 * Send in-app notification
 */
export async function sendNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload
) {
  const { error } = await supabase.from('notifications').insert([
    {
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      link_url: payload.linkUrl,
      delivered_via: ['in_app'],
    },
  ])

  if (error) {
    console.error('Failed to send notification:', error)
    throw error
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
) {
  const notifications = userIds.map((userId) => ({
    user_id: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    link_url: payload.linkUrl,
    delivered_via: ['in_app'],
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Failed to send bulk notifications:', error)
    throw error
  }

  return notifications.length
}

/**
 * Notify design team about new project
 */
export async function notifyDesignTeamNewProject(
  supabase: SupabaseClient,
  projectId: string,
  projectCode: string,
  projectName: string,
  drawingCount: number
) {
  // Get all design team members (designers + design lead)
  const { data: designers, error: designerError } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['designer', 'design_lead'])
    .eq('is_active', true)

  if (designerError || !designers || designers.length === 0) {
    console.warn('No active designers found to notify')
    return 0
  }

  const userIds = designers.map((d) => d.id)

  const count = await sendBulkNotifications(supabase, userIds, {
    title: '🎨 New Project - Shop Drawings Required',
    message: `Project ${projectCode} (${projectName}) has been approved and deposit paid. ${drawingCount} shop drawing${drawingCount !== 1 ? 's' : ''} ${drawingCount !== 1 ? 'are' : 'is'} ready for assignment.`,
    type: 'project_created',
    entityType: 'project',
    entityId: projectId,
    linkUrl: `/design?project=${projectId}`,
  })

  console.log(`✅ Notified ${count} design team members about project ${projectCode}`)
  return count
}

/**
 * Notify designer about new assignment
 */
export async function notifyDesignerAssignment(
  supabase: SupabaseClient,
  designerId: string,
  drawingId: string,
  drawingNumber: string,
  drawingTitle: string,
  dueDate?: string
) {
  await sendNotification(supabase, {
    userId: designerId,
    title: '📐 New Drawing Assignment',
    message: `You have been assigned ${drawingNumber}: ${drawingTitle}${dueDate ? ` (Due: ${new Date(dueDate).toLocaleDateString('en-GB')})` : ''}`,
    type: 'drawing_assigned',
    entityType: 'drawing_requirement',
    entityId: drawingId,
    linkUrl: `/design/${drawingId}`,
  })

  console.log(`✅ Notified designer about assignment: ${drawingNumber}`)
}

/**
 * Notify design lead about drawing ready for review
 */
export async function notifyDesignLeadReview(
  supabase: SupabaseClient,
  drawingId: string,
  drawingNumber: string,
  drawingTitle: string,
  designerName: string
) {
  // Get design leads
  const { data: leads } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'design_lead')
    .eq('is_active', true)

  if (!leads || leads.length === 0) {
    console.warn('No design leads found to notify')
    return
  }

  const userIds = leads.map((l) => l.id)

  await sendBulkNotifications(supabase, userIds, {
    title: '👀 Drawing Ready for Review',
    message: `${designerName} has completed ${drawingNumber}: ${drawingTitle} and marked it ready for review.`,
    type: 'drawing_approved',
    entityType: 'drawing_requirement',
    entityId: drawingId,
    linkUrl: `/design/${drawingId}`,
  })

  console.log(`✅ Notified design leads about drawing ready for review: ${drawingNumber}`)
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string
) {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
) {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    throw error
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get unread notifications:', error)
    return []
  }

  return data || []
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }

  return count || 0
}
