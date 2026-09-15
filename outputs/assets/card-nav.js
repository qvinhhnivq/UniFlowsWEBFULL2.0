/**
 * CardNav — Vanilla JS + CSS + GSAP port of React Bits CardNav
 * Designed for UniPORTAL (Artist Portal)
 * Pure typographic styling with zero emojis or icons
 */

export async function ensureGSAP() {
  if (window.gsap) return window.gsap;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="gsap"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.gsap));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js';
    script.onload = () => resolve(window.gsap);
    script.onerror = () => reject(new Error('Failed to load GSAP CDN'));
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
  const toggleBtn = el('button', {
    class: 'card-nav-btn',
    type: 'button',
    'aria-label': 'Menu điều hướng',
    'aria-expanded': 'false',
  }, ['Menu']);

  if (opts.buttonBgColor) toggleBtn.style.backgroundColor = opts.buttonBgColor;
  if (opts.buttonTextColor) toggleBtn.style.color = opts.buttonTextColor;

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
          document.querySelector('#open-password-dialog-btn')?.click();
        } else if (linkItem.action === 'theme') {
          document.querySelector('#theme-toggle-btn')?.click() || document.querySelector('#mobile-theme-toggle-btn')?.click();
        } else if (linkItem.action === 'logout') {
          document.querySelector('#artist-logout')?.click();
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
  }

  function doClose() {
    if (!open || busy) return;
    busy = true;
    open = false;
    wrapper.removeAttribute('data-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.textContent = 'Menu';
    backdrop.classList.remove('active');

    gsap.to(dropdown, {
      height: 0,
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => {
        dropdown.style.opacity = '0';
        busy = false;
      }
    });
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

  return {
    open: doOpen,
    close: doClose,
    toggle,
    updateArtistInfo(name, role) {
      const nameEl = document.querySelector('#card-nav-artist-name');
      const statusEl = document.querySelector('#card-nav-artist-status');
      if (nameEl && name) nameEl.textContent = name;
      if (statusEl && role) statusEl.textContent = role;
    },
    destroy() {
      toggleBtn.removeEventListener('click', toggle);
      backdrop.removeEventListener('click', doClose);
      document.removeEventListener('keydown', handleKeydown);
      backdrop.remove();
      wrapper.remove();
    }
  };
}
