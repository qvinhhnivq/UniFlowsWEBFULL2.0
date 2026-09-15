import { getData, getLocalCachedData } from './data.js';
import { applyTranslations, getCurrentLang, setLang, t } from './i18n.js';
import './security.js';

// Auto-redirect subdomains cleanly to main domain canonical paths
(function autoRedirectSubdomains() {
  const host = window.location.hostname.toLowerCase();
  if (host.endsWith('uniflowslabel.com') && host !== 'uniflowslabel.com' && host !== 'www.uniflowslabel.com') {
    const protocol = window.location.protocol;
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    if (host.startsWith('unihub.') || host.startsWith('hube.')) {
      window.location.replace(`${protocol}//uniflowslabel.com/unihube${search}${hash}`);
    } else if (host.startsWith('publishing.')) {
      window.location.replace(`${protocol}//uniflowslabel.com/unipublishing${search}${hash}`);
    } else if (host.startsWith('48k.')) {
      window.location.replace(`${protocol}//uniflowslabel.com/48kcollective${search}${hash}`);
    } else if (host.startsWith('portal.') || host.startsWith('artist.')) {
      const isAuth = sessionStorage.getItem('uniflows-artist') === 'true' || localStorage.getItem('uniflows-artist') === 'true';
      window.location.replace(`${protocol}//uniflowslabel.com/${isAuth ? 'portal' : 'artist-login'}${search}${hash}`);
    } else {
      window.location.replace(`${protocol}//uniflowslabel.com/${search}${hash}`);
    }
  }
})();

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

function getNavLinks() {
  const protocol = window.location.protocol;
  const isFileOrStaticHtml = protocol === 'file:' || 
    window.location.pathname.endsWith('.html');

  if (isFileOrStaticHtml) {
    return {
      home: 'index.html',
      artists: 'artists.html',
      artist: 'artist.html',
      unihube: 'unihube.html',
      collective48k: '48kcollective.html',
      publishing: 'unipublishing.html',
      submitMusic: 'submit-music.html',
      about: 'about.html',
      news: 'news.html',
      article: 'article.html',
      contact: 'contact.html',
      artistLogin: 'artist-login.html',
      producer: 'producer.html',
      smartlink: 'listen.html?release='
    };
  }

  return {
    home: '/',
    artists: '/artists',
    artist: '/artist',
    unihube: '/unihube',
    collective48k: '/48kcollective',
    publishing: '/unipublishing',
    submitMusic: '/submit-music',
    about: '/about',
    news: '/news',
    article: '/article',
    contact: '/contact',
    artistLogin: '/artist-login',
    producer: '/producer',
    smartlink: '/listen?release='
  };
}

const navLinks = getNavLinks();

