# C5 OS — Database Schema

Supabase/PostgreSQL tables for C5 OS.

---

## Entity Relationship Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   clients   │────<│  enquiries  │────<│   quotes    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                    (on payment)
                                              │
                                              ▼
                                        ┌───────────┐
                                        │  projects │
                                        └───────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
       ┌───────────┐                   ┌───────────┐                   ┌───────────┐
       │ drawings  │                   │   items   │                   │  reports  │
       └───────────┘                   └───────────┘                   └───────────┘
              │                               │
              ▼                               │
       ┌───────────┐          ┌───────────────┼───────────────┐
       │ approvals │          │               │               │
       │ (docusign)│          ▼               ▼               ▼
       └───────────┘   ┌───────────┐   ┌───────────┐   ┌───────────┐
                       │    qc     │   │ dispatches│   │   snags   │
                       │  (w/shop) │   │           │   │           │
                       └───────────┘   └───────────┘   └───────────┘
```

---

## Core Tables

### users
Authentication and user profiles (Supabase Auth).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'admin', 'operations', 'estimator', 'design_lead', 'designer',
    'production_manager', 'qs', 'stores', 'pm', 'site_staff', 'driver'
  )),
  department TEXT CHECK (department IN (
    'leadership', 'design', 'production', 'projects', 'admin'
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### clients
Client/customer records.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  emirates TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### enquiries
Initial client enquiries before quoting.

```sql
CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number TEXT UNIQUE NOT NULL, -- Auto: ENQ-2026-001
  client_id UUID REFERENCES clients(id),
  
  -- New client (if not in system yet)
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  
  project_type TEXT CHECK (project_type IN (
    'kitchen', 'wardrobes', 'vanity', 'tv_unit', 'full_fitout', 'other'
  )),
  description TEXT,
  location TEXT,
  source TEXT, -- referral, website, etc.
  
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'reviewing', 'quoted', 'won', 'lost'
  )),
  
  assigned_to UUID REFERENCES users(id), -- Estimator
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### enquiry_attachments
Renderings and concept images for enquiries.

