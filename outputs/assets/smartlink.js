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

// Built-in Platform Icons & Brand Colors
const PLATFORM_ICONS = {
  spotify: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.216.353-.674.468-1.027.252-2.822-1.724-6.374-2.114-10.558-1.158-.403.093-.804-.158-.897-.562-.093-.404.158-.805.562-.898 4.582-1.047 8.513-.6 11.668 1.34.353.215.468.673.252 1.026zm1.47-3.267c-.272.443-.852.584-1.295.312-3.23-1.986-8.155-2.56-11.977-1.4-.498.151-1.026-.134-1.177-.633-.152-.498.134-1.026.633-1.177 4.372-1.328 9.794-.683 13.504 1.603.443.272.584.852.312 1.295zm.126-3.41c-3.873-2.3-10.264-2.512-13.974-1.385-.594.18-1.222-.156-1.403-.75-.18-.593.156-1.222.75-1.403 4.263-1.294 11.314-1.046 15.77 1.6 4.536 2.69 1.488 1.066.857 1.938-.27 1.026-.857 1.938z"/></svg>`,
  apple: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FA243C"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.35-.55.63-1.03 1.66-.9 2.68 1 .08 2.01-.51 2.58-1.18z"/></svg>`,
  youtube: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  soundcloud: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FF5500"><path d="M1.175 12.225c-.051 0-.094.045-.101.101l-.268 2.846.268 2.766c.007.056.05.097.101.097.053 0 .096-.041.102-.097l.31-2.766-.31-2.846a.097.097 0 0 0-.102-.101zm1.53-.943c-.067 0-.121.054-.127.121l-.312 3.789.312 3.633c.006.067.06.12.127.12.068 0 .123-.053.129-.12l.366-3.633-.366-3.789a.125.125 0 0 0-.129-.121zm1.614-.847c-.083 0-.15.066-.157.148l-.348 4.636.348 4.41c.007.082.074.148.157.148.084 0 .151-.066.158-.148l.42-4.41-.42-4.636a.154.154 0 0 0-.158-.148zm1.684-.298c-.1 0-.18.08-.188.18l-.38 4.934.38 4.664c.008.1.088.18.188.18.101 0 .182-.08.19-.18l.466-4.664-.466-4.934a.185.185 0 0 0-.19-.18zm1.74-.294c-.114 0-.207.092-.216.206l-.412 5.228.412 4.908c.009.114.102.206.216.206.115 0 .209-.092.218-.206l.504-4.908-.504-5.228a.213.213 0 0 0-.218-.206zm1.802-.27c-.13 0-.236.105-.246.234l-.443 5.498.443 5.127c.01.13.116.234.246.234.13 0 .236-.105.247-.234l.539-5.127-.539-5.498a.24.24 0 0 0-.247-.234zm1.85-.098c-.145 0-.263.118-.275.263l-.47 5.596.47 5.217c.012.146.13.263.275.263.146 0 .264-.117.276-.263l.57-5.217-.57-5.596a.269.269 0 0 0-.276-.263zm1.905-.098c-.16 0-.29.13-.303.29l-.496 5.694.496 5.289c.013.16.143.29.303.29.16 0 .29-.13.304-.29l.6-5.289-.6-5.694a.297.297 0 0 0-.304-.29zm11.399 2.502c-.37 0-.726.066-1.056.188-.344-2.52-2.492-4.469-5.093-4.469-.733 0-1.429.158-2.054.441a.36.36 0 0 0-.196.324v9.643c0 .198.161.359.359.359h7.94c2.093 0 3.79-1.697 3.79-3.79 0-2.094-1.697-3.791-3.79-3.791z"/></svg>`,
  zing: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#6C5CE7"><circle cx="12" cy="12" r="11" stroke="#6C5CE7" stroke-width="2"/><text x="12" y="16" font-size="12" font-weight="900" text-anchor="middle" fill="#6C5CE7" font-family="sans-serif">Z</text></svg>`,
  nct: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#2ECC71"><circle cx="12" cy="12" r="11" stroke="#2ECC71" stroke-width="2"/><text x="12" y="15" font-size="9" font-weight="900" text-anchor="middle" fill="#2ECC71" font-family="sans-serif">NCT</text></svg>`,
  tiktok: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#EE1D52"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.32 0 .62.05.9.14V8.98a6.37 6.37 0 0 0-.9-.07A6.33 6.33 0 0 0 3 15.24a6.33 6.33 0 0 0 6.34 6.33 6.34 6.34 0 0 0 6.34-6.33V8.87a8.16 8.16 0 0 0 4.91 1.54V6.96a4.85 4.85 0 0 1-1-.27z"/></svg>`,
  amazon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FF9900"><path d="M13.88 15.65c-2.38 1.83-5.83 2.81-8.8 2.81-4.17 0-7.93-1.63-10.76-4.35-.22-.21-.02-.5.25-.34 3.07 1.8 6.94 2.88 10.51 2.88 2.63 0 5.49-.66 8.08-2.04.39-.21.72.29.72 1.04zm1.25-1.12c-.31-.41-2.02-.19-2.79-.1-.23.03-.27-.16-.06-.31 1.37-.99 3.61-.71 3.88-.37.28.35-.07 2.6-1.37 3.68-.2.17-.39.08-.3-.14.3-.77.95-2.35.64-2.76z"/></svg>`,
  default: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#cbff00"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`
};

