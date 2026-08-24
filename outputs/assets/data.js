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
  artists: [
    {
      id: 'lumi',
      name: 'Lumi',
      genre: 'Dream Pop / Indie',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      bio: 'Lumi tạo nên không gian âm nhạc bay bổng với những thanh âm lơ lửng, ca từ mộng mị và sự hòa quyện tinh tế giữa giai điệu pop hiện đại và nét mộc mạc của indie pop.',
      gallery: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80'
      ],
      showOnWeb: true,
      roleType: 'exclusive',
      monthlyStreams: '450,000',
      estimatedRevenue: '25,000,000',
      payableBalance: '18,500,000',
      payoutCycle: 'Hàng tháng (Monthly)',
      royaltyRate: '85% Master',
      contractTerm: '2024 - 2027',
      instagram: 'https://instagram.com/uniflowslabel',
      youtube: 'https://youtube.com',
      tiktok: 'https://tiktok.com',
      products: [
        {
          id: 'rel-lumi-1',
          title: 'Vệt Sáng',
          type: 'Single',
          slug: 'vet-sang',
          submissionStatus: 'Đã phát hành',
          artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
          audioUrl: '',
          links: {
            spotify: 'https://open.spotify.com',
            apple: 'https://music.apple.com',
            youtube: 'https://youtube.com',
            soundcloud: 'https://soundcloud.com'
          },
          streams: '280,000',
          revenue: '15,400,000',
          playlists: ['New Music Friday', 'Indie Vietnam'],
          splits: [],
          userRole: 'Main',
          isSplit: false,
          percentage: 100
        },
        {
          id: 'rel-lumi-2',
          title: 'Mơ Giữa Ban Ngày',
          type: 'Single',
          slug: 'mo-giua-ban-ngay',
          submissionStatus: 'Đã phát hành',
          artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
          audioUrl: '',
          links: {
            spotify: 'https://open.spotify.com',
            apple: 'https://music.apple.com'
          },
          streams: '170,000',
          revenue: '9,600,000',
          playlists: ['Hot Hits Vietnam'],
          splits: [],
          userRole: 'Main',
          isSplit: false,
          percentage: 100
        }
      ]
    },
    {
      id: '48k',
      name: '48K',
      genre: 'Electronic / Future Bass',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
      bio: 'Tập hợp các nhà sản xuất âm thanh điện tử tiên phong, mang năng lượng bùng nổ từ club đến các sân khấu lễ hội lớn với chất lượng chuẩn 48kHz lossless.',
      gallery: [
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80'
      ],
      showOnWeb: true,
      roleType: 'exclusive',
      monthlyStreams: '620,000',
      estimatedRevenue: '34,000,000',
      payableBalance: '22,000,000',
      payoutCycle: 'Hàng tháng (Monthly)',
      royaltyRate: '80% Master',
      contractTerm: '2024 - 2028',
      instagram: 'https://instagram.com/uniflowslabel',
      youtube: 'https://youtube.com',
      tiktok: 'https://tiktok.com',
      products: [
        {
          id: 'rel-48k-1',
          title: 'Digital Waves',
          type: 'Single',
          slug: 'digital-waves',
          submissionStatus: 'Đã phát hành',
          artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
          audioUrl: '',
          links: {
            spotify: 'https://open.spotify.com',
            apple: 'https://music.apple.com'
          },
          streams: '390,000',
          revenue: '21,500,000',
          playlists: ['EDM Hits Vietnam', 'Dance Party'],
          splits: [],
          userRole: 'Main',
          isSplit: false,
          percentage: 100
        }
      ]
    },
    {
      id: 'vule',
      name: 'Vũ Lê',
      genre: 'R&B / Neo-Soul',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      bio: 'Giọng hát ấm áp kết hợp cùng hòa âm R&B hiện đại và ca từ giàu tính tự sự, tạo nên những giai điệu đêm muộn đầy cảm xúc.',
      gallery: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
      ],
      showOnWeb: true,
      roleType: 'exclusive',
      monthlyStreams: '290,000',
      estimatedRevenue: '16,000,000',
      payableBalance: '11,200,000',
      payoutCycle: 'Hàng tháng (Monthly)',
      royaltyRate: '80% Master',
      contractTerm: '2025 - 2028',
      instagram: 'https://instagram.com/uniflowslabel',
      youtube: 'https://youtube.com',
      tiktok: 'https://tiktok.com',
      products: [
        {
          id: 'rel-vule-1',
          title: 'Lạc Nhịp',
          type: 'Single',
          slug: 'lac-nhip',
          submissionStatus: 'Đã phát hành',
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
          audioUrl: '',
          links: {
            spotify: 'https://open.spotify.com',
            apple: 'https://music.apple.com'
          },
          streams: '290,000',
          revenue: '16,000,000',
          playlists: ['R&B Vietnam', 'Late Night Vibes'],
          splits: [],
          userRole: 'Main',
          isSplit: false,
          percentage: 100
        }
      ]
    },
    {
      id: 'monotone',
      name: 'Monotone',
      genre: 'Indie Rock / Alternative',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      bio: 'Âm hưởng guitar gai góc, tiếng trống dồn dập cùng tinh thần tự do phóng khoáng đại diện cho làn sóng indie rock mới tại Việt Nam.',
      gallery: [
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
      ],
      showOnWeb: true,
      roleType: 'exclusive',
      monthlyStreams: '195,000',
      estimatedRevenue: '10,800,000',
      payableBalance: '7,500,000',
      payoutCycle: 'Hàng tháng (Monthly)',
      royaltyRate: '80% Master',
      contractTerm: '2024 - 2027',
      instagram: 'https://instagram.com/uniflowslabel',
      youtube: 'https://youtube.com',
      tiktok: 'https://tiktok.com',
      products: [
        {
          id: 'rel-monotone-1',
          title: 'Khoảng Lặng',
          type: 'Single',
          slug: 'khoang-lang',
          submissionStatus: 'Đã phát hành',
          artworkUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
          audioUrl: '',
          links: {
            spotify: 'https://open.spotify.com',
            apple: 'https://music.apple.com'
          },
          streams: '195,000',
          revenue: '10,800,000',
          playlists: ['Rock Vietnam', 'Indie Stage'],
          splits: [],
          userRole: 'Main',
          isSplit: false,
          percentage: 100
        }
      ]
    }
  ],
  articles: [
    {
      id: 'art-1',
      title: 'UniFLOWs Label công bố chiến lược phát triển âm nhạc thế hệ mới',
      category: 'Tin Tức',
      date: '22/08/2026',
      author: 'UniFLOWs Editorial',
      readTime: '3 phút đọc',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Mở rộng hệ sinh thái phân phối toàn cầu, nâng cấp nền tảng quản trị quyền sở hữu trí tuệ và hỗ trợ nghệ sĩ độc lập tối đa doanh thu.',
      body: 'UniFLOWs Label chính thức công bố lộ trình phát triển giai đoạn 2026 - 2030, tập trung vào ba trụ cột cốt lõi: Phân phối âm nhạc toàn cầu trên hơn 150+ nền tảng streaming, phát triển hệ thống cấp phép bản quyền Sync Licensing cho phim ảnh, quảng cáo (UniPUBLISHING), và xây dựng tổ đội sản xuất âm thanh chuyên sâu (Uni-HUBE).\n\nVới cam kết minh bạch 100% doanh thu đối soát theo thời gian thực, UniFLOWs tiếp tục là bệ phóng uy tín hàng đầu cho các nghệ sĩ và nhà sản xuất âm nhạc tại Việt Nam.',
      published: true
    },
    {
      id: 'art-2',
      title: 'Ra mắt nền tảng UniPUBLISHING - Cấp phép bản quyền âm nhạc số 1',
      category: 'Phát Hành',
      date: '20/08/2026',
      author: 'Ban Bản Quyền UniFLOWs',
      readTime: '4 phút đọc',
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Giải pháp cấp phép âm nhạc trọn gói (Pre-cleared Master & Publishing Rights) dành cho TVC, phim điện ảnh, series truyền hình và creators.',
      body: 'Nhằm giải quyết những phức tạp trong quy trình xin phép tác quyền âm nhạc thương mại, UniPUBLISHING ra đời với 100% danh mục tác phẩm đã được tiền xử lý bản quyền (Pre-cleared).\n\nKhách hàng là các đạo diễn, production house, agency quảng cáo và nhà sáng tạo nội dung có thể dễ dàng nghe thử, lựa chọn theo tâm trạng, thể loại và nhận chứng nhận cấp phép điện tử hợp pháp chỉ sau vài cú click.',
      published: true
    },
    {
      id: 'art-3',
      title: 'Uni-HUBE: Không gian hội tụ các nhà sản xuất và kỹ sư âm thanh hàng đầu',
      category: 'Đội Ngũ',
      date: '18/08/2026',
      author: 'A&R Team',
      readTime: '3 phút đọc',
      cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Hội tụ các Music Producer, Mixing & Mastering Engineer 24-bit Lossless, Topline Songwriters định hình âm thanh hiện đại.',
      body: 'Uni-HUBE là ngôi nhà chung kết nối các Music Producers, Songwriters, Mixing & Mastering Engineers và Beatmakers tài năng. Với tiêu chuẩn phòng thu đạt chuẩn Apple Digital Masters và Dolby Atmos, Uni-HUBE đồng hành cùng các nghệ sĩ từ bản thu demo đầu tiên đến sản phẩm master hoàn hảo nhất.',
      published: true
    }
  ],
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
  musicSubmissions: [],
  shortlinks: [
    {
      id: 'short-demo',
      slug: 'demo',
      targetUrl: 'https://uniflowslabel.com/submit-music',
      title: 'Form Gửi Demo A&R',
      clicks: 0,
      createdAt: '2026-08-24'
    },
    {
      id: 'short-hube',
      slug: 'hube',
      targetUrl: 'https://uniflowslabel.com/unihube',
      title: 'Uni-HUBE Production Team',
      clicks: 0,
      createdAt: '2026-08-24'
    },
    {
      id: 'short-48k',
      slug: '48k',
      targetUrl: 'https://uniflowslabel.com/48kcollective',
      title: '48K Music Marketing Collective',
      clicks: 0,
      createdAt: '2026-08-24'
    }
  ]
};

