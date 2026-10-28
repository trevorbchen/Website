// halftone dot field that bends around the cursor and the black "holes", plus hole tooltips.
// Displacement follows the thin-lens image shift: a dot at distance r from a mass of
// Einstein radius rE appears pushed outward by ~ rE^2 / r. Springs bring dots home.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- dots
  const canvas = document.getElementById("dots");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const S = 9;                      // lattice spacing
    const PINK = [255, 46, 136], CYAN = [25, 211, 230];
    let W = 0, H = 0, dpr = 1, base = null;
    const cells = new Map();          // key -> {ox, oy, g}
    const mouse = { x: -1e4, y: -1e4 };
    let dirty = true;

    function alphaAt(x, y) {
      const nx = x / W, ny = y / H;
      const tr = Math.max(0, 1 - Math.hypot(1 - nx, ny) / 1.4142 / 0.45);
      const bl = Math.max(0, 1 - Math.hypot(nx, 1 - ny) / 1.4142 / 0.40);
      return Math.max(tr, bl) * 0.32;
    }

    function pos(c, i, j) { return [i * S + (c ? S / 2 : 0), j * S + (c ? S / 2 : 0)]; }
    const col = (c, a) => `rgba(${(c ? CYAN : PINK).join(",")},${a})`;

    function buildBase() {
      base = document.createElement("canvas");
      base.width = W * dpr; base.height = H * dpr;
      const b = base.getContext("2d");
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let c = 0; c < 2; c++) {
        for (let j = 0; j * S < H + S; j++) {
          for (let i = 0; i * S < W + S; i++) {
            const [x, y] = pos(c, i, j);
            const a = alphaAt(x, y);
            if (a < 0.02) continue;
            b.fillStyle = col(c, a);
            b.beginPath(); b.arc(x, y, 1.25, 0, 6.2832); b.fill();
          }
        }
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildBase();
      dirty = true;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; dirty = true; });
    window.addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });
    resize();

    function masses() {
      const m = [{ x: mouse.x, y: mouse.y, rE: 30, R: 140 }];
      document.querySelectorAll(".hole").forEach((h) => {
        const r = h.getBoundingClientRect();
        if (!r.width) return;
        const s = Math.max(r.width, r.height);
        m.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, rE: s * 0.5, R: s * 1.9 + 50 });
      });
      return m;
    }

    let last = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (reduce || document.hidden || now - last < 1000 / 24) return;
      last = now;
      if (!dirty && cells.size === 0) return;

      const targets = new Map();
      for (const m of masses()) {
        if (m.x < -1000) continue;
        const i0 = Math.floor((m.x - m.R) / S), i1 = Math.ceil((m.x + m.R) / S);
        const j0 = Math.floor((m.y - m.R) / S), j1 = Math.ceil((m.y + m.R) / S);
        for (let c = 0; c < 2; c++) {
          for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
              if (i < 0 || j < 0) continue;
              const [x, y] = pos(c, i, j);
              const dx = x - m.x, dy = y - m.y, r = Math.hypot(dx, dy);
              if (r >= m.R || r < 0.01) continue;
              const fall = 1 - r / m.R;
              const push = Math.min((m.rE * m.rE) / Math.max(r, m.rE * 0.6), 34) * fall;
              const key = (c << 28) | (i << 14) | j;
              const t = targets.get(key) || { tx: 0, ty: 0, g: 0 };
              t.tx += (dx / r) * push; t.ty += (dy / r) * push; t.g = Math.max(t.g, Math.pow(fall, 1.4));
              targets.set(key, t);
            }
          }
        }
      }
      for (const [key, t] of targets) {
        if (!cells.has(key)) cells.set(key, { ox: 0, oy: 0, g: 0 });
        cells.get(key).t = t;
      }
      for (const [key, cell] of cells) {
        const t = targets.get(key);
        const k = t ? 0.42 : 0.11;
        cell.ox += ((t ? t.tx : 0) - cell.ox) * k;
        cell.oy += ((t ? t.ty : 0) - cell.oy) * k;
        cell.g += ((t ? t.g : 0) - cell.g) * k;
        if (!t && Math.abs(cell.ox) + Math.abs(cell.oy) < 0.05 && cell.g < 0.02) cells.delete(key);
      }

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0, W, H);
      for (const [key, cell] of cells) {
        const c = key >> 28 & 1, i = key >> 14 & 0x3fff, j = key & 0x3fff;
        const [x, y] = pos(c, i, j);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath(); ctx.arc(x, y, 1.9, 0, 6.2832); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        const a = Math.max(alphaAt(x, y), cell.g * 0.5);
        if (a < 0.02) continue;
        ctx.fillStyle = col(c, a);
        ctx.beginPath(); ctx.arc(x + cell.ox, y + cell.oy, 1.25 + cell.g * 1.1, 0, 6.2832); ctx.fill();
      }
      dirty = mouse.x > -1000;
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- hole tooltips + wobble
  const tip = document.getElementById("tip");
  document.querySelectorAll(".hole").forEach((h) => {
    function show() {
      if (!tip) return;
      tip.innerHTML = `<b>${h.dataset.label}</b>${h.dataset.tip || ""}`;
      const r = h.getBoundingClientRect();
      const left = r.left + r.width / 2 > innerWidth / 2 ? r.left - 250 : r.right + 10;
      tip.style.left = Math.max(8, Math.min(innerWidth - 250, left)) + "px";
      tip.style.top = Math.max(8, r.top + r.height / 2 - 24) + "px";
      tip.classList.add("show");
    }
    const hide = () => tip && tip.classList.remove("show");
    h.addEventListener("pointerenter", show);
    h.addEventListener("pointerleave", hide);
    h.addEventListener("focus", show);
    h.addEventListener("blur", hide);
    h.addEventListener("click", () => { h.classList.remove("wobble"); void h.offsetWidth; h.classList.add("wobble"); });
  });
})();
