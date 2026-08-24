// ============================================================================
// UNIFLOWS STANDALONE SMARTLINK ENGINE (High Reliability / Zero Module Dependency)
// ============================================================================

const SUPABASE_URL = 'https://oizygltqzavvymvmikzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9penlnbHRxemF2dnltdm1pa3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzMyOTcsImV4cCI6MjEwMjY0OTI5N30.LMaHfdvZ39LYYFAde35D4Q25Ua3H0LhE2s0_KnC5e_4';

const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function formatSocialUrl(u) {
  if (!u) return '';
  let str = String(u).trim();
  if (!str || str === '#' || str === 'javascript:void(0)') return '';
  str = str.replace(/^[#\s]+/, '');
  if (!str) return '';
  if (!/^https?:\/\//i.test(str)) {
    str = 'https://' + str;
  }
  return str;
}

function getLocalCached() {
  try {
    const raw = localStorage.getItem('uniflows-content');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// MAIN BOOTSTRAP
// ----------------------------------------------------------------------------
export async function initSmartLinkEngine() {
  const root = document.querySelector('[data-smartlink-page]') || document.body;
  if (!root) return;

  // 1. Parse Release Slug / ID from all possible URL formats
  const q = new URLSearchParams(location.search);
  const rawPath = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  const parts = rawPath.split('/').filter(Boolean);

  let releaseQuery = q.get('release') || q.get('r') || q.get('slug') || q.get('id') || q.get('track') || '';
  let artistQuery = q.get('artist') || q.get('a') || '';

  if (!releaseQuery && parts.length > 0) {
    const firstPart = parts[0].toLowerCase().replace(/\.html$/i, '');
    if (['listen', 'l', 'smartlink', 'song', 'track'].includes(firstPart)) {
      if (parts.length >= 3) {
        artistQuery = parts[1];
        releaseQuery = parts[2];
      } else if (parts.length >= 2) {
        releaseQuery = parts[1];
      }
    } else if (parts.length === 1 && !firstPart.includes('.html')) {
      releaseQuery = parts[0];
    }
  }

  if (releaseQuery) {
    releaseQuery = releaseQuery.replace(/\.html$/i, '').trim();
  }

  // 2. Fast 0ms render from Local Storage
  const cached = getLocalCached() || {};
  let rendered = false;
  const initialPool = buildReleasePool(cached.artists || [], [], cached.publishing?.customTracks || []);
  if (initialPool.length > 0) {
    rendered = tryRenderMatch(root, initialPool, releaseQuery);
  }

  if (!rendered) {
    root.innerHTML = `
      <div class="smart-bg-container" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#090a0f;"></div>
      <div class="smart-viewport" style="position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 16px;">
        <div style="text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;opacity:0.85;">💿</div>
          <p style="color:#ffffff;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Đang kết nối SmartLink...</p>
        </div>
      </div>
    `;
  }

  // 3. Ultra-fast REST Direct Fetch from Supabase (Zero SDK overhead)
  try {
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };

    const [relRes, artRes, setRes] = await Promise.allSettled([
      fetch(`${SUPABASE_URL}/rest/v1/releases?select=*&order=created_at.desc`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/artists?select=*`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=eq.main&select=*`, { headers }).then(r => r.ok ? r.json() : [])
    ]);

    const dbReleases = relRes.status === 'fulfilled' ? relRes.value : [];
    const dbArtists = artRes.status === 'fulfilled' ? artRes.value : [];
    const settings = (setRes.status === 'fulfilled' && Array.isArray(setRes.value) && setRes.value[0]) ? setRes.value[0] : {};
    const customTracks = settings.publishing?.customTracks || cached.publishing?.customTracks || [];

    const fullPool = buildReleasePool(dbArtists, dbReleases, customTracks);
    tryRenderMatch(root, fullPool, releaseQuery, true);
  } catch (err) {
    console.error('SmartLink REST fetch error:', err);
    if (!rendered) {
      tryRenderMatch(root, initialPool, releaseQuery, true);
    }
  }
}

// ----------------------------------------------------------------------------
// BUILD UNIFIED RELEASE POOL
// ----------------------------------------------------------------------------
function buildReleasePool(artists = [], releases = [], customTracks = []) {
  const pool = new Map();

  // 1. Releases from Supabase `releases` table
  releases.forEach(r => {
    const artObj = r.artists || artists.find(a => a.id === r.artist_id) || {};
    const artName = artObj.name || r.artist_id || 'UniFLOWs Artist';
    const artImg = artObj.image || r.artwork_url || '';
    const key = (r.slug || r.id || r.title || '').toLowerCase();

    pool.set(key, {
      id: r.id,
      title: r.title,
      type: r.type || 'Single',
      slug: r.slug || slug(r.title),
      artworkUrl: r.artwork_url || artImg,
      audioUrl: r.audio_url || '',
      links: r.links || {},
      metadata: r.metadata || {},
      artist: {
        id: r.artist_id || artObj.id,
        name: artName,
        image: artImg
      }
    });
  });

  // 2. Releases from `artists.stats.products` or `artists.products`
  artists.forEach(art => {
    const stats = (typeof art.stats === 'object' && art.stats) ? art.stats : (typeof art.stats === 'string' ? JSON.parse(art.stats || '{}') : {});
    const prods = Array.isArray(art.products) ? art.products : (Array.isArray(stats.products) ? stats.products : []);

    prods.forEach(p => {
      const relSlug = p.slug || slug(p.title);
      const key = (relSlug || p.id || p.title || '').toLowerCase();

      if (!pool.has(key)) {
        pool.set(key, {
          id: p.id || `rel-${relSlug}`,
          title: p.title,
          type: p.type || 'Single',
          slug: relSlug,
          artworkUrl: p.artworkUrl || p.artwork_url || art.image,
          audioUrl: p.audioUrl || p.audio_url || '',
          links: p.links || {},
          metadata: p.metadata || {},
          artist: {
            id: art.id,
            name: art.name,
            image: art.image
          }
        });
      }
    });
  });

  // 3. Publishing custom tracks
  customTracks.forEach(t => {
    const trackSlug = slug(t.title);
    const key = (trackSlug || t.id || t.title || '').toLowerCase();

    if (!pool.has(key)) {
      pool.set(key, {
        id: t.id,
        title: t.title,
        type: t.genre || 'Single',
        slug: trackSlug,
        artworkUrl: t.artworkUrl || '',
        audioUrl: t.audioUrl || '',
        links: {
          spotify: t.spotifyUrl,
          apple: t.appleMusicUrl,
          youtube: t.youtubeUrl,
          soundcloud: t.soundcloudUrl
        },
        metadata: {},
        artist: {
          id: 'pub',
          name: t.artist || 'UniFLOWs Artist',
          image: t.artworkUrl || ''
        }
      });
    }
  });

  return Array.from(pool.values());
}

// ----------------------------------------------------------------------------
// SMART FUZZY MATCH ENGINE
// ----------------------------------------------------------------------------
function tryRenderMatch(root, pool, query, isFinal = false) {
  if (!query) {
    renderSmartLinkHub(root, pool);
    return true;
  }

  const cleanQ = slug(query);
  const normQ = normStr(query);

  // 1. Exact Match
  let match = pool.find(r => 
    r.slug === query || 
    slug(r.slug) === cleanQ || 
    slug(r.title) === cleanQ || 
    String(r.id).toLowerCase() === query.toLowerCase()
  );

  // 2. Normalized Match (Ignoring diacritics & spaces)
  if (!match) {
    match = pool.find(r => 
      normStr(r.slug) === normQ || 
      normStr(r.title) === normQ || 
      normStr(r.id) === normQ
    );
  }

  // 3. Fuzzy Substring Match (e.g. "o-ki" matching "o-kia" or "Ơ Kìa" or "oki")
  if (!match) {
    match = pool.find(r => {
      const nSlug = normStr(r.slug);
      const nTitle = normStr(r.title);
      return (
        (normQ.length >= 3 && (nSlug.includes(normQ) || nTitle.includes(normQ))) ||
        (nTitle.length >= 3 && normQ.includes(nTitle)) ||
        (nSlug.length >= 3 && normQ.includes(nSlug)) ||
        slug(r.title).includes(cleanQ) ||
        cleanQ.includes(slug(r.title))
      );
    });
  }

  if (match) {
    renderReleaseCard(root, match.artist, match);
    return true;
  }

  if (isFinal) {
    renderNotFound(root, query, pool);
    return true;
  }

  return false;
}

// ----------------------------------------------------------------------------
// RENDER LUXURY LIQUID GLASS RELEASE CARD (Black & White Minimalist)
// ----------------------------------------------------------------------------
function renderReleaseCard(root, artist, release) {
  const p = release;
  const a = artist;

  const rawLinks = p.links || {};
  const platforms = [];

  // 1. Preset Platforms (Pure Text, NO icons)
  const PRESETS = [
    { name: 'SPOTIFY', action: 'PLAY', url: formatSocialUrl(rawLinks.spotify) },
    { name: 'APPLE MUSIC', action: 'PLAY', url: formatSocialUrl(rawLinks.apple || rawLinks.applemusic) },
    { name: 'YOUTUBE MUSIC', action: 'PLAY', url: formatSocialUrl(rawLinks.youtube || rawLinks.youtubemusic) },
    { name: 'SOUNDCLOUD', action: 'PLAY', url: formatSocialUrl(rawLinks.soundcloud) },
    { name: 'ZING MP3', action: 'PLAY', url: formatSocialUrl(rawLinks.zingmp3 || rawLinks.zing) },
    { name: 'NHACCUATUI (NCT)', action: 'PLAY', url: formatSocialUrl(rawLinks.nct) },
    { name: 'TIKTOK', action: 'USE SOUND', url: formatSocialUrl(rawLinks.tiktok) },
    { name: 'AMAZON MUSIC', action: 'PLAY', url: formatSocialUrl(rawLinks.amazon || rawLinks.amazonmusic) }
  ];

  PRESETS.forEach(item => {
    if (item.url) platforms.push(item);
  });

  // 2. Custom Platforms added by Admin
  if (Array.isArray(rawLinks.customPlatforms)) {
    rawLinks.customPlatforms.forEach(c => {
      const formatted = formatSocialUrl(c.url);
      if (c.name && formatted) {
        platforms.push({
          name: c.name.toUpperCase(),
          action: (c.action || 'PLAY').toUpperCase(),
          url: formatted
        });
      }
    });
  }

  // 3. Object-based custom platforms
  Object.entries(rawLinks).forEach(([k, v]) => {
    if (!['spotify', 'apple', 'applemusic', 'youtube', 'youtubemusic', 'soundcloud', 'zing', 'zingmp3', 'nct', 'tiktok', 'amazon', 'amazonmusic', 'customplatforms'].includes(k.toLowerCase())) {
      const formatted = formatSocialUrl(v);
      if (formatted && typeof v === 'string') {
        platforms.push({
          name: k.toUpperCase(),
          action: 'PLAY',
          url: formatted
        });
      }
    }
  });

  const meta = (typeof p.metadata === 'object' && p.metadata) ? p.metadata : {};
  const isPreviewDisabled = meta.previewEnabled === false || p.previewEnabled === false || meta.previewMode === 'none' || p.previewMode === 'none';
  const previewStart = parseFloat(p.previewStart || meta.previewStart || 0);
  const previewDuration = parseFloat(p.previewDuration || meta.previewDuration || 30);
  const previewMode = p.previewMode || meta.previewMode || 'custom';

  const finalReleaseSlug = p.slug || slug(p.title);
  const clickStorageKey = `uniflows-smart-clicks-${a.id || 'art'}-${finalReleaseSlug}`;
  let clickCount = Number(localStorage.getItem(clickStorageKey) || 0);

  const artworkSrc = p.artworkUrl || a.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=90';
  const shareCleanUrl = `${location.origin}/l/${encodeURIComponent(finalReleaseSlug)}`;

  root.innerHTML = `
    <!-- Blur Backdrop Cover -->
    <div class="smart-bg-container" style="position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:hidden;z-index:0;pointer-events:none;">
      <div class="smart-bg-blur" style="position:absolute;top:-20%;left:-20%;width:140%;height:140%;background:url('${esc(artworkSrc)}') center/cover no-repeat;filter:blur(70px) brightness(0.28) saturate(1.3);transform:scale(1.15);"></div>
      <div class="smart-bg-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%);"></div>
    </div>

    <!-- Main Liquid Glass Card -->
    <div class="smart-viewport" style="position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 16px 60px;">
      
      <div class="liquid-card" style="width:min(460px, 92vw);background:rgba(20, 20, 24, 0.6);backdrop-filter:blur(32px) saturate(190%);-webkit-backdrop-filter:blur(32px) saturate(190%);border:1px solid rgba(255, 255, 255, 0.14);border-radius:28px;box-shadow:0 30px 70px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.2);padding:32px 24px 36px;display:flex;flex-direction:column;align-items:center;text-align:center;">
        
        <!-- Header -->
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;">
          <a href="/" style="font-weight:900;letter-spacing:-0.04em;color:#ffffff;text-decoration:none;font-size:16px;opacity:0.95;">UNIFLOWs</a>
          <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.08);padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);text-transform:uppercase;font-weight:600;">OFFICIAL RELEASE</span>
        </div>

        <!-- Artwork Cover with Elevated Title -->
        <div class="artwork-container" style="position:relative;width:min(340px, 80vw);aspect-ratio:1;margin:0 auto 20px;border-radius:20px;overflow:hidden;box-shadow:0 20px 45px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.18);">
          <img src="${esc(artworkSrc)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;display:block;">
          
          <!-- Gradient Shadow Over Artwork Bottom -->
          <div style="position:absolute;bottom:0;left:0;right:0;height:55%;background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, transparent 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:20px 18px;text-align:left;">
            <span style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;color:rgba(255,255,255,0.75);text-transform:uppercase;font-weight:700;margin-bottom:4px;">${esc(a.name)} · ${esc(p.type || 'Single')}</span>
            <h1 style="font-size:clamp(22px, 5.5vw, 28px);line-height:1.1;letter-spacing:-0.03em;color:#ffffff;font-weight:900;margin:0;text-shadow:0 2px 10px rgba(0,0,0,0.8);">${esc(p.title)}</h1>
          </div>
        </div>

        <!-- Audio Preview Player (Only when enabled by artist/admin) -->
        ${(!isPreviewDisabled && p.audioUrl) ? `
          <div class="liquid-player" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:12px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);">
            <button type="button" id="smart-play-btn" style="background:#ffffff;color:#000000;border:none;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);transition:transform 0.15s ease;">▶</button>
            <div style="flex:1;text-align:left;">
              <span style="font-size:13px;font-weight:800;color:#ffffff;display:block;letter-spacing:-0.01em;">Audio Preview ${previewMode === 'custom' ? `(${previewDuration}s Snippet)` : ''}</span>
              <span style="font-size:11px;font-family:'DM Mono',monospace;color:rgba(255,255,255,0.6);">${previewStart > 0 ? `Đoạn từ ${Math.floor(previewStart/60)}:${String(Math.floor(previewStart%60)).padStart(2,'0')}` : '24-Bit Lossless Quality'}</span>
            </div>
            <audio id="smart-audio-el" src="${esc(p.audioUrl)}" preload="none"></audio>
          </div>
        ` : ''}

        <!-- Liquid Glass Streaming Platforms Grid (Taller, No Icons, B&W Theme) -->
        <div class="liquid-platforms" style="width:100%;display:grid;gap:10px;">
          ${platforms.length > 0 ? platforms.map(item => `
            <a class="liquid-platform-row" href="${item.url}" target="_blank" rel="noopener noreferrer" data-platform-click="${esc(item.name)}" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;min-height:62px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;text-decoration:none;transition:all 0.22s cubic-bezier(0.16, 1, 0.3, 1);box-shadow:0 4px 14px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08);">
              <div style="text-align:left;">
                <span style="font-size:15px;font-weight:800;letter-spacing:0.5px;color:#ffffff;display:block;">${esc(item.name)}</span>
              </div>
              <span class="liquid-play-btn" style="background:#ffffff;color:#000000;font-size:11px;font-weight:900;letter-spacing:1px;padding:8px 18px;border-radius:24px;text-transform:uppercase;box-shadow:0 3px 10px rgba(0,0,0,0.3);transition:all 0.18s ease;">${esc(item.action || 'PLAY')} ↗</span>
            </a>
          `).join('') : `
            <div style="padding:28px 18px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.16);border-radius:16px;font-size:13px;color:rgba(255,255,255,0.7);text-align:center;">
              Đang cập nhật link streaming trên các nền tảng...
            </div>
          `}
        </div>

        <!-- Share & Shortlink Badge -->
        <div style="margin-top:24px;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;">
          <button id="smart-btn-share" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#ffffff;padding:11px 26px;border-radius:30px;font-size:12px;font-family:'DM Mono',monospace;text-transform:uppercase;font-weight:700;letter-spacing:1px;cursor:pointer;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            CHIA SẺ LINK RÚT GỌN (l/${esc(finalReleaseSlug)})
          </button>
          <small id="smart-click-badge" style="color:rgba(255,255,255,0.5);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px;">
            ${clickCount > 0 ? `${clickCount.toLocaleString('vi-VN')} lượt mở link` : ''}
          </small>
        </div>

        <!-- Footer -->
        <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);width:100%;text-align:center;">
          <a href="/" style="color:rgba(255,255,255,0.45);font-size:11px;text-decoration:none;font-family:'DM Mono',monospace;letter-spacing:0.5px;transition:color 0.2s;">© 2026 UNIFLOWs LABEL</a>
        </div>

      </div>

    </div>
  `;

  // Attach Platform Click Trackers
  root.querySelectorAll('[data-platform-click]').forEach(btn => {
    btn.onclick = () => {
      clickCount++;
      localStorage.setItem(clickStorageKey, clickCount);
      const badge = root.querySelector('#smart-click-badge');
      if (badge) badge.textContent = `${clickCount.toLocaleString('vi-VN')} lượt mở link`;
    };
  });

  // Attach Share Button
  root.querySelector('#smart-btn-share')?.addEventListener('click', async () => {
    const btn = root.querySelector('#smart-btn-share');
    try {
      if (navigator.share) {
        await navigator.share({ title: `${a.name} — ${p.title}`, url: shareCleanUrl });
      } else {
        throw new Error('No web share');
      }
    } catch {
      await navigator.clipboard?.writeText(shareCleanUrl);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ ĐÃ SAO CHÉP LIÊN KẾT!';
        btn.style.background = '#ffffff';
        btn.style.color = '#000000';
        btn.style.borderColor = '#ffffff';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = 'rgba(255,255,255,0.08)';
          btn.style.color = '#ffffff';
          btn.style.borderColor = 'rgba(255,255,255,0.2)';
        }, 2200);
      }
    }
  });

  // Attach Audio Player Preview with Snippet start & duration control
  const playBtn = root.querySelector('#smart-play-btn');
  const audioEl = root.querySelector('#smart-audio-el');
  if (playBtn && audioEl) {
    let previewTimer = null;
    playBtn.onclick = () => {
      if (audioEl.paused) {
        if (previewStart > 0 && Math.abs(audioEl.currentTime - previewStart) > 2) {
          audioEl.currentTime = previewStart;
        }
        audioEl.play();
        playBtn.textContent = '❚❚';

        if (previewDuration > 0 && previewMode === 'custom') {
          clearTimeout(previewTimer);
          const remainingSecs = Math.max(1, (previewStart + previewDuration) - audioEl.currentTime);
          previewTimer = setTimeout(() => {
            audioEl.pause();
            audioEl.currentTime = previewStart;
            playBtn.textContent = '▶';
          }, remainingSecs * 1000);
        }
      } else {
        audioEl.pause();
        clearTimeout(previewTimer);
        playBtn.textContent = '▶';
      }
    };
    audioEl.onended = () => {
      playBtn.textContent = '▶';
      clearTimeout(previewTimer);
    };
  }
}

