/**
 * RippleDistortion — Ultra-Smooth Fluid Liquid & Caustics Pointer Engine
 * Port of React Bits RippleDistortion for UniPORTAL Glassmorphism
 * Creates continuous, buttery-smooth water ripples, luminous wakes, and organic liquid refraction
 */

export class RippleDistortion {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = {
      brushSize: 160,
      strength: 0.28,
      swirl: 1.2,
      rings: 4,
      grayscale: false,
      spread: 5.5,
      fade: 2.5,
      spacing: 8,
      dispersion: 0.2,
      glint: 0.3,
      tint: '#a855f7',
      tintAmount: 0.22,
      highlightColor: '#ffffff',
      trigger: 'hover',
      clickStrength: 2.5,
      quality: 'low',
      enabled: true,
      ...options
    };

    this.ripples = [];
    this.trailPoints = [];
    this.pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.smoothPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.velocity = { x: 0, y: 0, speed: 0 };
    this.lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, time: performance.now() };
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
    this.canvas.style.opacity = '0.95';
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  addRipple(x, y, strength = 1, isClick = false) {
    if (!this.options.enabled) return;
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: (this.options.brushSize || 160) * strength * (isClick ? 1.5 : 1),
      strength: (this.options.strength || 0.25) * strength,
      opacity: 1,
      rings: isClick ? 6 : (this.options.rings || 4),
      spread: (this.options.spread || 5.5) * (isClick ? 1.3 : 1),
      tint: this.options.tint || '#a855f7',
      isClick
    });

    if (this.ripples.length > 40) {
      this.ripples.shift();
    }
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.isPointerInside = true;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;

      const now = performance.now();
      const dt = Math.max(now - this.lastPointer.time, 1);
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.velocity.speed = dist / dt;
      this.velocity.x = dx / dt;
      this.velocity.y = dy / dt;

      // Continuous wake trail points
      this.trailPoints.push({
        x: e.clientX,
        y: e.clientY,
        radius: Math.min(Math.max(dist * 0.8, 18), 65),
        alpha: 0.55,
        time: now
      });

      if (this.trailPoints.length > 25) {
        this.trailPoints.shift();
      }

      if (dist > (this.options.spacing || 10)) {
        const speedMultiplier = Math.min(Math.max(this.velocity.speed * 1.8, 0.7), 2.4);
        this.addRipple(e.clientX, e.clientY, speedMultiplier, false);
        this.lastPointer = { x: e.clientX, y: e.clientY, time: now };
      }
    });

    window.addEventListener('click', (e) => {
      const clickMult = this.options.clickStrength || 2.5;
      this.addRipple(e.clientX, e.clientY, clickMult, true);

      // Multi-phase pulse
      setTimeout(() => {
        this.addRipple(e.clientX, e.clientY, clickMult * 0.7, false);
      }, 60);
    });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.pointer.x = t.clientX;
        this.pointer.y = t.clientY;
        this.addRipple(t.clientX, t.clientY, 1.8, true);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.pointer.x = t.clientX;
        this.pointer.y = t.clientY;
        this.addRipple(t.clientX, t.clientY, 1.2, false);
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

    // Smooth Spring/Lerp Cursor Position for buttery 60fps tracking
    this.smoothPointer.x += (this.pointer.x - this.smoothPointer.x) * 0.18;
    this.smoothPointer.y += (this.pointer.y - this.smoothPointer.y) * 0.18;

    const tintRgb = this.hexToRgb(this.options.tint || '#a855f7');
    const tintAmount = this.options.tintAmount || 0.2;

    // 1. Render Smooth Luminous Cursor Aura (Silky Ambient Liquid Glow)
    if (this.isPointerInside) {
      this.ctx.save();
      const auraRadius = 180;
      const auraGrad = this.ctx.createRadialGradient(
        this.smoothPointer.x, this.smoothPointer.y, 0,
        this.smoothPointer.x, this.smoothPointer.y, auraRadius
      );
      auraGrad.addColorStop(0, `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.22)`);
      auraGrad.addColorStop(0.35, `rgba(56, 189, 248, 0.12)`);
      auraGrad.addColorStop(0.7, `rgba(216, 255, 72, 0.05)`);
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = auraGrad;
      this.ctx.beginPath();
      this.ctx.arc(this.smoothPointer.x, this.smoothPointer.y, auraRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 2. Render Continuous Fluid Wake Trail (No fragmented dots)
    if (this.trailPoints.length > 1) {
      this.ctx.save();
      for (let i = 0; i < this.trailPoints.length - 1; i++) {
        const p1 = this.trailPoints[i];
        const p2 = this.trailPoints[i + 1];
        p1.alpha *= 0.92;

        if (p1.alpha <= 0.01) continue;

        const xc = (p1.x + p2.x) / 2;
        const yc = (p1.y + p2.y) / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);

        const trailGrad = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        trailGrad.addColorStop(0, `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, ${p1.alpha * 0.4})`);
        trailGrad.addColorStop(1, `rgba(216, 255, 72, ${p1.alpha * 0.2})`);

        this.ctx.strokeStyle = trailGrad;
        this.ctx.lineWidth = p1.radius;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // 3. Render Expanding Refractive Waves & Water Caustic Rings
    const fadeRate = 0.016 * (this.options.fade || 2.5);
    const spreadSpeed = (this.options.spread || 5.5) * 0.9;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += spreadSpeed;
      r.opacity -= fadeRate;

      if (r.opacity <= 0 || r.radius >= r.maxRadius * 2.2) {
        this.ripples.splice(i, 1);
        continue;
      }

      const ringCount = r.rings;
      for (let j = 0; j < ringCount; j++) {
        const ringRadius = Math.max(1, r.radius - j * (r.spread * 4.5));
        if (ringRadius <= 0) continue;

        const ringProgress = ringRadius / (r.maxRadius * 2);
        const ringAlpha = r.opacity * Math.sin(Math.PI * Math.min(ringProgress, 1)) * 0.75;

        if (ringAlpha <= 0.004) continue;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

        // Smooth Organic Caustic Refraction with Chromatic Splitting
        const grad = this.ctx.createRadialGradient(
          r.x, r.y, Math.max(0, ringRadius - 10),
          r.x, r.y, ringRadius + 10
        );

        const rVal = tintRgb.r;
        const gVal = tintRgb.g;
        const bVal = tintRgb.b;

        grad.addColorStop(0, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`);
        grad.addColorStop(0.3, `rgba(255, 255, 255, ${ringAlpha * 0.9})`);
        grad.addColorStop(0.6, `rgba(${rVal}, ${gVal}, ${bVal}, ${ringAlpha * tintAmount * 2.4})`);
        grad.addColorStop(0.85, `rgba(56, 189, 248, ${ringAlpha * 0.35})`);
        grad.addColorStop(1, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`);

        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = Math.max(1.8, 5 * (1 - ringProgress));
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

export function initRippleDistortion(container = document.body, customOptions = {}) {
  const defaults = {
    brushSize: 160,
    strength: 0.28,
    swirl: 1.2,
    rings: 4,
    grayscale: false,
    spread: 5.5,
    fade: 2.5,
    spacing: 8,
    dispersion: 0.2,
    glint: 0.3,
    tint: '#a855f7',
    tintAmount: 0.2,
    highlightColor: '#ffffff',
    trigger: 'hover',
    clickStrength: 2.5,
    quality: 'low',
    enabled: true
  };

  return new RippleDistortion(container, { ...defaults, ...customOptions });
}

if (typeof window !== 'undefined') {
  window.RippleDistortion = RippleDistortion;
  window.initRippleDistortion = initRippleDistortion;
}
