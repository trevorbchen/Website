// interpretability explorer: draws real GPT-2 small activations (precomputed with PyTorch).
(() => {
  const raw = document.getElementById("xp-data");
  if (!raw) return;
  const D = JSON.parse(raw.textContent);
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6", YEL = "#ffe03a", PAPER = "#fbf9f3";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "↵");
  const show = (s) => (s === " " ? "␣" : esc(s));
  let pi = 0, q = 0, L = 9, H = 6;

  const grid = $("xp-grid"), headC = $("xp-head"), normC = $("xp-norm");
  const cur = () => D.prompts[pi];

  // ---------- prompts
  $("xp-prompts").innerHTML = D.prompts.map((p, i) => `<button class="filter" data-i="${i}">${esc(p.name)}</button>`).join("");
  $("xp-prompts").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    pi = +b.dataset.i; q = cur().tokens.length - 1;
    const n = cur().name;
    if (n === "Indirect object") { L = 9; H = 6; } else if (n === "Induction") { L = 5; H = 5; }
    draw();
  });

  // ---------- helpers
  function fit(c, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.style.width = w + "px"; c.style.height = h + "px";
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
  }
  const heat = (v) => {
    const t = Math.min(1, Math.max(0, v));
    return `rgb(${Math.round(251 - t * 0)},${Math.round(249 - t * 203)},${Math.round(243 - t * 107)})`;
  };

  // ---------- 1. tokens
  function drawTokens() {
    const p = cur(), row = p.attn[L][H][q];
    $("xp-tokens").innerHTML = p.tokens.map((t, i) => {
      const w = i <= q ? row[i] : 0;
      const style = i <= q ? `background:rgba(255,46,136,${(0.08 + w * 0.92).toFixed(2)});color:${w > 0.55 ? "#fff" : INK}` : "opacity:.35";
      return `<button class="tok${i === q ? " sel" : ""}" data-i="${i}" style="${style}" title="${i <= q ? "attention " + w.toFixed(3) : "after the query (masked)"}">${show(t)}</button>`;
    }).join("");
    const order = row.slice(0, q + 1).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3);
    $("xp-attn").innerHTML = `Head <b>${L}.${H}</b> from <b>"${show(p.tokens[q])}"</b> attends most to: ` +
      order.map(([v, i]) => `<b>"${show(p.tokens[i])}"</b> (${v.toFixed(2)})`).join(", ") + ".";
  }
  $("xp-tokens").addEventListener("click", (e) => {
    const b = e.target.closest(".tok"); if (!b || b.style.opacity) return;
    q = +b.dataset.i; draw();
  });

  // ---------- 2. grid of all heads
  const CW = 46, CH = 26;
  let gridRects = [];
  function drawGrid() {
    const p = cur(), g = fit(grid, 12 * CW + 22, 12 * CH + 4);
    g.font = "10px IBM Plex Mono, monospace"; g.textBaseline = "middle";
    gridRects = [];
    for (let l = 0; l < 12; l++) {
      g.fillStyle = "#777"; g.fillText(String(l), 2, l * CH + CH / 2 + 2);
      for (let h = 0; h < 12; h++) {
        const x = 22 + h * CW, y = l * CH + 2, row = p.attn[l][h][q], n = q + 1, bw = (CW - 4) / n;
        g.fillStyle = PAPER; g.fillRect(x, y, CW - 4, CH - 4);
        for (let k = 0; k < n; k++) { g.fillStyle = heat(row[k]); g.fillRect(x + k * bw, y, Math.max(bw, 1), CH - 4); }
        g.strokeStyle = l === L && h === H ? INK : "rgba(17,16,21,0.2)"; g.lineWidth = l === L && h === H ? 3 : 1;
        g.strokeRect(x, y, CW - 4, CH - 4);
        gridRects.push([x, y, l, h]);
      }
    }
  }
  function cellAt(e) {
    const r = grid.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = Math.floor((x - 22) / CW), l = Math.floor((y - 2) / CH);
    return h >= 0 && h < 12 && l >= 0 && l < 12 ? [l, h] : null;
  }
  grid.addEventListener("click", (e) => { const c = cellAt(e); if (c) { [L, H] = c; draw(); } });
  grid.addEventListener("pointermove", (e) => {
    const c = cellAt(e);
    $("xp-hud").textContent = c ? `layer ${c[0]}, head ${c[1]}` : "";
  });

  // ---------- 3. one head, all queries
  function drawHead() {
    const p = cur(), T = p.tokens.length, size = 300, pad = 62, cell = (size - pad) / T;
    const g = fit(headC, size, size);
    g.font = "10px IBM Plex Mono, monospace";
    $("xp-head-label").textContent = `3. head ${L}.${H}: row = query token, column = token it reads from`;
    for (let i = 0; i < T; i++) for (let j = 0; j < T; j++) {
      g.fillStyle = j <= i ? heat(p.attn[L][H][i][j] * 1.0) : "#eee";
      g.fillRect(pad + j * cell, pad + i * cell, cell - 1, cell - 1);
    }
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(pad - 1, pad + q * cell - 1, T * cell + 1, cell + 1);
    g.fillStyle = INK; g.textBaseline = "middle"; g.textAlign = "right";
    for (let i = 0; i < T; i++) {
      const t = show(p.tokens[i]).slice(0, 7);
      g.fillStyle = i === q ? PINK : INK; g.fillText(t, pad - 4, pad + i * cell + cell / 2);
      g.save(); g.translate(pad + i * cell + cell / 2, pad - 4); g.rotate(-Math.PI / 3); g.textAlign = "left"; g.fillStyle = INK; g.fillText(t, 0, 0); g.restore();
    }
  }

  // ---------- 4. residual stream norms
  function drawNorms() {
    const p = cur(), W = 330, Ht = 200, m = { l: 36, r: 8, t: 10, b: 26 }, g = fit(normC, W, Ht);
    const all = p.norms.flat(), lo = Math.log10(Math.min(...all)), hi = Math.log10(Math.max(...all));
    const X = (l) => m.l + (l / 12) * (W - m.l - m.r), Y = (v) => m.t + (1 - (Math.log10(v) - lo) / (hi - lo || 1)) * (Ht - m.t - m.b);
    g.fillStyle = PAPER; g.fillRect(0, 0, W, Ht);
    g.strokeStyle = "rgba(17,16,21,.2)"; g.lineWidth = 1; g.font = "10px IBM Plex Mono, monospace"; g.fillStyle = "#555";
    for (let l = 0; l <= 12; l += 2) { g.beginPath(); g.moveTo(X(l), m.t); g.lineTo(X(l), Ht - m.b); g.stroke(); g.textAlign = "center"; g.fillText(l, X(l), Ht - 10); }
    g.textAlign = "right";
    for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) { g.fillText("1e" + e, m.l - 4, Y(10 ** e) + 3); }
    p.norms.forEach((n, t) => {
      g.strokeStyle = t === q ? PINK : "rgba(17,16,21,.18)"; g.lineWidth = t === q ? 3.5 : 1;
      g.beginPath(); n.forEach((v, l) => (l ? g.lineTo(X(l), Y(v)) : g.moveTo(X(l), Y(v)))); g.stroke();
    });
    g.textAlign = "center"; g.fillStyle = "#555"; g.fillText("layer (0 = embeddings)", W / 2, Ht - 0);
  }

  // ---------- 5. final prediction + 6. logit lens
  function drawLens() {
    const p = cur(), lens = p.lens[q];
    const fin = lens[12];
    $("xp-final").innerHTML = fin.map(([t, v]) =>
      `<div class="bar"><span class="bt">${show(t)}</span><span class="bv"><i style="width:${(v * 100).toFixed(1)}%"></i></span><span class="bn">${(v * 100).toFixed(1)}%</span></div>`).join("");
    const final1 = fin[0][0];
    $("xp-lens").innerHTML = lens.map((cands, l) => {
      const [t, v] = cands[0], hit = t === final1;
      return `<div class="lcell${hit ? " hit" : ""}" style="background:rgba(255,46,136,${(0.06 + v * 0.8).toFixed(2)});color:${v > 0.55 ? "#fff" : INK}" title="${cands.map(([a, b]) => show(a) + " " + b).join(" | ")}"><small>${l === 0 ? "emb" : "L" + (l - 1)}</small><b>${show(t)}</b><em>${(v * 100).toFixed(0)}%</em></div>`;
    }).join("");
  }

  function draw() {
    document.querySelectorAll("#xp-prompts .filter").forEach((b) => b.classList.toggle("on", +b.dataset.i === pi));
    drawTokens(); drawGrid(); drawHead(); drawNorms(); drawLens();
  }
  q = cur().tokens.length - 1;
  draw();
  window.addEventListener("resize", () => draw());
})();
