-- C5 OS Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- REFERENCE TABLES (create first, no dependencies)
-- ============================================

-- Item Type Codes
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

-- Floor Codes
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

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'site_staff' CHECK (role IN (
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

-- ============================================
-- CLIENTS
-- ============================================

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

-- ============================================
-- ENQUIRIES
-- ============================================

CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  
  project_type TEXT CHECK (project_type IN (
    'kitchen', 'wardrobes', 'vanity', 'tv_unit', 'full_fitout', 'other'
  )),
  description TEXT,
  location TEXT,
  source TEXT,
  
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'reviewing', 'quoted', 'won', 'lost'
  )),
  
  assigned_to UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enquiries_status ON enquiries(status);

-- Enquiry Attachments
CREATE TABLE enquiry_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- QUOTES
-- ============================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  enquiry_id UUID REFERENCES enquiries(id),
  client_id UUID REFERENCES clients(id),
  
  title TEXT NOT NULL,
  description TEXT,
  site_address TEXT,
  revision INTEGER DEFAULT 0,
  
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

CREATE INDEX idx_quotes_status ON quotes(status);

-- Quote Items
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  size TEXT,
  
  job_code TEXT,
  type_code TEXT,
  floor_code TEXT,
  room_code TEXT,
  sequence INTEGER,
  
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'NO.',
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_quote_item_code ON quote_items(quote_id, item_code);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE NOT NULL,
  quote_id UUID REFERENCES quotes(id),
  client_id UUID REFERENCES clients(id),
  
  name TEXT NOT NULL,
  description TEXT,
  site_address TEXT,
  emirates TEXT,
  
  project_type TEXT CHECK (project_type IN (
    'kitchen', 'wardrobes', 'vanity', 'tv_unit', 'full_fitout', 'other'
  )),
  
  pm_id UUID REFERENCES users(id),
  designer_id UUID REFERENCES users(id),
  
  contract_value DECIMAL(12,2),
  invoiced_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  
  status TEXT DEFAULT 'design_pending' CHECK (status IN (
    'design_pending', 'in_design', 'design_approved',
    'in_production', 'in_installation', 'completed', 'on_hold', 'cancelled'
  )),
  
  start_date DATE,
  target_completion DATE,
  actual_completion DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_pm ON projects(pm_id);

-- ============================================
-- DISPATCHES (create before project_items due to FK)
-- ============================================

CREATE TABLE dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number TEXT UNIQUE NOT NULL,
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
  delivery_photo TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dispatches_status ON dispatches(status);

-- ============================================
-- PROJECT ITEMS
-- ============================================

CREATE TABLE project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  quote_item_id UUID REFERENCES quote_items(id),
  
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  
  type_code TEXT,
  floor_code TEXT,
  room_code TEXT,
  sequence INTEGER,
  
  quantity INTEGER DEFAULT 1,
  
  status TEXT DEFAULT 'pre_production' CHECK (status IN (
    'pre_production', 'in_production', 'ready_for_qc', 'qc_failed',
    'ready_for_dispatch', 'dispatched', 'on_site', 'installed', 'qs_verified'
  )),
  
  scheduled_production_date DATE,
  production_started_at TIMESTAMPTZ,
  production_completed_at TIMESTAMPTZ,
  
  workshop_qc_by UUID REFERENCES users(id),
  workshop_qc_at TIMESTAMPTZ,
  workshop_qc_passed BOOLEAN,
  workshop_qc_notes TEXT,
  
  dispatch_id UUID REFERENCES dispatches(id),
  dispatched_at TIMESTAMPTZ,
  
  received_on_site_at TIMESTAMPTZ,
  installed_at TIMESTAMPTZ,
  installed_by UUID REFERENCES users(id),
  
  site_qc_by UUID REFERENCES users(id),
  site_qc_at TIMESTAMPTZ,
  site_qc_passed BOOLEAN,
  site_qc_notes TEXT,
  site_qc_photo TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_items_status ON project_items(status);
CREATE INDEX idx_project_items_project ON project_items(project_id);
CREATE UNIQUE INDEX idx_project_item_code ON project_items(project_id, item_code);

