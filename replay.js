// Replays recorded inference-engine runs. Nothing here runs a model: the numbers come from JSON files
// written by bench.py on real hardware (see data/engine_runs.json).
//   paging   : a block allocator you can drive by hand (contiguous reservation vs paged KV cache)
//   timeline : every request in a recorded run, engine vs Hugging Face static batching, with a playhead
//   cache    : blocks in use, requests running, and preemptions over time, from the engine's own trace
//   results  : the summary table for the selected run
(() => {
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6", YEL = "#ffe03a", PAPER = "#fbf9f3", GREY = "#c9c6d4";
  const root = document.body.dataset.root || "";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const boxes = {};
  document.querySelectorAll(".demo[data-demo]").forEach((b) => (boxes[b.dataset.demo] = b));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fit = (cv, w, h) => { const d = Math.min(window.devicePixelRatio || 1, 2); cv.style.width = w + "px"; cv.style.height = h + "px"; cv.width = w * d; cv.height = h * d; const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h); return g; };
  const btns = (items, cls = "filter") => items.map((t, i) => `<button class="${cls}" data-i="${i}">${esc(t)}</button>`).join("");
  const mark = (box, sel, i) => box.querySelectorAll(sel).forEach((b) => b.classList.toggle("on", +b.dataset.i === i));

  // ================================================================ paging simulator
  function paging(box) {
    const N = 64, BS = 16, MAXLEN = 256, COLORS = [PINK, CYAN, YEL, "#9b5cff", "#7dff6b", "#ff9f1c", "#6ec1ff", "#ff7ab8"];
    let mode = "paged", reqs, owner, tick, nextId, timer = null, done, served;
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    function reset() { reqs = []; owner = Array(N).fill(null); tick = 0; nextId = 0; done = 0; served = 0; draw(); }
    box.innerHTML = `<div class="il-top"><span class="il-k">cache policy</span><span class="il-btns" id="pm">${btns(["paged blocks", "reserve the max length up front"])}</span>
      <span class="vf-btns"><button class="filter" id="pp">play</button><button class="filter" id="pa">add a request</button><button class="filter" id="pr">reset</button></span></div>
      <canvas id="pc"></canvas><p class="il-cap" id="ps"></p>`;
    const $ = (s) => box.querySelector(s), cv = $("#pc");
    function free() { const f = []; owner.forEach((o, i) => { if (o === null) f.push(i); }); return f; }
    function admit() {
      for (const r of reqs) {
        if (r.state !== "queued") continue;
        const need = mode === "paged" ? Math.ceil(r.P / BS) : MAXLEN / BS, f = free();
        if (f.length < need) break;                                   // FIFO: a blocked head blocks the queue
        r.blocks = f.slice(0, need); r.blocks.forEach((b) => (owner[b] = r.id)); r.len = r.P; r.state = "running";
      }
    }
    function step() {
      tick++;
      if (tick % 5 === 0 && reqs.filter((r) => r.state === "queued").length < 6) addReq();
      for (const r of reqs) {
        if (r.state !== "running") continue;
        if (mode === "paged" && r.len % BS === 0 && Math.ceil((r.len + 1) / BS) > r.blocks.length) {
          const f = free();
          if (!f.length) { r.stalled = true; continue; }
          r.blocks.push(f[0]); owner[f[0]] = r.id;
        }
        r.stalled = false; r.len++; served++;
        if (r.len >= r.F) { r.blocks.forEach((b) => (owner[b] = null)); r.blocks = []; r.state = "done"; done++; }
      }
      admit(); draw();
    }
    function addReq() { const P = rnd(10, 60), F = Math.min(MAXLEN, P + rnd(10, 150)); reqs.push({ id: nextId++, P, F, len: 0, blocks: [], state: "queued" }); admit(); }
    function draw() {
      const w = Math.max(320, Math.min(box.clientWidth - 24, 760)), cols = 16, cell = Math.floor((w - 20) / cols) - 4, h = Math.ceil(N / cols) * (cell + 4) + 14;
      const g = fit(cv, w, h);
      const running = reqs.filter((r) => r.state === "running");
      let used = 0, reserved = 0;
      for (let i = 0; i < N; i++) {
        const x = 10 + (i % cols) * (cell + 4), y = 6 + Math.floor(i / cols) * (cell + 4), o = owner[i];
        g.lineWidth = 2.5; g.strokeStyle = INK;
        if (o === null) { g.fillStyle = "#fff"; g.fillRect(x, y, cell, cell); g.strokeRect(x, y, cell, cell); continue; }
        const r = reqs.find((q) => q.id === o), bi = r.blocks.indexOf(i), filled = Math.max(0, Math.min(BS, r.len - bi * BS)), col = COLORS[o % COLORS.length];
        reserved++; used += filled;
        g.fillStyle = "#fff"; g.fillRect(x, y, cell, cell);
        g.fillStyle = col; g.fillRect(x, y + cell * (1 - filled / BS), cell, cell * (filled / BS));
        if (filled < BS) { g.fillStyle = "rgba(17,16,21,.12)"; for (let k = 0; k < cell; k += 6) g.fillRect(x, y + k, cell, 2); g.fillStyle = col; g.fillRect(x, y + cell * (1 - filled / BS), cell, cell * (filled / BS)); }
        g.strokeRect(x, y, cell, cell);
      }
      const waste = reserved ? 1 - used / (reserved * BS) : 0;
      $("#ps").innerHTML = `<b>${running.length}</b> running, <b>${reqs.filter((r) => r.state === "queued").length}</b> queued, <b>${done}</b> finished. Cache: <b>${reserved}</b> of ${N} blocks reserved, and <b>${(waste * 100).toFixed(0)}%</b> of the reserved space is empty.` +
        (mode === "paged" ? " Paged allocation only ever wastes the tail of each sequence's last block." : " Reserving the longest possible length per request strands most of the cache, so fewer requests fit.");
    }
    function play(on) { clearInterval(timer); timer = null; $("#pp").textContent = on ? "pause" : "play"; if (on) timer = setInterval(step, 220); }
    $("#pm").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; mode = b.dataset.i === "0" ? "paged" : "contiguous"; mark(box, "#pm button", +b.dataset.i); reset(); });
    $("#pp").addEventListener("click", () => play(!timer));
    $("#pa").addEventListener("click", () => { addReq(); draw(); });
    $("#pr").addEventListener("click", () => { play(false); reset(); });
    window.addEventListener("resize", draw);
    mark(box, "#pm button", 0); reset(); for (let i = 0; i < 3; i++) addReq(); draw();
    if (!reduce) play(true);
  }

  // ================================================================ recorded runs
  function recorded() {
    if (!boxes.timeline && !boxes.cache && !boxes.results) return;
    fetch(root + "data/engine_runs.json").then((r) => r.json()).then(async (manifest) => {
      const runs = await Promise.all(manifest.map((m) => fetch(root + "data/" + m.file).then((r) => r.json()).then((d) => ({ ...m, d }))));
      let ri = 0, ex = "offline", sys = "engine";
      const D = () => runs[ri].d;
      const E = () => D().experiments[ex];
      const sysNames = () => Object.keys(E().systems);
      const label = (s) => (s === "engine" ? "our engine (continuous batching, paged cache)" : "Hugging Face, static batches of " + s.split("_")[2]);
      function header(box) {
        const env = D().env;
        box.querySelector(".rr-env").innerHTML = `Recorded on <b>${esc(env.gpu)}</b> &middot; ${esc(env.model)} &middot; ${esc(env.dtype)} &middot; ${esc(env.date)}` + (env.fused_kernels ? " &middot; fused Triton kernels" : " &middot; reference PyTorch attention");
      }
      // ---------- timeline
      if (boxes.timeline) {
        const box = boxes.timeline; let tcur = 0, anim = null, tmax = 1;
        box.innerHTML = `<p class="il-cap rr-env"></p><div class="il-top">${runs.length > 1 ? `<span class="il-k">run</span><span class="il-btns" id="tr">${btns(runs.map((r) => r.label))}</span>` : ""}
          <span class="il-k">workload</span><span class="il-btns" id="te">${btns(["all requests waiting at t=0", "requests arrive over time"])}</span></div>
          <div class="il-top"><span class="il-k">system</span><span class="il-btns" id="ts"></span><span class="vf-btns"><button class="filter" id="tp">play</button></span></div>
          <canvas id="tc"></canvas><p class="il-cap" id="tt"></p>`;
        const $ = (s) => box.querySelector(s), cv = $("#tc");
        function draw() {
          header(box);
          const e = E(), names = sysNames(), S = e.systems[sys], reqs = e.requests, n = reqs.length;
          tmax = Math.max(...names.map((k) => e.systems[k].summary.wall_s)) * 1.02;
          $("#ts").innerHTML = names.map((k, i) => `<button class="filter${k === sys ? " on" : ""}" data-k="${k}">${esc(k === "engine" ? "our engine" : "HF static " + k.split("_")[2])}</button>`).join("");
          const w = Math.max(340, Math.min(box.clientWidth - 24, 820)), rowH = Math.max(3, Math.min(7, Math.floor(300 / n))), h = n * rowH + 44, g = fit(cv, w, h), X = (t) => 44 + (t / tmax) * (w - 58);
          g.font = "10px IBM Plex Mono, monospace"; g.fillStyle = "#555"; g.textAlign = "center";
          for (let t = 0; t <= tmax; t += tmax > 40 ? 10 : tmax > 15 ? 5 : 2) { g.fillText(t + "s", X(t), h - 6); g.strokeStyle = "rgba(17,16,21,.12)"; g.beginPath(); g.moveTo(X(t), 4); g.lineTo(X(t), h - 18); g.stroke(); }
          const per = S.per_request ? Object.fromEntries(S.per_request.map((p) => [p.id, p])) : null, bt = {};
          (S.batches || []).forEach((b, bi) => b.ids.forEach((id) => (bt[id] = { b, bi })));
          reqs.forEach((r, i) => {
            const y = 4 + i * rowH, hh = Math.max(2, rowH - 1);
            if (per) {
              const p = per[r.id]; g.fillStyle = "#ffe98a"; g.fillRect(X(r.arrival), y, Math.max(1, X(p.first) - X(r.arrival)), hh);
              g.fillStyle = p.preemptions ? "#9b5cff" : PINK; g.fillRect(X(p.first), y, Math.max(1, X(p.done) - X(p.first)), hh);
            } else {
              const { b } = bt[r.id]; g.fillStyle = "#ffe98a"; g.fillRect(X(r.arrival), y, Math.max(1, X(b.start) - X(r.arrival)), hh);
              const span = X(b.end) - X(b.start), useful = Math.max(0.02, r.out_len / b.decode_steps);
              g.fillStyle = CYAN; g.fillRect(X(b.start), y, span * useful, hh); g.fillStyle = GREY; g.fillRect(X(b.start) + span * useful, y, span * (1 - useful), hh);
            }
          });
          g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(X(tcur), 0); g.lineTo(X(tcur), h - 16); g.stroke();
          const sm = S.summary;
          let live;
          if (S.trace) { const st = S.trace.filter((s) => s.t <= tcur).pop(); live = st ? `At t = ${tcur.toFixed(1)}s: <b>${st.running}</b> running, <b>${st.waiting}</b> waiting, <b>${st.blocks_used}</b> of ${st.blocks_total} cache blocks in use.` : `At t = ${tcur.toFixed(1)}s: nothing has started.`; }
          else { const b = S.batches.find((x) => x.start <= tcur && tcur <= x.end); live = b ? `At t = ${tcur.toFixed(1)}s: batch of ${b.ids.length}, padded to ${b.padded_prompt_len} prompt tokens, running ${b.decode_steps} steps. ${(100 * (1 - b.useful_tokens / b.computed_tokens)).toFixed(0)}% of its decode work is wasted on finished sequences.` : `At t = ${tcur.toFixed(1)}s: waiting for the next batch to fill.`; }
          $("#tt").innerHTML = `<b>${esc(label(sys))}</b>: finished in <b>${sm.wall_s}s</b> (${sm.tokens_per_s} tokens/s), median latency ${sm.latency_p50_s}s, p95 ${sm.latency_p95_s}s. ${live}<br><span class="rr-key"><i style="background:#ffe98a"></i>waiting <i style="background:${PINK}"></i>generating (engine) <i style="background:${CYAN}"></i>generating (static batch) <i style="background:${GREY}"></i>wasted on padding <i style="background:#9b5cff"></i>was preempted and recomputed</span>`;
        }
        function loop(t0) { const el = (performance.now() - t0) / 1000; tcur = Math.min(tmax, el * (tmax / 10)); draw(); if (tcur < tmax && anim) anim = requestAnimationFrame(() => loop(t0)); else { anim = null; $("#tp").textContent = "replay"; } }
        $("#tp").addEventListener("click", () => { if (anim) { cancelAnimationFrame(anim); anim = null; $("#tp").textContent = "play"; return; } tcur = 0; $("#tp").textContent = "pause"; const t0 = performance.now(); anim = requestAnimationFrame(() => loop(t0)); });
        $("#te").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ex = b.dataset.i === "0" ? "offline" : "online"; mark(box, "#te button", +b.dataset.i); if (!E().systems[sys]) sys = "engine"; tcur = 0; draw(); });
        const tr = $("#tr"); if (tr) tr.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ri = +b.dataset.i; mark(box, "#tr button", ri); if (!E().systems[sys]) sys = "engine"; draw(); });
        $("#ts").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { sys = b.dataset.k; tcur = tmax; draw(); } });
        cv.addEventListener("click", (e) => { const r = cv.getBoundingClientRect(), w = r.width, t = ((e.clientX - r.left - 44) / (w - 58)) * tmax; tcur = Math.max(0, Math.min(tmax, t)); draw(); });
        mark(box, "#te button", 0); if (tr) mark(box, "#tr button", 0); tcur = 0; draw();
      }
      // ---------- cache chart
      if (boxes.cache) {
        const box = boxes.cache;
        box.innerHTML = `<p class="il-cap rr-env"></p><div class="il-top"><span class="il-k">workload</span><span class="il-btns" id="ce">${btns(["all requests waiting at t=0", "requests arrive over time"])}</span></div><canvas id="cc"></canvas><p class="il-cap" id="ct"></p>`;
        const $ = (s) => box.querySelector(s), cv = $("#cc");
        function draw() {
          header(box); const e = E().systems.engine, tr = e.trace, w = Math.max(340, Math.min(box.clientWidth - 24, 820)), h = 220, g = fit(cv, w, h);
          const tm = tr[tr.length - 1].t, X = (t) => 46 + (t / tm) * (w - 60), bt = tr[0].blocks_total, mr = Math.max(...tr.map((s) => s.running)), Yb = (v) => 190 - (v / bt) * 160, Yr = (v) => 190 - (v / Math.max(mr, 1)) * 160;
          g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(46, 190); g.lineTo(w - 12, 190); g.stroke();
          g.fillStyle = "#555"; g.font = "10px IBM Plex Mono, monospace"; g.textAlign = "center"; for (let t = 0; t <= tm; t += tm > 40 ? 10 : 2) g.fillText(t + "s", X(t), 206);
          g.textAlign = "right"; [0, 0.5, 1].forEach((f) => g.fillText(Math.round(f * bt), 40, Yb(f * bt) + 3));
          g.fillStyle = "rgba(255,46,136,.25)"; g.beginPath(); g.moveTo(X(0), 190); tr.forEach((s) => g.lineTo(X(s.t), Yb(s.blocks_used))); g.lineTo(X(tm), 190); g.closePath(); g.fill();
          g.strokeStyle = PINK; g.lineWidth = 3; g.beginPath(); tr.forEach((s, i) => (i ? g.lineTo(X(s.t), Yb(s.blocks_used)) : g.moveTo(X(s.t), Yb(s.blocks_used)))); g.stroke();
          g.strokeStyle = CYAN; g.lineWidth = 3; g.beginPath(); tr.forEach((s, i) => (i ? g.lineTo(X(s.t), Yr(s.running)) : g.moveTo(X(s.t), Yr(s.running)))); g.stroke();
          let prev = 0; tr.forEach((s) => { if (s.preempted > prev) { g.fillStyle = "#9b5cff"; g.fillRect(X(s.t) - 1, 20, 3, 10); } prev = s.preempted; });
          const pre = e.summary.preemptions;
          $("#ct").innerHTML = `<span class="rr-key"><i style="background:${PINK}"></i>cache blocks in use (of ${bt}) <i style="background:${CYAN}"></i>sequences running (max ${mr}) <i style="background:#9b5cff"></i>preemption</span><br>Peak GPU memory in this run: <b>${e.summary.peak_gpu_gb} GB</b>. ${pre ? pre + " sequences were preempted and recomputed." : "The cache never filled, so no sequence was preempted."} Each step is one forward pass over whichever sequences are running; the number running changes at every step.`;
        }
        $("#ce").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ex = b.dataset.i === "0" ? "offline" : "online"; mark(box, "#ce button", +b.dataset.i); draw(); });
        window.addEventListener("resize", draw); mark(box, "#ce button", 0); draw();
      }
      // ---------- results
      if (boxes.results) {
        const box = boxes.results;
        function draw() {
          header(box); const rows = sysNames().map((k) => [k, E().systems[k].summary]), best = Math.max(...rows.filter((r) => r[0] !== "engine").map((r) => r[1].tokens_per_s)), mx = Math.max(...rows.map((r) => r[1].tokens_per_s));
          box.querySelector(".rr-tab").innerHTML = `<table><tr><th>system</th><th>tokens/s</th><th></th><th>median latency</th><th>p95 latency</th><th>time to first token (p50)</th><th>wasted decode work</th><th>peak GPU memory</th></tr>` +
            rows.map(([k, s]) => `<tr><td>${esc(label(k))}</td><td><b>${s.tokens_per_s}</b></td><td style="width:140px"><span class="cmpbar"><i style="width:${(s.tokens_per_s / mx) * 100}%;background:${k === "engine" ? PINK : CYAN}"></i></span></td><td>${s.latency_p50_s}s</td><td>${s.latency_p95_s}s</td><td>${s.ttft_p50_s ? s.ttft_p50_s + "s" : "n/a"}</td><td>${s.wasted_decode_fraction !== undefined ? Math.round(s.wasted_decode_fraction * 100) + "%" : "0%"}</td><td>${s.peak_gpu_gb} GB</td></tr>`).join("") + "</table>" +
            `<p class="il-cap">${ex === "offline" ? "All requests wait at t = 0, so this measures raw throughput. The engine is <b>" + (E().systems.engine.summary.tokens_per_s / best).toFixed(2) + "&times;</b> the throughput of the best static batch size." : "Requests arrive as a Poisson process (" + E().rate + " per second), so tokens per second is capped by the arrival rate and the number to compare is latency. The engine's median latency is <b>" + (Math.min(...rows.filter((r) => r[0] !== "engine").map((r) => r[1].latency_p50_s)) / E().systems.engine.summary.latency_p50_s).toFixed(1) + "&times;</b> lower than the best static batch size, and the first token arrives in " + E().systems.engine.summary.ttft_p50_s + " s."}</p>`;
        }
        box.innerHTML = `<p class="il-cap rr-env"></p><div class="il-top"><span class="il-k">workload</span><span class="il-btns" id="re">${btns(["all requests waiting at t=0", "requests arrive over time"])}</span></div><div class="rr-tab"></div>`;
        box.querySelector("#re").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ex = b.dataset.i === "0" ? "offline" : "online"; mark(box, "#re button", +b.dataset.i); draw(); });
        mark(box, "#re button", 0); draw();
      }
    }).catch(() => { for (const k of ["timeline", "cache", "results"]) if (boxes[k]) boxes[k].innerHTML = '<p class="small">These panels replay recorded runs and load a data file over HTTP. Serve the site instead of opening the file directly.</p>'; });
  }

  if (boxes.paging) paging(boxes.paging);
  recorded();
})();