// Insert Header with Clean URLs
if (!$('.nav')) {
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="nav">
      <a href="${navLinks.home}" class="brand">UNIFLOWS<small>SAIGON / EST. 2024</small></a>
      <button class="menu" aria-label="Mở menu" aria-expanded="false"><i></i></button>
      <nav class="nav-links">
        <a href="${navLinks.artists}" data-i18n="nav_artists">Nghệ sĩ</a>
        <a href="${navLinks.unihube}" data-i18n="nav_unihube">Uni-HUBE</a>
        <a href="${navLinks.collective48k}" data-i18n="nav_48k">48K Collective</a>
        <a href="${navLinks.publishing}" data-i18n="nav_publishing">UniPUBLISHING</a>
        <a href="${navLinks.submitMusic}" data-i18n="nav_submit_music">Gửi Demo</a>
        <a href="${navLinks.about}" data-i18n="nav_about">Về chúng tôi</a>
        <a href="${navLinks.news}" data-i18n="nav_news">Tạp chí</a>
        <a href="${navLinks.contact}" data-i18n="nav_contact">Liên hệ</a>
        <button type="button" class="lang-toggle-btn">EN / VN</button>
        <a class="artist-login-link" href="${navLinks.artistLogin}" data-i18n="nav_artist_login">Artist login ↗</a>
      </nav>
    </header>
  `);
}

// Handle header transparency and scroll state
window.addEventListener('scroll', () => {
  const nav = $('.nav');
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
}, { passive: true });

// Insert Footer & Smart Modal
if (!$('#smart-modal')) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="smart-modal" id="smart-modal" aria-hidden="true">
      <div class="smart-dialog">
        <button class="close-modal" aria-label="Đóng">×</button>
        <span class="eyebrow" style="color:var(--color-felt-gray);">UniFLOWs / Smart link</span>
        <h2 id="smart-title">Nghe ngay</h2>
        <p style="color:var(--color-felt-gray);">Chọn nền tảng yêu thích của bạn.</p>
        <div id="platform-links" class="platform-links"></div>
      </div>
    </div>
    <footer>
      <div class="footer-inner">
        <span>© 2024 UNIFLOWS LABEL</span>
        <span id="footer-city">SAIGON · VIETNAM</span>
        <span>INDEPENDENT ENTERTAINMENT</span>
      </div>
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

let isArtistsExpanded = false;

function artists() {
  let grid = $('[data-artists]');
  if (!grid) return;
  const publicArtists = (data.artists || []).filter(a => a.showOnWeb !== false && a.showOnWeb !== 'false');
  
  if (publicArtists.length === 0) {
    grid.innerHTML = `<p class="empty" style="padding:20px;grid-column:1/-1;">${getCurrentLang() === 'en' ? 'Artist roster is being updated.' : 'Danh sách nghệ sĩ đang được cập nhật.'}</p>`;
    return;
  }

  const isArtistsPage = document.body.dataset.page === 'artists';
  // On both homepage and roster page, default to showing top 3 artists (1 full row in 3-col grid)
  const limit = 3;
  const shouldTruncate = publicArtists.length > limit;
  const visibleArtists = (shouldTruncate && !isArtistsExpanded) ? publicArtists.slice(0, limit) : publicArtists;

  const exploreText = t('explore_artist');

  const cardsHtml = visibleArtists.map((a, i) => `
    <a class="artist" href="${navLinks.artist}?id=${encodeURIComponent(a.id)}" style="animation: fadeIn 0.35s ease ${i * 0.05}s both;">
      <img src="${esc(a.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80')}" alt="${esc(a.name)}">
      <div class="artist-info">
        <span>${esc(a.genre || 'Music')}</span>
        <h4>${esc(a.name)}</h4>
        <b>${esc(exploreText)}</b>
      </div>
    </a>
  `).join('');

  let toggleBtnHtml = '';
  if (shouldTruncate) {
    const btnLabel = isArtistsExpanded 
      ? t('collapse_artists') 
      : t('view_all_artists', { count: publicArtists.length });
    
    toggleBtnHtml = `
      <div class="artists-toggle-bar" style="grid-column: 1 / -1; margin-top: 32px; text-align: center; width: 100%;">
        <button type="button" id="btn-toggle-artists-roster" class="btn-ghost-light">
          ${esc(btnLabel)}
        </button>
      </div>
    `;
  }

  grid.innerHTML = cardsHtml + toggleBtnHtml;

  // Update counts on artists page
  const kickerCount = document.querySelector('[data-page="artists"] .section-head .kicker');
  if (kickerCount) {
    kickerCount.textContent = t('roster_talents_count', { count: publicArtists.length });
  }

  // Handle Toggle Click
  const toggleBtn = grid.querySelector('#btn-toggle-artists-roster');
  if (toggleBtn) {
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      isArtistsExpanded = !isArtistsExpanded;
      artists();
      if (!isArtistsExpanded) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
  }
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
        <a class="card-link" href="${navLinks.article}?id=${encodeURIComponent(a.id)}">Đọc bài đầy đủ →</a>
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
          <a class="release" href="${navLinks.smartlink}${encodeURIComponent(pSlug)}">
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

  const images = Array.isArray(a.images) ? a.images : [];

  root.innerHTML = `
    <article class="article-detail">
      ${a.cover ? `<img class="article-cover" src="${esc(a.cover)}" alt="${esc(a.title)}">` : ''}
      <span class="eyebrow">${esc(a.category)} / ${esc(a.date)}</span>
      <h1>${esc(a.title)}</h1>
      <p class="lead">${esc(a.excerpt)}</p>
      <div class="article-meta">Bởi ${esc(a.author || 'UniFLOWs Editorial')} · ${esc(a.readTime || '3 phút đọc')}</div>
      <div class="article-body">${esc(a.body).replace(/\n/g, '<br>')}</div>

      ${images.length > 0 ? `
        <section class="article-gallery" style="margin: 50px 0; border-top: 1px solid var(--line); padding-top: 40px;">
          <div class="section-head" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline;">
            <h2 style="font-size: clamp(22px, 3vw, 36px); letter-spacing: -0.04em; margin: 0; text-transform: uppercase;">Album Hình Ảnh</h2>
            <span class="kicker" style="font-family:'DM Mono',monospace; font-size:11px; text-transform:uppercase;">${images.length} hình ảnh</span>
          </div>
          <div class="article-gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            ${images.map((img, i) => {
              const url = typeof img === 'string' ? img : (img.url || '');
              const caption = typeof img === 'object' ? (img.caption || '') : '';
              return `
                <figure class="article-gallery-item" data-gal-idx="${i}" style="margin:0; cursor:pointer; background:#fff; border:1px solid var(--ink); overflow:hidden; transition:transform 0.15s ease;">
                  <div style="aspect-ratio:16/10; overflow:hidden; background:#0f172a;">
                    <img src="${esc(url)}" alt="${esc(caption || a.title)}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;">
                  </div>
                  ${caption ? `<figcaption style="padding:10px 14px; font-size:12px; font-family:'DM Mono',monospace; color:var(--text-muted); line-height:1.4; border-top:1px solid #e2e8f0;">${esc(caption)}</figcaption>` : ''}
                </figure>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <div class="article-actions">
        <button id="share-article">Chia sẻ bài viết ↗</button>
        <a class="card-link" href="news">← Quay lại tạp chí</a>
      </div>
    </article>
  `;

  // Attach Lightbox event for gallery items
  if (images.length > 0) {
    let currentLightboxIdx = 0;
    const galleryItems = root.querySelectorAll('.article-gallery-item');

    const openLightbox = (idx) => {
      currentLightboxIdx = idx;
      let overlay = document.querySelector('#article-lightbox-modal');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'article-lightbox-modal';
        overlay.className = 'article-lightbox-overlay';
        document.body.appendChild(overlay);
      }

      const curImg = images[currentLightboxIdx];
      const curUrl = typeof curImg === 'string' ? curImg : (curImg.url || '');
      const curCap = typeof curImg === 'object' ? (curImg.caption || '') : '';

      overlay.innerHTML = `
        <span class="article-lightbox-counter">${currentLightboxIdx + 1} / ${images.length}</span>
        <button type="button" class="article-lightbox-close" title="Đóng (Esc)">✕</button>
        ${images.length > 1 ? `<button type="button" class="article-lightbox-nav article-lightbox-prev" title="Ảnh trước (←)">❮</button>` : ''}
        ${images.length > 1 ? `<button type="button" class="article-lightbox-nav article-lightbox-next" title="Ảnh kế tiếp (→)">❯</button>` : ''}
        <div class="article-lightbox-img-wrap">
          <img src="${esc(curUrl)}" alt="Image ${currentLightboxIdx + 1}">
          ${curCap ? `<div class="article-lightbox-caption">${esc(curCap)}</div>` : ''}
        </div>
      `;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      overlay.querySelector('.article-lightbox-close')?.addEventListener('click', closeLightbox);
      overlay.querySelector('.article-lightbox-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox((currentLightboxIdx - 1 + images.length) % images.length);
      });
      overlay.querySelector('.article-lightbox-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox((currentLightboxIdx + 1) % images.length);
      });
      overlay.onclick = (e) => {
        if (e.target === overlay) closeLightbox();
      };
    };

    const closeLightbox = () => {
      const overlay = document.querySelector('#article-lightbox-modal');
      if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    };

    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.galIdx, 10);
        openLightbox(idx);
      });
    });

    document.addEventListener('keydown', (e) => {
      const overlay = document.querySelector('#article-lightbox-modal');
      if (!overlay || overlay.style.display === 'none') return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') openLightbox((currentLightboxIdx - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') openLightbox((currentLightboxIdx + 1) % images.length);
    });
  }

  $('#share-article')?.addEventListener('click', async () => {
    try {
      await navigator.share({ title: a.title, url: location.href });
    } catch {
      await navigator.clipboard?.writeText(location.href);
      $('#share-article').textContent = 'Đã sao chép liên kết ✓';
    }
  });
}

let isDataLoaded = false;

function smartPage() {
  let root = $('[data-smartlink-page]');
  if (!root) return;

  let q = new URLSearchParams(location.search);
  let rawPath = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  let parts = rawPath.split('/').filter(Boolean);

  let releaseSlug = q.get('release') || q.get('r') || q.get('slug') || q.get('id') || q.get('track') || '';
  let artistId = q.get('artist') || q.get('a') || '';

  // Clean path resolution: /listen/o-ki, /l/o-ki, /listen/artist-id/o-ki
  if (!releaseSlug) {
    if (parts[0] === 'listen' || parts[0] === 'l' || parts[0] === 'listen.html') {
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

  const cleanSlug = slug(releaseSlug);

  let a = null;
  let p = null;

  const artistsList = data.artists || [];

  if (artistId) {
    a = artistsList.find(x => x.id === artistId || slug(x.name) === slug(artistId));
    if (a) {
      p = a.products?.find(x => 
        (x.slug && slug(x.slug) === cleanSlug) || 
        slug(x.title) === cleanSlug || 
        (x.id && String(x.id) === releaseSlug) ||
        (x.slug && x.slug.toLowerCase() === releaseSlug.toLowerCase())
      );
    }
  }

  // Search across all artists
  if (!p && releaseSlug) {
    for (const art of artistsList) {
      const found = (art.products || []).find(x => 
        (x.slug && slug(x.slug) === cleanSlug) || 
        slug(x.title) === cleanSlug || 
        (x.id && String(x.id) === releaseSlug) ||
        (x.slug && x.slug.toLowerCase() === releaseSlug.toLowerCase()) ||
        slug(x.title).includes(cleanSlug) ||
        cleanSlug.includes(slug(x.title))
      );
      if (found) {
        a = art;
        p = found;
        break;
      }
    }
  }

  // If no release was specified in URL, show catalogue hub instead of 404
  if (!releaseSlug) {
    const allReleases = [];
    artistsList.forEach(art => {
      const prods = Array.isArray(art.products) ? art.products : (Array.isArray(art.releases) ? art.releases : []);
      prods.forEach(pr => {
        allReleases.push({
          ...pr,
          artistName: art.name,
          artistImage: art.image
        });
      });
    });

    if (allReleases.length > 0) {
      root.innerHTML = `
        <section class="smart-page" style="max-width:600px;">
          <a class="smart-logo" href="/">UNIFLOWs</a>
          <h1 style="margin-top:6vh;font-size:clamp(32px, 6vw, 44px);letter-spacing:-0.03em;">SmartLink Hub</h1>
          <p style="color:#aaa;margin-bottom:20px;font-size:14px;">Chọn một bản phát hành của nghệ sĩ UniFLOWs để nghe trực tiếp:</p>
          <div class="smart-platforms" style="margin-top:0;">
            ${allReleases.map(r => `
              <a href="/listen/${encodeURIComponent(r.slug || slug(r.title))}" style="display:flex;align-items:center;gap:12px;text-align:left;padding:12px 16px;">
                <img src="${esc(r.artworkUrl || r.artistImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80')}" style="width:46px;height:46px;object-fit:cover;border-radius:4px;border:1px solid #444;" alt="${esc(r.title)}">
                <div style="flex:1;min-width:0;">
                  <strong style="display:block;font-size:15px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
                  <span style="font-size:12px;color:#aaa;">${esc(r.artistName)} · ${esc(r.type || 'Single')}</span>
                </div>
                <span>↗</span>
              </a>
            `).join('')}
          </div>
          <a class="button alt" href="/" style="margin-top:20px;border:1px solid #fff;color:#fff;padding:8px 20px;font-weight:bold;">← Về trang chủ</a>
        </section>
      `;
      return;
    }
  }

  // If still not found and data is loading, show clean loader
  if (!a || !p) {
    if (!isDataLoaded) {
      root.innerHTML = `
        <section class="smart-page">
          <a class="smart-logo" href="/">UNIFLOWs</a>
          <div style="margin-top:25vh;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;animation:pulse 1.5s infinite;">🎵</div>
            <p style="color:#aaa;font-family:'DM Mono',monospace;font-size:13px;letter-spacing:1px;">ĐANG TẢI SMART LINK...</p>
          </div>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="smart-page">
        <a class="smart-logo" href="/">UNIFLOWs</a>
        <h1 style="margin-top:18vh;font-size:64px;letter-spacing:-0.05em;">404</h1>
        <p class="smart-error" style="padding:0;margin:12px 0 20px;font-size:15px;color:#aaa;">Không tìm thấy bản phát hành Smart Link này.</p>
        <a class="button alt" href="/listen" style="border:1px solid #fff;color:#fff;font-weight:bold;padding:10px 24px;border-radius:4px;margin-right:8px;">Xem danh sách SmartLinks</a>
        <a class="button alt" href="/" style="border:1px solid #555;color:#aaa;font-weight:bold;padding:10px 24px;border-radius:4px;">Về trang chủ →</a>
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
      <a class="smart-logo" href="/">UNIFLOWs</a>
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
  isDataLoaded = true;
  renderAll();
}).catch(err => {
  console.warn('getData error in app.js:', err);
  isDataLoaded = true;
  renderAll();
});