function getPlatformIcon(key) {
  const k = key.toLowerCase();
  if (k.includes('spotify')) return PLATFORM_ICONS.spotify;
  if (k.includes('apple')) return PLATFORM_ICONS.apple;
  if (k.includes('youtube')) return PLATFORM_ICONS.youtube;
  if (k.includes('sound') || k.includes('sc')) return PLATFORM_ICONS.soundcloud;
  if (k.includes('zing')) return PLATFORM_ICONS.zing;
  if (k.includes('nct') || k.includes('nhac')) return PLATFORM_ICONS.nct;
  if (k.includes('tik')) return PLATFORM_ICONS.tiktok;
  if (k.includes('amazon')) return PLATFORM_ICONS.amazon;
  return PLATFORM_ICONS.default;
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
    if (parts[0] === 'listen' || parts[0] === 'l' || parts[0] === 'listen.html' || parts[0] === 'l.html') {
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
        <div class="smart-page">
          <a class="smart-logo" href="/">UNIFLOWs</a>
          <div style="margin-top:25vh;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;animation:pulse 1.5s infinite;">🎵</div>
            <p style="color:#aaa;font-family:'DM Mono',monospace;font-size:13px;letter-spacing:1px;">ĐANG TẢI SMART LINK...</p>
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
// RENDER RELEASE CARD
// ----------------------------------------------------------------------------
function renderReleaseCard(root, artist, release) {
  const p = release;
  const a = artist;

  const rawLinks = p.links || {};
  const platforms = [];

  // 1. Preset Platforms
  const PRESETS = [
    { key: 'spotify', name: 'Spotify', action: 'Nghe ngay', url: formatSocialUrl(rawLinks.spotify) },
    { key: 'apple', name: 'Apple Music', action: 'Nghe ngay', url: formatSocialUrl(rawLinks.apple || rawLinks.applemusic) },
    { key: 'youtube', name: 'YouTube Music', action: 'Nghe / Xem', url: formatSocialUrl(rawLinks.youtube || rawLinks.youtubemusic) },
    { key: 'soundcloud', name: 'SoundCloud', action: 'Nghe ngay', url: formatSocialUrl(rawLinks.soundcloud) },
    { key: 'zing', name: 'Zing MP3', action: 'Nghe ngay', url: formatSocialUrl(rawLinks.zingmp3 || rawLinks.zing) },
    { key: 'nct', name: 'Nhaccuatui (NCT)', action: 'Nghe ngay', url: formatSocialUrl(rawLinks.nct) },
    { key: 'tiktok', name: 'TikTok Sound', action: 'Dùng Sound', url: formatSocialUrl(rawLinks.tiktok) },
    { key: 'amazon', name: 'Amazon Music', action: 'Nghe ngay', url: formatSocialUrl(rawLinks.amazon || rawLinks.amazonmusic) }
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
          key: slug(c.name),
          name: c.name,
          action: c.action || 'Nghe ngay',
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
          key: slug(k),
          name: k.charAt(0).toUpperCase() + k.slice(1),
          action: 'Mở link',
          url: formatted
        });
      }
    }
  });

  const finalReleaseSlug = p.slug || slug(p.title);
  const clickStorageKey = `uniflows-smart-clicks-${a.id}-${finalReleaseSlug}`;
  let clickCount = Number(localStorage.getItem(clickStorageKey) || 0);

  const artworkSrc = p.artworkUrl || a.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=90';
  const shareCleanUrl = `${location.origin}/listen?release=${encodeURIComponent(finalReleaseSlug)}`;

  root.innerHTML = `
    <div class="smart-page">
      <header style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <a class="smart-logo" href="/" style="font-weight:800;letter-spacing:-1px;color:#fff;text-decoration:none;font-size:18px;">UNIFLOWs</a>
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:#888;background:#1a1a1a;padding:4px 10px;border-radius:12px;border:1px solid #333;">Official SmartLink</span>
      </header>

      <div class="smart-artwork-wrapper" style="position:relative;width:min(320px, 78vw);aspect-ratio:1;margin:15px auto 24px;">
        <img class="smart-art" src="${esc(artworkSrc)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;border:1px solid #333;box-shadow:0 15px 35px rgba(0,0,0,0.6), 8px 8px 0 rgba(203,255,0,0.85);">
      </div>

      <span class="eyebrow" style="font-family:'DM Mono',monospace;font-size:12px;color:#cbff00;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">${esc(a.name)} · ${esc(p.type || 'Single')}</span>
      <h1 style="font-size:clamp(32px, 7vw, 54px);line-height:1.05;letter-spacing:-0.04em;margin:10px 0 6px;color:#fff;font-weight:800;">${esc(p.title)}</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Nghe trên nền tảng bạn yêu thích</p>

      ${p.audioUrl ? `
        <div class="smart-audio-player" style="width:100%;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
          <button type="button" id="smart-play-btn" style="background:#cbff00;color:#000;border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:14px;font-weight:bold;display:flex;align-items:center;justify-content:center;">▶</button>
          <div style="flex:1;">
            <span style="font-size:12px;font-weight:bold;color:#fff;display:block;">Audio Preview Master</span>
            <span style="font-size:10px;font-family:'DM Mono',monospace;color:#71717a;">24-Bit Lossless Quality</span>
          </div>
          <audio id="smart-audio-el" src="${esc(p.audioUrl)}" preload="none"></audio>
        </div>
      ` : ''}

      <div class="smart-platforms" style="width:100%;display:grid;gap:8px;">
        ${platforms.length > 0 ? platforms.map(item => `
          <a class="platform-link-item" href="${item.url}" target="_blank" rel="noopener noreferrer" data-platform-click="${esc(item.name)}" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#141416;border:1px solid #262626;border-radius:8px;text-decoration:none;color:#fff;transition:all 0.2s ease;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${getPlatformIcon(item.key)}
              <strong style="font-size:15px;color:#fff;">${esc(item.name)}</strong>
            </div>
            <span style="font-size:12px;font-weight:bold;background:#262626;color:#cbff00;padding:6px 14px;border-radius:6px;border:1px solid #333;">${esc(item.action || 'Nghe')} ↗</span>
          </a>
        `).join('') : `
          <div style="padding:24px;border:1px dashed #3f3f46;border-radius:8px;font-size:13px;color:#a1a1aa;text-align:center;">
            🎧 Bản phát hành đang được đồng bộ link streaming lên 150+ nền tảng...
          </div>
        `}
      </div>

      <div style="margin-top:24px;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;">
        <button id="smart-btn-share" style="background:transparent;border:1px solid #3f3f46;color:#e4e4e7;padding:10px 24px;border-radius:20px;font-size:12px;font-family:'DM Mono',monospace;text-transform:uppercase;cursor:pointer;transition:all 0.2s ease;">
          🔗 Chia sẻ Smart Link
        </button>
        <small id="smart-click-badge" style="color:#71717a;font-family:'DM Mono',monospace;font-size:11px;">
          ${clickCount > 0 ? `🔥 ${clickCount.toLocaleString('vi-VN')} lượt mở link` : ''}
        </small>
      </div>

      <footer style="margin-top:40px;border-top:1px solid #27272a;padding-top:20px;width:100%;text-align:center;">
        <a href="/" style="color:#71717a;font-size:12px;text-decoration:none;transition:color 0.2s;">© 2026 UniFLOWs Label · Powered by UniSmartLink</a>
      </footer>
    </div>
  `;

  // Attach Platform Click Trackers
  root.querySelectorAll('[data-platform-click]').forEach(btn => {
    btn.onclick = () => {
      clickCount++;
      localStorage.setItem(clickStorageKey, clickCount);
      const badge = root.querySelector('#smart-click-badge');
      if (badge) badge.textContent = `🔥 ${clickCount.toLocaleString('vi-VN')} lượt mở link`;
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
        btn.textContent = '✓ ĐÃ COPY LIÊN KẾT!';
        btn.style.borderColor = '#cbff00';
        btn.style.color = '#cbff00';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.borderColor = '#3f3f46';
          btn.style.color = '#e4e4e7';
        }, 2200);
      }
    }
  });

  // Attach Audio Player Preview
  const playBtn = root.querySelector('#smart-play-btn');
  const audioEl = root.querySelector('#smart-audio-el');
  if (playBtn && audioEl) {
    playBtn.onclick = () => {
      if (audioEl.paused) {
        audioEl.play();
        playBtn.textContent = '❚❚';
        playBtn.style.background = '#fff';
      } else {
        audioEl.pause();
        playBtn.textContent = '▶';
        playBtn.style.background = '#cbff00';
      }
    };
    audioEl.onended = () => {
      playBtn.textContent = '▶';
      playBtn.style.background = '#cbff00';
    };
  }
}

