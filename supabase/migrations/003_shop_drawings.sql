-- Shop Drawings Module
-- Run this in Supabase SQL Editor

-- Shop Drawings table
CREATE TABLE IF NOT EXISTS shop_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  item_id UUID REFERENCES project_items(id) ON DELETE CASCADE,
  
  drawing_code TEXT NOT NULL,
  description TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'sent_for_approval', 'approved', 'revision_required'
  )),
  
  assigned_to UUID REFERENCES users(id),
  
  file_url TEXT,
  file_name TEXT,
  revision INTEGER DEFAULT 1,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_for_approval_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  
  client_notes TEXT,
  designer_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_drawings_project ON shop_drawings(project_id);
CREATE INDEX idx_drawings_status ON shop_drawings(status);
CREATE INDEX idx_drawings_assigned ON shop_drawings(assigned_to);

-- Drawing approval packages (for DocuSign)
CREATE TABLE IF NOT EXISTS drawing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  package_number TEXT UNIQUE NOT NULL,
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'signed', 'declined'
  )),
  
  docusign_envelope_id TEXT,
  docusign_url TEXT,
  
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  
  sent_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link drawings to packages
CREATE TABLE IF NOT EXISTS drawing_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES drawing_packages(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES shop_drawings(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(package_id, drawing_id)
);

-- Auto-generate package number
CREATE OR REPLACE FUNCTION generate_package_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(package_number FROM 'PKG-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM drawing_packages
  WHERE package_number LIKE 'PKG-' || year_str || '-%';
  
  NEW.package_number := 'PKG-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_package_number ON drawing_packages;
CREATE TRIGGER set_package_number
  BEFORE INSERT ON drawing_packages
  FOR EACH ROW
  WHEN (NEW.package_number IS NULL)
  EXECUTE FUNCTION generate_package_number();

-- Function to generate drawings from project items
CREATE OR REPLACE FUNCTION generate_shop_drawings(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  item RECORD;
  drawing_count INTEGER := 0;
BEGIN
  FOR item IN 
    SELECT id, item_code, description 
    FROM project_items 
    WHERE project_id = p_project_id
    AND id NOT IN (SELECT item_id FROM shop_drawings WHERE item_id IS NOT NULL)
  LOOP
    INSERT INTO shop_drawings (project_id, item_id, drawing_code, description)
    VALUES (
      p_project_id,
      item.id,
      'DWG-' || item.item_code,
      item.description
    );
    drawing_count := drawing_count + 1;
  END LOOP;
  
  RETURN drawing_count;
END;
$$ LANGUAGE plpgsql;
