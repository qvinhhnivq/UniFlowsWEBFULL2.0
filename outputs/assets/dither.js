/**
 * Dither — Retro dithered noise shader background
 * Vanilla JS & WebGL port of React Bits @react-bits/Dither-JS-CSS
 * Pure WebGL shader implementation with 8x8 Bayer dithering matrix
 */

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec3 backgroundColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float colorNum;
uniform float pixelSize;

varying vec2 vUv;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p + fbm(p2)); 
}

float getBayerValue(int x, int y) {
  int idx = y * 8 + x;
  if (idx == 0) return 0.0/64.0;
  if (idx == 1) return 48.0/64.0;
  if (idx == 2) return 12.0/64.0;
  if (idx == 3) return 60.0/64.0;
  if (idx == 4) return 3.0/64.0;
  if (idx == 5) return 51.0/64.0;
  if (idx == 6) return 15.0/64.0;
  if (idx == 7) return 63.0/64.0;
  if (idx == 8) return 32.0/64.0;
  if (idx == 9) return 16.0/64.0;
  if (idx == 10) return 44.0/64.0;
  if (idx == 11) return 28.0/64.0;
  if (idx == 12) return 35.0/64.0;
  if (idx == 13) return 19.0/64.0;
  if (idx == 14) return 47.0/64.0;
  if (idx == 15) return 31.0/64.0;
  if (idx == 16) return 8.0/64.0;
  if (idx == 17) return 56.0/64.0;
  if (idx == 18) return 4.0/64.0;
  if (idx == 19) return 52.0/64.0;
  if (idx == 20) return 11.0/64.0;
  if (idx == 21) return 59.0/64.0;
  if (idx == 22) return 7.0/64.0;
  if (idx == 23) return 55.0/64.0;
  if (idx == 24) return 40.0/64.0;
  if (idx == 25) return 24.0/64.0;
  if (idx == 26) return 36.0/64.0;
  if (idx == 27) return 20.0/64.0;
  if (idx == 28) return 43.0/64.0;
  if (idx == 29) return 27.0/64.0;
  if (idx == 30) return 39.0/64.0;
  if (idx == 31) return 23.0/64.0;
  if (idx == 32) return 2.0/64.0;
  if (idx == 33) return 50.0/64.0;
  if (idx == 34) return 14.0/64.0;
  if (idx == 35) return 62.0/64.0;
  if (idx == 36) return 1.0/64.0;
  if (idx == 37) return 49.0/64.0;
  if (idx == 38) return 13.0/64.0;
  if (idx == 39) return 61.0/64.0;
  if (idx == 40) return 34.0/64.0;
  if (idx == 41) return 18.0/64.0;
  if (idx == 42) return 46.0/64.0;
  if (idx == 43) return 30.0/64.0;
  if (idx == 44) return 33.0/64.0;
  if (idx == 45) return 17.0/64.0;
  if (idx == 46) return 45.0/64.0;
  if (idx == 47) return 29.0/64.0;
  if (idx == 48) return 10.0/64.0;
  if (idx == 49) return 58.0/64.0;
  if (idx == 50) return 6.0/64.0;
  if (idx == 51) return 54.0/64.0;
  if (idx == 52) return 9.0/64.0;
  if (idx == 53) return 57.0/64.0;
  if (idx == 54) return 5.0/64.0;
  if (idx == 55) return 53.0/64.0;
  if (idx == 56) return 42.0/64.0;
  if (idx == 57) return 26.0/64.0;
  if (idx == 58) return 38.0/64.0;
  if (idx == 59) return 22.0/64.0;
  if (idx == 60) return 41.0/64.0;
  if (idx == 61) return 25.0/64.0;
  if (idx == 62) return 37.0/64.0;
  return 21.0/64.0;
}

