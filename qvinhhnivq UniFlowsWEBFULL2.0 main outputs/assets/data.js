import { supabase, isSupabaseConfigured } from './supabase.js';

export const defaultData = {
  tagline: 'MAKE THE WORLD MOVE.',
  heroText: 'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  aboutTitle: 'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  aboutText: 'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  email: 'hello@uniflowslabel.com',
  emails: [
    { label: 'Thông tin chung (General)', email: 'hello@uniflowslabel.com' },
    { label: 'Gửi Demo & A&R', email: 'demos@uniflowslabel.com' },
    { label: 'Booking & Sự kiện', email: 'booking@uniflowslabel.com' },
    { label: 'Báo chí & Truyền thông', email: 'press@uniflowslabel.com' }
  ],
  announcements: [
    {
      id: 'ann-1',
      title: 'Chào mừng các nghệ sĩ đến với UniFLOWs Portal 2.0',
      type: 'important',
      date: '21/08/2026',
      content: 'Hệ thống đã nâng cấp toàn diện giao diện phát hành âm nhạc, đối soát doanh thu đa nền tảng và rút tiền tự động. Vui lòng kiểm tra thông tin tài khoản ngân hàng và hồ sơ nghệ sĩ của bạn.',
      active: true
    }
  ],
  city: 'Hồ Chí Minh · Việt Nam',
  artists: [
    {
      id: 'lumi',
      name: 'Lumi',
      genre: 'Alternative R&B',
      image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85',
      bio: 'Lumi pha trộn R&B mơ màng với những lát cắt rất thật của thành phố về đêm.',
      gallery: ['https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85'],
      monthlyStreams: '248.6K',
      estimatedRevenue: '18,400,000',
      payableBalance: '12,750,000',
      spotifyStreams: '150,000',
      spotifyRevenue: '10,500,000',
      appleStreams: '60,000',
      appleRevenue: '4,600,000',
      youtubeStreams: '28,000',
      youtubeRevenue: '2,300,000',
      otherStreams: '10,600',
      otherRevenue: '1,000,000',
      topCountry: 'Việt Nam',
      topCity: 'Hồ Chí Minh',
      topSource: 'Spotify Editorial & Algorithmic',
      products: [
        { title: 'Vệt Sáng', type: 'Single · 2026', slug: 'vet-sang', url: '#' },
        { title: 'Live at The Flow', type: 'Live session · 2026', slug: 'live-at-the-flow', url: '#' }
      ],
      instagram: '',
      youtube: '',
      tiktok: ''
    },
    {
      id: 'monotone',
      name: 'MONO//TONE',
      genre: 'Future Pop',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85',
      bio: 'MONO//TONE là dự án pop điện tử dành cho những nhịp điệu không đứng yên.',
      gallery: [],
      monthlyStreams: '0',
      estimatedRevenue: '0',
      payableBalance: '0',
      spotifyStreams: '0',
      spotifyRevenue: '0',
      appleStreams: '0',
      appleRevenue: '0',
      youtubeStreams: '0',
      youtubeRevenue: '0',
      otherStreams: '0',
      otherRevenue: '0',
      topCountry: 'Việt Nam',
      topCity: 'Hồ Chí Minh',
      topSource: 'DSP Organic Search',
      products: [
        { title: 'Dải Tần', type: 'EP · 2026', slug: 'dai-tan', url: '#' }
      ],
      instagram: '',
      youtube: '',
      tiktok: ''
    },
    {
      id: 'kaii',
      name: 'KAII',
      genre: 'Hip-hop / Rap',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
      bio: 'KAII kể những câu chuyện đời thường bằng flow sắc nét và trực diện.',
      gallery: [],
      monthlyStreams: '0',
      estimatedRevenue: '0',
      payableBalance: '0',
      spotifyStreams: '0',
      spotifyRevenue: '0',
      appleStreams: '0',
      appleRevenue: '0',
      youtubeStreams: '0',
      youtubeRevenue: '0',
      otherStreams: '0',
      otherRevenue: '0',
      topCountry: 'Việt Nam',
      topCity: 'Hồ Chí Minh',
      topSource: 'DSP Organic Search',
      products: [
        { title: 'Đường Đua', type: 'Single · 2026', slug: 'duong-dua', url: '#' }
      ],
      instagram: '',
      youtube: '',
      tiktok: ''
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

export function getLocalCachedData() {
  try {
    const cached = localStorage.getItem('uniflows-content');
    return cached ? { ...defaultData, ...JSON.parse(cached) } : defaultData;
  } catch {
    return defaultData;
  }
}

export async function getData() {
  const cached = getLocalCachedData();
  if (!isSupabaseConfigured()) {
    return cached;
  }

  try {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'main')
      .single();

    const { data: artistsData } = await supabase
      .from('artists')
      .select('*, releases(*)');

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
      
      // Parse emails
      if (Array.isArray(settings.emails) && settings.emails.length > 0) {
        merged.emails = settings.emails;
      } else if (settings.emails && typeof settings.emails === 'object' && Object.keys(settings.emails).length > 0) {
        merged.emails = Object.entries(settings.emails).map(([label, email]) => ({ label, email }));
      } else if (cached.emails && Array.isArray(cached.emails) && cached.emails.length > 0) {
        merged.emails = cached.emails;
      } else {
        merged.emails = defaultData.emails;
      }

      // Parse announcements for artist portal
      if (Array.isArray(settings.announcements)) {
        merged.announcements = settings.announcements;
      } else if (cached.announcements && Array.isArray(cached.announcements)) {
        merged.announcements = cached.announcements;
      } else {
        merged.announcements = defaultData.announcements;
      }

      merged.city = settings.city || merged.city;
    }

    if (artistsData && artistsData.length > 0) {
      merged.artists = artistsData.map(a => {
        const localCachedArtist = (cached.artists || []).find(x => x.id === a.id) || {};
        const stats = (typeof a.stats === 'object' && a.stats) ? a.stats : {};
        return {
          id: a.id,
          name: a.name,
          email: a.email || stats.email || localCachedArtist.email || '',
          showOnWeb: a.show_on_web !== undefined ? a.show_on_web : (stats.showOnWeb !== undefined ? stats.showOnWeb : (localCachedArtist.showOnWeb !== undefined ? localCachedArtist.showOnWeb : true)),
          roleType: a.role_type || stats.roleType || localCachedArtist.roleType || 'distribution',
          genre: a.genre || 'Music',
          image: a.image,
          bio: a.bio,
          gallery: Array.isArray(a.gallery) ? a.gallery : (typeof a.gallery === 'string' ? JSON.parse(a.gallery || '[]') : []),
          instagram: a.instagram || '',
          youtube: a.youtube || '',
          tiktok: a.tiktok || '',
          monthlyStreams: a.monthly_streams !== undefined ? a.monthly_streams : (localCachedArtist.monthlyStreams || '0'),
          estimatedRevenue: a.estimated_revenue !== undefined ? a.estimated_revenue : (localCachedArtist.estimatedRevenue || '0'),
          payableBalance: a.payable_balance !== undefined ? a.payable_balance : (localCachedArtist.payableBalance || '0'),
          payoutCycle: a.payout_cycle || stats.payoutCycle || localCachedArtist.payoutCycle || 'Hàng tháng (Monthly)',
          royaltyRate: a.royalty_rate || stats.royaltyRate || localCachedArtist.royaltyRate || '80% Master',
          contractTerm: a.contract_term || stats.contractTerm || localCachedArtist.contractTerm || '2024 - 2027',
          spotifyStreams: stats.spotifyStreams || localCachedArtist.spotifyStreams || '0',
          spotifyRevenue: stats.spotifyRevenue || localCachedArtist.spotifyRevenue || '0',
          appleStreams: stats.appleStreams || localCachedArtist.appleStreams || '0',
          appleRevenue: stats.appleRevenue || localCachedArtist.appleRevenue || '0',
          youtubeStreams: stats.youtubeStreams || localCachedArtist.youtubeStreams || '0',
          youtubeRevenue: stats.youtubeRevenue || localCachedArtist.youtubeRevenue || '0',
          otherStreams: stats.otherStreams || localCachedArtist.otherStreams || '0',
          otherRevenue: stats.otherRevenue || localCachedArtist.otherRevenue || '0',
          topCountry: stats.topCountry || localCachedArtist.topCountry || 'Việt Nam',
          topCity: stats.topCity || localCachedArtist.topCity || 'Hồ Chí Minh',
          topSource: stats.topSource || localCachedArtist.topSource || 'Spotify Editorial & Algorithmic',
          products: (a.releases || []).map(r => {
            const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
            return {
              id: r.id,
              title: r.title,
              type: r.type || 'Single',
              slug: r.slug || '',
              submissionStatus: r.submission_status || 'Đã phát hành',
              links: r.links || {},
              audioUrl: r.audio_url || '',
              artworkUrl: r.artwork_url || '',
              streams: meta.streams || '0',
              revenue: meta.revenue || '0',
              playlists: Array.isArray(meta.playlists) ? meta.playlists : [],
              splits: Array.isArray(meta.splits) ? meta.splits : [],
              metadata: meta
            };
          })
        };
      });
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
    console.warn('Lỗi lấy dữ liệu từ Supabase, fallback dữ liệu cục bộ:', err);
    return cached;
  }
}

export async function saveData(data) {
  localStorage.setItem('uniflows-content', JSON.stringify(data));

  if (!isSupabaseConfigured()) return true;

  try {
    // 1. Save site_settings
    const settingsPayload = {
      id: 'main',
      tagline: data.tagline,
      hero_text: data.heroText,
      about_title: data.aboutTitle,
      about_text: data.aboutText,
      email: data.email,
      emails: data.emails || defaultData.emails,
      announcements: data.announcements || defaultData.announcements,
      city: data.city,
      updated_at: new Date().toISOString()
    };

    const { error: settingsError } = await supabase.from('site_settings').upsert(settingsPayload);
    if (settingsError) {
      delete settingsPayload.announcements;
      delete settingsPayload.emails;
      await supabase.from('site_settings').upsert(settingsPayload);
    }

    // 2. Save artists with complete stats json
    for (const a of data.artists) {
      const stats = {
        email: a.email || '',
        showOnWeb: a.showOnWeb !== false && a.showOnWeb !== 'false',
        roleType: a.roleType || 'distribution',
        payoutCycle: a.payoutCycle || 'Hàng tháng (Monthly)',
        royaltyRate: a.royaltyRate || '80% Master',
        contractTerm: a.contractTerm || '2024 - 2027',
        spotifyStreams: a.spotifyStreams || '0',
        spotifyRevenue: a.spotifyRevenue || '0',
        appleStreams: a.appleStreams || '0',
        appleRevenue: a.appleRevenue || '0',
        youtubeStreams: a.youtubeStreams || '0',
        youtubeRevenue: a.youtubeRevenue || '0',
        otherStreams: a.otherStreams || '0',
        otherRevenue: a.otherRevenue || '0',
        topCountry: a.topCountry || 'Việt Nam',
        topCity: a.topCity || 'Hồ Chí Minh',
        topSource: a.topSource || 'Spotify Editorial & Algorithmic'
      };

      const artistPayload = {
        id: a.id,
        name: a.name,
        genre: a.genre,
        image: a.image,
        bio: a.bio,
        gallery: a.gallery || [],
        instagram: a.instagram || '',
        youtube: a.youtube || '',
        tiktok: a.tiktok || '',
        monthly_streams: a.monthlyStreams || '0',
        estimated_revenue: a.estimatedRevenue || '0',
        payable_balance: a.payableBalance || '0',
        stats: stats
      };

      const { error: artistError } = await supabase.from('artists').upsert(artistPayload);
      if (artistError) {
        console.warn('Lỗi upsert artist đầy đủ, thử lại với payload cơ bản:', artistError.message);
        delete artistPayload.stats;
        delete artistPayload.monthly_streams;
        delete artistPayload.estimated_revenue;
        delete artistPayload.payable_balance;
        const { error: retryError } = await supabase.from('artists').upsert(artistPayload);
        if (retryError) console.error('Lỗi khi lưu nghệ sĩ lên Supabase:', retryError.message);
      }
    }

    // 3. Save articles
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
