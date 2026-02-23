# Phase 1: Drawing Workflow States - COMPLETE

## Overview
Simplified drawing workflow to match the real-world design-to-production process.

## New Drawing States

### Workflow
```
queued → in_production → waiting_client_approval → approved → sent_to_production
```

**Additional States:**
- `on_hold` - Paused temporarily
- `cancelled` - Cancelled

### State Descriptions

1. **Queued** (📋)
   - Drawing created, waiting for designer assignment
   - Action: Assign Designer

2. **In Production** (🎨)
   - Designer actively working on it
   - Actions: Submit for Client Approval, Reassign, Put On Hold

3. **Waiting Client Approval** (⏳)
   - Submitted to client via DocuSign
   - Actions: Mark as Approved, Client Requested Changes

4. **Approved** (✅)
   - Client approved via DocuSign
   - Action: Release to Production

5. **Sent to Production** (🏭)
   - Released to production team
   - Final state

## Database Changes

### Migration: `005_update_drawing_states.sql`

**New Fields:**
- `released_to_production_at` - Timestamp when released
- `released_by` - User who released it
- `reviewed_by` - Internal reviewer (QS/Lead)
- `reviewed_at` - Review timestamp
- `review_notes` - Internal review comments

**Auto-Tracking:**
- `started_at` - Set when status → in_production
- `completed_at` - Set when status → waiting_client_approval
- `approved_at` - Set when status → approved
- `released_to_production_at` - Set when status → sent_to_production

**Updated View:**
- `v_drawing_requirements` now includes reviewer and releaser names

## UI Updates

### DrawingActions Component
- Simplified button flow matching new states
- Auto-assigns `reviewed_by` when submitting to client
- Auto-assigns `released_by` when releasing to production
- Designer assignment now immediately sets status to `in_production`

### Design List Page
- Updated status colors and labels
- Added emoji icons for visual clarity
- Stats dashboard reflects new workflow stages

## How to Test

1. **Run Migration:**
   ```sql
   -- In Supabase SQL Editor
   -- Paste contents of migrations/005_update_drawing_states.sql
   ```

2. **Convert a Quote:**
   - Go to approved quote
   - Click "Convert to Project"
   - Drawings auto-generated in "queued" state

3. **Test Workflow:**
   - Assign designer → status becomes "in_production"
   - Submit for approval → status becomes "waiting_client_approval"
   - Mark approved → status becomes "approved"
   - Release to production → status becomes "sent_to_production"

## Next Phase

**Phase 2: DocuSign Integration**
- Send BOQ to client for signature
- Webhook to receive signature confirmation
- Auto-trigger deposit invoice on signature

---

**Files Modified:**
- `supabase/migrations/005_update_drawing_states.sql` (new)
- `src/app/(dashboard)/design/[id]/DrawingActions.tsx`
- `src/app/(dashboard)/design/page.tsx`
