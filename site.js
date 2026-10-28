// trevor's site — tiny bits of javascript, no frameworks

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- line boil: re-seed the ink turbulence "on twos" (~12fps) ----------
(() => {
  const turb = document.getElementById("boil-noise");
  if (!turb || reduceMotion) return;
  let seed = 0;
  setInterval(() => {
    seed = (seed + 1) % 4;
    turb.setAttribute("seed", String(seed));
  }, 1000 / 12);
})();

// ---------- random slice glitch on the name ----------
(() => {
  const logo = document.querySelector(".logo");
  if (!logo || reduceMotion) return;
  function glitch() {
    logo.classList.remove("glitching");
    void logo.offsetWidth;
    logo.classList.add("glitching");
    setTimeout(glitch, 2500 + Math.random() * 4500);
  }
  setTimeout(glitch, 1200);
  logo.addEventListener("mouseenter", () => {
    logo.classList.remove("glitching");
    void logo.offsetWidth;
    logo.classList.add("glitching");
  });
})();

// ---------- spot portals: page transitions open from where you clicked ----------
(() => {
  const portal = document.getElementById("portal");
  if (!portal) return;

  const saved = sessionStorage.getItem("portal");
  if (saved && !reduceMotion) {
    sessionStorage.removeItem("portal");
    portal.style.clipPath = `circle(150% at ${saved})`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      portal.classList.add("open");
      portal.style.clipPath = `circle(0 at ${saved})`;
    }));
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith(".html") || url.pathname === location.pathname) return;
    e.preventDefault();
    const at = `${(e.clientX / innerWidth) * 100}% ${(e.clientY / innerHeight) * 100}%`;
    sessionStorage.setItem("portal", at);
    portal.classList.remove("open");
    portal.style.clipPath = `circle(0 at ${at})`;
    requestAnimationFrame(() => {
      portal.classList.add("open");
      portal.style.clipPath = `circle(150% at ${at})`;
    });
    setTimeout(() => { location.href = a.href; }, 430);
  });

  // back/forward cache: never come back to a closed portal
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) { portal.classList.remove("open"); portal.style.clipPath = "circle(0 at 50% 50%)"; }
  });
})();

// ---------- konami code: enter the spot's dimension ----------
(() => {
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let i = 0;
  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    i = key === code[i] ? i + 1 : (key === code[0] ? 1 : 0);
    if (i === code.length) {
      i = 0;
      document.body.classList.toggle("inverted");
    }
  });
})();

// ---------- the spot portal: gravitational lensing of a starfield ----------
// Each pixel maps back to the source plane with the thin-lens equation
//   beta = theta - theta_E^2 * theta / |theta|^2
// so background stars stretch into arcs and an Einstein ring around the hole.
(() => {
  const canvas = document.getElementById("cam");
  if (!canvas) return;
  const gl = canvas.getContext("webgl");
  if (!gl) return;

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

    vec3 stars(vec2 p) {
      vec3 col = vec3(0.0);
      for (int layer = 0; layer < 3; layer++) {
        float scale = 12.0 + float(layer) * 14.0;
        vec2 q = p * scale + float(layer) * 17.0;
        vec2 cell = floor(q);
        float h = hash(cell);
        if (h > 0.86) {
          vec2 off = vec2(hash(cell + 1.3), hash(cell + 7.1)) - 0.5;
          float d = length(fract(q) - 0.5 - off * 0.6);
          float b = smoothstep(0.11, 0.0, d) * (h - 0.86) * 7.0;
          float pick = hash(cell + 3.7);
          vec3 tint = pick < 0.33 ? vec3(1.0, 0.18, 0.53) : (pick < 0.66 ? vec3(0.1, 0.83, 0.9) : vec3(1.0, 0.88, 0.23));
          col += mix(vec3(1.0), tint, 0.6) * b;
        }
      }
      return col;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      vec2 hole = (u_hole - 0.5 * u_res) / u_res.y;
      vec2 d = uv - hole;
      float r = length(d);

      float rE = 0.17;
      vec2 src = uv - rE * rE * d / (r * r + 1e-4);

      // halftone-ish dot field so the void reads like printed ink
      vec2 g = fract(src * 26.0) - 0.5;
      float dots = smoothstep(0.22, 0.18, length(g)) * 0.07;

      vec3 col = stars(src) + vec3(dots);

      float horizon = smoothstep(rE * 0.62, rE * 0.52, r);
      col *= 1.0 - horizon;

      // misregistered pink / cyan rings, comic-print style
      col += vec3(1.0, 0.18, 0.53) * exp(-pow((r - rE * 0.70) / 0.010, 2.0)) * 0.95;
      col += vec3(0.1, 0.83, 0.9) * exp(-pow((length(d + vec2(0.012, -0.008)) - rE * 0.70) / 0.010, 2.0)) * 0.95;

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

  canvas.addEventListener("pointerenter", () => { hovering = true; });
  canvas.addEventListener("pointerleave", () => { hovering = false; });
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    target.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    target.y = ((rect.bottom - e.clientY) / rect.height) * canvas.height;
  });
  window.addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  // animate "on twos" like the films: update the scene at ~12fps, not 60
  let last = 0;
  const start = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || now - last < 1000 / 12) return;
    last = now;
    const t = reduceMotion ? 0 : (now - start) / 1000;
    if (!hovering && !reduceMotion) {
      target.x = canvas.width * (0.5 + 0.16 * Math.cos(t * 0.5));
      target.y = canvas.height * (0.5 + 0.16 * Math.sin(t * 0.7));
    }
    hole.x += (target.x - hole.x) * 0.45;
    hole.y += (target.y - hole.y) * 0.45;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uHole, hole.x, hole.y);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);
})();
