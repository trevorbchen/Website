// two plush toys (a penguin and a panda) as verlet ragdolls that live in the viewport.
// They stay put while you scroll. Grab one anywhere on the page and toss it around.
(() => {
  const canvas = document.getElementById("plush");
  const bubble = document.getElementById("bubble");
  if (!canvas) return;
  if (window.matchMedia("(pointer: coarse)").matches) { canvas.remove(); if (bubble) bubble.remove(); return; }
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6";
  let W = 0, H = 0, dpr = 1;

  const LINES = { penguin: ["squawk.", "poked."], panda: ["ow.", "bamboo."] };

  class P {
    constructor(x, y, r) { this.x = x; this.y = y; this.px = x; this.py = y; this.r = r; this.pin = false; }
  }

  function makePlush(kind, cx) {
    const F = H - 10;                                  // feet rest here
    const n = {
      head: new P(cx, F - 74, 24), neck: new P(cx, F - 58, 8), hip: new P(cx, F - 28, 22),
      handL: new P(cx - 32, F - 42, 9), handR: new P(cx + 32, F - 42, 9),
      footL: new P(cx - 15, F, 10), footR: new P(cx + 15, F, 10),
    };
    const c = (a, b, len, k = 1) => ({ a: n[a], b: n[b], len, k });
    return {
      kind, n, line: 0, blink: 0,
      cons: [c("head", "neck", 16), c("neck", "hip", 30), c("neck", "handL", 28), c("neck", "handR", 28),
        c("hip", "footL", 28), c("hip", "footR", 28), c("head", "hip", 46, 0.8),
        c("handL", "handR", 60, 0.08), c("footL", "footR", 34, 0.3), c("handL", "hip", 44, 0.12), c("handR", "hip", 44, 0.12)],
    };
  }

  let plushes = [];
  function resize() {
    const oldH = H;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!plushes.length) {
      plushes = [makePlush("penguin", W - 190), makePlush("panda", W - 90)];
    } else if (oldH) {
      for (const p of plushes) for (const k in p.n) {   // keep them standing on the bottom edge
        p.n[k].y += H - oldH; p.n[k].py += H - oldH;
        p.n[k].x = Math.min(Math.max(p.n[k].x, 20), W - 20); p.n[k].px = p.n[k].x;
      }
    }
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------------------------------------------------------------- black holes pull on the plushes
  const holeEls = Array.from(document.querySelectorAll(".hole"));
  const portalEl = document.querySelector("a.portal");
  const lastTouch = new WeakMap();
  let masses = [];
  function readMasses() {
    masses = [];
    for (const el of holeEls) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      masses.push({ el, x: r.left + r.width / 2, y: r.top + r.height / 2, rho: Math.max(r.width, r.height) / 2, A: 2.6 });
    }
    if (portalEl) {
      const r = portalEl.getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < H) masses.push({ el: null, x: r.left + r.width / 2, y: r.top + r.height / 2, rho: 46, A: 1.4 });
    }
  }
  readMasses();
  function pull(p) {              // acceleration of node p toward every hole, with a little swirl
    let ax = 0, ay = 0, near = false;
    for (const m of masses) {
      const dx = m.x - p.x, dy = m.y - p.y, r = Math.hypot(dx, dy) || 1, R = 320 + m.rho * 3;
      if (r > R) continue;
      let a = m.A * Math.pow(1 - r / R, 1.3);
      if (r < m.rho + 10) { a *= 0.5; near = true; }
      ax += (dx / r) * a - (dy / r) * a * 0.18;
      ay += (dy / r) * a + (dx / r) * a * 0.18;
      if (m.el && r < m.rho + 16) {                                  // touching it: the hole jiggles
        const now = performance.now();
        if (now - (lastTouch.get(m.el) || 0) > 900) { lastTouch.set(m.el, now); m.el.classList.remove("wobble"); void m.el.offsetWidth; m.el.classList.add("wobble"); }
      }
    }
    const mag = Math.hypot(ax, ay);
    if (mag > 3) { ax *= 3 / mag; ay *= 3 / mag; }
    return { ax, ay, near };
  }

  // ---------------------------------------------------------------- physics
  function step() {
    const g = 0.55;
    for (const pl of plushes) {
      const nodes = Object.values(pl.n);
      for (const p of nodes) {
        if (p.pin) continue;
        const f = pull(p), damp = f.near ? 0.93 : 0.992;
        const grip = p.y >= H - p.r - 1 && f.ay > -0.2 ? 0.7 : 1;          // friction while resting on the floor
        let vx = (p.x - p.px) * damp * grip; const vy = (p.y - p.py) * damp;
        if (grip < 1 && Math.abs(vx) < 0.25) vx = 0;                        // static friction: no creeping
        p.px = p.x; p.py = p.y; p.x += vx + f.ax; p.y += vy + g + f.ay;
      }
      const grounded = pl.n.footL.y > H - 36 || pl.n.footR.y > H - 36;
      if (grounded && !pl.n.head.pin) {            // stuffing: posture springs pull it upright over its feet
        const n = pl.n, cx = (n.footL.x + n.footR.x) / 2;
        const nudge = (node, tx, ty, kx, ky) => { if (!node.pin) { node.x += (tx - node.x) * kx; node.y += (ty - node.y) * ky; } };
        nudge(n.hip, cx, n.hip.y, 0.1, 0);
        nudge(n.neck, n.hip.x, n.hip.y - 30, 0.12, 0.08);
        nudge(n.head, n.hip.x, n.hip.y - 46, 0.12, 0.1);
      }
      for (let it = 0; it < 8; it++) {
        for (const c of pl.cons) {
          const dx = c.b.x - c.a.x, dy = c.b.y - c.a.y, d = Math.hypot(dx, dy) || 1e-4;
          const diff = ((d - c.len) / d) * 0.5 * c.k;
          const wa = c.a.pin ? 0 : 1, wb = c.b.pin ? 0 : 1, w = wa + wb || 1;
          if (!c.a.pin) { c.a.x += dx * diff * 2 * wa / w; c.a.y += dy * diff * 2 * wa / w; }
          if (!c.b.pin) { c.b.x -= dx * diff * 2 * wb / w; c.b.y -= dy * diff * 2 * wb / w; }
        }
        for (const p of nodes) {
          if (p.pin) continue;
          if (p.y > H - p.r) { p.y = H - p.r; p.px = p.x - (p.x - p.px) * 0.65; }
          if (p.y < p.r) p.y = p.r;
          if (p.x < p.r) p.x = p.r;
          if (p.x > W - p.r) p.x = W - p.r;
        }
      }
    }
    const [a, b] = plushes;
    for (const k of ["hip", "head"]) {
      const dx = b.n[k].x - a.n[k].x, dy = b.n[k].y - a.n[k].y, d = Math.hypot(dx, dy) || 1, min = k === "hip" ? 72 : 60;
      if (d < min) {
        const push = (min - d) / 2;
        if (!a.n[k].pin) { a.n[k].x -= (dx / d) * push; a.n[k].y -= (dy / d) * push; }
        if (!b.n[k].pin) { b.n[k].x += (dx / d) * push; b.n[k].y += (dy / d) * push; }
      }
    }
  }

  // ---------------------------------------------------------------- drawing
  function inkEllipse(x, y, rx, ry, rot, fill) {
    for (const [dx, dy, col] of [[-2.5, 1.5, CYAN], [2.5, -1.5, PINK]]) {
      ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, rot, 0, 6.2832);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 6.2832);
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
  }
  function limb(a, b, w, fill) {
    ctx.lineCap = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = w + 6;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function eye(blink, x, y, rx, ry, col) {            // big shiny eye (a touch of anime)
    if (blink) { ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x - rx, y); ctx.lineTo(x + rx, y); ctx.stroke(); return; }
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.arc(x - rx * 0.3, y - ry * 0.35, rx * 0.38, 0, 6.2832); ctx.fillStyle = "#fff"; ctx.fill();
  }
  function blush(x, y) { ctx.beginPath(); ctx.ellipse(x, y, 5.5, 3.6, 0, 0, 6.2832); ctx.fillStyle = "rgba(255,46,136,0.45)"; ctx.fill(); }
  function limbBlob(a, b, rx, ry, fill) {              // short stubby limb: an ellipse pointing from a toward b
    const mx = a.x + (b.x - a.x) * 0.62, my = a.y + (b.y - a.y) * 0.62;
    inkEllipse(mx, my, rx, ry, Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2, fill);
  }

  function draw(pl, t) {
    const n = pl.n, pen = pl.kind === "penguin";
    const WHITE = "#fbf9f3", ORANGE = "#ff9f1c";
    const mx = (n.neck.x + n.hip.x) / 2, my = (n.neck.y + n.hip.y) / 2 + 8;
    const bAng = Math.atan2(-(n.hip.x - n.neck.x), n.hip.y - n.neck.y);
    const hAng = Math.atan2(n.head.x - n.neck.x, -(n.head.y - n.neck.y));
    // legs / feet
    for (const f of [n.footL, n.footR]) {
      if (pen) inkEllipse(f.x, f.y + 1, 13, 7.5, 0, ORANGE); else inkEllipse(f.x, f.y - 2, 12, 11, 0, INK);
    }
    // round body
    inkEllipse(mx, my, 36, 37, bAng, pen ? INK : WHITE);
    if (pen) {
      ctx.save(); ctx.translate(mx, my + 5); ctx.rotate(bAng);
      ctx.beginPath(); ctx.ellipse(0, 3, 23, 26, 0, 0, 6.2832); ctx.fillStyle = WHITE; ctx.fill();
      ctx.restore();
    }
    // arms / flippers
    limbBlob(n.neck, n.handL, 9, 16, INK); limbBlob(n.neck, n.handR, 9, 16, INK);
    // head
    ctx.save(); ctx.translate(n.head.x, n.head.y); ctx.rotate(hAng);
    const blink = Math.sin(t / 700 + n.head.x) > 0.985 || pl.blink > 0;
    if (!pen) for (const sx of [-1, 1]) inkEllipse(sx * 21, -17, 10, 10, 0, INK);          // ears
    inkEllipse(0, 0, 31, 26, 0, pen ? INK : WHITE);
    if (pen) {
      ctx.beginPath(); ctx.ellipse(0, 4, 22, 17, 0, 0, 6.2832); ctx.fillStyle = WHITE; ctx.fill();
      eye(blink, -11, -2, 5, 6.5, INK); eye(blink, 11, -2, 5, 6.5, INK);
      ctx.beginPath(); ctx.ellipse(0, 8, 5.5, 3.8, 0, 0, 6.2832); ctx.fillStyle = ORANGE; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    } else {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 12, -2, 8, 10.5, sx * 0.4, 0, 6.2832); ctx.fillStyle = INK; ctx.fill(); }
      eye(blink, -12, -3, 3.6, 4.4, WHITE); eye(blink, 12, -3, 3.6, 4.4, WHITE);
      ctx.beginPath(); ctx.ellipse(0, 8, 4.6, 3.2, 0, 0, 6.2832); ctx.fillStyle = INK; ctx.fill();
    }
    blush(-21, 9); blush(21, 9);
    ctx.restore();
    if (pl.blink > 0) pl.blink--;
  }

  // ---------------------------------------------------------------- interaction (page-wide)
  let drag = null, down = null, swallowClick = false;
  function pick(p) {
    let best = null, bd = 1e9;
    for (const pl of plushes) {
      for (const k in pl.n) {
        const d = Math.hypot(pl.n[k].x - p.x, pl.n[k].y - p.y) - pl.n[k].r;
        if (d < 18 && d < bd) { bd = d; best = { pl, node: pl.n[k] }; }
      }
      const a = pl.n.neck, b = pl.n.hip;
      const ab = { x: b.x - a.x, y: b.y - a.y }, t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
      const d = Math.hypot(a.x + ab.x * t - p.x, a.y + ab.y * t - p.y);
      if (d < 30 && !best) best = { pl, node: pl.n.hip };
    }
    return best;
  }
  function say(pl) {
    if (!bubble) return;
    const lines = LINES[pl.kind];
    bubble.textContent = lines[pl.line++ % lines.length];
    bubble.classList.add("show");
    bubble.style.left = Math.min(Math.max(pl.n.head.x - 40, 8), W - 240) + "px";
    bubble.style.top = Math.max(pl.n.head.y - 70, 8) + "px";
    clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove("show"), 2200);
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const hit = pick({ x: e.clientX, y: e.clientY });
    if (!hit) return;
    e.preventDefault();
    hit.node.pin = true;
    drag = { ...hit, off: { x: hit.node.x - e.clientX, y: hit.node.y - e.clientY }, target: { x: hit.node.x, y: hit.node.y } };
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    swallowClick = true;
    root.classList.add("plush-drag");
  }, true);
  document.addEventListener("mousedown", (e) => { if (pick({ x: e.clientX, y: e.clientY })) e.preventDefault(); }, true);
  document.addEventListener("selectstart", (e) => { if (drag) e.preventDefault(); });
  document.addEventListener("click", (e) => { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }, true);

  window.addEventListener("pointermove", (e) => {
    if (!drag) { root.classList.toggle("plush-hover", !!pick({ x: e.clientX, y: e.clientY })); return; }
    drag.target = { x: Math.min(Math.max(e.clientX + drag.off.x, 10), W - 10), y: Math.min(Math.max(e.clientY + drag.off.y, 10), H - 10) };
    down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
  });
  function release() {
    if (!drag) return;
    const { pl, node } = drag;
    node.pin = false;
    if (down.moved < 6 && performance.now() - down.t < 350) {
      for (const k in pl.n) pl.n[k].py = pl.n[k].y + 9;   // boing
      pl.blink = 8; say(pl);
    }
    drag = null; root.classList.remove("plush-drag");
    setTimeout(() => { swallowClick = false; }, 0);
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / 60) return;
    last = now;
    if (drag) { drag.node.px = drag.node.x; drag.node.py = drag.node.y; drag.node.x = drag.target.x; drag.node.y = drag.target.y; }
    readMasses();
    step();
    ctx.clearRect(0, 0, W, H);
    for (const pl of plushes) draw(pl, now);
  }
  requestAnimationFrame(frame);
})();
