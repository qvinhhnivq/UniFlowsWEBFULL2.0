import { getData, getLocalCachedData } from './data.js';
import { applyTranslations, getCurrentLang, setLang, t } from './i18n.js';
import './security.js';

let data = getLocalCachedData();
const $ = (s, r = document) => r.querySelector(s);
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

// Insert Header with Clean URLs
if (!$('.nav')) {
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="nav">
      <a href="index" class="brand">UNIFLOWs<small>label / est. 2024</small></a>
      <button class="menu" aria-label="Mở menu" aria-expanded="false"><i></i></button>
      <nav class="nav-links">
        <a href="artists" data-i18n="nav_artists">Nghệ sĩ</a>
        <a href="about" data-i18n="nav_about">Về chúng tôi</a>
        <a href="news" data-i18n="nav_news">Tạp chí</a>
        <a href="unipublishing" data-i18n="nav_publishing" style="color:#2563eb;font-weight:700;">UniPUBLISHING 🎬</a>
        <a href="contact" data-i18n="nav_contact">Liên hệ</a>
        <button type="button" class="lang-toggle-btn button alt" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;margin-left:4px;box-shadow:none;">🇬🇧 English</button>
        <a class="artist-login-link" href="artist-login" data-i18n="nav_artist_login">Artist login ↗</a>
      </nav>
    </header>
  `);
}

// Insert Footer & Smart Modal
if (!$('#smart-modal')) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="smart-modal" id="smart-modal" aria-hidden="true">
      <div class="smart-dialog">
        <button class="close-modal" aria-label="Đóng">×</button>
        <span class="eyebrow">UniFLOWs / Smart link</span>
        <h2 id="smart-title">Nghe ngay</h2>
        <p>Chọn nền tảng yêu thích của bạn.</p>
        <div id="platform-links" class="platform-links"></div>
      </div>
    </div>
    <footer>
      <span>© 2024 UniFLOWs Label</span>
      <span id="footer-city">${esc(data.city)}</span>
      <span>Independent music company</span>
    </footer>
  `);
}

$('.menu')?.addEventListener('click', () => {
  let o = document.body.classList.toggle('menu-open');
  $('.menu').setAttribute('aria-expanded', o);
});

function renderContent() {
  document.querySelectorAll('[data-content]').forEach(n => {
    let v = n.dataset.content.split('.').reduce((o, k) => o?.[k], data);
    if (v !== undefined) n.textContent = v;
  });
  
  // Render primary email in footer / site
  const primaryEmail = Array.isArray(data.emails) ? data.emails[0]?.email : (data.email || 'hello@uniflowslabel.com');
  document.querySelectorAll('[data-email]').forEach(n => {
    n.textContent = primaryEmail;
    n.href = `mailto:${primaryEmail}`;
  });

  // Render dynamic department emails on contact page
  const contactContainer = $('#contact-emails-container');
  if (contactContainer) {
    const emailsList = Array.isArray(data.emails)
      ? data.emails
      : Object.entries(data.emails || {}).map(([label, email]) => ({ label, email }));

    if (emailsList.length > 0) {
      contactContainer.innerHTML = emailsList.map(item => `
        <div class="contact-row">
          <div>
            <span class="eyebrow" style="display:block;margin-bottom:8px;opacity:0.75;">${esc(item.label)}</span>
            <a class="mail" href="mailto:${esc(item.email)}">${esc(item.email)}</a>
          </div>
        </div>
      `).join('');
    } else {
      contactContainer.innerHTML = `
        <div class="contact-row">
          <div>
            <span class="eyebrow" style="display:block;margin-bottom:8px;opacity:0.75;">Liên hệ trực tiếp</span>
            <a class="mail" href="mailto:${esc(primaryEmail)}">${esc(primaryEmail)}</a>
          </div>
        </div>
      `;
    }
  }

  const footerCity = $('#footer-city');
  if (footerCity) footerCity.textContent = data.city;
}