// ----------------------------------------------------------------------------
// RENDER NOT FOUND STATE
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
    <div class="smart-page">
      <a class="smart-logo" href="/" style="font-weight:800;letter-spacing:-1px;color:#fff;text-decoration:none;font-size:18px;">UNIFLOWs</a>
      <div style="margin:40px 0 20px;text-align:center;">
        <h1 style="font-size:64px;letter-spacing:-0.05em;color:#fff;margin:0 0 10px;">404</h1>
        <strong style="font-size:16px;color:#cbff00;display:block;">Không tìm thấy bản phát hành "${esc(requestedSlug)}"</strong>
        <p style="color:#a1a1aa;font-size:13px;max-width:440px;margin:8px auto 20px;">Vui lòng kiểm tra lại liên kết hoặc khám phá các bài hát nổi bật khác của UniFLOWs bên dưới:</p>
      </div>

      ${allReleases.length > 0 ? `
        <div class="smart-platforms" style="width:100%;display:grid;gap:8px;">
          ${allReleases.slice(0, 5).map(r => `
            <a href="/listen?release=${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#141416;border:1px solid #262626;border-radius:8px;text-decoration:none;color:#fff;">
              <img src="${esc(r.artworkUrl || r.artistImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=100&q=80')}" style="width:44px;height:44px;object-fit:cover;border-radius:4px;border:1px solid #333;" alt="${esc(r.title)}">
              <div style="flex:1;min-width:0;">
                <strong style="display:block;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
                <span style="font-size:12px;color:#888;">${esc(r.artistName)} · ${esc(r.type || 'Single')}</span>
              </div>
              <span style="color:#cbff00;font-size:14px;">↗</span>
            </a>
          `).join('')}
        </div>
      ` : ''}

      <div style="margin-top:24px;">
        <a href="/" style="display:inline-block;padding:10px 24px;border:1px solid #fff;color:#fff;text-decoration:none;font-weight:bold;border-radius:4px;font-size:12px;">← Về trang chủ UniFLOWs</a>
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
    <div class="smart-page">
      <header style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <a class="smart-logo" href="/" style="font-weight:800;letter-spacing:-1px;color:#fff;text-decoration:none;font-size:18px;">UNIFLOWs</a>
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:#cbff00;background:#1a1a1a;padding:4px 10px;border-radius:12px;border:1px solid #333;">SmartLink Music Hub</span>
      </header>

      <h1 style="font-size:clamp(32px, 6vw, 48px);line-height:1.05;letter-spacing:-0.04em;margin:10px 0 8px;color:#fff;font-weight:800;">Tất cả SmartLinks</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Khám phá toàn bộ bản phát hành chính thức từ nghệ sĩ UniFLOWs Label</p>

      <div class="smart-platforms" style="width:100%;display:grid;gap:10px;">
        ${allReleases.length > 0 ? allReleases.map(r => `
          <a href="/listen?release=${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#141416;border:1px solid #262626;border-radius:8px;text-decoration:none;color:#fff;transition:transform 0.15s ease;">
            <img src="${esc(r.artworkUrl || r.artistImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80')}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #333;box-shadow:2px 2px 0 rgba(203,255,0,0.6);" alt="${esc(r.title)}">
            <div style="flex:1;min-width:0;">
              <strong style="display:block;font-size:16px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
              <span style="font-size:12px;color:#888;">${esc(r.artistName)} · <b>${esc(r.type || 'Single')}</b></span>
            </div>
            <span style="font-size:12px;font-weight:bold;background:#262626;color:#cbff00;padding:6px 12px;border-radius:6px;border:1px solid #333;">Nghe ↗</span>
          </a>
        `).join('') : `
          <div style="padding:40px 20px;text-align:center;color:#888;border:1px dashed #333;border-radius:8px;">
            Đang cập nhật danh mục bản phát hành...
          </div>
        `}
      </div>

      <footer style="margin-top:40px;border-top:1px solid #27272a;padding-top:20px;width:100%;text-align:center;">
        <a href="/" style="color:#71717a;font-size:12px;text-decoration:none;">← Quay lại Trang Chủ UniFLOWs</a>
      </footer>
    </div>
  `;
}

// Auto-run if element exists on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSmartLinkEngine());
} else {
  initSmartLinkEngine();
}
