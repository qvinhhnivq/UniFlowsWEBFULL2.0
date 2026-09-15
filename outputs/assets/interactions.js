/**
 * Monopo Saigon — Luxury Editorial Interactions Engine
 * Features:
 * - Magnetic Custom Fluid Cursor with hover expansion into ghost pills
 * - Ambient Sound Aura visualizer toggle
 * - Cookie consent banner logic
 * - Section reveals with cubic-bezier(0.19, 1, 0.22, 1)
 */

export function initInteractions() {
  // 1. Custom Magnetic Fluid Cursor (Desktop only)
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch && !document.querySelector('.custom-cursor')) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.innerHTML = `
      <div class="cursor-dot"></div>
      <div class="cursor-ring"></div>
    `;
    document.body.appendChild(cursor);

    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });

    function renderCursor() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      requestAnimationFrame(renderCursor);
    }
    renderCursor();

    // Hover interactions
    const hoverTargets = 'a, button, input, .artist-row, .btn-ghost-dark, .btn-ghost-light, .scroll-badge, [data-cursor]';
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest(hoverTargets);
      if (target) {
        cursor.classList.add('cursor-hover');
        if (target.classList.contains('artist-row') || target.closest('[data-artists]')) {
          cursor.classList.add('cursor-view');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest(hoverTargets);
      if (target) {
        cursor.classList.remove('cursor-hover', 'cursor-view');
      }
    });
  }

  // 2. Cookie Consent Banner (Matching Slate Pill #636363 spec)
  const cookieKey = 'monopo_saigon_cookie_consent';
  if (!localStorage.getItem(cookieKey) && !document.querySelector('.cookie-banner')) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-content">
        <p>This site uses cookies to deliver editorial silence and seamless experiences. By continuing to browse, you agree to our terms.</p>
        <button type="button" class="btn-neutral-pill" id="btn-cookie-accept">Accept</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector('#btn-cookie-accept')?.addEventListener('click', () => {
      localStorage.setItem(cookieKey, 'true');
      banner.style.opacity = '0';
      banner.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => banner.remove(), 800);
    });
  }

  // 3. Ambient Audio Aura Visualizer Toggle (Mock Audio Experience)
  const audioBtn = document.querySelector('.audio-aura-btn');
  if (audioBtn) {
    let isPlaying = false;
    audioBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      audioBtn.classList.toggle('playing', isPlaying);
      const text = audioBtn.querySelector('.audio-status');
      if (text) text.textContent = isPlaying ? 'SOUND: ON' : 'SOUND: OFF';
    });
  }
}
