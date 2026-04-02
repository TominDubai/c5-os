ALTER TABLE quotes
  ADD COLUMN assigned_to UUID REFERENCES users(id),
  ADD COLUMN approval_status TEXT DEFAULT 'not_requested'
    CHECK (approval_status IN ('not_requested', 'pending', 'approved', 'rejected')),
  ADD COLUMN approval_notes TEXT,
  ADD COLUMN approved_by UUID REFERENCES users(id),
  ADD COLUMN approval_requested_at TIMESTAMPTZ,
  ADD COLUMN approval_completed_at TIMESTAMPTZ;