function artists() {
  let grid = $('[data-artists]');
  if (!grid) return;
  const publicArtists = (data.artists || []).filter(a => a.showOnWeb !== false && a.showOnWeb !== 'false');
  
  if (publicArtists.length === 0) {
    grid.innerHTML = '<p class="empty" style="padding:20px;grid-column:1/-1;">Danh sách nghệ sĩ đang được cập nhật.</p>';
    return;
  }

  grid.innerHTML = publicArtists.map(a => `
    <a class="artist" href="artist?id=${encodeURIComponent(a.id)}">
      <img src="${esc(a.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80')}" alt="${esc(a.name)}">
      <div class="artist-info">
        <span>${esc(a.genre || 'Music')}</span>
        <h4>${esc(a.name)}</h4>
        <b>Khám phá ↗</b>
      </div>
    </a>
  `).join('');
}

function articleCards() {
  let root = $('[data-articles]');
  if (!root) return;
  const build = () => {
    let all = (data.articles || []).filter(a => a.published);
    let q = ($('#article-search')?.value || '').toLowerCase();
    let filtered = all.filter(a => (a.title + (a.category || '')).toLowerCase().includes(q));
    return filtered.map((a, i) => `
      <article class="${i ? 'news-card' : 'feature'}">
        <span class="date">${esc(a.category)} / ${esc(a.date)}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.excerpt || '')}</p>
        <a class="card-link" href="article?id=${encodeURIComponent(a.id)}">Đọc bài đầy đủ →</a>
      </article>
    `).join('') || '<p class="empty">Không tìm thấy bài viết phù hợp.</p>';
  };
  root.innerHTML = build();
  $('#article-search')?.addEventListener('input', () => root.innerHTML = build());
}

function artistDetail() {
  let root = $('[data-artist-detail]');
  if (!root) return;
  const a = data.artists.find(x => x.id === new URLSearchParams(location.search).get('id'));
  if (!a) {
    root.innerHTML = '<p>Không tìm thấy nghệ sĩ.</p>';
    return;
  }
  const gallery = (a.gallery?.length ? a.gallery : [a.image]).filter(Boolean);
  
  // Social links sanitation
  const ig = formatSocialUrl(a.instagram);
  const yt = formatSocialUrl(a.youtube);
  const tt = formatSocialUrl(a.tiktok);
  const sp = formatSocialUrl(a.spotify);

  const socialLinksHtml = [
    ig ? `<a href="${ig}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>` : '',
    yt ? `<a href="${yt}" target="_blank" rel="noopener noreferrer">YouTube ↗</a>` : '',
    tt ? `<a href="${tt}" target="_blank" rel="noopener noreferrer">TikTok ↗</a>` : '',
    sp ? `<a href="${sp}" target="_blank" rel="noopener noreferrer">Spotify ↗</a>` : ''
  ].filter(Boolean).join('');

  root.innerHTML = `
    <section class="artist-detail">
      <img src="${esc(a.image)}" alt="${esc(a.name)}">
      <div>
        <span class="eyebrow">${esc(a.genre)}</span>
        <h1>${esc(a.name)}</h1>
        <p>${esc(a.bio)}</p>
        <div class="socials">
          ${socialLinksHtml || '<span style="opacity:0.6;font-size:12px;">Đang cập nhật kênh mạng xã hội</span>'}
        </div>
      </div>
    </section>
    ${gallery.length > 1 ? `
      <section class="gallery">
        <div class="section-head">
          <h2>Gallery</h2>
          <span class="kicker">${gallery.length} images</span>
        </div>
        <div class="gallery-grid">
          ${gallery.map((img, i) => `<img src="${esc(img)}" alt="${esc(a.name)} — ảnh ${i + 1}">`).join('')}
        </div>
      </section>
    ` : ''}
    <section class="releases">
      <div class="section-head">
        <h2>Sản phẩm</h2>
        <span class="kicker">Listen everywhere</span>
      </div>
      ${(a.products || []).length > 0 ? (a.products || []).map(p => {
        const pSlug = p.slug || slug(p.title);
        return `
          <a class="release" href="/listen/${encodeURIComponent(pSlug)}">
            <span>${esc(p.type)}</span>
            <strong>${esc(p.title)}</strong>
            <b>Smart link ↗</b>
          </a>
        `;
      }).join('') : '<p class="empty" style="padding:20px 3vw;">Chưa có bản phát hành nào được đăng tải.</p>'}
    </section>
  `;
}

