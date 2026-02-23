-- Migration: Add Payment/Invoice Tracking
-- Tracks deposit invoices and payments for projects

-- Invoice types and statuses
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  invoice_number TEXT UNIQUE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN (
    'deposit',           -- Initial deposit
    'progress',          -- Progress payment
    'final',             -- Final payment
    'retention'          -- Retention release
  )),
  
  amount DECIMAL(12,2) NOT NULL,
  percentage DECIMAL(5,2), -- e.g., 30% deposit
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',             -- Being prepared
    'sent',              -- Sent to client
    'paid',              -- Payment received
    'overdue',           -- Past due date
    'cancelled'          -- Cancelled
  )),
  
  -- Dates
  issued_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  -- Payment details
  payment_method TEXT, -- bank_transfer, cheque, cash, card
  payment_reference TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);

-- Auto-generate invoice number (INV-2026-001)
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

-- Timestamp trigger
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-set issued_at when status changes to sent
  IF NEW.status = 'sent' AND OLD.status = 'draft' THEN
    NEW.issued_at = now();
  END IF;
  
  -- Auto-set paid_at when status changes to paid
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

-- Add payment tracking fields to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deposit_invoice_id UUID REFERENCES invoices(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS items_generated BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS items_generated_at TIMESTAMPTZ;

-- View: Projects with invoice info
CREATE OR REPLACE VIEW v_projects_with_invoices AS
SELECT 
  p.*,
  c.name as client_name,
  c.company as client_company,
  q.quote_number,
  q.total as quote_total,
  i.invoice_number as deposit_invoice_number,
  i.amount as deposit_amount,
  i.status as deposit_status,
  i.due_date as deposit_due_date,
  i.paid_at as deposit_paid_at
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN quotes q ON q.id = p.quote_id
LEFT JOIN invoices i ON i.id = p.deposit_invoice_id
GROUP BY p.id, c.name, c.company, q.quote_number, q.total, 
         i.invoice_number, i.amount, i.status, i.due_date, i.paid_at;

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow authenticated users)
CREATE POLICY "Allow authenticated read" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON invoices FOR DELETE TO authenticated USING (true);
