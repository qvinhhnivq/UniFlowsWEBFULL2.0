/**
 * GradientWaves — Vanilla JS + WebGL2 port of React Bits @react-bits/GradientWaves-JS-CSS
 * Raymarched sine waves rolling toward a soft, hazy horizon
 */

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const detailToSteps = detail => {
  if (detail === 'low') return 40.0;
  if (detail === 'high') return 110.0;
  return 70.0;
};

const vertexShaderSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uParallax;
uniform bool uEnableMouse;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.1) break;
    dist += 0.9 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }
  return dist;
}

void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
  float c, s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, 30.0);
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot); s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x; s = nuv.y;
  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

  if (uEnableMouse) {
    float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
    float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
    c = cos(yaw); s = sin(yaw);
    dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
    c = cos(pitch); s = sin(pitch);
    dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  }

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
  vec3 col = mix(uHorizonColor, body, t);
  col *= uBrightness;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(t, 0.0, 1.0) * uOpacity;
  if (uGrain > 0.5) {
    float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
    alpha += (g - 0.5) * uGrainIntensity;
  }
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`;

export class GradientWaves {
  constructor(mountTarget, options = {}) {
    this.container = typeof mountTarget === 'string' ? document.querySelector(mountTarget) : mountTarget;
    if (!this.container) {
      console.warn('GradientWaves: Target container not found');
      return;
    }

    this.options = {
      horizonColor: '#5227FF',
      waveColor: '#FF9FFC',
      crestColor: '#FFFFFF',
      speed: 0.4,
      amplitude: 2.5,
      waveScale: 0.6,
      waveRatio: 0.9,
      swell: 35,
      turbulence: 20,
      tilt: 1.11,
      zoom: 1.0,
      height: 5.5,
      fogDepth: 15,
      detail: 'medium',
      brightness: 1.0,
      opacity: 1.0,
      mouseInteraction: true,
      parallaxStrength: 0.5,
      grain: true,
      grainIntensity: 0.05,
      ...options
    };

    this.raf = 0;
    this.isVisible = true;
    this.isPageVisible = !document.hidden;
    this.t0 = performance.now();
    this.currentMouse = [0.5, 0.5];
    this.targetMouse = [0.5, 0.5];

    this.init();
  }

  init() {
    this.container.classList.add('gradient-waves-container');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gradient-waves-canvas';
    this.container.appendChild(this.canvas);

    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false
    });

    if (!this.gl) {
      console.error('GradientWaves: WebGL2 not supported on this browser/device');
      return;
    }

    this.setupShaders();
    this.setupGeometry();
    this.setupListeners();
    this.setSize();
    this.start();
  }

  setupShaders() {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShaderSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShaderSource);
    gl.compileShader(fs);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('GradientWaves shader link error:', gl.getProgramInfoLog(this.program));
    }

    this.uniforms = {
      iTime: gl.getUniformLocation(this.program, 'iTime'),
      iResolution: gl.getUniformLocation(this.program, 'iResolution'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
      uAmplitude: gl.getUniformLocation(this.program, 'uAmplitude'),
      uWaveScale: gl.getUniformLocation(this.program, 'uWaveScale'),
      uWaveRatio: gl.getUniformLocation(this.program, 'uWaveRatio'),
      uSwell: gl.getUniformLocation(this.program, 'uSwell'),
      uTurbulence: gl.getUniformLocation(this.program, 'uTurbulence'),
      uTilt: gl.getUniformLocation(this.program, 'uTilt'),
      uZoom: gl.getUniformLocation(this.program, 'uZoom'),
      uHeight: gl.getUniformLocation(this.program, 'uHeight'),
      uFogDepth: gl.getUniformLocation(this.program, 'uFogDepth'),
      uSteps: gl.getUniformLocation(this.program, 'uSteps'),
      uBrightness: gl.getUniformLocation(this.program, 'uBrightness'),
      uOpacity: gl.getUniformLocation(this.program, 'uOpacity'),
      uGrain: gl.getUniformLocation(this.program, 'uGrain'),
      uGrainIntensity: gl.getUniformLocation(this.program, 'uGrainIntensity'),
      uMouse: gl.getUniformLocation(this.program, 'uMouse'),
      uParallax: gl.getUniformLocation(this.program, 'uParallax'),
      uEnableMouse: gl.getUniformLocation(this.program, 'uEnableMouse'),
      uHorizonColor: gl.getUniformLocation(this.program, 'uHorizonColor'),
      uWaveColor: gl.getUniformLocation(this.program, 'uWaveColor'),
      uCrestColor: gl.getUniformLocation(this.program, 'uCrestColor')
    };
  }

  setupGeometry() {
    const gl = this.gl;
    // Fullscreen big triangle
    const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
  }

  setSize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  setupListeners() {
    this.ro = new ResizeObserver(() => this.setSize());
    this.ro.observe(this.container);

    this.onPointerMove = e => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetMouse[0] = (e.clientX - rect.left) / rect.width;
      this.targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    this.onPointerLeave = () => {
      this.targetMouse[0] = 0.5;
      this.targetMouse[1] = 0.5;
    };

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerleave', this.onPointerLeave);

    this.onVisibility = () => {
      this.isPageVisible = !document.hidden;
      this.isPageVisible && this.isVisible ? this.start() : this.stop();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.io = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
      this.isVisible && this.isPageVisible ? this.start() : this.stop();
    });
    this.io.observe(this.container);
  }

  updateUniforms(t) {
    const gl = this.gl;
    const u = this.uniforms;
    const opt = this.options;

    gl.useProgram(this.program);

    gl.uniform1f(u.iTime, (t - this.t0) * 0.001);
    gl.uniform2f(u.iResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uSpeed, opt.speed);
    gl.uniform1f(u.uAmplitude, opt.amplitude);
    gl.uniform1f(u.uWaveScale, opt.waveScale);
    gl.uniform1f(u.uWaveRatio, opt.waveRatio);
    gl.uniform1f(u.uSwell, opt.swell);
    gl.uniform1f(u.uTurbulence, opt.turbulence);
    gl.uniform1f(u.uTilt, opt.tilt);
    gl.uniform1f(u.uZoom, opt.zoom);
    gl.uniform1f(u.uHeight, opt.height);
    gl.uniform1f(u.uFogDepth, opt.fogDepth);
    gl.uniform1f(u.uSteps, detailToSteps(opt.detail));
    gl.uniform1f(u.uBrightness, opt.brightness);
    gl.uniform1f(u.uOpacity, opt.opacity);
    gl.uniform1f(u.uGrain, opt.grain ? 1.0 : 0.0);
    gl.uniform1f(u.uGrainIntensity, opt.grainIntensity);
    gl.uniform1f(u.uParallax, opt.parallaxStrength);
    gl.uniform1i(u.uEnableMouse, opt.mouseInteraction ? 1 : 0);

    const tx = opt.mouseInteraction ? this.targetMouse[0] : 0.5;
    const ty = opt.mouseInteraction ? this.targetMouse[1] : 0.5;
    this.currentMouse[0] += 0.05 * (tx - this.currentMouse[0]);
    this.currentMouse[1] += 0.05 * (ty - this.currentMouse[1]);
    gl.uniform2f(u.uMouse, this.currentMouse[0], this.currentMouse[1]);

    const hc = hexToRgb(opt.horizonColor);
    const wc = hexToRgb(opt.waveColor);
    const cc = hexToRgb(opt.crestColor);
    gl.uniform3f(u.uHorizonColor, hc[0], hc[1], hc[2]);
    gl.uniform3f(u.uWaveColor, wc[0], wc[1], wc[2]);
    gl.uniform3f(u.uCrestColor, cc[0], cc[1], cc[2]);
  }

  render(t) {
    const gl = this.gl;
    this.updateUniforms(t);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.raf = requestAnimationFrame(time => this.render(time));
  }

  start() {
    if (this.raf === 0) {
      this.raf = requestAnimationFrame(time => this.render(time));
    }
  }

  stop() {
    if (this.raf !== 0) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  destroy() {
    this.stop();
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    const loseContext = this.gl.getExtension('WEBGL_lose_context');
    if (loseContext) loseContext.loseContext();
  }
}

export function initGradientWaves(mountTarget, options = {}) {
  return new GradientWaves(mountTarget, options);
}

if (typeof window !== 'undefined') {
  window.GradientWaves = GradientWaves;
  window.initGradientWaves = initGradientWaves;
}
