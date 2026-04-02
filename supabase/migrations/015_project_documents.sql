-- Migration: Project Documents
-- Stores uploaded files (PDFs, images, contracts, etc.) per project

CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,        -- storage object path
  file_size INTEGER,              -- bytes
  mime_type TEXT,

  -- Categorisation
  category TEXT DEFAULT 'other' CHECK (category IN (
    'contract',
    'quote',
    'drawing',
    'photo',
    'invoice',
    'report',
    'other'
  )),
  description TEXT,

  -- Who uploaded
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id
  ON project_documents(project_id);

-- RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project documents"
  ON project_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project documents"
  ON project_documents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own project documents"
  ON project_documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Storage bucket for project documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,
  104857600,  -- 100 MB limit
  NULL        -- all types allowed
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload project documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can view project documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can delete project documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents');
