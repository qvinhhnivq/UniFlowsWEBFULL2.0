-- ==============================================================================
-- UNIFLOWS LABEL — SỬA NHANH LỖI THIẾU BẢNG & STORAGE BUCKETS (SAFE QUICK-FIX)
-- Chạy script này trong Supabase Dashboard -> SQL Editor -> New Query -> Run
-- KHÔNG XÓA HAY LÀM MẤT DỮ LIỆU CÁC BẢNG HIỆN CÓ
-- ==============================================================================

-- 1. TẠO BẢNG COPYRIGHT_REPORTS (NẾU CHƯA CÓ)
CREATE TABLE IF NOT EXISTS public.copyright_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text,
  artist_name text,
  track_title text NOT NULL,
  platform text,
  violation_type text,
  target_url text NOT NULL,
  action_preference text,
  notes text,
  status text DEFAULT 'Đang tiếp nhận',
  admin_notes text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TẠO BẢNG GREENLIST_REQUESTS (NẾU CHƯA CÓ)
CREATE TABLE IF NOT EXISTS public.greenlist_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text,
  artist_name text,
  platform text,
  channel_id text NOT NULL,
  track_scope text,
  purpose text,
  notes text,
  status text DEFAULT 'Đang tiếp nhận',
  admin_notes text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. KÍCH HOẠT ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH QUYỀN
ALTER TABLE public.copyright_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greenlist_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép đọc công khai copyright_reports" ON public.copyright_reports;
DROP POLICY IF EXISTS "Toàn quyền quản trị copyright_reports" ON public.copyright_reports;
DROP POLICY IF EXISTS "Cho phép đọc công khai greenlist_requests" ON public.greenlist_requests;
DROP POLICY IF EXISTS "Toàn quyền quản trị greenlist_requests" ON public.greenlist_requests;

CREATE POLICY "Cho phép đọc công khai copyright_reports" ON public.copyright_reports FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị copyright_reports" ON public.copyright_reports FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Cho phép đọc công khai greenlist_requests" ON public.greenlist_requests FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị greenlist_requests" ON public.greenlist_requests FOR ALL USING (true) WITH CHECK (true);

-- 4. TẠO & CẤU HÌNH STORAGE BUCKETS (artworks & audio-masters)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('artworks', 'artworks', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*']),
  ('audio-masters', 'audio-masters', true, 104857600, ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/*'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. PHÂN QUYỀN TRUY CẬP STORAGE OBJECTS
DROP POLICY IF EXISTS "Mọi người đều có thể xem Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Người dùng có thể upload Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Toàn quyền xóa sửa Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Mọi người đều có thể tải/nghe Audio Masters" ON storage.objects;
DROP POLICY IF EXISTS "Người dùng có thể upload Audio Masters" ON storage.objects;
DROP POLICY IF EXISTS "Toàn quyền xóa sửa Audio Masters" ON storage.objects;

CREATE POLICY "Mọi người đều có thể xem Artworks"
ON storage.objects FOR SELECT
USING (bucket_id = 'artworks');

CREATE POLICY "Người dùng có thể upload Artworks"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artworks');

CREATE POLICY "Toàn quyền xóa sửa Artworks"
ON storage.objects FOR ALL
USING (bucket_id = 'artworks');

CREATE POLICY "Mọi người đều có thể tải/nghe Audio Masters"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-masters');

CREATE POLICY "Người dùng có thể upload Audio Masters"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-masters');

CREATE POLICY "Toàn quyền xóa sửa Audio Masters"
ON storage.objects FOR ALL
USING (bucket_id = 'audio-masters');

-- 6. PHÂN QUYỀN SCHEMA STORAGE VÀ BUCKETS CHO CLIENT (ANON / AUTHENTICATED)
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON TABLE storage.objects TO anon, authenticated;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated;

-- 7. BỔ SUNG CỘT BẢO ĐẢM KHÔNG THIẾU Ở CÁC BẢNG KHÁC
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS author text DEFAULT 'UniFLOWs Editorial';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS read_time text DEFAULT '3 phút đọc';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;
