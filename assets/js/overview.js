/*!
 * Reinforcement Lab — Overview page
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { $, $$, Plot, GridView, grid, fmt } = UL;

  /* ----------------------------------------------- 2. where is the boundary */
  (function () {
    const el = $('#bnd-svg'), foot = $('#bnd-foot');
    const F = {
      A: { agent: 'my brain', env: 'my own arms and legs', act: 'nerve signals to the muscles', st: 'position of my limbs (seen and felt)', note: 'My <b>arm is part of the environment</b> here: the brain cannot move it directly, it must learn to.' },
      B: { agent: 'my whole body', env: 'the car: wheel, pedals', act: 'limb movements', st: 'speedometer, the feel of the steering wheel', note: 'Limb movement is mastered, so my arm has moved <b>into the agent</b>.' },
      C: { agent: 'the whole car (me driving it)', env: 'the road and the traffic', act: 'accelerate, brake, turn', st: 'other cars, lanes, the speed limit', note: 'Now I take the car for granted. The boundary moved again.' },
    };
    const draw = (v) => {
      const f = F[v], W = 760, H = 250;
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Agent and environment">
        <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#111"/></marker></defs>
        <rect x="40" y="70" width="230" height="96" rx="10" fill="#fff" stroke="#111" stroke-width="1.5"/>
        <text x="155" y="108" text-anchor="middle" font-size="17" font-weight="600">Agent</text>
        <text x="155" y="134" text-anchor="middle" font-size="13" fill="#3d3d3b">${f.agent}</text>
        <rect x="490" y="70" width="230" height="96" rx="10" fill="#f6f6f4" stroke="#111" stroke-width="1.5"/>
        <text x="605" y="108" text-anchor="middle" font-size="17" font-weight="600">Environment</text>
        <text x="605" y="134" text-anchor="middle" font-size="13" fill="#3d3d3b">${f.env}</text>
        <path d="M155 70 V30 H605 V66" fill="none" stroke="#111" stroke-width="1.6" marker-end="url(#ah)"/>
        <text x="380" y="24" text-anchor="middle" font-size="13"><tspan font-weight="600">action:</tspan> ${f.act}</text>
        <path d="M605 166 V210 H155 V170" fill="none" stroke="#2a78d6" stroke-width="1.6" marker-end="url(#ah)"/>
        <text x="380" y="232" text-anchor="middle" font-size="13" fill="#1f5fae"><tspan font-weight="600">state:</tspan> ${f.st}</text></svg>`;
      foot.innerHTML = f.note;
    };
    UL.seg('bnd-mode', draw); draw('A');
    const ex = [
      ['Robot vacuum', 'Clean a flat and return to the dock before the battery is empty.', '<b>Agent</b>: the control program. <b>Environment</b>: the flat, the dirt, the battery. <b>Actions</b>: move, turn, clean, dock. <b>State</b>: position, battery level, dirt seen.'],
      ['Smart thermostat', 'Keep a house comfortable while using little energy.', 'Two good framings. (1) The agent switches the heater <b>on/off</b> every minute. (2) The agent only chooses a <b>target temperature</b> every 30 minutes, and an existing controller does the switching. (2) is easier to learn: fewer decisions, clearer effects.'],
      ['Snake game', 'Steer a snake to eat apples without hitting a wall or itself.', '<b>Agent</b>: the player program. <b>Environment</b>: the board. <b>Actions</b>: up, down, left, right. <b>State</b>: body cells, apple, heading.'],
    ];
    $('#ex1').innerHTML = ex.map(([t, d, a], i) => `<div class="card"><span class="n">system ${i + 1}</span><h4>${t}</h4><p>${d}</p><button class="btn ghost small" data-i="${i}">Show an answer</button><p class="reveal" hidden>${a}</p></div>`).join('');
    $$('#ex1 button').forEach((b) => b.addEventListener('click', () => { const r = b.nextElementSibling; r.hidden = !r.hidden; b.textContent = r.hidden ? 'Show an answer' : 'Hide'; }));
  })();

  /* ----------------------------------------------- 3. you are the agent */
  (function () {
    const g = grid('small'), view = new GridView('#me-grid', g, { cell: 96 });
    const nums = $('#me-numbers'), stream = $('#me-stream'), foot = $('#me-foot');
    let s, t, total, done, log, path, bumps;
    const mode = UL.seg('me-view', render);
    function reset() { s = g.s0; t = 0; total = 0; done = false; log = []; path = [s]; bumps = []; render(); }
    function act(a) {
      if (done) return;
      const o = g.step(s, a); if (o.bump) bumps.push(s);
      log.push({ t, s, a, r: o.r }); total += o.r; t++; s = o.s2; path.push(s);
      if (o.done) { done = true; foot.innerHTML = `<b>Reached the cheese</b> in ${t} steps. Total reward ${fmt(total, 0)}. The best possible is −7 (8 moves).`; }
      else if (t >= g.cap) { done = true; foot.innerHTML = `<b>Cut off</b> after ${g.cap} steps: total reward ${fmt(total, 0)}.`; }
      else foot.innerHTML = o.bump ? 'Bumped into a wall or the edge: same state, still −1. That is all the agent learns about walls.' : '';
      render();
    }
    function render() {
      const agentView = mode.value === 'agent';
      $('#me-grid').hidden = agentView; nums.hidden = !agentView;
      view.draw({ agent: s, path, coords: true, bumps });
      const [c, r] = g.cr(s), last = log[log.length - 1];
      nums.innerHTML = `<small>state</small><span class="big">(${c}, ${r})</span><small>last reward</small><span class="big">${last ? fmt(last.r, 0) : '–'}</span><small>actions: 0, 1, 2, 3</small>`;
      UL.stats('me-stats', [{ k: 'time step t', v: t }, { k: 'state', v: `(${c},${r})` }, { k: 'total reward', v: fmt(total, 0) }]);
      stream.innerHTML = log.map((e, i) => { const [cc, rr] = g.cr(e.s); return `<div class="row${i === log.length - 1 ? ' new' : ''}"><span>t=${e.t}</span><span>S=(${cc},${rr})</span><span>A=${e.a} ${UL.ARROWS[e.a]}</span><span>R=${fmt(e.r, 0)}</span></div>`; }).join('') || '<p style="color:var(--faint)">Take an action…</p>';
      stream.scrollTop = stream.scrollHeight;
    }
    $$('#me-keys button').forEach((b) => b.addEventListener('click', () => act(+b.dataset.a)));
    $('#me-random').addEventListener('click', () => act(Math.floor(Math.random() * 4)));
    $('#me-reset').addEventListener('click', () => { foot.innerHTML = ''; reset(); });
    document.addEventListener('keydown', (e) => {
      const r = $('#loop').getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      const m = { ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3 }[e.key]; if (m == null) return; e.preventDefault(); act(m);
    });
    document.addEventListener('ul-redraw', render);
    reset();
  })();

  /* ----------------------------------------------- 4. markov property */
  (function () {
    const P = new Plot('#mk-plot', { w: 760, h: 300, pad: { l: 40, r: 16, t: 16, b: 34 } });
    const foot = $('#mk-foot'), v0 = 9.8, gr = 9.8, dt = 0.1;
    const y = (t) => v0 * t * dt - 0.5 * gr * (t * dt) ** 2;
    const tS = UL.range('mk-t', draw); const st = UL.seg('mk-state', draw);
    function draw() {
      const t = tS.v; P.clear(); P.domain(0, 20, -0.3, 5.6); P.axes({ xlabel: 'time step', ylabel: 'height', ny: 4 });
      for (let k = 0; k < t; k++) P.marker(k, y(k), { r: 3, fill: '#c9c9c4', ring: false });
      P.marker(t, y(t), { r: 7, fill: '#2a78d6' });
      const d = y(t + 1) - y(t);
      if (st.value === 'pos') {
        P.arrow(t, y(t), t + 1, y(t) + d, { color: '#eb6834', w: 1.8 });
        P.arrow(t, y(t), t + 1, y(t) - d, { color: '#eb6834', w: 1.8 });
        P.text('?', t + 1.5, y(t), { font: '600 22px "IBM Plex Sans"', color: '#eb6834' });
        foot.innerHTML = `The state is only the height, <b>${y(t).toFixed(2)}</b>. Is the ball on its way up or down? Two balls at this height can have opposite futures: the state is <b>not Markov</b>. You would need to look at earlier states.`;
      } else {
        P.arrow(t, y(t), t + 1, y(t + 1), { color: '#1baf7a', w: 2.4 });
        foot.innerHTML = `The state is height <b>${y(t).toFixed(2)}</b> and velocity <b>${(d / dt).toFixed(1)}</b>. That is enough to predict the next state: the state is <b>Markov</b>. The robot does not need to know gravity, only that the information is there.`;
      }
    }
    draw();
  })();

  /* ----------------------------------------------- 5. policy */
  (function () {
    const P1 = new Plot('#pol-p', { w: 380, h: 240, pad: { l: 34, r: 10, t: 14, b: 28 } }), P2 = new Plot('#pol-c', { w: 380, h: 240, pad: { l: 34, r: 10, t: 14, b: 28 } });
    const PR = { rand: [0.25, 0.25, 0.25, 0.25], mostly: [0.05, 0.03, 0.02, 0.9], greedy: [0, 0, 0, 1] };
    let counts = [0, 0, 0, 0];
    const lab = ['up', 'down', 'left', 'right'];
    const draw = () => {
      const p = PR[mode.value];
      UL.bars(P1, p.map((v, i) => ({ v, label: lab[i], color: '#2a78d6' })), { ymin: 0, ymax: 1 });
      UL.bars(P2, counts.map((v, i) => ({ v, label: lab[i], color: '#111' })), { ymin: 0, ymax: 100, fv: (v) => String(v) });
    };
    const mode = UL.seg('pol-mode', () => { counts = [0, 0, 0, 0]; draw(); });
    $('#pol-sample').addEventListener('click', () => {
      const p = PR[mode.value]; counts = [0, 0, 0, 0];
      for (let i = 0; i < 100; i++) { let u = Math.random(), a = 0; while (a < 3 && u > p[a]) { u -= p[a]; a++; } counts[a]++; }
      draw();
    });
    draw();
  })();

  /* ----------------------------------------------- 6. gamma and returns */
  (function () {
    const P = new Plot('#g-plot', { w: 560, h: 260, pad: { l: 38, r: 10, t: 14, b: 34 } });
    const gs = UL.range('g-gamma', draw, (v) => v.toFixed(2));
    function draw() {
      const g = gs.v, K = 25, vals = Array.from({ length: K }, (_, k) => g ** k);
      P.clear(); P.domain(-0.7, K - 0.3, 0, 1.08); P.axes({ xlabel: 'steps into the future, k', ylabel: 'weight γᵏ', nx: 5, ny: 4 });
      const c = P.ctx, bw = (P.sx(1) - P.sx(0)) * 0.7;
      vals.forEach((v, k) => { c.fillStyle = k === 10 ? '#2a78d6' : '#9dbbda'; c.fillRect(P.sx(k) - bw / 2, P.sy(v), bw, P.sy(0) - P.sy(v)); });
      const half = g > 0 && g < 1 ? Math.log(0.5) / Math.log(g) : g === 0 ? 0 : Infinity;
      UL.stats('g-stats', [
        { k: 'reward 10 steps away is worth', v: (g ** 10).toFixed(3) },
        { k: 'weights halve every', v: isFinite(half) ? `${half.toFixed(1)} <small>steps</small>` : '∞' },
        { k: '−1 every step, for ever, adds to', v: g < 1 ? fmt(-1 / (1 - g), 1) : '−∞' },
        { k: 'rough horizon 1/(1−γ)', v: g < 1 ? `${(1 / (1 - g)).toFixed(0)} <small>steps</small>` : '∞', hi: true },
      ]);
    }
    draw();
    const rIn = $('#ret-r'), tbl = $('#ret-table'); const rg = UL.range('ret-g', calc, (v) => v.toFixed(2));
    function calc() {
      const R = rIn.value.split(/[,\s]+/).map((x) => parseFloat(x.replace('−', '-'))).filter((x) => isFinite(x)), g = rg.v;
      const G = new Array(R.length); let nxt = 0;
      for (let i = R.length - 1; i >= 0; i--) { G[i] = R[i] + g * nxt; nxt = G[i]; }
      tbl.innerHTML = '<thead><tr><th>t</th><th>reward R<sub>t+1</sub></th><th>return G<sub>t</sub> = R<sub>t+1</sub> + γ G<sub>t+1</sub></th></tr></thead><tbody>' +
        R.map((r, i) => `<tr><td>${i}</td><td>${fmt(r, 2)}</td><td>${fmt(r, 2)} + ${g.toFixed(2)} × ${i + 1 < R.length ? (G[i + 1] < 0 ? '(' + fmt(G[i + 1], 3) + ')' : fmt(G[i + 1], 3)) : '0'} = <b>${fmt(G[i], 3)}</b></td></tr>`).join('') + '</tbody>';
    }
    rIn.addEventListener('input', calc); calc();
  })();

  UL.quiz('quiz-box', [
    { q: 'What does the reward tell the agent?', o: ['The action it should have taken', 'How good the outcome of its action was, as one number', 'The full state of the environment', 'The probability of each action'], a: 1, why: 'A reward evaluates; it never instructs. That is the key difference from supervised learning.' },
    { q: 'A thermostat program only chooses a target temperature; an existing controller switches the heater. In this framing the heater switch is part of…', o: ['the agent', 'the environment', 'the reward', 'the policy'], a: 1, why: 'The agent is what you control directly: here, the set-point. Everything else, including the switching controller, is environment.' },
    { q: 'A robot gets only the position of a thrown ball as its state. Why is this not Markov?', o: ['Position is not a number', 'The same position can be reached going up or coming down, so the next state is not determined', 'Balls do not obey physics', 'Rewards are missing'], a: 1, why: 'Adding the velocity makes the state contain enough information to predict the next one.' },
    { q: 'Rewards −1, −1, 0 and γ = 0.5. What is G₀?', o: ['−2', '−1.5', '−1.25', '−1'], a: 1, why: 'Backwards: G₂ = 0, G₁ = −1 + 0.5·0 = −1, G₀ = −1 + 0.5·(−1) = −1.5.' },
    { q: 'Why can γ = 1 be a problem?', o: ['It makes learning too fast', 'In a task that never ends, the sum of rewards can grow without limit', 'It forbids negative rewards', 'It makes the policy deterministic'], a: 1, why: 'With γ < 1 the sum stays finite; γ = 1 only works when episodes end.' },
  ]);
  UL.start();
})();
