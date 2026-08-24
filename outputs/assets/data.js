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
  adminAccounts: [
    {
      id: 'admin-super',
      username: 'admin',
      email: 'admin@uniflowslabel.com',
      name: 'UniFLOWs Super Admin',
      password: 'UniFLOWs2026!',
      role: 'admin',
      createdAt: '2026-08-20'
    }
  ],
  artists: [],
  articles: [],
  publishing: {
    basePrices: {
      commercial: 15000000,
      film: 10000000,
      series: 6000000,
      gaming: 4000000,
      creator: 2500000,
      event: 5000000
    },
    bundleDiscounts: {
      b10: { count: 10, discountPct: 15, name: 'Gói Mini Sync (10 bài - Giảm 15%)' },
      b15: { count: 15, discountPct: 25, name: 'Gói Pro Film (15 bài - Giảm 25%)' },
      b20: { count: 20, discountPct: 35, name: 'Gói Agency Master (20 bài - Giảm 35%)' },
      full: { discountPct: 50, name: 'Cấp phép Toàn bộ Catalogue (Full Catalog License - Giảm 50%)' }
    },
    terms: 'Bao gồm Master Recording + Publishing Rights (100% Pre-cleared). Cấp phép sử dụng cho toàn cầu, bao gồm giấy phép điện tử và hóa đơn tài chính.',
    customTracks: [],
    certificates: [],
    songwriterSubmissions: [],
    syncLicenseRequests: []
  },
  unihube: {
    heroTitle: 'Tổ Đội Sản Xuất Âm Nhạc & Kỹ Thuật Âm Thanh Đỉnh Cao',
    heroSubtitle: 'Tập hợp các Music Producers, Songwriters, Mixing & Mastering Engineers và Beatmakers định hình bản sắc âm thanh hiện đại cho UniFLOWs Label.',
    services: [
      {
        id: 'full-production',
        title: 'Sản xuất Ca khúc Trọn gói (Full Production)',
        desc: 'Hòa âm phối khí (Beat & Arrangement), định hướng phong cách âm nhạc, thu âm studio và sản xuất bản Master hoàn chỉnh.',
        price: 'Từ ₫ 12,000,000 / bài'
      },
      {
        id: 'mixing-mastering',
        title: 'Mixing & Mastering Studio 24-Bit Lossless',
        desc: 'Xử lý cân bằng dải tần, chiều sâu âm học stereo và Master đạt chuẩn Loudness DSP (Apple Digital Masters, Spotify, Dolby Atmos).',
        price: 'Từ ₫ 3,500,000 / bài'
      },
      {
        id: 'songwriting-topline',
        title: 'Sáng tác Giai điệu & Lời bài hát (Songwriting)',
        desc: 'Viết Topline, Melody bắt tai và ca từ mang dấu ấn cá nhân phù hợp với giọng hát và thông điệp của nghệ sĩ.',
        price: 'Từ ₫ 8,000,000 / bài'
      },
      {
        id: 'vocal-production',
        title: 'Vocal Tuning & Xử lý Thanh nhạc Chuyên sâu',
        desc: 'Chỉnh phô cao độ Melodyne thủ công, gọt nhịp, bè phối hòa thanh và xử lý không gian vocal bay bổng.',
        price: 'Từ ₫ 1,500,000 / bài'
      }
    ],
    producers: [],
    inquiries: [],
    budgetTiers: [
      'Dưới 5 Triệu VNĐ (Vocal Tuning / Demo / Beat Indie)',
      '5 - 10 Triệu VNĐ (Sáng tác Topline / Mixing & Mastering)',
      '10 - 20 Triệu VNĐ (Sản xuất Single Tiêu chuẩn)',
      '20 - 40 Triệu VNĐ (Sản xuất Single Cao cấp & Dolby Atmos)',
      '40 - 80 Triệu VNĐ (Sản xuất Trọn gói EP 3 - 5 Bài)',
      '80 - 150 Triệu VNĐ (Sản xuất Full Album / Live Session)',
      'Trên 150 Triệu VNĐ (TVC / Quảng Cáo / Dự Án Hãng Đĩa Lớn)',
      'Thỏa thuận linh hoạt theo khối lượng công việc'
    ]
  },
  collective48k: {
    heroTitle: 'Agency Truyền Thông Âm Nhạc & Phân Phối Toàn Cầu',
    heroSubtitle: 'Đơn vị phát triển chiến dịch ra mắt (Release Campaign), viral TikTok, PR Báo chí và phân phối tới 150+ nền tảng streaming quốc tế thuộc UniFLOWs Label.',
    services: [
      {
        id: 'pr-pitching',
        title: 'Music PR & DSP Editorial Pitching',
        desc: 'Pitching ca khúc trực tiếp tới các Editors của Spotify (New Music Friday, Hot Hits Vietnam) và Apple Music.',
        stats: '92% Tỷ lệ vào Playlist chính thức'
      },
      {
        id: 'tiktok-viral',
        title: 'TikTok Sound Viral & Creator Seeding',
        desc: 'Đẩy sound lên xu hướng TikTok, hợp tác với 100+ Top Creators để tạo trend nhảy, biến hình và capcut templates.',
        stats: '10M+ Lượt tiếp cận trung bình'
      },
      {
        id: 'press-media',
        title: 'PR Báo chí & Truyền thông Bùng nổ',
        desc: 'Phát hành thông cáo báo chí, bài viết độc quyền trên Zing News, Kênh14, Vietcetera, Tuổi Trẻ, Billboard VN.',
        stats: '20+ Đầu báo uy tín'
      },
      {
        id: 'global-distro',
        title: 'Phân phối Âm nhạc Toàn cầu 150+ DSPs',
        desc: 'Đưa nhạc lên Spotify, Apple Music, YouTube Music, Amazon, Deezer, Tidal với chứng nhận bản quyền ISRC/UPC.',
        stats: '150+ Quốc gia'
      }
    ],
    caseStudies: [],
    proposals: []
  },
  musicSubmissions: []
};

