-- ==============================================================================
-- UNIFLOWS LABEL — SUPABASE DATABASE & STORAGE SCHEMA (V2 COMPLETE)
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- ==============================================================================

-- 0. XÓA CÁC BẢNG CŨ NẾU ĐÃ TỒN TẠI ĐỂ ĐỒNG BỘ 100% CỘT
drop table if exists public.releases cascade;
drop table if exists public.articles cascade;
drop table if exists public.artists cascade;
drop table if exists public.site_settings cascade;
drop table if exists public.profiles cascade;
drop table if exists public.audit_logs cascade;

-- Xóa các policy cũ (nếu có)
drop policy if exists "Mọi người đều có thể xem Artworks" on storage.objects;
drop policy if exists "Người dùng có thể upload Artworks" on storage.objects;
drop policy if exists "Người dùng có thể upload Audio Masters" on storage.objects;
drop policy if exists "Mọi người đều có thể tải/nghe Audio Masters" on storage.objects;

-- ==============================================================================
-- 1. TẠO CÁC BẢNG DỮ LIỆU
-- ==============================================================================

-- 1.1. BẢNG PROFILES (PHÂN QUYỀN ADMIN & ARTIST)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  role text default 'artist' check (role in ('admin', 'artist')),
  artist_id text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.2. BẢNG SITE SETTINGS (CẤU HÌNH THÔNG TIN TRANG WEB & NHIỀU EMAIL)
