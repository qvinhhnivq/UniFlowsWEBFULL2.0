import { supabase, isSupabaseConfigured } from './supabase.js';
import { getLocalCachedData, getData } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

// ----------------------------------------------------------------------------
// MAIN SMARTLINK BOOTSTRAP
// ----------------------------------------------------------------------------
export async function initSmartLinkEngine() {
  const root = document.querySelector('[data-smartlink-page]') || document.body;
  if (!root) return;

  // 1. Parse Release Slug / ID from all possible URL patterns
  const q = new URLSearchParams(location.search);
  const rawPath = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  const parts = rawPath.split('/').filter(Boolean);

  let releaseSlug = q.get('release') || q.get('r') || q.get('slug') || q.get('id') || q.get('track') || '';
  let artistId = q.get('artist') || q.get('a') || '';

  if (!releaseSlug) {
    if (parts[0] === 'listen' || parts[0] === 'l' || parts[0] === 'listen.html' || parts[0] === 'l.html' || parts[0] === 'smartlink.html') {
      if (parts.length >= 3) {
        artistId = parts[1];
        releaseSlug = parts[2];
      } else if (parts.length >= 2) {
        releaseSlug = parts[1];
      }
    }
  }

  if (releaseSlug) {
    releaseSlug = releaseSlug.replace(/\.html$/i, '').trim();
  }

  // 2. Render Fast Cached State first (0ms)
  let liveData = getLocalCachedData();
  renderSmartLinkView(root, liveData, releaseSlug, artistId, true);

  // 3. Fetch Fresh Data in Background & Re-render
  try {
    const fresh = await getData();
    if (fresh) {
      liveData = fresh;
      renderSmartLinkView(root, liveData, releaseSlug, artistId, false);
    }
  } catch (e) {
    console.warn('SmartLink background fetch:', e);
  }
}