-- ============================================
-- DISPATCH ITEMS
-- ============================================

CREATE TABLE dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES dispatches(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES project_items(id),
  
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  
  delivered BOOLEAN DEFAULT false,
  delivery_issue TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DRAWINGS
-- ============================================

CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  drawing_number TEXT,
  revision INTEGER DEFAULT 1,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'ready_for_approval', 
    'sent_for_approval', 'approved', 'rejected'
  )),
  
  docusign_envelope_id TEXT,
  docusign_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  
  uploaded_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRODUCTION SCHEDULE
-- ============================================

CREATE TABLE production_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  project_item_id UUID REFERENCES project_items(id),
  
  scheduled_week DATE NOT NULL,
  priority INTEGER DEFAULT 5,
  
  assigned_team TEXT,
  notes TEXT,
  
  scheduled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_production_week ON production_schedule(scheduled_week);

-- ============================================
-- SNAGS
-- ============================================

CREATE TABLE snags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  project_item_id UUID REFERENCES project_items(id),
  
  snag_number TEXT,
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

CREATE INDEX idx_snags_status ON snags(status);

-- ============================================
-- DAILY REPORTS
-- ============================================

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

-- Daily Report Photos
CREATE TABLE daily_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  action TEXT NOT NULL,
  description TEXT,
  
  old_value JSONB,
  new_value JSONB,
  
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_time ON activity_log(created_at DESC);

-- ============================================
-- DOCUMENTS
-- ============================================

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

-- ============================================
-- VIEWS
-- ============================================

-- Items by Status
CREATE VIEW v_items_by_status AS
SELECT 
  pi.status,
  COUNT(*) as count,
  p.project_code,
  p.name as project_name
FROM project_items pi
JOIN projects p ON p.id = pi.project_id
GROUP BY pi.status, p.project_code, p.name;

-- Production Queue
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

-- QC Queue
CREATE VIEW v_qc_queue AS
SELECT 
  pi.*,
  p.project_code,
  p.name as project_name
FROM project_items pi
JOIN projects p ON p.id = pi.project_id
WHERE pi.status = 'ready_for_qc'
ORDER BY pi.production_completed_at;

-- ============================================
-- ROW LEVEL SECURITY (Basic Setup)
-- ============================================

-- Enable RLS on main tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data (basic policy)
-- TODO: Add more restrictive policies based on roles
CREATE POLICY "Allow authenticated read" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON enquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON project_items FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update (basic policy)
CREATE POLICY "Allow authenticated insert" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON enquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON enquiries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON projects FOR UPDATE TO authenticated USING (true);

-- ============================================
-- SEQUENCES FOR AUTO-NUMBERING
-- ============================================

CREATE SEQUENCE enquiry_number_seq START 1;
CREATE SEQUENCE quote_number_seq START 1;
CREATE SEQUENCE project_number_seq START 1;
CREATE SEQUENCE dispatch_number_seq START 1;

-- ============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- ============================================

-- Generate enquiry number (ENQ-2026-001)
CREATE OR REPLACE FUNCTION generate_enquiry_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.enquiry_number := 'ENQ-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('enquiry_number_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_enquiry_number
  BEFORE INSERT ON enquiries
  FOR EACH ROW
  WHEN (NEW.enquiry_number IS NULL)
  EXECUTE FUNCTION generate_enquiry_number();

-- Generate quote number (QT-2026-001)
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quote_number := 'QT-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('quote_number_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL)
  EXECUTE FUNCTION generate_quote_number();

-- Generate project code (C5-2026-001)
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.project_code := 'C5-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('project_number_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_code
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.project_code IS NULL)
  EXECUTE FUNCTION generate_project_code();

-- Generate dispatch number (DSP-2026-001)
CREATE OR REPLACE FUNCTION generate_dispatch_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dispatch_number := 'DSP-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('dispatch_number_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dispatch_number
  BEFORE INSERT ON dispatches
  FOR EACH ROW
  WHEN (NEW.dispatch_number IS NULL)
  EXECUTE FUNCTION generate_dispatch_number();

-- ============================================
-- DONE!
-- ============================================