```sql
CREATE TABLE enquiry_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase storage path
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### quotes
Quotes created from enquiries.

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL, -- Auto: QT-2026-001
  enquiry_id UUID REFERENCES enquiries(id),
  client_id UUID REFERENCES clients(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  subtotal DECIMAL(12,2) DEFAULT 0,
  vat_rate DECIMAL(4,2) DEFAULT 5.00,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'approved', 'rejected', 'expired', 'converted'
  )),
  
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### quote_items
Line items on quotes with item codes.

```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  
  item_code TEXT NOT NULL, -- e.g., 26XX-K-GF-RM01-001
  description TEXT NOT NULL,
  
  -- Code breakdown (parsed from item_code)
  job_code TEXT,      -- 26XX
  type_code TEXT,     -- K, W, V, T, J
  floor_code TEXT,    -- GF, BF, FF
  room_code TEXT,     -- RM01, RM02
  sequence INTEGER,   -- 001, 002
  
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'unit',
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique item code per quote
CREATE UNIQUE INDEX idx_quote_item_code ON quote_items(quote_id, item_code);
```

---

### projects
Main project records (created from approved quotes).

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE NOT NULL, -- e.g., C5-2026-001
  quote_id UUID REFERENCES quotes(id),
  client_id UUID REFERENCES clients(id),
  
  name TEXT NOT NULL,
  description TEXT,
  site_address TEXT,
  emirates TEXT,
  
  project_type TEXT CHECK (project_type IN (
    'kitchen', 'wardrobes', 'vanity', 'tv_unit', 'full_fitout', 'other'
  )),
  
  -- Assignments
  pm_id UUID REFERENCES users(id),         -- Project Manager
  designer_id UUID REFERENCES users(id),   -- Lead Designer
  
  -- Financials
  contract_value DECIMAL(12,2),
  invoiced_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'design_pending' CHECK (status IN (
    'design_pending', 'in_design', 'design_approved',
    'in_production', 'in_installation', 'completed', 'on_hold', 'cancelled'
  )),
  
  -- Dates
  start_date DATE,
  target_completion DATE,
  actual_completion DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### project_items
Items within a project (copied from quote, tracked through lifecycle).

```sql
CREATE TABLE project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  quote_item_id UUID REFERENCES quote_items(id),
  
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Code breakdown
  type_code TEXT,     -- K, W, V, T, J
  floor_code TEXT,    -- GF, BF, FF
  room_code TEXT,     -- RM01, RM02
  sequence INTEGER,
  
  quantity INTEGER DEFAULT 1,
  
  -- Lifecycle status
  status TEXT DEFAULT 'pre_production' CHECK (status IN (
    'pre_production',      -- Waiting for drawings approval
    'in_production',       -- Being made in workshop
    'ready_for_qc',        -- Workshop complete, waiting QC
    'qc_failed',           -- Failed workshop QC
    'ready_for_dispatch',  -- Passed QC, waiting to ship
    'dispatched',          -- In transit
    'on_site',             -- Delivered to site
    'installed',           -- Fitted by site team
    'qs_verified'          -- Final QC passed with photo
  )),
  
  -- Production tracking
  scheduled_production_date DATE,
  production_started_at TIMESTAMPTZ,
  production_completed_at TIMESTAMPTZ,
  
  -- Workshop QC
  workshop_qc_by UUID REFERENCES users(id),
  workshop_qc_at TIMESTAMPTZ,
  workshop_qc_passed BOOLEAN,
  workshop_qc_notes TEXT,
  
  -- Dispatch
  dispatch_id UUID, -- FK added after dispatches table
  dispatched_at TIMESTAMPTZ,
  
  -- Site
  received_on_site_at TIMESTAMPTZ,
  installed_at TIMESTAMPTZ,
  installed_by UUID REFERENCES users(id),
  
  -- Site QC
  site_qc_by UUID REFERENCES users(id),
  site_qc_at TIMESTAMPTZ,
  site_qc_passed BOOLEAN,
  site_qc_notes TEXT,
  site_qc_photo TEXT, -- Storage path (mandatory for site QC)
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_items_status ON project_items(status);
CREATE INDEX idx_project_items_project ON project_items(project_id);
CREATE UNIQUE INDEX idx_project_item_code ON project_items(project_id, item_code);
```

---

### drawings
Shop drawings uploaded for projects.

```sql
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL, -- e.g., "Kitchen - Ground Floor"
  drawing_number TEXT,
  revision INTEGER DEFAULT 1,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  -- Approval status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'ready_for_approval', 
    'sent_for_approval', 'approved', 'rejected'
  )),
  
  -- DocuSign tracking
  docusign_envelope_id TEXT,
  docusign_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT, -- Client name/email from DocuSign
  
  uploaded_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### production_schedule
Gajanand's production schedule (items scheduled to weeks).

```sql
CREATE TABLE production_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  project_item_id UUID REFERENCES project_items(id),
  
  scheduled_week DATE NOT NULL, -- Monday of the target week
  priority INTEGER DEFAULT 5,   -- 1 = highest
  
  assigned_team TEXT,
  notes TEXT,
  
  scheduled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_production_week ON production_schedule(scheduled_week);
```

---

### dispatches
Dispatch notes for sending items to site.

```sql
CREATE TABLE dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number TEXT UNIQUE NOT NULL, -- Auto: DSP-2026-001
  project_id UUID REFERENCES projects(id),
  
  driver_id UUID REFERENCES users(id),
  vehicle_number TEXT,
  
  site_contact_name TEXT,
  site_contact_phone TEXT,
  
  scheduled_date DATE,
  scheduled_time TIME,
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'loaded', 'in_transit', 'delivered', 'partial_delivery'
  )),
  
  loaded_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  delivery_notes TEXT,
  delivery_photo TEXT, -- Proof of delivery
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK to project_items
ALTER TABLE project_items 
  ADD CONSTRAINT fk_dispatch 
  FOREIGN KEY (dispatch_id) REFERENCES dispatches(id);
```

---

### dispatch_items
Items included in a dispatch.

