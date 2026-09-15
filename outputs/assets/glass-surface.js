/**
 * GlassSurface — Vanilla JS + CSS + SVG Filters port of React Bits GlassSurface
 * Creates realistic liquid glass & chromatic aberration refractive surfaces
 * Designed for UniPORTAL & UniFLOWs
 */

let filterCount = 0;

/**
 * Checks if current browser supports SVG filters inside backdrop-filter
 */
export function supportsSVGFilters() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  if (isWebkit || isFirefox) {
    return false;
  }
  const div = document.createElement('div');
  div.style.backdropFilter = 'url(#test-glass-filter)';
  return div.style.backdropFilter !== '';
}

/**
 * Generates an SVG Displacement Map Data URI
 */
export function generateDisplacementMapDataUri({
  width = 400,
  height = 200,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  mixBlendMode = 'difference',
  redGradId,
  blueGradId
}) {
  const actualWidth = Math.max(10, width);
  const actualHeight = Math.max(10, height);
  const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

  const svgContent = `
    <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="red"/>
        </linearGradient>
        <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="blue"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
      <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
      <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
      <rect x="${edgeSize}" y="${edgeSize}" width="${Math.max(1, actualWidth - edgeSize * 2)}" height="${Math.max(1, actualHeight - edgeSize * 2)}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
}

/**
 * Creates and injects an SVG displacement and chromatic aberration filter
 */
export function createGlassSvgFilter({
  id,
  width = 400,
  height = 200,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0.7,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference'
}) {
  let svgDefs = document.querySelector('#glass-surface-svg-defs');
  if (!svgDefs) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'glass-surface-svg-defs';
    svg.setAttribute('class', 'glass-svg-defs-container');
    svg.setAttribute('aria-hidden', 'true');
    document.body.appendChild(svg);
    svgDefs = svg;
  }

  const redGradId = `red-grad-${id}`;
  const blueGradId = `blue-grad-${id}`;
  const mapUri = generateDisplacementMapDataUri({
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    mixBlendMode,
    redGradId,
    blueGradId
  });

  let filter = document.getElementById(id);
  if (!filter) {
    filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;
    filter.setAttribute('x', '0%');
    filter.setAttribute('y', '0%');
    filter.setAttribute('width', '100%');
    filter.setAttribute('height', '100%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    svgDefs.appendChild(filter);
  }

  filter.innerHTML = `
    <feImage id="feImg-${id}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" href="${mapUri}" />

    <!-- Red Channel Displacement -->
    <feDisplacementMap id="dispRed-${id}" in="SourceGraphic" in2="map" scale="${distortionScale + redOffset}" xChannelSelector="${xChannel}" yChannelSelector="${yChannel}" result="dispRed" />
    <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />

    <!-- Green Channel Displacement -->
    <feDisplacementMap id="dispGreen-${id}" in="SourceGraphic" in2="map" scale="${distortionScale + greenOffset}" xChannelSelector="${xChannel}" yChannelSelector="${yChannel}" result="dispGreen" />
    <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />

    <!-- Blue Channel Displacement -->
    <feDisplacementMap id="dispBlue-${id}" in="SourceGraphic" in2="map" scale="${distortionScale + blueOffset}" xChannelSelector="${xChannel}" yChannelSelector="${yChannel}" result="dispBlue" />
    <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />

    <!-- Screen Blend Channels -->
    <feBlend in="red" in2="green" mode="screen" result="rg" />
    <feBlend in="rg" in2="blue" mode="screen" result="output" />
    <feGaussianBlur in="output" stdDeviation="${displace}" />
  `;

  return { filterId: id, redGradId, blueGradId, mapUri };
}

/**
 * Creates a standalone GlassSurface container
 */
export function createGlassSurface(options = {}) {
  const {
    width = 200,
    height = 80,
    borderRadius = 20,
    borderWidth = 0.07,
    brightness = 50,
    opacity = 0.93,
    blur = 11,
    displace = 0.7,
    distortionScale = -180,
    redOffset = 0,
    greenOffset = 10,
    blueOffset = 20,
    xChannel = 'R',
    yChannel = 'G',
    mixBlendMode = 'difference',
    backgroundOpacity = 0,
    saturation = 1.8,
    className = '',
    children = null,
    interactive = true
  } = options;

  filterCount++;
  const filterId = `glass-filter-${filterCount}`;
  const isSvgSupported = supportsSVGFilters();

  createGlassSvgFilter({
    id: filterId,
    width: typeof width === 'number' ? width : 400,
    height: typeof height === 'number' ? height : 200,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode
  });

  const surface = document.createElement('div');
  surface.className = `glass-surface ${isSvgSupported ? 'glass-surface--svg' : 'glass-surface--fallback'} ${className}`.trim();

  if (width) surface.style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) surface.style.height = typeof height === 'number' ? `${height}px` : height;
  if (borderRadius !== undefined) surface.style.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
  surface.style.setProperty('--filter-id', `url(#${filterId})`);
  surface.style.setProperty('--glass-frost', backgroundOpacity);
  surface.style.setProperty('--glass-saturation', saturation);

  // Glare
  if (interactive) {
    const glare = document.createElement('div');
    glare.className = 'glass-surface-glare';
    surface.appendChild(glare);

    surface.addEventListener('mousemove', (e) => {
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      surface.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  }

  // Content
  const content = document.createElement('div');
  content.className = 'glass-surface__content';
  if (typeof children === 'string') {
    content.innerHTML = children;
  } else if (children instanceof HTMLElement) {
    content.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(c => {
      if (typeof c === 'string') content.innerHTML += c;
      else if (c instanceof HTMLElement) content.appendChild(c);
    });
  }
  surface.appendChild(content);

  // ResizeObserver for dynamic displacement map updates
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          const redGradId = `red-grad-${filterId}`;
          const blueGradId = `blue-grad-${filterId}`;
          const map = generateDisplacementMapDataUri({
            width: w,
            height: h,
            borderRadius,
            borderWidth,
            brightness,
            opacity,
            blur,
            mixBlendMode,
            redGradId,
            blueGradId
          });
          const feImg = document.getElementById(`feImg-${filterId}`);
          if (feImg) feImg.setAttribute('href', map);
        }
      }
    });
    ro.observe(surface);
  }

  return surface;
}

