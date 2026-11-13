/*!
 * Reinforcement Lab — The brain and the limits
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, Plot, GridView, grid, fmt, rng, Learner } = UL;
  const redraws = [];
  document.addEventListener('ul-redraw', () => redraws.forEach((f) => f()));

  /* ------------------------------------------------ 2. TD simulation */
  (function () {
    const PV = new Plot('#da-v', { w: 860, h: 190, pad: { l: 46, r: 12, t: 22, b: 10 } }), PD = new Plot('#da-d', { w: 860, h: 220, pad: { l: 46, r: 12, t: 22, b: 34 } });
    const nS = UL.range('da-n', draw), cues = UL.seg('da-cues', draw), w = $('#da-with'), foot = $('#da-foot');
    const T = 20, REW = 15, alpha = 0.2;
    function simulate(n, two, withhold) {
      const first = two ? 3 : 4, trig = 8, V = new Float64Array(T + 1); let d = null;
      for (let k = 1; k <= n; k++) {
        const last = k === n, learn = !(last && withhold); d = new Float64Array(T);
        for (let t = 0; t < T; t++) {
          const r = t === REW && !(last && withhold) ? 1 : 0, vt = t > first ? V[t] : 0, vn = t + 1 > first ? V[t + 1] : 0;
          d[t] = r + vn - vt; if (learn && t > first) V[t] += alpha * d[t];
        }
      }
      return { V, d, first, trig };
    }
    function draw() {
      const two = cues.value === '2', { V, d, first, trig } = simulate(nS.v, two, w.checked);
      PV.clear(); PV.domain(-0.5, T - 0.5, 0, 1.15); PV.axes({ x: false, ylabel: 'prediction V', ny: 2 });
      const c = PV.ctx, bw = PV.sx(1) - PV.sx(0); c.fillStyle = '#9dbbda';
      for (let t = 0; t < T; t++) { const v = t > first ? V[t] : 0; if (v > 0.001) c.fillRect(PV.sx(t) - bw / 2, PV.sy(v), bw, PV.sy(0) - PV.sy(v)); }
      PD.clear(); PD.domain(-0.5, T - 0.5, -1.15, 1.15); PD.axes({ xlabel: 'time step within a trial', ylabel: 'TD error δ ("dopamine")', ny: 4 });
      PD.line(-0.5, 0, T - 0.5, 0, { color: '#111', w: 1 }); const c2 = PD.ctx, bw2 = (PD.sx(1) - PD.sx(0)) * 0.7;
      for (let t = 0; t < T; t++) { const v = d[t]; if (Math.abs(v) < 0.003) continue; c2.fillStyle = v < 0 ? '#c0392b' : '#2a78d6'; c2.fillRect(PD.sx(t) - bw2 / 2, Math.min(PD.sy(0), PD.sy(v)), bw2, Math.abs(PD.sy(v) - PD.sy(0))); }
      const marks = two ? [[first, 'instruction cue'], [trig, 'trigger cue'], [REW, w.checked ? 'juice WITHHELD' : 'juice']] : [[first, 'light (cue)'], [REW, w.checked ? 'juice WITHHELD' : 'juice']];
      [PV, PD].forEach((P, i) => marks.forEach(([x, lab]) => { P.line(x, P.dom[2], x, P.dom[3], { color: '#a3a3a0', dash: [3, 4], w: 1 }); if (i === 0) P.textPx(lab, P.sx(x) + 4, 10, { align: 'left', font: '11px "IBM Plex Sans"', color: lab.includes('WITH') ? '#c0392b' : '#6b6b68' }); }));
      const n = nS.v, atR = d[REW], atC = d[first];
      foot.innerHTML = w.checked ? `Juice withheld after ${n - 1} trials of learning: at the expected time δ = <b class="neg">${fmt(atR)}</b>. "I predicted juice and got none": the firing drops below normal.`
        : n === 1 ? 'Trial 1: nothing is predicted, so the juice is a complete surprise: δ = +1 at the juice.'
        : atC > 0.9 ? `Trial ${n}: the juice is fully predicted (δ ≈ ${fmt(atR)} there). The only surprise left is the ${two ? 'instruction cue' : 'cue'}: δ = ${fmt(atC)}.`
        : `Trial ${n}: the prediction is growing backwards and the surprise moves with it, towards the ${two ? 'instruction cue, past the trigger cue' : 'cue'}.`;
    }
    w.addEventListener('change', draw);
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * 30; let ch = false; while (acc > 1) { acc--; if (nS.v < 400) { nS.set(nS.v + 1); ch = true; } } if (ch) draw(); if (nS.v >= 400) { $('#da-play').textContent = 'Play'; return false; } });
    $('#da-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Play'; } else { if (nS.v >= 400) nS.set(1); loop.start(); e.target.textContent = 'Pause'; } });
    draw();
  })();

  /* ------------------------------------------------ 3. striatum diagram */
  $('#st-diagram').innerHTML = `<svg viewBox="0 0 860 300" role="img" aria-label="Actor and critic mapped to the striatum"><defs><marker id="ah4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>
    <text x="10" y="22" font-size="14" font-weight="600">Reinforcement learning (Part 5)</text><text x="460" y="22" font-size="14" font-weight="600">The brain (a proposed match)</text>
    <line x1="430" y1="10" x2="430" y2="290" stroke="#e7e7e4" stroke-width="1.5"/>
    <rect x="10" y="50" width="190" height="70" rx="10" fill="#fff" stroke="#2a78d6" stroke-width="1.6"/><text x="105" y="80" text-anchor="middle" font-size="15" font-weight="600">Actor</text><text x="105" y="102" text-anchor="middle" font-size="11.5" fill="#6b6b68">chooses actions</text>
    <rect x="10" y="200" width="190" height="70" rx="10" fill="#fff" stroke="#2a78d6" stroke-width="1.6"/><text x="105" y="230" text-anchor="middle" font-size="15" font-weight="600">Critic</text><text x="105" y="252" text-anchor="middle" font-size="11.5" fill="#6b6b68">predicts reward: V</text>
    <rect x="250" y="125" width="160" height="70" rx="10" fill="#fff" stroke="#c0392b" stroke-width="1.6"/><text x="330" y="155" text-anchor="middle" font-size="15" font-weight="600">TD error δ</text><text x="330" y="177" text-anchor="middle" font-size="11.5" fill="#6b6b68">better / worse than expected</text>
    <path d="M250 145 L204 100" stroke="#c0392b" stroke-width="2" fill="none" marker-end="url(#ah4)"/><path d="M250 175 L204 220" stroke="#c0392b" stroke-width="2" fill="none" marker-end="url(#ah4)"/>
    <rect x="460" y="50" width="230" height="70" rx="10" fill="#fff" stroke="#2a78d6" stroke-width="1.6"/><text x="575" y="80" text-anchor="middle" font-size="15" font-weight="600">Dorsolateral striatum</text><text x="575" y="102" text-anchor="middle" font-size="11.5" fill="#6b6b68">action selection</text>
    <rect x="460" y="200" width="230" height="70" rx="10" fill="#fff" stroke="#2a78d6" stroke-width="1.6"/><text x="575" y="230" text-anchor="middle" font-size="15" font-weight="600">Ventral striatum</text><text x="575" y="252" text-anchor="middle" font-size="11.5" fill="#6b6b68">prediction, evaluation</text>
    <rect x="720" y="125" width="130" height="70" rx="10" fill="#fff" stroke="#c0392b" stroke-width="1.6"/><text x="785" y="155" text-anchor="middle" font-size="14" font-weight="600">Dopamine</text><text x="785" y="177" text-anchor="middle" font-size="11.5" fill="#6b6b68">midbrain neurons</text>
    <path d="M720 145 L694 100" stroke="#c0392b" stroke-width="2" fill="none" marker-end="url(#ah4)"/><path d="M720 175 L694 220" stroke="#c0392b" stroke-width="2" fill="none" marker-end="url(#ah4)"/></svg>`;

  /* ------------------------------------------------ 4. luck */
  (function () {
    const P = new Plot('#lk-plot', { w: 560, h: 300, pad: { l: 44, r: 10, t: 16, b: 32 } });
    function draw(res) {
      if (!res.length) { P.clear(); P.textPx('press "Run 10 seeds"', P.W / 2, P.H / 2, { color: '#a3a3a0', font: '13px "IBM Plex Sans"' }); return; }
      const vals = Array.from({ length: 10 }, (_, i) => (i < res.length ? res[i] : null));
      UL.bars(P, vals.map((v, i) => ({ v: v == null ? 0 : v === -1 ? 400 : v, label: `seed ${i + 1}`, color: v === -1 ? '#e4e4e0' : '#2a78d6' })), { ymin: 0, ymax: 420, values: false, ylabel: 'failures before balancing' });
      vals.forEach((v, i) => { if (v != null) P.textPx(v === -1 ? 'never' : String(v), P.sx(i), P.sy(v === -1 ? 400 : v) - 9, { font: '500 11px "IBM Plex Mono"', color: v === -1 ? '#c0392b' : '#111' }); });
      const ok = res.filter((v) => v >= 0).sort((a, b) => a - b);
      UL.stats('lk-stats', [{ k: 'runs that learned to balance', v: `${ok.length} <small>of ${res.length}</small>` }, { k: 'fastest', v: ok.length ? ok[0] : '–' }, { k: 'slowest', v: ok.length ? ok[ok.length - 1] : '–' }]);
    }
    $('#lk-run').addEventListener('click', () => {
      const btn = $('#lk-run'); btn.disabled = true; const res = []; let seed = 1, L = new UL.BoxQ({ seed });
      const chunk = () => { const t0 = performance.now();
        while (performance.now() - t0 < 30) { const T = L.runTrial(20000); if (T >= 20000 || L.lens.length >= 400) { res.push(T >= 20000 ? L.lens.length - 1 : -1); draw(res); seed++; if (seed > 10) { btn.disabled = false; return; } L = new UL.BoxQ({ seed }); break; } }
        setTimeout(chunk, 0); };
      chunk();
    });
    draw([]);
  })();

  /* ------------------------------------------------ 6. tennis ball */
  (function () {
    const A = new Plot('#tb-free', { w: 440, h: 260 }), B = new Plot('#tb-model', { w: 440, h: 260 }), st = $('#tb-status');
    const NX = 18, NY = 4, xs = Array.from({ length: NX }, (_, i) => 0.4 + i * (9.2 / (NX - 1))), ys = Array.from({ length: NY }, (_, j) => 2.3 + j * 0.55), T0 = 1.2, T1 = 5.6, r = rng(3);
    let tried, n, cur;
    function scene(P, title) {
      P.clear(); P.domain(0, 10, -0.2, 4.6, true); const c = P.ctx; P.line(0, 0, 10, 0, { color: '#111', w: 2 });
      c.fillStyle = '#8b5a2b'; c.fillRect(P.sx(T0), P.sy(1.12), P.sx(T1) - P.sx(T0), P.sy(1.0) - P.sy(1.12)); [T0 + 0.2, T1 - 0.2].forEach((x) => P.line(x, 0, x, 1.0, { color: '#8b5a2b', w: 4 }));
      P.textPx('table', (P.sx(T0) + P.sx(T1)) / 2, P.sy(0.5), { color: '#5a3a1a', font: '11px "IBM Plex Sans"' }); if (title) P.textPx(title, P.W / 2, 12, { font: '12px "IBM Plex Sans"', color: '#3d3d3b' });
    }
    const bad = (x) => x >= T0 && x <= T1;
    function draw() {
      scene(A, `trial ${n} · ${tried.size} of ${NX * NY} release points tried`);
      tried.forEach((k) => { const i = k % NX, j = Math.floor(k / NX); A.marker(xs[i], ys[j], { r: 5, fill: bad(xs[i]) ? '#c0392b' : '#7fb77e', ring: false, alpha: 0.85 }); });
      if (cur != null) { const i = cur % NX, j = Math.floor(cur / NX); A.line(xs[i], ys[j], xs[i], bad(xs[i]) ? 1.12 : 0, { color: '#a3a3a0', dash: [3, 3], w: 1 }); A.marker(xs[i], ys[j], { r: 8, fill: '#d7e35a', stroke: '#111' }); }
      scene(B, 'things fall straight down');
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) B.marker(xs[i], ys[j], { r: 5, fill: bad(xs[i]) ? '#c0392b' : '#7fb77e', ring: false, alpha: 0.85 });
      st.innerHTML = tried.size < NX * NY ? `${NX * NY - tried.size} points still unknown to the model-free learner` : `it needed <b>${n}</b> trials to learn what the model knew from the start`;
    }
    function reset() { tried = new Set(); n = 0; cur = null; draw(); }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * 10; while (acc > 1) { acc--; cur = r.int(NX * NY); tried.add(cur); n++; } draw(); if (tried.size >= NX * NY) { $('#tb-play').textContent = 'Let it try'; return false; } });
    $('#tb-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Let it try'; } else { if (tried.size >= NX * NY) reset(); loop.start(); e.target.textContent = 'Pause'; } });
    $('#tb-reset').addEventListener('click', () => { loop.stop(); $('#tb-play').textContent = 'Let it try'; reset(); });
    reset();
  })();

  /* ------------------------------------------------ 7. behavioural cloning */
  (function () {
    const g = grid('big'), V = new GridView('#bc-grid', g, { cell: 58 }), foot = $('#bc-foot'), dist = g.distTo(), r = rng(8);
    const expert = (s) => { let b = 0, bd = Infinity; for (let a = 0; a < 4; a++) { const o = g.step(s, a); if (!o.bump && dist[o.s2] < bd) { bd = dist[o.s2]; b = a; } } return b; };
    let table, path, start, asks;
    function reset() { table = new Map(); path = null; start = g.s0; asks = 0; foot.innerHTML = 'Start by recording an expert run.'; draw(); }
    function draw() {
      const fill = {}; table.forEach((_, s) => { fill[s] = 'rgba(42,120,214,.16)'; });
      const pol = {}; table.forEach((a, s) => { pol[s] = a; });
      V.draw({ cellFill: fill, policy: pol, policyColor: 'rgba(42,120,214,.6)', path, pathColor: '#c0392b', agent: path ? path[path.length - 1] : start, ghost: start });
      UL.stats('bc-stats', [{ k: 'states with an example', v: `${table.size} <small>of ${g.states().length - 1}</small>` }, { k: 'expert labels asked (DAgger)', v: asks }]);
    }
    function runClone(from) {
      let s = from; path = [s]; let ok = false, lost = 0;
      for (let t = 0; t < 60; t++) { const known = table.has(s), a = known ? table.get(s) : r.int(4); if (!known) lost++; const o = g.step(s, a); s = o.s2; path.push(s); if (o.done) { ok = true; break; } }
      return { ok, lost, visited: [...new Set(path)] };
    }
    $('#bc-demo').addEventListener('click', () => { let s = g.s0; path = [s]; for (let t = 0; t < 60 && s !== g.goal; t++) { const a = expert(s); table.set(s, a); s = g.step(s, a).s2; path.push(s); } start = g.s0; foot.innerHTML = 'The expert drove the shortest route: 22 moves. The clone now has an example for each of those squares, and nothing else.'; draw(); });
    $('#bc-run').addEventListener('click', () => { start = g.s0; const o = runClone(start); foot.innerHTML = o.ok ? (o.lost ? `Reached the cheese, after ${o.lost} moves in squares it had no example for.` : 'From the start the clone copies the expert perfectly: reached the cheese.') : `Lost: ${o.lost} moves in squares without an example, no cheese in 60 steps.`; draw(); });
    V.p.cv.addEventListener('click', (e) => { const k = V.cellAt(e); if (k < 0 || g.isWall(k) || k === g.goal) return; start = k; const o = runClone(k); foot.innerHTML = o.ok ? `Started at a new square and still reached the cheese (${o.lost} moves without an example).` : `Started off the expert's route: the clone has no example here, wanders (${o.lost} unknown moves) and gets lost. One small deviation and the errors compound.`; draw(); });
    $('#bc-dagger').addEventListener('click', () => {
      let added = 0; for (let k = 0; k < 6; k++) { const ss = g.states().filter((s) => s !== g.goal), from = ss[r.int(ss.length)]; const o = runClone(from); o.visited.forEach((s) => { if (s !== g.goal && !table.has(s)) { table.set(s, expert(s)); added++; asks++; } }); }
      path = null; foot.innerHTML = `DAgger round: the clone was started from 6 random squares, and the expert labelled the ${added} new squares it visited. Click a square to test it.`; draw();
    });
    $('#bc-reset').addEventListener('click', reset);
    redraws.push(draw); reset();
  })();

  UL.quiz('quiz-box', [
    { q: 'After learning, the light comes on but the juice is withheld. What do the dopamine neurons do at the time the juice was expected?', o: ['Fire strongly', 'Nothing changes', 'Firing drops below normal: a negative prediction error', 'Fire at the light only next time'], a: 2, why: 'Exactly what the TD error does: predicted 1, got 0, δ = −1.' },
    { q: 'With two cues, where does the TD error end up after much learning?', o: ['At the juice', 'At the trigger cue', 'At the instruction cue, the earliest reliable predictor', 'Nowhere'], a: 2, why: 'It moves back until nothing earlier predicts the reward.' },
    { q: 'Why are RL results more sensitive to the random seed than supervised learning?', o: ['RL uses more data', 'The agent generates its own data, so early luck is amplified', 'RL has no parameters', 'Supervised learning has no randomness'], a: 1, why: 'A lucky start gives good data, which gives a better policy, which gives better data.' },
    { q: 'What is the main weakness of behavioural cloning?', o: ['It needs a reward', 'It has no example for states the expert never visited, so small mistakes compound', 'It is too slow', 'It needs a world model'], a: 1, why: 'DAgger fixes it by asking the expert about the states the learner actually reaches.' },
    { q: 'What does a world model let an agent do?', o: ['Nothing new', 'Predict what an action will do, so it can plan or practise in imagination instead of trying everything', 'Remove the need for rewards', 'Use larger tables'], a: 1, why: 'With the model, the maze was solved by 8 sweeps of calculation, with no trials.' },
  ]);
  UL.start();
})();
