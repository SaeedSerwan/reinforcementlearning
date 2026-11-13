/*!
 * Reinforcement Lab — The inverted pendulum
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, $$, Plot, fmt, rng, CP, AseAce, BoxQ } = UL;
  const deg = (r) => (r * 180) / Math.PI, rad = (d) => (d * Math.PI) / 180;
  const inView = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
  const logChart = (P, lens, o = {}) => { // trial lengths, log scale, as dots
    P.clear(); const n = Math.max(o.minTrials || 50, lens.length);
    P.domain(0, n + 1, 0.9, Math.log10(25000)); P.axes({ xlabel: 'trial', ylabel: 'steps before failing', ny: 4, fy: (v) => (Math.abs(v - Math.round(v)) < 1e-9 && v >= 1 ? (10 ** v).toLocaleString('en-US') : '') });
    P.line(0, Math.log10(20000), n + 1, Math.log10(20000), { color: '#1baf7a', dash: [4, 4], w: 1 }); P.textPx('solved: 20,000 steps', P.W - P.pad.r - 4, P.sy(Math.log10(20000)) + 10, { align: 'right', color: '#0f7a54', font: '10px "IBM Plex Mono"' });
    P.clipped(() => lens.forEach((L, i) => P.marker(i + 1, Math.log10(Math.max(1, L)), { r: 3.2, fill: o.color || '#c0392b', ring: false, alpha: 0.85 })));
  };

  /* ------------------------------------------------ 1. try it yourself */
  (function () {
    const P = new Plot('#me-cart', { w: 600, h: 300 }), foot = $('#me-foot');
    let s = [0, 0, rad(1), 0], run = false, fell = false, t = 0, best = 0, push = 0, acc = 0;
    const sp = UL.seg('me-speed');
    const keys = { left: false, right: false };
    function draw() {
      UL.drawCart(P, s, { push: push === 0 ? null : push > 0, fallen: fell, limits: true, text: fell ? 'fallen' : '' });
      UL.stats('me-stats', [{ k: 'time balanced', v: `${(t * 0.02).toFixed(2)} <small>s</small>`, hi: true }, { k: 'best', v: `${(best * 0.02).toFixed(2)} <small>s</small>` }, { k: 'angle θ', v: `${deg(s[2]).toFixed(1)}°` }, { k: 'cart x', v: `${s[0].toFixed(2)} m` }, { k: 'θ̇', v: `${deg(s[3]).toFixed(0)}°/s` }, { k: 'ẋ', v: `${s[1].toFixed(2)} m/s` }]);
    }
    function reset() { s = [0, 0, rad((Math.random() - 0.5) * 3), 0]; t = 0; fell = false; acc = 0; foot.innerHTML = ''; draw(); }
    const loop = UL.loop((dt) => {
      acc += Math.min(dt, 0.1) * 50 * +sp.value;
      while (acc >= 1) {
        acc -= 1; push = keys.right && !keys.left ? 1 : keys.left && !keys.right ? -1 : 0;
        s = CP.step(s, null, push * CP.F); t++;
        if (CP.failed(s)) { fell = true; best = Math.max(best, t); foot.innerHTML = `The pole fell after <b>${(t * 0.02).toFixed(2)} s</b> (${t} steps). The learner below has the same problem, without even knowing what the numbers mean. Press space or Start.`; draw(); $('#me-start').textContent = 'Start'; return false; }
      }
      best = Math.max(best, t); draw();
    });
    $('#me-start').addEventListener('click', (e) => { reset(); loop.start(); e.target.textContent = 'Restart'; });
    const hold = (btn, k) => { const b = $(btn); const on = (e) => { e.preventDefault(); keys[k] = true; if (!loop.on && !fell) loop.start(); }, off = () => { keys[k] = false; };
      b.addEventListener('mousedown', on); b.addEventListener('touchstart', on); ['mouseup', 'mouseleave', 'touchend'].forEach((ev) => b.addEventListener(ev, off)); };
    hold('#me-left', 'left'); hold('#me-right', 'right');
    document.addEventListener('keydown', (e) => {
      if (!inView('try')) return;
      if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); if (!loop.on && !fell && t === 0) loop.start(); }
      if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); if (!loop.on && !fell && t === 0) loop.start(); }
      if (e.key === ' ') { e.preventDefault(); reset(); loop.start(); $('#me-start').textContent = 'Restart'; }
    });
    document.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') keys.left = false; if (e.key === 'ArrowRight') keys.right = false; });
    reset();
  })();

  /* ------------------------------------------------ 3. rewards */
  (function () {
    const P = new Plot('#rw-plot', { w: 820, h: 200, pad: { l: 40, r: 12, t: 14, b: 30 } }), r = rng(2);
    let T = 0; const mode = UL.seg('rw-mode', draw);
    function trial() { let s = [0, 0, rad(1), 0]; T = 0; while (!CP.failed(s) && T < 300) { s = CP.step(s, r() < 0.5); T++; } }
    function draw() {
      const barto = mode.value === 'barto', c = P.ctx; P.clear(); P.domain(0, T + 1, barto ? -1.15 : 0, barto ? 0.3 : 1.25); P.axes({ xlabel: 'time step', ny: 3 });
      for (let t = 1; t <= T; t++) { const v = barto ? (t === T ? -1 : 0) : 1; const X = P.sx(t), w = Math.max(2, (P.sx(1) - P.sx(0)) * 0.6); c.fillStyle = v < 0 ? '#c0392b' : '#2a78d6'; if (v !== 0) c.fillRect(X - w / 2, Math.min(P.sy(0), P.sy(v)), w, Math.abs(P.sy(v) - P.sy(0))); else P.marker(t, 0, { r: 1.6, fill: '#a3a3a0', ring: false }); }
      P.textPx(barto ? `${T - 1} zeros, then −1: the only signal, after the pole has fallen` : `+1 for each of the ${T} steps; the return is the number of steps survived`, P.W / 2, P.pad.t + 6, { font: '12px "IBM Plex Sans"', color: '#3d3d3b' });
    }
    $('#rw-new').addEventListener('click', () => { trial(); draw(); }); trial(); draw();
  })();

  /* ------------------------------------------------ 5. hand-written rules */
  (function () {
    const C = new Plot('#hr-cart', { w: 560, h: 280 }), A = new Plot('#hr-plot', { w: 460, h: 220, pad: { l: 38, r: 10, t: 12, b: 30 } });
    const rule = UL.seg('hr-rule', () => { stop(); }), k = UL.range('hr-k', null, (v) => v.toFixed(2)); const r = rng(9);
    const pick = (s) => (rule.value === 'rand' ? r() < 0.5 : rule.value === 'lean' ? s[2] > 0 : s[2] + k.v * s[3] > 0);
    let s, hist, t, done, med = null;
    function drawAll() {
      UL.drawCart(C, s, { push: done ? null : pick(s), fallen: done && CP.failed(s), limits: true, text: done ? (CP.failed(s) ? `fell after ${t} steps (${(t * 0.02).toFixed(2)} s)` : `still up after ${t} steps`) : `${t} steps` });
      A.clear(); A.domain(0, Math.max(200, t), -14, 14); A.axes({ xlabel: 'time step', ylabel: 'θ (degrees)', ny: 4 });
      A.line(0, 12, Math.max(200, t), 12, { color: '#c9c9c4', dash: [4, 4], w: 1 }); A.line(0, -12, Math.max(200, t), -12, { color: '#c9c9c4', dash: [4, 4], w: 1 });
      A.clipped(() => A.poly(hist.map((v, i) => [i, v]), { color: CP.failed(s) ? '#c0392b' : '#2a78d6', w: 1.6 }));
      UL.stats('hr-stats', [{ k: 'this trial', v: `${t} <small>steps</small>` }, { k: 'median of 100 trials', v: med == null ? '–' : med >= 1000 ? '≥ 1,000' : `${med}` }]);
    }
    function start() { s = [0, 0, rad(2), 0]; hist = [deg(s[2])]; t = 0; done = false; }
    const loop = UL.loop(() => { for (let i = 0; i < 3 && !done; i++) { s = CP.step(s, pick(s)); t++; hist.push(deg(s[2])); if (CP.failed(s) || t >= 1000) done = true; } drawAll(); if (done) return false; });
    function stop() { loop.stop(); start(); med = null; drawAll(); }
    $('#hr-run').addEventListener('click', () => { loop.stop(); start(); loop.start(); });
    $('#hr-100').addEventListener('click', () => {
      const L = []; for (let n = 0; n < 100; n++) { let ss = [0, 0, rad((r() - 0.5) * 6), 0], tt = 0; while (!CP.failed(ss) && tt < 1000) { ss = CP.step(ss, pick(ss)); tt++; } L.push(tt); }
      L.sort((a, b) => a - b); med = Math.round((L[49] + L[50]) / 2); drawAll();
    });
    stop();
  })();

  /* ------------------------------------------------ 6. boxes */
  (function () {
    const C = new Plot('#bx-cart', { w: 500, h: 250 }), B = new Plot('#bx-bars', { w: 520, h: 330 }), num = $('#bx-num'), r = rng(5);
    const spec = [['cart position x (m)', [-2.4, -0.8, 0.8, 2.4]], ['cart velocity ẋ (m/s)', [-1.5, -0.5, 0.5, 1.5]], ['pole angle θ (degrees)', [-12, -6, -1, 0, 1, 6, 12]], ['angular velocity θ̇ (°/s)', [-150, -50, 50, 150]]];
    let s = [0, 0, rad(1), 0], push = true;
    function draw() {
      UL.drawCart(C, s, { push, ticks: true });
      const parts = CP.parts(s), vals = [s[0], s[1], deg(s[2]), deg(s[3])], c = B.ctx; B.clear();
      spec.forEach(([name, edges], i) => {
        const y0 = 18 + i * 80, x0 = 14, W = B.W - 28, lo = edges[0], hi = edges[edges.length - 1], X = (v) => x0 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * W;
        B.textPx(name, x0, y0, { align: 'left', font: '12px "IBM Plex Sans"', color: '#3d3d3b' });
        for (let j = 0; j < edges.length - 1; j++) {
          const on = j === parts[i]; c.fillStyle = on ? '#2a78d6' : '#e6eef7'; c.fillRect(X(edges[j]) + 1, y0 + 12, X(edges[j + 1]) - X(edges[j]) - 2, 26);
          if (X(edges[j + 1]) - X(edges[j]) > 14) B.textPx(String(j + 1), (X(edges[j]) + X(edges[j + 1])) / 2, y0 + 25, { color: on ? '#fff' : '#a3a3a0', font: '500 11px "IBM Plex Mono"' });
          B.textPx(String(edges[j]).replace('-', '−'), X(edges[j]), y0 + 48, { font: '9.5px "IBM Plex Mono"', color: '#6b6b68' });
        }
        B.textPx(String(hi), X(hi), y0 + 48, { font: '9.5px "IBM Plex Mono"', color: '#6b6b68' });
        c.strokeStyle = '#c0392b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(X(vals[i]), y0 + 8); c.lineTo(X(vals[i]), y0 + 42); c.stroke();
      });
      const b = CP.box(s); num.innerHTML = `<small>the learner is told only</small><span class="big">box ${b}</span><small>${CP.boxLabel(b)} · intervals ${parts.map((p) => p + 1).join(', ')}</small>`;
    }
    const loop = UL.loop(() => { for (let i = 0; i < 1; i++) { push = r() < 0.25 ? r() < 0.5 : s[2] + 0.5 * s[3] > 0; s = CP.step(s, push); if (CP.failed(s)) s = [0, 0, rad((r() - 0.5) * 4), 0]; } draw(); });
    $('#bx-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Play'; } else { loop.start(); e.target.textContent = 'Pause'; } });
    draw();
  })();

  /* ------------------------------------------------ 7. Q-learning on boxes */
  (function () {
    const P = new Plot('#qb-plot', { w: 560, h: 300, pad: { l: 56, r: 12, t: 12, b: 32 } });
    let L = null, busy = false;
    function draw() { logChart(P, L ? L.lens : [], { color: '#2a78d6', minTrials: 100 }); const lens = L ? L.lens : []; const solved = lens.length && lens[lens.length - 1] >= 20000;
      UL.stats('qb-stats', [{ k: 'trials', v: lens.length }, { k: 'longest', v: lens.length ? Math.max(...lens).toLocaleString('en-US') : '–' }, { k: 'result', v: solved ? `solved after <b>${lens.length - 1}</b> failures` : lens.length >= 400 ? 'not solved in 400' : busy ? 'learning…' : '–', hi: true }]); }
    $('#qb-run').addEventListener('click', () => {
      if (busy) return; busy = true; L = new BoxQ({ seed: +$('#qb-seed').value || 1 });
      const chunk = () => { const t0 = performance.now(); while (performance.now() - t0 < 25) { const T = L.runTrial(20000); if (T >= 20000 || L.lens.length >= 400) { busy = false; draw(); return; } } draw(); setTimeout(chunk, 0); };
      chunk();
    });
    draw();
  })();

  /* ------------------------------------------------ 8. sign rule + first failure */
  (function () {
    const cases = [
      ['r̂ < 0 (worse)', 'e > 0 (had pushed right)', '−', 'w goes <b>down</b>: next time push <b>left</b>. "I pushed right here, it ended badly."'],
      ['r̂ < 0 (worse)', 'e < 0 (had pushed left)', '+', 'w goes <b>up</b>: next time push <b>right</b>. "I pushed left here, it ended badly."'],
      ['r̂ > 0 (better)', 'e > 0 (had pushed right)', '+', 'w goes <b>up</b>: keep pushing right. Praise repeats what was done.'],
      ['r̂ > 0 (better)', 'e < 0 (had pushed left)', '−', 'w goes <b>down</b>: keep pushing left. Praise repeats what was done.'],
    ];
    const box = $('#sign-box'), out = $('#sign-out');
    box.innerHTML = cases.map((c, i) => `<div data-i="${i}"><b>${c[0]}</b><br>× <b>${c[1]}</b><br>Δw = α r̂ e is <b>${c[2]}</b></div>`).join('');
    $$('#sign-box > div').forEach((d) => d.addEventListener('click', () => { $$('#sign-box > div').forEach((x) => x.classList.toggle('on', x === d)); out.innerHTML = cases[+d.dataset.i][3] + ' And a box with e ≈ 0 is not changed: it was not involved.'; }));

    const C = new Plot('#cr-cart', { w: 520, h: 240 }), T = new Plot('#cr-theta', { w: 520, h: 170, pad: { l: 36, r: 10, t: 10, b: 28 } }), B = new Plot('#cr-bars', { w: 520, h: 420, pad: { l: 250, r: 50, t: 30, b: 34 } }), foot = $('#cr-foot');
    let rec = [], k = 0, order = [];
    function load() {
      const L = new AseAce({ seed: +$('#cr-seed').value || 1, record: true }); rec = [];
      let o; do { o = L.step(); rec.push(o); } while (!o.fail && rec.length < 500);
      order = []; rec.forEach((x) => { if (!order.includes(x.b)) order.push(x.b); }); k = 0; draw();
    }
    function draw() {
      const x = rec[k], fallen = x.fail;
      UL.drawCart(C, x.s, { push: fallen ? null : x.y === 1, fallen, limits: true, text: `trial 1, step ${k + 1}${fallen ? ': the pole falls, r = −1' : ''}` });
      T.clear(); T.domain(0, rec.length + 1, -14, 14); T.axes({ ylabel: 'θ (°)', xlabel: 'step (blue ▲ push right, red ▼ push left)', ny: 4 });
      T.line(0, 12, rec.length + 1, 12, { color: '#c9c9c4', dash: [4, 4], w: 1 }); T.line(0, -12, rec.length + 1, -12, { color: '#c9c9c4', dash: [4, 4], w: 1 });
      T.poly(rec.slice(0, k + 1).map((z, i) => [i + 1, deg(z.s[2])]), { color: '#111', w: 1.6 });
      rec.slice(0, k + 1).forEach((z, i) => T.marker(i + 1, -10.5, { shape: z.y ? 'triangle' : 'tri-down', r: 3.5, fill: z.y ? '#2a78d6' : '#c0392b', ring: false }));
      const seen = order.filter((b) => rec.slice(0, k + 1).some((z) => z.b === b)), vals = seen.map((b) => (fallen ? x.dw[b] : x.e[b]));
      B.clear(); const lim = fallen ? Math.max(10, ...vals.map(Math.abs)) * 1.25 : 0.2; B.domain(-lim, lim, -0.5, Math.max(6, seen.length) - 0.5);
      B.axes({ y: false, nx: 4, xlabel: fallen ? 'change of preference Δw = 1000 × (−1) × e      (< 0: towards left · > 0: towards right)' : 'eligibility e      (< 0: had been pushing left · > 0: pushing right)' });
      B.line(0, -0.5, 0, Math.max(6, seen.length) - 0.5, { color: '#111', w: 1 });
      const c = B.ctx, bh = Math.min(26, (B.sy(0) - B.sy(1)) * 0.6);
      seen.forEach((b, i) => { const y = seen.length - 1 - i, v = vals[i]; c.fillStyle = v >= 0 ? '#2a78d6' : '#c0392b'; c.fillRect(Math.min(B.sx(0), B.sx(v)), B.sy(y) - bh / 2, Math.abs(B.sx(v) - B.sx(0)), bh);
        B.textPx(`box ${b}: ${CP.boxLabel(b)}`, B.pad.l - 8, B.sy(y), { align: 'right', font: '11px "IBM Plex Sans"', color: '#3d3d3b' });
        B.textPx(fallen ? (v > 0 ? '+' : '') + v.toFixed(0) : (v > 0 ? '+' : '') + v.toFixed(3), B.sx(v) + (v >= 0 ? 6 : -6), B.sy(y), { align: v >= 0 ? 'left' : 'right', font: '500 11px "IBM Plex Mono"' }); });
      B.textPx(fallen ? 'r̂ = −1: every box is pushed the other way, by its own e' : 'signed eligibility of every box visited so far', B.pad.l, 14, { align: 'left', font: '600 12.5px "IBM Plex Sans"', color: fallen ? '#c0392b' : '#111' });
      foot.innerHTML = fallen ? `The pole fell to the ${x.s[2] > 0 ? 'right' : 'left'} after ${rec.length} random pushes. Boxes that had been pushing <b>${x.s[2] > 0 ? 'left' : 'right'}</b> as it fell are turned to push <b>${x.s[2] > 0 ? 'right' : 'left'}</b>, the cart must move under the pole. Recent, consistent pushes get the largest corrections.` : 'While the pole is up nothing is learned: r̂ = 0, so the weights do not change. The eligibilities are only being written down.';
    }
    $('#cr-step').addEventListener('click', () => { if (k < rec.length - 1) k++; draw(); });
    $('#cr-all').addEventListener('click', () => { k = rec.length - 1; draw(); });
    $('#cr-reset').addEventListener('click', load); $('#cr-seed').addEventListener('change', load);
    load();
  })();

  /* ------------------------------------------------ 9. critic */
  (function () {
    const C = new Plot('#ck-cart', { w: 520, h: 260 }), Pp = new Plot('#ck-p', { w: 520, h: 170, pad: { l: 40, r: 10, t: 22, b: 24 } }), Pr = new Plot('#ck-r', { w: 520, h: 190, pad: { l: 40, r: 10, t: 22, b: 30 } }), st = $('#ck-status');
    const found = []; let pick = 0, rec = [], k = 0;
    (function search() {
      for (let seed = 1; seed <= 40 && found.length < 6; seed++) {
        const L = new AseAce({ seed, record: true });
        for (let tr = 1; tr <= 60; tr++) {
          const steps = []; let o; do { o = L.step(); steps.push({ s: o.s, y: o.y, rh: o.rh, p: o.pold, fail: o.fail }); } while (!o.fail && L.t < 2000);
          if (!o.fail) break;
          const n = steps.length; L.newTrial();
          if (tr >= 12 && n >= 60 && n <= 600) { const pre = steps.slice(n - 30, n - 2).map((z) => z.rh); if (Math.min(...pre) < -0.25 && steps[n - 1].rh > -0.8) { found.push({ seed, tr, steps: steps.slice(-60), n }); break; } }
        }
      }
    })();
    function load() { const f = found[pick % found.length]; rec = f.steps; k = 0; st.innerHTML = `seed ${f.seed}, trial ${f.tr}: steps ${f.n - 59}–${f.n}`; draw(); }
    function draw() {
      const x = rec[k], f = found[pick % found.length], n0 = f.n - 59;
      UL.drawCart(C, x.s, { push: x.fail ? null : x.y === 1, fallen: x.fail, limits: true, text: `step ${n0 + k}${x.fail ? ': failure' : ''}` });
      Pp.clear(); Pp.domain(n0 - 1, f.n + 1, -1.05, 0.12); Pp.axes({ ny: 3, x: false }); Pp.textPx("critic's prediction p for the current box (0 = safe, −1 = failure near)", Pp.pad.l, 10, { align: 'left', font: '11.5px "IBM Plex Sans"' });
      Pp.poly(rec.slice(0, k + 1).map((z, i) => [n0 + i, z.p]), { color: '#111', w: 1.8 });
      Pr.clear(); Pr.domain(n0 - 1, f.n + 1, -1.05, 0.65); Pr.axes({ ny: 3, xlabel: 'time step' }); Pr.textPx('internal reinforcement r̂ = r + γ p(new) − p(old)', Pr.pad.l, 10, { align: 'left', font: '11.5px "IBM Plex Sans"' });
      Pr.line(n0 - 1, 0, f.n + 1, 0, { color: '#111', w: 1 }); const c = Pr.ctx, bw = (Pr.sx(1) - Pr.sx(0)) * 0.7;
      rec.slice(0, k + 1).forEach((z, i) => { c.fillStyle = z.rh < 0 ? '#c0392b' : '#2a78d6'; c.fillRect(Pr.sx(n0 + i) - bw / 2, Math.min(Pr.sy(0), Pr.sy(z.rh)), bw, Math.abs(Pr.sy(z.rh) - Pr.sy(0))); });
      if (x.fail) Pr.textPx(`at the fall r̂ = ${fmt(x.rh)}: most of the −1 was already predicted`, Pr.W - Pr.pad.r, Pr.sy(-0.85), { align: 'right', font: '11px "IBM Plex Sans"', color: '#c0392b' });
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * 8; while (acc > 1) { acc--; if (k < rec.length - 1) k++; else { $('#ck-play').textContent = 'Play'; draw(); return false; } } draw(); });
    $('#ck-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Play'; } else { if (k >= rec.length - 1) k = 0; loop.start(); e.target.textContent = 'Pause'; } });
    $('#ck-other').addEventListener('click', () => { loop.stop(); $('#ck-play').textContent = 'Play'; pick++; load(); });
    if (found.length) load(); else st.textContent = 'no suitable trial found';
  })();

  /* ------------------------------------------------ 10. full system */
  let trained = null;
  (function () {
    const el = $('#sys-diagram');
    el.innerHTML = `<svg viewBox="0 0 820 260" role="img" aria-label="ASE/ACE architecture"><defs><marker id="ah3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>
      <rect x="10" y="95" width="170" height="70" rx="10" fill="#f6f6f4" stroke="#111" stroke-width="1.5"/><text x="95" y="125" text-anchor="middle" font-size="15" font-weight="600">Cart–pole</text><text x="95" y="145" text-anchor="middle" font-size="11.5" fill="#6b6b68">(unknown to the learner)</text>
      <rect x="250" y="95" width="130" height="70" rx="10" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="315" y="125" text-anchor="middle" font-size="15" font-weight="600">Decoder</text><text x="315" y="145" text-anchor="middle" font-size="11.5" fill="#6b6b68">162 boxes</text>
      <rect x="470" y="10" width="330" height="80" rx="10" fill="#fff" stroke="#c0392b" stroke-width="1.6"/><text x="635" y="42" text-anchor="middle" font-size="15" font-weight="600">Critic (ACE)</text><text x="635" y="64" text-anchor="middle" font-size="11.5" fill="#6b6b68">predictions p: how dangerous is this box?</text>
      <rect x="470" y="170" width="330" height="80" rx="10" fill="#fff" stroke="#2a78d6" stroke-width="1.6"/><text x="635" y="202" text-anchor="middle" font-size="15" font-weight="600">Actor (ASE)</text><text x="635" y="224" text-anchor="middle" font-size="11.5" fill="#6b6b68">weights w, signed eligibilities e</text>
      <path d="M180 130 H246" stroke="#111" stroke-width="1.5" marker-end="url(#ah3)"/><text x="213" y="122" text-anchor="middle" font-size="11">state</text>
      <path d="M380 120 L466 55" stroke="#111" stroke-width="1.5" fill="none" marker-end="url(#ah3)"/><path d="M380 140 L466 205" stroke="#111" stroke-width="1.5" fill="none" marker-end="url(#ah3)"/><text x="410" y="132" font-size="11">box</text>
      <path d="M635 90 V166" stroke="#c0392b" stroke-width="2.2" marker-end="url(#ah3)"/><text x="645" y="133" font-size="12" fill="#b52e2d">internal reinforcement r̂</text>
      <path d="M95 30 H466" stroke="#c0392b" stroke-width="1.4" stroke-dasharray="4 3" fill="none" marker-end="url(#ah3)"/><path d="M95 95 V30" stroke="#c0392b" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/><text x="250" y="24" font-size="11" fill="#b52e2d">failure signal r (−1 or 0)</text>
      <path d="M470 235 H95 V169" stroke="#2a78d6" stroke-width="1.5" fill="none" marker-end="url(#ah3)"/><text x="260" y="228" font-size="11" fill="#1f5fae">action: push left or right</text></svg>`;
    const C = new Plot('#as-cart', { w: 520, h: 250 }), P = new Plot('#as-plot', { w: 560, h: 320, pad: { l: 56, r: 12, t: 12, b: 32 } });
    const speed = UL.seg('as-speed'); let L, last = null, mode = 'idle', watchS = null, watchT = 0;
    function reset() { L = new AseAce({ seed: +$('#as-seed').value || 1 }); last = null; mode = 'idle'; trained = null; $('#as-watch').disabled = true; $('#as-run').textContent = 'Train'; draw(); }
    const solved = () => L.lens.length && L.lens[L.lens.length - 1] >= 20000;
    function draw() {
      logChart(P, L.lens, { minTrials: 80 });
      const s = mode === 'watchTrained' ? watchS : last ? last.s : [0, 0, 0, 0];
      UL.drawCart(C, s, { push: last && !last.fail ? last.y === 1 : null, fallen: last && last.fail && mode !== 'watchTrained', limits: true, text: mode === 'watchTrained' ? `trained controller: ${(watchT * 0.02).toFixed(1)} s` : `trial ${L.trial}, step ${L.t}` });
      UL.stats('as-stats', [{ k: 'failures so far', v: solved() ? L.lens.length - 1 : L.lens.length }, { k: 'longest trial', v: L.lens.length ? Math.max(...L.lens).toLocaleString('en-US') : '–' }, { k: 'status', v: solved() ? `<b>solved</b>` : mode === 'train' ? 'learning…' : '–', hi: true }]);
    }
    const loop = UL.loop(() => {
      if (mode === 'train') {
        if (speed.value === 'fast') { const t0 = performance.now(); while (performance.now() - t0 < 14) { const o = L.step(); last = o; if (o.fail) L.newTrial(); else if (L.t >= 20000) { L.lens.push(20000); finish(); break; } if (L.lens.length >= 400) { finish(); break; } } }
        else { for (let i = 0; i < 3; i++) { const o = L.step(); last = o; if (o.fail) { L.newTrial(); break; } if (L.t >= 20000) { L.lens.push(20000); finish(); break; } } }
        draw(); return mode === 'train';
      }
      if (mode === 'watchTrained') { for (let i = 0; i < 1; i++) { const b = CP.box(watchS), y = trained.w[b] >= 0; watchS = CP.step(watchS, y); watchT++; last = { s: watchS, y: y ? 1 : 0, fail: false }; if (CP.failed(watchS)) { watchS = [0, 0, 0, 0]; watchT = 0; } } draw(); return true; }
      return false;
    });
    function finish() { mode = 'done'; $('#as-run').textContent = 'Train'; if (solved()) { trained = L; $('#as-watch').disabled = false; document.dispatchEvent(new Event('rl-trained')); } }
    $('#as-run').addEventListener('click', (e) => { if (mode === 'train') { mode = 'paused'; e.target.textContent = 'Continue'; return; } if (mode === 'done' || mode === 'watchTrained') reset(); mode = 'train'; e.target.textContent = 'Pause'; loop.start(); });
    $('#as-watch').addEventListener('click', () => { mode = 'watchTrained'; watchS = [0, 0, rad(1), 0]; watchT = 0; loop.start(); });
    $('#as-reset').addEventListener('click', () => { loop.stop(); reset(); });
    $('#as-seed').addEventListener('change', () => { loop.stop(); reset(); });
    reset();
  })();

  /* ------------------------------------------------ 11. what did it learn */
  (function () {
    const W = new Plot('#lr-w', { w: 520, h: 230, pad: { l: 110, r: 10, t: 10, b: 40 } }), V = new Plot('#lr-v', { w: 520, h: 230, pad: { l: 110, r: 10, t: 10, b: 40 } }), foot = $('#lr-foot');
    const TH = ['< −6°', '−6…−1°', '−1…0°', '0…1°', '1…6°', '> 6°'], TD = ['falling left fast', 'slow', 'falling right fast'];
    function grid(P, val) {
      P.clear(); P.domain(-0.5, 5.5, -0.5, 2.5); const c = P.ctx, cw = P.sx(1) - P.sx(0), ch = P.sy(0) - P.sy(1);
      for (let bt = 0; bt < 6; bt++) for (let btd = 0; btd < 3; btd++) { const b = 1 + 3 * 1 + 9 * bt + 54 * btd, [fill, txt] = val(b), X = P.sx(bt) - cw / 2, Y = P.sy(2 - btd) - ch / 2; c.fillStyle = fill; c.fillRect(X + 1, Y + 1, cw - 2, ch - 2); P.textPx(txt, P.sx(bt), P.sy(2 - btd), { font: '500 12px "IBM Plex Mono"', color: '#111' }); }
      TH.forEach((t, i) => P.textPx(t, P.sx(i), P.H - P.pad.b + 12, { font: '10.5px "IBM Plex Mono"', color: '#6b6b68' })); P.textPx('pole angle θ', P.W / 2 + 50, P.H - 8, { font: '11px "IBM Plex Sans"' });
      TD.forEach((t, j) => P.textPx(t, P.pad.l - 8, P.sy(2 - j), { align: 'right', font: '11px "IBM Plex Sans"', color: '#3d3d3b' }));
    }
    function draw() {
      if (!trained) { [W, V].forEach((P) => { P.clear(); P.textPx('train the system in section 10 first', P.W / 2, P.H / 2, { color: '#a3a3a0', font: '13px "IBM Plex Sans"' }); }); return; }
      grid(W, (b) => { const w = trained.w[b]; if (w === 0) return ['#f1f0ec', 'never']; return [w > 0 ? 'rgba(42,120,214,.75)' : 'rgba(192,57,43,.75)', w > 0 ? '→ right' : '← left']; });
      grid(V, (b) => [UL.heat(trained.v[b], -0.6), fmt(trained.v[b])]);
      foot.innerHTML = 'Read the actor by rows: when the pole is <b>falling fast</b>, it pushes in the direction of the fall, whatever the angle. It reacts first to how the pole is <em>moving</em>: the hand-written rule 2, found from the failure signal alone. The critic marks the boxes it has learned to fear; it only knows the dangers it has experienced, so a different seed gives a different picture.';
    }
    document.addEventListener('rl-trained', draw); draw();
  })();

  /* ------------------------------------------------ 12. compare */
  (function () {
    const tbl = $('#cmp-table'), st = $('#cmp-status');
    const LS = [['Actor alone (raw failure signal)', (s) => new AseAce({ seed: s, critic: false })], ['Q-learning on the boxes', (s) => new BoxQ({ seed: s })], ['Actor + critic (ASE/ACE)', (s) => new AseAce({ seed: s })]];
    function show(res) {
      tbl.innerHTML = '<thead><tr><th>learner</th><th>runs solved (of 10)</th><th>failures needed (median of solved runs)</th><th>range</th></tr></thead><tbody>' + LS.map(([n], i) => {
        const r = res[i] || [], ok = r.filter((x) => x != null).sort((a, b) => a - b), med = ok.length ? ok[Math.floor((ok.length - 1) / 2)] : null;
        return `<tr><td>${n}</td><td>${r.length ? `${ok.length}${r.length < 10 ? ` <small>(${r.length} run)</small>` : ''}` : '–'}</td><td>${med != null ? med : '–'}</td><td>${ok.length ? `${ok[0]}–${ok[ok.length - 1]}` : '–'}</td></tr>`;
      }).join('') + '</tbody>';
    }
    $('#cmp-run').addEventListener('click', () => {
      const btn = $('#cmp-run'); btn.disabled = true; const res = [[], [], []]; let li = 0, seed = 1, L = LS[0][1](1);
      const chunk = () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 30) {
          const T = L.runTrial(20000);
          if (T >= 20000 || L.lens.length >= 400) {
            res[li].push(T >= 20000 ? L.lens.length - 1 : null); seed++;
            if (seed > 10) { li++; seed = 1; } if (li >= LS.length) { show(res); st.textContent = 'done'; btn.disabled = false; return; }
            L = LS[li][1](seed); show(res); st.textContent = `${LS[li][0]}: seed ${seed}`; break;
          }
        }
        setTimeout(chunk, 0);
      };
      st.textContent = `${LS[0][0]}: seed 1`; show(res); chunk();
    });
    show([]);
  })();

  UL.quiz('quiz-box', [
    { q: 'Why does the state of the pendulum need the angular velocity θ̇, not only the angle θ?', o: ['Because rewards depend on it', 'A pole at 3° that is falling needs a different push from one at 3° coming back: θ alone is not Markov', 'To make the table bigger', 'Because Gymnasium requires it'], a: 1, why: 'The Markov property from Part 2: the state must contain enough information to predict the next state.' },
    { q: 'With the reward "0 every step, −1 at failure", when does the learner get any information?', o: ['Every step', 'Only when the pole has already fallen', 'Only at the start', 'Never'], a: 1, why: 'That is what makes this credit assignment problem so hard, and why a critic helps.' },
    { q: 'A box had e = +0.04 (it had been pushing right). The pole falls: r̂ = −1, α = 1000. Its weight changes by…', o: ['+40: push right more', '−40: push left next time', '0', '−1'], a: 1, why: 'Δw = 1000 × (−1) × 0.04 = −40. Blame reverses what was done.' },
    { q: 'What is the critic\'s internal reinforcement r̂ = r + γ p(new) − p(old)?', o: ['The return', 'The TD error of Part 4', 'The policy', 'The eligibility'], a: 1, why: 'Moving into a box predicted to be dangerous gives r̂ < 0 before any failure: blame arrives early.' },
    { q: 'Why does the ASE/ACE system learn faster than Q-learning on the same 162 boxes?', o: ['It uses a neural network', 'Traces credit many recent boxes at once, and the critic gives a signal at every step', 'It knows the equations of motion', 'It uses a smaller α'], a: 1, why: 'Q-learning passes blame back one box per failure; the actor–critic spreads and advances it.' },
  ]);
  UL.start();
})();