/**
 * Enhances an existing DOM element with dynamic Liquid Glass displacement
 */
export function enhanceWithGlassSurface(element, options = {}) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return null;

  const {
    borderRadius = 20,
    borderWidth = 0.07,
    brightness = 50,
    opacity = 0.93,
    blur = 11,
    displace = 0.7,
    distortionScale = -160,
    redOffset = 0,
    greenOffset = 8,
    blueOffset = 16,
    xChannel = 'R',
    yChannel = 'G',
    mixBlendMode = 'difference',
    backgroundOpacity = 0,
    saturation = 1.8,
    interactive = true
  } = options;

  filterCount++;
  const filterId = `glass-filter-${filterCount}`;
  const isSvgSupported = supportsSVGFilters();

  const rect = el.getBoundingClientRect();
  const w = rect.width || 300;
  const h = rect.height || 150;

  createGlassSvgFilter({
    id: filterId,
    width: w,
    height: h,
    borderRadius: typeof borderRadius === 'number' ? borderRadius : 20,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode
  });

  el.classList.add('glass-surface');
  if (isSvgSupported) {
    el.classList.add('glass-surface--svg');
  } else {
    el.classList.add('glass-surface--fallback');
  }

  if (borderRadius !== undefined) {
    el.style.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
  }
  el.style.setProperty('--filter-id', `url(#${filterId})`);
  el.style.setProperty('--glass-frost', backgroundOpacity);
  el.style.setProperty('--glass-saturation', saturation);

  // Glare
  if (interactive && !el.querySelector('.glass-surface-glare')) {
    const glare = document.createElement('div');
    glare.className = 'glass-surface-glare';
    el.appendChild(glare);

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
      el.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
    });
  }

  // Dynamic Resize Tracking
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: rw, height: rh } = entry.contentRect;
        if (rw > 0 && rh > 0) {
          const redGradId = `red-grad-${filterId}`;
          const blueGradId = `blue-grad-${filterId}`;
          const map = generateDisplacementMapDataUri({
            width: rw,
            height: rh,
            borderRadius: typeof borderRadius === 'number' ? borderRadius : 20,
            borderWidth,
            brightness,
            opacity,
            blur,
            mixBlendMode,
            redGradId,
            blueGradId
          });
          const feImg = document.getElementById(`feImg-${filterId}`);
          if (feImg) feImg.setAttribute('href', map);
        }
      }
    });
    ro.observe(el);
  }

  return el;
}

/**
 * Automatically applies glass surface styling to UniPORTAL components
 */
