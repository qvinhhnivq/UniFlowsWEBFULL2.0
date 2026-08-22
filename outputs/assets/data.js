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
      username: 'lumi',
      email: 'lumi@uniflowslabel.com',
      password: 'Lumi@2026',
      name: 'Lumi',
      roleType: 'exclusive',
      genre: 'Alternative R&B',
      image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85',
      bio: 'Lumi pha trộn R&B mơ màng với những lát cắt rất thật của thành phố về đêm.',
      gallery: ['https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85'],
      monthlyStreams: '248.6K',
      estimatedRevenue: '18,400,000',
      payableBalance: '12,750,000',
      publishingRevenue: '8,500,000',
      publishingRoyaltyRate: '75%',
      publishingContracts: [
        {
          id: 'sync-contract-1',
          trackTitle: 'Vệt Sáng',
          client: 'VTV / Đạo diễn Nguyễn Hà (Web Series “Ánh Đèn Đêm”)',
          mediaType: 'Phim Truyền hình / Web-Drama',
          territory: 'Việt Nam',
          term: '2 Năm (2 Years)',
          totalFee: 6000000,
          artistSplitPct: 75,
          artistEarning: 4500000,
          status: 'Đã cấp phép & Đã thanh toán',
          licensedDate: '15/08/2026'
        },
        {
          id: 'sync-contract-2',
          trackTitle: 'Live at The Flow',
          client: 'Sun Life Vietnam (Fashion & Art Exhibition Event)',
          mediaType: 'Sự kiện Trực tiếp / Triển lãm',
          territory: 'Việt Nam',
          term: '1 Năm (1 Year)',
          totalFee: 5000000,
          artistSplitPct: 80,
          artistEarning: 4000000,
          status: 'Đã cấp phép & Đã thanh toán',
          licensedDate: '18/08/2026'
        }
      ],
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
      username: 'monotone',
      email: 'monotone@uniflowslabel.com',
      password: 'Monotone@2026',
      name: 'MONO//TONE',
      roleType: 'exclusive',
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
      username: 'kaii',
      email: 'kaii@uniflowslabel.com',
      password: 'Kaii@2026',
      name: 'KAII',
      roleType: 'distribution',
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
    customTracks: [
      {
        id: 'pub-ext-1',
        title: 'Vệt Sáng',
        artist: 'Lumi',
        genre: 'Alternative R&B',
        mood: 'Dreamy · Nocturnal · Cinematic',
        bpm: '92 BPM · E Minor',
        audioUrl: '',
        isExternal: false,
        enabled: true
      },
      {
        id: 'pub-ext-2',
        title: 'Dải Tần',
        artist: 'MONO//TONE',
        genre: 'Future Pop',
        mood: 'Energetic · Neon · Modern',
        bpm: '124 BPM · A Major',
        audioUrl: '',
        isExternal: false,
        enabled: true
      },
      {
        id: 'pub-ext-3',
        title: 'Đường Đua',
        artist: 'KAII',
        genre: 'Hip-hop / Rap',
        mood: 'Bold · Aggressive · Action',
        bpm: '140 BPM · C Minor',
        audioUrl: '',
        isExternal: false,
        enabled: true
      },
      {
        id: 'pub-ext-4',
        title: 'Live at The Flow (Visual Session)',
        artist: 'Lumi',
        genre: 'Acoustic / Soul',
        mood: 'Warm · Intimate · Deep',
        bpm: '78 BPM · D Minor',
        audioUrl: '',
        isExternal: false,
        enabled: true
      }
    ],
    syncLicenseRequests: [
      {
        id: 'sync-req-101',
        trackTitle: 'Vệt Sáng',
        artistName: 'Lumi',
        clientName: 'Galaxy Studio / Phim “Chuyến Tàu Đêm”',
        clientEmail: 'producer@galaxystudio.vn',
        mediaType: 'Phim Điện ảnh / Chiếu rạp',
        territory: 'Toàn cầu (Worldwide)',
        term: 'Vĩnh viễn (In Perpetuity)',
        totalFee: 22000000,
        status: 'Chờ xét duyệt',
        requestedDate: '22/08/2026'
      },
      {
        id: 'sync-req-102',
        trackTitle: 'Đường Đua',
        artistName: 'KAII',
        clientName: 'Ogilvy Vietnam (TVC Honda Winner X)',
        clientEmail: 'licensing@ogilvy.vn',
        mediaType: 'TVC / Quảng cáo Thương mại',
        territory: 'Việt Nam',
        term: '1 Năm (1 Year)',
        totalFee: 15000000,
        status: 'Chờ xét duyệt',
        requestedDate: '22/08/2026'
      }
    ]
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
    producers: [
      {
        id: 'prod-alexandre',
        name: 'Alexandre Vũ (K-Nova)',
        role: 'Head of Production / Music Producer & Beatmaker',
        specialty: 'R&B / Soul, Future Bass, Synth-Pop',
        image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80',
        credits: 'Lumi - "Vệt Sáng", MONO//TONE - "Dải Tần", Sony Music TVC 2025',
        bio: '10+ năm kinh nghiệm sản xuất âm nhạc cho các nghệ sĩ hàng đầu và các chiến dịch quảng cáo TVC quốc tế.',
        sampleAudio: 'https://cdn.freesound.org/previews/518/518888_6142149-lq.mp3',
        priceRate: '₫ 15,000,000 / track',
        status: 'Sẵn sàng nhận dự án',
        tracks: [
          {
            title: 'Vệt Sáng',
            artist: 'Lumi',
            role: 'Music Producer / Beat & Arrangement',
            audioUrl: 'https://cdn.freesound.org/previews/518/518888_6142149-lq.mp3',
            streams: '2.4M Streams',
            releaseYear: '2026'
          },
          {
            title: 'Dải Tần',
            artist: 'MONO//TONE',
            role: 'Main Beatmaker & Vocal Producer',
            audioUrl: 'https://cdn.freesound.org/previews/410/410515_5121236-lq.mp3',
            streams: '1.8M Streams',
            releaseYear: '2025'
          },
          {
            title: 'City Lights (TVC)',
            artist: 'Sony Vietnam',
            role: 'Composer & Audio Producer',
            audioUrl: 'https://cdn.freesound.org/previews/448/448080_9159316-lq.mp3',
            streams: '5M+ Views',
            releaseYear: '2025'
          }
        ]
      },
      {
        id: 'prod-minhdang',
        name: 'Minh Đăng (SoundWizard)',
        role: 'Chief Sound Engineer / Mixing & Mastering Specialist',
        specialty: 'Dolby Atmos, 24-bit Studio Mastering, Vocal Tuning',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        credits: 'KAII - "Đường Đua", Live at The Flow EP, Showcase Vietnam 2026',
        bio: 'Kỹ sư âm thanh chứng nhận Apple Digital Masters, chuyên gia xử lý âm học và cân chỉnh không gian stereo sống động.',
        sampleAudio: 'https://cdn.freesound.org/previews/410/410515_5121236-lq.mp3',
        priceRate: '₫ 4,000,000 / mix & master',
        status: 'Sẵn sàng nhận dự án',
        tracks: [
          {
            title: 'Đường Đua (Dolby Atmos Master)',
            artist: 'KAII',
            role: 'Mixing & Mastering Engineer (Apple Digital Master)',
            audioUrl: 'https://cdn.freesound.org/previews/410/410515_5121236-lq.mp3',
            streams: '950K Streams',
            releaseYear: '2026'
          },
          {
            title: 'Live at The Flow EP',
            artist: 'UniFLOWs Roster',
            role: 'Stereo Outboard Mastering',
            audioUrl: 'https://cdn.freesound.org/previews/518/518888_6142149-lq.mp3',
            streams: '1.2M Streams',
            releaseYear: '2025'
          }
        ]
      },
      {
        id: 'prod-hoangyen',
        name: 'Hoàng Yến (Elena Topline)',
        role: 'Songwriter / Topline Vocalist & Composer',
        specialty: 'Ballad, Indie Pop, Contemporary R&B, Vietnamese Lyrics',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        credits: 'Nhạc phim "Ánh Đèn Đêm", Hợp âm Mơ - Single, TVC Sun Life 2026',
        bio: 'Nhạc sĩ sáng tác giai điệu bắt tai với chiều sâu cảm xúc và ca từ sâu sắc chạm tới trái tim người nghe.',
        sampleAudio: 'https://cdn.freesound.org/previews/448/448080_9159316-lq.mp3',
        priceRate: '₫ 9,000,000 / song',
        status: 'Sẵn sàng nhận dự án',
        tracks: [
          {
            title: 'Ánh Đèn Đêm (OST)',
            artist: 'Elena Topline x UniFLOWs',
            role: 'Songwriter & Topline Composer',
            audioUrl: 'https://cdn.freesound.org/previews/448/448080_9159316-lq.mp3',
            streams: '1.5M Streams',
            releaseYear: '2026'
          },
          {
            title: 'Hợp Âm Mơ',
            artist: 'Lumi ft. Elena',
            role: 'Melody & Lyrics Writer',
            audioUrl: 'https://cdn.freesound.org/previews/448/448080_9159316-lq.mp3',
            streams: '800K Streams',
            releaseYear: '2025'
          }
        ]
      }
    ],
    inquiries: [
      {
        id: 'inq-101',
        clientName: 'Ca sĩ Tuấn Kiệt',
        clientEmail: 'tuankiet.vocal@gmail.com',
        clientPhone: '0908123456',
        producerId: 'prod-alexandre',
        producerName: 'Alexandre Vũ (K-Nova)',
        serviceType: 'Sản xuất Ca khúc Trọn gói (Full Production)',
        budget: '15 - 20 Triệu VNĐ',
        deadline: '15/09/2026',
        notes: 'Cần làm 1 bài Pop R&B giai điệu tươi sáng ra mắt vào mùa thu.',
        status: 'Đang thảo luận',
        createdAt: '22/08/2026'
      }
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
    caseStudies: [
      {
        id: 'cs-1',
        title: 'Chiến dịch Ra mắt Single "Vệt Sáng" — Lumi',
        client: 'Lumi / UniFLOWs Music',
        tags: 'TikTok Trend + Editorial Playlist + PR Báo chí',
        reach: '2.4M Streams · #1 New Music Friday · 35M Views TikTok',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        summary: 'Chiến dịch kết hợp viral sound trend biến hình cùng 50 bài báo PR trên các trang tin văn hóa giải trí, đưa ca khúc lọt Top Viral 50 Spotify Vietnam.'
      },
      {
        id: 'cs-2',
        title: 'Chiến dịch EP "Dải Tần" — MONO//TONE',
        client: 'MONO//TONE x 48K Media',
        tags: 'Dolby Atmos + Visualizer Showcase + DSP Banner',
        reach: '1.8M Streams · Hero Banner Apple Music',
        image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
        summary: 'Định vị âm thanh pop điện tử thế hệ mới, phủ sóng toàn bộ các nền tảng streaming âm nhạc không gian (Spatial Audio).'
      }
    ],
    proposals: [
      {
        id: 'prop-201',
        clientName: 'Thái Sơn (Independent Artist)',
        clientEmail: 'thaison.music@gmail.com',
        clientPhone: '0912345678',
        packageType: 'Gói Viral TikTok + PR Báo chí 360',
        releaseDate: '01/10/2026',
        targetGoal: '500,000 Streams & Lọt Top Viral Spotify',
        budget: '25,000,000 VNĐ',
        notes: 'Single Pop Ballad đầu tay kết hợp với MV Cinematic.',
        status: 'Chờ phản hồi',
        createdAt: '22/08/2026'
      }
    ]
  }
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

      // Parse publishing data
      if (settings.publishing && typeof settings.publishing === 'object') {
        merged.publishing = settings.publishing;
      } else if (cached.publishing && typeof cached.publishing === 'object') {
        merged.publishing = cached.publishing;
      } else {
        merged.publishing = defaultData.publishing;
      }

      // Parse Uni-HUBE data (Preserve local items if Supabase column is empty or newly created)
      if (settings.unihube && typeof settings.unihube === 'object' && Array.isArray(settings.unihube.producers) && settings.unihube.producers.length > 0) {
        merged.unihube = settings.unihube;
      } else if (cached.unihube && typeof cached.unihube === 'object' && Array.isArray(cached.unihube.producers) && cached.unihube.producers.length > 0) {
        merged.unihube = cached.unihube;
      } else {
        merged.unihube = defaultData.unihube;
      }

      // Parse 48K Collective data
      if (settings.collective48k && typeof settings.collective48k === 'object' && Array.isArray(settings.collective48k.caseStudies) && settings.collective48k.caseStudies.length > 0) {
        merged.collective48k = settings.collective48k;
      } else if (cached.collective48k && typeof cached.collective48k === 'object' && Array.isArray(cached.collective48k.caseStudies) && cached.collective48k.caseStudies.length > 0) {
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

      merged.city = settings.city || merged.city;
    }

    if (artistsData && artistsData.length > 0) {
      const mappedSupabaseArtists = artistsData.map(a => {
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

      const supabaseArtistIds = new Set(artistsData.map(a => a.id));
      const localOnlyArtists = (cached.artists || []).filter(ca => !supabaseArtistIds.has(ca.id));
      merged.artists = [...mappedSupabaseArtists, ...localOnlyArtists];
    } else if (cached.artists && cached.artists.length > 0) {
      merged.artists = cached.artists;
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
      publishing: data.publishing || defaultData.publishing,
      unihube: data.unihube || defaultData.unihube,
      collective48k: data.collective48k || defaultData.collective48k,
      admin_accounts: data.adminAccounts || defaultData.adminAccounts,
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
      await supabase.from('site_settings').upsert(settingsPayload);
    }

    // 2. Save artists with complete stats json
    for (const a of data.artists) {
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
