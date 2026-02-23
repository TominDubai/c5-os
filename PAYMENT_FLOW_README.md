# Payment & Drawing Generation Flow - Complete

## Overview
Implemented the correct workflow: Quote → Project → Deposit Payment → Items + Drawings Generated

## New Workflow

### 1. Quote Approved → Convert to Project
- Creates project with status: `awaiting_deposit`
- Creates 30% deposit invoice
- **Does NOT create items or drawings yet**

### 2. Deposit Payment Received
- Click "Mark Deposit Paid" button on project page
- Triggers:
  - Creates all project items from quote
  - Auto-generates shop drawing requirements
  - Notifies design team
  - Updates project status to `design_pending`
  - Marks invoice as paid

### 3. Design Workflow
- Designers receive notification
- Drawings go through: `queued → in_production → waiting_client_approval → approved → sent_to_production`

## Database Changes

### Migration 006: Invoices Table
```
invoices
├── invoice_number (auto: INV-2026-001)
├── invoice_type (deposit, progress, final, retention)
├── amount
├── percentage (e.g., 30%)
├── status (draft, sent, paid, overdue, cancelled)
├── payment_method
└── payment_reference
```

### Migration 007: Project Status Update
New status: `awaiting_deposit`

**New Project Fields:**
- `deposit_invoice_id` - Link to deposit invoice
- `deposit_paid` - Boolean flag
- `deposit_paid_at` - Timestamp
- `items_generated` - Boolean flag
- `items_generated_at` - Timestamp

## Updated Project Statuses

1. **💰 Awaiting Deposit** - Project created, waiting for payment
2. **⏳ Design Pending** - Deposit paid, items created, ready for design
3. **🎨 In Design** - Design work in progress
4. **✅ Design Approved** - Ready for production
5. **🏭 In Production** - Manufacturing
6. **🔧 Installation** - On-site work
7. **✅ Completed** - Done

## Files Modified

**Backend:**
- `supabase/migrations/006_add_invoices.sql` (new)
- `supabase/migrations/007_add_awaiting_deposit_status.sql` (new)
- `MIGRATION_006_007_CLEAN.sql` (combined for easy running)

**Frontend:**
- `src/app/(dashboard)/quotes/[id]/QuoteActions.tsx` - Removed item/drawing generation
- `src/app/(dashboard)/projects/[id]/ProjectActions.tsx` - Added deposit payment button
- `src/app/(dashboard)/projects/[id]/page.tsx` - Added awaiting_deposit status
- `src/lib/drawings/auto-generate.ts` - Fixed status from 'pending' to 'queued'

## How to Test

1. **Run Migration:**
   - Copy contents of `MIGRATION_006_007_CLEAN.sql`
   - Paste into Supabase SQL Editor
   - Run

2. **Test Flow:**
   - Approve a quote
   - Convert to project → Check status is "Awaiting Deposit"
   - Check `/design` → Should be empty (no drawings yet)
   - Go to project detail page
   - Click "Mark Deposit Paid"
   - Check `/design` → Drawings should now appear as "Queued"
   - Check project items → Should now exist
   - Check project status → Should be "Design Pending"

## Next Steps

**Phase 2: DocuSign Integration**
- Send BOQ to client via DocuSign for signature
- Webhook to receive signature confirmation
- Trigger deposit invoice generation on signature

---

**Files:**
- `MIGRATION_006_007_CLEAN.sql`
- This documentation: `PAYMENT_FLOW_README.md`