// ----------------------------------------------------------------------------
// RENDER NOT FOUND STATE (Luxury Monochrome)
// ----------------------------------------------------------------------------
function renderNotFound(root, requestedSlug, pool = []) {
  root.innerHTML = `
    <div class="smart-bg-container" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#090a0f;"></div>

    <div class="smart-viewport" style="position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 16px 60px;">
      <div class="liquid-card" style="width:min(460px, 92vw);background:rgba(20, 20, 24, 0.7);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid rgba(255, 255, 255, 0.14);border-radius:28px;box-shadow:0 30px 70px rgba(0,0,0,0.8);padding:36px 24px;text-align:center;">
        <a href="/" style="font-weight:900;letter-spacing:-0.04em;color:#ffffff;text-decoration:none;font-size:16px;">UNIFLOWs</a>
        
        <h1 style="font-size:56px;letter-spacing:-0.05em;color:#ffffff;margin:28px 0 10px;font-weight:900;">404</h1>
        <strong style="font-size:15px;color:#ffffff;display:block;">Không tìm thấy bản phát hành "${esc(requestedSlug)}"</strong>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;max-width:380px;margin:8px auto 24px;">Vui lòng kiểm tra lại liên kết hoặc khám phá các bài hát nổi bật khác của UniFLOWs:</p>

        ${pool.length > 0 ? `
          <div style="width:100%;display:grid;gap:8px;margin-bottom:24px;">
            ${pool.slice(0, 4).map(r => `
              <a href="/l/${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;text-decoration:none;color:#fff;">
                <img src="${esc(r.artworkUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=100&q=80')}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" alt="${esc(r.title)}">
                <div style="flex:1;min-width:0;text-align:left;">
                  <strong style="display:block;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
                  <span style="font-size:12px;color:rgba(255,255,255,0.6);">${esc(r.artist?.name || 'Nghệ sĩ')}</span>
                </div>
                <span style="color:#ffffff;font-size:12px;font-weight:bold;">NGHE ↗</span>
              </a>
            `).join('')}
          </div>
        ` : ''}

        <a href="/" style="display:inline-block;padding:12px 28px;background:#ffffff;color:#000000;text-decoration:none;font-weight:800;border-radius:30px;font-size:12px;letter-spacing:1px;text-transform:uppercase;">← VỀ TRANG CHỦ</a>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// RENDER MUSIC HUB (When visiting /listen with no slug)
// ----------------------------------------------------------------------------
function renderSmartLinkHub(root, pool = []) {
  root.innerHTML = `
    <div class="smart-bg-container" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#090a0f;"></div>

    <div class="smart-viewport" style="position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 16px 60px;">
      <div class="liquid-card" style="width:min(500px, 92vw);background:rgba(20, 20, 24, 0.7);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid rgba(255, 255, 255, 0.14);border-radius:28px;box-shadow:0 30px 70px rgba(0,0,0,0.8);padding:36px 24px;text-align:center;">
        
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <a href="/" style="font-weight:900;letter-spacing:-0.04em;color:#ffffff;text-decoration:none;font-size:16px;">UNIFLOWs</a>
          <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.08);padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);">MUSIC HUB</span>
        </div>

        <h1 style="font-size:clamp(26px, 6vw, 36px);letter-spacing:-0.03em;color:#ffffff;font-weight:900;margin:10px 0 6px;">Tất cả SmartLinks</h1>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 24px;">Khám phá toàn bộ bản phát hành chính thức từ nghệ sĩ UniFLOWs Label</p>

        <div style="width:100%;display:grid;gap:10px;margin-bottom:24px;">
          ${pool.length > 0 ? pool.map(r => `
            <a href="/l/${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;text-decoration:none;color:#fff;transition:all 0.2s ease;">
              <img src="${esc(r.artworkUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80')}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.4);" alt="${esc(r.title)}">
              <div style="flex:1;min-width:0;text-align:left;">
                <strong style="display:block;font-size:15px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
                <span style="font-size:12px;color:rgba(255,255,255,0.6);">${esc(r.artist?.name || 'Nghệ sĩ')} · <b>${esc(r.type || 'Single')}</b></span>
              </div>
              <span style="background:#ffffff;color:#000000;font-size:10px;font-weight:900;letter-spacing:1px;padding:6px 14px;border-radius:20px;text-transform:uppercase;">NGHE ↗</span>
            </a>
          `).join('') : `
            <div style="padding:40px 20px;text-align:center;color:rgba(255,255,255,0.5);border:1px dashed rgba(255,255,255,0.15);border-radius:16px;">
              Đang cập nhật danh mục bản phát hành...
            </div>
          `}
        </div>

        <a href="/" style="color:rgba(255,255,255,0.5);font-size:11px;text-decoration:none;font-family:'DM Mono',monospace;letter-spacing:0.5px;">← Quay lại Trang Chủ UniFLOWs</a>
      </div>
    </div>
  `;
}

// Auto-run if element exists on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSmartLinkEngine());
} else {
  initSmartLinkEngine();
}
