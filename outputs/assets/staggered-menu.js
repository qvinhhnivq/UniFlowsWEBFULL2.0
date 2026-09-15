/**
 * StaggeredMenu — Vanilla JS + CSS + GSAP port of React Bits StaggeredMenu
 * Designed for UniFLOWs Label platform
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
  position: 'right',
  colors: ['#B497CF', '#00d2ff', '#5227FF'],
  items: [],
  socialItems: [],
  displaySocials: true,
  displayItemNumbering: true,
  menuButtonColor: 'currentColor',
  openMenuButtonColor: '#ffffff',
  accentColor: '#00d2ff',
  changeMenuColorOnOpen: true,
  closeOnClickAway: true,
  onMenuOpen: null,
  onMenuClose: null,
};

export async function initStaggeredMenu(mountTarget, options = {}) {
  const gsap = await ensureGSAP();
  const opts = { ...DEFAULTS, ...options };

  const mountEl = typeof mountTarget === 'string' ? document.querySelector(mountTarget) : mountTarget;
  if (!mountEl) {
    console.warn(`StaggeredMenu: mount target "${mountTarget}" not found`);
    return null;
  }

  // Ensure CSS is loaded
  if (!document.querySelector('link[href*="staggered-menu.css"]')) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'assets/staggered-menu.css';
    document.head.appendChild(cssLink);
  }

  let open = false;
  let busy = false;
  let textLines = ['Menu', 'Close'];

  // 1. Fixed overlay wrapper in body
  const wrapper = el('div', {
    class: 'staggered-menu-wrapper',
    'data-position': opts.position,
  });
  if (opts.accentColor) {
    wrapper.style.setProperty('--sm-accent', opts.accentColor);
  }

  // Backdrop for click-away
  const backdrop = el('div', { class: 'sm-backdrop', 'aria-hidden': 'true' });
  wrapper.appendChild(backdrop);

  // Pre-layers (Color ribbons)
  const preLayers = el('div', { class: 'sm-prelayers', 'aria-hidden': 'true' });
  const rawColors = opts.colors && opts.colors.length ? opts.colors : ['#B497CF', '#00d2ff', '#5227FF'];
  const preLayerEls = rawColors.map(c => {
    const layer = el('div', { class: 'sm-prelayer' });
    layer.style.backgroundColor = c;
    return layer;
  });
  preLayerEls.forEach(l => preLayers.appendChild(l));
  wrapper.appendChild(preLayers);

  // 2. Sliding Panel
  const panel = el('aside', {
    id: 'staggered-menu-panel',
    class: 'staggered-menu-panel',
    'aria-hidden': 'true',
  });

  const panelInner = el('div', { class: 'sm-panel-inner' });

  // Panel Header
  const panelHeader = el('div', { class: 'sm-panel-header' });
  const panelBrand = el('div', { class: 'sm-panel-brand' }, [
    document.createTextNode('UNIFLOWs '),
    el('small', {}, ['LABEL / NAVIGATION'])
  ]);
  const panelCloseBtn = el('button', {
    class: 'sm-panel-close-btn',
    'aria-label': 'Đóng menu',
    type: 'button',
    html: '&#x2715;'
  });
  panelCloseBtn.addEventListener('click', () => doClose());
  panelHeader.appendChild(panelBrand);
  panelHeader.appendChild(panelCloseBtn);
  panelInner.appendChild(panelHeader);

  // Panel List
  const panelList = el('ul', { class: 'sm-panel-list', role: 'list' });
  if (opts.displayItemNumbering) {
    panelList.setAttribute('data-numbering', '');
  }

  (opts.items || []).forEach((it, idx) => {
    const li = el('li', { class: 'sm-panel-itemWrap' });
    const itemClasses = ['sm-panel-item'];
    if (it.highlight) itemClasses.push('is-highlight');
    if (it.isSpecial) itemClasses.push('is-special');

    const itemAttrs = {
      class: itemClasses.join(' '),
      href: it.link,
      'data-index': String(idx + 1),
    };
    if (it.ariaLabel) itemAttrs['aria-label'] = it.ariaLabel;
    if (it.i18nKey) itemAttrs['data-i18n'] = it.i18nKey;

    const a = el('a', itemAttrs);
    const labelSpan = el('span', { class: 'sm-panel-itemLabel' });
    labelSpan.textContent = it.label;
    a.appendChild(labelSpan);

    a.addEventListener('click', () => {
      doClose();
    });

    li.appendChild(a);
    panelList.appendChild(li);
  });
  panelInner.appendChild(panelList);

  // Socials at bottom
  if (opts.displaySocials && opts.socialItems && opts.socialItems.length > 0) {
    const socials = el('div', { class: 'sm-socials', 'aria-label': 'Social links' });
    socials.appendChild(el('h3', { class: 'sm-socials-title' }, ['Connect / Socials']));
    const list = el('ul', { class: 'sm-socials-list', role: 'list' });
    opts.socialItems.forEach(s => {
      const li = el('li', { class: 'sm-socials-item' });
      const a = el('a', {
        href: s.link,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'sm-socials-link',
      }, [s.label]);
      li.appendChild(a);
      list.appendChild(li);
    });
    socials.appendChild(list);
    panelInner.appendChild(socials);
  }

  panel.appendChild(panelInner);
  wrapper.appendChild(panel);
  document.body.appendChild(wrapper);

  // 3. Trigger button mounted into mountEl
  const toggleBtn = el('button', {
    class: 'sm-toggle',
    'aria-label': 'Mở menu',
    'aria-expanded': 'false',
    'aria-controls': 'staggered-menu-panel',
    type: 'button',
  });

  const textWrap = el('span', { class: 'sm-toggle-textWrap', 'aria-hidden': 'true' });
  const textInner = el('span', { class: 'sm-toggle-textInner' });
  function renderTextLines() {
    textInner.innerHTML = '';
    textLines.forEach(l => {
      textInner.appendChild(el('span', { class: 'sm-toggle-line' }, [l]));
    });
  }
  renderTextLines();
  textWrap.appendChild(textInner);

  const icon = el('span', { class: 'sm-icon', 'aria-hidden': 'true' });
  const plusH = el('span', { class: 'sm-icon-line' });
  const plusV = el('span', { class: 'sm-icon-line' });
  gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
  icon.appendChild(plusH);
  icon.appendChild(plusV);

  toggleBtn.appendChild(textWrap);
  toggleBtn.appendChild(icon);
  mountEl.innerHTML = '';
  mountEl.appendChild(toggleBtn);

  // Initial GSAP states
  const offscreen = opts.position === 'left' ? -100 : 100;
  gsap.set([panel, ...preLayerEls], { xPercent: offscreen });
  gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
  gsap.set(textInner, { yPercent: 0 });

  let openTl = null;
  let closeTween = null;
  let spinTween = null;
  let textCycleAnim = null;
  let colorTween = null;

  function buildOpenTimeline() {
    openTl?.kill();
    closeTween?.kill();
    closeTween = null;

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const off = opts.position === 'left' ? -100 : 100;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 120, rotate: 6, opacity: 0 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 15, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    // Staggered pre-layers
    preLayerEls.forEach((layer, i) => {
      tl.fromTo(layer, { xPercent: off }, { xPercent: 0, duration: 0.45, ease: 'power4.out' }, i * 0.06);
    });

    const lastTime = preLayerEls.length ? (preLayerEls.length - 1) * 0.06 : 0;
    const panelInsertTime = lastTime + (preLayerEls.length ? 0.07 : 0);
    const panelDuration = 0.55;

    tl.fromTo(panel, { xPercent: off }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    // Staggered items cascade
    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(itemEls, {
        yPercent: 0,
        rotate: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power4.out',
        stagger: { each: 0.05, from: 'start' },
      }, itemsStart);

      if (numberEls.length) {
        tl.to(numberEls, {
          duration: 0.4,
          ease: 'power2.out',
          '--sm-num-opacity': 1,
          stagger: { each: 0.05, from: 'start' },
        }, itemsStart + 0.05);
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.35;
      if (socialTitle) {
        tl.to(socialTitle, { opacity: 1, duration: 0.4, ease: 'power2.out' }, socialsStart);
      }
      if (socialLinks.length) {
        tl.to(socialLinks, {
          y: 0,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
          stagger: { each: 0.05, from: 'start' },
        }, socialsStart + 0.05);
      }
    }

    openTl = tl;
    return tl;
  }

  function playOpen() {
    if (busy) return;
    busy = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busy = false; });
      tl.play(0);
    } else {
      busy = false;
    }
  }

  function playClose() {
    openTl?.kill();
    openTl = null;

    const all = [...preLayerEls, panel];
    closeTween?.kill();
    const off = opts.position === 'left' ? -100 : 100;
    closeTween = gsap.to(all, {
      xPercent: off,
      duration: 0.3,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 120, rotate: 6, opacity: 0 });
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 15, opacity: 0 });
        busy = false;
      },
    });
  }

  function animateIcon(opening) {
    spinTween?.kill();
    spinTween = opening
      ? gsap.to(icon, { rotate: 225, duration: 0.6, ease: 'power4.out', overwrite: 'auto' })
      : gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
  }

  function animateColor(opening) {
    colorTween?.kill();
    if (opts.changeMenuColorOnOpen) {
      const targetColor = opening ? opts.openMenuButtonColor : opts.menuButtonColor;
      colorTween = gsap.to(toggleBtn, { color: targetColor, duration: 0.25, ease: 'power2.out' });
    }
  }

  function animateText(opening) {
    textCycleAnim?.kill();
    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 2;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    textLines = seq;
    renderTextLines();

    gsap.set(textInner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnim = gsap.to(textInner, {
      yPercent: -finalShift,
      duration: 0.4 + lineCount * 0.05,
      ease: 'power4.out',
    });
  }

  function setOpenState(next) {
    open = next;
    wrapper.toggleAttribute('data-open', open);
    toggleBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    toggleBtn.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  }

  function doOpen() {
    if (open) return;
    document.body.style.overflow = 'hidden';
    setOpenState(true);
    opts.onMenuOpen?.();
    playOpen();
    animateIcon(true);
    animateColor(true);
    animateText(true);
  }

  function doClose() {
    if (!open) return;
    document.body.style.overflow = '';
    setOpenState(false);
    opts.onMenuClose?.();
    playClose();
    animateIcon(false);
    animateColor(false);
    animateText(false);
  }

  function toggleMenu() {
    open ? doClose() : doOpen();
  }

  toggleBtn.addEventListener('click', toggleMenu);
  backdrop.addEventListener('click', doClose);

  function handleKeydown(e) {
    if (e.key === 'Escape' && open) {
      doClose();
    }
  }
  document.addEventListener('keydown', handleKeydown);

  function handleClickOutside(e) {
    if (!opts.closeOnClickAway || !open) return;
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target) && !mountEl.contains(e.target)) {
      doClose();
    }
  }
  document.addEventListener('mousedown', handleClickOutside);

  return {
    open: doOpen,
    close: doClose,
    toggle: toggleMenu,
    updateLabels(isEn) {
      panel.querySelectorAll('.sm-panel-item').forEach((itemNode) => {
        const idx = parseInt(itemNode.getAttribute('data-index') || '0', 10) - 1;
        const it = opts.items[idx];
        if (it) {
          const labelSpan = itemNode.querySelector('.sm-panel-itemLabel');
          if (labelSpan) {
            labelSpan.textContent = isEn ? (it.enLabel || it.label) : it.label;
          }
        }
      });
    },
    updateSocials(newSocials) {
      if (!Array.isArray(newSocials)) return;
      opts.socialItems = newSocials;
      let socials = panelInner.querySelector('.sm-socials');
      if (!socials && opts.displaySocials && newSocials.length > 0) {
        socials = el('div', { class: 'sm-socials', 'aria-label': 'Social links' });
        socials.appendChild(el('h3', { class: 'sm-socials-title' }, ['Connect / Socials']));
        const list = el('ul', { class: 'sm-socials-list', role: 'list' });
        socials.appendChild(list);
        panelInner.appendChild(socials);
      }
      if (socials) {
        const list = socials.querySelector('.sm-socials-list');
        if (list) {
          list.innerHTML = '';
          newSocials.forEach(s => {
            if (!s || !s.label) return;
            const li = el('li', { class: 'sm-socials-item' });
            const a = el('a', {
              href: s.link || '#',
              target: '_blank',
              rel: 'noopener noreferrer',
              class: 'sm-socials-link',
            }, [s.label]);
            li.appendChild(a);
            list.appendChild(li);
          });
        }
      }
    },
    destroy() {
      toggleBtn.removeEventListener('click', toggleMenu);
      backdrop.removeEventListener('click', doClose);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleClickOutside);
      openTl?.kill();
      closeTween?.kill();
      spinTween?.kill();
      textCycleAnim?.kill();
      colorTween?.kill();
      wrapper.remove();
    },
  };
}
