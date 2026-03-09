-- Add item value to project_items (copied from quote at project creation)
-- Used for production scheduling week value calculations
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS value DECIMAL(12,2) DEFAULT 0;
