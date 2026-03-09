-- Create storage bucket for enquiry file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'enquiry-files',
  'enquiry-files',
  false,
  52428800, -- 50MB limit
  NULL      -- all file types allowed
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload enquiry files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'enquiry-files');

CREATE POLICY "Authenticated users can view enquiry files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'enquiry-files');

CREATE POLICY "Authenticated users can delete enquiry files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'enquiry-files');
