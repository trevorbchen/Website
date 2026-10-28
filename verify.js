// verification loop demo: propose a spec, run a verifier, read the counterexample, refine.
// The verifier is a bounded exhaustive checker running in a Web Worker (not an SMT solver). It
// checks a spec two ways: does the function satisfy it, and does it reject known-wrong
// implementations ("mutants"). A spec that lets a wrong program through is too weak.
(() => {
  const box = document.querySelector('.demo[data-demo="verify"]');
  if (!box) return;
  const INK = "#111015", PINK = "#ff2e88", CYAN = "#19d3e6", YEL = "#ffe03a";

  // ---------------------------------------------------------------- the verifier (runs in a worker)
  // <worker>
  function workerMain() {
    onmessage = (e) => {
      const { fnSrc, req, ens, params, mutants } = e.data;
      const H = {
        sorted: (a) => a.every((v, i) => i === 0 || a[i - 1] <= v),
        strictlySorted: (a) => a.every((v, i) => i === 0 || a[i - 1] < v),
        sameElems: (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join(),
      };
      const hn = Object.keys(H), hv = Object.values(H), names = params.map((p) => p.n);
      const build = (src) => new Function(...hn, src + "\nreturn f;")(...hv);
      const compile = (expr) => {
        const g = new Function(...hn, ...names, "result", "return !!(" + expr + ");");
        return (inp, res) => g(...hv, ...inp, res);
      };
      const dom = params.map((p) => {
        const vals = [];
        for (let v = p.lo; v <= p.hi; v++) vals.push(v);
        if (p.t === "int") return vals;
        let out = [[]], layer = [[]];
        for (let l = 1; l <= p.len; l++) {
          const next = [];
          for (const pre of layer) for (const v of vals) next.push(pre.concat(v));
          out = out.concat(next); layer = next;
        }
        return out;
      });
      function* product(i = 0, cur = []) {
        if (i === dom.length) { yield cur; return; }
        for (const v of dom[i]) yield* product(i + 1, cur.concat([v]));
      }
      const copy = (x) => (Array.isArray(x) ? x.slice() : x);
      const reqF = req.map(compile), ensF = ens.map(compile);
      function check(f) {
        let checked = 0;
        for (const inp of product()) {
          if (!reqF.every((g) => { try { return g(inp.map(copy), undefined); } catch (_) { return false; } })) continue;
          checked++;
          let res, err = null;
          try { res = f(...inp.map(copy)); } catch (x) { err = String(x); }
          const truth = ensF.map((g) => { if (err) return false; try { return g(inp.map(copy), res); } catch (_) { return false; } });
          if (err || truth.some((t) => !t)) return { ok: false, checked, ce: { inp, res: err ? "error: " + err : res, truth } };
        }
        return { ok: true, checked };
      }
      let out;
      try {
        out = {
          main: check(build(fnSrc)),
          mutants: mutants.map(([label, src]) => {
            try { const r = check(build(src)); return [label, r.ok ? "survives" : "killed", src]; } catch (err) { return [label, "error", src]; }
          }),
        };
      } catch (err) { out = { error: String(err) }; }
      postMessage(out);
    };
  }
  // </worker>
  const workerUrl = URL.createObjectURL(new Blob([`(${workerMain})()`], { type: "text/javascript" }));

  // ---------------------------------------------------------------- examples with a scripted refinement loop
  const EX = {
    clamp: {
      label: "clamp(x, lo, hi)",
      params: [{ n: "x", t: "int", lo: -4, hi: 4 }, { n: "lo", t: "int", lo: -4, hi: 4 }, { n: "hi", t: "int", lo: -4, hi: 4 }],
      fn: "function f(x, lo, hi) {\n  if (x < lo) return lo;\n  if (x > hi) return hi;\n  return x;\n}",
      mutants: [
        ["never clamps", "function f(x, lo, hi) { return x; }"],
        ["forgets the upper bound", "function f(x, lo, hi) { if (x < lo) return lo; return x; }"],
        ["clamps to the wrong end", "function f(x, lo, hi) { if (x < lo) return hi; if (x > hi) return lo; return x; }"],
      ],
      steps: [
        { who: "first draft", note: "A model drafts the obvious spec: the output lies between lo and hi.",
          spec: "requires: true\nensures: result >= lo\nensures: result <= hi" },
        { who: "after the counterexample", note: "The counterexample has lo > hi. The draft quietly assumed an ordering, so it becomes a precondition.",
          spec: "requires: lo <= hi\nensures: result >= lo\nensures: result <= hi" },
        { who: "after the mutation check", note: "The range property still accepts a function that clamps to the wrong end. Each case gets pinned down.",
          spec: "requires: lo <= hi\nensures: result >= lo\nensures: result <= hi\nensures: x < lo ? result === lo : true\nensures: x > hi ? result === hi : true\nensures: (x >= lo && x <= hi) ? result === x : true" },
      ],
    },
    sort: {
      label: "sort(xs)",
      params: [{ n: "xs", t: "list", len: 4, lo: 0, hi: 2 }],
      fn: "function f(xs) {\n  return xs.slice().sort((a, b) => a - b);\n}",
      mutants: [
        ["returns the input unchanged", "function f(xs) { return xs; }"],
        ["returns nothing", "function f(xs) { return []; }"],
        ["returns zeros", "function f(xs) { return xs.map(() => 0); }"],
      ],
      steps: [
        { who: "first draft", note: "The draft says the output is strictly increasing.",
          spec: "requires: true\nensures: strictlySorted(result)" },
        { who: "after the counterexample", note: "Duplicates break it. Sorted means non-decreasing, so the draft is relaxed.",
          spec: "requires: true\nensures: sorted(result)" },
        { who: "after the mutation check", note: "Returning an empty list is also 'sorted'. Length has to match.",
          spec: "requires: true\nensures: sorted(result)\nensures: result.length === xs.length" },
        { who: "after the mutation check", note: "Returning zeros of the right length still passes. The output must be a rearrangement of the input.",
          spec: "requires: true\nensures: sorted(result)\nensures: result.length === xs.length\nensures: sameElems(result, xs)" },
      ],
    },
    max3: {
      label: "max3(a, b, c)",
      params: [{ n: "a", t: "int", lo: -3, hi: 3 }, { n: "b", t: "int", lo: -3, hi: 3 }, { n: "c", t: "int", lo: -3, hi: 3 }],
      fn: "function f(a, b, c) {\n  if (a > b) return a;\n  if (b > c) return b;\n  return c;\n}",
      mutants: [
        ["ignores c", "function f(a, b, c) { return Math.max(a, b); }"],
        ["just returns a", "function f(a, b, c) { return a; }"],
        ["returns something huge", "function f(a, b, c) { return Infinity; }"],
      ],
      steps: [
        { who: "first draft", note: "The result must be at least as large as every input. The spec is fine; this time the code is the problem.",
          spec: "requires: true\nensures: result >= a\nensures: result >= b\nensures: result >= c" },
        { who: "patched code", note: "The counterexample shows 'a' returned without comparing it to c. The patch compares all three.",
          fn: "function f(a, b, c) {\n  if (a >= b && a >= c) return a;\n  if (b >= c) return b;\n  return c;\n}",
          spec: "requires: true\nensures: result >= a\nensures: result >= b\nensures: result >= c" },
        { who: "after the mutation check", note: "Returning Infinity is at least as large as everything. The result must also be one of the inputs.",
          fn: "function f(a, b, c) {\n  if (a >= b && a >= c) return a;\n  if (b >= c) return b;\n  return c;\n}",
          spec: "requires: true\nensures: result >= a\nensures: result >= b\nensures: result >= c\nensures: result === a || result === b || result === c" },
      ],
    },
  };

  // ---------------------------------------------------------------- UI
  box.innerHTML = `
    <div class="vf-top">
      <label>function <select class="vf-ex">${Object.entries(EX).map(([k, e]) => `<option value="${k}">${e.label}</option>`).join("")}</select></label>
      <span class="vf-btns"><button class="filter vf-play">play the loop</button><button class="filter vf-reset">reset</button></span>
    </div>
    <div class="vf-steps"></div>
    <p class="vf-note"></p>
    <div class="vf-cols">
      <div><p class="vf-k">code under test</p><textarea class="vf-code" spellcheck="false" rows="7"></textarea></div>
      <div><p class="vf-k">specification</p><textarea class="vf-spec" spellcheck="false" rows="7"></textarea></div>
    </div>
    <div class="vf-out"></div>
    <p class="vf-foot">The "agent" turns here are scripted for the demo; the verifier is real. It enumerates every input in a small bounded domain, so it finds counterexamples but doesn't prove anything. Both boxes are editable.</p>`;
  const $ = (s) => box.querySelector(s);
  const sel = $(".vf-ex"), stepsEl = $(".vf-steps"), noteEl = $(".vf-note"), codeEl = $(".vf-code"), specEl = $(".vf-spec"), outEl = $(".vf-out");
  let cur = EX.clamp, stepIdx = 0, worker = null, timer = null, playing = 0, token = 0;

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const show = (v) => (Array.isArray(v) ? "[" + v.join(", ") + "]" : String(v));

  function parseSpec(text) {
    const req = [], ens = [];
    text.split("\n").forEach((raw) => {
      const l = raw.trim();
      if (!l || l.startsWith("//")) return;
      const m = l.match(/^(requires|ensures)\s*:\s*(.+)$/i);
      if (!m) throw new Error('each line must start with "requires:" or "ensures:"  ->  ' + l);
      (m[1].toLowerCase() === "requires" ? req : ens).push(m[2]);
    });
    if (!ens.length) throw new Error('add at least one "ensures:" line');
    return { req, ens };
  }

  // ---- counterexample picture
  function numberLine(items, res) {
    const nums = items.map((i) => i.v).concat(typeof res === "number" && isFinite(res) ? [res] : []);
    const lo = Math.min(...nums) - 1, hi = Math.max(...nums) + 1, W = 540, pad = 26, X = (v) => pad + ((v - lo) / (hi - lo)) * (W - 2 * pad);
    let s = `<svg viewBox="0 0 ${W} 124" class="vf-svg"><line x1="${pad}" y1="74" x2="${W - pad}" y2="74" stroke="${INK}" stroke-width="3"/>`;
    for (let v = Math.ceil(lo); v <= hi; v++) s += `<line x1="${X(v)}" y1="68" x2="${X(v)}" y2="80" stroke="${INK}" stroke-width="2"/><text x="${X(v)}" y="96" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="#555">${v}</text>`;
    const stack = {};
    items.forEach((i) => {
      const k = stack[i.v] = (stack[i.v] || 0) + 1;
      s += `<circle cx="${X(i.v)}" cy="${74 - 16 * k}" r="8" fill="${YEL}" stroke="${INK}" stroke-width="2.5"/><text x="${X(i.v) + 13}" y="${78 - 16 * k}" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="${INK}">${i.n}</text>`;
    });
    if (typeof res === "number" && isFinite(res)) s += `<polygon points="${X(res)},82 ${X(res) - 9},100 ${X(res) + 9},100" fill="${PINK}" stroke="${INK}" stroke-width="2.5"/><text x="${X(res)}" y="116" text-anchor="middle" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="${PINK}">result</text>`;
    return s + "</svg>";
  }
  function listRow(label, arr, color) {
    return `<div class="vf-row"><span>${label}</span>${arr.length ? arr.map((v) => `<b style="background:${color}">${v}</b>`).join("") : '<i>(empty)</i>'}</div>`;
  }
  function ceVisual(params, ce) {
    const scal = [], lists = [];
    params.forEach((p, i) => (p.t === "int" ? scal : lists).push({ n: p.n, v: ce.inp[i] }));
    let html = "";
    if (scal.length) html += numberLine(scal, ce.res);
    lists.forEach((l) => (html += listRow(l.n, l.v, YEL)));
    if (Array.isArray(ce.res)) html += listRow("result", ce.res, "#ffb3d1");
    else if (!scal.length || typeof ce.res !== "number" || !isFinite(ce.res)) html += `<div class="vf-row"><span>result</span><b style="background:#ffb3d1">${esc(show(ce.res))}</b></div>`;
    return html;
  }

  // ---- render a verifier result
  function render(res, spec, params) {
    if (res.error) { outEl.innerHTML = `<div class="vf-verdict bad">error: ${esc(res.error)}</div>`; return; }
    const m = res.main;
    let h = "";
    if (m.ok && m.checked === 0) h += `<div class="vf-verdict warn">the precondition rules out every input, so there is nothing to check</div>`;
    else if (m.ok) h += `<div class="vf-verdict ok">holds on all ${m.checked} valid inputs in the bounded domain</div>`;
    else h += `<div class="vf-verdict bad">counterexample found after checking ${m.checked} input${m.checked === 1 ? "" : "s"}</div>`;
    h += '<ul class="vf-clauses">' + spec.ens.map((c, i) => `<li class="${m.ok ? "pass" : m.ce.truth[i] ? "pass" : "fail"}"><code>${esc(c)}</code></li>`).join("") + "</ul>";
    if (!m.ok) h += `<div class="vf-ce"><p class="vf-k">counterexample: ${params.map((p, i) => `${p.n} = ${esc(show(m.ce.inp[i]))}`).join(", ")}  ->  result = ${esc(show(m.ce.res))}</p>${ceVisual(params, m.ce)}</div>`;
    if (m.ok && m.checked > 0) {
      const alive = res.mutants.filter((x) => x[1] === "survives");
      h += `<div class="vf-mut"><p class="vf-k">mutation check: does the spec reject wrong implementations?</p><ul>` +
        res.mutants.map(([label, st, src]) => `<li class="${st === "killed" ? "pass" : "fail"}"><b>${st === "killed" ? "rejected" : "still passes"}</b> ${esc(label)}${st === "survives" ? `<pre>${esc(src)}</pre>` : ""}</li>`).join("") + "</ul>" +
        (alive.length ? `<p class="vf-weak">The spec is too weak: ${alive.length} wrong implementation${alive.length > 1 ? "s" : ""} satisfy${alive.length > 1 ? "" : "es"} it.</p>` : `<p class="vf-strong">Every wrong implementation is rejected.</p>`) + "</div>";
    }
    outEl.innerHTML = h;
  }

  function run() {
    let spec;
    try { spec = parseSpec(specEl.value); } catch (e) { outEl.innerHTML = `<div class="vf-verdict bad">${esc(e.message)}</div>`; return Promise.resolve(); }
    if (worker) worker.terminate();
    clearTimeout(timer);
    outEl.innerHTML = '<div class="vf-verdict warn">checking...</div>';
    const my = ++token;
    return new Promise((resolve) => {
      worker = new Worker(workerUrl);
      worker.onmessage = (e) => { if (my === token) render(e.data, spec, cur.params); clearTimeout(timer); resolve(); };
      worker.onerror = (e) => { if (my === token) outEl.innerHTML = `<div class="vf-verdict bad">error: ${esc(e.message || "could not run")}</div>`; clearTimeout(timer); resolve(); };
      timer = setTimeout(() => { worker.terminate(); if (my === token) outEl.innerHTML = '<div class="vf-verdict bad">timed out: the function may not terminate</div>'; resolve(); }, 3000);
      worker.postMessage({ fnSrc: codeEl.value, req: spec.req, ens: spec.ens, params: cur.params, mutants: cur.mutants });
    });
  }

  function setStep(i) {
    stepIdx = i;
    const s = cur.steps[i];
    if (s.fn) codeEl.value = s.fn;
    specEl.value = s.spec;
    noteEl.innerHTML = `<b>${esc(s.who)}:</b> ${esc(s.note)}`;
    stepsEl.querySelectorAll("button").forEach((b, j) => b.classList.toggle("on", j === i));
    return run();
  }
  function load(key) {
    playing++;
    cur = EX[key];
    codeEl.value = cur.fn;
    stepsEl.innerHTML = cur.steps.map((s, i) => `<button class="filter" data-i="${i}">v${i + 1}</button>`).join("");
    setStep(0);
  }

  sel.addEventListener("change", () => load(sel.value));
  stepsEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { playing++; setStep(+b.dataset.i); } });
  $(".vf-reset").addEventListener("click", () => { playing++; codeEl.value = cur.fn; setStep(0); });
  $(".vf-play").addEventListener("click", async () => {
    const mine = ++playing;
    codeEl.value = cur.fn;
    for (let i = 0; i < cur.steps.length; i++) {
      if (mine !== playing) return;
      await setStep(i);
      await new Promise((r) => setTimeout(r, 2200));
    }
  });
  let deb = null;
  function edited() {
    playing++;
    stepsEl.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
    noteEl.innerHTML = "<b>your edit</b>";
    clearTimeout(deb); deb = setTimeout(run, 450);
  }
  codeEl.addEventListener("input", edited);
  specEl.addEventListener("input", edited);
  load("clamp");
})();
