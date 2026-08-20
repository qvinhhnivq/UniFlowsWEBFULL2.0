import { supabase, isSupabaseConfigured } from './supabase.js';

export const defaultData = {
  tagline: 'MAKE THE WORLD MOVE.',
  heroText: 'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  aboutTitle: 'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  aboutText: 'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  email: 'hello@uniflowslabel.com',
  city: 'Hồ Chí Minh · Việt Nam',
  artists: [
    {
      id: 'lumi',
      name: 'Lumi',
      genre: 'Alternative R&B',
      image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85',
      bio: 'Lumi pha trộn R&B mơ màng với những lát cắt rất thật của thành phố về đêm.',
      gallery: ['https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85'],
      products: [
        { title: 'Vệt Sáng', type: 'Single · 2026', slug: 'vet-sang', url: '#' },
        { title: 'Live at The Flow', type: 'Live session · 2026', slug: 'live-at-the-flow', url: '#' }
      ],
      instagram: '#',
      youtube: '#',
      tiktok: '#'
    },
    {
      id: 'monotone',
      name: 'MONO//TONE',
      genre: 'Future Pop',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85',
      bio: 'MONO//TONE là dự án pop điện tử dành cho những nhịp điệu không đứng yên.',
      gallery: [],
      products: [
        { title: 'Dải Tần', type: 'EP · 2026', slug: 'dai-tan', url: '#' }
      ],
      instagram: '#',
      youtube: '#',
      tiktok: '#'
    },
    {
      id: 'kaii',
      name: 'KAII',
      genre: 'Hip-hop / Rap',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
      bio: 'KAII kể những câu chuyện đời thường bằng flow sắc nét và trực diện.',
      gallery: [],
      products: [
        { title: 'Đường Đua', type: 'Single · 2026', slug: 'duong-dua', url: '#' }
      ],
      instagram: '#',
      youtube: '#',
      tiktok: '#'
    }
  ],
  articles: [
    {
      id: 'vet-sang',
      date: '08.2026',
      category: 'New release',
      title: '“Vệt Sáng” — single mới từ Lumi đã chính thức lên sóng.',
      excerpt: 'Một bản R&B đầy ánh sáng và khoảng lặng.',
      cover: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85',
      body: '“Vệt Sáng” là chương mới trong hành trình của Lumi. Ca khúc kể về khoảnh khắc ta đủ can đảm để bước ra khỏi những điều quen thuộc.',
      published: true
    },
    {
      id: 'visual-live-session',
      date: '08.2026',
      category: 'Inside UniFLOWs',
      title: 'Đằng sau một visual live session: khi ánh sáng trở thành nhạc cụ.',
      excerpt: 'Một cuộc trò chuyện cùng đội ngũ sáng tạo.',
      body: 'Mỗi khung hình đều được thiết kế để chuyển động cùng âm nhạc. Đội ngũ đã xây dựng không gian ghi hình từ ba nguồn sáng chủ đạo.',
      published: true
    },
    {
      id: 'producer-open-call',
      date: '07.2026',
      category: 'Open call',
      title: 'UniFLOWs tìm kiếm những nhà sản xuất âm nhạc của ngày mai.',
      excerpt: 'Mở đơn hợp tác sản xuất cho năm 2026.',
      body: 'Chúng tôi tìm kiếm những người làm nhạc tò mò, có gu riêng và sẵn sàng tạo ra điều khác biệt cùng nghệ sĩ của UniFLOWs.',
      published: true
    }
  ]
};

// Lấy cache từ localStorage trước để render tức thì
export function getLocalCachedData() {
  try {
    const cached = localStorage.getItem('uniflows-content');
    return cached ? { ...defaultData, ...JSON.parse(cached) } : defaultData;
  } catch {
    return defaultData;
  }
}

// Lấy dữ liệu đầy đủ (Đồng bộ với Supabase nếu đã cấu hình)
export async function getData() {
  const cached = getLocalCachedData();
  if (!isSupabaseConfigured()) {
    return cached;
  }

  try {
    // 1. Fetch site_settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'main')
      .single();

    // 2. Fetch artists & their releases
    const { data: artistsData } = await supabase
      .from('artists')
      .select('*, releases(*)');

    // 3. Fetch articles
    const { data: articlesData } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    const merged = { ...cached };

    if (settings) {
      merged.tagline = settings.tagline || merged.tagline;
      merged.heroText = settings.hero_text || merged.heroText;
      merged.aboutTitle = settings.about_title || merged.aboutTitle;
      merged.aboutText = settings.about_text || merged.aboutText;
      merged.email = settings.email || merged.email;
      merged.city = settings.city || merged.city;
    }

    if (artistsData && artistsData.length > 0) {
      merged.artists = artistsData.map(a => ({
        id: a.id,
        name: a.name,
        genre: a.genre,
        image: a.image,
        bio: a.bio,
        gallery: Array.isArray(a.gallery) ? a.gallery : (typeof a.gallery === 'string' ? JSON.parse(a.gallery || '[]') : []),
        instagram: a.instagram || '#',
        youtube: a.youtube || '#',
        tiktok: a.tiktok || '#',
        products: (a.releases || []).map(r => ({
          id: r.id,
          title: r.title,
          type: r.type,
          slug: r.slug,
          submissionStatus: r.submission_status,
          links: r.links || {},
          audioUrl: r.audio_url,
          artworkUrl: r.artwork_url,
          metadata: r.metadata
        }))
      }));
    }

    if (articlesData && articlesData.length > 0) {
      merged.articles = articlesData.map(art => ({
        id: art.id,
        title: art.title,
        category: art.category,
        date: art.date,
        author: art.author,
        readTime: art.read_time,
        cover: art.cover,
        excerpt: art.excerpt,
        body: art.body,
        published: art.published
      }));
    }

    localStorage.setItem('uniflows-content', JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Không thể kết nối Supabase, sử dụng dữ liệu cục bộ:', err);
    return cached;
  }
}

// Lưu dữ liệu vào localStorage và Supabase
export async function saveData(data) {
  localStorage.setItem('uniflows-content', JSON.stringify(data));

  if (!isSupabaseConfigured()) return true;

  try {
    // 1. Cập nhật settings
    await supabase.from('site_settings').upsert({
      id: 'main',
      tagline: data.tagline,
      hero_text: data.heroText,
      about_title: data.aboutTitle,
      about_text: data.aboutText,
      email: data.email,
      city: data.city,
      updated_at: new Date().toISOString()
    });

    // 2. Cập nhật artists
    for (const a of data.artists) {
      await supabase.from('artists').upsert({
        id: a.id,
        name: a.name,
        genre: a.genre,
        image: a.image,
        bio: a.bio,
        gallery: a.gallery || [],
        instagram: a.instagram,
        youtube: a.youtube,
        tiktok: a.tiktok
      });
    }

    // 3. Cập nhật articles
    for (const art of data.articles) {
      await supabase.from('articles').upsert({
        id: art.id,
        title: art.title,
        category: art.category,
        date: art.date,
        author: art.author || 'UniFLOWs Editorial',
        read_time: art.readTime || '3 phút đọc',
        cover: art.cover || '',
        excerpt: art.excerpt || '',
        body: art.body || '',
        published: art.published ?? true
      });
    }
    return true;
  } catch (err) {
    console.error('Lỗi khi lưu lên Supabase:', err);
    return false;
  }
}

export function resetData() {
  localStorage.removeItem('uniflows-content');
}
