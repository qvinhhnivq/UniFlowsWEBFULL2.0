/**
 * Monopo Saigon — Molten Iridescent Fluid Canvas Engine
 * Renders an organic, silky liquid light simulation behind editorial silence.
 * Palette: Soft sage green (160, 224, 171) -> Molten amber (255, 172, 46) -> Deep oxblood (165, 45, 37)
 */
export function initFluidCanvas(canvasElement) {
  if (!canvasElement) return;
  const canvas = canvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let animationFrameId = null;

  // Fluid orbs configuration
  const orbs = [
    { x: 0.25, y: 0.35, vx: 0.0003, vy: 0.0004, r: 0.55, color: [160, 224, 171], alpha: 0.72, phase: 0 },
    { x: 0.75, y: 0.45, vx: -0.00025, vy: 0.00035, r: 0.60, color: [255, 172, 46], alpha: 0.68, phase: 2.1 },
    { x: 0.50, y: 0.80, vx: 0.0004, vy: -0.0003, r: 0.65, color: [165, 45, 37], alpha: 0.85, phase: 4.2 },
    { x: 0.80, y: 0.20, vx: -0.00035, vy: 0.00025, r: 0.45, color: [195, 80, 42], alpha: 0.60, phase: 1.2 },
    { x: 0.15, y: 0.75, vx: 0.0002, vy: -0.00045, r: 0.50, color: [135, 215, 165], alpha: 0.62, phase: 3.5 }
  ];

  let mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  let isMouseActive = false;

  function resize() {
    const parent = canvas.parentElement;
    width = parent ? parent.clientWidth : window.innerWidth;
    height = parent ? parent.clientHeight : window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  window.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (e.clientY <= rect.bottom && e.clientY >= rect.top) {
      mouse.targetX = (e.clientX - rect.left) / width;
      mouse.targetY = (e.clientY - rect.top) / height;
      isMouseActive = true;
    }
  }, { passive: true });

  let time = 0;

  function render() {
    time += 0.006;

    // Smooth mouse interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.04;
    mouse.y += (mouse.targetY - mouse.y) * 0.04;

    // Base background — obsidian deep ink
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw fluid chromatic orbs
    orbs.forEach((orb, i) => {
      // Oscillate coordinates
      const wobbleX = Math.sin(time + orb.phase) * 0.08;
      const wobbleY = Math.cos(time * 0.8 + orb.phase) * 0.08;

      // Mouse subtle pull
      let currentX = (orb.x + wobbleX + (mouse.x - 0.5) * 0.12) * width;
      let currentY = (orb.y + wobbleY + (mouse.y - 0.5) * 0.12) * height;
      let currentR = orb.r * Math.max(width, height) * (1 + Math.sin(time * 0.6 + i) * 0.08);

      const grad = ctx.createRadialGradient(
        currentX, currentY, 0,
        currentX, currentY, Math.max(currentR, 10)
      );

      const [r, g, b] = orb.color;
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${orb.alpha})`);
      grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${orb.alpha * 0.5})`);
      grad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${orb.alpha * 0.15})`);
      grad.addColorStop(1, 'rgba(10, 8, 8, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(currentX, currentY, currentR, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    // Subtle dark vignette to focus the center typography
    const vignette = ctx.createRadialGradient(
      width * 0.5, height * 0.5, Math.min(width, height) * 0.25,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.85
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
    vignette.addColorStop(0.65, 'rgba(0, 0, 0, 0.45)');
    vignette.addColorStop(1, 'rgba(5, 4, 4, 0.82)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    animationFrameId = requestAnimationFrame(render);
  }

  render();

  return () => {
    window.removeEventListener('resize', resize);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  };
}
