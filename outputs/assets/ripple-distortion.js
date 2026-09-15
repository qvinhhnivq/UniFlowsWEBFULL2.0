/**
 * RippleDistortion — Vanilla JS + Canvas 2D / WebGL fluid wave displacement
 * Port of React Bits RippleDistortion component for UniPORTAL
 * Creates interactive water ripples, caustics, and mouse wake distortion under glass
 */

export class RippleDistortion {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = {
      brushSize: 150,
      strength: 0.2,
      swirl: 1,
      rings: 4,
      grayscale: false,
      spread: 5,
      fade: 3,
      spacing: 15,
      dispersion: 0,
      glint: 0,
      tint: '#a855f7',
      tintAmount: 0.15,
      highlightColor: '#ffffff',
      trigger: 'hover',
      clickStrength: 2,
      quality: 'low',
      enabled: true,
      ...options
    };

    this.ripples = [];
    this.lastPointer = { x: 0, y: 0, time: 0 };
    this.isPointerInside = false;
    this.animId = null;

    this.initCanvas();
    this.bindEvents();
    this.animate();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ripple-distortion-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.canvas.style.opacity = '0.9';
    this.canvas.style.mixBlendMode = 'screen';

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    this.container.prepend(this.canvas);
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.quality === 'low' ? 1.5 : 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  addRipple(x, y, strength = 1) {
    if (!this.options.enabled) return;
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: this.options.brushSize * strength,
      strength: this.options.strength * strength,
      opacity: 1,
      rings: this.options.rings || 4,
      swirl: this.options.swirl || 1,
      spread: this.options.spread || 5,
      tint: this.options.tint || '#a855f7',
      age: 0
    });

    if (this.ripples.length > 50) {
      this.ripples.shift();
    }
  }

  bindEvents() {
    const target = window;

    target.addEventListener('mousemove', (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const now = performance.now();

      const dx = x - this.lastPointer.x;
      const dy = y - this.lastPointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > (this.options.spacing || 15) || (now - this.lastPointer.time > 120)) {
        const speedMultiplier = Math.min(Math.max(dist / 25, 0.6), 2.2);
        this.addRipple(x, y, speedMultiplier);
        this.lastPointer = { x, y, time: now };
      }
    });

    target.addEventListener('click', (e) => {
      const clickMultiplier = this.options.clickStrength || 2;
      this.addRipple(e.clientX, e.clientY, clickMultiplier * 1.5);
      
      // Secondary shockwave
      setTimeout(() => {
        this.addRipple(e.clientX, e.clientY, clickMultiplier);
      }, 70);
    });

    // Touch support for mobile devices
    target.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.addRipple(touch.clientX, touch.clientY, 1.2);
      }
    }, { passive: true });
  }

  hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const tintRgb = this.hexToRgb(this.options.tint || '#a855f7');
    const tintAmount = this.options.tintAmount || 0.15;
    const fadeRate = 0.016 * (this.options.fade || 3);
    const spreadSpeed = (this.options.spread || 5) * 0.8;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += 1;
      r.radius += spreadSpeed;
      r.opacity -= fadeRate;

      if (r.opacity <= 0 || r.radius >= r.maxRadius * 2.2) {
        this.ripples.splice(i, 1);
        continue;
      }

      // Draw Multi-ring water displacement caustics
      const ringCount = r.rings;
      for (let j = 0; j < ringCount; j++) {
        const ringRadius = Math.max(1, r.radius - j * (r.spread * 4));
        if (ringRadius <= 0) continue;

        const ringProgress = ringRadius / (r.maxRadius * 1.8);
        const ringAlpha = r.opacity * Math.sin(Math.PI * Math.min(ringProgress, 1)) * 0.7;

        if (ringAlpha <= 0.005) continue;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

        // Water Caustic Gradient with Liquid Tint & Highlight
        const grad = this.ctx.createRadialGradient(
          r.x, r.y, Math.max(0, ringRadius - 8),
          r.x, r.y, ringRadius + 8
        );

        const rVal = tintRgb.r;
        const gVal = tintRgb.g;
        const bVal = tintRgb.b;

        grad.addColorStop(0, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`);
        grad.addColorStop(0.4, `rgba(255, 255, 255, ${ringAlpha * 0.85})`);
        grad.addColorStop(0.7, `rgba(${rVal}, ${gVal}, ${bVal}, ${ringAlpha * tintAmount * 2.2})`);
        grad.addColorStop(1, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`);

        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = Math.max(2, 6 * (1 - ringProgress));
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    this.animId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * Initializes RippleDistortion on the current page
 */
export function initRippleDistortion(container = document.body, customOptions = {}) {
  const defaults = {
    brushSize: 160,
    strength: 0.25,
    swirl: 1,
    rings: 4,
    grayscale: false,
    spread: 5.5,
    fade: 2.8,
    spacing: 14,
    dispersion: 0,
    glint: 0,
    tint: '#a855f7',
    tintAmount: 0.15,
    highlightColor: '#ffffff',
    trigger: 'hover',
    clickStrength: 2.2,
    quality: 'low',
    enabled: true
  };

  return new RippleDistortion(container, { ...defaults, ...customOptions });
}

if (typeof window !== 'undefined') {
  window.RippleDistortion = RippleDistortion;
  window.initRippleDistortion = initRippleDistortion;
}
