/*!
 * Reinforcement Lab — The maze and Monte Carlo
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, $$, Plot, GridView, grid, fmt, Learner, rng } = UL;
  const redraws = [];
  document.addEventListener('ul-redraw', () => redraws.forEach((f) => f()));

  /* ------------------------------------------------ 2. world model */
  (function () {
    const g = grid('small'), V = new GridView('#wm-grid', g, { cell: 88 }), out = $('#wm-out');
    let sel = g.s0;
    const aS = UL.seg('wm-a', draw), vw = UL.seg('wm-view', draw);
    function draw() {
      const a = +aS.value, o = g.step(sel, a), [c, r] = g.cr(sel), [c2, r2] = g.cr(o.s2), agent = vw.value === 'agent';
      if (agent) {
        V.p.clear(); const P = V.p; P.ctx.fillStyle = '#f6f6f4'; P.ctx.fillRect(0, 0, P.W, P.H);
        P.textPx(`state (${c}, ${r})   ·   action ${a}`, P.W / 2, P.H / 2 - 18, { font: '500 18px "IBM Plex Mono", monospace' });
        P.textPx('next state ?    reward ?', P.W / 2, P.H / 2 + 18, { font: '500 18px "IBM Plex Mono", monospace', color: '#a3a3a0' });
        out.innerHTML = `<span class="k">what the agent knows</span><span>nothing about (${c},${r}), or what ${a} means</span><span class="k">p(s′, r | s, a)</span><span>unknown: it must try it</span>`;
      } else {
        V.draw({ coords: true, agent: sel, path: [sel, o.s2], hiCell: o.s2, hiColor: o.bump ? '#eda100' : '#2a78d6' });
        out.innerHTML = `<span class="k">state s</span><span>(${c}, ${r})</span><span class="k">action a</span><span>${a} (${UL.ACTS[a]})</span><span class="k">next state s′</span><span class="hl">(${c2}, ${r2})${o.bump ? ' : blocked, stays' : ''}</span><span class="k">reward r</span><span class="hl">${fmt(o.r, 0)}</span><span class="k">p(s′, r | s, a)</span><span>1 for this pair, 0 for all others (the maze is not random)</span>`;
      }
    }
    V.p.cv.addEventListener('click', (e) => { const k = V.cellAt(e); if (k >= 0 && !g.isWall(k) && k !== g.goal) { sel = k; draw(); } });
    redraws.push(draw); draw();
  })();

  /* ------------------------------------------------ 3. random rat */
  (function () {
    const g = grid('small'), V = new GridView('#rnd-grid', g, { cell: 88 }), H = new Plot('#rnd-hist', { w: 420, h: 200, pad: { l: 34, r: 10, t: 10, b: 30 } });
    const r = rng(11); let path = [g.s0], timer = null, hist = null, n = 0, succ = 0;
    function draw(agent, msg) { V.draw({ path, agent: agent != null ? agent : path[path.length - 1], jitter: true, msg }); }
    function stats() { UL.stats('rnd-stats', [{ k: 'episodes sampled', v: n }, { k: 'reached the cheese', v: n ? `${succ} <small>(${((100 * succ) / n).toFixed(1)}%)</small>` : '–' }]); }
    function drawHist() {
      if (!hist) { H.clear(); H.textPx('sample episodes to fill the histogram', H.W / 2, H.H / 2, { color: '#a3a3a0', font: '12px "IBM Plex Sans"' }); return; }
      const keys = Array.from({ length: 14 }, (_, i) => -20 + i);
      UL.bars(H, keys.map((k) => ({ v: hist[k] || 0, label: k % 2 === 0 ? fmt(k, 0) : '', color: k === -20 ? '#c9c9c4' : '#2a78d6' })), { values: false, ymin: 0 });
    }
    function episode() { let s = g.s0, ret = 0; const p = [s]; for (let t = 0; t < g.cap; t++) { const o = g.step(s, r.int(4)); ret += o.r; s = o.s2; p.push(s); if (o.done) return { p, ret, ok: true }; } return { p, ret, ok: false }; }
    $('#rnd-one').addEventListener('click', () => {
      clearInterval(timer); const e = episode(); let i = 1; path = [e.p[0]];
      timer = setInterval(() => { path = e.p.slice(0, ++i); draw(); if (i >= e.p.length) { clearInterval(timer); draw(null, e.ok ? `reached the cheese: ${fmt(e.ret, 0)}` : `cut off at 20 steps: ${fmt(e.ret, 0)}`); n++; succ += e.ok; stats(); } }, 160);
    });
    $('#rnd-many').addEventListener('click', () => {
      clearInterval(timer); hist = hist || {}; let lucky = null;
      for (let k = 0; k < 1000; k++) { const e = episode(); n++; if (e.ok) { succ++; if (!lucky) lucky = e; } hist[e.ret] = (hist[e.ret] || 0) + 1; }
      if (lucky) { path = lucky.p; draw(null, `one of the lucky ones: ${fmt(lucky.ret, 0)}`); }
      stats(); drawHist();
    });
    redraws.push(() => draw()); draw(); stats(); drawHist();
  })();

  /* ------------------------------------------------ 4. returns backwards */
  (function () {
    const g = grid('small'), V = new GridView('#lk-grid', g, { cell: 88 }), tbl = $('#lk-table'), st = $('#lk-status');
    const steps = UL.LUCKY.map(([[c, r], a]) => { const s = g.key(c, r), o = g.step(s, a); return { s, a, r: o.r, s2: o.s2, bump: o.bump }; });
    const G = []; let nx = 0; for (let i = steps.length - 1; i >= 0; i--) { G[i] = steps[i].r + 0.8 * nx; nx = G[i]; }
    let k = steps.length; // rows computed from index k
    function draw() {
      const cur = k < steps.length ? k : null;
      V.draw({ path: [steps[0].s, ...steps.map((x) => x.s2)], bumps: steps.filter((x) => x.bump).map((x) => x.s), agent: cur != null ? steps[cur].s : UL.grid('small').s0, hiCell: cur != null ? steps[cur].s : null, jitter: false });
      tbl.innerHTML = '<thead><tr><th>t</th><th>state</th><th>action</th><th>R</th><th>return G (γ = 0.8)</th></tr></thead><tbody>' + steps.map((x, i) => {
        const [c, r] = g.cr(x.s), done = i >= k, nxt = i + 1 < steps.length ? G[i + 1] : 0;
        return `<tr class="${i === cur ? 'on' : ''}"><td>${i}</td><td>(${c},${r})</td><td>${UL.ACTS[x.a]}${x.bump ? ' <span class="pill">bump</span>' : ''}</td><td>${fmt(x.r, 0)}</td><td>${done ? `${fmt(x.r, 0)} + 0.8 × ${nxt < 0 ? '(' + fmt(nxt) + ')' : fmt(nxt)} = <b>${fmt(G[i])}</b>` : ''}</td></tr>`;
      }).join('') + '</tbody>';
      st.innerHTML = k === steps.length ? 'start at the <b>end</b>' : k === 0 ? 'done: <b>G₀ = −4.46</b>' : `computed t = ${k} … ${steps.length - 1}`;
    }
    $('#lk-next').addEventListener('click', () => { if (k > 0) k--; draw(); });
    $('#lk-all').addEventListener('click', () => { k = 0; draw(); });
    $('#lk-reset').addEventListener('click', () => { k = steps.length; draw(); });
    redraws.push(draw); draw();
  })();

  /* ------------------------------------------------ 6. risk */
  (function () {
    const A = new Plot('#rk-a', { w: 380, h: 220, pad: { l: 30, r: 10, t: 12, b: 30 } }), B = new Plot('#rk-b', { w: 380, h: 220, pad: { l: 30, r: 10, t: 12, b: 30 } });
    const r = rng(5); let a = [], b = [];
    function hist(P, xs, col) {
      P.clear(); P.domain(-8, 0, 0, Math.max(8, ...[...Array(16)].map((_, i) => xs.filter((x) => x >= -8 + i * 0.5 && x < -7.5 + i * 0.5).length)) * 1.15);
      P.axes({ ny: 3, xlabel: 'return' }); const c = P.ctx;
      for (let i = 0; i < 16; i++) { const lo = -8 + i * 0.5, n = xs.filter((x) => x >= lo && x < lo + 0.5).length; if (!n) continue; c.fillStyle = col; c.fillRect(P.sx(lo) + 1, P.sy(n), P.sx(lo + 0.5) - P.sx(lo) - 2, P.sy(0) - P.sy(n)); }
      if (xs.length) { const m = xs.reduce((s, x) => s + x, 0) / xs.length; P.line(m, P.dom[2], m, P.dom[3], { color: '#111', w: 2 }); P.textPx(`Q = ${fmt(m)}`, P.sx(m) + (m < -4 ? 6 : -6), P.pad.t + 10, { align: m < -4 ? 'left' : 'right', font: '500 12px "IBM Plex Mono"' }); }
    }
    function draw() { hist(A, a, '#2a78d6'); hist(B, b, '#c0392b'); $('#rk-foot').innerHTML = a.length ? `After ${a.length} samples each, both averages are about −4: <b>Q(s, A) ≈ Q(s, B)</b>. To the agent the two actions look identical. Would you treat them the same?` : 'Sample some returns.'; }
    $('#rk-go').addEventListener('click', () => { for (let i = 0; i < 10; i++) { a.push(-4 + r.normal() * 0.12); b.push((r() < 0.5 ? -1.5 : -6.5) + r.normal() * 0.12); } draw(); });
    $('#rk-reset').addEventListener('click', () => { a = []; b = []; draw(); });
    draw();
  })();

  /* ------------------------------------------------ 7. Q-table by averaging */
  (function () {
    const g = grid('small'), V = new GridView('#qt-grid', g, { cell: 100 }), calc = $('#qt-calc');
    const steps = UL.LUCKY.map(([[c, r], a]) => { const s = g.key(c, r), o = g.step(s, a); return { s, a, r: o.r }; });
    const G = []; let nx = 0; for (let i = steps.length - 1; i >= 0; i--) { G[i] = steps[i].r + 0.8 * nx; nx = G[i]; }
    let Q, k, last;
    function reset() { Q = new Float64Array(g.N * 4); k = steps.length; last = null; draw(); }
    function next() { if (k === 0) return; k--; const x = steps[k], old = Q[x.s * 4 + x.a]; Q[x.s * 4 + x.a] = old + 0.1 * (G[k] - old); last = { ...x, old, G: G[k], nw: Q[x.s * 4 + x.a], t: k }; draw(); }
    function draw() {
      V.draw({ Q, qNums: true, vmin: -1, hiQ: last ? [last.s, last.a] : null });
      if (!last) { calc.innerHTML = '<span class="k">table</span><span>all 48 entries are 0</span><span class="k">next</span><span>t = 10, the last step</span>'; return; }
      const [c, r] = g.cr(last.s);
      calc.innerHTML = `<span class="k">step</span><span>t = ${last.t}: (${c},${r}), ${UL.ACTS[last.a]}</span><span class="k">return G</span><span>${fmt(last.G)}</span><span class="k">old Q</span><span>${fmt(last.old, 3)}</span><span class="k">update</span><span>${fmt(last.old, 3)} + 0.1 × (${fmt(last.G)} − ${last.old < 0 ? '(' + fmt(last.old, 3) + ')' : fmt(last.old, 3)})</span><span class="k">new Q</span><span class="hl">${fmt(last.nw, 3)}</span>`;
    }
    $('#qt-next').addEventListener('click', next);
    $('#qt-all').addEventListener('click', () => { while (k > 0) next(); });
    $('#qt-reset').addEventListener('click', reset);
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 8. three epsilons */
  (function () {
    const g = grid('small'), EPS = [0.9, 0.5, 0.1], views = EPS.map((_, i) => new GridView(`#ex-${i}`, g, { cell: 56 }));
    const vi = UL.valueIteration(g, 0.8, 12).pop();
    const best = (s) => { let b = 0, bv = -Infinity; for (let a = 0; a < 4; a++) { const o = g.step(s, a); const v = o.r + (o.done ? 0 : 0.8 * vi[o.s2]); if (v > bv + 1e-9) { bv = v; b = a; } } return b; };
    let st, r; const sp = UL.range('ex-speed');
    function reset() { r = rng(3); st = EPS.map(() => ({ s: g.s0, path: [g.s0], t: 0, n: 0, ok: 0, lens: [], flash: 0 })); draw(); }
    function step() {
      st.forEach((d, i) => {
        if (d.flash) { d.flash--; if (!d.flash) { d.s = g.s0; d.path = [g.s0]; d.t = 0; } return; }
        const a = r() < EPS[i] ? r.int(4) : best(d.s), o = g.step(d.s, a); d.s = o.s2; d.path.push(d.s); d.t++;
        if (o.done || d.t >= g.cap) { d.n++; d.ok += o.done ? 1 : 0; d.lens.push(d.t); d.flash = 3; d.msg = o.done ? 'reached' : 'cut off'; }
      });
      draw();
    }
    function draw() {
      st.forEach((d, i) => {
        views[i].draw({ agent: d.s, path: d.path.slice(-12), jitter: true, msg: d.flash ? d.msg : null, msgColor: d.msg === 'reached' ? '#1f5fae' : '#c0392b' });
        const avg = d.lens.length ? (d.lens.reduce((x, y) => x + y, 0) / d.lens.length).toFixed(1) : '–';
        $(`#ex-c${i}`).innerHTML = `<b>ε = ${EPS[i]}</b> · episodes ${d.n} · reached ${d.ok} · avg length ${avg}`;
      });
    }
    let acc = 0; const L = UL.loop((dt) => { acc += dt * sp.v; while (acc > 1) { acc -= 1; step(); } });
    $('#ex-play').addEventListener('click', (e) => { if (L.on) { L.stop(); e.target.textContent = 'Play'; } else { L.start(); e.target.textContent = 'Pause'; } });
    $('#ex-reset').addEventListener('click', reset);
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 9. settling for less */
  (function () {
    const SCHED = {
      greedy: { eps: 0, label: 'ε = 0' },
      low: { eps: 0.1, label: 'ε = 0.1' },
      fast: { eps0: 1, eps1: 0, episodes: 15, label: 'drops after 15' },
      good: { eps0: 1, eps1: 0.05, episodes: 300, label: '1 → 0.05' },
    };
    const E = 300, mode = UL.seg('st-mode', () => reset()), sp = UL.range('st-speed'), foot = $('#st-foot');
    const C = new Plot('#st-curve', { w: 440, h: 210, pad: { l: 36, r: 10, t: 12, b: 30 } }), Bp = new Plot('#st-bars', { w: 520, h: 280, pad: { l: 44, r: 10, t: 16, b: 34 } });
    let g, V, L, last, small, big;
    const mk = (key, seed) => new Learner(UL.grid('twoCheese'), 'q', Object.assign({ alpha: 0.5, gamma: 0.9, episodes: E, seed }, SCHED[key]));
    const greedyGoal = (L) => { const gg = L.g; let s = gg.s0; for (let t = 0; t < 40; t++) { const o = gg.step(s, L.greedy(s)); s = o.s2; if (o.done) return o.r; } return 0; };
    function reset() { g = UL.grid('twoCheese'); $('#st-grid').innerHTML = ''; V = new GridView('#st-grid', g, { cell: 84 }); L = mk(mode.value, 17); L.g = g; last = null; small = 0; big = 0; loop.stop(); $('#st-play').textContent = 'Train'; draw(); }
    function draw() {
      const Vmax = new Float64Array(g.N), pol = {}; for (const s of g.states()) { const q = L.q(s); Vmax[s] = Math.max(...q); if (L.ep && Math.max(...q) > Math.min(...q)) pol[s] = L.greedy(s); }
      V.draw({ V: Vmax, vPos: true, vmax: 14, vNums: true, policy: L.ep ? pol : null, policyColor: '#111', path: last ? last.path : null, pathAlpha: 0.35, agent: last ? last.path[last.path.length - 1] : g.s0, jitter: true });
      UL.chart(C, [{ data: L.curve, color: '#2a78d6', dots: true, r: 2.2 }], { xmax: E, ymin: 0, ymax: 10.5, xlabel: 'episode', ny: 2 });
      const goal = L.ep ? greedyGoal(L) : null;
      UL.stats('st-stats', [{ k: 'episode', v: L.ep }, { k: 'ε now', v: L.eps.toFixed(2) }, { k: 'small cheese reached', v: small }, { k: 'big cheese reached', v: big },
        { k: 'greedy policy now goes to', v: goal == null ? '–' : goal === 10 ? '<span class="pos">big (+10)</span>' : goal === 1 ? '<span class="neg">small (+1)</span>' : 'nowhere yet', hi: true }]);
      if (L.ep >= E) foot.innerHTML = goal === 10 ? `<b>Optimal.</b> Enough exploration: the agent found the big cheese (${big} times) and its greedy policy now goes there.` : big === 0 ? `<b>Settled for less.</b> The agent never once reached the big cheese. Its policy is deterministic, confident, and not optimal: it did not explore enough to find out what it was missing.` : `<b>Settled for less.</b> It reached the big cheese only ${big} time${big > 1 ? 's' : ''}, too rarely for the news to spread back to the start.`;
      else foot.innerHTML = '';
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * sp.v; let n = 0; while (acc > 1 && L.ep < E) { acc -= 1; last = L.episode(); if (last.reached) { if (last.ret >= 10) big++; else small++; } n++; } if (n) draw(); if (L.ep >= E) { $('#st-play').textContent = 'Train'; return false; } });
    $('#st-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Train'; } else { if (L.ep >= E) reset(); loop.start(); e.target.textContent = 'Pause'; } });
    $('#st-reset').addEventListener('click', reset);
    function drawBars(res) {
      if (!res) { Bp.clear(); Bp.textPx('press "Run 4 × 50 runs"', Bp.W / 2, Bp.H / 2, { color: '#a3a3a0', font: '13px "IBM Plex Sans"' }); return; }
      UL.bars(Bp, Object.keys(SCHED).map((k) => ({ v: res[k], label: SCHED[k].label, color: k === 'good' ? '#2a78d6' : '#c0392b' })), { ymin: 0, ymax: 100, ylabel: '% of runs that found the optimum', fv: (v) => `${v.toFixed(0)}%` });
      UL.stats('st-many-stats', Object.keys(SCHED).map((k) => ({ k: SCHED[k].label, v: `${res[k].toFixed(0)}% <small>optimal</small>`, hi: k === 'good' })));
    }
    $('#st-many').addEventListener('click', () => {
      $('#st-many').disabled = true;
      setTimeout(() => {
        const res = {};
        for (const k of Object.keys(SCHED)) { let ok = 0; for (let i = 0; i < 50; i++) { const Lr = mk(k, 500 + i); for (let e = 0; e < E; e++) Lr.episode(); if (greedyGoal(Lr) === 10) ok++; } res[k] = (100 * ok) / 50; }
        drawBars(res); $('#st-many').disabled = false;
      }, 30);
    });
    redraws.push(draw); reset(); drawBars(null);
  })();

  /* ------------------------------------------------ 10. Monte Carlo control */
  (function () {
    const g = grid('small'), V = new GridView('#mc-grid', g, { cell: 100 }), C = new Plot('#mc-curve', { w: 440, h: 230, pad: { l: 40, r: 10, t: 12, b: 32 } });
    let L, last; const sp = UL.range('mc-speed'), arrows = $('#mc-arrows'), nums = $('#mc-nums');
    function reset() { L = new Learner(g, 'mc', { alpha: 0.1, gamma: 0.8, episodes: 300, seed: 21 }); last = null; draw(); }
    function draw() {
      const pol = {}; if (arrows.checked && L.ep > 0) for (const s of g.states()) pol[s] = L.greedy(s);
      V.draw({ Q: L.Q, qNums: nums.checked, vmin: -5, policy: arrows.checked && L.ep > 0 ? pol : null, path: last ? last.path : null, pathAlpha: 0.35, agent: last ? last.path[last.path.length - 1] : g.s0, jitter: true });
      const cv = L.curve, sm = UL.smooth(cv, 10);
      UL.chart(C, [{ data: cv, color: '#c9c9c4', w: 1 }, { data: sm, color: '#c0392b' }], { xmax: 300, ymin: -21, ymax: 0, hline: -7, hlabel: 'best possible −7', xlabel: 'episode', ylabel: 'total reward' });
      const l50 = cv.slice(-50), avg = l50.length ? l50.reduce((a, b) => a + b, 0) / l50.length : NaN;
      UL.stats('mc-stats', [{ k: 'episode', v: L.ep }, { k: 'ε now', v: L.eps.toFixed(2) }, { k: 'last episode', v: last ? fmt(last.ret, 0) : '–' }, { k: 'avg of last 50', v: isFinite(avg) ? fmt(avg, 1) : '–', hi: true }]);
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * sp.v; let n = 0; while (acc > 1 && L.ep < 300) { acc -= 1; last = L.episode(); n++; } if (n) draw(); if (L.ep >= 300) { $('#mc-play').textContent = 'Train'; return false; } });
    $('#mc-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Train'; } else { if (L.ep >= 300) reset(); loop.start(); e.target.textContent = 'Pause'; } });
    $('#mc-one').addEventListener('click', () => { if (L.ep < 300) { last = L.episode(); draw(); } });
    $('#mc-reset').addEventListener('click', () => { loop.stop(); $('#mc-play').textContent = 'Train'; reset(); });
    [arrows, nums].forEach((x) => x.addEventListener('change', draw));
    V.p.cv.addEventListener('click', (e) => { const k = V.cellAt(e); if (k < 0) return; g.toggleWall(k); if (!isFinite(g.shortest())) { g.toggleWall(k); return; } loop.stop(); $('#mc-play').textContent = 'Train'; reset(); });
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 11. exercise */
  (function () {
    const why = $('#cr-why');
    $$('#cr-opts button').forEach((b) => b.addEventListener('click', () => {
      $$('#cr-opts button').forEach((x) => { x.disabled = true; x.style.borderColor = x.dataset.v === '1' ? '#1baf7a' : ''; });
      if (b.dataset.v !== '1') b.style.borderColor = '#e34948';
      why.hidden = false;
      why.innerHTML = 'Returns backwards: G₄ = 0, G₃ = −1, G₂ = −1.8, G₁ = −2.44, G₀ = −2.952. Update: −0.5 + 0.1 × (−2.952 + 0.5) = <b>−0.745</b>. The entry gets worse, which is right: the move was bad. But it is judged by the whole rest of the episode, three good moves included. Had they been bad, it would have been punished far more. Monte Carlo cannot tell them apart.';
    }));
  })();

  UL.quiz('quiz-box', [
    { q: 'What does it mean that the agent has a <em>world model</em>?', o: ['It can see the maze as a picture', 'It knows p(s′, r | s, a): what each action leads to', 'It has a Q-table', 'It uses ε-greedy'], a: 1, why: 'A world model predicts the next state and reward. Model-free methods learn without it, from sampled experience.' },
    { q: 'Why is the reward −1 per step?', o: ['To punish walls', 'So that maximising the total reward means reaching the cheese as fast as possible', 'Because rewards must be negative', 'To make γ unnecessary'], a: 1, why: 'The total reward is minus the number of steps used.' },
    { q: 'After the lucky episode, why do the actions that led to the cheese look worse than untried ones?', o: ['Because they were bad', 'Because every touched entry became negative while untried ones are still at the optimistic 0', 'Because α is too small', 'Because γ = 0.8'], a: 1, why: 'Zero is an optimistic starting guess in this maze; it sorts itself out as untried actions get tried.' },
    { q: 'ε = 0.2, four actions. Probability of choosing the best action?', o: ['0.8', '0.85', '0.95', '0.2'], a: 1, why: '0.8 for the greedy choice plus 0.2/4 = 0.05 when the random choice happens to pick it.' },
    { q: 'With ε = 0 in the two-cheese maze, the agent ends up always going to the small cheese. Why?', o: ['Q-learning cannot learn +10', 'It found the small cheese first and, never exploring, never discovered that the big one is better', 'γ is too small', 'The big cheese is unreachable'], a: 1, why: 'A greedy agent can only exploit what it has discovered. Too little exploration gives a confident, deterministic, but sub-optimal policy.' },
    { q: 'What does Monte Carlo control need before it can update anything?', o: ['A world model', 'A complete episode', 'A neural network', 'The optimal policy'], a: 1, why: 'It needs the full return, so it must wait for the end of the episode. That is the weakness Part 4 attacks.' },
  ]);
  UL.start();
})();