$('.close-modal')?.addEventListener('click', () => $('#smart-modal')?.classList.remove('show'));
$('#smart-modal')?.addEventListener('click', e => {
  if (e.target === $('#smart-modal')) $('#smart-modal').classList.remove('show');
});

// ----------------------------------------------------
// DYNAMIC BREATHING MULTI-RING CURSOR CONTROLLER
// ----------------------------------------------------
function initCustomCursor() {
  if (window.matchMedia('(hover: none) or (pointer: coarse)').matches) return;

  let dot = document.querySelector('.uniflows-cursor-dot');
  let aura = document.querySelector('.uniflows-cursor-aura');

  if (!dot) {
    dot = document.createElement('div');
    dot.className = 'uniflows-cursor-dot';
    document.body.appendChild(dot);
  }
  if (!aura) {
    aura = document.createElement('div');
    aura.className = 'uniflows-cursor-aura';
    aura.innerHTML = `
      <span class="ring ring-outer"></span>
      <span class="ring ring-1"></span>
      <span class="ring ring-core"></span>
    `;
    document.body.appendChild(aura);
  }

  let mouseX = -100, mouseY = -100;
  let auraX = -100, auraY = -100;
  let isMoving = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
    if (!isMoving) {
      isMoving = true;
      auraX = mouseX;
      auraY = mouseY;
    }
  }, { passive: true });

  window.addEventListener('mousedown', () => document.body.classList.add('cursor-active'));
  window.addEventListener('mouseup', () => document.body.classList.remove('cursor-active'));

  // Smooth fluid lerp interpolation for giant atmospheric aura
  function animateAura() {
    auraX += (mouseX - auraX) * 0.11;
    auraY += (mouseY - auraY) * 0.11;
    aura.style.left = `${auraX}px`;
    aura.style.top = `${auraY}px`;
    requestAnimationFrame(animateAura);
  }
  requestAnimationFrame(animateAura);

  // Hover detection on interactive elements
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a, button, input, select, textarea, .artist, .card, .producer-track-row, .hube-service-card, .release, .track-link-pill');
    if (target) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('a, button, input, select, textarea, .artist, .card, .producer-track-row, .hube-service-card, .release, .track-link-pill');
    if (target) {
      document.body.classList.remove('cursor-hover');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else {
  initCustomCursor();
}
