CREATE TABLE enquiry_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enquiry_notes_enquiry_id ON enquiry_notes(enquiry_id);

ALTER TABLE enquiry_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enquiry_notes_authenticated" ON enquiry_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