vec3 dither(vec2 coord, vec3 color) {
  vec2 scaledCoord = floor(coord / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = getBayerValue(x, y) - 0.25;
  float stepVal = 1.0 / (colorNum - 1.0);
  color += threshold * stepVal;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float bias = mix(0.2, 0.0, smoothstep(0.45, 0.8, luminance));
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  vec3 col = mix(backgroundColor, waveColor, clamp(f, 0.0, 1.0));
  col = dither(gl_FragCoord.xy, col);
  gl_FragColor = vec4(col, 1.0);
}
`;

function parseRGB(color) {
  if (Array.isArray(color)) {
    return color.length >= 3 ? [color[0], color[1], color[2]] : [0.5, 0.5, 0.5];
  }
  if (typeof color === 'string' && color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16) / 255,
        parseInt(hex[1] + hex[1], 16) / 255,
        parseInt(hex[2] + hex[2], 16) / 255
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      ];
    }
  }
  return [0.5, 0.5, 0.5];
}

export class Dither {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      console.warn('Dither: target container not found');
      return;
    }

    this.options = {
      waveSpeed: 0.05,
      waveFrequency: 3.0,
      waveAmplitude: 0.3,
      waveColor: [0.5, 0.5, 0.5],
      backgroundColor: [0, 0, 0],
      colorNum: 4.0,
      pixelSize: 2.0,
      disableAnimation: false,
      enableMouseInteraction: true,
      mouseRadius: 1.0,
      pixelRatio: 1,
      ...options
    };

    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.animId = null;
    this.startTime = performance.now();

    this.initCSS();
    this.initGL();
    this.bindEvents();
    this.animate();
  }

  initCSS() {
    if (!document.querySelector('link[href*="dither.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/dither.css';
      document.head.appendChild(link);
    }
    if (!this.container.classList.contains('dither-container')) {
      this.container.classList.add('dither-container');
    }
  }

  initGL() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'dither-canvas';
    this.container.appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }) ||
               this.canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('Dither: WebGL not supported');
      return;
    }
    this.gl = gl;

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, VERTEX_SHADER);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, FRAGMENT_SHADER);
    gl.compileShader(fragShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Dither Shader Program Error:', gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;
    gl.useProgram(program);

    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      waveSpeed: gl.getUniformLocation(program, 'waveSpeed'),
      waveFrequency: gl.getUniformLocation(program, 'waveFrequency'),
      waveAmplitude: gl.getUniformLocation(program, 'waveAmplitude'),
      waveColor: gl.getUniformLocation(program, 'waveColor'),
      backgroundColor: gl.getUniformLocation(program, 'backgroundColor'),
      mousePos: gl.getUniformLocation(program, 'mousePos'),
      enableMouseInteraction: gl.getUniformLocation(program, 'enableMouseInteraction'),
      mouseRadius: gl.getUniformLocation(program, 'mouseRadius'),
      colorNum: gl.getUniformLocation(program, 'colorNum'),
      pixelSize: gl.getUniformLocation(program, 'pixelSize')
    };

    this.resize();
  }

  resize() {
    if (!this.gl || !this.canvas || !this.container) return;
    const width = this.container.offsetWidth || window.innerWidth;
    const height = this.container.offsetHeight || window.innerHeight;
    const dpr = this.options.pixelRatio || 1;

    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (this.program && this.uniforms) {
      this.gl.useProgram(this.program);
      this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    }
  }

  bindEvents() {
    this._handleResize = () => this.resize();
    window.addEventListener('resize', this._handleResize);

    if (this.options.enableMouseInteraction) {
      this._handleMouseMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        this.targetMouse = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      };
      window.addEventListener('mousemove', this._handleMouseMove);
    }
  }

  animate() {
    if (!this.gl || !this.program) return;

    const render = (now) => {
      this.animId = requestAnimationFrame(render);

      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.1;
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.1;

      const elapsed = this.options.disableAnimation ? 0 : (now - this.startTime) * 0.001;
      const waveCol = parseRGB(this.options.waveColor);
      const bgCol = parseRGB(this.options.backgroundColor);

      this.gl.useProgram(this.program);
      this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      this.gl.uniform1f(this.uniforms.time, elapsed);
      this.gl.uniform1f(this.uniforms.waveSpeed, this.options.waveSpeed);
      this.gl.uniform1f(this.uniforms.waveFrequency, this.options.waveFrequency);
      this.gl.uniform1f(this.uniforms.waveAmplitude, this.options.waveAmplitude);
      this.gl.uniform3f(this.uniforms.waveColor, waveCol[0], waveCol[1], waveCol[2]);
      this.gl.uniform3f(this.uniforms.backgroundColor, bgCol[0], bgCol[1], bgCol[2]);
      this.gl.uniform2f(this.uniforms.mousePos, this.mouse.x, this.mouse.y);
      this.gl.uniform1i(this.uniforms.enableMouseInteraction, this.options.enableMouseInteraction ? 1 : 0);
      this.gl.uniform1f(this.uniforms.mouseRadius, this.options.mouseRadius);
      this.gl.uniform1f(this.uniforms.colorNum, this.options.colorNum);
      this.gl.uniform1f(this.uniforms.pixelSize, this.options.pixelSize);

      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    };

    this.animId = requestAnimationFrame(render);
  }

  start() {
    if (!this.animId) {
      this.animate();
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  setOptions(newOpts = {}) {
    Object.assign(this.options, newOpts);
    this.resize();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._handleResize);
    if (this._handleMouseMove) {
      window.removeEventListener('mousemove', this._handleMouseMove);
    }
    if (this.gl) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

export function initDither(mountTarget, options = {}) {
  return new Dither(mountTarget, options);
}

if (typeof window !== 'undefined') {
  window.Dither = Dither;
  window.initDither = initDither;
}
