-- Add docusign tracking to quotes
ALTER TABLE quotes
ADD COLUMN docusign_envelope_id text,
ADD COLUMN docusign_status text DEFAULT 'draft'; -- draft, sent, delivered, completed, voided

-- Create an audit log for docusign events if needed later
CREATE TABLE IF NOT EXISTS docusign_events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    envelope_id text NOT NULL,
    event_type text NOT NULL, -- sent, delivered, completed, declined, voided
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_quotes_docusign_envelope_id ON quotes(docusign_envelope_id);