export function initPortalGlassSurfaces() {
  // Ensure CSS is loaded
  if (!document.querySelector('link[href*="glass-surface.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/glass-surface.css';
    document.head.appendChild(link);
  }

  // 1. Navigation Menu Liquid Glass
  enhanceWithGlassSurface('.card-nav-bar', {
    borderRadius: 0,
    distortionScale: -120,
    redOffset: 0,
    greenOffset: 6,
    blueOffset: 12
  });
  document.querySelectorAll('.card-nav-card').forEach(card => {
    enhanceWithGlassSurface(card, {
      borderRadius: 20,
      distortionScale: -140,
      redOffset: 0,
      greenOffset: 8,
      blueOffset: 16
    });
  });

  // 2. Profile Bar & Overview Status
  enhanceWithGlassSurface('.portal-profile-bar', {
    borderRadius: 24,
    distortionScale: -160,
    redOffset: 0,
    greenOffset: 8,
    blueOffset: 16
  });

  const statusBar = document.querySelector('#tab-overview > div:first-child');
  if (statusBar) {
    enhanceWithGlassSurface(statusBar, {
      borderRadius: 16,
      distortionScale: -120,
      redOffset: 0,
      greenOffset: 6,
      blueOffset: 12
    });
  }

  // 3. Stats & Metric Cards
  document.querySelectorAll('.portal-card-metric, .portal-stat-card, .metric-card, .dashboard-card, .service-card, .portal-grid-stats > div').forEach(card => {
    enhanceWithGlassSurface(card, {
      borderRadius: 20,
      distortionScale: -150,
      redOffset: 0,
      greenOffset: 8,
      blueOffset: 16
    });
  });

  // 4. Executive Profile & Settings Dialog
  const profileDlg = document.querySelector('#profile-settings-dialog');
  if (profileDlg) {
    enhanceWithGlassSurface(profileDlg, {
      borderRadius: 26,
      distortionScale: -180,
      redOffset: 0,
      greenOffset: 10,
      blueOffset: 20
    });
  }

  // 5. Release Studio Builder Modal
  document.querySelectorAll('dialog.release-dialog-shell, dialog[open].release-dialog-shell').forEach(dlg => {
    enhanceWithGlassSurface(dlg, {
      borderRadius: 24,
      distortionScale: -180,
      redOffset: 0,
      greenOffset: 10,
      blueOffset: 20
    });
  });

  // 6. Payout Dialogs & Banking Options
  document.querySelectorAll('#payout-dialog, #payout-method-dialog, .payout-modal-box').forEach(dlg => {
    enhanceWithGlassSurface(dlg, {
      borderRadius: 26,
      distortionScale: -170,
      redOffset: 0,
      greenOffset: 8,
      blueOffset: 18
    });
  });
  document.querySelectorAll('.bank-option-item').forEach(item => {
    enhanceWithGlassSurface(item, {
      borderRadius: 16,
      distortionScale: -110,
      redOffset: 0,
      greenOffset: 6,
      blueOffset: 12
    });
  });

  // 7. Notification Hub & Cards
  const notifBox = document.querySelector('.notif-drawer-glass-box');
  if (notifBox) {
    enhanceWithGlassSurface(notifBox, {
      borderRadius: 0,
      distortionScale: -160,
      redOffset: 0,
      greenOffset: 8,
      blueOffset: 16
    });
  }
  document.querySelectorAll('.notif-card-item').forEach(item => {
    enhanceWithGlassSurface(item, {
      borderRadius: 16,
      distortionScale: -110,
      redOffset: 0,
      greenOffset: 6,
      blueOffset: 12
    });
  });

  // 8. General Modal dialogs
  document.querySelectorAll('dialog, .portal-dialog').forEach(dlg => {
    enhanceWithGlassSurface(dlg, {
      borderRadius: 26,
      distortionScale: -180,
      redOffset: 0,
      greenOffset: 10,
      blueOffset: 20
    });
  });

  // 9. Data tables & release items
  document.querySelectorAll('.data-table, .release-row, .track-row, .catalog-item, .payout-history-table').forEach(item => {
    if (!item.classList.contains('glass-surface')) {
      item.classList.add('glass-surface');
    }
  });
}

export function refreshGlassSurfaces() {
  initPortalGlassSurfaces();
}

// Auto-enhance on hash/route or tab changes
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    setTimeout(initPortalGlassSurfaces, 60);
  });
  document.addEventListener('DOMContentLoaded', () => {
    initPortalGlassSurfaces();
  });
}

// Global browser exports
if (typeof window !== 'undefined') {
  window.createGlassSurface = createGlassSurface;
  window.enhanceWithGlassSurface = enhanceWithGlassSurface;
  window.initPortalGlassSurfaces = initPortalGlassSurfaces;
  window.refreshGlassSurfaces = refreshGlassSurfaces;
  window.supportsSVGFilters = supportsSVGFilters;
  window.generateDisplacementMapDataUri = generateDisplacementMapDataUri;
  window.createGlassSvgFilter = createGlassSvgFilter;
}