const MOCK_IDS = {
  artists: ['lumi', 'monotone', 'kaii', 'the-flow'],
  tracks: ['pub-ext-1', 'pub-ext-2', 'pub-ext-3', 'pub-ext-4'],
  producers: ['prod-alexandre', 'prod-minhdang', 'prod-hoangyen'],
  caseStudies: ['cs-1', 'cs-2'],
  submissions: ['sub-demo-101', 'sub-demo-102']
};

export function getLocalCachedData() {
  try {
    const raw = localStorage.getItem('uniflows-content');
    if (!raw) return JSON.parse(JSON.stringify(defaultData));
    const parsed = JSON.parse(raw);

    // Deep sanitize old mock data from cache
    if (Array.isArray(parsed.artists)) {
      parsed.artists = parsed.artists.filter(a => !MOCK_IDS.artists.includes(a.id));
    }
    if (parsed.publishing && Array.isArray(parsed.publishing.customTracks)) {
      parsed.publishing.customTracks = parsed.publishing.customTracks.filter(t => !MOCK_IDS.tracks.includes(t.id));
    }
    if (parsed.unihube && Array.isArray(parsed.unihube.producers)) {
      parsed.unihube.producers = parsed.unihube.producers.filter(p => !MOCK_IDS.producers.includes(p.id));
    }
    if (parsed.collective48k && Array.isArray(parsed.collective48k.caseStudies)) {
      parsed.collective48k.caseStudies = parsed.collective48k.caseStudies.filter(c => !MOCK_IDS.caseStudies.includes(c.id));
    }
    if (Array.isArray(parsed.musicSubmissions)) {
      parsed.musicSubmissions = parsed.musicSubmissions.filter(s => !MOCK_IDS.submissions.includes(s.id));
    }

    const result = { ...defaultData, ...parsed };
    if (Array.isArray(parsed.artists)) {
      result.artists = parsed.artists;
    }
    return result;
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
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

      // Parse publishing data
      if (settings.publishing && typeof settings.publishing === 'object') {
        const pub = { ...defaultData.publishing, ...settings.publishing };
        if (Array.isArray(pub.customTracks)) {
          pub.customTracks = pub.customTracks.filter(t => !MOCK_IDS.tracks.includes(t.id));
        }
        merged.publishing = pub;
      } else if (cached.publishing && typeof cached.publishing === 'object') {
        merged.publishing = cached.publishing;
      } else {
        merged.publishing = defaultData.publishing;
      }

      // Parse Uni-HUBE data
      if (settings.unihube && typeof settings.unihube === 'object') {
        const hube = { ...defaultData.unihube, ...settings.unihube };
        if (Array.isArray(hube.producers)) {
          hube.producers = hube.producers.filter(p => !MOCK_IDS.producers.includes(p.id));
        }
        merged.unihube = hube;
      } else if (cached.unihube && typeof cached.unihube === 'object') {
        merged.unihube = cached.unihube;
      } else {
        merged.unihube = defaultData.unihube;
      }

      // Parse 48K Collective data
      if (settings.collective48k && typeof settings.collective48k === 'object') {
        const col48k = { ...defaultData.collective48k, ...settings.collective48k };
        if (Array.isArray(col48k.caseStudies)) {
          col48k.caseStudies = col48k.caseStudies.filter(c => !MOCK_IDS.caseStudies.includes(c.id));
        }
        merged.collective48k = col48k;
      } else if (cached.collective48k && typeof cached.collective48k === 'object') {
        merged.collective48k = cached.collective48k;
      } else {
        merged.collective48k = defaultData.collective48k;
      }

      // Parse admin accounts
      if (Array.isArray(settings.admin_accounts)) {
        merged.adminAccounts = settings.admin_accounts;
      } else if (cached.adminAccounts && Array.isArray(cached.adminAccounts)) {
        merged.adminAccounts = cached.adminAccounts;
      } else {
        merged.adminAccounts = defaultData.adminAccounts;
      }

      // Parse music submissions (A&R Demos)
      if (Array.isArray(settings.music_submissions)) {
        merged.musicSubmissions = settings.music_submissions.filter(s => !MOCK_IDS.submissions.includes(s.id));
      } else if (cached.musicSubmissions && Array.isArray(cached.musicSubmissions)) {
        merged.musicSubmissions = cached.musicSubmissions.filter(s => !MOCK_IDS.submissions.includes(s.id));
      } else {
        merged.musicSubmissions = [];
      }

      merged.city = settings.city || merged.city;
    }

    if (artistsData) {
      const mappedSupabaseArtists = artistsData
        .filter(a => !MOCK_IDS.artists.includes(a.id))
        .map(a => {
          const localCachedArtist = (cached.artists || []).find(x => x.id === a.id) || {};
          const stats = (typeof a.stats === 'object' && a.stats) ? a.stats : {};
          return {
            id: a.id,
            name: a.name,
            username: a.username || stats.username || localCachedArtist.username || a.id,
            password: a.password || stats.password || localCachedArtist.password || (localCachedArtist.name ? `${localCachedArtist.name}@2026` : 'Uniflows@2026'),
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
            publishingRevenue: stats.publishingRevenue || localCachedArtist.publishingRevenue || '0',
            publishingRoyaltyRate: stats.publishingRoyaltyRate || localCachedArtist.publishingRoyaltyRate || '75%',
            publishingContracts: Array.isArray(stats.publishingContracts) ? stats.publishingContracts : (localCachedArtist.publishingContracts || []),
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

      merged.artists = mappedSupabaseArtists;
    } else if (cached.artists) {
      merged.artists = cached.artists.filter(a => !MOCK_IDS.artists.includes(a.id));
    } else {
      merged.artists = [];
    }

    if (articlesData) {
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
  if (Array.isArray(data.artists)) {
    data.artist_order = data.artists.map(a => a.id);
  }
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
      publishing: data.publishing || defaultData.publishing,
      unihube: data.unihube || defaultData.unihube,
      collective48k: data.collective48k || defaultData.collective48k,
      admin_accounts: data.adminAccounts || defaultData.adminAccounts,
      music_submissions: data.musicSubmissions || defaultData.musicSubmissions,
      artist_order: data.artist_order || (data.artists || []).map(a => a.id),
      city: data.city,
      updated_at: new Date().toISOString()
    };

    const { error: settingsError } = await supabase.from('site_settings').upsert(settingsPayload);
    if (settingsError) {
      delete settingsPayload.announcements;
      delete settingsPayload.emails;
      delete settingsPayload.publishing;
      delete settingsPayload.unihube;
      delete settingsPayload.collective48k;
      delete settingsPayload.admin_accounts;
      delete settingsPayload.music_submissions;
      await supabase.from('site_settings').upsert(settingsPayload);
    }

    // 2. Save artists with complete stats json
    if (Array.isArray(data.artists)) {
      for (const a of data.artists) {
        if (MOCK_IDS.artists.includes(a.id)) continue;
        const stats = {
          username: a.username || a.id,
          password: a.password || '',
          email: a.email || '',
          showOnWeb: a.showOnWeb !== false && a.showOnWeb !== 'false',
          roleType: a.roleType || 'distribution',
          payoutCycle: a.payoutCycle || 'Hàng tháng (Monthly)',
          royaltyRate: a.royaltyRate || '80% Master',
          contractTerm: a.contractTerm || '2024 - 2027',
          publishingRevenue: a.publishingRevenue || '0',
          publishingRoyaltyRate: a.publishingRoyaltyRate || '75%',
          publishingContracts: a.publishingContracts || [],
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
          genre: a.genre || 'Music',
          image: a.image,
          bio: a.bio,
          gallery: a.gallery || [],
          instagram: a.instagram || '',
          youtube: a.youtube || '',
          tiktok: a.tiktok || '',
          monthly_streams: String(a.monthlyStreams || '0'),
          estimated_revenue: String(a.estimatedRevenue || '0'),
          payable_balance: String(a.payableBalance || '0'),
          stats: stats,
          updated_at: new Date().toISOString()
        };

        await supabase.from('artists').upsert(artistPayload);
      }
    }

    return true;
  } catch (err) {
    console.error('Lỗi khi lưu dữ liệu lên Supabase:', err);
    return false;
  }
}
