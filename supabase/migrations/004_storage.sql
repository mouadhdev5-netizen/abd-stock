-- =====================================================
-- ABD STOCK - Storage Bucket Initialization
-- =====================================================

-- Create a new public bucket for images and assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assets');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their images
CREATE POLICY "Authenticated users can update images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);
