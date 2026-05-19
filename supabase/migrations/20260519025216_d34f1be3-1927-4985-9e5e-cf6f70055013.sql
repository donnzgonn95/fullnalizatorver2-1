
DROP POLICY IF EXISTS "moje_select_own" ON storage.objects;
DROP POLICY IF EXISTS "moje_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "moje_update_own" ON storage.objects;
DROP POLICY IF EXISTS "moje_delete_own" ON storage.objects;

CREATE POLICY "moje_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'moje' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "moje_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'moje' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "moje_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'moje' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'moje' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "moje_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'moje' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own watchlist" ON public.watchlist;
CREATE POLICY "Users update own watchlist" ON public.watchlist
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
