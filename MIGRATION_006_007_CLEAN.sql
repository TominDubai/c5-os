-- Migration 006: Add Payment/Invoice Tracking
-- Migration 007: Add awaiting_deposit status

-- Invoice types and statuses
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  invoice_number TEXT UNIQUE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN (
    'deposit',
    'progress',
    'final',
    'retention'
  )),
  
  amount DECIMAL(12,2) NOT NULL,
  percentage DECIMAL(5,2),
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled'
  )),
  
  issued_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  payment_method TEXT,
  payment_reference TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);

CREATE SEQUENCE invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  IF NEW.status = 'sent' AND OLD.status = 'draft' THEN
    NEW.issued_at = now();
  END IF;
  
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deposit_invoice_id UUID REFERENCES invoices(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS items_generated BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS items_generated_at TIMESTAMPTZ;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN (
    'awaiting_deposit',
    'design_pending',
    'in_design',
    'design_approved',
    'in_production',
    'in_installation',
    'completed',
    'on_hold',
    'cancelled'
  ));

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON invoices FOR DELETE TO authenticated USING (true);