function articleDetail() {
  let root = $('[data-article-detail]');
  if (!root) return;
  let a = (data.articles || []).find(x => x.id === new URLSearchParams(location.search).get('id'));
  if (!a || !a.published) {
    root.innerHTML = '<p>Không tìm thấy bài viết.</p>';
    return;
  }
  root.innerHTML = `
    <article class="article-detail">
      ${a.cover ? `<img class="article-cover" src="${esc(a.cover)}" alt="${esc(a.title)}">` : ''}
      <span class="eyebrow">${esc(a.category)} / ${esc(a.date)}</span>
      <h1>${esc(a.title)}</h1>
      <p class="lead">${esc(a.excerpt)}</p>
      <div class="article-meta">Bởi ${esc(a.author || 'UniFLOWs Editorial')} · ${esc(a.readTime || '3 phút đọc')}</div>
      <div class="article-body">${esc(a.body).replace(/\n/g, '<br>')}</div>
      <div class="article-actions">
        <button id="share-article">Chia sẻ bài viết ↗</button>
        <a class="card-link" href="news">← Quay lại tạp chí</a>
      </div>
    </article>
  `;
  $('#share-article')?.addEventListener('click', async () => {
    try {
      await navigator.share({ title: a.title, url: location.href });
    } catch {
      await navigator.clipboard?.writeText(location.href);
      $('#share-article').textContent = 'Đã sao chép liên kết ✓';
    }
  });
}

