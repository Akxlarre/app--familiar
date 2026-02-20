-- Políticas de Storage para el bucket "receipts".
-- Crear el bucket manualmente en Dashboard > Storage > New bucket:
--   name: receipts, public: false, file_size_limit: 10MB, mime: image/jpeg, image/png, image/webp.
-- Rutas: {household_id}/{uuid}.jpg

-- Política: usuarios autenticados pueden subir en la carpeta de su hogar.
-- get_my_household_id() debe existir (modelo_datos_v1).
CREATE POLICY "receipts_household_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = (SELECT get_my_household_id()::text)
);

CREATE POLICY "receipts_household_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.household_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "receipts_household_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.household_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "receipts_household_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.household_id::text = (storage.foldername(name))[1]
  )
);
