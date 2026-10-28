// trevor's homepage — tiny bits of javascript, no frameworks

// ---------- visit counter (stored only in your own browser) ----------
(() => {
  const el = document.getElementById("visits");
  if (!el) return;
  let n = 1;
  try {
    n = Number(localStorage.getItem("visits") || 0) + 1;
    localStorage.setItem("visits", String(n));
  } catch (_) {}
  el.textContent = String(n).padStart(6, "0");
})();

// ---------- black_hole.cam: gravitational lensing of a starfield ----------
// Each pixel maps back to the source plane with the thin-lens equation
//   beta = theta - theta_E^2 * theta / |theta|^2
// so background stars stretch into arcs and an Einstein ring around the hole.
(() => {
  const canvas = document.getElementById("cam");
  if (!canvas) return;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    canvas.style.background = "radial-gradient(circle, #000 30%, #ff2e88 34%, #0c0a1d 46%)";
    return;
  }

  const vert = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

  const frag = `
    precision highp float;
    uniform vec2 u_res;
    uniform vec2 u_hole;
    uniform float u_time;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
      return v;
    }

    vec3 stars(vec2 p) {
      vec3 col = vec3(0.0);
      for (int layer = 0; layer < 3; layer++) {
        float scale = 14.0 + float(layer) * 16.0;
        vec2 q = p * scale + float(layer) * 17.0;
        vec2 cell = floor(q);
        float h = hash(cell);
        if (h > 0.88) {
          vec2 off = vec2(hash(cell + 1.3), hash(cell + 7.1)) - 0.5;
          float d = length(fract(q) - 0.5 - off * 0.6);
          float tw = 0.7 + 0.3 * sin(u_time * (1.0 + h * 3.0) + h * 40.0);
          float b = smoothstep(0.1, 0.0, d) * (h - 0.88) * 8.0 * tw;
          vec3 tint = mix(vec3(0.24, 0.94, 1.0), vec3(1.0, 0.18, 0.53), hash(cell + 3.7));
          col += mix(vec3(1.0), tint, 0.55) * b;
        }
      }
      return col;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      vec2 hole = (u_hole - 0.5 * u_res) / u_res.y;
      vec2 d = uv - hole;
      float r = length(d);

      float rE = 0.16;
      vec2 src = uv - rE * rE * d / (r * r + 1e-4);

      float n = fbm(src * 2.2 + vec2(u_time * 0.02, 0.0));
      vec3 col = stars(src)
               + vec3(0.36, 0.14, 0.62) * pow(n, 2.0) * 1.2
               + vec3(0.05, 0.25, 0.32) * pow(fbm(src * 3.7 - 5.0), 3.0);

      float horizon = smoothstep(rE * 0.62, rE * 0.52, r);
      col *= 1.0 - horizon;

      float ang = atan(d.y, d.x);
      vec3 ringCol = mix(vec3(1.0, 0.18, 0.53), vec3(0.24, 0.94, 1.0), 0.5 + 0.5 * sin(ang * 2.0 + u_time));
      col += ringCol * exp(-pow((r - rE * 0.68) / 0.014, 2.0)) * 0.9;
      col += vec3(0.96, 0.76, 0.29) * exp(-r * 8.0) * 0.15 * (1.0 - horizon);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uHole = gl.getUniformLocation(prog, "u_hole");
  const uTime = gl.getUniformLocation(prog, "u_time");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hole = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let hovering = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    hole.x = target.x = canvas.width / 2;
    hole.y = target.y = canvas.height / 2;
  }

  function aim(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    target.x = ((clientX - rect.left) / rect.width) * canvas.width;
    target.y = ((rect.bottom - clientY) / rect.height) * canvas.height;
  }

  canvas.addEventListener("pointerenter", () => { hovering = true; });
  canvas.addEventListener("pointerleave", () => { hovering = false; });
  canvas.addEventListener("pointermove", (e) => aim(e.clientX, e.clientY));
  window.addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const start = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = reduceMotion ? 0 : (now - start) / 1000;
    if (!hovering && !reduceMotion) {
      target.x = canvas.width * (0.5 + 0.18 * Math.cos(t * 0.4));
      target.y = canvas.height * (0.5 + 0.18 * Math.sin(t * 0.55));
    }
    hole.x += (target.x - hole.x) * 0.1;
    hole.y += (target.y - hole.y) * 0.1;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uHole, hole.x, hole.y);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);
})();
