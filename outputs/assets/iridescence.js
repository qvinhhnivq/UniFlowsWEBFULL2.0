/**
 * Iridescence — Slick iridescent shader with shifting waves
 * Vanilla JS & WebGL port of React Bits @react-bits/Iridescence-JS-CSS
 * Pure WebGL shader implementation with zero runtime dependencies
 */

const VERTEX_SHADER = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

function parseColor(color) {
  if (Array.isArray(color)) {
    return color.length >= 3 ? [color[0], color[1], color[2]] : [1, 1, 1];
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
  return [1, 1, 1];
}

export class Iridescence {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      console.warn('Iridescence: target container not found');
      return;
    }

    this.options = {
      color: [1, 1, 1],
      speed: 1.0,
      amplitude: 0.1,
      mouseReact: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      ...options
    };

    this.mouse = { x: 0.5, y: 0.5 };
    this.targetMouse = { x: 0.5, y: 0.5 };
    this.animId = null;
    this.startTime = performance.now();

    this.initCSS();
    this.initGL();
    this.bindEvents();
    this.animate();
  }

  initCSS() {
    if (!document.querySelector('link[href*="iridescence.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/iridescence.css';
      document.head.appendChild(link);
    }
    if (!this.container.classList.contains('iridescence-container')) {
      this.container.classList.add('iridescence-container');
    }
  }

  initGL() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'iridescence-canvas';
    this.container.appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl', { antialias: true, alpha: false }) || 
               this.canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('Iridescence: WebGL not supported on this device/browser');
      return;
    }
    this.gl = gl;

    // Create Shaders
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, VERTEX_SHADER);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, FRAGMENT_SHADER);
    gl.compileShader(fragShader);

    // Create Program
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Iridescence Shader Program Error:', gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;
    gl.useProgram(program);

    // Fullscreen Triangle Geometry
    // 2 Triangles for Quad [-1..1]
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    const uvs = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
    ]);

    // Position Buffer
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // UV Buffer
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    this.uniforms = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uColor: gl.getUniformLocation(program, 'uColor'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed')
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
      this.gl.uniform3f(
        this.uniforms.uResolution,
        this.canvas.width,
        this.canvas.height,
        this.canvas.width / this.canvas.height
      );
    }
  }

  bindEvents() {
    this._handleResize = () => this.resize();
    window.addEventListener('resize', this._handleResize);

    if (this.options.mouseReact) {
      this._handleMouseMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        this.targetMouse = {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y))
        };
      };
      this.container.addEventListener('mousemove', this._handleMouseMove);
    }
  }

  animate() {
    if (!this.gl || !this.program) return;

    const render = (time) => {
      this.animId = requestAnimationFrame(render);

      // Smooth mouse interpolation
      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;

      const elapsed = (time - this.startTime) * 0.001;
      const rgb = parseColor(this.options.color);

      this.gl.useProgram(this.program);
      this.gl.uniform1f(this.uniforms.uTime, elapsed);
      this.gl.uniform3f(this.uniforms.uColor, rgb[0], rgb[1], rgb[2]);
      this.gl.uniform2f(this.uniforms.uMouse, this.mouse.x, this.mouse.y);
      this.gl.uniform1f(this.uniforms.uAmplitude, this.options.amplitude);
      this.gl.uniform1f(this.uniforms.uSpeed, this.options.speed);

      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    };

    this.animId = requestAnimationFrame(render);
  }

  setOptions(newOpts = {}) {
    Object.assign(this.options, newOpts);
    this.resize();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this._handleResize);
    if (this._handleMouseMove && this.container) {
      this.container.removeEventListener('mousemove', this._handleMouseMove);
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

export function initIridescence(mountTarget, options = {}) {
  return new Iridescence(mountTarget, options);
}

// Global window registration for easy vanilla HTML script tag usage
if (typeof window !== 'undefined') {
  window.Iridescence = Iridescence;
  window.initIridescence = initIridescence;
}
