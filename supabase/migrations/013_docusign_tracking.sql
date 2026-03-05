-- Track DocuSign envelopes for BOQ and drawings separately

-- Add BOQ signature tracking to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS boq_docusign_envelope_id text,
ADD COLUMN IF NOT EXISTS boq_docusign_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS boq_signed_at timestamptz,
ADD COLUMN IF NOT EXISTS boq_signed_by_email text;

-- Add drawing approval tracking to drawing_requirements
ALTER TABLE drawing_requirements
ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
ADD COLUMN IF NOT EXISTS docusign_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS approved_by_docusign_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by_docusign_email text;

-- Create table to track DocuSign events (audit log)
CREATE TABLE IF NOT EXISTS docusign_events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    envelope_id text NOT NULL,
    document_type text NOT NULL, -- 'boq', 'drawing', 'quote'
    document_id text,              -- project_id, drawing_id, or quote_id
    event_type text NOT NULL,      -- sent, delivered, completed, declined, voided
    envelope_status text,
    signer_email text,
    signer_name text,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- Ensure document_type column exists (in case table was created by earlier migration)
ALTER TABLE docusign_events ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE docusign_events ADD COLUMN IF NOT EXISTS document_id text;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_docusign_events_envelope_id ON docusign_events(envelope_id);
CREATE INDEX IF NOT EXISTS idx_docusign_events_document_type ON docusign_events(document_type);
CREATE INDEX IF NOT EXISTS idx_projects_boq_envelope_id ON projects(boq_docusign_envelope_id);
CREATE INDEX IF NOT EXISTS idx_drawing_req_docusign_envelope_id ON drawing_requirements(docusign_envelope_id);
