-- Migration 004: Payment tracking and drawings workflow
-- Run this in Supabase SQL Editor

-- 1. Add payment fields to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(12,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- 2. Update project_items status options to include design workflow
-- First drop the old constraint
ALTER TABLE project_items DROP CONSTRAINT IF EXISTS project_items_status_check;

-- Add new constraint with updated statuses
ALTER TABLE project_items ADD CONSTRAINT project_items_status_check CHECK (status IN (
  'awaiting_drawings',
  'in_design', 
  'drawings_complete',
  'awaiting_client_approval',
  'approved',
  'production_scheduling',
  'in_production',
  'ready_for_qc',
  'qc_failed',
  'ready_for_dispatch',
  'dispatched',
  'on_site',
  'installed',
  'qs_verified'
));

-- 3. Add drawing tracking to project_items
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS drawing_url TEXT;
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS drawing_uploaded_at TIMESTAMPTZ;
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS drawing_uploaded_by UUID REFERENCES users(id);
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT;

-- 4. Create drawings table for version tracking
CREATE TABLE IF NOT EXISTS drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_item_id UUID REFERENCES project_items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  version INTEGER DEFAULT 1,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'rejected', 'superseded'
  )),
  
  uploaded_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Design team assignments
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_team_notified_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_due_date DATE;

-- Disable RLS on new table
ALTER TABLE drawings DISABLE ROW LEVEL SECURITY;