create table public.site_settings (
  id text primary key default 'main',
  tagline text default 'MAKE THE WORLD MOVE.',
  hero_text text default 'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  about_title text default 'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  about_text text default 'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  email text default 'hello@uniflowslabel.com',
  emails jsonb default '{"general":"hello@uniflowslabel.com","booking":"booking@uniflowslabel.com","demos":"demos@uniflowslabel.com","press":"press@uniflowslabel.com"}'::jsonb,
  city text default 'Hồ Chí Minh · Việt Nam',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 1.3. BẢNG ARTISTS (NGHỆ SĨ & DOANH THU)
create table public.artists (
  id text primary key, -- slug vd: lumi, monotone, kaii
  name text not null,
  genre text,
  image text,
  bio text,
  gallery jsonb default '[]'::jsonb,
  instagram text default '',
  youtube text default '',
  tiktok text default '',
  spotify text default '',
  monthly_streams text default '0',
  estimated_revenue text default '0',
  pending_balance text default '0',
  payable_balance text default '0',
  royalty_rate text default '80',
  stats jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.4. BẢNG RELEASES (BẢN PHÁT HÀNH / SẢN PHẨM ÂM NHẠC)
create table public.releases (
  id uuid default gen_random_uuid() primary key,
  artist_id text references public.artists(id) on delete cascade,
  title text not null,
  type text default 'Single',
  release_date date,
  pre_save_date date,
  slug text,
  genre text,
  language text default 'Tiếng Việt',
  explicit boolean default false,
  upc text,
  tracks jsonb default '[]'::jsonb,
  primary_artist text,
  featured_artist text,
  songwriters text,
  producers text,
  phonogram text,
  copyright text,
  territories text default 'Toàn cầu',
  pricing text default 'Standard',
  notes text,
  submission_status text default 'Đang chờ UniFLOWs duyệt',
  audio_url text,
  artwork_url text,
  links jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.5. BẢNG ARTICLES (TẠP CHÍ & BÀI VIẾT)
create table public.articles (
  id text primary key,
  title text not null,
  category text default 'News',
  date text,
  author text default 'UniFLOWs Editorial',
  read_time text default '3 phút đọc',
  cover text,
  excerpt text,
  body text,
  published boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.6. BẢNG PAYOUT_REQUESTS (YÊU CẦU RÚT TIỀN TỪ NGHỆ SĨ)
create table public.payout_requests (
  id uuid default gen_random_uuid() primary key,
  artist_id text references public.artists(id) on delete cascade,
  amount text not null,
  bank_info jsonb default '{}'::jsonb,
  status text default 'Đang chờ xem xét',
  rejection_reason text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.7. BẢNG AUDIT_LOGS (LỊCH SỬ HOẠT ĐỘNG BẢO MẬT)
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  action text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 2. STORAGE BUCKETS (LƯU TRỮ AUDIO & ARTWORK)
-- ==============================================================================

insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('audio-masters', 'audio-masters', true)
on conflict (id) do update set public = true;

-- Storage Policies
create policy "Mọi người đều có thể xem Artworks"
on storage.objects for select
using (bucket_id = 'artworks');

create policy "Người dùng có thể upload Artworks"
on storage.objects for insert
with check (bucket_id = 'artworks');

create policy "Người dùng có thể upload Audio Masters"
on storage.objects for insert
with check (bucket_id = 'audio-masters');

create policy "Mọi người đều có thể tải/nghe Audio Masters"
on storage.objects for select
using (bucket_id = 'audio-masters');

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.articles enable row level security;
alter table public.payout_requests enable row level security;
alter table public.audit_logs enable row level security;

create policy "Cho phép đọc công khai site_settings" on public.site_settings for select using (true);
create policy "Cho phép đọc công khai artists" on public.artists for select using (true);
create policy "Cho phép đọc công khai releases" on public.releases for select using (true);
create policy "Cho phép đọc công khai articles" on public.articles for select using (true);
create policy "Cho phép đọc profile" on public.profiles for select using (true);
create policy "Cho phép đọc payout_requests" on public.payout_requests for select using (true);
create policy "Cho phép đọc công khai audit_logs" on public.audit_logs for select using (true);

create policy "Toàn quyền quản trị site_settings" on public.site_settings for all using (true) with check (true);
create policy "Toàn quyền quản trị artists" on public.artists for all using (true) with check (true);
create policy "Toàn quyền quản trị releases" on public.releases for all using (true) with check (true);
create policy "Toàn quyền quản trị articles" on public.articles for all using (true) with check (true);
create policy "Toàn quyền quản trị profiles" on public.profiles for all using (true) with check (true);
create policy "Toàn quyền quản trị payout_requests" on public.payout_requests for all using (true) with check (true);
create policy "Toàn quyền quản trị audit_logs" on public.audit_logs for all using (true) with check (true);

-- ==============================================================================
-- 4. SEED DATA MẪU BAN ĐẦU
-- ==============================================================================

insert into public.site_settings (id, tagline, hero_text, about_title, about_text, email, emails, city)
values (
  'main',
  'MAKE THE WORLD MOVE.',
  'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  'hello@uniflowslabel.com',
  '{"general":"hello@uniflowslabel.com","booking":"booking@uniflowslabel.com","demos":"demos@uniflowslabel.com","press":"press@uniflowslabel.com"}'::jsonb,
  'Hồ Chí Minh · Việt Nam'
);

insert into public.artists (id, name, genre, image, bio, gallery, instagram, youtube, tiktok, monthly_streams, estimated_revenue, payable_balance)
values
(
  'lumi',
  'Lumi',
  'Alternative R&B',
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85',
  'Lumi pha trộn R&B mơ màng với những lát cắt rất thật của thành phố về đêm.',
  '["https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85"]'::jsonb,
  'https://instagram.com', 'https://youtube.com', 'https://tiktok.com',
  '248.6K', '18,400,000', '12,750,000'
),
(
  'monotone',
  'MONO//TONE',
  'Future Pop',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85',
  'MONO//TONE là dự án pop điện tử dành cho những nhịp điệu không đứng yên.',
  '[]'::jsonb,
  '', '', '',
  '0', '0', '0'
),
(
  'kaii',
  'KAII',
  'Hip-hop / Rap',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
  'KAII kể những câu chuyện đời thường bằng flow sắc nét và trực diện.',
  '[]'::jsonb,
  '', '', '',
  '0', '0', '0'
);

insert into public.releases (artist_id, title, type, release_date, slug, submission_status, links)
values
(
  'lumi',
  'Vệt Sáng',
  'Single · 2026',
  '2026-08-01',
  'vet-sang',
  'Đã phát hành',
  '{"spotify":"#", "apple":"#", "youtube":"#"}'::jsonb
),
(
  'lumi',
  'Live at The Flow',
  'Live session · 2026',
  '2026-08-15',
  'live-at-the-flow',
  'Đã phát hành',
  '{"spotify":"#", "apple":"#", "youtube":"#"}'::jsonb
),
(
  'monotone',
  'Dải Tần',
  'EP · 2026',
  '2026-08-10',
  'dai-tan',
  'Đã phát hành',
  '{"spotify":"#", "apple":"#", "youtube":"#"}'::jsonb
),
(
  'kaii',
  'Đường Đua',
  'Single · 2026',
  '2026-07-20',
  'duong-dua',
  'Đã phát hành',
  '{"spotify":"#", "apple":"#", "youtube":"#"}'::jsonb
);

insert into public.articles (id, title, category, date, author, read_time, cover, excerpt, body, published)
values
(
  'vet-sang',
  '“Vệt Sáng” — single mới từ Lumi đã chính thức lên sóng.',
  'New release',
  '08.2026',
  'UniFLOWs Editorial',
  '3 phút đọc',
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85',
  'Một bản R&B đầy ánh sáng và khoảng lặng.',
  '“Vệt Sáng” là chương mới trong hành trình của Lumi. Ca khúc kể về khoảnh khắc ta đủ can đảm để bước ra khỏi những điều quen thuộc.',
  true
),
(
  'visual-live-session',
  'Đằng sau một visual live session: khi ánh sáng trở thành nhạc cụ.',
  'Inside UniFLOWs',
  '08.2026',
  'UniFLOWs Editorial',
  '4 phút đọc',
  '',
  'Một cuộc trò chuyện cùng đội ngũ sáng tạo.',
  'Mỗi khung hình đều được thiết kế để chuyển động cùng âm nhạc. Đội ngũ đã xây dựng không gian ghi hình từ ba nguồn sáng chủ đạo.',
  true
),
(
  'producer-open-call',
  'UniFLOWs tìm kiếm những nhà sản xuất âm nhạc của ngày mai.',
  'Open call',
  '07.2026',
  'UniFLOWs Editorial',
  '2 phút đọc',
  '',
  'Mở đơn hợp tác sản xuất cho năm 2026.',
  'Chúng tôi tìm kiếm những người làm nhạc tò mò, có gu riêng và sẵn sàng tạo ra điều khác biệt cùng nghệ sĩ của UniFLOWs.',
  true
);