function smartPage() {
  let root = $('[data-smartlink-page]');
  if (!root) return;

  let q = new URLSearchParams(location.search);
  let rawPath = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  let parts = rawPath.split('/').filter(Boolean);

  let releaseSlug = q.get('release') || '';
  let artistId = q.get('artist') || '';

  // Clean path resolution: /listen/o-ki or /l/o-ki
  if (!releaseSlug) {
    if (parts[0] === 'listen' || parts[0] === 'l') {
      if (parts.length >= 3) {
        artistId = parts[1];
        releaseSlug = parts[2];
      } else if (parts.length >= 2) {
        releaseSlug = parts[1];
      }
    }
  }

  if (releaseSlug) {
    releaseSlug = releaseSlug.replace(/\.html$/i, '');
  }

  let a = null;
  let p = null;

  if (artistId) {
    a = (data.artists || []).find(x => x.id === artistId);
    if (a) {
      p = a.products?.find(x => (x.slug || slug(x.title)) === releaseSlug || slug(x.title) === slug(releaseSlug));
    }
  }

  // Search across all artists
  if (!p && releaseSlug) {
    for (const art of (data.artists || [])) {
      const found = (art.products || []).find(x => (x.slug || slug(x.title)) === releaseSlug || slug(x.title) === slug(releaseSlug));
      if (found) {
        a = art;
        p = found;
        break;
      }
    }
  }

  if (!a || !p) {
    root.innerHTML = `
      <section class="smart-page">
        <a class="smart-logo" href="index">UNIFLOWs</a>
        <h1 style="margin-top:20vh">404</h1>
        <p class="smart-error">Không tìm thấy bản phát hành Smart Link này.</p>
        <a class="button alt" href="index" style="margin-top:20px;border:1px solid #fff;color:#fff;">Về trang chủ</a>
      </section>
    `;
    return;
  }

  let links = p.links || {};
  let platforms = [
    { name: 'Spotify', url: formatSocialUrl(links.spotify) },
    { name: 'Apple Music', url: formatSocialUrl(links.apple || links.applemusic) },
    { name: 'YouTube Music', url: formatSocialUrl(links.youtube || links.youtubemusic) },
    { name: 'SoundCloud', url: formatSocialUrl(links.soundcloud) },
    { name: 'Nhaccuatui (NCT)', url: formatSocialUrl(links.nct) },
    { name: 'Zing MP3', url: formatSocialUrl(links.zingmp3 || links.zing) }
  ].filter(item => Boolean(item.url));

  // Add extra custom platforms if any
  Object.entries(links).forEach(([k, v]) => {
    const formatted = formatSocialUrl(v);
    if (!['spotify', 'apple', 'applemusic', 'youtube', 'youtubemusic', 'soundcloud', 'nct', 'zingmp3', 'zing'].includes(k.toLowerCase()) && formatted) {
      platforms.push({ name: k, url: formatted });
    }
  });

  const finalReleaseSlug = p.slug || slug(p.title);
  let key = `uniflows-clicks-${a.id}-${finalReleaseSlug}`;
  let count = Number(localStorage.getItem(key) || 0);
  const shareCleanUrl = `${location.origin}/listen/${encodeURIComponent(finalReleaseSlug)}`;

  root.innerHTML = `
    <section class="smart-page">
      <a class="smart-logo" href="index">UNIFLOWs</a>
      <img class="smart-art" src="${esc(p.artworkUrl || a.image)}" alt="${esc(p.title)}">
      <span class="eyebrow">${esc(a.name)} / ${esc(p.type)}</span>
      <h1>${esc(p.title)}</h1>
      <p>Nghe trên nền tảng bạn yêu thích.</p>
      <div class="smart-platforms">
        ${platforms.length > 0 ? platforms.map(item => `
          <a data-platform href="${item.url}" target="_blank" rel="noopener noreferrer">${esc(item.name)}<span>↗</span></a>
        `).join('') : `
          <div style="padding:20px;border:1px dashed #555;font-size:14px;color:#aaa;">
            Đang cập nhật link streaming trên các nền tảng...
          </div>
        `}
      </div>
      <button id="share-smart" class="smart-share">Chia sẻ Smart Link</button>
      <small id="click-count">${count ? `${count.toLocaleString('vi-VN')} lượt mở link` : ''}</small>
    </section>
  `;

  root.querySelectorAll('[data-platform]').forEach(btn => {
    btn.onclick = () => {
      count++;
      localStorage.setItem(key, count);
      $('#click-count').textContent = `${count.toLocaleString('vi-VN')} lượt mở link`;
    };
  });

  $('#share-smart')?.addEventListener('click', async () => {
    try {
      await navigator.share({ title: `${a.name} — ${p.title}`, url: shareCleanUrl });
    } catch {
      await navigator.clipboard?.writeText(shareCleanUrl);
      $('#share-smart').textContent = 'Đã sao chép liên kết ✓';
      setTimeout(() => $('#share-smart').textContent = 'Chia sẻ Smart Link', 2500);
    }
  });
}

function renderAll() {
  renderContent();
  artists();
  articleCards();
  artistDetail();
  articleDetail();
  smartPage();
  applyTranslations();
}

renderAll();

document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
  btn.onclick = () => {
    const current = getCurrentLang();
    const next = current === 'vi' ? 'en' : 'vi';
    setLang(next);
    renderAll();
  };
});

getData().then(liveData => {
  data = liveData;
  renderAll();
});

$('.close-modal')?.addEventListener('click', () => $('#smart-modal')?.classList.remove('show'));
$('#smart-modal')?.addEventListener('click', e => {
  if (e.target === $('#smart-modal')) $('#smart-modal').classList.remove('show');
});