// ----------------------------------------------------------------------------
// RENDER VIEW CONTROLLER
// ----------------------------------------------------------------------------
function renderSmartLinkView(root, data, releaseSlug, artistId, isInitialTick) {
  const artistsList = data.artists || [];
  const cleanSlug = slug(releaseSlug);

  // Mode A: Hub view if no release slug is requested in URL
  if (!releaseSlug) {
    renderSmartLinkHub(root, artistsList);
    return;
  }

  // Mode B: Find Target Release
  let matchedArtist = null;
  let matchedRelease = null;

  if (artistId) {
    matchedArtist = artistsList.find(x => x.id === artistId || slug(x.name) === slug(artistId));
    if (matchedArtist) {
      const prods = Array.isArray(matchedArtist.products) ? matchedArtist.products : (Array.isArray(matchedArtist.releases) ? matchedArtist.releases : []);
      matchedRelease = prods.find(x => 
        (x.slug && slug(x.slug) === cleanSlug) || 
        slug(x.title) === cleanSlug || 
        (x.id && String(x.id).toLowerCase() === releaseSlug.toLowerCase()) ||
        (x.slug && x.slug.toLowerCase() === releaseSlug.toLowerCase())
      );
    }
  }

  if (!matchedRelease) {
    for (const art of artistsList) {
      const prods = Array.isArray(art.products) ? art.products : (Array.isArray(art.releases) ? art.releases : []);
      const found = prods.find(x => 
        (x.slug && slug(x.slug) === cleanSlug) || 
        slug(x.title) === cleanSlug || 
        (x.id && String(x.id).toLowerCase() === releaseSlug.toLowerCase()) ||
        (x.slug && x.slug.toLowerCase() === releaseSlug.toLowerCase()) ||
        slug(x.title).includes(cleanSlug) ||
        cleanSlug.includes(slug(x.title))
      );
      if (found) {
        matchedArtist = art;
        matchedRelease = found;
        break;
      }
    }
  }

  // Check Publishing Custom Tracks as fallback
  if (!matchedRelease && data.publishing?.customTracks) {
    const pubTrack = data.publishing.customTracks.find(t => 
      slug(t.title) === cleanSlug || 
      (t.id && String(t.id).toLowerCase() === releaseSlug.toLowerCase()) ||
      slug(t.title).includes(cleanSlug)
    );
    if (pubTrack) {
      matchedArtist = { name: pubTrack.artist || 'UniFLOWs Artist', image: pubTrack.artworkUrl || '' };
      matchedRelease = {
        title: pubTrack.title,
        type: pubTrack.genre || 'Single',
        artworkUrl: pubTrack.artworkUrl || '',
        links: {
          spotify: pubTrack.spotifyUrl,
          apple: pubTrack.appleMusicUrl,
          youtube: pubTrack.youtubeUrl,
          soundcloud: pubTrack.soundcloudUrl
        }
      };
    }
  }

  // Not Found State
  if (!matchedRelease || !matchedArtist) {
    if (isInitialTick) {
      root.innerHTML = `
        <div class="smart-bg-container">
          <div class="smart-bg-layer" style="background:#090a0f;"></div>
          <div class="smart-page" style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
            <div style="text-align:center;">
              <div style="font-size:28px;margin-bottom:12px;opacity:0.8;">💿</div>
              <p style="color:#ffffff;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Đang tải SmartLink...</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    renderNotFound(root, releaseSlug, artistsList);
    return;
  }

  // Render Full SmartLink Page
  renderReleaseCard(root, matchedArtist, matchedRelease);
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
   const meta = (typeof p.metadata === 'object' && p.metadata) ? p.metadata : {};
  const isPreviewDisabled = meta.previewEnabled === false || p.previewEnabled === false || meta.previewMode === 'none' || p.previewMode === 'none';
  const previewStart = parseFloat(p.previewStart || meta.previewStart || 0);
  const previewDuration = parseFloat(p.previewDuration || meta.previewDuration || 30);
  const previewMode = p.previewMode || meta.previewMode || 'custom';

  const finalReleaseSlug = p.slug || slug(p.title);
  const clickStorageKey = `uniflows-smart-clicks-${a.id}-${finalReleaseSlug}`;
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
function renderNotFound(root, requestedSlug, artistsList) {
  const allReleases = [];
  artistsList.forEach(art => {
    const prods = Array.isArray(art.products) ? art.products : (Array.isArray(art.releases) ? art.releases : []);
    prods.forEach(pr => {
      allReleases.push({ ...pr, artistName: art.name, artistImage: art.image });
    });
  });

  root.innerHTML = `
    <div class="smart-bg-container" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#090a0f;"></div>

    <div class="smart-viewport" style="position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 16px 60px;">
      <div class="liquid-card" style="width:min(460px, 92vw);background:rgba(20, 20, 24, 0.7);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid rgba(255, 255, 255, 0.14);border-radius:28px;box-shadow:0 30px 70px rgba(0,0,0,0.8);padding:36px 24px;text-align:center;">
        <a href="/" style="font-weight:900;letter-spacing:-0.04em;color:#ffffff;text-decoration:none;font-size:16px;">UNIFLOWs</a>
        
        <h1 style="font-size:56px;letter-spacing:-0.05em;color:#ffffff;margin:28px 0 10px;font-weight:900;">404</h1>
        <strong style="font-size:15px;color:#ffffff;display:block;">Không tìm thấy bản phát hành "${esc(requestedSlug)}"</strong>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;max-width:380px;margin:8px auto 24px;">Vui lòng kiểm tra lại liên kết hoặc khám phá các bài hát nổi bật khác của UniFLOWs:</p>

        ${allReleases.length > 0 ? `
          <div style="width:100%;display:grid;gap:8px;margin-bottom:24px;">
            ${allReleases.slice(0, 4).map(r => `
              <a href="/listen?release=${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;text-decoration:none;color:#fff;">
                <img src="${esc(r.artworkUrl || r.artistImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=100&q=80')}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" alt="${esc(r.title)}">
                <div style="flex:1;min-width:0;text-align:left;">
                  <strong style="display:block;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
                  <span style="font-size:12px;color:rgba(255,255,255,0.6);">${esc(r.artistName)}</span>
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
function renderSmartLinkHub(root, artistsList) {
  const allReleases = [];
  artistsList.forEach(art => {
    const prods = Array.isArray(art.products) ? art.products : (Array.isArray(art.releases) ? art.releases : []);
    prods.forEach(pr => {
      allReleases.push({ ...pr, artistName: art.name, artistImage: art.image });
    });
  });

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
          ${allReleases.length > 0 ? allReleases.map(r => `
            <a href="/listen?release=${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;text-decoration:none;color:#fff;transition:all 0.2s ease;">
              <img src="${esc(r.artworkUrl || r.artistImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80')}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.4);" alt="${esc(r.title)}">
              <div style="flex:1;min-width:0;text-align:left;">
                <strong style="display:block;font-size:15px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
                <span style="font-size:12px;color:rgba(255,255,255,0.6);">${esc(r.artistName)} · <b>${esc(r.type || 'Single')}</b></span>
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
