-- Add pending_design status for items waiting for drawing approval
ALTER TABLE project_items DROP CONSTRAINT IF EXISTS project_items_status_check;

ALTER TABLE project_items ADD CONSTRAINT project_items_status_check 
  CHECK (status IN (
    'pending_design',      -- NEW: Waiting for drawings to be approved
    'pre_production',      -- Ready for production planning
    'in_production',       -- Being manufactured
    'ready_for_qc',        -- Ready for quality check
    'qc_failed',           -- Failed QC, needs rework
    'ready_for_dispatch',  -- Passed QC, ready to ship
    'dispatched',          -- On truck/in transit
    'on_site',             -- Delivered to site
    'installed',           -- Installed on site
    'qs_verified'          -- QS verified installation
  ));

-- Update default to pending_design
ALTER TABLE project_items ALTER COLUMN status SET DEFAULT 'pending_design';
