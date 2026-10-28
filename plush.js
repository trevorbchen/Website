// a round plush penguin as a squishy verlet blob that lives in the viewport.
// It sits still. Grab it anywhere on the page and toss it around; once it's been handled,
// nearby black holes pull on it, and it will cling to one.
(() => {
  const canvas = document.getElementById("plush");
  const bubble = document.getElementById("bubble");
  if (!canvas) return;
  if (window.matchMedia("(pointer: coarse)").matches) { canvas.remove(); if (bubble) bubble.remove(); return; }
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const INK = "#111015", WHITE = "#fbf9f3", ORANGE = "#ff9f1c";
  let W = 0, H = 0, dpr = 1;

  const LINES = { penguin: ["squawk.", "poked."] };

  class P {
    constructor(x, y, r, g) { this.x = x; this.y = y; this.px = x; this.py = y; this.r = r; this.g = g; this.pin = false; }
  }

  // five nodes: a center, plus top / bottom / left / right. The bottom is heavy, so it rights itself like a weeble.
  function makePlush(kind, cx) {
    const cy = H - 38;
    const n = {
      c: new P(cx, cy, 28, 1), t: new P(cx, cy - 26, 11, 0.45), b: new P(cx, cy + 26, 11, 1.7),
      l: new P(cx - 26, cy, 12, 1), r: new P(cx + 26, cy, 12, 1),
    };
    const k = (a, b, len, s = 1) => ({ a: n[a], b: n[b], len, k: s });
    const D = 26 * Math.SQRT2;
    return {
      kind, n, line: 0, blink: 0, awakeUntil: 0, docked: false,
      cons: [k("c", "t", 26), k("c", "b", 26), k("c", "l", 26), k("c", "r", 26),
        k("t", "r", D, 0.9), k("r", "b", D, 0.9), k("b", "l", D, 0.9), k("l", "t", D, 0.9), k("t", "b", 52, 0.8), k("l", "r", 52, 0.8)],
    };
  }

  let plushes = [];
  function resize() {
    const oldH = H;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!plushes.length) plushes = [makePlush("penguin", W - 100)];
    else if (oldH) for (const p of plushes) for (const k in p.n) {
      p.n[k].y += H - oldH; p.n[k].py += H - oldH;
      p.n[k].x = Math.min(Math.max(p.n[k].x, 20), W - 20); p.n[k].px = p.n[k].x;
    }
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------------------------------------------------------------- black holes
  const holeEls = Array.from(document.querySelectorAll(".hole"));
  const portalEl = document.querySelector("a.portal");
  const lastTouch = new WeakMap();
  let masses = [];
  function readMasses() {
    masses = [];
    for (const el of holeEls) {
      const r = el.getBoundingClientRect();
      if (r.width) masses.push({ el, x: r.left + r.width / 2, y: r.top + r.height / 2, rho: Math.max(r.width, r.height) / 2, A: 2.6 });
    }
    if (portalEl) {
      const r = portalEl.getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < H) masses.push({ el: null, x: r.left + r.width / 2, y: r.top + r.height / 2, rho: 46, A: 1.4 });
    }
  }
  readMasses();
  function pull(p) {
    let ax = 0, ay = 0, near = false;
    for (const m of masses) {
      const dx = m.x - p.x, dy = m.y - p.y, r = Math.hypot(dx, dy) || 1, R = 320 + m.rho * 3;
      if (r > R) continue;
      let a = m.A * Math.pow(1 - r / R, 1.3);
      if (r < m.rho + 10) { a *= 0.7; near = true; }
      ax += (dx / r) * a - (dy / r) * a * 0.07;
      ay += (dy / r) * a + (dx / r) * a * 0.07;
      if (m.el && r < m.rho + 16) {
        const now = performance.now();
        if (now - (lastTouch.get(m.el) || 0) > 900) { lastTouch.set(m.el, now); m.el.classList.remove("wobble"); void m.el.offsetWidth; m.el.classList.add("wobble"); }
      }
    }
    const mag = Math.hypot(ax, ay);
    if (mag > 3) { ax *= 3 / mag; ay *= 3 / mag; }
    return { ax, ay, near };
  }

  // ---------------------------------------------------------------- physics
  function step(now) {
    const g = 0.55;
    for (const pl of plushes) {
      const c = pl.n.c;
      // black holes only act on a plush that has been handled (or is already clinging to one)
      const speed = Math.hypot(c.x - c.px, c.y - c.py);
      if (speed > 3) pl.awakeUntil = Math.max(pl.awakeUntil, now + 900);
      pl.docked = masses.some((m) => m.el && Math.hypot(m.x - c.x, m.y - c.y) < m.rho + 110);
      const awake = now < pl.awakeUntil || pl.docked;
      const nodes = Object.values(pl.n);
      const N = pl.n;
      if (N.b.y > H - 20 || N.l.y > H - 20 || N.r.y > H - 20) {       // stuffing: gently stand it back up (a torque, so no net push)
        if (!N.t.pin && !N.b.pin) { const d = (N.b.x - N.t.x) * 0.07; N.t.x += d; N.b.x -= d * 0.5; }
        if (!N.l.pin) N.l.y += (N.c.y - N.l.y) * 0.06;
        if (!N.r.pin) N.r.y += (N.c.y - N.r.y) * 0.06;
      }
      for (const p of nodes) {
        if (p.pin) continue;
        const f = awake ? pull(p) : { ax: 0, ay: 0, near: false };
        const onFloor = p.y >= H - p.r - 1 && f.ay > -0.2;
        const damp = f.near ? 0.93 : 0.992;
        let vx = (p.x - p.px) * damp * (onFloor ? 0.7 : 1);
        if (onFloor && Math.abs(vx) < 0.25) vx = 0;
        const vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y; p.x += vx + f.ax; p.y += vy + g * p.g + f.ay;
      }
      for (let it = 0; it < 8; it++) {
        for (const k of pl.cons) {
          const dx = k.b.x - k.a.x, dy = k.b.y - k.a.y, d = Math.hypot(dx, dy) || 1e-4;
          const diff = ((d - k.len) / d) * 0.5 * k.k;
          const wa = k.a.pin ? 0 : 1, wb = k.b.pin ? 0 : 1, w = wa + wb || 1;
          if (!k.a.pin) { k.a.x += dx * diff * 2 * wa / w; k.a.y += dy * diff * 2 * wa / w; }
          if (!k.b.pin) { k.b.x -= dx * diff * 2 * wb / w; k.b.y -= dy * diff * 2 * wb / w; }
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
  }

  // ---------------------------------------------------------------- drawing: simple, round, clean
  function ell(x, y, rx, ry, rot, fill, stroke = true) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 6.2832);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.stroke(); }
  }
  function eye(x, y, r, blink, sclera) {
    if (blink) { ctx.strokeStyle = sclera ? INK : WHITE; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); return; }
    if (sclera) ell(x, y, r, r, 0, WHITE, false);
    ell(x, y, sclera ? r * 0.6 : r, sclera ? r * 0.6 : r, 0, sclera ? INK : WHITE, false);
    ell(x - r * 0.25, y - r * 0.28, r * 0.24, r * 0.24, 0, sclera ? WHITE : INK, false);
  }
  function blush(x, y) { ell(x, y, 6.5, 3.8, 0, "rgba(255,46,136,0.45)", false); }

  function draw(pl) {
    const n = pl.n, pen = pl.kind === "penguin";
    const RX = Math.min(Math.max(40 * Math.hypot(n.r.x - n.l.x, n.r.y - n.l.y) / 52, 31), 50);
    const RY = Math.min(Math.max(36 * Math.hypot(n.t.x - n.b.x, n.t.y - n.b.y) / 52, 28), 46);
    const rot = Math.atan2(n.t.x - n.b.x, -(n.t.y - n.b.y));
    const blink = pl.blink > 0;
    ctx.save(); ctx.translate(n.c.x, n.c.y + 3); ctx.rotate(rot);
    if (pen) {
      ell(-RX * 0.98, RY * 0.12, 8, 15, 0.5, INK); ell(RX * 0.98, RY * 0.12, 8, 15, -0.5, INK);       // flippers
      ell(-RX * 0.42, RY * 0.94, 13, 6.5, 0, ORANGE); ell(RX * 0.42, RY * 0.94, 13, 6.5, 0, ORANGE);  // feet
      ell(0, 0, RX, RY, 0, INK);
      ell(0, RY * 0.22, RX * 0.64, RY * 0.64, 0, WHITE, false);                                       // belly
      eye(-RX * 0.3, -RY * 0.3, 6.5, blink, true); eye(RX * 0.3, -RY * 0.3, 6.5, blink, true);
      ell(0, -RY * 0.06, 6.5, 4.2, 0, ORANGE);                                                         // beak
      blush(-RX * 0.62, -RY * 0.02); blush(RX * 0.62, -RY * 0.02);
    }
    ctx.restore();
    if (pl.blink > 0) pl.blink--;
  }

  // ---------------------------------------------------------------- interaction (page-wide)
  let drag = null, down = null, swallowClick = false;
  function pick(p) {
    for (const pl of plushes) {
      const c = pl.n.c;
      if (((p.x - c.x) / 46) ** 2 + ((p.y - c.y) / 42) ** 2 > 1) continue;
      let best = c, bd = Math.hypot(p.x - c.x, p.y - c.y) - 12;
      for (const k of ["t", "b", "l", "r"]) { const d = Math.hypot(p.x - pl.n[k].x, p.y - pl.n[k].y); if (d < bd) { bd = d; best = pl.n[k]; } }
      return { pl, node: best };
    }
    return null;
  }
  function say(pl) {
    if (!bubble) return;
    const lines = LINES[pl.kind];
    bubble.textContent = lines[pl.line++ % lines.length];
    bubble.classList.add("show");
    bubble.style.left = Math.min(Math.max(pl.n.c.x - 40, 8), W - 200) + "px";
    bubble.style.top = Math.max(pl.n.c.y - 96, 8) + "px";
    clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove("show"), 2200);
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const hit = pick({ x: e.clientX, y: e.clientY });
    if (!hit) return;
    e.preventDefault();
    hit.node.pin = true;
    hit.pl.awakeUntil = performance.now() + 60000;
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
    pl.awakeUntil = performance.now() + 2500;
    if (down.moved < 6 && performance.now() - down.t < 350) {
      for (const k in pl.n) pl.n[k].py = pl.n[k].y + 10;   // boing
      pl.blink = 10; say(pl);
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
    step(performance.now());
    ctx.clearRect(0, 0, W, H);
    for (const pl of plushes) draw(pl);
  }
  window.__plush = () => plushes;      // handy for tests
  requestAnimationFrame(frame);
})();
