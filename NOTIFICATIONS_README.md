# Notification System - Complete Guide

## Overview

The C5 OS notification system automatically alerts users about important events across the system. Notifications are sent **in-app** with real-time updates, and can be extended to email/WhatsApp in the future.

---

## What Gets Notified

### 1. **Project Created (BOQ Approved + Deposit Paid)**

**When:** Quote is converted to project  
**Who gets notified:** All active designers + design lead  
**Message:** *"Project [CODE] ([NAME]) has been approved and deposit paid. X shop drawing(s) are ready for assignment."*  
**Link:** `/design?project=[PROJECT_ID]`

---

### 2. **Drawing Assigned to Designer**

**When:** Design lead assigns a drawing requirement to a designer  
**Who gets notified:** The assigned designer  
**Message:** *"You have been assigned [DRAWING_NUMBER]: [TITLE] (Due: [DATE])"*  
**Link:** `/design/[DRAWING_ID]`

---

### 3. **Drawing Ready for Review**

**When:** Designer marks drawing as "Ready for Review"  
**Who gets notified:** All design leads  
**Message:** *"[DESIGNER_NAME] has completed [DRAWING_NUMBER]: [TITLE] and marked it ready for review."*  
**Link:** `/design/[DRAWING_ID]`

---

## Database Schema

### `notifications` Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN (
    'project_created',
    'drawing_assigned',
    'drawing_approved',
    'item_ready_for_qc',
    'dispatch_scheduled',
    'general'
  )),
  
  entity_type TEXT,  -- 'project', 'drawing_requirement', etc.
  entity_id UUID,
  link_url TEXT,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  delivered_via TEXT[],
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Features:**
- **RLS enabled** — users can only see their own notifications
- **Real-time subscriptions** — UI updates instantly
- **Link tracking** — direct navigation to relevant pages
- **Read status** — track which notifications have been seen

---

## User Interface

### 1. Notification Bell (Top Navigation)

**Location:** Top-right corner of every dashboard page  
**Features:**
- 🔔 Bell icon with unread count badge
- Dropdown showing last 10 notifications
- Click notification → navigate to relevant page
- "Mark all read" button
- Real-time updates (no page refresh needed)

**Visual Indicators:**
- Red badge: Shows unread count (max "9+")
- Blue background: Unread notifications
- Blue dot: Individual unread indicator

---

### 2. Notifications Page (`/notifications`)

**Features:**
- Full list of all notifications (unlimited)
- Grouped by date
- Type icons (🎨 project, 📐 drawing, etc.)
- Direct links to relevant pages
- Shows timestamp ("2 hours ago", "3 days ago")

---

## Notification Flow Examples

### Example 1: Quote → Project Conversion

```
1. Tom converts approved quote to project
   ↓
2. System creates project + items + drawing requirements
   ↓
3. System sends notification to ALL designers:
   
   🎨 New Project - Shop Drawings Required
   Project C5-2026-012 (Villa Palm Jumeirah Kitchen) has been 
   approved and deposit paid. 5 shop drawings are ready for assignment.
   
   [View] → /design?project=abc-123
   ↓
4. Raham (design lead) sees notification
   ↓
5. Raham opens /design page
   ↓
6. Raham assigns drawings to designers
```

---

### Example 2: Drawing Assignment

```
1. Raham assigns "Kitchen - Ground Floor" to Robinson
   ↓
2. Robinson receives notification:
   
   📐 New Drawing Assignment
   You have been assigned DRW-2026-045: Kitchen - Ground Floor
   (Due: 20/02/2026)
   
   [View] → /design/xyz-789
   ↓
3. Robinson clicks notification
   ↓
4. Opens drawing detail page
   ↓
5. Robinson clicks "Start Working"
```

---

### Example 3: Drawing Ready for Review

```
1. Robinson completes drawing
   ↓
2. Robinson clicks "Ready for Review"
   ↓
3. Raham receives notification:
   
   👀 Drawing Ready for Review
   Robinson Dsouza has completed DRW-2026-045: Kitchen - Ground Floor
   and marked it ready for review.
   
   [View] → /design/xyz-789
   ↓
4. Raham reviews drawing
   ↓
5. Raham approves or requests changes
```

---

## Technical Implementation

### Sending Notifications

