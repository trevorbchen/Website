// two plush toys (a penguin and a panda) as verlet ragdolls. drag, throw, and poke them.
(() => {
  const canvas = document.getElementById("plush");
  const stage = document.getElementById("plush-stage");
  const bubble = document.getElementById("bubble");
  if (!canvas || !stage) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6";
  let W = 0, H = 0, dpr = 1;

  const LINES = {
    penguin: ["squawk.", "I am a penguin. I have no opinions about diffusion models.", "poked. noted.", "waddle waddle.", "Trevor is learning to crochet things like me."],
    panda: ["bamboo.exe has stopped responding.", "ow.", "I am load-bearing.", "yes, I am a panda. no, I will not elaborate.", "do not feed the sparse autoencoders."],
  };


  class P {
    constructor(x, y, r) { this.x = x; this.y = y; this.px = x; this.py = y; this.r = r; this.pin = false; }
  }

  function makePlush(kind, cx) {
    const y0 = H - 24;
    const n = {
      head: new P(cx, y0 - 118, 24), neck: new P(cx, y0 - 92, 6), hip: new P(cx, y0 - 46, 14),
      handL: new P(cx - 34, y0 - 80, 8), handR: new P(cx + 34, y0 - 80, 8),
      footL: new P(cx - 16, y0 - 8, 9), footR: new P(cx + 16, y0 - 8, 9),
    };
    const c = (a, b, len, k = 1) => ({ a: n[a], b: n[b], len, k });
    return {
      kind, n, line: 0, blink: 0,
      cons: [c("head", "neck", 28), c("neck", "hip", 46), c("neck", "handL", 36), c("neck", "handR", 36),
        c("hip", "footL", 40), c("hip", "footR", 40), c("head", "hip", 72, 0.8),
        c("handL", "handR", 74, 0.08), c("footL", "footR", 34, 0.3), c("handL", "hip", 58, 0.12), c("handR", "hip", 58, 0.12)],
    };
  }

  let plushes = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!plushes.length) plushes = [makePlush("penguin", W * 0.32), makePlush("panda", W * 0.68)];
    for (const p of plushes) for (const k in p.n) { p.n[k].x = Math.min(Math.max(p.n[k].x, 20), W - 20); }
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------------------------------------------------------------- physics
  function step() {
    const g = 0.55;
    for (const pl of plushes) {
      const nodes = Object.values(pl.n);
      for (const p of nodes) {
        if (p.pin) continue;
        const vx = (p.x - p.px) * 0.992, vy = (p.y - p.py) * 0.992;
        p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g;
      }
      // plush "stuffing": gentle self-righting when standing
      const grounded = pl.n.footL.y > H - 36 || pl.n.footR.y > H - 36;
      if (grounded && !pl.n.head.pin) {
        pl.n.head.x += (pl.n.hip.x - pl.n.head.x) * 0.03;
        pl.n.head.y += ((pl.n.hip.y - 76) - pl.n.head.y) * 0.04;
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
    // keep the two plushes from overlapping at the hips and heads
    const [a, b] = plushes;
    for (const k of ["hip", "head"]) {
      const dx = b.n[k].x - a.n[k].x, dy = b.n[k].y - a.n[k].y, d = Math.hypot(dx, dy) || 1, min = k === "hip" ? 62 : 52;
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

  function draw(pl, t) {
    const n = pl.n, pen = pl.kind === "penguin";
    const limbCol = pen ? INK : INK;
    const skin = pen ? INK : "#fbf9f3";
    // legs behind the body
    if (pen) { for (const f of [n.footL, n.footR]) inkEllipse(f.x, f.y, 13, 6, 0, "#ff9f1c"); }
    else { limb(n.hip, n.footL, 15, INK); limb(n.hip, n.footR, 15, INK); }
    // body
    const mx = (n.neck.x + n.hip.x) / 2, my = (n.neck.y + n.hip.y) / 2 + 4;
    const bAng = Math.atan2(-(n.hip.x - n.neck.x), n.hip.y - n.neck.y);
    inkEllipse(mx, my, 31, 46, bAng, pen ? INK : "#fbf9f3");
    ctx.save(); ctx.translate(mx, my + 5); ctx.rotate(bAng);
    if (pen) { ctx.beginPath(); ctx.ellipse(0, 4, 19, 33, 0, 0, 6.2832); ctx.fillStyle = "#fbf9f3"; ctx.fill(); }
    ctx.restore();
    // arms / flippers
    limb(n.neck, n.handL, 14, limbCol); limb(n.neck, n.handR, 14, limbCol);
    // head
    const hAng = Math.atan2(n.head.x - n.neck.x, -(n.head.y - n.neck.y));
    ctx.save(); ctx.translate(n.head.x, n.head.y); ctx.rotate(hAng);
    if (!pen) {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 19, -19, 9, 0, 6.2832); ctx.fillStyle = INK; ctx.fill(); }
    }
    inkEllipse(0, 0, 25, 23, 0, skin);
    const blink = Math.sin(t / 700 + pl.n.head.x) > 0.985 || pl.blink > 0;
    if (pen) {
      ctx.beginPath(); ctx.ellipse(0, 3, 17, 15, 0, 0, 6.2832); ctx.fillStyle = "#fbf9f3"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(5, 4); ctx.lineTo(0, 12); ctx.closePath();
      ctx.fillStyle = "#ff9f1c"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      eyes(blink, -9, -4, INK);
    } else {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 10, -3, 6.5, 8.5, sx * 0.4, 0, 6.2832); ctx.fillStyle = INK; ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, 7, 4.5, 3.2, 0, 0, 6.2832); ctx.fillStyle = INK; ctx.fill();
      eyes(blink, -10, -4, "#fbf9f3", 3.2);
    }
    ctx.restore();
    if (pl.blink > 0) pl.blink--;
  }
  function eyes(blink, x, y, col, r = 3.4) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    for (const sx of [x, -x]) {
      if (blink) { ctx.beginPath(); ctx.moveTo(sx - 4, y); ctx.lineTo(sx + 4, y); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(sx, y, r, 0, 6.2832); ctx.fill(); }
    }
  }

  // ---------------------------------------------------------------- interaction
  let drag = null, down = null;
  function local(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pick(p) {
    let best = null, bd = 1e9;
    for (const pl of plushes) {
      for (const k in pl.n) {
        const d = Math.hypot(pl.n[k].x - p.x, pl.n[k].y - p.y) - pl.n[k].r;
        if (d < 22 && d < bd) { bd = d; best = { pl, node: pl.n[k] }; }
      }
      const a = pl.n.neck, b = pl.n.hip;
      const ab = { x: b.x - a.x, y: b.y - a.y }, t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
      const d = Math.hypot(a.x + ab.x * t - p.x, a.y + ab.y * t - p.y);
      if (d < 32 && d < bd + 10 && !best) best = { pl, node: pl.n.hip };
    }
    return best;
  }
  function say(pl) {
    const lines = LINES[pl.kind];
    bubble.textContent = lines[pl.line++ % lines.length];
    bubble.classList.add("show");
    const x = Math.min(Math.max(pl.n.head.x - 40, 8), W - 260), y = Math.max(pl.n.head.y - 78, 26);
    bubble.style.left = x + "px"; bubble.style.top = y + "px";
    clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove("show"), 3000);
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = local(e), hit = pick(p);
    if (!hit) return;
    canvas.setPointerCapture(e.pointerId);
    hit.node.pin = true;
    drag = { ...hit, off: { x: hit.node.x - p.x, y: hit.node.y - p.y }, target: { x: hit.node.x, y: hit.node.y } };
    down = { x: p.x, y: p.y, t: performance.now(), moved: 0 };
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = local(e);
    if (!drag) { canvas.style.cursor = pick(p) ? "grab" : "default"; return; }
    drag.target = { x: Math.min(Math.max(p.x + drag.off.x, 10), W - 10), y: Math.min(Math.max(p.y + drag.off.y, 10), H - 10) };
    down.moved = Math.max(down.moved, Math.hypot(p.x - down.x, p.y - down.y));
  });
  function release() {
    if (!drag) return;
    const { pl, node } = drag;
    node.pin = false;
    if (down.moved < 6 && performance.now() - down.t < 350) {
      for (const k in pl.n) pl.n[k].py = pl.n[k].y + 9;   // boing
      pl.blink = 8; say(pl);
    }
    drag = null; canvas.style.cursor = "grab";
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // konami code makes them jump
  window.addEventListener("keydown", (e) => {
    if (e.key === "p") for (const pl of plushes) for (const k in pl.n) pl.n[k].py = pl.n[k].y + 14;
  });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    if (now - last < 1000 / 60) return;
    last = now;
    if (drag) { drag.node.px = drag.node.x; drag.node.py = drag.node.y; drag.node.x = drag.target.x; drag.node.y = drag.target.y; }
    if (!reduce || drag) step();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(17,16,21,0.08)";
    ctx.beginPath(); ctx.ellipse(W / 2, H - 4, W * 0.4, 5, 0, 0, 6.2832); ctx.fill();
    for (const pl of plushes) draw(pl, now);
  }
  requestAnimationFrame(frame);
})();
