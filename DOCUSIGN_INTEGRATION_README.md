# DocuSign Integration - Complete Implementation

## Overview

C5 OS now supports **two DocuSign workflows**:

1. **BOQ (Bill of Quantities) Approval** → Triggers deposit invoice generation
2. **Shop Drawing Approval** → Releases drawings to production

---

## Workflow 1: BOQ Approval (Deposit Trigger)

### Flow
```
Project Created (awaiting_deposit)
    ↓
Send BOQ via DocuSign
    ↓ Client Signs
Deposit Invoice Generated (30%)
    ↓ Deposit Paid
Items + Drawings Created
    ↓
Design Workflow Begins
```

### How It Works

1. **Create Project from Quote**
   - Click "Convert to Project" on approved quote
   - Project status: `awaiting_deposit`
   - No items or drawings generated yet

2. **Send BOQ to Client**
   - Go to project detail page
   - Click "Send BOQ for Approval"
   - Modal appears with client email/name pre-filled
   - DocuSign envelope created with BOQ PDF
   - Envelope ID tracked in `projects.boq_docusign_envelope_id`

3. **Client Signs BOQ**
   - Client receives DocuSign email
   - Reviews Bill of Quantities
   - Signs the document

4. **Webhook Processes Signature**
   - DocuSign POST to `/api/docusign/webhook`
   - Validates envelope matches `projects.boq_docusign_envelope_id`
   - Updates `projects.boq_docusign_status` to "completed"
   - **Automatically creates 30% deposit invoice**
   - Admin can then "Mark Deposit Paid" to trigger item/drawing generation

---

## Workflow 2: Drawing Approval (Design Workflow)

### Flow
```
Deposit Paid
    ↓
Items + Drawings Auto-Generated (status: queued)
    ↓
Designer Works (status: in_production)
    ↓
Submit for Client Approval
    ↓
Send Drawings via DocuSign
    ↓ Client Signs
Drawings Released to Production
    ↓
Production Team Builds
```

### How It Works

1. **Drawings Auto-Generated**
   - After deposit paid, shop drawing requirements created
   - Grouped by floor + room
   - Status: `queued`

2. **Designer Works**
   - Designer assigned
   - Status changes to `in_production`

3. **Submit for Approval**
   - Designer marks "Ready for Client Approval"
   - Creates PDF of all drawings
   - Can loop: send to client → get feedback → revise

4. **Send to Client via DocuSign**
   - Go to design page
   - Click "Send Drawings for Approval"
   - All project drawings included in single envelope
   - Envelope ID tracked in `drawing_requirements.docusign_envelope_id`

5. **Client Approves**
   - Client receives DocuSign email with drawing list
   - Reviews all drawings
   - Signs approval form

6. **Auto-Release to Production**
   - Webhook receives completion event
   - All drawings auto-update:
     - `status` → `sent_to_production`
     - `docusign_status` → `completed`
     - `approved_by_docusign_at` → timestamp
     - `approved_by_docusign_email` → client email
   - Production team can start manufacturing

---

## Database Schema

### New Columns Added

**projects** table:
```sql
boq_docusign_envelope_id TEXT        -- DocuSign envelope for BOQ
boq_docusign_status TEXT             -- Status: draft, sent, completed
boq_signed_at TIMESTAMPTZ            -- When client signed
boq_signed_by_email TEXT             -- Client email
```

**drawing_requirements** table:
```sql
docusign_envelope_id TEXT            -- DocuSign envelope for drawings
docusign_status TEXT                 -- Status: draft, sent, completed
approved_by_docusign_at TIMESTAMPTZ  -- When client approved
approved_by_docusign_email TEXT      -- Client email
```

### New Tables

**docusign_events** table (Audit Log)
```sql
CREATE TABLE docusign_events (
  id UUID PRIMARY KEY,
  envelope_id TEXT               -- DocuSign envelope ID
  document_type TEXT             -- 'boq', 'drawing', 'quote'
  document_id TEXT               -- project_id, drawing_id, etc
  event_type TEXT                -- 'sent', 'delivered', 'completed', 'declined'
  envelope_status TEXT           -- Current status
  signer_email TEXT              -- Who signed
  signer_name TEXT               -- Signer name
  payload JSONB                  -- Additional data
  created_at TIMESTAMPTZ         -- Event timestamp
);
```

---

## API Endpoints

### 1. Send BOQ for Approval

**POST `/api/docusign/send-boq`**

Request:
```json
{
  "projectId": "uuid",
  "signerEmail": "client@example.com",
  "signerName": "Client Name"
}
```

Response:
```json
{
  "success": true,
  "envelopeId": "string",
  "status": "sent",
  "message": "BOQ sent to client@example.com for approval"
}
```

---

### 2. Send Drawings for Approval

**POST `/api/docusign/send-drawings`**

Request:
```json
{
  "projectId": "uuid",
  "signerEmail": "client@example.com",
  "signerName": "Client Name"
}
```

