-- ==============================================================================
-- UNIFLOWS LABEL — SUPABASE SAFE UPGRADE & QUICK-FIX (V3 - 2026)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> New Query -> Dán toàn bộ mã này -> Nhấn RUN.
-- ĐẶC ĐIỂM: HOÀN TOÀN AN TOÀN — KHÔNG LÀM MẤT DỮ LIỆU CỦA CÁC BẢNG ĐANG CÓ.
-- ==============================================================================

-- 1. BẢNG TRUNG TÂM THÔNG BÁO CHO ADMIN (ADMIN NOTIFICATIONS)
-- Dùng khi Nghệ sĩ nộp nhạc mới, yêu cầu đổi ảnh, yêu cầu rút tiền, gỡ bài, v.v.
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id text PRIMARY KEY,
  type text DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  artist_id text,
  artist_name text,
  artist_avatar text DEFAULT '',
  target_tab text DEFAULT 'admin-tab-overview',
  details jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BẢNG TIẾP NHẬN CÁC YÊU CẦU KHÁC (SPECIAL REQUESTS)
-- Dùng cho Tab 15: Gỡ bài hát (Takedown), Chuyển giao Catalog, Tranh chấp bản quyền, Dịch vụ khác
CREATE TABLE IF NOT EXISTS public.special_requests (
  id text PRIMARY KEY,
  type text NOT NULL, -- 'takedown', 'catalog_transfer', 'copyright_claim', 'custom'
  title text NOT NULL,
  artist_id text,
  artist_name text,
  artist_email text,
  artist_avatar text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
  admin_note text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. BẢNG DUYỆT ẢNH NGHỆ SĨ TRÊN WEBSITE (ARTIST PHOTO REQUESTS)
-- Dùng khi Nghệ sĩ tự đổi ảnh qua Portal -> Chờ Admin duyệt 1-click lên web
CREATE TABLE IF NOT EXISTS public.artist_photo_requests (
  id text PRIMARY KEY,
  artist_id text,
  artist_name text,
  current_image text,
  requested_image text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reject_reason text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at timestamp with time zone
);

-- 4. BẢNG COPYRIGHT_REPORTS (BÁO CÁO VI PHẠM BẢN QUYỀN)
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

-- 5. BẢNG GREENLIST_REQUESTS (YÊU CẦU MIỄN TRỪ BẢN QUYỀN / GREEN-LIST)
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

-- 6. BỔ SUNG CỘT CHO CÁC BẢNG HIỆN HỮU (NẾU CHƯA CÓ)
-- Tạp chí nhiều ảnh (Magazine multi-image album)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS author text DEFAULT 'UniFLOWs Editorial';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS read_time text DEFAULT '3 phút đọc';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Phát hành đa track (Multi-track EP / Album tracklist)
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS tracklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Cập nhật thông tin nghệ sĩ & thông báo
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;

-- 7. KÍCH HOẠT ROW LEVEL SECURITY (RLS) CHO CÁC BẢNG
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_photo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greenlist_requests ENABLE ROW LEVEL SECURITY;

-- Làm sạch chính sách cũ trước khi tạo mới để tránh trùng lặp
DROP POLICY IF EXISTS "Cho phép đọc công khai admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Toàn quyền quản trị admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Cho phép đọc công khai special_requests" ON public.special_requests;
DROP POLICY IF EXISTS "Toàn quyền quản trị special_requests" ON public.special_requests;
DROP POLICY IF EXISTS "Cho phép đọc công khai artist_photo_requests" ON public.artist_photo_requests;
DROP POLICY IF EXISTS "Toàn quyền quản trị artist_photo_requests" ON public.artist_photo_requests;
DROP POLICY IF EXISTS "Cho phép đọc công khai copyright_reports" ON public.copyright_reports;
DROP POLICY IF EXISTS "Toàn quyền quản trị copyright_reports" ON public.copyright_reports;
DROP POLICY IF EXISTS "Cho phép đọc công khai greenlist_requests" ON public.greenlist_requests;
DROP POLICY IF EXISTS "Toàn quyền quản trị greenlist_requests" ON public.greenlist_requests;

-- Thiết lập chính sách RLS
CREATE POLICY "Cho phép đọc công khai admin_notifications" ON public.admin_notifications FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị admin_notifications" ON public.admin_notifications FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Cho phép đọc công khai special_requests" ON public.special_requests FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị special_requests" ON public.special_requests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Cho phép đọc công khai artist_photo_requests" ON public.artist_photo_requests FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị artist_photo_requests" ON public.artist_photo_requests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Cho phép đọc công khai copyright_reports" ON public.copyright_reports FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị copyright_reports" ON public.copyright_reports FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Cho phép đọc công khai greenlist_requests" ON public.greenlist_requests FOR SELECT USING (true);
CREATE POLICY "Toàn quyền quản trị greenlist_requests" ON public.greenlist_requests FOR ALL USING (true) WITH CHECK (true);

-- 8. TẠO & CẤU HÌNH STORAGE BUCKETS (artworks & audio-masters)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('artworks', 'artworks', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*']),
  ('audio-masters', 'audio-masters', true, 104857600, ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/*'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Phân quyền Storage Objects
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

-- 9. CẤP QUYỀN TRUY CẬP CHO CLIENT (ANON / AUTHENTICATED)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON TABLE storage.objects TO anon, authenticated;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated;

