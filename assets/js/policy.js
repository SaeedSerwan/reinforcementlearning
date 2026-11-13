/*!
 * Reinforcement Lab — Policy gradients and actor–critic
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, Plot, GridView, grid, fmt, rng, Learner, ActorCritic } = UL;
  const redraws = [];
  document.addEventListener('ul-redraw', () => redraws.forEach((f) => f()));
  const softmax = (t) => { const m = Math.max(...t), e = t.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0); return e.map((v) => v / z); };

  /* ------------------------------------------------ 2. baseline problem */
  (function () {
    const C = new Plot('#bl-curve', { w: 540, h: 300, pad: { l: 44, r: 10, t: 12, b: 32 } }), Qp = new Plot('#bl-q', { w: 380, h: 250, pad: { l: 34, r: 10, t: 30, b: 28 } });
    const off = UL.range('bl-off', () => { drawQ(); }, (v) => `+${v}`); const foot = $('#bl-foot');
    UL.legend($('#bl-leg'), [{ color: '#c0392b', label: 'Ψ = reward (no baseline)', cls: 'line' }, { color: '#2a78d6', label: 'Ψ = reward − running average (baseline)', cls: 'line' }]);
    function sim(o, baseline, runs = 200, T = 300) {
      const r = rng(7), mean = [-5 + o, o, 5 + o], P = new Float64Array(T + 1);
      for (let k = 0; k < runs; k++) {
        const th = [0, 0, 0]; let b = null, n = 0;
        for (let t = 0; t <= T; t++) {
          const p = softmax(th); P[t] += p[2]; if (t === T) break;
          let u = r(), a = 0; while (a < 2 && u > p[a]) { u -= p[a]; a++; }
          const G = mean[a] + r.normal(), psi = baseline ? G - (b == null ? G : b) : G;
          for (let i = 0; i < 3; i++) th[i] += 0.02 * psi * ((i === a ? 1 : 0) - p[i]);
          if (baseline) { n++; b = b == null ? G : b + (G - b) / n; }
        }
      }
      return Array.from(P, (v) => v / runs);
    }
    function drawQ() { const o = off.v; UL.bars(Qp, [-5 + o, o, 5 + o].map((v, i) => ({ v, label: `action ${i + 1}`, color: i === 2 ? '#2a78d6' : '#c9c9c4' })), { fv: (v) => fmt(v, 0) }); Qp.textPx('largest → action 3', Qp.W / 2, 12, { color: '#1f5fae', font: '500 12px "IBM Plex Sans"' }); }
    function run() {
      const o = off.v, a = sim(o, false), b = sim(o, true);
      UL.chart(C, [{ data: a, color: '#c0392b' }, { data: b, color: '#2a78d6' }], { x0: 0, xmax: 300, ymin: 0, ymax: 1, xlabel: 'update', ylabel: 'probability of the best action' });
      foot.innerHTML = `Rewards ${fmt(-5 + o, 0)}, ${fmt(o, 0)}, ${fmt(5 + o, 0)}. After 300 updates the best action has probability <b class="neg">${a[300].toFixed(2)}</b> without a baseline and <b class="pos">${b[300].toFixed(2)}</b> with one.${o >= 50 ? ' Without the baseline every action it tries gets pushed up hard, so whatever it tried first wins.' : ''}`;
    }
    $('#bl-run').addEventListener('click', run); drawQ(); run();
  })();

  /* ------------------------------------------------ 5a. softmax */
  (function () {
    const P = new Plot('#sm-plot', { w: 560, h: 240, pad: { l: 34, r: 10, t: 14, b: 28 } });
    const s = [1, 2, 3].map((i) => UL.range(`sm-${i}`, draw, (v) => v.toFixed(1)));
    function draw() { const p = softmax(s.map((x) => x.v)); UL.bars(P, p.map((v, i) => ({ v, label: `action ${i + 1}`, color: i === 2 ? '#2a78d6' : '#9dbbda' })), { ymin: 0, ymax: 1 }); }
    $('#sm-push').addEventListener('click', () => { s[2].set(Math.min(3, s[2].v + 0.5)); draw(); });
    draw();
  })();

  /* ------------------------------------------------ 5b. gaussian */
  (function () {
    const P = new Plot('#ga-plot', { w: 560, h: 280, pad: { l: 36, r: 10, t: 14, b: 32 } }), r = rng(4);
    let mu, sd, tries, base, n;
    function reset() { mu = -1.5; sd = 1.2; tries = []; base = null; n = 0; draw(); }
    function one() {
      const a = mu + sd * r.normal(), R = -((a - 1.5) ** 2), adv = R - (base == null ? R : base);
      base = base == null ? R : base + 0.1 * (R - base);
      const z = (a - mu) / sd; mu += 0.05 * adv * z * sd; sd = Math.max(0.08, sd + 0.03 * adv * (z * z - 1) * sd); n++;
      tries.push({ a, R, adv }); if (tries.length > 25) tries.shift(); draw();
    }
    function draw() {
      P.clear(); P.domain(-4, 4, 0, 1.05); P.axes({ xlabel: 'action (a number)', y: false });
      const pts = []; for (let x = -4; x <= 4.0001; x += 0.04) pts.push([x, Math.exp(-0.5 * ((x - mu) / sd) ** 2)]);
      P.poly(pts, { color: '#2a78d6', w: 2.4 }); P.line(1.5, 0, 1.5, 1.02, { color: '#1baf7a', dash: [4, 4], w: 1.4 }); P.textPx('best: 1.5', P.sx(1.5) + 4, P.pad.t + 6, { align: 'left', color: '#0f7a54', font: '11px "IBM Plex Mono"' });
      P.line(mu, 0, mu, 1, { color: '#2a78d6', w: 1, dash: [2, 3] });
      tries.forEach((t, i) => P.marker(t.a, 0.05, { r: 4, fill: t.adv >= 0 ? '#1baf7a' : '#c0392b', alpha: 0.3 + (0.7 * i) / tries.length }));
      UL.stats('ga-stats', [{ k: 'tries', v: n }, { k: 'mean μ', v: mu.toFixed(2), hi: true }, { k: 'width σ', v: sd.toFixed(2) }, { k: 'last try', v: tries.length ? `${fmt(tries[tries.length - 1].a)} → ${tries[tries.length - 1].adv >= 0 ? 'better' : 'worse'}` : '–' }]);
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * 12; while (acc > 1) { acc--; one(); } if (n > 400) { $('#ga-play').textContent = 'Learn'; return false; } });
    $('#ga-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Learn'; } else { if (n > 400) reset(); loop.start(); e.target.textContent = 'Pause'; } });
    $('#ga-one').addEventListener('click', one); $('#ga-reset').addEventListener('click', () => { loop.stop(); $('#ga-play').textContent = 'Learn'; reset(); });
    reset();
  })();

  /* ------------------------------------------------ 7. actor–critic */
  (function () {
    const el = $('#ac-diagram');
    el.innerHTML = `<svg viewBox="0 0 760 250" role="img" aria-label="Actor–critic diagram"><defs><marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>
      <rect x="30" y="20" width="220" height="70" rx="10" fill="#fff" stroke="#2a78d6" stroke-width="1.6"/><text x="140" y="50" text-anchor="middle" font-size="17" font-weight="600">Actor</text><text x="140" y="72" text-anchor="middle" font-size="12.5" fill="#6b6b68">the policy π: chooses</text>
      <rect x="30" y="160" width="220" height="70" rx="10" fill="#fff" stroke="#c0392b" stroke-width="1.6"/><text x="140" y="190" text-anchor="middle" font-size="17" font-weight="600">Critic</text><text x="140" y="212" text-anchor="middle" font-size="12.5" fill="#6b6b68">value function V: judges</text>
      <rect x="510" y="90" width="220" height="70" rx="10" fill="#f6f6f4" stroke="#111" stroke-width="1.6"/><text x="620" y="130" text-anchor="middle" font-size="17" font-weight="600">Environment</text>
      <path d="M250 55 H620 V88" fill="none" stroke="#111" stroke-width="1.6" marker-end="url(#ah2)"/><text x="430" y="47" text-anchor="middle" font-size="13">action</text>
      <path d="M620 160 V195 H254" fill="none" stroke="#111" stroke-width="1.6" marker-end="url(#ah2)"/><text x="430" y="187" text-anchor="middle" font-size="13">state, reward</text>
      <path d="M140 160 V94" fill="none" stroke="#c0392b" stroke-width="2.2" marker-end="url(#ah2)"/><text x="152" y="132" font-size="13" fill="#b52e2d">TD error δ</text></svg>`;
    const g = grid('small'), A = new GridView('#ac-actor', g, { cell: 64 }), B = new GridView('#ac-critic', g, { cell: 64 }), C = new Plot('#ac-curve', { w: 330, h: 200, pad: { l: 36, r: 8, t: 10, b: 30 } });
    let L; const sp = UL.range('ac-speed');
    function reset() { L = new ActorCritic(g, { seed: 4 }); draw(); }
    function draw() {
      const probs = {}; for (const s of g.states()) probs[s] = L.pi(s);
      A.draw({ probs }); B.draw({ V: L.V, vNums: true, vmin: -4.5 });
      UL.chart(C, [{ data: L.curve, color: '#c9c9c4', w: 1 }, { data: UL.smooth(L.curve, 10), color: '#c0392b' }], { xmax: 350, ymin: -21, ymax: 0, hline: -7, xlabel: 'episode' });
    }
    let acc = 0; const loop = UL.loop((dt) => { acc += dt * sp.v; let k = 0; while (acc > 1 && L.ep < 350) { acc--; L.episode(); k++; } if (k) draw(); if (L.ep >= 350) { $('#ac-play').textContent = 'Train'; return false; } });
    $('#ac-play').addEventListener('click', (e) => { if (loop.on) { loop.stop(); e.target.textContent = 'Train'; } else { if (L.ep >= 350) reset(); loop.start(); e.target.textContent = 'Pause'; } });
    $('#ac-reset').addEventListener('click', () => { loop.stop(); $('#ac-play').textContent = 'Train'; reset(); });
    redraws.push(draw); reset();
  })();

  /* ------------------------------------------------ 8. three families */
  (function () {
    const C = new Plot('#fm-curve', { w: 560, h: 300, pad: { l: 44, r: 10, t: 12, b: 32 } });
    const F = [['rf', 'REINFORCE with baseline', '#8d8d89'], ['q', 'Q-learning', '#2a78d6'], ['ac', 'One-step actor–critic', '#c0392b']];
    UL.legend($('#fm-leg'), F.map(([, n, c]) => ({ color: c, label: n, cls: 'line' })));
    class Reinforce {
      constructor(g, seed) { this.g = g; this.r = rng(seed); this.th = new Float64Array(g.N * 4); this.V = new Float64Array(g.N); }
      pi(s) { return softmax(Array.from(this.th.subarray(s * 4, s * 4 + 4))); }
      episode() {
        const g = this.g; let s = g.s0, ret = 0; const tr = [];
        for (let t = 0; t < g.cap; t++) { const p = this.pi(s); let u = this.r(), a = 0; while (a < 3 && u > p[a]) { u -= p[a]; a++; } const o = g.step(s, a); tr.push([s, a, o.r]); ret += o.r; s = o.s2; if (o.done) break; }
        let G = 0; for (let i = tr.length - 1; i >= 0; i--) { const [ss, aa, rr] = tr[i]; G = rr + 0.8 * G; const d = G - this.V[ss]; this.V[ss] += 0.1 * d; const p = this.pi(ss); for (let k = 0; k < 4; k++) this.th[ss * 4 + k] += 0.1 * d * ((k === aa ? 1 : 0) - p[k]); }
        return { ret };
      }
    }
    function draw(res) {
      if (!res) { C.clear(); C.textPx('press "Run" to compare', C.W / 2, C.H / 2, { color: '#a3a3a0', font: '13px "IBM Plex Sans"' }); return; }
      UL.chart(C, F.map(([k, , c]) => ({ data: UL.smooth(res[k], 10), color: c })), { xmax: 300, ymin: -21, ymax: 0, hline: -7, hlabel: 'best possible −7', xlabel: 'episode', ylabel: 'total reward (average of 20 runs)' });
      UL.stats('fm-stats', F.map(([k, n]) => ({ k: `${n}: last 50`, v: fmt(res[k].slice(-50).reduce((a, b) => a + b, 0) / 50, 2) })));
    }
    $('#fm-run').addEventListener('click', () => {
      $('#fm-run').disabled = true; setTimeout(() => {
        const res = {};
        res.rf = UL.averageCurve((k) => new Reinforce(grid('small'), 50 + k), 20, 300);
        res.q = UL.averageCurve((k) => new Learner(grid('small'), 'q', { episodes: 300, seed: 50 + k }), 20, 300);
        res.ac = UL.averageCurve((k) => new ActorCritic(grid('small'), { seed: 50 + k }), 20, 300);
        draw(res); $('#fm-run').disabled = false;
      }, 30);
    });
    draw(null);
  })();

  UL.quiz('quiz-box', [
    { q: 'Why can Q-learning not handle a continuous action such as a steering angle directly?', o: ['It has no reward', 'It would have to take the max over infinitely many actions', 'It cannot explore', 'It needs a world model'], a: 1, why: 'Policy methods instead keep a distribution over numbers and adjust it.' },
    { q: 'Rewards 95, 100, 105. A policy gradient without a baseline…', o: ['learns exactly as with −5, 0, +5', 'pushes every tried action up hard, and can get stuck on the wrong one', 'stops learning because rewards are positive', 'needs ε-greedy'], a: 1, why: 'The size of the push is the size of the reward; the difference of 5 is buried under the 100 all actions share.' },
    { q: 'In the softmax policy, you raise the preference of action 3. What happens to actions 1 and 2?', o: ['Nothing', 'Their probabilities go down', 'Their probabilities go up', 'They are removed'], a: 1, why: 'The probabilities must add up to 1: a tug of war.' },
    { q: 'Which choice of Ψ is the TD error?', o: ['G', 'G − V(S)', 'Q(S,A) − V(S)', 'R + γV(S′) − V(S)'], a: 3, why: 'Rung 4 of the ladder: the advantage estimated with V only.' },
    { q: 'In an actor–critic, what does the critic do?', o: ['Chooses actions', 'Learns V and sends the TD error to the actor (and to itself)', 'Stores the world model', 'Sets ε'], a: 1, why: 'The actor acts; the critic evaluates. One signal, δ, teaches both.' },
  ]);
  UL.start();
})();
