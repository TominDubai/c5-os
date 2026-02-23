-- Drawing Requirements Table
-- This tracks which shop drawings are needed for a project
-- One drawing requirement can cover multiple items (e.g., all items in a room)

CREATE TABLE drawing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Grouping info
  title TEXT NOT NULL, -- e.g., "Kitchen - Ground Floor"
  drawing_number TEXT, -- Auto-generated or manual
  
  -- Item grouping (what this drawing covers)
  type_code TEXT, -- K, W, V, T, J (optional - can be mixed)
  floor_code TEXT, -- GF, FF, etc.
  room_code TEXT, -- RM01, RM02, etc.
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Not yet assigned
    'assigned',          -- Assigned to designer
    'in_progress',       -- Designer working on it
    'ready_for_review',  -- Designer completed, needs internal review
    'approved_internal', -- Internal review passed
    'sent_to_client',    -- Sent for client approval (DocuSign)
    'approved',          -- Client approved via DocuSign
    'rejected'           -- Client rejected
  )),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id), -- Designer assigned
  assigned_at TIMESTAMPTZ,
  
  -- Dates
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- DocuSign
  docusign_envelope_id TEXT,
  docusign_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT, -- Client name/email from DocuSign
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_drawing_req_project ON drawing_requirements(project_id);
CREATE INDEX idx_drawing_req_status ON drawing_requirements(status);
CREATE INDEX idx_drawing_req_assigned ON drawing_requirements(assigned_to);

-- Link between drawing requirements and project items
CREATE TABLE drawing_requirement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_requirement_id UUID REFERENCES drawing_requirements(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES project_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(drawing_requirement_id, project_item_id)
);

-- Drawing files (versions of the actual drawing file)
-- Replaces the generic 'drawings' table for better tracking
CREATE TABLE drawing_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_requirement_id UUID REFERENCES drawing_requirements(id) ON DELETE CASCADE,
  
  version INTEGER DEFAULT 1,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  notes TEXT -- Revision notes
);

-- Auto-generate drawing number (DRW-2026-001)
CREATE SEQUENCE drawing_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_drawing_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.drawing_number IS NULL THEN
    NEW.drawing_number := 'DRW-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('drawing_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_drawing_number
  BEFORE INSERT ON drawing_requirements
  FOR EACH ROW
  EXECUTE FUNCTION generate_drawing_number();

-- View: Drawing requirements with item counts
CREATE VIEW v_drawing_requirements AS
SELECT 
  dr.*,
  COUNT(dri.project_item_id) as item_count,
  u.full_name as designer_name,
  p.project_code,
  p.name as project_name
FROM drawing_requirements dr
LEFT JOIN drawing_requirement_items dri ON dri.drawing_requirement_id = dr.id
LEFT JOIN users u ON u.id = dr.assigned_to
LEFT JOIN projects p ON p.id = dr.project_id
GROUP BY dr.id, u.full_name, p.project_code, p.name;

-- Enable RLS
ALTER TABLE drawing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_requirement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_files ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow authenticated users)
CREATE POLICY "Allow authenticated read" ON drawing_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON drawing_requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON drawing_requirements FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON drawing_requirement_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON drawing_requirement_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON drawing_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON drawing_files FOR INSERT TO authenticated WITH CHECK (true);