```sql
CREATE TABLE dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES dispatches(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES project_items(id),
  
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  
  -- Delivery confirmation
  delivered BOOLEAN DEFAULT false,
  delivery_issue TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### snags
Defects/issues found during site QC.

```sql
CREATE TABLE snags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  project_item_id UUID REFERENCES project_items(id),
  
  snag_number TEXT, -- Auto: SNG-001 (per project)
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('minor', 'major', 'critical')),
  location TEXT,
  
  photo_path TEXT,
  
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'fixed', 'verified', 'wont_fix'
  )),
  
  reported_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  
  fixed_at TIMESTAMPTZ,
  fixed_by UUID REFERENCES users(id),
  fix_notes TEXT,
  fix_photo TEXT,
  
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### daily_reports
Site daily reports (same concept as Bolsover).

```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  
  report_date DATE NOT NULL,
  weather TEXT CHECK (weather IN (
    'sunny', 'cloudy', 'rainy', 'hot', 'windy'
  )),
  
  work_completed TEXT,
  issues TEXT,
  attendance_count INTEGER,
  
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_daily_report_unique 
  ON daily_reports(project_id, report_date, submitted_by);
```

---

### daily_report_photos

```sql
CREATE TABLE daily_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### activity_log
Audit trail for all major actions.

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type TEXT NOT NULL, -- project, item, quote, etc.
  entity_id UUID NOT NULL,
  
  action TEXT NOT NULL, -- created, updated, status_changed, etc.
  description TEXT,
  
  old_value JSONB,
  new_value JSONB,
  
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_time ON activity_log(created_at DESC);
```

---

### documents
General document storage for projects.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  
  category TEXT CHECK (category IN (
    'contract', 'lpo', 'invoice', 'receipt', 'permit', 'other'
  )),
  
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Type Code Reference Table

```sql
CREATE TABLE item_type_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

INSERT INTO item_type_codes (code, name) VALUES
  ('K', 'Kitchen'),
  ('W', 'Wardrobes'),
  ('V', 'Vanity'),
  ('T', 'TV Unit'),
  ('J', 'Joinery (Other)');
```

---

## Floor Code Reference Table

```sql
CREATE TABLE floor_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER
);

INSERT INTO floor_codes (code, name, sort_order) VALUES
  ('BF', 'Basement Floor', 1),
  ('GF', 'Ground Floor', 2),
  ('FF', 'First Floor', 3),
  ('SF', 'Second Floor', 4),
  ('TF', 'Third Floor', 5),
  ('RF', 'Roof Floor', 6);
```

---

## Views

### v_items_by_status
Quick view of items grouped by status.

```sql
CREATE VIEW v_items_by_status AS
SELECT 
  pi.status,
  COUNT(*) as count,
  p.project_code,
  p.name as project_name
FROM project_items pi
JOIN projects p ON p.id = pi.project_id
GROUP BY pi.status, p.project_code, p.name;
```

### v_production_queue
Items waiting to be produced.

```sql
CREATE VIEW v_production_queue AS
SELECT 
  pi.*,
  p.project_code,
  p.name as project_name,
  p.pm_id,
  u.full_name as pm_name
FROM project_items pi
JOIN projects p ON p.id = pi.project_id
LEFT JOIN users u ON u.id = p.pm_id
WHERE pi.status = 'pre_production'
ORDER BY p.start_date, pi.item_code;
```

### v_qc_queue
Items waiting for workshop QC.

```sql
CREATE VIEW v_qc_queue AS
SELECT 
  pi.*,
  p.project_code,
  p.name as project_name
FROM project_items pi
JOIN projects p ON p.id = pi.project_id
WHERE pi.status = 'ready_for_qc'
ORDER BY pi.production_completed_at;
```

---

## Row Level Security (RLS)

Enable RLS on all tables and create policies based on user roles. Example:

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Admins see all
CREATE POLICY admin_all ON projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- PMs see assigned projects
CREATE POLICY pm_assigned ON projects
  FOR SELECT TO authenticated
  USING (
    pm_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operations'))
  );
```

---

## Indexes Summary

```sql
-- Performance indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_pm ON projects(pm_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_dispatches_status ON dispatches(status);
CREATE INDEX idx_snags_status ON snags(status);
```

---

*Document created: 2026-02-11*
