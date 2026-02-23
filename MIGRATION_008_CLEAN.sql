-- Migration 008: Add pending_design status
-- Items wait for drawing approval before going to production

ALTER TABLE project_items DROP CONSTRAINT IF EXISTS project_items_status_check;

ALTER TABLE project_items ADD CONSTRAINT project_items_status_check 
  CHECK (status IN (
    'pending_design',
    'pre_production',
    'in_production',
    'ready_for_qc',
    'qc_failed',
    'ready_for_dispatch',
    'dispatched',
    'on_site',
    'installed',
    'qs_verified'
  ));

ALTER TABLE project_items ALTER COLUMN status SET DEFAULT 'pending_design';
