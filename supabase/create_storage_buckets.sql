-- =====================================================
-- STORAGE BUCKETS - Fast Cash Flow
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Criar bucket para logos de empresas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  1048576, -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 3. Criar bucket para cupons/recibos (imagens geradas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 4. Políticas de acesso para product-images
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- 5. Políticas de acesso para company-logos
DROP POLICY IF EXISTS "company_logos_select" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_delete" ON storage.objects;

CREATE POLICY "company_logos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');

CREATE POLICY "company_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "company_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "company_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos');

-- 6. Políticas de acesso para receipt-images
DROP POLICY IF EXISTS "receipt_images_select" ON storage.objects;
DROP POLICY IF EXISTS "receipt_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipt_images_update" ON storage.objects;
DROP POLICY IF EXISTS "receipt_images_delete" ON storage.objects;

CREATE POLICY "receipt_images_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipt-images');

CREATE POLICY "receipt_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "receipt_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipt-images')
  WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "receipt_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipt-images');

-- 7. Permitir acesso público para leitura (URLs públicas)
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
DROP POLICY IF EXISTS "public_read_company_logos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_receipt_images" ON storage.objects;

CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "public_read_company_logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "public_read_receipt_images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'receipt-images');

-- 8. Verificar buckets criados
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('product-images', 'company-logos', 'receipt-images');
