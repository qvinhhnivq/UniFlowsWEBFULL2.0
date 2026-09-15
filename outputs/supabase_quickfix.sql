-- ==============================================================================
-- UNIFLOWS LABEL — SUPABASE COMPLETE DATABASE & STORAGE SETUP (2026)
-- Hướng dẫn: 
-- 1. Đăng nhập https://supabase.com -> Chọn Project của bạn
-- 2. Vào mục "SQL Editor" -> Chọn "+ New Query"
-- 3. Dán toàn bộ nội dung script này vào và nhấn "RUN" (hoặc Ctrl+Enter)
-- (Script an toàn 100%, tự động tạo bảng nếu chưa có, không làm mất dữ liệu cũ)
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH TỔNG QUAN WEBSITE (SITE SETTINGS)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  tagline text DEFAULT 'MAKE THE WORLD MOVE.',
  hero_text text DEFAULT 'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  about_title text DEFAULT 'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  about_text text DEFAULT 'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  email text DEFAULT 'hello@uniflowslabel.com',
  emails jsonb DEFAULT '[]'::jsonb,
  city text DEFAULT 'Hồ Chí Minh · Việt Nam',
  socials jsonb DEFAULT '[]'::jsonb,
  announcements jsonb DEFAULT '[]'::jsonb,
  publishing jsonb DEFAULT '{}'::jsonb,
  unihube jsonb DEFAULT '{}'::jsonb,
  collective48k jsonb DEFAULT '{}'::jsonb,
  admin_accounts jsonb DEFAULT '[]'::jsonb,
  music_submissions jsonb DEFAULT '[]'::jsonb,
  shortlinks jsonb DEFAULT '[]'::jsonb,
  artist_order jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tạo bản ghi mặc định id = 'main' nếu chưa có
INSERT INTO public.site_settings (id, tagline, hero_text, about_title, about_text, email, city)
VALUES (
  'main',
  'MAKE THE WORLD MOVE.',
  'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  'hello@uniflowslabel.com',
  'Hồ Chí Minh · Việt Nam'
)
ON CONFLICT (id) DO NOTHING;

