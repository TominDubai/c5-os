-- Add awaiting_deposit status to projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN (
    'awaiting_deposit',   -- Project created, waiting for deposit payment
    'design_pending',     -- Deposit paid, ready for design
    'in_design',          -- Design work in progress
    'design_approved',    -- Design approved, ready for production
    'in_production',      -- Items being manufactured
    'in_installation',    -- Installation in progress
    'completed',          -- Project completed
    'on_hold',            -- Project on hold
    'cancelled'           -- Project cancelled
  ));
