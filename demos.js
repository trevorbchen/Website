// small interactive pieces: grating demo, connect 4 boards, research-row previews, blog filter.
(() => {
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6", YEL = "#ffe03a", PAPER = "#fbf9f3";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- blog filter
  document.querySelectorAll(".filter").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".posts li").forEach((li) => li.classList.toggle("hide", !!b.dataset.f && li.dataset.kind !== b.dataset.f));
  }));

  // ---------------------------------------------------------------- connect 4
  document.querySelectorAll(".c4").forEach((el) => {
    const rows = el.dataset.board.split(" ");
    const grid = document.createElement("div"); grid.className = "grid7";
    rows.join("").split("").forEach((ch) => {
      const c = document.createElement("div"); c.className = "cell " + (ch === "." ? "" : ch); grid.appendChild(c);
    });
    el.appendChild(grid);
    if (el.dataset.caption) {
      const cap = document.createElement("span"); cap.className = "c4-cap"; cap.textContent = el.dataset.caption;
      el.insertAdjacentElement("afterend", cap);
    }
  });

  // ---------------------------------------------------------------- grating equation demo
  document.querySelectorAll('.demo[data-demo="grating"]').forEach((box) => {
    const cv = document.createElement("canvas"); cv.width = 640; cv.height = 340;
    const ctl = document.createElement("div"); ctl.className = "ctl";
    const mk = (label, min, max, val, step) => {
      const l = document.createElement("label"), i = document.createElement("input"), s = document.createElement("span");
      i.type = "range"; i.min = min; i.max = max; i.value = val; i.step = step;
      l.append(label + " ", i, s); ctl.appendChild(l); return { i, s };
    };
    const lam = mk("wavelength", 3.6, 6.6, 4.3, 0.05), per = mk("period d", 2, 12, 6, 0.1), inc = mk("incidence", 0, 70, 20, 1);
    box.append(cv, ctl);
    const ctx = cv.getContext("2d");
    function draw() {
      const L = +lam.i.value, d = +per.i.value, ti = (+inc.i.value) * Math.PI / 180;
      lam.s.textContent = L.toFixed(2) + " µm"; per.s.textContent = d.toFixed(1) + " µm"; inc.s.textContent = inc.i.value + "°";
      ctx.fillStyle = INK; ctx.fillRect(0, 0, 640, 340);
      const cx = 320, cy = 270, len = 215;
      ctx.strokeStyle = "#555"; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 260); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#cfcfd6"; ctx.fillRect(60, cy, 520, 6);
      for (let x = 70; x < 580; x += 10) { ctx.fillStyle = "#8b8b95"; ctx.fillRect(x, cy + 6, 4, 6); }
      ctx.strokeStyle = YEL; ctx.lineWidth = 3;   // incident
      ctx.beginPath(); ctx.moveTo(cx - len * Math.sin(ti), cy - len * Math.cos(ti)); ctx.lineTo(cx, cy); ctx.stroke();
      let count = 0; const lit = [];
      for (let m = -4; m <= 4; m++) {
        const s = Math.sin(ti) + m * L / d;
        if (Math.abs(s) >= 1) continue;
        count++;
        const a = Math.asin(s);
        const x2 = cx + len * Math.sin(a), y2 = cy - len * Math.cos(a);
        ctx.strokeStyle = m === 0 ? CYAN : PINK; ctx.lineWidth = m === 0 ? 3 : 2.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "12px IBM Plex Mono, monospace"; ctx.textAlign = "center";
        ctx.fillText("m=" + m, x2, y2 - 6);
        lit.push(m);
      }
      ctx.textAlign = "left"; ctx.fillStyle = "#cfcfd6"; ctx.font = "13px IBM Plex Mono, monospace";
      ctx.fillText(count + " propagating orders. Littrow angle for this λ/d: " + (Math.abs(L / (2 * d)) < 1 ? (Math.asin(L / (2 * d)) * 180 / Math.PI).toFixed(1) + "°" : "none"), 14, 22);
      ctx.fillText("sinθ_m = sinθ_i + mλ/d  (m=0 is the mirror reflection)", 14, 42);
    }
    box.addEventListener("input", draw); draw();
  });

  // ---------------------------------------------------------------- row previews
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PV = {
    noise(c, t) {   // a shape emerging from noise as the "timestep" falls
      const g = c.getContext("2d"), cols = 28, rows = 15, w = c.width / cols, h = c.height / rows;
      const k = (t % 3) / 2.4, sig = Math.max(0, 1 - k);
      g.fillStyle = INK; g.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = (i / cols - 0.5) * 2, y = (j / rows - 0.5) * 2;
        const v = Math.max(0, 1 - Math.hypot(x * 0.9, y * 1.1) * 1.6) + Math.max(0, 1 - Math.hypot(x + 0.55, y - 0.1) * 5) * 0.8;
        const val = Math.min(1, Math.max(0, v * (1 - sig * 0.8) + (Math.random() - 0.5) * sig * 1.4));
        g.fillStyle = `rgba(${25 + val * 230},${46 + val * 170},${200 - val * 80},${0.25 + val * 0.75})`;
        g.fillRect(i * w + 1, j * h + 1, w - 2, h - 2);
      }
    },
    heat(c, t) {    // sparse "feature" activations over a token x layer grid
      const g = c.getContext("2d"), cols = 14, rows = 7, w = c.width / cols, h = c.height / rows;
      g.fillStyle = INK; g.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const base = Math.abs(Math.sin(i * 1.7 + j * 2.3 + Math.floor(t * 2) * 0.9));
        const v = base > 0.82 ? base : 0.05 + Math.random() * 0.05;
        g.fillStyle = v > 0.5 ? `rgb(${255},${Math.round(46 + (1 - v) * 400)},${Math.round(136 - v * 90)})` : "rgb(40,36,70)";
        g.fillRect(i * w + 2, j * h + 2, w - 4, h - 4);
      }
    },
    graph(c, t) {   // state graph with a counterexample path
      const g = c.getContext("2d"); g.fillStyle = INK; g.fillRect(0, 0, c.width, c.height);
      const N = [[30, 55], [80, 25], [80, 85], [130, 55], [170, 25], [170, 85], [110, 55]];
      const E = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 6], [6, 3]];
      g.strokeStyle = "#555"; g.lineWidth = 2;
      for (const [a, b] of E) { g.beginPath(); g.moveTo(...N[a]); g.lineTo(...N[b]); g.stroke(); }
      const path = [0, 1, 3, 5], k = Math.floor(t * 1.5) % (path.length + 2);
      g.strokeStyle = PINK; g.lineWidth = 4;
      for (let i = 0; i < Math.min(k, path.length - 1); i++) { g.beginPath(); g.moveTo(...N[path[i]]); g.lineTo(...N[path[i + 1]]); g.stroke(); }
      N.forEach(([x, y], i) => {
        g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fillStyle = path.slice(0, k + 1).includes(i) ? PINK : "#2a2640"; g.fill();
        g.strokeStyle = PAPER; g.lineWidth = 2; g.stroke();
      });
      if (k >= path.length) { g.fillStyle = YEL; g.font = "bold 12px IBM Plex Mono, monospace"; g.fillText("counterexample", 66, 104); }
    },
    loop(c, t) {    // closed loop: LLM -> generator -> wet lab
      const g = c.getContext("2d"); g.fillStyle = INK; g.fillRect(0, 0, c.width, c.height);
      const B = [["LLM", 30, 20, CYAN], ["generator", 118, 20, YEL], ["wet lab", 74, 72, PINK]];
      const k = Math.floor(t * 1.4) % 3;
      g.strokeStyle = "#777"; g.lineWidth = 2; g.fillStyle = "#777";
      g.beginPath(); g.moveTo(80, 30); g.lineTo(116, 30); g.moveTo(150, 42); g.lineTo(120, 74); g.moveTo(74, 82); g.lineTo(44, 44); g.stroke();
      B.forEach(([n, x, y, col], i) => {
        g.fillStyle = i === k ? col : "#2a2640"; g.fillRect(x, y, 66, 28); g.strokeStyle = PAPER; g.lineWidth = 2; g.strokeRect(x, y, 66, 28);
        g.fillStyle = i === k ? INK : PAPER; g.font = "bold 11px IBM Plex Mono, monospace"; g.textAlign = "center"; g.fillText(n, x + 33, y + 18);
      });
      g.textAlign = "left";
    },
    grating(c, t) {
      const g = c.getContext("2d"); g.fillStyle = INK; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#cfcfd6"; g.fillRect(20, 90, 160, 5);
      g.strokeStyle = YEL; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 8); g.lineTo(100, 90); g.stroke();
      const L = 0.5 + 0.2 * Math.sin(t * 1.5);
      for (let m = -2; m <= 2; m++) {
        const s = Math.sin(0.46) + m * L; if (Math.abs(s) >= 1) continue;
        const a = Math.asin(s); g.strokeStyle = m === 0 ? CYAN : PINK; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(100, 90); g.lineTo(100 + 90 * Math.sin(a), 90 - 90 * Math.cos(a)); g.stroke();
      }
    },
    docking(c, t) {
      const g = c.getContext("2d"); g.fillStyle = INK; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#2a2640"; g.beginPath(); g.arc(135, 58, 46, 0.55, 5.7, false); g.lineTo(150, 58); g.closePath(); g.fill();
      g.strokeStyle = PAPER; g.lineWidth = 2; g.stroke();
      const k = (Math.sin(t * 1.4) + 1) / 2, x = 40 + k * 70, y = 58 + Math.sin(t * 5) * 3;
      g.fillStyle = PINK; for (const [dx, dy] of [[0, 0], [11, -7], [11, 7], [22, 0]]) { g.beginPath(); g.arc(x + dx, y + dy, 6, 0, 6.2832); g.fill(); }
      g.strokeStyle = PAPER; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 11, y - 7); g.lineTo(x + 22, y); g.lineTo(x + 11, y + 7); g.closePath(); g.stroke();
    },
  };

  document.querySelectorAll(".row").forEach((row) => {
    const cv = row.querySelector(".pv"); if (!cv) return;
    const fn = PV[cv.dataset.pv]; if (!fn) return;
    fn(cv, 1.2);
    let timer = null, t0 = 0;
    const start = () => { if (timer || reduce) return; t0 = performance.now(); timer = setInterval(() => fn(cv, (performance.now() - t0) / 1000), 1000 / 12); };
    const stop = () => { clearInterval(timer); timer = null; };
    row.addEventListener("pointerenter", start); row.addEventListener("pointerleave", stop);
    row.addEventListener("focusin", start); row.addEventListener("focusout", stop);
  });
})();
