/*!
 * Reinforcement Lab — shared library
 * Grid worlds, the learning algorithms of the lecture, the cart-pole, canvas plotting and page UI.
 * Everything runs in the browser; no dependencies.
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const UL = {};
  /* ================================================================ random */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = function () {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.int = (n) => Math.floor(r() * n);
    return r;
  }
  UL.rng = rng;

  /* ================================================================ colours */
  UL.COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  UL.SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star', 'tri-down', 'plus'];
  UL.INK = '#111111'; UL.MUTED = '#6b6b68'; UL.FAINT = '#a3a3a0'; UL.LINE = '#e7e7e4'; UL.GREY = '#c9c9c4';
  UL.color = (k) => (k < 0 ? UL.GREY : UL.COLORS[k % UL.COLORS.length]);
  UL.shape = (k) => (k < 0 ? 'circle' : UL.SHAPES[k % UL.SHAPES.length]);
  UL.rgba = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  UL.mix = function (weights) { // blend palette colours by weights (soft clustering)
    let r = 0, g = 0, b = 0, s = 0;
    weights.forEach((w, k) => {
      const n = parseInt(UL.color(k).slice(1), 16);
      r += w * ((n >> 16) & 255); g += w * ((n >> 8) & 255); b += w * (n & 255); s += w;
    });
    s = s || 1;
    return `rgb(${Math.round(r / s)},${Math.round(g / s)},${Math.round(b / s)})`;
  };


  /* ================================================================ plotting */
  class Plot {
    constructor(el, o = {}) {
      this.el = typeof el === 'string' ? document.querySelector(el) : el;
      this.W = o.w || 600; this.H = o.h || 420;
      this.pad = Object.assign({ l: 14, r: 14, t: 14, b: 14 }, o.pad || {});
      this.cv = document.createElement('canvas');
      this.dpr = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
      this.cv.style.aspectRatio = `${this.W} / ${this.H}`;
      this.cv.setAttribute('role', 'img');
      if (o.label) this.cv.setAttribute('aria-label', o.label);
      this.el.appendChild(this.cv);
      this.ctx = this.cv.getContext('2d');
      this.ctx.scale(this.dpr, this.dpr);
      this.dom = [0, 1, 0, 1];
    }
    domain(x0, x1, y0, y1, equal) {
      if (equal) { // same scale on both axes so circles look round
        const pw = this.W - this.pad.l - this.pad.r, ph = this.H - this.pad.t - this.pad.b;
        const sx = pw / (x1 - x0), sy = ph / (y1 - y0), s = Math.min(sx, sy);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        x0 = cx - pw / s / 2; x1 = cx + pw / s / 2; y0 = cy - ph / s / 2; y1 = cy + ph / s / 2;
      }
      this.dom = [x0, x1, y0, y1]; return this;
    }
    fit(pts, margin = 0.08, equal = true, fx = (p) => p.x, fy = (p) => p.y) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts.forEach((p) => { const x = fx(p), y = fy(p); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
      if (x1 - x0 < 1e-9) { x0 -= 1; x1 += 1; } if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
      const mx = (x1 - x0) * margin, my = (y1 - y0) * margin;
      return this.domain(x0 - mx, x1 + mx, y0 - my, y1 + my, equal);
    }
    sx(x) { const [a, b] = this.dom; return this.pad.l + ((x - a) / (b - a)) * (this.W - this.pad.l - this.pad.r); }
    sy(y) { const [, , c, d] = this.dom; return this.H - this.pad.b - ((y - c) / (d - c)) * (this.H - this.pad.t - this.pad.b); }
    ix(px) { const [a, b] = this.dom; return a + ((px - this.pad.l) / (this.W - this.pad.l - this.pad.r)) * (b - a); }
    iy(py) { const [, , c, d] = this.dom; return c + ((this.H - this.pad.b - py) / (this.H - this.pad.t - this.pad.b)) * (d - c); }
    clear() { this.ctx.clearRect(0, 0, this.W, this.H); return this; }
    clipped(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.pad.l, this.pad.t, this.W - this.pad.l - this.pad.r, this.H - this.pad.t - this.pad.b); c.clip(); fn(); c.restore(); }
    frame() {
      const c = this.ctx; c.strokeStyle = UL.LINE; c.lineWidth = 1;
      c.strokeRect(this.pad.l + 0.5, this.pad.t + 0.5, this.W - this.pad.l - this.pad.r - 1, this.H - this.pad.t - this.pad.b - 1);
      return this;
    }
    axes(o = {}) { // light grid + tick labels
      const c = this.ctx, [x0, x1, y0, y1] = this.dom;
      c.font = '10.5px "IBM Plex Mono", monospace'; c.fillStyle = UL.MUTED; c.lineWidth = 1;
      const ticks = (a, b, n) => { const step = niceStep((b - a) / n); const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10)); return out; };
      if (o.x !== false) ticks(x0, x1, o.nx || 6).forEach((v) => {
        const X = Math.round(this.sx(v)) + 0.5; c.strokeStyle = '#f0f0ed'; c.beginPath(); c.moveTo(X, this.pad.t); c.lineTo(X, this.H - this.pad.b); c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(o.fx ? o.fx(v) : fmtTick(v), X, this.H - this.pad.b + 6);
      });
      if (o.y !== false) ticks(y0, y1, o.ny || 5).forEach((v) => {
        const Y = Math.round(this.sy(v)) + 0.5; c.strokeStyle = '#f0f0ed'; c.beginPath(); c.moveTo(this.pad.l, Y); c.lineTo(this.W - this.pad.r, Y); c.stroke();
        c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(o.fy ? o.fy(v) : fmtTick(v), this.pad.l - 6, Y);
      });
      c.strokeStyle = UL.GREY; c.beginPath(); c.moveTo(this.pad.l, this.H - this.pad.b + 0.5); c.lineTo(this.W - this.pad.r, this.H - this.pad.b + 0.5); c.stroke();
      if (o.xlabel) { c.fillStyle = UL.INK; c.font = '11.5px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(o.xlabel, (this.pad.l + this.W - this.pad.r) / 2, this.H - 2); }
      if (o.ylabel) { c.save(); c.fillStyle = UL.INK; c.font = '11.5px "IBM Plex Sans", sans-serif'; c.translate(10, (this.pad.t + this.H - this.pad.b) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.ylabel, 0, 0); c.restore(); }
      return this;
    }
    marker(x, y, o = {}) { drawMarker(this.ctx, this.sx(x), this.sy(y), o); }
    markerPx(X, Y, o = {}) { drawMarker(this.ctx, X, Y, o); }
    line(x0, y0, x1, y1, o = {}) {
      const c = this.ctx; c.save(); c.strokeStyle = o.color || UL.INK; c.lineWidth = o.w || 1.5; c.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (o.dash) c.setLineDash(o.dash);
      c.beginPath(); c.moveTo(this.sx(x0), this.sy(y0)); c.lineTo(this.sx(x1), this.sy(y1)); c.stroke(); c.restore();
    }
    poly(pts, o = {}) {
      const c = this.ctx; if (!pts.length) return; c.save(); c.strokeStyle = o.color || UL.INK; c.lineWidth = o.w || 2; c.lineJoin = 'round'; c.lineCap = 'round';
      if (o.dash) c.setLineDash(o.dash); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(this.sx(p[0]), this.sy(p[1])) : c.moveTo(this.sx(p[0]), this.sy(p[1]))));
      if (o.fill) { c.fillStyle = o.fill; c.fill(); } if (o.w !== 0) c.stroke(); c.restore();
    }
    circle(x, y, R, o = {}) { // R in data units
      const c = this.ctx, rx = Math.abs(this.sx(x + R) - this.sx(x)); c.save(); c.beginPath(); c.arc(this.sx(x), this.sy(y), rx, 0, 2 * Math.PI);
      if (o.fill) { c.fillStyle = o.fill; c.fill(); } if (o.color) { c.strokeStyle = o.color; c.lineWidth = o.w || 1; if (o.dash) c.setLineDash(o.dash); c.stroke(); } c.restore();
    }
    ellipse(x, y, rx, ry, ang, o = {}) {
      const c = this.ctx, kx = Math.abs(this.sx(1) - this.sx(0)), ky = Math.abs(this.sy(1) - this.sy(0));
      c.save(); c.translate(this.sx(x), this.sy(y)); c.scale(kx, -ky); c.rotate(ang);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI); c.restore();
      c.save(); if (o.fill) { c.fillStyle = o.fill; c.fill(); } c.strokeStyle = o.color || UL.INK; c.lineWidth = o.w || 1.5; if (o.dash) c.setLineDash(o.dash); c.stroke(); c.restore();
    }
    arrow(x0, y0, x1, y1, o = {}) {
      const c = this.ctx, X0 = this.sx(x0), Y0 = this.sy(y0), X1 = this.sx(x1), Y1 = this.sy(y1), a = Math.atan2(Y1 - Y0, X1 - X0), h = o.head || 9;
      c.save(); c.strokeStyle = c.fillStyle = o.color || UL.INK; c.lineWidth = o.w || 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X1 - Math.cos(a) * h * 0.6, Y1 - Math.sin(a) * h * 0.6); c.stroke();
      c.beginPath(); c.moveTo(X1, Y1); c.lineTo(X1 - h * Math.cos(a - 0.4), Y1 - h * Math.sin(a - 0.4)); c.lineTo(X1 - h * Math.cos(a + 0.4), Y1 - h * Math.sin(a + 0.4)); c.closePath(); c.fill();
      if (o.label) { c.font = '500 12px "IBM Plex Sans", sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(o.label, X1 + 7 * Math.cos(a) + 3, Y1 + 9 * Math.sin(a)); }
      c.restore();
    }
    text(s, x, y, o = {}) { this.textPx(s, this.sx(x), this.sy(y), o); }
    textPx(s, X, Y, o = {}) {
      const c = this.ctx; c.save(); c.font = o.font || '11px "IBM Plex Mono", monospace'; c.fillStyle = o.color || UL.INK;
      c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
      if (o.halo) { c.lineWidth = 3.5; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.strokeText(s, X, Y); }
      c.fillText(s, X, Y); c.restore();
    }
    regions(fn, step = 6, alpha = 0.1) { // colour every patch by fn(x, y) -> cluster index
      const c = this.ctx; step = Math.round(step);
      for (let X = this.pad.l; X < this.W - this.pad.r; X += step) for (let Y = this.pad.t; Y < this.H - this.pad.b; Y += step) {
        const k = fn(this.ix(X + step / 2), this.iy(Y + step / 2));
        if (k == null || k < 0) continue;
        c.fillStyle = UL.rgba(UL.color(k), alpha); c.fillRect(X, Y, Math.min(step, this.W - this.pad.r - X), Math.min(step, this.H - this.pad.b - Y));
      }
    }
    pointer(e) { const r = this.cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * this.W, ((e.clientY - r.top) / r.height) * this.H]; }
    nearest(pts, e, maxPx = 12, fx = (p) => p.x, fy = (p) => p.y) {
      const [X, Y] = this.pointer(e); let best = -1, bd = maxPx * maxPx;
      pts.forEach((p, i) => { const dx = this.sx(fx(p)) - X, dy = this.sy(fy(p)) - Y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      return best;
    }
  }
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function fmtTick(v) { return Math.abs(v) >= 1000 ? v.toLocaleString('en-US') : String(+v.toFixed(3)); }
  function drawMarker(c, X, Y, o) {
    const r = o.r || 4.2, shape = o.shape || 'circle';
    c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.beginPath();
    if (shape === 'circle') c.arc(X, Y, r, 0, 2 * Math.PI);
    else if (shape === 'square') c.rect(X - r * 0.88, Y - r * 0.88, r * 1.76, r * 1.76);
    else if (shape === 'triangle') { c.moveTo(X, Y - r * 1.15); c.lineTo(X + r * 1.05, Y + r * 0.75); c.lineTo(X - r * 1.05, Y + r * 0.75); c.closePath(); }
    else if (shape === 'tri-down') { c.moveTo(X, Y + r * 1.15); c.lineTo(X + r * 1.05, Y - r * 0.75); c.lineTo(X - r * 1.05, Y - r * 0.75); c.closePath(); }
    else if (shape === 'diamond') { c.moveTo(X, Y - r * 1.25); c.lineTo(X + r * 1.05, Y); c.lineTo(X, Y + r * 1.25); c.lineTo(X - r * 1.05, Y); c.closePath(); }
    else if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, R = i % 2 ? r * 0.55 : r * 1.3; c.lineTo(X + R * Math.cos(a), Y + R * Math.sin(a)); } c.closePath(); }
    else if (shape === 'cross' || shape === 'plus' || shape === 'x') {
      const k = r * 1.05; c.lineWidth = o.lw || 2.4; c.strokeStyle = o.fill || UL.INK; c.lineCap = 'round';
      if (shape === 'plus') { c.moveTo(X - k, Y); c.lineTo(X + k, Y); c.moveTo(X, Y - k); c.lineTo(X, Y + k); }
      else { c.moveTo(X - k, Y - k); c.lineTo(X + k, Y + k); c.moveTo(X + k, Y - k); c.lineTo(X - k, Y + k); }
      if (o.ring !== false) { c.save(); c.lineWidth = (o.lw || 2.4) + 2.5; c.strokeStyle = '#fff'; c.stroke(); c.restore(); }
      c.stroke(); c.restore(); return;
    }
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.ring !== false) { c.lineWidth = o.ringW || 1.2; c.strokeStyle = o.ringColor || '#fff'; c.stroke(); }
    if (o.stroke) { c.lineWidth = o.lw || 1.5; c.strokeStyle = o.stroke; c.stroke(); }
    c.restore();
  }
  UL.Plot = Plot;
  UL.drawMarker = drawMarker;

  /* ================================================================ UI */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  UL.$ = $; UL.$$ = $$;
  UL.range = function (id, cb, fmt = (v) => v) {
    const el = typeof id === 'string' ? document.getElementById(id) : id, out = el.parentElement.querySelector('output, .v');
    const upd = () => { const v = +el.value; if (out) out.textContent = fmt(v); cb && cb(v); };
    el.addEventListener('input', upd); if (out) out.textContent = fmt(+el.value);
    return { el, get v() { return +el.value; }, set(v) { el.value = v; if (out) out.textContent = fmt(+el.value); } };
  };
  UL.seg = function (id, cb) {
    const el = typeof id === 'string' ? document.getElementById(id) : id, btns = $$('button', el);
    const api = {
      value: (btns.find((b) => b.classList.contains('on')) || btns[0]).dataset.v,
      set(v, fire = true) { api.value = v; btns.forEach((b) => b.classList.toggle('on', b.dataset.v === v)); if (fire && cb) cb(v); },
    };
    btns.forEach((b) => b.addEventListener('click', () => api.set(b.dataset.v)));
    btns.forEach((b) => b.classList.toggle('on', b.dataset.v === api.value));
    return api;
  };
  UL.tip = {
    el: null,
    show(e, html) {
      if (!this.el) { this.el = document.createElement('div'); this.el.className = 'tooltip'; document.body.appendChild(this.el); }
      this.el.innerHTML = html; this.el.hidden = false;
      const x = e.clientX, y = e.clientY, w = this.el.offsetWidth;
      this.el.style.left = (x + w + 30 > window.innerWidth ? x - w - 24 : x) + 'px'; this.el.style.top = y + 'px';
    },
    hide() { if (this.el) this.el.hidden = true; },
  };
  UL.sw = (k) => `<span class="sw" style="background:${UL.color(k)}"></span>`;
  UL.legend = function (el, items) {
    el.innerHTML = items.map((it) => `<span><i class="${it.cls || ''}" style="background:${it.color}"></i>${it.label}</span>`).join('');
  };
  UL.copyText = async function (t) {
    try { await navigator.clipboard.writeText(t); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  };
  UL.tocSpy = function () {
    const links = $$('.toc a'); if (!links.length) return;
    const secs = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const on = () => {
      let cur = secs[0];
      secs.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.3) cur = s; });
      links.forEach((a) => a.classList.toggle('active', cur && a.getAttribute('href') === '#' + cur.id));
    };
    window.addEventListener('scroll', on, { passive: true }); on();
  };
  UL.math = function () {
    if (window.renderMathInElement) renderMathInElement(document.body, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'canvas'],
      throwOnError: false,
    });
  };
  UL.tex = function (el, src, display = false) {
    if (window.katex) katex.render(src, el, { throwOnError: false, displayMode: display }); else el.textContent = src;
  };
  UL.quiz = function (rootId, qs) {
    const root = document.getElementById(rootId); if (!root) return;
    const score = document.getElementById(rootId + '-score');
    let answered = 0, right = 0;
    root.innerHTML = qs.map((q, i) => `<div class="q" data-i="${i}"><p class="q-text"><span>${q.q}</span></p><div class="q-opts">${q.o.map((o, j) => `<button data-j="${j}">${o}</button>`).join('')}</div><p class="q-why">${q.why}</p></div>`).join('');
    $$('.q', root).forEach((qd) => {
      const q = qs[+qd.dataset.i];
      $$('button', qd).forEach((b) => b.addEventListener('click', () => {
        const j = +b.dataset.j; answered++; if (j === q.a) right++;
        $$('button', qd).forEach((x) => { x.disabled = true; if (+x.dataset.j === q.a) x.classList.add('right'); });
        if (j !== q.a) b.classList.add('wrong');
        qd.classList.add('done');
        if (score) score.textContent = `Score: ${right} / ${answered} answered (of ${qs.length})`;
      }));
    });
    UL.math();
  };
  UL.onVisible = function (el, fn) { // start animations only when on screen
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => fn(e.isIntersecting)), { threshold: 0.05 }).observe(el);
  };
  UL.start = function () {
    UL.tocSpy();
    UL.math();
  };
  /* ================================================================ RL: grid worlds */
  // Actions follow the lecture: 0 = up, 1 = down, 2 = left, 3 = right. Cells are (column, row), row 1 at the bottom.
  const ACTS = ['up', 'down', 'left', 'right'];
  const DEL = [[0, 1], [0, -1], [-1, 0], [1, 0]];
  UL.ACTS = ACTS; UL.DEL = DEL; UL.ARROWS = ['↑', '↓', '←', '→'];

  class Grid {
    constructor(o) {
      this.W = o.W; this.H = o.H; this.cap = o.cap || 20;
      this.start = o.start || [1, 1]; this.target = o.target || [o.W, 1];
      this.walls = new Set((o.walls || []).map(([c, r]) => this.key(c, r)));
      this.cliff = new Set((o.cliff || []).map(([c, r]) => this.key(c, r)));
      this.stepR = o.stepR == null ? -1 : o.stepR; this.goalR = o.goalR == null ? 0 : o.goalR; this.cliffR = o.cliffR == null ? -100 : o.cliffR;
      this.N = this.W * this.H;
      this.extra = new Map((o.extra || []).map((x) => [this.key(x.at[0], x.at[1]), x.r])); // extra terminal squares with their own reward
    }
    key(c, r) { return (r - 1) * this.W + (c - 1); }
    cr(k) { return [(k % this.W) + 1, Math.floor(k / this.W) + 1]; }
    isWall(k) { return this.walls.has(k); }
    get s0() { return this.key(this.start[0], this.start[1]); }
    get goal() { return this.key(this.target[0], this.target[1]); }
    states() { const out = []; for (let k = 0; k < this.N; k++) if (!this.walls.has(k)) out.push(k); return out; }
    step(s, a) { // -> { s2, r, done, bump, fell }
      const [c, r] = this.cr(s), c2 = c + DEL[a][0], r2 = r + DEL[a][1];
      if (c2 < 1 || c2 > this.W || r2 < 1 || r2 > this.H || this.walls.has(this.key(c2, r2))) return { s2: s, r: this.stepR, done: s === this.goal, bump: true };
      const k = this.key(c2, r2);
      if (this.cliff.has(k)) return { s2: this.s0, r: this.cliffR, done: false, fell: true, at: k };
      if (this.extra.has(k)) return { s2: k, r: this.extra.get(k), done: true, extra: true };
      if (k === this.goal) return { s2: k, r: this.goalR, done: true };
      return { s2: k, r: this.stepR, done: false };
    }
    toggleWall(k) { if (k === this.s0 || k === this.goal) return; if (this.walls.has(k)) this.walls.delete(k); else this.walls.add(k); }
    shortest() { // BFS: number of moves from the start, or Infinity
      const d = new Array(this.N).fill(Infinity), q = [this.s0]; d[this.s0] = 0;
      while (q.length) { const u = q.shift(); for (let a = 0; a < 4; a++) { const { s2, fell } = this.step(u, a); if (!fell && d[s2] === Infinity) { d[s2] = d[u] + 1; q.push(s2); } } }
      return d[this.goal];
    }
    distTo() { // moves from every cell to the target (for "guided" runs)
      const d = new Array(this.N).fill(Infinity); d[this.goal] = 0; let changed = true;
      while (changed) { changed = false; for (const s of this.states()) for (let a = 0; a < 4; a++) { const { s2, fell, bump } = this.step(s, a); if (!fell && !bump && d[s2] + 1 < d[s]) { d[s] = d[s2] + 1; changed = true; } } }
      return d;
    }
  }
  UL.Grid = Grid;
  UL.MAZES = {
    small: { W: 5, H: 3, walls: [[3, 1], [3, 2]], start: [1, 1], target: [5, 1], cap: 20 },
    big: { W: 9, H: 6, walls: [[3, 1], [3, 2], [3, 3], [3, 4], [5, 3], [5, 4], [5, 5], [5, 6], [7, 1], [7, 2], [7, 3], [7, 4]], start: [1, 1], target: [9, 1], cap: 60 },
    open6: { W: 6, H: 6, walls: [[2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [2, 4], [2, 5]], start: [1, 1], target: [6, 6], cap: 60 },
    cliff: { W: 12, H: 4, cliff: Array.from({ length: 10 }, (_, i) => [i + 2, 1]), start: [1, 1], target: [12, 1], cap: 200 },
    twoCheese: { W: 6, H: 4, walls: [[3, 2], [3, 3]], start: [1, 3], target: [6, 4], goalR: 10, stepR: 0, extra: [{ at: [1, 1], r: 1 }], cap: 50 },
  };
  UL.grid = (name) => new Grid(UL.MAZES[name]);
  // the lucky trajectory of the lecture (slide "One lucky trajectory")
  UL.LUCKY = [[[1, 1], 0], [[1, 2], 2], [[1, 2], 0], [[1, 3], 0], [[1, 3], 3], [[2, 3], 3], [[3, 3], 0], [[3, 3], 3], [[4, 3], 1], [[4, 2], 3], [[5, 2], 1]];

  /* ---------------------------------------------------- tabular learners */
  function argmaxRand(q, r) { let m = -Infinity, best = []; for (let i = 0; i < q.length; i++) { if (q[i] > m + 1e-12) { m = q[i]; best = [i]; } else if (Math.abs(q[i] - m) <= 1e-12) best.push(i); } return best.length === 1 ? best[0] : best[r.int(best.length)]; }
  UL.argmaxRand = argmaxRand;
  class Learner {
    // method: 'mc' | 'sarsa' | 'esarsa' | 'q' | 'sarsaL' (SARSA with eligibility traces)
    constructor(grid, method, o = {}) {
      this.g = grid; this.m = method;
      this.alpha = o.alpha == null ? 0.1 : o.alpha; this.gamma = o.gamma == null ? 0.8 : o.gamma;
      this.eps0 = o.eps0 == null ? 0.9 : o.eps0; this.eps1 = o.eps1 == null ? 0.1 : o.eps1; this.episodes = o.episodes || 300;
      this.lambda = o.lambda == null ? 0.9 : o.lambda; this.guided = o.guided || 0;
      this.r = rng(o.seed || 1); this.Q = new Float64Array(grid.N * 4); this.ep = 0; this.curve = [];
      this.fixedEps = o.eps;
    }
    q(s) { return this.Q.subarray(s * 4, s * 4 + 4); }
    get eps() { if (this.fixedEps != null) return this.fixedEps; const f = Math.min(1, this.ep / Math.max(1, this.episodes - 1)); return this.eps0 + (this.eps1 - this.eps0) * f; }
    act(s, eps = this.eps) { return this.r() < eps ? this.r.int(4) : argmaxRand(this.q(s), this.r); }
    greedy(s) { return argmaxRand(this.q(s), this.r); }
    probs(s, eps = this.eps) { const p = [eps / 4, eps / 4, eps / 4, eps / 4]; const q = this.q(s); let m = Math.max(...q); const best = [0, 1, 2, 3].filter((a) => Math.abs(q[a] - m) < 1e-12); best.forEach((a) => (p[a] += (1 - eps) / best.length)); return p; }
    episode() { // run one episode and learn; returns { ret, steps, reached, path, falls }
      const g = this.g, eps = this.eps, guide = this.ep < this.guided ? g.distTo() : null;
      const pick = (s) => {
        if (guide) { let best = 0, bd = Infinity; for (let a = 0; a < 4; a++) { const o = g.step(s, a); if (!o.bump && !o.fell && guide[o.s2] < bd) { bd = guide[o.s2]; best = a; } } return best; }
        return this.act(s, eps);
      };
      let s = g.s0, a = pick(s), ret = 0, steps = 0, reached = false; const path = [s], traj = [], falls = [];
      const E = this.m === 'sarsaL' ? new Float64Array(this.Q.length) : null;
      while (steps < g.cap) {
        const o = g.step(s, a); ret += o.r; steps++; traj.push([s, a, o.r]); if (o.fell) falls.push(o.at);
        const a2 = o.done ? 0 : pick(o.s2);
        if (this.m !== 'mc') {
          let next = 0;
          if (!o.done) {
            if (this.m === 'sarsa' || this.m === 'sarsaL') next = this.q(o.s2)[a2];
            else if (this.m === 'q') next = Math.max(...this.q(o.s2));
            else if (this.m === 'esarsa') { const p = this.probs(o.s2, eps); next = p.reduce((t, pi, i) => t + pi * this.q(o.s2)[i], 0); }
          }
          const delta = o.r + this.gamma * next - this.Q[s * 4 + a];
          if (E) { E[s * 4 + a] = 1; for (let i = 0; i < E.length; i++) if (E[i] > 1e-6) { this.Q[i] += this.alpha * delta * E[i]; E[i] *= this.gamma * this.lambda; } }
          else this.Q[s * 4 + a] += this.alpha * delta;
        }
        s = o.s2; a = a2; path.push(s);
        if (o.done) { reached = true; break; }
      }
      if (this.m === 'mc') { let G = 0; for (let i = traj.length - 1; i >= 0; i--) { const [ss, aa, rr] = traj[i]; G = rr + this.gamma * G; this.Q[ss * 4 + aa] += this.alpha * (G - this.Q[ss * 4 + aa]); } }
      this.ep++; this.curve.push(ret);
      return { ret, steps, reached, path, falls, traj };
    }
  }
  UL.Learner = Learner;
  // average learning curves of many runs
  UL.averageCurve = function (make, runs, episodes) {
    const sum = new Float64Array(episodes);
    for (let k = 0; k < runs; k++) { const L = make(k); for (let e = 0; e < episodes; e++) sum[e] += L.episode().ret; }
    return Array.from(sum, (v) => v / runs);
  };
  UL.smooth = (arr, k = 10) => arr.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - k + 1); j <= i; j++) { s += arr[j]; n++; } return s / n; });

  // one-step actor–critic with a softmax policy (tabular)
  class ActorCritic {
    constructor(grid, o = {}) {
      this.g = grid; this.a = o.alpha == null ? 0.2 : o.alpha; this.b = o.beta == null ? 0.2 : o.beta; this.gamma = o.gamma == null ? 0.8 : o.gamma;
      this.r = rng(o.seed || 1); this.th = new Float64Array(grid.N * 4); this.V = new Float64Array(grid.N); this.ep = 0; this.curve = [];
    }
    pi(s) { const t = this.th.subarray(s * 4, s * 4 + 4), m = Math.max(...t), e = Array.from(t, (v) => Math.exp(v - m)), z = e.reduce((x, y) => x + y, 0); return e.map((v) => v / z); }
    episode() {
      const g = this.g; let s = g.s0, ret = 0, steps = 0, reached = false; const path = [s];
      while (steps < g.cap) {
        const p = this.pi(s); let u = this.r(), a = 0; while (a < 3 && u > p[a]) { u -= p[a]; a++; }
        const o = g.step(s, a); ret += o.r; steps++;
        const delta = o.r + (o.done ? 0 : this.gamma * this.V[o.s2]) - this.V[s];
        this.V[s] += this.b * delta;
        for (let i = 0; i < 4; i++) this.th[s * 4 + i] += this.a * delta * ((i === a ? 1 : 0) - p[i]);
        s = o.s2; path.push(s); if (o.done) { reached = true; break; }
      }
      this.ep++; this.curve.push(ret); return { ret, steps, reached, path };
    }
  }
  UL.ActorCritic = ActorCritic;

  // value iteration with a known world model: returns V after every sweep
  UL.valueIteration = function (grid, gamma = 0.8, sweeps = 12) {
    let V = new Float64Array(grid.N); const out = [V.slice()];
    for (let k = 0; k < sweeps; k++) {
      const V2 = V.slice();
      for (const s of grid.states()) { if (s === grid.goal) continue; let best = -Infinity; for (let a = 0; a < 4; a++) { const o = grid.step(s, a); best = Math.max(best, o.r + (o.done ? 0 : gamma * V[o.s2])); } V2[s] = best; }
      V = V2; out.push(V.slice());
    }
    return out;
  };

  /* ---------------------------------------------------- drawing grids */
  UL.IMG = {};
  ['rat', 'cheese'].forEach((n) => { const im = new Image(); im.src = (window.UL_ROOT || '') + `assets/img/${n}.png`; UL.IMG[n] = im; im.onload = () => document.dispatchEvent(new Event('ul-img')); });
  UL.heat = function (v, vmin = -5) { // 0 → white, vmin → deep red
    const t = Math.max(0, Math.min(1, v / vmin));
    const a = [255, 255, 255], b = [232, 163, 155], c = [176, 58, 46];
    const mix = (x, y, f) => x.map((xi, i) => Math.round(xi + (y[i] - xi) * f));
    const col = t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
    return `rgb(${col[0]},${col[1]},${col[2]})`;
  };
  UL.heatPos = function (v, vmax = 1) { const t = Math.max(0, Math.min(1, v / vmax)); const a = [255, 255, 255], b = [42, 120, 214]; return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`; };
  class GridView {
    constructor(el, grid, o = {}) {
      this.g = grid; this.o = o;
      const cell = o.cell || 72;
      this.p = new Plot(el, { w: grid.W * cell + 4, h: grid.H * cell + 4 + (o.extraH || 0), pad: { l: 2, r: 2, t: 2 + (o.extraH || 0), b: 2 }, label: o.label || 'Grid world' });
      this.reset();
    }
    reset() { this.p.domain(0.5, this.g.W + 0.5, 0.5, this.g.H + 0.5, false); this.cs = (this.p.W - 4) / this.g.W; }
    X(c) { return this.p.sx(c); } Y(r) { return this.p.sy(r); }
    cellAt(e) { const [X, Y] = this.p.pointer(e); const c = Math.round(this.p.ix(X)), r = Math.round(this.p.iy(Y)); if (c < 1 || c > this.g.W || r < 1 || r > this.g.H) return -1; return this.g.key(c, r); }
    draw(o = {}) {
      const g = this.g, P = this.p, c = P.ctx, cs = this.cs; P.clear();
      const rect = (k, fill) => { const [cc, rr] = g.cr(k); c.fillStyle = fill; c.fillRect(P.sx(cc - 0.5), P.sy(rr + 0.5), cs, cs); };
      // backgrounds
      for (let k = 0; k < g.N; k++) {
        if (g.walls.has(k)) { rect(k, '#3b414b'); const [cc, rr] = g.cr(k); c.save(); c.beginPath(); c.rect(P.sx(cc - 0.5), P.sy(rr + 0.5), cs, cs); c.clip(); c.strokeStyle = '#59606b'; c.lineWidth = 1.2; for (let t = -cs; t < cs * 2; t += 9) { c.beginPath(); c.moveTo(P.sx(cc - 0.5) + t, P.sy(rr + 0.5) + cs); c.lineTo(P.sx(cc - 0.5) + t + cs, P.sy(rr + 0.5)); c.stroke(); } c.restore(); continue; }
        if (g.cliff.has(k)) { rect(k, '#e4e4e0'); continue; }
        if (k === g.goal || g.extra.has(k)) { rect(k, '#fff2c2'); continue; }
        if (o.V) rect(k, o.vPos ? UL.heatPos(o.V[k], o.vmax || 1) : UL.heat(o.V[k], o.vmin || -5));
        if (o.cellFill && o.cellFill[k]) rect(k, o.cellFill[k]);
      }
      // Q triangles
      if (o.Q) for (const k of g.states()) {
        if (k === g.goal || g.cliff.has(k)) continue;
        const [cc, rr] = g.cr(k), x0 = P.sx(cc - 0.5), y0 = P.sy(rr + 0.5), x1 = x0 + cs, y1 = y0 + cs, xm = x0 + cs / 2, ym = y0 + cs / 2;
        const tri = [[[x0, y0], [x1, y0]], [[x0, y1], [x1, y1]], [[x0, y0], [x0, y1]], [[x1, y0], [x1, y1]]]; // up, down, left, right
        for (let a = 0; a < 4; a++) {
          const v = o.Q[k * 4 + a]; c.beginPath(); c.moveTo(xm, ym); c.lineTo(...tri[a][0]); c.lineTo(...tri[a][1]); c.closePath();
          c.fillStyle = UL.heat(v, o.vmin || -5); c.fill(); c.strokeStyle = '#d9d9d5'; c.lineWidth = 0.7; c.stroke();
          if (o.hiQ && o.hiQ[0] === k && o.hiQ[1] === a) { c.strokeStyle = '#eda100'; c.lineWidth = 3; c.stroke(); }
          if (o.qNums && cs >= 60) {
            const pos = [[xm, y0 + cs * 0.16], [xm, y1 - cs * 0.16], [x0 + cs * 0.19, ym], [x1 - cs * 0.19, ym]][a];
            P.textPx(v === 0 ? '0' : v.toFixed(Math.abs(v) < 10 ? 2 : 1).replace('-', '−'), pos[0], pos[1], { font: `${cs < 80 ? 9 : 10}px "IBM Plex Mono", monospace`, color: '#333' });
          }
        }
      }
      // grid lines
      c.strokeStyle = '#222'; c.lineWidth = 1;
      for (let i = 0; i <= g.W; i++) { const X = Math.round(P.sx(i + 0.5)) + 0.5; c.beginPath(); c.moveTo(X, P.sy(g.H + 0.5)); c.lineTo(X, P.sy(0.5)); c.stroke(); }
      for (let j = 0; j <= g.H; j++) { const Y = Math.round(P.sy(j + 0.5)) + 0.5; c.beginPath(); c.moveTo(P.sx(0.5), Y); c.lineTo(P.sx(g.W + 0.5), Y); c.stroke(); }
      // target
      const [tc, tr] = g.cr(g.goal); const two = g.extra.size > 0; this.icon('cheese', tc, tr + (two ? 0.08 : 0), two ? 0.66 : 0.62);
      g.extra.forEach((rew, k) => { const [ec, er] = g.cr(k); this.icon('cheese', ec, er + 0.08, 0.32); });
      if (two) { const lab = (k, v) => { const [cc, rr] = g.cr(k); P.textPx(`+${v}`, P.sx(cc), P.sy(rr) + cs * 0.3, { font: `600 ${cs < 60 ? 11 : 13}px "IBM Plex Mono", monospace`, color: '#8a6d00' }); }; lab(g.goal, g.goalR); g.extra.forEach((v, k) => lab(k, v)); }
      if (o.coords) for (const k of g.states()) { const [cc, rr] = g.cr(k); P.textPx(`(${cc},${rr})`, P.sx(cc - 0.5) + 4, P.sy(rr + 0.5) + 9, { align: 'left', color: '#a3a3a0', font: '9.5px "IBM Plex Mono", monospace' }); }
      if (o.V && o.vNums) for (const k of g.states()) { if (k === g.goal || g.cliff.has(k) || g.extra.has(k)) continue; const [cc, rr] = g.cr(k); P.textPx(UL.fmt(o.V[k]), P.sx(cc), P.sy(rr) + (o.policy ? cs * 0.36 : 0), { font: `500 ${cs < 60 ? 10 : o.policy ? 11 : 12}px "IBM Plex Mono", monospace`, color: '#222' }); }
      if (o.texts) o.texts.forEach(([k, s, col]) => { const [cc, rr] = g.cr(k); P.textPx(s, P.sx(cc), P.sy(rr) + cs * 0.3, { font: '500 11px "IBM Plex Mono", monospace', color: col || '#2a78d6', halo: true }); });
      if (o.policy) for (const k of g.states()) { if (k === g.goal || g.cliff.has(k) || g.extra.has(k)) continue; const a = o.policy[k]; if (a == null) continue; const [cc, rr] = g.cr(k); const L = 0.3; P.arrow(cc - DEL[a][0] * L, rr - DEL[a][1] * L, cc + DEL[a][0] * L, rr + DEL[a][1] * L, { color: o.policyColor || '#2a78d6', w: 2.4, head: 10 }); }
      if (o.probs) for (const k of g.states()) { if (k === g.goal || g.cliff.has(k)) continue; const p = o.probs[k]; const [cc, rr] = g.cr(k); for (let a = 0; a < 4; a++) { const L = 0.44 * p[a]; if (L > 0.03) P.arrow(cc, rr, cc + DEL[a][0] * L, rr + DEL[a][1] * L, { color: UL.rgba('#2a78d6', 0.35 + 0.65 * p[a]), w: 1 + 3 * p[a], head: 5 + 6 * p[a] }); } P.marker(cc, rr, { r: 2.4, fill: '#222', ring: false }); }
      if (o.trace) for (const k of g.states()) { const e = o.trace[k]; if (e > 0.005) { const [cc, rr] = g.cr(k); const h = Math.min(1, e / (o.traceMax || 2)) * cs * 0.6; c.fillStyle = '#eda100'; c.fillRect(P.sx(cc - 0.42), P.sy(rr - 0.42) - h, cs * 0.12, h); } }
      if (o.path && o.path.length > 1) { const jit = (i) => (o.jitter ? Math.sin(i * 2.3) * 0.12 : 0); P.poly(o.path.map((k, i) => { const [cc, rr] = g.cr(k); return [cc + jit(i), rr + jit(i + 7)]; }), { color: o.pathColor || '#c0392b', w: 2, alpha: o.pathAlpha || 0.8 }); }
      if (o.bumps) o.bumps.forEach((k) => { const [cc, rr] = g.cr(k); P.circle(cc - 0.25, rr + 0.25, 0.1, { color: '#eda100', w: 2.2 }); });
      if (o.falls) o.falls.forEach((k) => { const [cc, rr] = g.cr(k); P.marker(cc, rr, { shape: 'x', r: 6, fill: '#c0392b' }); });
      if (o.hiCell != null) { const [cc, rr] = g.cr(o.hiCell); c.strokeStyle = o.hiColor || '#2a78d6'; c.lineWidth = 3.5; c.strokeRect(P.sx(cc - 0.5) + 3, P.sy(rr + 0.5) + 3, cs - 6, cs - 6); }
      if (o.hiCells) o.hiCells.forEach((k) => { const [cc, rr] = g.cr(k); c.strokeStyle = '#2a78d6'; c.lineWidth = 3; c.strokeRect(P.sx(cc - 0.5) + 3, P.sy(rr + 0.5) + 3, cs - 6, cs - 6); });
      if (o.agent != null) { const [ac, ar] = g.cr(o.agent); this.icon('rat', ac + (o.agentDx || 0), ar - 0.08, 0.7, o.agentAlpha); }
      if (o.ghost != null) { const [ac, ar] = g.cr(o.ghost); this.icon('rat', ac, ar - 0.08, 0.7, 0.3); }
      if (o.msg) P.textPx(o.msg, P.W / 2, P.H / 2, { font: '600 15px "IBM Plex Sans", sans-serif', color: o.msgColor || '#111', halo: true });
      return this;
    }
    icon(name, c, r, size, alpha) {
      const im = UL.IMG[name], P = this.p; if (!im || !im.complete || !im.naturalWidth) return;
      const w = this.cs * size, h = w * im.naturalHeight / im.naturalWidth, ctx = P.ctx;
      ctx.save(); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(im, P.sx(c) - w / 2, P.sy(r) - h / 2, w, h); ctx.restore();
    }
  }
  UL.GridView = GridView;
  UL.fmt = (v, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? '0' : v.toFixed(d)).replace('-', '−');

  /* ---------------------------------------------------- simple line charts */
  UL.chart = function (plot, series, o = {}) {
    const xs = series.flatMap((s) => s.data.map((_, i) => i + (o.x0 == null ? 1 : o.x0)));
    const ys = series.flatMap((s) => s.data).filter((v) => isFinite(v));
    const xmax = o.xmax || Math.max(2, ...xs), ymin = o.ymin != null ? o.ymin : Math.min(...ys, o.hline != null ? o.hline : Infinity), ymax = o.ymax != null ? o.ymax : Math.max(...ys);
    const T = (v) => (o.log ? Math.log10(Math.max(1, v)) : v);
    plot.clear(); plot.domain(o.xmin || 0, xmax, T(ymin), T(ymax) + (T(ymax) - T(ymin) || 1) * 0.04);
    plot.axes({ xlabel: o.xlabel, ylabel: o.ylabel, nx: o.nx || 6, ny: o.ny || 5, fy: o.log ? (v) => (Number.isInteger(v) ? String(10 ** v) : '') : o.fy });
    if (o.band) { const c = plot.ctx; c.fillStyle = o.band.color || 'rgba(237,161,0,.15)'; c.fillRect(plot.sx(o.band.x0), plot.pad.t, plot.sx(o.band.x1) - plot.sx(o.band.x0), plot.H - plot.pad.t - plot.pad.b); if (o.band.label) plot.textPx(o.band.label, (plot.sx(o.band.x0) + plot.sx(o.band.x1)) / 2, plot.pad.t + 12, { color: '#a0522d', font: '10.5px "IBM Plex Sans", sans-serif' }); }
    if (o.hline != null) { plot.line(o.xmin || 0, T(o.hline), xmax, T(o.hline), { color: UL.FAINT, dash: [4, 4], w: 1 }); if (o.hlabel) plot.textPx(o.hlabel, plot.W - plot.pad.r - 4, plot.sy(T(o.hline)) - 8, { align: 'right', color: UL.MUTED, font: '10px "IBM Plex Mono", monospace' }); }
    plot.clipped(() => series.forEach((s) => {
      if (s.dots) s.data.forEach((v, i) => plot.marker(i + (o.x0 == null ? 1 : o.x0), T(v), { r: s.r || 2, fill: s.color, ring: false, alpha: s.alpha }));
      else plot.poly(s.data.map((v, i) => [i + (o.x0 == null ? 1 : o.x0), T(v)]), { color: s.color, w: s.w || 2, alpha: s.alpha, dash: s.dash });
    }));
    return plot;
  };
  UL.bars = function (plot, vals, o = {}) { // simple bar chart, vals: [{v, color, label}]
    const n = vals.length, ymin = o.ymin != null ? o.ymin : Math.min(0, ...vals.map((x) => x.v)), ymax = o.ymax != null ? o.ymax : Math.max(0, ...vals.map((x) => x.v));
    plot.clear(); plot.domain(-0.6, n - 0.4, ymin, ymax + (ymax - ymin) * 0.08); plot.axes({ x: false, ylabel: o.ylabel, ny: o.ny || 4, fy: o.fy });
    const c = plot.ctx, bw = (plot.sx(1) - plot.sx(0)) * (o.width || 0.62);
    vals.forEach((b, i) => {
      const X = plot.sx(i), Y0 = plot.sy(0), Y1 = plot.sy(b.v); c.fillStyle = b.color || UL.COLORS[0]; c.fillRect(X - bw / 2, Math.min(Y0, Y1), bw, Math.abs(Y1 - Y0));
      if (b.label != null) plot.textPx(b.label, X, plot.H - plot.pad.b + 10, { color: UL.MUTED, font: '11px "IBM Plex Sans", sans-serif', base: 'top' });
      if (o.values !== false) plot.textPx(o.fv ? o.fv(b.v) : UL.fmt(b.v), X, b.v >= 0 ? Y1 - 9 : Y1 + 10, { font: '500 11px "IBM Plex Mono", monospace' });
    });
    if (ymin < 0) plot.line(-0.6, 0, n - 0.4, 0, { color: UL.INK, w: 1 });
    return plot;
  };

  /* ================================================================ RL: the cart-pole */
  const CP = { g: 9.8, M: 1.0, m: 0.1, l: 0.5, F: 10, tau: 0.02, th12: (12 * Math.PI) / 180 };
  CP.step = function (s, right, force) {
    const [x, xd, th, thd] = s, f = force != null ? force : right ? CP.F : -CP.F, ct = Math.cos(th), st = Math.sin(th), tm = CP.M + CP.m;
    const temp = (f + CP.m * CP.l * thd * thd * st) / tm;
    const thacc = (CP.g * st - ct * temp) / (CP.l * (4 / 3 - (CP.m * ct * ct) / tm));
    const xacc = temp - (CP.m * CP.l * thacc * ct) / tm;
    return [x + CP.tau * xd, xd + CP.tau * xacc, th + CP.tau * thd, thd + CP.tau * thacc];
  };
  CP.failed = (s) => Math.abs(s[0]) > 2.4 || Math.abs(s[2]) > CP.th12;
  CP.parts = function (s) { // interval index of each variable (Barto, Sutton & Anderson 1983)
    const [x, xd, th, thd] = s, d = Math.PI / 180;
    const bx = x < -0.8 ? 0 : x < 0.8 ? 1 : 2, bxd = xd < -0.5 ? 0 : xd < 0.5 ? 1 : 2;
    const bt = th < -6 * d ? 0 : th < -d ? 1 : th < 0 ? 2 : th < d ? 3 : th < 6 * d ? 4 : 5;
    const btd = thd < -50 * d ? 0 : thd < 50 * d ? 1 : 2;
    return [bx, bxd, bt, btd];
  };
  CP.box = (s) => { const [bx, bxd, bt, btd] = CP.parts(s); return bx + 3 * bxd + 9 * bt + 54 * btd; }; // 0 … 161, numbering of the lecture
  CP.TH = ['θ < −6°', '−6° … −1°', '−1° … 0°', '0° … 1°', '1° … 6°', 'θ > 6°'];
  CP.TD = ['falling left fast', 'turning slowly', 'falling right fast'];
  CP.boxLabel = (b) => { const bt = Math.floor(b / 9) % 6, btd = Math.floor(b / 54); return `${CP.TH[bt]}, ${CP.TD[btd]}`; };
  CP.reset = (r, small = true) => (small ? [0, 0, 0, 0] : [(r() - 0.5) * 0.1, (r() - 0.5) * 0.1, (r() - 0.5) * 0.1, (r() - 0.5) * 0.1]);
  UL.CP = CP;

  // ASE/ACE actor–critic (Barto, Sutton & Anderson 1983), as in Algorithm 5 of the lecture
  class AseAce {
    constructor(o = {}) {
      this.r = rng(o.seed || 7); this.alpha = o.alpha || 1000; this.beta = o.beta == null ? 0.5 : o.beta; this.gamma = o.gamma || 0.95; this.lam = o.lam || 0.9; this.lamv = o.lamv || 0.8;
      this.useCritic = o.critic !== false; this.record = !!o.record;
      this.w = new Float64Array(162); this.v = new Float64Array(162); this.trial = 0; this.lens = []; this.newTrial();
    }
    newTrial() { this.s = [0, 0, 0, 0]; this.e = new Float64Array(162); this.xb = new Float64Array(162); this.b = CP.box(this.s); this.t = 0; this.trial++; this.visited = []; }
    step() { // one time step; returns details
      const b = this.b, pr = 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, this.w[b])))), y = this.r() < pr ? 1 : 0;
      this.e[b] += (1 - this.lam) * (y - 0.5); this.xb[b] += 1 - this.lamv; if (!this.visited.includes(b)) this.visited.push(b);
      this.s = CP.step(this.s, y === 1); const fail = CP.failed(this.s), b2 = fail ? -1 : CP.box(this.s), r = fail ? -1 : 0;
      const pold = this.v[b], pnew = fail ? 0 : this.v[b2];
      const rh = this.useCritic ? r + this.gamma * pnew - pold : r;
      const rec = this.record, eSnap = rec ? this.e.slice() : null, dw = rec ? new Float64Array(162) : null;
      for (let i = 0; i < 162; i++) { if (this.e[i] !== 0) { const d = this.alpha * rh * this.e[i]; if (rec) dw[i] = d; this.w[i] += d; } if (this.useCritic && this.xb[i] !== 0) this.v[i] += this.beta * rh * this.xb[i]; this.e[i] *= this.lam; this.xb[i] *= this.lamv; }
      this.t++; const out = { s: this.s, b, y, fail, r, rh, pold, pnew, e: eSnap, dw, t: this.t };
      if (fail) { this.lens.push(this.t); }
      this.b = b2; return out;
    }
    runTrial(max = 20000) { let o; do { o = this.step(); } while (!o.fail && this.t < max); const T = this.t; if (!o.fail) this.lens.push(T); this.newTrial(); return T; }
  }
  UL.AseAce = AseAce;
  // Q-learning on the 162 boxes (reward −1 at failure, optimistic zeros, no ε)
  class BoxQ {
    constructor(o = {}) { this.r = rng(o.seed || 7); this.Q = new Float64Array(162 * 2); this.alpha = o.alpha || 0.5; this.gamma = o.gamma || 0.99; this.lens = []; this.trial = 0; this.newTrial(); }
    newTrial() { const u = () => (this.r() - 0.5) * 0.1; this.s = [u(), u(), u(), u()]; this.b = CP.box(this.s); this.t = 0; this.trial++; } // small random start, as in Gymnasium
    step() {
      const b = this.b, q = [this.Q[b * 2], this.Q[b * 2 + 1]], a = q[0] === q[1] ? this.r.int(2) : q[1] > q[0] ? 1 : 0;
      this.s = CP.step(this.s, a === 1); const fail = CP.failed(this.s), b2 = fail ? -1 : CP.box(this.s), r = fail ? -1 : 0;
      const tgt = r + (fail ? 0 : this.gamma * Math.max(this.Q[b2 * 2], this.Q[b2 * 2 + 1]));
      this.Q[b * 2 + a] += this.alpha * (tgt - this.Q[b * 2 + a]); this.t++; this.b = b2; if (fail) this.lens.push(this.t);
      return { s: this.s, b, y: a, fail, r, t: this.t };
    }
    runTrial(max = 20000) { let o; do { o = this.step(); } while (!o.fail && this.t < max); const T = this.t; if (!o.fail) this.lens.push(T); this.newTrial(); return T; }
  }
  UL.BoxQ = BoxQ;

  // draw a cart-pole on a Plot (domain set inside)
  UL.drawCart = function (P, s, o = {}) {
    P.clear(); const track = 2.4; P.domain(-track - 0.35, track + 0.35, -0.42, 1.45, true);
    const c = P.ctx; P.line(-track, 0, track, 0, { color: '#222', w: 1.6 }); [-track, track].forEach((e) => P.line(e, -0.07, e, 0.12, { color: '#222', w: 1.6 }));
    if (o.ticks) for (const t of [-0.8, 0.8]) P.line(t, -0.05, t, 0.05, { color: '#bbb', w: 1 });
    const [x, , th] = s, w = 0.5, h = 0.22, X = P.sx(x - w / 2), Y = P.sy(0.02 + h);
    c.fillStyle = '#d9d9d9'; c.strokeStyle = '#222'; c.lineWidth = 1.3; c.beginPath(); c.roundRect ? c.roundRect(X, Y, P.sx(x + w / 2) - X, P.sy(0.02) - Y, 4) : c.rect(X, Y, P.sx(x + w / 2) - X, P.sy(0.02) - Y); c.fill(); c.stroke();
    [x - 0.15, x + 0.15].forEach((wx) => P.circle(wx, 0.02, 0.04, { fill: '#222' }));
    const px = x, py = 0.02 + h, tx = px + 2 * CP.l * Math.sin(th), ty = py + 2 * CP.l * Math.cos(th);
    c.save(); c.strokeStyle = o.fallen ? '#c0392b' : o.poleColor || '#c8955c'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(P.sx(px), P.sy(py)); c.lineTo(P.sx(tx), P.sy(ty)); c.stroke(); c.restore();
    P.circle(px, py, 0.035, { fill: '#222' });
    if (o.push != null && !o.fallen) { const d = o.push ? 1 : -1; P.arrow(x + d * (w / 2 + 0.06), 0.13, x + d * (w / 2 + 0.5), 0.13, { color: o.push ? '#2a78d6' : '#c0392b', w: 3, head: 11 }); }
    if (o.text) P.textPx(o.text, P.W / 2, P.H - 10, { font: '12px "IBM Plex Mono", monospace', color: o.fallen ? '#c0392b' : '#3d3d3b' });
    if (o.limits) { const a = CP.th12; [-a, a].forEach((ang) => P.line(px, py, px + 0.9 * Math.sin(ang), py + 0.9 * Math.cos(ang), { color: '#d6d6d2', dash: [3, 4], w: 1 })); }
  };

  /* ---------------------------------------------------- small helpers for labs */
  UL.loop = function (fn) { // requestAnimationFrame loop with start/stop; fn(dt) returns false to stop
    let id = null, last = 0;
    const tick = (t) => { const dt = last ? (t - last) / 1000 : 0; last = t; if (fn(dt) === false) { id = null; last = 0; return; } id = requestAnimationFrame(tick); };
    return { start() { if (id == null) { last = 0; id = requestAnimationFrame(tick); } }, stop() { if (id != null) cancelAnimationFrame(id); id = null; last = 0; }, get on() { return id != null; } };
  };
  UL.stats = function (el, items) { // [{k, v, hi}]
    (typeof el === 'string' ? document.getElementById(el) : el).innerHTML = items.map((it) => `<div class="stat${it.hi ? ' hi' : ''}"><span class="k">${it.k}</span><span class="v">${it.v}</span></div>`).join('');
  };
  document.addEventListener('ul-img', () => document.dispatchEvent(new Event('ul-redraw')));

  window.UL = UL;
})();
