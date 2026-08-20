import { getData, getLocalCachedData } from './data.js';

let data = getLocalCachedData();
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const validUrl = u => u && u.trim() !== '' && u.trim() !== '#' && u.trim() !== 'javascript:void(0)';

// Insert Header with Clean URLs
if (!$('.nav')) {
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="nav">
      <a href="index" class="brand">UNIFLOWs<small>label / est. 2026</small></a>
      <button class="menu" aria-label="Mở menu" aria-expanded="false"><i></i></button>
      <nav class="nav-links">
        <a href="artists">Nghệ sĩ</a>
        <a href="about">Về chúng tôi</a>
        <a href="news">Tạp chí</a>
        <a href="contact">Liên hệ</a>
        <a class="artist-login-link" href="artist-login">Artist login ↗</a>
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
      <span>© 2026 UniFLOWs Label</span>
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
  grid.innerHTML = data.artists.map(a => `
    <a class="artist" href="artist?id=${encodeURIComponent(a.id)}">
      <img src="${esc(a.image)}" alt="${esc(a.name)}">
      <div class="artist-info">
        <span>${esc(a.genre)}</span>
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
  
  // Social links filtering
  const socialLinksHtml = [
    validUrl(a.instagram) ? `<a href="${a.instagram}" target="_blank" rel="noreferrer">Instagram ↗</a>` : '',
    validUrl(a.youtube) ? `<a href="${a.youtube}" target="_blank" rel="noreferrer">YouTube ↗</a>` : '',
    validUrl(a.tiktok) ? `<a href="${a.tiktok}" target="_blank" rel="noreferrer">TikTok ↗</a>` : ''
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
      ${(a.products || []).length > 0 ? (a.products || []).map(p => `
        <a class="release" href="listen?release=${encodeURIComponent(p.slug || slug(p.title))}">
          <span>${esc(p.type)}</span>
          <strong>${esc(p.title)}</strong>
          <b>Smart link ↗</b>
        </a>
      `).join('') : '<p class="empty" style="padding:20px 3vw;">Chưa có bản phát hành nào được đăng tải.</p>'}
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
  let pathname = location.pathname.replace(/^\/+|\/+$/g, '');
  let parts = pathname.split('/');

  let releaseSlug = q.get('release') || '';
  let artistId = q.get('artist') || '';

  // Clean path resolution: /listen/vet-sang or /l/vet-sang
  if (!releaseSlug) {
    if (parts[0] === 'listen' || parts[0] === 'l') {
      if (parts.length >= 3) {
        artistId = parts[1];
        releaseSlug = parts[2];
      } else if (parts.length === 2) {
        releaseSlug = parts[1];
      }
    }
  }

  let a = null;
  let p = null;

  if (artistId) {
    a = (data.artists || []).find(x => x.id === artistId);
    if (a) {
      p = a.products?.find(x => (x.slug || slug(x.title)) === releaseSlug) || a.products?.[Number(releaseSlug)];
    }
  }

  // If artist is not specified or not found, search across all artists
  if (!p && releaseSlug) {
    for (const art of (data.artists || [])) {
      const found = art.products?.find(x => (x.slug || slug(x.title)) === releaseSlug || slug(x.title) === slug(releaseSlug));
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
    { name: 'Spotify', url: links.spotify },
    { name: 'Apple Music', url: links.apple || links.applemusic },
    { name: 'YouTube Music', url: links.youtube || links.youtubemusic },
    { name: 'SoundCloud', url: links.soundcloud },
    { name: 'Nhaccuatui (NCT)', url: links.nct },
    { name: 'Zing MP3', url: links.zingmp3 || links.zing }
  ].filter(item => validUrl(item.url));

  // Add extra custom platforms if any
  Object.entries(links).forEach(([k, v]) => {
    if (!['spotify', 'apple', 'applemusic', 'youtube', 'youtubemusic', 'soundcloud', 'nct', 'zingmp3', 'zing'].includes(k.toLowerCase()) && validUrl(v)) {
      platforms.push({ name: k, url: v });
    }
  });

  let key = `uniflows-clicks-${a.id}-${p.slug || slug(p.title)}`;
  let count = Number(localStorage.getItem(key) || 0);

  root.innerHTML = `
    <section class="smart-page">
      <a class="smart-logo" href="index">UNIFLOWs</a>
      <img class="smart-art" src="${esc(p.artworkUrl || a.image)}" alt="${esc(p.title)}">
      <span class="eyebrow">${esc(a.name)} / ${esc(p.type)}</span>
      <h1>${esc(p.title)}</h1>
      <p>Nghe trên nền tảng bạn yêu thích.</p>
      <div class="smart-platforms">
        ${platforms.length > 0 ? platforms.map(item => `
          <a data-platform href="${item.url}" target="_blank" rel="noreferrer">${esc(item.name)}<span>↗</span></a>
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
      await navigator.share({ title: `${a.name} — ${p.title}`, url: location.href });
    } catch {
      await navigator.clipboard?.writeText(location.href);
      $('#share-smart').textContent = 'Đã sao chép liên kết ✓';
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
}

renderAll();

getData().then(liveData => {
  data = liveData;
  renderAll();
});

$('.close-modal')?.addEventListener('click', () => $('#smart-modal')?.classList.remove('show'));
$('#smart-modal')?.addEventListener('click', e => {
  if (e.target === $('#smart-modal')) $('#smart-modal').classList.remove('show');
});