const MOCK_IDS = {
  artists: [],
  tracks: [],
  producers: [],
  caseStudies: [],
  submissions: []
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
    // Run queries in parallel with a 3.5s timeout protection to prevent UI freeze
    const fetchPromise = Promise.all([
      supabase.from('site_settings').select('*').eq('id', 'main').single(),
      supabase.from('artists').select('*'),
      supabase.from('releases').select('*'),
      supabase.from('articles').select('*').order('created_at', { ascending: false })
    ]);

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
    const results = await Promise.race([fetchPromise, timeoutPromise]);

    if (!results) {
      console.warn('Supabase fetch timed out, falling back to local cache');
      return cached;
    }

    const [settingsRes, artistsRes, releasesRes, articlesRes] = results;
    const settings = settingsRes?.data;
    const artistsData = artistsRes?.data;
    const releasesData = Array.isArray(releasesRes?.data) ? releasesRes.data : [];
    const articlesData = articlesRes?.data;

    const merged = { ...cached };

    if (settings) {
      merged.tagline = settings.tagline || merged.tagline || defaultData.tagline;
      merged.heroText = settings.hero_text || settings.heroText || merged.heroText || defaultData.heroText;
      merged.aboutTitle = settings.about_title || settings.aboutTitle || merged.aboutTitle || defaultData.aboutTitle;
      merged.aboutText = settings.about_text || settings.aboutText || merged.aboutText || defaultData.aboutText;
      merged.email = settings.email || merged.email || defaultData.email;
      
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

      // Parse shortlinks
      if (Array.isArray(settings.shortlinks)) {
        merged.shortlinks = settings.shortlinks;
      } else if (cached.shortlinks && Array.isArray(cached.shortlinks)) {
        merged.shortlinks = cached.shortlinks;
      } else {
        merged.shortlinks = defaultData.shortlinks || [];
      }

      merged.city = settings.city || merged.city;
    }

    if (artistsData) {
      const mappedSupabaseArtists = artistsData
        .filter(a => !MOCK_IDS.artists.includes(a.id))
        .map(a => {
          const localCachedArtist = (cached.artists || []).find(x => x.id === a.id) || {};
          const stats = (typeof a.stats === 'object' && a.stats) ? a.stats : {};
          
          const directReleases = releasesData.filter(r => r.artist_id === a.id);
          const mappedReleases = directReleases.map(r => {
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
              userRole: meta.userRole || 'Main',
              isSplit: meta.isSplit || false,
              percentage: meta.percentage || 100,
              metadata: meta
            };
          });

          const finalProducts = mappedReleases.length > 0
            ? mappedReleases
            : (Array.isArray(stats.products) && stats.products.length > 0
                ? stats.products
                : (Array.isArray(localCachedArtist.products) ? localCachedArtist.products : []));

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
            products: finalProducts
          };
        });

      const artistOrder = settings?.artist_order || settings?.artistOrder || cached?.artist_order || cached?.artistOrder || [];
      if (Array.isArray(artistOrder) && artistOrder.length > 0) {
        mappedSupabaseArtists.sort((a, b) => {
          let idxA = artistOrder.indexOf(a.id);
          let idxB = artistOrder.indexOf(b.id);
          if (idxA === -1) idxA = 999;
          if (idxB === -1) idxB = 999;
          return idxA - idxB;
        });
      }

      merged.artists = mappedSupabaseArtists.length > 0 ? mappedSupabaseArtists : (cached.artists?.length > 0 ? cached.artists : defaultData.artists);
      merged.artist_order = merged.artists.map(a => a.id);
    } else if (cached.artists && cached.artists.length > 0) {
      merged.artists = cached.artists.filter(a => !MOCK_IDS.artists.includes(a.id));
      merged.artist_order = merged.artists.map(a => a.id);
    } else {
      merged.artists = defaultData.artists;
      merged.artist_order = defaultData.artists.map(a => a.id);
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
    } else if (cached.articles && cached.articles.length > 0) {
      merged.articles = cached.articles;
    } else {
      merged.articles = defaultData.articles;
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
    // 1. Save site_settings safely
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
      shortlinks: data.shortlinks || defaultData.shortlinks || [],
      artist_order: data.artist_order || (data.artists || []).map(a => a.id),
      city: data.city,
      updated_at: new Date().toISOString()
    };

    try {
      const { error: settingsError } = await supabase.from('site_settings').upsert(settingsPayload);
      if (settingsError) {
        console.warn('Upsert site_settings full error, trying without optional columns:', settingsError);
        const safePayload = {
          id: 'main',
          tagline: data.tagline,
          hero_text: data.heroText,
          about_title: data.aboutTitle,
          about_text: data.aboutText,
          email: data.email,
          city: data.city,
          shortlinks: data.shortlinks || defaultData.shortlinks || [],
          announcements: data.announcements || defaultData.announcements,
          publishing: data.publishing || defaultData.publishing,
          unihube: data.unihube || defaultData.unihube,
          updated_at: new Date().toISOString()
        };
        await supabase.from('site_settings').upsert(safePayload);
      }
    } catch (sErr) {
      console.warn('site_settings upsert caught error:', sErr);
    }

    // 2. Save artists & releases in parallel
    if (Array.isArray(data.artists)) {
      const artistPromises = data.artists.filter(a => !MOCK_IDS.artists.includes(a.id)).map(async a => {
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
          topSource: a.topSource || 'Spotify Editorial & Algorithmic',
          products: a.products || []
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

        // Save products into releases table
        if (Array.isArray(a.products)) {
          for (const p of a.products) {
            const relSlug = p.slug || String(p.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const relPayload = {
              id: p.id || `rel-${Date.now()}-${relSlug}`,
              artist_id: a.id,
              title: p.title || 'Untitled Release',
              type: p.type || 'Single',
              slug: relSlug,
              submission_status: p.submissionStatus || 'Đã phát hành',
              links: p.links || {},
              audio_url: p.audioUrl || '',
              artwork_url: p.artworkUrl || a.image || '',
              metadata: {
                streams: p.streams || '0',
                revenue: p.revenue || '0',
                playlists: p.playlists || [],
                splits: p.splits || [],
                userRole: p.userRole || 'Main',
                isSplit: p.isSplit || false,
                percentage: p.percentage || 100,
                ...(p.metadata || {})
              }
            };
            try {
              await supabase.from('releases').upsert(relPayload);
            } catch (e) {
              // ignore individual release upsert conflict
            }
          }
        }
      });

      await Promise.allSettled(artistPromises);
    }

    // 3. Save articles
    if (Array.isArray(data.articles)) {
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
    }

    return true;
  } catch (err) {
    console.error('Lỗi khi lưu dữ liệu lên Supabase:', err);
    return false;
  }
}

export function resetData() {
  localStorage.removeItem('uniflows-content');
}
