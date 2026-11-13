/*!
 * Reinforcement Lab — Temporal difference
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, $$, Plot, GridView, grid, fmt, Learner, rng } = UL;
  const redraws = [];
  document.addEventListener('ul-redraw', () => redraws.forEach((f) => f()));
  const par = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));

  /* ------------------------------------------------ 1. MC vs TD */
  (function () {
    const g = grid('small'), A = new GridView('#mt-mc', g, { cell: 80 }), B = new GridView('#mt-td', g, { cell: 80 });
    const steps = UL.lucky(g, 1);
    let Vm, Vt, ep, t, litM, litT, noteT, noteM;
    function reset() { Vm = new Float64Array(g.N); Vt = new Float64Array(g.N); ep = 1; t = 0; litM = []; litT = []; noteT = ''; noteM = 'waiting for the end of the episode'; draw(); }
    function step() {
      if (t >= steps.length) { ep++; t = 0; litM = []; litT = []; noteM = 'waiting for the end of the episode'; noteT = ''; draw(); return; }
      const x = steps[t], old = Vt[x.s], tgt = x.r + (x.done ? 0 : 0.8 * Vt[x.s2]); Vt[x.s] = old + 0.5 * (tgt - old);
      litT = [x.s]; const [c, r] = g.cr(x.s); noteT = `V(${c},${r}) ← ${fmt(old)} + 0.5 × (${fmt(tgt)} − ${par(old)}) = <b>${fmt(Vt[x.s])}</b>`;
      t++; litM = [];
      if (t === steps.length) { let G = 0; for (let i = steps.length - 1; i >= 0; i--) { G = steps[i].r + 0.8 * G; Vm[steps[i].s] += 0.5 * (G - Vm[steps[i].s]); } litM = [...new Set(steps.map((z) => z.s))]; noteM = `episode over: <b>all ${litM.length} visited squares</b> updated at once`; }
      else noteM = `waiting… ${t} step${t > 1 ? 's' : ''} remembered`;
      draw();
    }
    function draw() {
      const pos = t === 0 ? g.s0 : steps[t - 1].s2;
      A.draw({ V: Vm, vNums: true, vmin: -4, agent: pos, hiCells: litM });
      B.draw({ V: Vt, vNums: true, scale: 4, agent: pos, hiCells: litT });
      $('#mt-mc-cap').innerHTML = `<b>Monte Carlo</b>: ${noteM}`; $('#mt-td-cap').innerHTML = `<b>TD</b>: ${noteT || 'updates after every step'}`;
      $('#mt-status').innerHTML = `episode <b>${ep}</b>, step <b>${t}</b> of ${steps.length}`;
    }
    $('#mt-step').addEventListener('click', step);
    $('#mt-ep').addEventListener('click', () => { if (t >= steps.length) step(); while (t < steps.length) step(); });
    $('#mt-reset').addEventListener('click', reset);
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 2. TD error calculator */
  (function () {
    const ids = ['te-v', 'te-r', 'te-v2', 'te-g', 'te-a'], out = $('#te-out');
    const calc = () => {
      const [v, r, v2, g, a] = ids.map((i) => +$('#' + i).value), tgt = r + g * v2, d = tgt - v, nv = v + a * d;
      const msg = Math.abs(d) < 1e-9 ? 'the prediction was right: nothing to learn' : d > 0 ? 'better than predicted: the estimate goes <b class="pos">up</b>' : 'worse than predicted: the estimate goes <b class="neg">down</b>';
      out.innerHTML = `<span class="k">TD target</span><span>R + γ V(S′) = ${fmt(r)} + ${g} × ${par(v2)} = ${fmt(tgt, 3)}</span><span class="k">TD error δ</span><span class="hl ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${fmt(tgt, 3)} − ${par(v)} = ${d > 0 ? '+' : ''}${fmt(d, 3)}</span><span class="k">meaning</span><span>${msg}</span><span class="k">new V(S)</span><span>${fmt(v)} + ${a} × ${par(d)} = <b>${fmt(nv, 3)}</b></span>`;
    };
    ids.forEach((i) => $('#' + i).addEventListener('input', calc)); calc();
  })();

  /* ------------------------------------------------ 2b. driving home */
  (function () {
    const P = new Plot('#dh-plot', { w: 820, h: 300, pad: { l: 46, r: 20, t: 18, b: 52 } }), foot = $('#dh-foot');
    const st = ['leave home', 'bus 10 min late', 'bus lane: fast', 'road works', 'stop near campus', 'arrive'], pred = [35, 45, 41, 48, 47, 47], ACT = 47;
    const mode = UL.seg('dh-mode', draw);
    function draw() {
      P.clear(); P.domain(-0.3, 5.3, 30, 52); P.axes({ x: false, ylabel: 'predicted total trip (min)', ny: 4 });
      st.forEach((s, i) => P.textPx(s, P.sx(i), P.H - P.pad.b + 14, { font: '11px "IBM Plex Sans"', color: '#6b6b68' }));
      P.line(-0.3, ACT, 5.3, ACT, { color: '#c9c9c4', dash: [4, 4], w: 1 }); P.textPx(`actual: ${ACT} min`, P.sx(5.25), P.sy(ACT) - 8, { align: 'right', font: '10px "IBM Plex Mono"', color: '#6b6b68' });
      P.poly(pred.map((v, i) => [i, v]), { color: '#111', w: 1.5 });
      for (let i = 0; i < 5; i++) { const to = mode.value === 'mc' ? ACT : pred[i + 1]; if (Math.abs(to - pred[i]) > 0.3) P.arrow(i, pred[i], i, to - Math.sign(to - pred[i]) * 0.4, { color: '#c0392b', w: 2, head: 8 }); }
      pred.forEach((v, i) => P.marker(i, v, { r: 5, fill: '#111' }));
      foot.innerHTML = mode.value === 'mc' ? `<b>Monte Carlo</b>: nothing can be learned until you arrive. Then every prediction is moved towards the final ${ACT} minutes, even the one made at home, before anything had happened.` : '<b>TD</b>: each prediction is moved towards the <em>next</em> prediction, at once. When the bus is late you already know 35 was too low. The late bus is blamed for its 10 minutes, the road works for theirs: each correction belongs to one stage of the trip.';
    }
    draw();
  })();

  /* ------------------------------------------------ 3. three updates */
  (function () {
    const ids = ['x3-q', 'x3-up', 'x3-down', 'x3-left', 'x3-right'], tbl = $('#x3-table'), es = UL.range('x3-eps', calc, (v) => v.toFixed(2)), a2 = $('#x3-a2');
    function calc() {
      const [q, ...nq] = ids.map((i) => +$('#' + i).value), eps = es.v, A2 = +a2.value, mx = Math.max(...nq), bi = nq.indexOf(mx);
      const p = nq.map((_, i) => eps / 4 + (i === bi ? 1 - eps : 0)), ex = p.reduce((s, pi, i) => s + pi * nq[i], 0);
      const rows = [['SARSA', `Q(S′, ${UL.ACTS[A2]}) = ${fmt(nq[A2])}`, nq[A2]], ['Expected SARSA', `Σ π·Q = ${p.map((pi, i) => `${pi.toFixed(2)}·${par(nq[i])}`).join(' + ')} = ${fmt(ex, 3)}`, ex], ['Q-learning', `max = ${fmt(mx)} (${UL.ACTS[bi]})`, mx]];
      tbl.innerHTML = '<thead><tr><th>method</th><th>value of the next step</th><th>target −1 + 0.8 × next</th><th>TD error δ</th><th>new Q (α = 0.1)</th></tr></thead><tbody>' + rows.map(([n, d, v]) => {
        const tgt = -1 + 0.8 * v, del = tgt - q; return `<tr><td>${n}</td><td>${d}</td><td>${fmt(tgt, 3)}</td><td class="${del > 0 ? 'pos' : 'neg'}">${del > 0 ? '+' : ''}${fmt(del, 3)}</td><td>${fmt(q + 0.1 * del, 3)}</td></tr>`;
      }).join('') + '</tbody>';
    }
    ids.forEach((i) => $('#' + i).addEventListener('input', calc)); a2.addEventListener('change', calc); calc();
  })();

  /* ------------------------------------------------ 4. cliff */
  (function () {
    const g = grid('cliff'), VS = new GridView('#cl-s', g, { cell: 40 }), VQ = new GridView('#cl-q', g, { cell: 40 }), C = new Plot('#cl-curve', { w: 420, h: 330, pad: { l: 44, r: 10, t: 12, b: 32 } });
    let S, Q, lastS, lastQ; const sp = UL.range('cl-speed');
    const mk = (m, seed) => new Learner(g, m, { alpha: 0.5, gamma: 1, eps: 0.1, seed });
    function reset() { S = mk('sarsa', 3); Q = mk('q', 3); lastS = lastQ = null; draw(); }
    function greedyPath(L) { let s = g.s0; const p = [s]; for (let i = 0; i < 40; i++) { const a = L.greedy(s), o = g.step(s, a); if (o.fell) { p.push(o.at); break; } s = o.s2; p.push(s); if (o.done) break; } return p; }
    function draw() {
      [[VS, S, lastS, '#2a78d6', '#cl-s-cap', 'SARSA'], [VQ, Q, lastQ, '#c0392b', '#cl-q-cap', 'Q-learning']].forEach(([V, L, last, col, cap, name]) => {
        V.draw({ path: last ? last.path : null, pathColor: col, pathAlpha: 0.25, falls: last ? last.falls : null, ghost: g.s0 });
        if (L.ep) { const gp = greedyPath(L); V.p.poly(gp.map((k) => g.cr(k)), { color: col, w: 4 }); }
        $(cap).innerHTML = `<b>${name}</b> · episode ${L.ep}${last ? ` · this episode ${fmt(last.ret, 0)}` : ''}`;
      });
      const sm = (a) => a.map((_, i) => { const s = a.slice(Math.max(0, i - 19), i + 1); return s.reduce((x, y) => x + y, 0) / s.length; });
      const best = -(g.shortest() - 1); UL.chart(C, [{ data: sm(S.curve), color: '#2a78d6' }, { data: sm(Q.curve), color: '#c0392b' }], { xmax: 500, ymin: -120, ymax: 0, hline: best, hlabel: `best possible ${fmt(best, 0)}`, xlabel: 'episode', ylabel: 'reward per episode' });
      C.textPx('SARSA', C.W - 60, C.H - 70, { color: '#2a78d6', font: '500 12px "IBM Plex Sans"' }); C.textPx('Q-learning', C.W - 60, C.H - 54, { color: '#c0392b', font: '500 12px "IBM Plex Sans"' });
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * sp.v; let n = 0; while (acc > 1 && S.ep < 500) { acc -= 1; lastS = S.episode(); lastQ = Q.episode(); n++; } if (n) draw(); if (S.ep >= 500) { $('#cl-play').textContent = 'Train 500 episodes'; return false; } });
    $('#cl-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Continue'; } else { if (S.ep >= 500) reset(); loop.start(); e.target.textContent = 'Pause'; } });
    $('#cl-reset').addEventListener('click', () => { loop.stop(); $('#cl-play').textContent = 'Train 500 episodes'; reset(); });
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 5. race */
  (function () {
    const C = new Plot('#rc-curve', { w: 560, h: 330, pad: { l: 44, r: 10, t: 12, b: 32 } });
    const M = [['mc', 'Monte Carlo', '#c0392b'], ['sarsa', 'SARSA', '#1baf7a'], ['esarsa', 'Expected SARSA', '#eda100'], ['q', 'Q-learning', '#2a78d6']];
    const maze = UL.seg('rc-maze', () => { results = null; showGrid(); draw(); }); const head = $('#rc-head');
    let results = null, V = null, lastQ = null;
    UL.legend($('#rc-legend'), M.map(([, n, c]) => ({ color: c, label: n, cls: 'line' })));
    function showGrid() { const g = grid(maze.value); $('#rc-grid').innerHTML = ''; V = new GridView('#rc-grid', g, { cell: maze.value === 'big' ? 40 : 64 }); const pol = {}; if (lastQ && lastQ.g.W === g.W) for (const s of g.states()) pol[s] = lastQ.greedy(s); V.draw({ policy: lastQ && lastQ.g.W === g.W ? pol : null, ghost: g.s0 }); }
    function draw() {
      const E = maze.value === 'big' ? 600 : 300, gg = grid(maze.value), best = -(gg.shortest() - 1);
      if (!results) { C.clear(); C.textPx('press "Run" to race the four methods', C.W / 2, C.H / 2, { color: '#a3a3a0', font: '13px "IBM Plex Sans"' }); UL.stats('rc-stats', []); return; }
      UL.chart(C, M.map(([m, , col]) => ({ data: UL.smooth(results[m], 10), color: col })), { xmax: E, ymin: -gg.cap - 2, ymax: 0, hline: best, hlabel: `best possible ${fmt(best, 0)}`, xlabel: 'episode', ylabel: 'total reward (average of 20 runs)', band: head.checked && results.head ? { x0: 0, x1: 50, label: 'guided' } : null });
      UL.stats('rc-stats', M.map(([m, n]) => ({ k: `${n}: last 50`, v: fmt(results[m].slice(-50).reduce((a, b) => a + b, 0) / 50, 1) })));
    }
    $('#rc-run').addEventListener('click', () => {
      const name = maze.value, E = name === 'big' ? 600 : 300, runs = 20, out = {}; let mi = 0;
      $('#rc-run').disabled = true; $('#rc-run').textContent = 'Running…';
      const next = () => {
        if (mi >= M.length) { results = out; results.head = head.checked; $('#rc-run').disabled = false; $('#rc-run').textContent = 'Run 20 runs each'; showGrid(); draw(); return; }
        const m = M[mi][0];
        out[m] = UL.averageCurve((k) => { const L = new Learner(grid(name), m, { episodes: E, seed: 100 + k, guided: m === 'mc' && head.checked ? 50 : 0 }); if (m === 'q' && k === runs - 1) lastQ = L; return L; }, runs, E);
        mi++; setTimeout(next, 10);
      };
      setTimeout(next, 30);
    });
    head.addEventListener('change', () => { results = null; draw(); });
    redraws.push(showGrid); showGrid(); draw();
  })();

  /* ------------------------------------------------ 6. Q-learning step by step */
  (function () {
    const g = grid('small'), V = new GridView('#qs-grid', g, { cell: 100 }), calc = $('#qs-calc');
    let L, s, t, last, epN;
    function reset() { L = new Learner(g, 'q', { episodes: 300, seed: 9 }); for (let i = 0; i < 30; i++) L.episode(); s = g.s0; t = 0; last = null; epN = L.ep + 1; draw(); }
    function step() {
      if (last && last.done) { s = g.s0; t = 0; epN++; last = null; draw(); return; }
      const a = L.act(s), o = g.step(s, a), row = Array.from(L.q(o.s2)), mx = o.done ? 0 : Math.max(...row), old = L.Q[s * 4 + a], tgt = o.r + 0.8 * mx;
      L.Q[s * 4 + a] = old + 0.1 * (tgt - old); last = { s, a, r: o.r, s2: o.s2, row, mx, old, tgt, nw: L.Q[s * 4 + a], done: o.done || t + 1 >= g.cap, goal: o.done };
      s = o.s2; t++; draw();
    }
    function draw() {
      V.draw({ Q: L.Q, qNums: true, vmin: -5, agent: s, hiQ: last ? [last.s, last.a] : null });
      if (!last) { calc.innerHTML = `<span class="k">table</span><span>after ${L.ep} episodes of training</span><span class="k">episode</span><span>${epN}, ε = ${L.eps.toFixed(2)}</span><span class="k">next</span><span>press "Next step"</span>`; return; }
      const [c, r] = g.cr(last.s), [c2, r2] = g.cr(last.s2);
      calc.innerHTML = `<span class="k">in</span><span>(${c},${r}), action <b>${UL.ACTS[last.a]}</b></span><span class="k">got</span><span>R = ${fmt(last.r, 0)}, new state (${c2},${r2})</span>` +
        `<span class="k">1. next row</span><span>${last.goal ? 'terminal: counts as 0' : last.row.map((v, i) => `${UL.ARROWS[i]} ${fmt(v)}`).join('  ')}</span><span class="k">   max</span><span>${fmt(last.mx)}</span>` +
        `<span class="k">2. target</span><span>${fmt(last.r, 0)} + 0.8 × ${par(last.mx)} = ${fmt(last.tgt, 3)}</span><span class="k">3. update</span><span>${fmt(last.old, 3)} + 0.1 × (${fmt(last.tgt, 3)} − ${par(last.old)}) = <b>${fmt(last.nw, 3)}</b></span>` +
        (last.done ? `<span class="k">episode</span><span>${last.goal ? 'reached the goal' : 'cut off'}: next step starts a new one</span>` : '');
    }
    $('#qs-step').addEventListener('click', step);
    $('#qs-train').addEventListener('click', () => { for (let i = 0; i < 10; i++) L.episode(); s = g.s0; t = 0; last = null; epN = L.ep + 1; draw(); });
    $('#qs-reset').addEventListener('click', reset);
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 7. reward lab */
  (function () {
    const PRE = {
      cost: { step: -1, goal: 0, pit: -20, coin: 0, gamma: 0.95 },
      gamma1: { step: 0, goal: 10, pit: -20, coin: 0, gamma: 1 },
      gamma09: { step: 0, goal: 10, pit: -20, coin: 0, gamma: 0.9 },
      cheap: { step: -1, goal: 0, pit: -3, coin: 0, gamma: 0.95 },
      alive: { step: 1, goal: 10, pit: -20, coin: 0, gamma: 0.95 },
      coin: { step: -0.1, goal: 10, pit: -20, coin: 2, gamma: 0.95 },
    };
    const sl = { step: UL.range('rw-step', changed, (v) => fmt(v, 1)), goal: UL.range('rw-goal', changed, (v) => fmt(v, 0)), pit: UL.range('rw-pit', changed, (v) => fmt(v, 0)), coin: UL.range('rw-coin', changed, (v) => fmt(v, 1)), gamma: UL.range('rw-gamma', changed, (v) => v.toFixed(2)) };
    const C = new Plot('#rw-curve', { w: 440, h: 200, pad: { l: 40, r: 10, t: 12, b: 30 } }), foot = $('#rw-foot'), status = $('#rw-status');
    let g, V, L, roll = null, rollK = 0, last = null, quiet = false;
    const preset = UL.seg('rw-preset', (v) => { quiet = true; Object.entries(PRE[v]).forEach(([k, x]) => sl[k].set(x)); quiet = false; changed(); });
    UL.gridLegend('#rw-legend', ['start', 'agent', 'goal', 'wall', 'pit', 'bonus']);
    function build() {
      const M = Object.assign({}, UL.REWARD_LAB, { stepR: sl.step.v, goalR: sl.goal.v, extra: [{ at: [1, 3], r: sl.pit.v }], coins: sl.coin.v ? [{ at: [3, 1], r: sl.coin.v }] : [] });
      g = new UL.Grid(M); $('#rw-grid').innerHTML = ''; V = new GridView('#rw-grid', g, { cell: 64 });
      L = new Learner(g, 'q', { alpha: 0.5, gamma: sl.gamma.v, eps0: 1, eps1: 0.05, episodes: 400, seed: 11 });
      roll = null; last = null; $('#rw-show').disabled = true;
    }
    function changed() { if (quiet) return; loop.stop(); show.stop(); $('#rw-train').textContent = 'Train 400 episodes'; build(); status.textContent = ''; foot.innerHTML = 'Press <b>Train</b>.'; draw(); }
    function greedyRun() {
      let s = g.s0; const path = [s], seen = new Map(); let end = 'none', ret = 0, disc = 1;
      for (let t = 0; t < g.cap; t++) { const key = s; seen.set(key, (seen.get(key) || 0) + 1); const o = g.step(s, L.greedy(s)); ret += disc * o.r; disc *= sl.gamma.v; s = o.s2; path.push(s); if (o.done) { end = s === g.goal ? 'goal' : 'pit'; break; } }
      const loops = [...seen.values()].some((n) => n > 2);
      return { path, end, loops, len: path.length - 1, ret };
    }
    function draw() {
      const Vm = new Float64Array(g.N), pol = {};
      for (const s of g.states()) { const q = L.q(s); Vm[s] = Math.max(...q); if (L.ep && Math.max(...q) > Math.min(...q)) pol[s] = L.greedy(s); }
      const sc = Math.max(2, ...Array.from(Vm, Math.abs));
      const path = roll ? roll.path.slice(0, rollK + 1) : last ? last.path : null;
      V.draw({ V: L.ep ? Vm : null, scale: sc, policy: L.ep ? pol : null, path, pathAlpha: roll ? 0.85 : 0.3, agent: path ? path[path.length - 1] : g.s0, jitter: !roll });
      UL.chart(C, [{ data: L.curve, color: '#c9c9c4', w: 1 }, { data: UL.smooth(L.curve, 15), color: '#2a78d6' }], { xmax: 400, xlabel: 'episode' });
      const r = L.ep >= 400 ? greedyRun() : null;
      UL.stats('rw-stats', [{ k: 'episodes trained', v: L.ep }, { k: 'ε now', v: L.eps.toFixed(2) },
        { k: 'learned behaviour', v: !r ? '–' : r.end === 'goal' ? `<span class="pos">reaches the goal</span>` : r.end === 'pit' ? '<span class="neg">jumps into the hazard</span>' : '<span class="neg">never finishes</span>', hi: true },
        { k: 'moves until the end', v: !r ? '–' : r.end === 'none' ? `${g.cap}+ <small>(cut off)</small>` : r.len }]);
      if (r && !roll) foot.innerHTML = explain(r);
    }
    function explain(r) {
      const p = preset.value, sp = g.shortest();
      if (r.end === 'pit') return `<b>It jumps into the hazard.</b> Ending there costs ${fmt(sl.pit.v, 0)}; walking the ${sp} moves to the goal would cost about ${fmt(sl.step.v * sp, 0)}. Given this reward, dying early <em>is</em> the best plan. Make the hazard more costly and try again.`;
      if (r.end === 'none' && sl.coin.v > 0 && r.loops) return '<b>Reward hacking.</b> Stepping on and off the bonus pays more than finishing, so it loops for ever. It did exactly what we rewarded, not what we wanted.';
      if (r.end === 'none' && sl.step.v > 0) return '<b>It avoids the goal.</b> Every move pays, and reaching the goal would end the income. So it never finishes.';
      if (r.end === 'none') return '<b>It never gets there.</b> With γ = 1 and no cost per move, arriving after 50 moves is worth exactly as much as arriving after 11, so nothing pushes it to hurry: many routes look equally good.';
      if (r.len > sp + 2) return `<b>It reaches the goal, but slowly</b> (${r.len} moves; the shortest is ${sp}). Nothing in the reward makes a long route worse than a short one.`;
      return `<b>The shortest route.</b> ${p === 'gamma09' ? 'No cost per move, but γ < 1 makes a reward received later worth less, so it hurries.' : 'Every wasted move costs, so it takes the shortest safe route to the goal.'} ${r.len} moves.`;
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * 60; let n = 0; while (acc > 1 && L.ep < 400) { acc--; last = L.episode(); n++; } if (n) draw(); if (L.ep >= 400) { $('#rw-train').textContent = 'Train 400 episodes'; $('#rw-show').disabled = false; status.textContent = 'trained'; return false; } });
    const show = UL.loop((dt) => { acc += dt * 5; while (acc > 1) { acc--; rollK++; } draw(); if (rollK >= roll.path.length - 1) { foot.innerHTML = explain(roll); return false; } });
    $('#rw-train').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Continue'; return; } if (L.ep >= 400) build(); roll = null; acc = 0; loop.start(); e.target.textContent = 'Pause'; foot.innerHTML = 'Training… (ε falls from 1 to 0.05, so it explores a lot at first)'; });
    $('#rw-show').addEventListener('click', () => { roll = greedyRun(); rollK = 0; acc = 0; foot.innerHTML = 'Following the learned (greedy) policy from the start…'; show.start(); });
    build(); draw(); foot.innerHTML = 'Press <b>Train</b>.';
  })();

  /* ------------------------------------------------ 8. traces */
  (function () {
    const g = grid('small'), V = new GridView('#tr-grid', g, { cell: 100 }), calc = $('#tr-calc'), lS = UL.range('tr-l', () => reset(), (v) => v.toFixed(2));
    const steps = UL.lucky(g, 1);
    let Vv, e, t, ep, lit, d;
    function reset() { Vv = new Float64Array(g.N); e = new Float64Array(g.N); t = 0; ep = 1; lit = []; d = null; draw(); }
    function step() {
      if (t >= steps.length) { t = 0; ep++; e = new Float64Array(g.N); lit = []; d = null; draw(); return; }
      const x = steps[t], r = x.done ? 1 : 0, lam = lS.v; d = r + (x.done ? 0 : 0.9 * Vv[x.s2]) - Vv[x.s];
      for (let k = 0; k < g.N; k++) e[k] *= 0.9 * lam; e[x.s] += 1; lit = [];
      for (let k = 0; k < g.N; k++) if (e[k] > 1e-4 && Math.abs(d) > 1e-9) { Vv[k] += 0.5 * d * e[k]; lit.push(k); }
      t++; draw();
    }
    function draw() {
      const pos = t === 0 ? g.s0 : steps[t - 1].s2;
      V.draw({ V: Vv, vPos: true, vmax: 0.6, vNums: true, trace: e, traceMax: 2, agent: pos, hiCells: lit });
      calc.innerHTML = `<span class="k">episode, step</span><span>${ep}, ${t} of ${steps.length}</span><span class="k">λ, γλ</span><span>${lS.v.toFixed(2)}, ${(0.9 * lS.v).toFixed(3)}</span><span class="k">TD error δ</span><span class="hl">${d == null ? '–' : (d > 0 ? '+' : '') + fmt(d, 3)}</span><span class="k">squares changed</span><span>${lit.length ? lit.length + (lit.length > 1 ? ', in proportion to their traces' : '') : 'none: δ = 0, the traces only decay'}</span>`;
    }
    $('#tr-step').addEventListener('click', step);
    $('#tr-ep').addEventListener('click', () => { if (t >= steps.length) step(); while (t < steps.length) step(); });
    $('#tr-reset').addEventListener('click', reset);
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 9. value iteration */
  (function () {
    let g, V, sweeps; const kS = UL.range('vi-k', draw), mz = UL.seg('vi-maze', make), foot = $('#vi-foot');
    function make() { g = grid(mz.value); $('#vi-grid').innerHTML = ''; V = new GridView('#vi-grid', g, { cell: mz.value === 'big' ? 64 : 96 }); V.p.cv.addEventListener('click', (e) => { const k = V.cellAt(e); if (k < 0) return; g.toggleWall(k); if (!isFinite(g.shortest())) g.toggleWall(k); compute(); draw(); }); compute(); draw(); }
    function compute() { sweeps = UL.valueIteration(g, 0.8, 30); }
    function draw() {
      const k = kS.v, Vk = sweeps[k], pol = {};
      if (k > 0) for (const s of g.states()) { let b = 0, bv = -Infinity; for (let a = 0; a < 4; a++) { const o = g.step(s, a), v = o.r + (o.done ? 0 : 0.8 * Vk[o.s2]); if (v > bv + 1e-9) { bv = v; b = a; } } pol[s] = b; }
      V.draw({ V: Vk, vNums: true, vmin: -5, policy: k > 0 ? pol : null });
      let conv = sweeps.findIndex((v, i) => i > 0 && v.every((x, j) => Math.abs(x - sweeps[i - 1][j]) < 1e-9)); conv = conv < 0 ? '>30' : conv - 1;
      foot.innerHTML = k === 0 ? 'All values start at 0.' : `After ${k} sweep${k > 1 ? 's' : ''}: the correct values have spread ${k} squares from the goal. Converged after <b>${conv}</b> sweeps, with no trial and error at all. That is what a world model buys.`;
    }
    redraws.push(draw); make();
  })();

  UL.quiz('quiz-box', [
    { q: 'What is the main practical advantage of TD over Monte Carlo?', o: ['It needs a world model', 'It can learn after every step, without waiting for the end of the episode', 'It never needs exploration', 'It uses the true return'], a: 1, why: 'TD updates from one reward plus the next estimate, so it works with long and even never-ending tasks.' },
    { q: 'V(S) = −2, R = −1, V(S′) = −0.5, γ = 0.9. The TD error is…', o: ['−0.55', '+0.55', '−1.45', '0'], a: 1, why: 'δ = −1 + 0.9 × (−0.5) − (−2) = −1.45 + 2 = +0.55: better than predicted.' },
    { q: 'Reward: −1 per move, but the hazard costs only −3 and the goal is 11 moves away. What does Q-learning learn?', o: ['The shortest route to the goal', 'To walk into the hazard: −3 is better than about −10', 'To stand still', 'Nothing'], a: 1, why: 'It maximises the reward you wrote. Here ending early in the hazard really is the best plan.' },
    { q: 'Which method uses the action that the agent actually takes next?', o: ['Q-learning', 'SARSA', 'Expected SARSA', 'Value iteration'], a: 1, why: 'SARSA uses (S, A, R, S′, A′): hence its name.' },
    { q: 'On the cliff, why does SARSA collect more reward than Q-learning while learning?', o: ['SARSA learns faster', 'SARSA learns the value of its own exploring behaviour and so avoids the edge; Q-learning walks the edge and sometimes falls', 'Q-learning has a bug', 'SARSA uses γ = 1'], a: 1, why: 'On-policy learning includes the cost of the random steps; off-policy learning assumes the best action next.' },
    { q: 'What does an eligibility trace remember?', o: ['The optimal policy', 'Which squares (or state–action pairs) were visited recently, fading over time', 'All rewards ever received', 'The world model'], a: 1, why: 'When a TD error arrives, every recently visited pair is updated in proportion to its trace.' },
  ]);
  UL.start();
})();
