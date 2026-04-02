-- Create storage bucket for document library
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Document folders (hierarchical)
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document library (general file store with folder support)
CREATE TABLE doc_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  related_type TEXT,
  related_id UUID,
  source TEXT DEFAULT 'upload',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view folders" ON document_folders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage folders" ON document_folders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view doc_library" ON doc_library
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage doc_library" ON doc_library
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed system folders
INSERT INTO document_folders (name, is_system) VALUES
  ('Signed Quotes', true),
  ('Signed BOQs', true),
  ('Signed Drawings', true),
  ('Drawings', true),
  ('General', true);
