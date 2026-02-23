# Shop Drawing Auto-Generation Feature

## Overview

When a quote is converted to a project, the system now **automatically creates shop drawing requirements** grouped by floor and room. These drawing tasks are immediately visible to the design team and can be assigned to designers.

---

## How It Works

### 1. Quote → Project Conversion

When you click **"Convert to Project"** on an approved quote:

1. **Project is created** with all quote items as `project_items`
2. **Items are analyzed** and grouped by `floor_code` + `room_code`
3. **Drawing requirements are auto-generated** for each unique floor/room combination
4. **Items are linked** to their corresponding drawing requirement

**Example:**

If a quote has these items:
- `2601-K-GF-RM01-101` (Kitchen, Ground Floor, Room 1)
- `2601-K-GF-RM01-102` (Kitchen, Ground Floor, Room 1)
- `2601-W-FF-RM02-101` (Wardrobe, First Floor, Room 2)

The system creates **2 drawing requirements**:
1. **"Kitchen - Ground Floor - RM01"** (covers items 101, 102)
2. **"Wardrobes - First Floor - RM02"** (covers item 101)

---

## Database Schema

### New Tables

#### `drawing_requirements`
Tracks each shop drawing that needs to be created.

**Key Fields:**
- `drawing_number` — Auto-generated (e.g., `DRW-2026-001`)
- `title` — Descriptive name (e.g., "Kitchen - Ground Floor - RM01")
- `type_code`, `floor_code`, `room_code` — Grouping criteria
- `status` — Workflow state (see below)
- `assigned_to` — Designer assigned to create this drawing
- `due_date` — Target completion date

**Status Flow:**
```
pending → assigned → in_progress → ready_for_review → approved_internal → sent_to_client → approved
                                                 ↓
                                           (can loop back if rejected)
```

#### `drawing_requirement_items`
Links project items to their drawing requirement.

#### `drawing_files`
Stores uploaded drawing files with version tracking.

---

## User Interface

### Design Management Page (`/design`)

**Features:**
- Dashboard showing drawing counts by status
- Table of all drawing requirements across all projects
- Filter by status, project, designer
- Quick access to assign/review drawings

### Drawing Detail Page (`/design/[id]`)

**Features:**
- List of all items covered by this drawing
- Designer assignment with due date
- Status workflow actions
- File upload (versioned)
- Client information
- DocuSign integration placeholder

---

## Workflow

### For Design Lead (Raham)

1. Go to **Design** page
2. See all **pending** drawing requirements
3. Click a drawing to view details
4. Click **"Assign Designer"**
5. Select designer + set due date
6. Designer receives assignment

### For Designer

1. Go to **Design** page
2. See all drawings **assigned to me**
3. Click drawing to view item details
4. Click **"Start Working"** (status → `in_progress`)
5. Upload drawing file when ready
6. Click **"Ready for Review"**

### For Reviewer (Raham/Tom)

1. See drawings in **"Ready for Review"** status
2. Review uploaded drawing
3. Either:
   - **"Approve (Internal)"** → ready to send to client
   - **"Request Changes"** → back to designer

### For Client Approval (Tom/Admin)

1. Drawings in **"Approved (Internal)"** status
2. Click **"Send to Client (DocuSign)"**
3. *(Future: automated DocuSign integration)*
4. Once client signs, mark as **"Approved"**
5. Items can now move to production

---

## Integration Points

### Quote Conversion
File: `src/app/(dashboard)/quotes/[id]/QuoteActions.tsx`

When converting:
```typescript
import { createDrawingRequirementsForProject } from '@/lib/drawings/auto-generate'

// After creating project and items:
await createDrawingRequirementsForProject(supabase, project.id, createdItems)
```

### Grouping Logic
File: `src/lib/drawings/auto-generate.ts`

```typescript
function groupItemsForDrawings(items: QuoteItem[]): DrawingRequirementGroup[]
```

Groups items by:
1. **Primary:** `floor_code` + `room_code`
2. **Fallback:** If no room, groups by `floor_code` + `type_code`

---

## Setup Instructions

### 1. Run Database Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- File: supabase/migrations/003_add_drawing_requirements.sql
```

This creates:
- `drawing_requirements` table
- `drawing_requirement_items` table
- `drawing_files` table
- Auto-numbering sequence
- Views and policies

### 2. Test the Feature

1. Go to **Quotes** → Open an approved quote
2. Click **"Convert to Project"**
3. Enter project name and address
4. Click **"Create Project"**
5. Check console log: should show "Created X drawing requirements"
6. Go to **Design** page → see auto-generated drawings
7. Click a drawing → view items covered
8. Assign to a designer → test workflow

---

## Future Enhancements

### Phase 2 (Planned)
- [ ] **DocuSign integration** for automated client approval
- [ ] **File upload widget** with drag-and-drop
- [ ] **Notifications** when drawings are assigned/approved
- [ ] **Email alerts** to designers for new assignments
- [ ] **Designer dashboard** showing my tasks only
- [ ] **Progress tracking** % of drawings completed per project

### Phase 3 (Nice to Have)
- [ ] **Drawing templates** for common room types
- [ ] **Auto-generate 2D/3D previews** from uploaded files
- [ ] **Client portal** to view and approve drawings online
- [ ] **Revision comparison** (side-by-side versions)
- [ ] **Comments/markup** on drawings
- [ ] **Integration with CAD software** (e.g., AutoCAD, Revit)

---

## Files Created/Modified

### New Files
- `supabase/migrations/003_add_drawing_requirements.sql`
- `src/lib/drawings/auto-generate.ts`
- `src/app/(dashboard)/design/page.tsx`
- `src/app/(dashboard)/design/[id]/page.tsx`
- `src/app/(dashboard)/design/[id]/DrawingActions.tsx`

### Modified Files
- `src/app/(dashboard)/quotes/[id]/QuoteActions.tsx` (added auto-generation call)
- `src/app/(dashboard)/layout.tsx` (added Design nav link)

---

## Troubleshooting

### Drawings not appearing after quote conversion
- Check browser console for errors
- Verify migration was run successfully
- Check that quote items have `type_code`, `floor_code`, `room_code` populated

### Can't assign designer
- Ensure users table has designers with role `designer` or `design_lead`
- Check that users are marked `is_active = true`

### File uploads not working
- Storage bucket configuration (future feature)
- For now, file upload UI is a placeholder

---

## Summary

✅ **Auto-generation:** Drawings created automatically from BOQ items  
✅ **Smart grouping:** By floor + room for logical packages  
✅ **Full workflow:** Pending → Assigned → In Progress → Review → Approval  
✅ **Designer assignment:** With due dates  
✅ **Item tracking:** Every drawing links back to specific items  
✅ **Ready for DocuSign:** Status flow supports client approval  

**Result:** Design team can immediately see what drawings are needed when a project starts, assign them to designers, and track progress through to client approval! 🎨✨
