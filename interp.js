// interactive demos for the interpretability post.
//  lens    : logit lens on real GPT-2 small activations (explorer/data.json)
//  attn    : attention arcs for any head (explorer/data.json)
//  ablate  : knock out heads, real GPT-2 small (explorer/ablate.json)
//  tilt    : the two-axis theorem from the CVPR paper, with sliders
//  sae     : a sparse autoencoder that trains live in your browser (sae_core.js)
(() => {
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6", YEL = "#ffe03a", PAPER = "#fbf9f3";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "↵");
  const tk = (s) => (s === " " ? "␣" : esc(s));
  const root = document.body.dataset.root || "";
  const json = (p) => fetch(root + p).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const need = (box, msg) => { box.innerHTML = `<p class="small">${msg}</p>`; };
  const pickBtns = (names, cls = "filter") => names.map((n, i) => `<button class="${cls}" data-i="${i}">${esc(n)}</button>`).join("");
  const mark = (box, sel, i) => box.querySelectorAll(sel).forEach((b) => b.classList.toggle("on", +b.dataset.i === i));

  // ================================================================ logit lens
  function lensDemo(box, D) {
    let pi = Math.max(0, D.prompts.findIndex((p) => p.name === "Pattern")), q = D.prompts[pi].tokens.length - 1, L = 12;
    box.innerHTML = `<div class="il-top"><span class="il-k">prompt</span><span class="il-btns" id="lp">${pickBtns(D.prompts.map((p) => p.name))}</span></div>
      <p class="il-k">click the token whose next word you want to watch the model decide</p><div class="xp-tokens" id="lt"></div>
      <p class="il-k">click a layer: what the model would predict if it stopped reading there</p><div class="xp-lens" id="ll"></div><div id="lb"></div><p class="il-cap" id="lc"></p>`;
    const $ = (s) => box.querySelector(s);
    function draw() {
      const p = D.prompts[pi], lens = p.lens[q], fin = lens[12][0][0];
      mark(box, "#lp button", pi);
      $("#lt").innerHTML = p.tokens.map((t, i) => `<button class="tok${i === q ? " sel" : ""}" data-i="${i}">${tk(t)}</button>`).join("");
      $("#ll").innerHTML = lens.map((c, l) => { const [t, v] = c[0]; return `<div class="lcell${l === L ? " hit" : ""}" data-l="${l}" style="cursor:pointer;background:rgba(255,46,136,${(0.06 + v * 0.8).toFixed(2)});color:${v > 0.55 ? "#fff" : INK}"><small>${l === 0 ? "embed" : "layer " + (l - 1)}</small><b>${tk(t)}</b><em>${(v * 100).toFixed(0)}%</em></div>`; }).join("");
      $("#lb").innerHTML = lens[L].map(([t, v]) => `<div class="bar"><span class="bt">${tk(t)}</span><span class="bv"><i style="width:${(v * 100).toFixed(1)}%"></i></span><span class="bn">${(v * 100).toFixed(1)}%</span></div>`).join("");
      const first = lens.findIndex((c) => c[0][0] === fin);
      $("#lc").innerHTML = `Final answer: <b>${tk(fin)}</b>. It first becomes the top guess ${first === 0 ? "at the embedding" : "after layer " + (first - 1)}, and the model has twelve layers.`;
    }
    $("#lp").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { pi = +b.dataset.i; q = D.prompts[pi].tokens.length - 1; L = 12; draw(); } });
    $("#lt").addEventListener("click", (e) => { const b = e.target.closest(".tok"); if (b) { q = +b.dataset.i; draw(); } });
    $("#ll").addEventListener("click", (e) => { const c = e.target.closest(".lcell"); if (c) { L = +c.dataset.l; draw(); } });
    draw();
  }

  // ================================================================ attention arcs
  function attnDemo(box, D) {
    let pi = Math.max(0, D.prompts.findIndex((p) => p.name === "Induction")), L = 5, H = 5, q = D.prompts[pi].tokens.length - 1;
    const presets = [["induction head 5.5", "Induction", 5, 5], ["name-mover candidate 9.6", "Indirect object", 9, 6], ["a head that mostly watches the first token: 0.0", "Pattern", 0, 0]];
    const opts = (n) => Array.from({ length: n }, (_, i) => `<option value="${i}">${i}</option>`).join("");
    box.innerHTML = `<div class="il-top"><span class="il-k">try</span><span class="il-btns" id="ap">${pickBtns(presets.map((p) => p[0]))}</span></div>
      <div class="il-top"><label>prompt <select id="as">${D.prompts.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join("")}</select></label>
        <label>layer <select id="al">${opts(12)}</select></label><label>head <select id="ah">${opts(12)}</select></label></div>
      <canvas id="ac" height="210"></canvas><p class="il-cap" id="at"></p>`;
    const $ = (s) => box.querySelector(s), cv = $("#ac");
    function draw() {
      const p = D.prompts[pi], T = p.tokens.length, row = p.attn[L][H][q];
      $("#as").value = pi; $("#al").value = L; $("#ah").value = H;
      const w = Math.max(320, Math.min(box.clientWidth - 24, 760)), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.width = w + "px"; cv.width = w * dpr; cv.height = 210 * dpr;
      const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, 210);
      const gap = (w - 20) / T, X = (i) => 10 + gap * (i + 0.5), base = 176;
      for (let i = 0; i < q; i++) {
        const a = row[i]; if (a < 0.02) continue;
        const x1 = X(i), x2 = X(q), mid = (x1 + x2) / 2, h = Math.min(150, 28 + Math.abs(x2 - x1) * 0.42);
        g.strokeStyle = PINK; g.globalAlpha = 0.25 + 0.75 * a; g.lineWidth = 1.5 + 11 * a;
        g.beginPath(); g.moveTo(x1, base); g.quadraticCurveTo(mid, base - h * 1.6, x2, base); g.stroke();
      }
      g.globalAlpha = 1; g.font = "11px IBM Plex Mono, monospace"; g.textAlign = "center";
      for (let i = 0; i < T; i++) {
        g.fillStyle = i === q ? YEL : "#fff"; g.strokeStyle = INK; g.lineWidth = 2.5;
        const label = tk(p.tokens[i]).slice(0, 9), tw = Math.max(26, g.measureText(label).width + 12);
        g.fillRect(X(i) - tw / 2, base + 4, tw, 24); g.strokeRect(X(i) - tw / 2, base + 4, tw, 24);
        g.fillStyle = INK; g.fillText(label, X(i), base + 20);
      }
      const order = row.slice(0, q + 1).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3);
      $("#at").innerHTML = `Head <b>${L}.${H}</b>, reading from <b>"${tk(p.tokens[q])}"</b>: ` + order.map(([v, i]) => `<b>"${tk(p.tokens[i])}"</b> ${(v * 100).toFixed(0)}%`).join(", ") + ". Click a token box to change where it reads from.";
    }
    cv.addEventListener("click", (e) => {
      const p = D.prompts[pi], r = cv.getBoundingClientRect(), T = p.tokens.length, gap = (r.width - 20) / T, i = Math.floor((e.clientX - r.left - 10) / gap);
      if (i >= 0 && i < T && e.clientY - r.top > 176) { q = i; draw(); }
    });
    $("#ap").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const [, name, l, h] = presets[+b.dataset.i]; pi = D.prompts.findIndex((x) => x.name === name); L = l; H = h; q = D.prompts[pi].tokens.length - 1; draw(); });
    $("#as").addEventListener("change", (e) => { pi = +e.target.value; q = D.prompts[pi].tokens.length - 1; draw(); });
    $("#al").addEventListener("change", (e) => { L = +e.target.value; draw(); });
    $("#ah").addEventListener("change", (e) => { H = +e.target.value; draw(); });
    window.addEventListener("resize", draw); draw();
  }

  // ================================================================ head ablation
  function ablateDemo(box, A) {
    let ti = 0, sel = [9, 6], N = 0;
    box.innerHTML = `<div class="il-top"><span class="il-k">task</span><span class="il-btns" id="tt">${pickBtns(A.tasks.map((t) => t.name))}</span></div>
      <p class="il-cap" id="tp"></p>
      <div class="ab-row"><div><p class="il-k">1. knock out one head (click a square). Pink: the answer gets worse. Cyan: it gets better.</p><canvas id="tg"></canvas><p class="xp-hud" id="th"></p><div id="tr"></div></div>
      <div><p class="il-k">2. or knock out the top N heads at once</p><label class="il-slide">N = <b id="tn">0</b> <input type="range" id="ts" min="0" max="12" value="0"></label><canvas id="tl" height="170"></canvas><div id="tx"></div></div></div>`;
    const $ = (s) => box.querySelector(s), cg = $("#tg"), cl = $("#tl"), C = 22;
    const colr = (d, mx) => { const t = Math.max(-1, Math.min(1, d / mx)); return t >= 0 ? `rgb(${Math.round(251 - t * 0)},${Math.round(249 - t * 203)},${Math.round(243 - t * 107)})` : `rgb(${Math.round(251 + t * 226)},${Math.round(249 + t * 38)},${Math.round(243 + t * 13)})`; };
    function draw() {
      const t = A.tasks[ti], base = t.base.ld; mark(box, "#tt button", ti);
      $("#tp").innerHTML = `"${esc(t.text)}" &rarr; the model should say <b>${tk(t.correct)}</b>, not <b>${tk(t.distractor)}</b>. Right now the logit gap is <b>${base.toFixed(2)}</b> (higher means more confident in the right word), and it predicts <b>${tk(t.base.top[0][0])}</b> at ${(t.base.top[0][1] * 100).toFixed(0)}%.`;
      cg.width = cg.height = 12 * C + 20; cg.style.width = cg.style.height = 12 * C + 20 + "px";
      const g = cg.getContext("2d"), mx = Math.max(0.5, ...t.grid.flat().map((c) => Math.abs(base - c.ld)));
      g.clearRect(0, 0, cg.width, cg.height); g.font = "10px IBM Plex Mono, monospace"; g.fillStyle = "#777"; g.textBaseline = "middle";
      for (let l = 0; l < 12; l++) { g.fillText(l, 2, 10 + l * C + C / 2); for (let h = 0; h < 12; h++) {
        g.fillStyle = colr(base - t.grid[l][h].ld, mx); g.fillRect(20 + h * C, 10 + l * C, C - 2, C - 2);
        if (t.order.slice(0, N).some(([a, b]) => a === l && b === h)) { g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(20 + h * C + 1, 10 + l * C + 1, C - 4, C - 4); }
        if (sel && sel[0] === l && sel[1] === h) { g.strokeStyle = PINK; g.lineWidth = 3; g.strokeRect(20 + h * C - 1, 10 + l * C - 1, C, C); } } }
      g.fillStyle = "#777"; g.textAlign = "center"; g.fillText("head →", 20 + 6 * C, 4);
      if (sel) { const c = t.grid[sel[0]][sel[1]];
        $("#tr").innerHTML = `<p class="il-cap">Without head <b>${sel[0]}.${sel[1]}</b>: logit gap ${base.toFixed(2)} &rarr; <b>${c.ld.toFixed(2)}</b>, and it predicts <b>${tk(c.top[0][0])}</b> (${(c.top[0][1] * 100).toFixed(0)}%).` + (Math.abs(base - c.ld) < 0.15 ? " That head barely mattered." : "") + "</p>"; }
      // cumulative
      $("#tn").textContent = N; $("#ts").value = N;
      const w = Math.min(box.clientWidth / 2 - 30, 340) | 0 || 300; cl.style.width = w + "px"; cl.width = w; cl.height = 170;
      const k = cl.getContext("2d"), v = t.cum.map((c) => c.ld), lo = Math.min(0, ...v) - 0.5, hi = Math.max(...v) + 0.5, X = (n) => 30 + (n / 12) * (w - 44), Y = (a) => 150 - ((a - lo) / (hi - lo)) * 130;
      k.clearRect(0, 0, w, 170); k.strokeStyle = "rgba(17,16,21,.25)"; k.lineWidth = 1; k.beginPath(); k.moveTo(30, Y(0)); k.lineTo(w - 14, Y(0)); k.stroke();
      k.fillStyle = "#555"; k.font = "10px IBM Plex Mono, monospace"; k.textAlign = "right"; k.fillText("0", 26, Y(0) + 3); k.textAlign = "center"; for (let n = 0; n <= 12; n += 4) k.fillText(n, X(n), 166);
      k.strokeStyle = PINK; k.lineWidth = 3.5; k.beginPath(); v.forEach((a, n) => (n ? k.lineTo(X(n), Y(a)) : k.moveTo(X(n), Y(a)))); k.stroke();
      k.fillStyle = YEL; k.strokeStyle = INK; k.lineWidth = 3; k.beginPath(); k.arc(X(N), Y(v[N]), 7, 0, 6.2832); k.fill(); k.stroke();
      k.fillStyle = "#555"; k.textAlign = "left"; k.fillText("logit gap vs. heads removed", 32, 12);
      const c = t.cum[N], flipped = c.top[0][0] !== t.base.top[0][0];
      $("#tx").innerHTML = `<p class="il-cap">With the top <b>${N}</b> heads removed the gap is <b>${c.ld.toFixed(2)}</b> and the model predicts <b>${tk(c.top[0][0])}</b> (${(c.top[0][1] * 100).toFixed(0)}%)${flipped ? ". The answer changed." : "."}</p>`;
    }
    cg.addEventListener("click", (e) => { const r = cg.getBoundingClientRect(), h = Math.floor((e.clientX - r.left - 20) / C), l = Math.floor((e.clientY - r.top - 10) / C); if (h >= 0 && h < 12 && l >= 0 && l < 12) { sel = [l, h]; draw(); } });
    cg.addEventListener("pointermove", (e) => { const r = cg.getBoundingClientRect(), h = Math.floor((e.clientX - r.left - 20) / C), l = Math.floor((e.clientY - r.top - 10) / C), t = A.tasks[ti]; $("#th").textContent = h >= 0 && h < 12 && l >= 0 && l < 12 ? `head ${l}.${h}: effect ${(t.base.ld - t.grid[l][h].ld).toFixed(2)}` : ""; });
    $("#tt").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { ti = +b.dataset.i; N = 0; draw(); } });
    $("#ts").addEventListener("input", (e) => { N = +e.target.value; draw(); });
    window.addEventListener("resize", draw); draw();
  }

  // ================================================================ the two-axis theorem
  function tiltDemo(box) {
    box.innerHTML = `<div class="il-top"><label class="il-slide">how often axis 1 shows up: <b id="pv">0.75</b> <input type="range" id="p" min="0.5" max="0.95" step="0.01" value="0.75"></label>
      <label class="il-slide">weight on axis 2 in the loss: <b id="mv">1.0</b> <input type="range" id="m" min="1" max="8" step="0.1" value="1"></label></div>
      <canvas id="tc" height="230"></canvas><p class="il-cap" id="tt2"></p>`;
    const $ = (s) => box.querySelector(s), cv = $("#tc");
    function draw() {
      const p = +$("#p").value, m2 = +$("#m").value, r1 = (1 - p) * m2, r2 = p * 1, win = r1 <= r2 ? 1 : 2;
      $("#pv").textContent = p.toFixed(2); $("#mv").textContent = m2.toFixed(1);
      const w = Math.max(300, Math.min(box.clientWidth - 24, 520)), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.width = w + "px"; cv.width = w * dpr; cv.height = 230 * dpr;
      const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, 230);
      const mx = 8, Y = (v) => 190 - (v / mx) * 160;
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(30, 190); g.lineTo(w - 10, 190); g.stroke();
      [["keep axis 1", r1, 1], ["keep axis 2", r2, 2]].forEach(([lab, r, id], i) => {
        const x = 60 + i * ((w - 120) / 2 + 20), bw = (w - 120) / 2 - 20;
        g.fillStyle = win === id ? PINK : CYAN; g.fillRect(x, Y(r), bw, 190 - Y(r)); g.strokeRect(x, Y(r), bw, 190 - Y(r));
        g.fillStyle = INK; g.font = "bold 13px IBM Plex Mono, monospace"; g.textAlign = "center";
        g.fillText("risk " + r.toFixed(2), x + bw / 2, Y(r) - 7); g.fillText(lab, x + bw / 2, 210); if (win === id) g.fillText("kept", x + bw / 2, 226);
      });
      const thr = p / (1 - p);
      $("#tt2").innerHTML = `A dictionary with room for one axis keeps the one with the lower risk: <b>axis ${win}</b>. Axis 2 wins once its weight exceeds ${thr.toFixed(2)} (that is p/(1&minus;p)). With plain MSE, the weight is 1, so axis 1 is always kept. Reweighting alone flips the choice.`;
    }
    box.addEventListener("input", draw); window.addEventListener("resize", draw); draw();
  }

  // ================================================================ live toy SAE
  function saeDemo(box) {
    if (typeof saeCore !== "function") return need(box, "The SAE core failed to load.");
    const C = saeCore(), P = C.P, N = C.N;
    let D = 5, K = 2, tilt = 0, seed = 1, sae = null, token = 0, img = C.sample(C.rng(4242)), scale = [], compare = null;
    box.innerHTML = `
      <p class="il-k">the data: 8x8 images, each a mix of a few hidden features</p><div class="il-tiles" id="s-true"></div>
      <div class="il-top"><label>dictionary size <select id="s-d">${[4, 5, 6, 8, 10].map((v) => `<option ${v === 5 ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>active per image (k) <select id="s-k">${[1, 2, 3].map((v) => `<option ${v === 2 ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="il-slide">edge tilt <b id="s-tv">0.0</b> <input type="range" id="s-t" min="0" max="4" step="0.5" value="0"></label>
        <span class="vf-btns"><button class="filter" id="s-seed">new seed</button><button class="filter" id="s-cmp">compare objectives</button></span></div>
      <p class="il-k" id="s-lab">what the SAE learned</p><div class="il-tiles" id="s-dict"></div><p class="il-cap" id="s-stat"></p><div id="s-cmpout"></div>
      <p class="il-k">steer it: take an image and turn its features up or down</p>
      <div class="il-steer"><div id="s-sl"></div><div class="il-tiles" id="s-ed"></div></div><button class="filter" id="s-new">new image</button>`;
    const $ = (s) => box.querySelector(s);
    const tile = (arr, mode, size = 56, cap = "") => {
      const c = document.createElement("canvas"); c.width = c.height = N; c.style.cssText = `width:${size}px;height:${size}px;image-rendering:pixelated;border:3px solid ${INK};background:#fff`;
      const g = c.getContext("2d"), im = g.createImageData(N, N);
      let mx = 1e-9; if (mode === "div") for (let i = 0; i < P; i++) mx = Math.max(mx, Math.abs(arr[i]));
      for (let i = 0; i < P; i++) {
        let r, gg, b;
        if (mode === "div") { const t = arr[i] / mx; if (t >= 0) { r = 251 + t * (255 - 251); gg = 249 + t * (46 - 249); b = 243 + t * (136 - 243); } else { r = 251 + -t * (25 - 251); gg = 249 + -t * (211 - 249); b = 243 + -t * (230 - 243); } }
        else { const t = Math.max(0, Math.min(1, arr[i] / 1.2)); r = 251 + t * (17 - 251); gg = 249 + t * (16 - 249); b = 243 + t * (21 - 243); }
        im.data.set([r, gg, b, 255], i * 4);
      }
      g.putImageData(im, 0, 0);
      const w = document.createElement("div"); w.className = "tile"; w.append(c); if (cap) { const s = document.createElement("span"); s.innerHTML = cap; w.append(s); } return w;
    };
    const fill = (id, tiles) => { const el = $(id); el.replaceChildren(...tiles); };
    function drawTrue() { fill("#s-true", C.atoms.map((a, i) => tile(a, "div", 48, C.NAMES[i]))); }
    function drawDict(done) {
      const rec = C.recovery(sae), recAvg = rec.reduce((a, b) => a + b, 0) / rec.length;
      fill("#s-dict", Array.from({ length: sae.D }, (_, d) => tile(C.col(sae, d), "div", 56)));
      // per-feature recovery under the true tiles
      $("#s-true").querySelectorAll(".tile span").forEach((s, i) => { s.innerHTML = `${C.NAMES[i]}<br><b>${(rec[i] * 100).toFixed(0)}%</b>`; });
      $("#s-stat").innerHTML = `${done ? "Trained." : "Training..."} The percentage under each true feature is how closely the best dictionary element matches it (1.0 = a perfect match). Average <b>${(recAvg * 100).toFixed(0)}%</b>; reconstruction explains <b>${(C.evalMSE(sae, K) * 100).toFixed(0)}%</b> of the variance.`;
    }
    function drawSteer() {
      const e = C.encode(sae, img.x, K), act = e.idx.filter((d) => e.z[d] > 0);
      if (scale.length !== sae.D) scale = Array(sae.D).fill(1);
      $("#s-sl").innerHTML = act.length ? act.map((d) => `<label class="il-slide">feature ${d} <input type="range" min="0" max="2.5" step="0.1" value="${scale[d]}" data-d="${d}"> <b>${scale[d].toFixed(1)}&times;</b></label>`).join("") : "<p class='small'>no active features</p>";
      const z = new Float32Array(sae.D); act.forEach((d) => (z[d] = e.z[d] * scale[d]));
      const ed = C.decode(sae, z), xh = C.decode(sae, (() => { const o = new Float32Array(sae.D); act.forEach((d) => (o[d] = e.z[d])); return o; })());
      fill("#s-ed", [tile(img.x, "ink", 64, "image"), tile(xh, "ink", 64, "reconstruction"), tile(ed, "ink", 64, "edited"), ...act.map((d) => tile(C.col(sae, d), "div", 40, "f" + d))]);
    }
    async function trainNow() {
      const my = ++token, steps = 2500, per = 125; sae = C.init(D, seed); scale = [];
      for (let i = 0; i < steps; i += per) {
        if (my !== token) return;
        for (let j = 0; j < per; j++) C.step(sae, K, tilt, 0.02, 32);
        drawDict(false); drawSteer();
        await new Promise((r) => requestAnimationFrame(r));
      }
      if (my === token) { drawDict(true); drawSteer(); }
    }
    async function compareNow() {
      const my = ++token, seeds = [1, 2, 3, 4, 5, 6], out = [new Float32Array(8), new Float32Array(8)];
      $("#s-cmp").disabled = true;
      for (let si = 0; si < seeds.length; si++) for (let oi = 0; oi < 2; oi++) {
        $("#s-cmpout").innerHTML = `<p class="il-cap">comparing objectives... seed ${si + 1} of ${seeds.length}</p>`;
        const s = C.init(D, seeds[si]);
        for (let i = 0; i < 1800; i += 150) { for (let j = 0; j < 150; j++) C.step(s, K, oi ? 4 : 0, 0.02, 32); await new Promise((r) => requestAnimationFrame(r)); if (my !== token) { $("#s-cmp").disabled = false; return; } }
        C.recovery(s).forEach((v, i) => (out[oi][i] += v / seeds.length));
      }
      $("#s-cmp").disabled = false;
      const bar = (v, c) => `<span class="cmpbar"><i style="width:${Math.max(2, v * 100)}%;background:${c}"></i><b>${(v * 100).toFixed(0)}</b></span>`;
      $("#s-cmpout").innerHTML = `<p class="il-cap">Recovery of each true feature, averaged over ${seeds.length} seeds, dictionary size ${D}, k = ${K}. Pink: plain MSE. Cyan: edge-tilted loss.</p><div class="cmp">` +
        C.NAMES.map((n, i) => `<div><span>${n}</span>${bar(out[0][i], PINK)}${bar(out[1][i], CYAN)}</div>`).join("") + "</div>";
      sae = null; trainNow();
    }
    $("#s-d").addEventListener("change", (e) => { D = +e.target.value; trainNow(); });
    $("#s-k").addEventListener("change", (e) => { K = +e.target.value; trainNow(); });
    $("#s-t").addEventListener("input", (e) => { tilt = +e.target.value; $("#s-tv").textContent = tilt.toFixed(1); });
    $("#s-t").addEventListener("change", trainNow);
    $("#s-seed").addEventListener("click", () => { seed++; trainNow(); });
    $("#s-cmp").addEventListener("click", compareNow);
    $("#s-new").addEventListener("click", () => { img = C.sample(Math.random); scale = []; drawSteer(); });
    $("#s-sl").addEventListener("input", (e) => { const d = +e.target.dataset.d; if (!isNaN(d)) { scale[d] = +e.target.value; e.target.nextElementSibling.innerHTML = scale[d].toFixed(1) + "&times;"; const eE = C.encode(sae, img.x, K), z = new Float32Array(sae.D); eE.idx.forEach((i) => { if (eE.z[i] > 0) z[i] = eE.z[i] * scale[i]; }); const act = eE.idx.filter((i) => eE.z[i] > 0); const edTile = $("#s-ed").children[2]; edTile.replaceWith(tile(C.decode(sae, z), "ink", 64, "edited")); } });
    drawTrue(); trainNow();
  }

  // ================================================================ boot
  const boxes = {}; document.querySelectorAll(".demo[data-demo]").forEach((b) => (boxes[b.dataset.demo] = b));
  if (boxes.tilt) tiltDemo(boxes.tilt);
  if (boxes.sae) saeDemo(boxes.sae);
  if (boxes.lens || boxes.attn) json("explorer/data.json").then((D) => { if (boxes.lens) lensDemo(boxes.lens, D); if (boxes.attn) attnDemo(boxes.attn, D); }).catch(() => { for (const k of ["lens", "attn"]) if (boxes[k]) need(boxes[k], "This demo loads real GPT-2 activations over HTTP. Serve the site (python3 -m http.server) instead of opening the file."); });
  if (boxes.ablate) json("explorer/ablate.json").then((A) => ablateDemo(boxes.ablate, A)).catch(() => need(boxes.ablate, "This demo loads precomputed GPT-2 data over HTTP. Serve the site instead of opening the file."));
})();
