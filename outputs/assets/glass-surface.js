/**
 * GlassSurface — Vanilla JS + CSS + SVG Filters port of React Bits GlassSurface
 * Creates realistic liquid glass & chromatic aberration refractive surfaces
 * Designed for UniPORTAL & UniFLOWs
 */

let filterCount = 0;

/**
 * Creates and injects an SVG displacement and chromatic aberration filter
 */
function createGlassSvgFilter({
  id,
  displace = 0.5,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  brightness = 50,
  opacity = 0.93
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

  // Base frequency derived from displace
  const baseFreq = Math.max(0.005, Math.min(0.08, 0.02 * displace));
  const scale = Math.abs(distortionScale) * (displace || 1) * 0.15;
  const brightnessMultiplier = (brightness || 50) / 50;

  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.id = id;
  filter.setAttribute('x', '-20%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '140%');
  filter.setAttribute('height', '140%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  filter.innerHTML = `
    <feTurbulence type="fractalNoise" baseFrequency="${baseFreq}" numOctaves="3" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="displaced" />
    
    <!-- Chromatic Aberration: Red, Green, Blue Channels Offset -->
    <feOffset in="displaced" dx="${redOffset * 0.1}" dy="${redOffset * 0.1}" result="redLayer" />
    <feColorMatrix in="redLayer" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0" result="redOnly" />

    <feOffset in="displaced" dx="${greenOffset * 0.1}" dy="${greenOffset * 0.1}" result="greenLayer" />
    <feColorMatrix in="greenLayer" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0" result="greenOnly" />

    <feOffset in="displaced" dx="${blueOffset * 0.1}" dy="${blueOffset * 0.1}" result="blueLayer" />
    <feColorMatrix in="blueLayer" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 ${opacity} 0" result="blueOnly" />

    <!-- Combine Channels with Screen Mode -->
    <feBlend mode="screen" in="redOnly" in2="greenOnly" result="redGreen" />
    <feBlend mode="screen" in="redGreen" in2="blueOnly" result="chromatic" />

    <!-- Adjust Brightness -->
    <feComponentTransfer in="chromatic" result="finalGlass">
      <feFuncR type="linear" slope="${brightnessMultiplier}" />
      <feFuncG type="linear" slope="${brightnessMultiplier}" />
      <feFuncB type="linear" slope="${brightnessMultiplier}" />
    </feComponentTransfer>
  `;

  svgDefs.appendChild(filter);
  return id;
}

/**
 * Creates or wraps an element with GlassSurface properties
 */
export function createGlassSurface(options = {}) {
  const {
    width,
    height,
    borderRadius = 18,
    className = '',
    displace = 0.5,
    distortionScale = -180,
    redOffset = 0,
    greenOffset = 10,
    blueOffset = 20,
    brightness = 50,
    opacity = 0.93,
    mixBlendMode = 'normal',
    children = null,
    interactive = true
  } = options;

  filterCount++;
  const filterId = `glass-filter-${filterCount}`;
  createGlassSvgFilter({
    id: filterId,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    brightness,
    opacity
  });

  const surface = document.createElement('div');
  surface.className = `glass-surface ${className}`.trim();

  if (width) surface.style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) surface.style.height = typeof height === 'number' ? `${height}px` : height;
  if (borderRadius !== undefined) surface.style.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  // Filter effect layer
  const filterLayer = document.createElement('div');
  filterLayer.className = 'glass-surface-filter-layer';
  filterLayer.style.mixBlendMode = mixBlendMode;
  surface.appendChild(filterLayer);

  // Interactive glare layer
  if (interactive) {
    const glare = document.createElement('div');
    glare.className = 'glass-surface-glare';
    surface.appendChild(glare);

    surface.addEventListener('mousemove', (e) => {
      const rect = surface.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      surface.style.setProperty('--mouse-x', `${x}px`);
      surface.style.setProperty('--mouse-y', `${y}px`);
    });
  }

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'glass-surface-content';
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

  return surface;
}

/**
 * Enhances an existing DOM element into a GlassSurface
 */
export function enhanceWithGlassSurface(element, options = {}) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return null;

  const {
    borderRadius,
    displace = 0.4,
    distortionScale = -120,
    redOffset = 0,
    greenOffset = 6,
    blueOffset = 12,
    brightness = 52,
    opacity = 0.95,
    mixBlendMode = 'normal',
    interactive = true
  } = options;

  filterCount++;
  const filterId = `glass-filter-${filterCount}`;
  createGlassSvgFilter({
    id: filterId,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    brightness,
    opacity
  });

  el.classList.add('glass-surface');
  if (borderRadius !== undefined) {
    el.style.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
  }

  // Add glare if not present
  if (interactive && !el.querySelector('.glass-surface-glare')) {
    const glare = document.createElement('div');
    glare.className = 'glass-surface-glare';
    el.appendChild(glare);

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
    });
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

  // Enhance Profile Bar
  enhanceWithGlassSurface('.portal-profile-bar', {
    borderRadius: 20,
    displace: 0.35,
    distortionScale: -100,
    redOffset: 0,
    greenOffset: 8,
    blueOffset: 16
  });

  // Enhance Status Bar
  const statusBar = document.querySelector('#tab-overview > div:first-child');
  if (statusBar) {
    enhanceWithGlassSurface(statusBar, {
      borderRadius: 14,
      displace: 0.25,
      distortionScale: -80,
      redOffset: 0,
      greenOffset: 5,
      blueOffset: 10
    });
  }

  // Enhance Role Banner if present
  enhanceWithGlassSurface('#portal-role-banner', {
    borderRadius: 12,
    displace: 0.3
  });

  // Enhance notification dropdown
  enhanceWithGlassSurface('#notif-dropdown', {
    borderRadius: 14,
    displace: 0.35
  });

  // Enhance stats cards
  document.querySelectorAll('.portal-stat-card, .metric-card, .dashboard-card').forEach(card => {
    enhanceWithGlassSurface(card, {
      borderRadius: 16,
      displace: 0.3,
      distortionScale: -90
    });
  });
}

// Auto init if in browser
if (typeof window !== 'undefined') {
  window.createGlassSurface = createGlassSurface;
  window.enhanceWithGlassSurface = enhanceWithGlassSurface;
  window.initPortalGlassSurfaces = initPortalGlassSurfaces;
}