```typescript
import { notifyDesignTeamNewProject } from '@/lib/notifications'

// When project is created:
await notifyDesignTeamNewProject(
  supabase,
  project.id,
  project.project_code,
  projectName,
  drawingCount
)
```

**Available Functions:**

```typescript
// Notify all designers about new project
notifyDesignTeamNewProject(supabase, projectId, projectCode, projectName, drawingCount)

// Notify designer about assignment
notifyDesignerAssignment(supabase, designerId, drawingId, drawingNumber, drawingTitle, dueDate?)

// Notify design leads about drawing ready for review
notifyDesignLeadReview(supabase, drawingId, drawingNumber, drawingTitle, designerName)

// Generic notification
sendNotification(supabase, {
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  entityType?: string,
  entityId?: string,
  linkUrl?: string
})

// Bulk notifications
sendBulkNotifications(supabase, userIds[], payload)
```

---

### Real-Time Updates

The notification bell uses **Supabase Realtime** to subscribe to new notifications:

```typescript
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
  }, () => {
    loadNotifications()
  })
  .subscribe()
```

**Result:** New notifications appear **instantly** without refreshing the page!

---

## Setup Instructions

### 1. Run Database Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- File: supabase/migrations/004_add_notifications.sql
```

This creates:
- `notifications` table
- Row-level security policies
- `v_unread_notifications` view

---

### 2. Enable Realtime in Supabase

1. Go to **Supabase Dashboard → Database → Replication**
2. Find the `notifications` table
3. Enable **Realtime** (turn on the toggle)

---

### 3. Test the System

**Test Project Creation Notifications:**
1. Go to an approved quote
2. Convert to project
3. Check console: should see "✅ Notified X design team members"
4. Log in as a designer → see notification bell badge
5. Click bell → see notification
6. Click notification → navigate to design page

**Test Assignment Notifications:**
1. Go to `/design`
2. Click a pending drawing
3. Assign to a designer
4. Log in as that designer → see notification

**Test Review Notifications:**
1. Log in as designer
2. Open assigned drawing
3. Click "Ready for Review"
4. Log in as design lead → see notification

---

## Future Enhancements

### Phase 2 (Email Notifications)
- [ ] Add email delivery via Supabase Edge Functions
- [ ] Email templates for each notification type
- [ ] User preferences (email on/off per type)
- [ ] Daily digest option (batch notifications)

### Phase 3 (WhatsApp/SMS)
- [ ] WhatsApp Business API integration
- [ ] SMS for urgent notifications
- [ ] Multi-channel delivery preferences

### Phase 4 (Advanced Features)
- [ ] Notification preferences per user
- [ ] Snooze notifications
- [ ] Filter/search notifications
- [ ] Export notification history
- [ ] Notification analytics (delivery rates, read rates)

---

## Files Created/Modified

### New Files
- `supabase/migrations/004_add_notifications.sql`
- `src/lib/notifications/index.ts`
- `src/components/NotificationBell.tsx`
- `src/app/(dashboard)/notifications/page.tsx`

### Modified Files
- `src/app/(dashboard)/quotes/[id]/QuoteActions.tsx` (added project notification)
- `src/app/(dashboard)/design/[id]/DrawingActions.tsx` (added assignment + review notifications)
- `src/app/(dashboard)/layout.tsx` (added notification bell)

---

## Troubleshooting

### Notifications not appearing
- Check that migration was run successfully
- Verify RLS policies exist (`SELECT * FROM pg_policies WHERE tablename = 'notifications'`)
- Check browser console for errors
- Ensure user has `role` set to `designer` or `design_lead` in users table

### Real-time not working
- Check that Realtime is enabled for `notifications` table in Supabase
- Verify subscription is active (check console logs)
- Try refreshing the page

### Wrong users getting notified
- Check user roles in `users` table
- Verify `is_active = true` for users
- Check notification type logic in helper functions

---

## Summary

✅ **Auto-notification:** Design team alerted when project created  
✅ **In-app notifications:** Bell icon with badge + dropdown  
✅ **Real-time updates:** No refresh needed  
✅ **Full notification page:** View all notifications  
✅ **Smart routing:** Click notification → go to relevant page  
✅ **Read tracking:** Mark as read individually or all at once  
✅ **Extensible:** Ready for email/WhatsApp in future  

**Result:** Design team is instantly notified when a BOQ is approved and deposit paid, with a complete list of drawings ready for assignment! 🔔✨