Response:
```json
{
  "success": true,
  "envelopeId": "string",
  "status": "sent",
  "drawingCount": 5,
  "message": "5 drawing(s) sent to client@example.com for approval"
}
```

---

### 3. DocuSign Webhook

**POST `/api/docusign/webhook`**

Receives DocuSign Connect XML or JSON payload with envelope status updates.

Automatically:
- Updates BOQ/Drawing/Quote status in database
- Logs events to `docusign_events` table
- Triggers actions:
  - **BOQ completed** → Creates 30% deposit invoice
  - **Drawing completed** → Updates drawing status to `sent_to_production`
  - **Quote completed** → Converts quote to project

---

## PDF Generators

### BOQ PDF (`src/lib/pdf/generate-boq.ts`)

Generates professional Bill of Quantities document with:
- Project details
- Line item table (code, description, qty, unit, price)
- Subtotals and grand total
- Client signature line
- Invisible DocuSign anchor for auto-placement

### Drawing Approval PDF (`src/lib/pdf/generate-drawing-approval.ts`)

Generates drawing approval form with:
- Project details
- List of all drawings with:
  - Drawing number
  - Title
  - Type, Floor, Room location
  - Due date
  - Approval checkbox
- Client signature line
- Date field
- Invisible DocuSign anchor

---

## UI Components

### SendBOQModal

Location: `src/components/SendBOQModal.tsx`

Used in: Project detail page

Features:
- Pre-filled with client email/name from project
- Editable email/name fields
- Error handling
- Success confirmation
- Loading state with spinner

### SendDrawingsModal

Location: `src/components/SendDrawingsModal.tsx`

Used in: Design page

Features:
- Shows drawing count
- Pre-filled with client email/name
- Editable fields
- Confirmation with drawing count
- Error handling
- Loading state

---

## Event Logging

Every DocuSign event is logged to `docusign_events` table for audit trail:

```
BOQ sent → event_type: 'sent'
BOQ delivered → event_type: 'delivered'
BOQ completed → event_type: 'completed'
BOQ declined → event_type: 'declined'
Drawing sent → event_type: 'sent'
... etc
```

---

## Environment Configuration

Required environment variables (add to `.env.local`):

```env
# DocuSign OAuth
DOCUSIGN_OAUTH_BASE_PATH=account-d.docusign.com  # or account.docusign.com for production
DOCUSIGN_INTEGRATION_KEY=your_integration_key
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_ACCOUNT_ID=your_account_id

# Private key file location
# Place RSA private key at: config/docusign-private.key
```

---

## Setup Checklist

- [ ] Run migration: `supabase/migrations/010_docusign_tracking.sql`
- [ ] Set DocuSign environment variables
- [ ] Place private key file at `config/docusign-private.key`
- [ ] Configure DocuSign Connect webhook to POST to `/api/docusign/webhook`
- [ ] Test with development DocuSign account
- [ ] Create project from quote
- [ ] Click "Send BOQ for Approval"
- [ ] Sign digital envelope in DocuSign
- [ ] Verify deposit invoice created
- [ ] Verify drawings auto-created and released to production after approval

---

## Testing Workflow

### Test BOQ Approval → Deposit Trigger

1. Create quote with items
2. Approve quote
3. Click "Convert to Project"
4. Project page shows "awaiting_deposit"
5. Click "Send BOQ for Approval"
6. Modal opens with client details
7. Sign the email in DocuSign
8. Webhook processes signature
9. Check project:
   - `boq_signed_at` populated
   - `boq_signed_by_email` set
10. Check invoices: 30% deposit invoice created

### Test Drawing Approval → Production Release

1. Mark deposit paid
2. Go to Design page
3. Verify drawings created (status: queued)
4. Assign designer
5. Designer works on drawings
6. Submit for approval (status: in_production → waiting_client_approval)
7. Click "Send Drawings for Approval"
8. Modal shows drawing count
9. Sign the email in DocuSign
10. Webhook processes signature
11. Go back to Design page
12. Verify all drawings now show:
    - Status: `sent_to_production` ✅
    - Green checkmark indicating approved
    - Client email displayed

---

## Error Handling

All endpoints include:
- ✅ Request validation
- ✅ Error logging
- ✅ User-friendly error messages
- ✅ HTTP status codes (400, 404, 500)

Common errors:
- `Missing required fields` → Check request body
- `Project not found` → Verify project ID
- `No shop drawings found` → Need deposit paid first
- `BOQ already sent` → Check status before resending
- `DocuSign auth failed` → Verify credentials and private key

---

## Future Enhancements

- [ ] Email notifications when BOQ is sent
- [ ] Email notifications when drawings are approved
- [ ] Retry logic for failed DOC generation
- [ ] BOQ revision workflow (client requests changes)
- [ ] Drawing revision workflow (client requests changes)
- [ ] Template customization (logo, company details)
- [ ] Multi-recipient signing
- [ ] Mobile app integration with DocuSign

---

**Implementation Date:** March 5, 2026  
**Status:** Complete - Ready for integration and testing
