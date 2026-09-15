/**
 * CardNav — Vanilla JS + CSS + GSAP port of React Bits CardNav
 * Designed for UniPORTAL (Artist Portal)
 * Pure typographic styling with zero emojis or icons
 */

export async function ensureGSAP() {
  if (typeof window !== 'undefined' && window.gsap) return window.gsap;
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="gsap"]');
    if (existing) {
      if (window.gsap) return resolve(window.gsap);
      existing.addEventListener('load', () => resolve(window.gsap || null), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
      setTimeout(() => resolve(window.gsap || null), 1000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js';
    script.onload = () => resolve(window.gsap || null);
    script.onerror = () => resolve(null);
    setTimeout(() => resolve(window.gsap || null), 1500);
    document.head.appendChild(script);
  });
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  children.forEach(c => {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

const DEFAULTS = {
  items: [],
  baseColor: '#ffffff',
  menuColor: '#000000',
  buttonBgColor: '#111111',
  buttonTextColor: '#ffffff',
  ease: 'power3.out',
  theme: 'dark',
  artistName: 'Nghệ sĩ',
  artistRole: 'Studio Online',
};

export async function initCardNav(mountTarget, options = {}) {
  const gsap = await ensureGSAP();
  const opts = { ...DEFAULTS, ...options };

  const mountEl = typeof mountTarget === 'string' ? document.querySelector(mountTarget) : mountTarget;
  if (!mountEl) {
    console.warn(`CardNav: target "${mountTarget}" not found`);
    return null;
  }

  // Ensure card-nav.css is loaded
  if (!document.querySelector('link[href*="card-nav.css"]')) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'assets/card-nav.css';
    document.head.appendChild(cssLink);
  }

  let open = false;
  let busy = false;

  // Root wrapper
  const wrapper = el('div', { class: 'card-nav-wrapper' });

  // Top Bar
  const bar = el('div', { class: 'card-nav-bar' });
  const barLeft = el('div', { class: 'card-nav-left' });
  
  const brandLink = el('a', { class: 'card-nav-brand', href: 'index.html' }, [
    document.createTextNode('UNIFLOWs'),
    el('small', {}, ['UniPORTAL'])
  ]);

  const artistBadge = el('div', { class: 'card-nav-artist-badge' }, [
    el('span', { id: 'card-nav-artist-name' }, [opts.artistName]),
    document.createTextNode(' / '),
    el('span', { id: 'card-nav-artist-status', style: 'opacity: 0.6;' }, [opts.artistRole])
  ]);

  barLeft.appendChild(brandLink);
  barLeft.appendChild(artistBadge);

  const barRight = el('div', { class: 'card-nav-right' });

  // 1. Language Segmented Switch (VIE / ENG)
  const currentLang = localStorage.getItem('uniflows-lang') || 'vi';
  const langSwitch = el('div', { class: 'card-nav-lang-switch', role: 'group', 'aria-label': 'Ngôn ngữ' }, [
    el('button', {
      type: 'button',
      class: 'card-nav-lang-btn' + (currentLang === 'vi' ? ' active' : ''),
      'data-lang': 'vi',
      title: 'Tiếng Việt'
    }, ['VIE']),
    el('button', {
      type: 'button',
      class: 'card-nav-lang-btn' + (currentLang === 'en' ? ' active' : ''),
      'data-lang': 'en',
      title: 'English'
    }, ['ENG'])
  ]);

  langSwitch.querySelectorAll('.card-nav-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetLang = btn.dataset.lang;
      langSwitch.querySelectorAll('.card-nav-lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (typeof opts.onLangChange === 'function') {
        opts.onLangChange(targetLang);
      } else {
        localStorage.setItem('uniflows-lang', targetLang);
        if (window.setLang) window.setLang(targetLang);
      }
    });
  });

  // 2. Theme Switcher Slider (Cần gạt sáng/tối)
  const isDarkInitial = document.body.classList.contains('dark-mode') || document.documentElement.getAttribute('data-theme') === 'dark' || localStorage.getItem('uniflows-portal-theme') === 'dark';
  const themeSwitch = el('button', {
    type: 'button',
    class: 'card-nav-theme-slider' + (isDarkInitial ? ' is-dark' : ' is-light'),
    id: 'top-nav-theme-slider',
    'aria-label': 'Chuyển đổi giao diện sáng tối',
    title: isDarkInitial ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'
  }, [
    el('span', { class: 'slider-track' }, [
      el('span', { class: 'slider-thumb' }, [
        el('span', { class: 'slider-icon sun' }, ['☀️']),
        el('span', { class: 'slider-icon moon' }, ['🌙'])
      ])
    ])
  ]);

  themeSwitch.addEventListener('click', () => {
    if (typeof opts.onThemeToggle === 'function') {
      const isNowDark = opts.onThemeToggle();
      themeSwitch.classList.toggle('is-dark', isNowDark);
      themeSwitch.classList.toggle('is-light', !isNowDark);
    } else {
      const isDark = document.body.classList.contains('dark-mode');
      const nextDark = !isDark;
      document.body.classList.toggle('dark-mode', nextDark);
      document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
      localStorage.setItem('uniflows-portal-theme', nextDark ? 'dark' : 'light');
      themeSwitch.classList.toggle('is-dark', nextDark);
      themeSwitch.classList.toggle('is-light', !nextDark);
    }
  });

  // 3. Profile & Settings Trigger
  const profileBtn = el('button', {
    type: 'button',
    class: 'card-nav-profile-pill',
    id: 'top-nav-profile-pill',
    'aria-label': 'Hồ sơ & Cài đặt',
    title: 'Hồ sơ cá nhân & Cài đặt ngân hàng'
  }, [
    el('span', { style: 'font-size:13px;' }, ['⚙️']),
    el('span', { class: 'profile-pill-text' }, ['Hồ sơ'])
  ]);

  profileBtn.addEventListener('click', () => {
    if (typeof opts.onProfileClick === 'function') {
      opts.onProfileClick();
    } else {
      const pDialog = document.querySelector('#profile-settings-dialog');
      if (pDialog) pDialog.showModal();
    }
  });

  // 4. Drawer Menu Toggle Button
  const toggleBtn = el('button', {
    class: 'card-nav-btn',
    type: 'button',
    'aria-label': 'Menu điều hướng',
    'aria-expanded': 'false',
  }, ['Menu']);

  if (opts.buttonBgColor) toggleBtn.style.backgroundColor = opts.buttonBgColor;
  if (opts.buttonTextColor) toggleBtn.style.color = opts.buttonTextColor;

  barRight.appendChild(langSwitch);
  barRight.appendChild(themeSwitch);
  barRight.appendChild(profileBtn);
  barRight.appendChild(toggleBtn);
  bar.appendChild(barLeft);
  bar.appendChild(barRight);
  wrapper.appendChild(bar);

  // Backdrop
  const backdrop = el('div', { class: 'card-nav-backdrop', 'aria-hidden': 'true' });
  document.body.appendChild(backdrop);

  // Dropdown Drawer Container
  const dropdown = el('div', { class: 'card-nav-dropdown' });
  const cardsContainer = el('div', { class: 'card-nav-cards' });

  // Render cards
  const cardElements = [];
  (opts.items || []).forEach(item => {
    const card = el('div', { class: 'card-nav-card' });
    if (item.bgColor) card.style.backgroundColor = item.bgColor;
    if (item.textColor) card.style.color = item.textColor;

    const cardLabel = el('div', { class: 'card-nav-card-label' }, [item.title || item.label]);
    if (item.accentColor) cardLabel.style.color = item.accentColor;
    card.appendChild(cardLabel);

    const linksList = el('ul', { class: 'card-nav-card-links' });
    (item.links || []).forEach(linkItem => {
      const li = el('li');
      const btn = el('button', {
        class: 'card-nav-link' + (linkItem.isDanger ? ' is-danger' : ''),
        type: 'button',
        'aria-label': linkItem.ariaLabel || linkItem.label,
      }, [linkItem.label]);

      btn.addEventListener('click', () => {
        doClose();
        if (typeof linkItem.onClick === 'function') {
          linkItem.onClick();
        } else if (linkItem.action === 'password') {
          const openBtn = document.querySelector('#open-profile-settings-btn');
          if (openBtn) openBtn.click();
          setTimeout(() => {
            document.querySelector('.profile-tab-btn[data-tab="profile-tab-security"]')?.click();
          }, 50);
        } else if (linkItem.action === 'theme') {
          document.querySelector('#theme-toggle-btn')?.click() || document.querySelector('#mobile-theme-toggle-btn')?.click();
        } else if (linkItem.action === 'logout') {
          if (typeof window.performArtistLogout === 'function') {
            window.performArtistLogout();
          } else {
            const pLogoutBtn = document.querySelector('#profile-logout-btn') || document.querySelector('#artist-logout');
            if (pLogoutBtn) pLogoutBtn.click();
            else {
              localStorage.removeItem('uniflows-artist');
              sessionStorage.removeItem('uniflows-artist');
              location.href = 'artist-login';
            }
          }
        } else if (linkItem.hash) {
          location.hash = linkItem.hash;
        } else if (linkItem.tab) {
          location.hash = linkItem.tab.replace('tab-', '');
        }
      });

      li.appendChild(btn);
      linksList.appendChild(li);
    });

    card.appendChild(linksList);
    cardsContainer.appendChild(card);
    cardElements.push(card);
  });

  dropdown.appendChild(cardsContainer);
  wrapper.appendChild(dropdown);
  mountEl.innerHTML = '';
  mountEl.appendChild(wrapper);

  // GSAP animations
  function doOpen() {
    if (open || busy) return;
    busy = true;
    open = true;
    wrapper.setAttribute('data-open', '');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.textContent = 'Close';
    backdrop.classList.add('active');

    // Auto calculate target height
    dropdown.style.height = 'auto';
    dropdown.style.opacity = '1';
    const naturalHeight = dropdown.offsetHeight;
    dropdown.style.height = '0px';

    if (gsap) {
      gsap.to(dropdown, {
        height: naturalHeight,
        duration: 0.45,
        ease: opts.ease || 'power3.out',
        onComplete: () => {
          dropdown.style.height = 'auto';
          busy = false;
        }
      });

      gsap.fromTo(cardElements, 
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.08, delay: 0.1 }
      );
    } else {
      dropdown.style.height = 'auto';
      cardElements.forEach(c => { c.style.opacity = '1'; c.style.transform = 'none'; });
      busy = false;
    }
  }

  function doClose() {
    if (!open || busy) return;
    busy = true;
    open = false;
    wrapper.removeAttribute('data-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.textContent = 'Menu';
    backdrop.classList.remove('active');

    if (gsap) {
      gsap.to(dropdown, {
        height: 0,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => {
          dropdown.style.opacity = '0';
          busy = false;
        }
      });
    } else {
      dropdown.style.height = '0px';
      dropdown.style.opacity = '0';
      busy = false;
    }
  }

  function toggle() {
    open ? doClose() : doOpen();
  }

  toggleBtn.addEventListener('click', toggle);
  backdrop.addEventListener('click', doClose);

  function handleKeydown(e) {
    if (e.key === 'Escape' && open) doClose();
  }
  document.addEventListener('keydown', handleKeydown);

  const instance = {
    open: doOpen,
    close: doClose,
    toggle,
    updateArtistInfo(name, role) {
      const nameEl = document.querySelector('#card-nav-artist-name');
      const statusEl = document.querySelector('#card-nav-artist-status');
      if (nameEl && name) nameEl.textContent = name;
      if (statusEl && role) statusEl.textContent = role;
    },
    setTheme(isDark) {
      themeSwitch.classList.toggle('is-dark', isDark);
      themeSwitch.classList.toggle('is-light', !isDark);
      themeSwitch.title = isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
    },
    setLanguage(lang) {
      langSwitch.querySelectorAll('.card-nav-lang-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
      });
    },
    destroy() {
      toggleBtn.removeEventListener('click', toggle);
      backdrop.removeEventListener('click', doClose);
      document.removeEventListener('keydown', handleKeydown);
      backdrop.remove();
      wrapper.remove();
    }
  };

  window.cardNavInstance = instance;
  return instance;
}

