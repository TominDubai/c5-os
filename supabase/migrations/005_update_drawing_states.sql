-- Migration: Update Drawing Requirement States
-- Simplifies the drawing workflow to match real-world process

-- Drop the existing constraint
ALTER TABLE drawing_requirements DROP CONSTRAINT IF EXISTS drawing_requirements_status_check;

-- Add new simplified states
ALTER TABLE drawing_requirements ADD CONSTRAINT drawing_requirements_status_check 
  CHECK (status IN (
    'queued',                    -- Drawing created, waiting to be started
    'in_production',             -- Designer actively working on it
    'waiting_client_approval',   -- Submitted to client via DocuSign
    'approved',                  -- Client approved via DocuSign
    'sent_to_production',        -- Released to production team
    'on_hold',                   -- Paused (optional state)
    'cancelled'                  -- Cancelled (optional state)
  ));

-- Update default status
ALTER TABLE drawing_requirements ALTER COLUMN status SET DEFAULT 'queued';

-- Migrate existing data to new states
UPDATE drawing_requirements SET status = 'queued' WHERE status IN ('pending', 'assigned');
UPDATE drawing_requirements SET status = 'in_production' WHERE status IN ('in_progress', 'ready_for_review', 'approved_internal');
UPDATE drawing_requirements SET status = 'waiting_client_approval' WHERE status = 'sent_to_client';
UPDATE drawing_requirements SET status = 'approved' WHERE status = 'approved';
UPDATE drawing_requirements SET status = 'cancelled' WHERE status = 'rejected';

-- Add production release tracking
ALTER TABLE drawing_requirements ADD COLUMN IF NOT EXISTS released_to_production_at TIMESTAMPTZ;
ALTER TABLE drawing_requirements ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES users(id);

-- Add internal review tracking (before sending to client)
ALTER TABLE drawing_requirements ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE drawing_requirements ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE drawing_requirements ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_drawing_requirement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-set timestamps based on status changes
  IF NEW.status = 'in_production' AND OLD.status = 'queued' THEN
    NEW.started_at = now();
  END IF;
  
  IF NEW.status = 'waiting_client_approval' AND OLD.status != 'waiting_client_approval' THEN
    NEW.completed_at = now();
  END IF;
  
  IF NEW.status = 'approved' AND OLD.status = 'waiting_client_approval' THEN
    NEW.approved_at = now();
  END IF;
  
  IF NEW.status = 'sent_to_production' AND OLD.status != 'sent_to_production' THEN
    NEW.released_to_production_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_drawing_requirement_timestamp ON drawing_requirements;

CREATE TRIGGER update_drawing_requirement_timestamp
  BEFORE UPDATE ON drawing_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_drawing_requirement_timestamp();

-- Update the view to include new fields
DROP VIEW IF EXISTS v_drawing_requirements;

CREATE VIEW v_drawing_requirements AS
SELECT 
  dr.*,
  COUNT(dri.project_item_id) as item_count,
  u.full_name as designer_name,
  reviewer.full_name as reviewer_name,
  releaser.full_name as released_by_name,
  p.project_code,
  p.name as project_name,
  c.name as client_name
FROM drawing_requirements dr
LEFT JOIN drawing_requirement_items dri ON dri.drawing_requirement_id = dr.id
LEFT JOIN users u ON u.id = dr.assigned_to
LEFT JOIN users reviewer ON reviewer.id = dr.reviewed_by
LEFT JOIN users releaser ON releaser.id = dr.released_by
LEFT JOIN projects p ON p.id = dr.project_id
LEFT JOIN clients c ON c.id = p.client_id
GROUP BY dr.id, u.full_name, reviewer.full_name, releaser.full_name, p.project_code, p.name, c.name;
