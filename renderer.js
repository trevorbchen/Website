// Schwarzschild black hole, ray traced per pixel in a fragment shader.
//
// Units: G = c = M = 1, so the horizon is r = 2 and the photon sphere is r = 3.
// A light ray stays in one plane through the hole. In that plane, with u = 1/r and
// phi the angle swept, null geodesics obey Binet's equation:   u'' = -u + 3 u^2.
// We integrate (u, u') with RK4 per pixel, watch for crossings of the equatorial
// plane (the accretion disk) and for capture (u > 1/2) or escape (r > ~600).
// The disk is thin and optically thick with a Novikov-Thorne-style temperature
// profile, a Doppler factor from its circular orbital speed, and gravitational
// redshift sqrt(1 - 2/r). Not modeled: spin, disk self-lensing, scattering.
(() => {
  const canvas = document.getElementById("bh");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
  const hud = document.getElementById("rhud");
  if (!gl) {
    if (hud) hud.textContent = "WebGL is not available in this browser.";
    return;
  }

  const vert = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
  const frag = `
precision highp float;
uniform vec2 u_res;
uniform vec3 u_cam, u_right, u_up, u_fwd;
uniform float u_tanfov, u_temp, u_exp, u_rout, u_dop, u_grav, u_ss;

const float RIN = 6.0;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 blackbody(float T) {            // Tanner Helland's fit, valid ~1000 to 40000 K
  float t = clamp(T, 1000.0, 40000.0) / 100.0;
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.292936 * pow(max(t - 60.0, 1.0), -0.1332047), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.390081 * log(t) - 0.631841, 0.0, 1.0)
                  : clamp(1.129891 * pow(max(t - 60.0, 1.0), -0.0755148), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.543207 * log(max(t - 10.0, 1.0)) - 1.196254, 0.0, 1.0));
  return c;
}

vec3 starfield(vec3 d) {
  vec3 col = vec3(0.0);
  for (int l = 0; l < 3; l++) {
    float sc = 38.0 + float(l) * 52.0;
    vec3 p = d * sc;
    vec3 id = floor(p);
    vec3 f = fract(p) - 0.5;
    float h = hash13(id + float(l) * 17.0);
    if (h > 0.93) {
      vec3 off = vec3(hash13(id + 1.7), hash13(id + 5.3), hash13(id + 9.1)) - 0.5;
      float dd = length(f - off * 0.6);
      float b = smoothstep(0.24, 0.0, dd) * (h - 0.93) * 14.0;
      col += b * mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.8, 0.6), hash13(id + 3.3));
    }
  }
  float band = exp(-pow(d.y * 3.2 + 0.3 * sin(d.x * 3.0 + 1.0), 2.0));
  float cloud = 0.5 + 0.5 * sin(d.x * 7.0 + 2.0 * sin(d.y * 5.0 + d.z * 3.0)) * sin(d.z * 6.0 + d.y * 4.0);
  col += vec3(0.05, 0.04, 0.085) * band * (0.35 + cloud);
  return col;
}

vec3 trace(vec3 ro, vec3 rd) {
  float r0 = length(ro);
  vec3 e1 = ro / r0;
  vec3 tang = rd - dot(rd, e1) * e1;
  float tl = length(tang);
  vec3 e2 = tl > 1e-5 ? tang / tl : normalize(cross(e1, vec3(0.31, 1.0, 0.17)));
  float u = 1.0 / r0;
  float du = -u * dot(rd, e1) / max(tl, 1e-5);
  float phi = 0.0;
  vec3 acc = vec3(0.0);
  float trans = 1.0;
  float prevY = ro.y, prevR = r0, prevPhi = 0.0, prevDu = du;
  bool escaped = false;

  for (int i = 0; i < 320; i++) {
    float h = 0.06 * clamp(1.0 - 2.0 * u, 0.25, 1.0);
    float k1u = du,               k1d = -u + 3.0 * u * u;
    float u2 = u + 0.5 * h * k1u, d2 = du + 0.5 * h * k1d;
    float k2u = d2,               k2d = -u2 + 3.0 * u2 * u2;
    float u3 = u + 0.5 * h * k2u, d3 = du + 0.5 * h * k2d;
    float k3u = d3,               k3d = -u3 + 3.0 * u3 * u3;
    float u4 = u + h * k3u,       d4 = du + h * k3d;
    float k4u = d4,               k4d = -u4 + 3.0 * u4 * u4;
    float nu = u + h / 6.0 * (k1u + 2.0 * k2u + 2.0 * k3u + k4u);
    float ndu = du + h / 6.0 * (k1d + 2.0 * k2d + 2.0 * k3d + k4d);
    float nphi = phi + h;

    if (nu >= 0.5) break;                                 // captured by the horizon
    float r = 1.0 / max(nu, 1e-4);
    vec3 pos = r * (cos(nphi) * e1 + sin(nphi) * e2);

    if (prevY * pos.y < 0.0) {                            // crossed the disk plane
      float t = prevY / (prevY - pos.y);
      float rc = mix(prevR, r, t), pc = mix(prevPhi, nphi, t), dc = mix(prevDu, ndu, t);
      if (rc > RIN && rc < u_rout) {
        vec3 rho = cos(pc) * e1 + sin(pc) * e2;
        vec3 phh = -sin(pc) * e1 + cos(pc) * e2;
        float uc = 1.0 / rc;
        float rp = -dc / (uc * uc);                       // dr/dphi
        vec3 tan3 = (rp / sqrt(max(1.0 - 2.0 / rc, 1e-3))) * rho + rc * phh;
        vec3 nph = -normalize(tan3);                      // photon travels toward the camera
        vec3 ppos = rc * rho;
        vec3 vdir = normalize(cross(vec3(0.0, 1.0, 0.0), ppos));
        float beta = min(sqrt(1.0 / (rc - 2.0)), 0.95);
        float gam = 1.0 / sqrt(1.0 - beta * beta);
        float g = 1.0;
        if (u_dop > 0.5) g *= 1.0 / (gam * (1.0 - beta * dot(vdir, nph)));
        if (u_grav > 0.5) g *= sqrt(1.0 - 2.0 / rc);
        float x = RIN / rc;
        float Tn = pow(x, 0.75) * pow(max(1.0 - sqrt(x), 0.0) + 0.03, 0.25) / 0.49;
        float Tobs = g * u_temp * Tn;
        float bright = pow(Tobs / 6500.0, 4.0) * 1.0;
        vec3 c = blackbody(Tobs) * bright;
        acc += trans * c * 0.95;
        trans *= 0.12;                                    // thick disk: later images are dimmer
      }
    }

    if (nu < 0.0017 && ndu < 0.0) { phi = nphi; escaped = true; break; }
    prevY = pos.y; prevR = r; prevPhi = nphi; prevDu = ndu;
    u = nu; du = ndu; phi = nphi;
  }

  if (escaped) {
    vec3 sky = normalize(cos(phi) * e1 + sin(phi) * e2);
    acc += trans * starfield(sky);
  }
  return acc;
}

void main() {
  vec3 col = vec3(0.0);
  float n = 0.0;
  for (int sy = 0; sy < 2; sy++) {
    for (int sx = 0; sx < 2; sx++) {
      if (float(sx) >= u_ss || float(sy) >= u_ss) continue;
      vec2 off = (vec2(float(sx), float(sy)) + 0.5) / u_ss - 0.5;
      vec2 uv = (gl_FragCoord.xy + off - 0.5 * u_res) / u_res.y * 2.0;
      vec3 rd = normalize(u_fwd + (uv.x * u_right + uv.y * u_up) * u_tanfov);
      col += trace(u_cam, rd);
      n += 1.0;
    }
  }
  col = col / n * u_exp;
  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      if (hud) hud.textContent = "shader error: " + log;
      throw new Error(log);
    }
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
  const U = {};
  ["u_res", "u_cam", "u_right", "u_up", "u_fwd", "u_tanfov", "u_temp", "u_exp", "u_rout", "u_dop", "u_grav", "u_ss"]
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const $ = (id) => document.getElementById(id);
  const ctl = { incl: $("c-incl"), dist: $("c-dist"), temp: $("c-temp"), exp: $("c-exp"), rout: $("c-rout"), scale: $("c-scale"),
    dop: $("c-dop"), grav: $("c-grav"), ss: $("c-ss"), spin: $("c-spin") };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let az = 0.9, dirty = true;
  if (reduce) ctl.spin.checked = false;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), s = +ctl.scale.value;
    const w = Math.max(160, Math.floor(canvas.clientWidth * dpr * s)), h = Math.max(90, Math.floor(w * 9 / 16));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  window.addEventListener("resize", () => { dirty = true; });
  Object.values(ctl).forEach((el) => el.addEventListener("input", () => { dirty = true; }));

  // orbit with drag, zoom with wheel
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; ctl.spin.checked = false; });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    az -= (e.clientX - drag.x) * 0.006;
    ctl.incl.value = Math.min(88, Math.max(2, +ctl.incl.value - (e.clientY - drag.y) * 0.3));
    drag = { x: e.clientX, y: e.clientY }; dirty = true;
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    ctl.dist.value = Math.min(120, Math.max(20, +ctl.dist.value * (1 + Math.sign(e.deltaY) * 0.06)));
    dirty = true;
  }, { passive: false });

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };

  let frames = 0, t0 = performance.now(), last = performance.now(), fps = 0, slow = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = (now - last) / 1000; last = now;
    if (ctl.spin.checked) { az += dt * 0.18; dirty = true; }
    if (!dirty) return;
    dirty = false;
    size();
    const i = (+ctl.incl.value) * Math.PI / 180, D = +ctl.dist.value;
    const cam = [D * Math.sin(i) * Math.cos(az), D * Math.cos(i), D * Math.sin(i) * Math.sin(az)];
    const fwd = norm(cam.map((x) => -x)), right = norm(cross(fwd, [0, 1, 0])), up = cross(right, fwd);
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform3fv(U.u_cam, cam); gl.uniform3fv(U.u_right, right); gl.uniform3fv(U.u_up, up); gl.uniform3fv(U.u_fwd, fwd);
    gl.uniform1f(U.u_tanfov, Math.tan((30 * Math.PI) / 360));
    gl.uniform1f(U.u_temp, +ctl.temp.value); gl.uniform1f(U.u_exp, +ctl.exp.value); gl.uniform1f(U.u_rout, +ctl.rout.value);
    gl.uniform1f(U.u_dop, ctl.dop.checked ? 1 : 0); gl.uniform1f(U.u_grav, ctl.grav.checked ? 1 : 0);
    gl.uniform1f(U.u_ss, ctl.ss.checked ? 2 : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    frames++;
    if (now - t0 > 700) {
      fps = (frames * 1000) / (now - t0); frames = 0; t0 = now;
      // if it's chugging, quietly lower the render scale
      if (fps < 14 && +ctl.scale.value > 0.4) { slow++; if (slow >= 2) { ctl.scale.value = Math.max(0.4, +ctl.scale.value - 0.1); slow = 0; } } else slow = 0;
    }
    if (hud) hud.textContent = `${canvas.width}x${canvas.height} | ${fps.toFixed(0)} fps | camera ${D.toFixed(0)} M, inclination ${(+ctl.incl.value).toFixed(0)} deg | shadow radius 5.2 M`;
  }
  requestAnimationFrame(frame);
})();
