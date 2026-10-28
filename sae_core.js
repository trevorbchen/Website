// toy sparse autoencoder on procedurally generated 8x8 images. Pure functions, no DOM, so it can be tested in Node.
// <core>
function saeCore() {
  const N = 8, P = N * N;
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());

  // ground-truth "features": things an image can contain
  const NAMES = ["bar (top)", "bar (bottom)", "bar (left)", "bar (right)", "diagonal \\", "diagonal /", "blob", "border"];
  const atoms = NAMES.map((_, k) => {
    const a = new Float32Array(P);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      if (k === 0) v = y === 1; else if (k === 1) v = y === 6; else if (k === 2) v = x === 1; else if (k === 3) v = x === 6;
      else if (k === 4) v = x === y; else if (k === 5) v = x + y === N - 1;
      else if (k === 6) v = Math.exp(-(((x - 3.5) ** 2 + (y - 3.5) ** 2) / 5)); else v = x === 0 || y === 0 || x === N - 1 || y === N - 1;
      a[y * N + x] = +v;
    }
    let s = 0; for (let i = 0; i < P; i++) s += a[i] * a[i]; s = Math.sqrt(s); for (let i = 0; i < P; i++) a[i] /= s;
    return a;
  });

  function sample(r) {
    const u = r(), m = u < 0.45 ? 1 : u < 0.8 ? 2 : 3, pick = [];
    while (pick.length < m) { const k = Math.floor(r() * atoms.length); if (!pick.includes(k)) pick.push(k); }
    const x = new Float32Array(P), amp = [];
    for (const k of pick) { const a = 0.6 + 0.6 * r(); amp.push(a); for (let i = 0; i < P; i++) x[i] += a * atoms[k][i]; }
    return { x, pick, amp };
  }

  // Laplacian (zero padded), scaled so the tilt weight is comparable to the plain error
  function lap(v) {
    const o = new Float32Array(P);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 4 * v[y * N + x];
      if (x > 0) s -= v[y * N + x - 1]; if (x < N - 1) s -= v[y * N + x + 1]; if (y > 0) s -= v[(y - 1) * N + x]; if (y < N - 1) s -= v[(y + 1) * N + x];
      o[y * N + x] = s / 4;
    }
    return o;
  }

  function init(D, seed) {
    const r = rng(seed * 7919 + 13);
    const We = new Float32Array(D * P), Wd = new Float32Array(P * D), be = new Float32Array(D);
    for (let d = 0; d < D; d++) { let s = 0; for (let i = 0; i < P; i++) { const g = gauss(r); Wd[i * D + d] = g; s += g * g; } s = Math.sqrt(s); for (let i = 0; i < P; i++) { Wd[i * D + d] /= s; We[d * P + i] = Wd[i * D + d]; } }
    const mk = (n) => new Float32Array(n);
    return { D, We, Wd, be, m: { We: mk(D * P), Wd: mk(P * D), be: mk(D) }, v: { We: mk(D * P), Wd: mk(P * D), be: mk(D) }, t: 0, r };
  }

  function encode(s, x, k) {
    const { D, We, be } = s, pre = new Float32Array(D);
    for (let d = 0; d < D; d++) { let a = be[d]; for (let i = 0; i < P; i++) a += We[d * P + i] * x[i]; pre[d] = a; }
    const idx = Array.from({ length: D }, (_, i) => i).sort((a, b) => pre[b] - pre[a]).slice(0, k);
    const z = new Float32Array(D); for (const d of idx) z[d] = Math.max(0, pre[d]);
    return { pre, z, idx };
  }
  function decode(s, z) {
    const { D, Wd } = s, o = new Float32Array(P);
    for (let i = 0; i < P; i++) { let a = 0; for (let d = 0; d < D; d++) a += Wd[i * D + d] * z[d]; o[i] = a; }
    return o;
  }

  // one Adam step on a minibatch. loss = |r|^2 + tilt * |T r|^2, with T the scaled Laplacian
  function step(s, k, tilt, lr, batch) {
    const { D, We, Wd, be } = s, gWe = new Float32Array(D * P), gWd = new Float32Array(P * D), gbe = new Float32Array(D);
    for (let b = 0; b < batch; b++) {
      const { x } = sample(s.r), { z, idx, pre } = encode(s, x, k), xh = decode(s, z);
      const r = new Float32Array(P); for (let i = 0; i < P; i++) r[i] = x[i] - xh[i];
      let g = r; if (tilt > 0) { const t2 = lap(lap(r)); g = new Float32Array(P); for (let i = 0; i < P; i++) g[i] = r[i] + tilt * t2[i]; }
      const dxh = new Float32Array(P); for (let i = 0; i < P; i++) dxh[i] = -2 * g[i] / batch;
      for (const d of idx) {
        if (pre[d] <= 0) continue;
        let dz = 0; for (let i = 0; i < P; i++) { gWd[i * D + d] += dxh[i] * z[d]; dz += Wd[i * D + d] * dxh[i]; }
        for (let i = 0; i < P; i++) gWe[d * P + i] += dz * x[i]; gbe[d] += dz;
      }
    }
    s.t++; const b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, s.t), c2 = 1 - Math.pow(b2, s.t);
    for (const [key, arr, g] of [["We", We, gWe], ["Wd", Wd, gWd], ["be", be, gbe]]) {
      const m = s.m[key], v = s.v[key];
      for (let i = 0; i < arr.length; i++) { m[i] = b1 * m[i] + (1 - b1) * g[i]; v[i] = b2 * v[i] + (1 - b2) * g[i] * g[i]; arr[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-8); }
    }
    for (let d = 0; d < D; d++) { let n = 0; for (let i = 0; i < P; i++) n += Wd[i * D + d] ** 2; n = Math.sqrt(n) || 1; for (let i = 0; i < P; i++) Wd[i * D + d] /= n; }
  }

  const col = (s, d) => { const o = new Float32Array(P); for (let i = 0; i < P; i++) o[i] = s.Wd[i * s.D + d]; return o; };
  const cos = (a, b) => { let x = 0, y = 0, z = 0; for (let i = 0; i < P; i++) { x += a[i] * b[i]; y += a[i] * a[i]; z += b[i] * b[i]; } return x / (Math.sqrt(y * z) + 1e-9); };
  const recovery = (s) => atoms.map((a) => { let best = -1; for (let d = 0; d < s.D; d++) best = Math.max(best, cos(a, col(s, d))); return best; });
  const similarity = (A, B) => {          // mean best-match cosine in both directions
    let t = 0; for (let d = 0; d < A.D; d++) { let m = -1; for (let e = 0; e < B.D; e++) m = Math.max(m, cos(col(A, d), col(B, e))); t += m; }
    for (let e = 0; e < B.D; e++) { let m = -1; for (let d = 0; d < A.D; d++) m = Math.max(m, cos(col(A, d), col(B, e))); t += m; }
    return t / (A.D + B.D);
  };
  const evalMSE = (s, k, n = 300) => { const r = rng(99991); let e = 0, v = 0; for (let j = 0; j < n; j++) { const { x } = sample(r), xh = decode(s, encode(s, x, k).z); for (let i = 0; i < P; i++) { e += (x[i] - xh[i]) ** 2; v += x[i] ** 2; } } return 1 - e / v; };
  function train(D, k, tilt, seed, steps, lr = 0.02, batch = 32) { const s = init(D, seed); for (let i = 0; i < steps; i++) step(s, k, tilt, lr, batch); return s; }
  return { N, P, NAMES, atoms, rng, sample, lap, init, encode, decode, step, col, cos, recovery, similarity, evalMSE, train };
}
// </core>
if (typeof module !== "undefined") module.exports = saeCore;