-- 2. BẢNG NGHỆ SĨ & HỒ SƠ TÀI KHOẢN (ARTISTS)
CREATE TABLE IF NOT EXISTS public.artists (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text,
  email text,
  password text,
  role_type text DEFAULT 'distribution',
  show_on_web boolean DEFAULT true,
  genre text,
  image text,
  bio text,
  gallery jsonb DEFAULT '[]'::jsonb,
  instagram text DEFAULT '',
  youtube text DEFAULT '',
  tiktok text DEFAULT '',
  spotify text DEFAULT '',
  monthly_streams text DEFAULT '0',
  estimated_revenue text DEFAULT '0',
  pending_balance text DEFAULT '0',
  payable_balance text DEFAULT '0',
  payout_cycle text DEFAULT 'Hàng tháng (Monthly)',
  royalty_rate text DEFAULT '80% Master',
  contract_term text DEFAULT '2024 - 2027',
  banking jsonb DEFAULT null,
  stats jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. BẢNG BẢN PHÁT HÀNH ÂM NHẠC (RELEASES)
CREATE TABLE IF NOT EXISTS public.releases (
  id text PRIMARY KEY,
  artist_id text,
  title text NOT NULL,
  type text DEFAULT 'Single',
  release_date text,
  pre_save_date text,
  slug text,
  genre text,
  language text DEFAULT 'Tiếng Việt',
  explicit boolean DEFAULT false,
  upc text,
  submission_status text DEFAULT 'Đã phát hành',
  artwork_url text,
  audio_url text,
  links jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  tracklist jsonb DEFAULT '[]'::jsonb,
  tracks jsonb DEFAULT '[]'::jsonb,
  show_on_web boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. BẢNG BÀI VIẾT & TẠP CHÍ (ARTICLES)
CREATE TABLE IF NOT EXISTS public.articles (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text DEFAULT 'Tin Tức',
  date text,
  author text DEFAULT 'UniFLOWs Editorial',
  read_time text DEFAULT '3 phút đọc',
  cover text,
  excerpt text,
  body text,
  content text,
  images jsonb DEFAULT '[]'::jsonb,
  published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. BẢNG YÊU CẦU RÚT TIỀN (PAYOUT REQUESTS)
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text,
  amount text NOT NULL,
  bank_info jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'Đang chờ xem xét',
  rejection_reason text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BẢNG THÔNG BÁO NGHỆ SĨ & HỆ THỐNG (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  artist_id text,
  recipient_id text,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  link text DEFAULT '',
  action_url text DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. BẢNG THÔNG BÁO DÀNH CHO ADMIN (ADMIN NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  artist_id text,
  artist_name text,
  artist_avatar text DEFAULT '',
  target_tab text DEFAULT 'admin-tab-overview',
  details jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. BẢNG TIẾP NHẬN YÊU CẦU ĐẶC BIỆT (SPECIAL REQUESTS: Takedown, Catalog, Tranh chấp)
CREATE TABLE IF NOT EXISTS public.special_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL,
  title text NOT NULL,
  artist_id text,
  artist_name text,
  artist_email text,
  artist_avatar text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  admin_note text DEFAULT '',
  admin_notes text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. BẢNG DUYỆT ĐỔI ẢNH HỒ SƠ NGHỆ SĨ (ARTIST PHOTO REQUESTS)
CREATE TABLE IF NOT EXISTS public.artist_photo_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  artist_id text,
  artist_name text,
  current_image text,
  requested_image text NOT NULL,
  status text DEFAULT 'pending',
  reject_reason text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at timestamp with time zone
);

-- 10. BẢNG BÁO CÁO VI PHẠM BẢN QUYỀN (COPYRIGHT REPORTS)
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

-- 11. BẢNG MIỄN TRỪ BẢN QUYỀN / GREEN-LIST (GREENLIST REQUESTS)
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

-- 12. BẢNG ĐẶT LỊCH HẸN & BOOKING A&R (APPOINTMENTS)
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  date text NOT NULL,
  time_slot text NOT NULL,
  duration_minutes integer DEFAULT 45,
  host text DEFAULT 'UniFLOWs A&R Team',
  topic_category text DEFAULT 'Thẩm định Demo',
  status text DEFAULT 'open',
  slot_notes text DEFAULT '',
  booker jsonb,
  meeting_method text DEFAULT '',
  meeting_link text DEFAULT '',
  admin_notes text DEFAULT '',
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. BẢNG ĐĂNG KÝ NHẬN TIN NEWSLETTER (SUBSCRIBERS)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text DEFAULT '',
  source text DEFAULT 'website_newsletter',
  subscribed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. BẢNG NHẬT KÝ KIỂM TOÁN / BẢO MẬT (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text DEFAULT 'admin@uniflowslabel.com',
  action text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. BẢNG HỒ SƠ PHÂN QUYỀN (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  role text DEFAULT 'artist' CHECK (role IN ('admin', 'artist')),
  artist_id text,
  full_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 16. BỔ SUNG CỘT BẢO ĐẢM KHÔNG BỊ THIẾU Ở CÁC BẢNG HIỆN HỮU (ADD COLUMN IF NOT EXISTS)
-- ==============================================================================
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS socials jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS announcements jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS publishing jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS unihube jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS collective48k jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS admin_accounts jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS music_submissions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS shortlinks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS artist_order jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'distribution';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS show_on_web boolean DEFAULT true;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS instagram text DEFAULT '';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS youtube text DEFAULT '';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS tiktok text DEFAULT '';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS spotify text DEFAULT '';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS facebook text DEFAULT '';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS custom_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS socials jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS monthly_streams text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS estimated_revenue text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS pending_balance text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS payable_balance text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS payout_cycle text DEFAULT 'Hàng tháng (Monthly)';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS royalty_rate text DEFAULT '80% Master';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS contract_term text DEFAULT '2024 - 2027';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS banking jsonb DEFAULT null;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stats jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS submission_status text DEFAULT 'Đã phát hành';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS artwork_url text;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS tracklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS tracks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS show_on_web boolean DEFAULT true;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS author text DEFAULT 'UniFLOWs Editorial';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS read_time text DEFAULT '3 phút đọc';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text DEFAULT '';

-- ==============================================================================
-- 17. KÍCH HOẠT ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH TRUY CẬP (POLICIES)
-- ==============================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full admin on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public read on %I" ON public.%I FOR SELECT USING (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full admin on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ==============================================================================
-- 18. TẠO & CẤU HÌNH STORAGE BUCKETS (artworks & audio-masters)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('artworks', 'artworks', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*']),
  ('audio-masters', 'audio-masters', true, 209715200, ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/*'])
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

CREATE POLICY "Mọi người đều có thể xem Artworks" ON storage.objects FOR SELECT USING (bucket_id = 'artworks');
CREATE POLICY "Người dùng có thể upload Artworks" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artworks');
CREATE POLICY "Toàn quyền xóa sửa Artworks" ON storage.objects FOR ALL USING (bucket_id = 'artworks');

CREATE POLICY "Mọi người đều có thể tải/nghe Audio Masters" ON storage.objects FOR SELECT USING (bucket_id = 'audio-masters');
CREATE POLICY "Người dùng có thể upload Audio Masters" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-masters');
CREATE POLICY "Toàn quyền xóa sửa Audio Masters" ON storage.objects FOR ALL USING (bucket_id = 'audio-masters');

-- ==============================================================================
-- 19. CẤP QUYỀN SCHEMA CHO CLIENT (ANON / AUTHENTICATED)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON TABLE storage.objects TO anon, authenticated;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated;

-- ==============================================================================
-- 20. BẬT REALTIME REPLICATION CHO CÁC BẢNG QUAN TRỌNG
-- ==============================================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'site_settings', 'artists', 'releases', 'articles',
    'payout_requests', 'notifications', 'admin_notifications',
    'special_requests', 'artist_photo_requests', 'copyright_reports',
    'greenlist_requests', 'appointments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore if already added or publication is disabled
      END;
    END IF;
  END LOOP;
END $$;
