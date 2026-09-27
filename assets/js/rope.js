/* Pendu rope engine: a Verlet cord with up to three charms, stepped at a fixed 240 Hz.
   Rendering is plain Canvas 2D. Shared by the website and the desktop app. */
(function (global) {
  const STEP = 1 / 240;
  const MAX_STRETCH = 1.02;

  // Each rope is a set of solver values plus a drawing style, not just a colour.
  const ROPES = [
    { id: 'thread', name: 'Thread', segs: 20, mass: 0.2, drag: 0.55, bend: 0, iter: 18, width: 1.3, color: '#3b3530', style: 'line' },
    { id: 'cotton', name: 'Cotton cord', segs: 20, mass: 0.5, drag: 0.45, bend: 0.02, iter: 20, width: 3.4, color: '#e9dcc4', edge: '#b9a47f', style: 'twist' },
    { id: 'leather', name: 'Leather', segs: 18, mass: 0.8, drag: 0.4, bend: 0.06, iter: 22, width: 3.6, color: '#7b4a2b', edge: '#4d2c17', style: 'line' },
    { id: 'ribbon', name: 'Silk ribbon', segs: 22, mass: 0.15, drag: 1.4, bend: 0.01, iter: 18, width: 6, color: '#e85d75', edge: '#ff9fb0', style: 'ribbon' },
    { id: 'beads', name: 'Bead string', segs: 20, mass: 0.9, drag: 0.35, bend: 0, iter: 22, width: 1.2, color: '#40362d', style: 'beads', beads: ['#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5'] },
    { id: 'gold', name: 'Gold chain', segs: 20, mass: 1.4, drag: 0.25, bend: 0, iter: 26, width: 2.2, color: '#d9a93b', edge: '#8a5f12', style: 'chain' },
    { id: 'silver', name: 'Silver chain', segs: 20, mass: 1.2, drag: 0.25, bend: 0, iter: 26, width: 2, color: '#c7ccd4', edge: '#6f7681', style: 'chain' },
    { id: 'pearl', name: 'Pearls', segs: 20, mass: 1.1, drag: 0.3, bend: 0, iter: 24, width: 1, color: '#d8d2c4', style: 'pearls' },
    { id: 'neon', name: 'Neon wire', segs: 18, mass: 0.6, drag: 0.5, bend: 0.12, iter: 22, width: 2.6, color: '#5ef0ff', style: 'neon' },
  ];
  const ropeById = Object.fromEntries(ROPES.map((r) => [r.id, r]));

  class Cord {
    constructor(opts = {}) {
      this.gravity = opts.gravity || 2200; // px/s^2
      this.anchor = { x: 0, y: 0 };
      this.acc = 0;
      this.still = 0;
      this.sleeping = false;
      this.grabbed = null;
      this.configure(opts);
    }

    /* Build (or rebuild) the cord. charms: [{ charm, scale? }]. Keeps the current anchor. */
    configure({ anchor, length = 240, rope = 'thread', charms = [], scale = 1, swing = 0 } = {}) {
      if (anchor) this.anchor = { ...anchor };
      this.rope = typeof rope === 'string' ? ropeById[rope] || ROPES[0] : rope;
      this.length = length;
      this.scale = scale;
      const R = this.rope;
      const n = R.segs;
      const seg = length / n;
      const ax = this.anchor.x, ay = this.anchor.y;
      // Lay the cord out at an angle so it swings into place when built.
      const ang = swing * (Math.PI / 180);
      const dirX = Math.sin(ang), dirY = Math.cos(ang);
      const pts = [];
      const cons = [];
      const bends = [];
      for (let i = 0; i <= n; i++) {
        const x = ax + dirX * seg * i, y = ay + dirY * seg * i;
        pts.push({ x, y, px: x, py: y, im: i === 0 ? 0 : 1 / R.mass, rope: true });
        if (i > 0) cons.push({ a: i - 1, b: i, len: seg, slack: true });
        if (i > 1 && R.bend) bends.push({ a: i - 2, b: i, len: seg * 2 });
      }
      this.charms = [];
      let top = n;
      charms.slice(0, 3).forEach((entry, k) => {
        const charm = entry.charm || entry;
        const size = (charm.size || 80) * (entry.scale || 1) * scale;
        let from = top;
        if (k > 0) {
          // A small jump ring links this charm to the bottom of the previous one.
          const prev = pts[top];
          pts.push({ x: prev.x + dirX * 4, y: prev.y + dirY * 4, px: prev.x + dirX * 4, py: prev.y + dirY * 4, im: 1 / 0.3 });
          cons.push({ a: top, b: pts.length - 1, len: 4 * scale, slack: true });
          from = pts.length - 1;
        }
        const t = pts[from];
        const bodyLen = size * 0.9;
        pts.push({ x: t.x + dirX * bodyLen, y: t.y + dirY * bodyLen, px: t.x + dirX * bodyLen, py: t.y + dirY * bodyLen, im: 1 / (charm.mass || 4) });
        const bottom = pts.length - 1;
        pts[from].im = Math.min(pts[from].im, 1 / ((charm.mass || 4) * 0.8));
        cons.push({ a: from, b: bottom, len: bodyLen, rigid: true });
        this.charms.push({ charm, size, top: from, bottom, img: global.PenduCharms ? global.PenduCharms.image(charm) : null });
        top = bottom;
      });
      this.pts = pts;
      this.cons = cons;
      this.bends = bends;
      this.ropeEnd = n;
      this.dragK = 1 - Math.min(0.9, R.drag * STEP); // per-step velocity retention (air drag)
      this.wake();
      return this;
    }

    setAnchor(x, y) {
      if (Math.abs(x - this.anchor.x) + Math.abs(y - this.anchor.y) > 0.01) this.wake();
      this.anchor.x = x;
      this.anchor.y = y;
      this.pts[0].x = this.pts[0].px = x;
      this.pts[0].y = this.pts[0].py = y;
    }

    // Move the whole cord with the anchor (used when the container resizes) so it does not whip around.
    translate(dx, dy) {
      for (const p of this.pts) { p.x += dx; p.y += dy; p.px += dx; p.py += dy; }
      this.anchor.x += dx;
      this.anchor.y += dy;
    }

    wake() { this.sleeping = false; this.still = 0; }

    /* Advance by a frame's worth of time using fixed 240 Hz sub-steps. */
    update(dt) {
      if (this.sleeping && !this.grabbed) return false;
      this.acc = Math.min(this.acc + dt, 0.1);
      let moved = 0;
      while (this.acc >= STEP) {
        moved = Math.max(moved, this.step());
        this.acc -= STEP;
      }
      if (!this.grabbed && moved < 0.004) {
        if (++this.still > 90) this.sleeping = true;
      } else this.still = 0;
      return true;
    }

    step() {
      const g = this.gravity * STEP * STEP;
      const k = this.dragK;
      const pts = this.pts;
      let moved = 0;
      const gp = this.grabbed ? pts[this.grabbed.i] : null;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p === gp) {
          const nx = p.x + (this.grabbed.x - p.x) * 0.45;
          const ny = p.y + (this.grabbed.y - p.y) * 0.45;
          p.px = p.x; p.py = p.y; p.x = nx; p.y = ny;
          continue;
        }
        const vx = (p.x - p.px) * k, vy = (p.y - p.py) * k;
        p.px = p.x; p.py = p.y;
        p.x += vx;
        p.y += vy + g;
        moved = Math.max(moved, Math.abs(vx) + Math.abs(vy));
      }
      const im = (p) => (p === gp ? 0 : p.im);
      for (let it = 0; it < this.rope.iter; it++) {
        for (const c of this.cons) {
          const a = pts[c.a], b = pts[c.b];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          if (c.slack && d < c.len) continue; // ropes resist stretching, not bunching
          const wa = im(a), wb = im(b), w = wa + wb;
          if (!w) continue;
          const diff = (d - c.len) / d / w;
          a.x += dx * diff * wa; a.y += dy * diff * wa;
          b.x -= dx * diff * wb; b.y -= dy * diff * wb;
        }
        const bs = this.rope.bend;
        for (const c of this.bends) {
          const a = pts[c.a], b = pts[c.b];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          const wa = im(a), wb = im(b), w = wa + wb;
          if (!w) continue;
          const diff = ((d - c.len) / d / w) * bs;
          a.x += dx * diff * wa; a.y += dy * diff * wa;
          b.x -= dx * diff * wb; b.y -= dy * diff * wb;
        }
      }
      // Hard limit: walk down from the anchor and never let a link exceed MAX_STRETCH.
      for (const c of this.cons) {
        const a = pts[c.a], b = pts[c.b];
        if (b === gp) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const max = c.len * MAX_STRETCH;
        if (d > max) { b.x = a.x + (dx / d) * max; b.y = a.y + (dy / d) * max; }
      }
      return moved;
    }

    /* ---------- interaction ---------- */
    nearest(x, y, radius = 18) {
      // Charms first: test in each charm's local frame.
      for (let k = this.charms.length - 1; k >= 0; k--) {
        const ch = this.charms[k];
        const t = this.pts[ch.top], b = this.pts[ch.bottom];
        const ang = Math.atan2(b.x - t.x, b.y - t.y);
        const dx = x - t.x, dy = y - t.y;
        const lx = dx * Math.cos(ang) - dy * Math.sin(ang);
        const ly = dx * Math.sin(ang) + dy * Math.cos(ang);
        if (Math.abs(lx) < ch.size * 0.48 && ly > -8 && ly < ch.size * 1.02) {
          return { i: ly < ch.size * 0.45 ? ch.top : ch.bottom, charm: k };
        }
      }
      let best = null, bd = radius;
      for (let i = 1; i < this.pts.length; i++) {
        const p = this.pts[i];
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; best = { i, charm: -1 }; }
      }
      return best;
    }

    grab(x, y) {
      const hit = this.nearest(x, y);
      if (!hit) return false;
      this.grabbed = { i: hit.i, x, y, charm: hit.charm };
      this.wake();
      return true;
    }
    drag(x, y) { if (this.grabbed) { this.grabbed.x = x; this.grabbed.y = y; } }
    release() { this.grabbed = null; this.wake(); }

    // Pointer brushing past a charm: transfer some of the pointer's motion.
    push(x, y, dx, dy) {
      const hit = this.nearest(x, y, 0);
      if (!hit || hit.charm < 0) return false;
      const ch = this.charms[hit.charm];
      const f = 0.6;
      for (const i of [ch.top, ch.bottom]) {
        const p = this.pts[i];
        p.px -= dx * f * (i === hit.i ? 1 : 0.5);
        p.py -= dy * f * (i === hit.i ? 1 : 0.5);
      }
      this.wake();
      return true;
    }

    // Give every free point a velocity kick in px/s, stronger towards the end (scroll jiggle, "nudge", etc.).
    impulse(vx, vy) {
      for (let i = 1; i < this.pts.length; i++) {
        const p = this.pts[i];
        const w = Math.min(1, i / this.ropeEnd) * STEP;
        p.px -= vx * w;
        p.py -= vy * w;
      }
      this.wake();
    }

    charmState(k) {
      const ch = this.charms[k];
      const t = this.pts[ch.top], b = this.pts[ch.bottom];
      const cx = (t.x + b.x) / 2, cy = (t.y + b.y) / 2;
      const vx = ((t.x - t.px) + (b.x - b.px)) / 2 / STEP;
      const vy = ((t.y - t.py) + (b.y - b.py)) / 2 / STEP;
      return { x: cx, y: cy, vx, vy, r: ch.size * 0.42, angle: Math.atan2(b.x - t.x, b.y - t.y) };
    }

    // Axis-aligned bounds of all charms (desktop app uses this for click-through).
    bounds(pad = 6) {
      return this.charms.map((ch) => {
        const t = this.pts[ch.top], b = this.pts[ch.bottom];
        const r = ch.size * 0.6 + pad;
        const cx = (t.x + b.x) / 2, cy = (t.y + b.y) / 2;
        return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
      });
    }

    /* ---------- rendering ---------- */
    draw(ctx, { pin = true, shadow = true } = {}) {
      const R = this.rope;
      const rp = this.pts.slice(0, this.ropeEnd + 1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (shadow) {
        ctx.save();
        ctx.translate(5, 8);
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = Math.max(2, R.width);
        path(ctx, rp);
        ctx.stroke();
        ctx.restore();
      }
      drawRope(ctx, R, rp);
      // jump rings between stacked charms
      for (let k = 1; k < this.charms.length; k++) {
        const a = this.pts[this.charms[k - 1].bottom], b = this.pts[this.charms[k].top];
        ctx.strokeStyle = '#c99a35';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const ch of this.charms) {
        const t = this.pts[ch.top], b = this.pts[ch.bottom];
        const ang = Math.atan2(b.x - t.x, b.y - t.y);
        const img = ch.img;
        if (!img || !img.complete || !img.naturalWidth) continue;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(-ang);
        if (shadow) {
          ctx.shadowColor = 'rgba(40, 25, 10, .28)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetX = 6;
          ctx.shadowOffsetY = 10;
        }
        // The ring's top sits at y=2 of the 100-unit charm drawing.
        ctx.drawImage(img, -ch.size / 2, -ch.size * 0.03, ch.size, ch.size);
        ctx.restore();
      }
      if (pin) {
        const a = this.pts[0];
        const g = ctx.createRadialGradient(a.x - 2, a.y - 2, 1, a.x, a.y, 7);
        g.addColorStop(0, '#fff6d5');
        g.addColorStop(0.5, '#d9a93b');
        g.addColorStop(1, '#7a520e');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(a.x, a.y, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function path(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  // Evenly spaced samples along the polyline: [{x, y, a}] where a is the tangent angle.
  function samples(pts, spacing) {
    const out = [];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      let d = carry;
      while (d < len) {
        out.push({ x: a.x + (dx * d) / len, y: a.y + (dy * d) / len, a: ang });
        d += spacing;
      }
      carry = d - len;
    }
    return out;
  }

  function drawRope(ctx, R, pts) {
    switch (R.style) {
      case 'twist': {
        ctx.strokeStyle = R.edge; ctx.lineWidth = R.width + 1.2; path(ctx, pts); ctx.stroke();
        ctx.strokeStyle = R.color; ctx.lineWidth = R.width; path(ctx, pts); ctx.stroke();
        ctx.setLineDash([2.5, 3.5]); ctx.strokeStyle = R.edge; ctx.lineWidth = R.width * 0.7; path(ctx, pts); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'ribbon': {
        ctx.strokeStyle = R.color; ctx.lineWidth = R.width; path(ctx, pts); ctx.stroke();
        ctx.strokeStyle = R.edge; ctx.lineWidth = R.width * 0.3; ctx.globalAlpha = 0.8; path(ctx, pts); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'beads': {
        ctx.strokeStyle = R.color; ctx.lineWidth = R.width; path(ctx, pts); ctx.stroke();
        samples(pts, 11).forEach((s, i) => {
          if (i === 0) return;
          ctx.fillStyle = R.beads[i % R.beads.length];
          ctx.beginPath(); ctx.arc(s.x, s.y, 4.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath(); ctx.arc(s.x - 1.3, s.y - 1.3, 1.3, 0, Math.PI * 2); ctx.fill();
        });
        break;
      }
      case 'pearls': {
        samples(pts, 8.5).forEach((s, i) => {
          if (i === 0) return;
          const g = ctx.createRadialGradient(s.x - 1.5, s.y - 1.5, 0.5, s.x, s.y, 4.4);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#efe8da'); g.addColorStop(1, '#b8ae9a');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(s.x, s.y, 4.2, 0, Math.PI * 2); ctx.fill();
        });
        break;
      }
      case 'chain': {
        samples(pts, 6).forEach((s, i) => {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.a);
          ctx.strokeStyle = i % 2 ? R.edge : R.color;
          ctx.lineWidth = R.width;
          ctx.beginPath();
          if (i % 2) { ctx.moveTo(-3.5, 0); ctx.lineTo(3.5, 0); }
          else ctx.ellipse(0, 0, 4.6, 2.6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
        break;
      }
      case 'neon': {
        ctx.shadowColor = R.color; ctx.shadowBlur = 16;
        ctx.strokeStyle = R.color; ctx.lineWidth = R.width; path(ctx, pts); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#eaffff'; ctx.lineWidth = R.width * 0.4; path(ctx, pts); ctx.stroke();
        break;
      }
      default: {
        if (R.edge) { ctx.strokeStyle = R.edge; ctx.lineWidth = R.width + 1.4; path(ctx, pts); ctx.stroke(); }
        ctx.strokeStyle = R.color; ctx.lineWidth = R.width; path(ctx, pts); ctx.stroke();
      }
    }
  }

  /* ---------- Stage: canvas, render loop, pointer input, sleeping ---------- */
  class Stage {
    constructor(canvas, { cord, anchor, onFrame, onDraw, interactive = true, pin = true, shadow = true, touchScroll = true, target } = {}) {
      this.canvas = canvas;
      this.target = target || canvas; // element that receives pointer events (canvas may be pointer-events:none)
      this.ctx = canvas.getContext('2d');
      this.cord = cord;
      this.anchorFn = anchor;
      this.onFrame = onFrame;
      this.onDraw = onDraw;
      this.opts = { pin, shadow };
      this.w = this.h = 0;
      this.raf = 0;
      this.last = 0;
      this.running = false;
      this.pointer = null;
      this.forceDraw = true;
      this.resize = this.resize.bind(this);
      this.frame = this.frame.bind(this);
      this.ro = new ResizeObserver(this.resize);
      this.ro.observe(canvas);
      this.resize();
      if (interactive) this.bindInput(touchScroll);
      this.start();
      document.addEventListener('visibilitychange', () => { this.last = 0; });
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = r.width;
      this.h = r.height;
      if (this.anchorFn) {
        // Carry the whole cord with its anchor so a resize never whips it around.
        const a = this.anchorFn(this.w, this.h);
        this.cord.translate(a.x - this.cord.anchor.x, a.y - this.cord.anchor.y);
        this.cord.wake();
      }
      this.forceDraw = true;
    }

    local(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    bindInput(touchScroll) {
      const cv = this.target;
      cv.addEventListener('pointerdown', (e) => {
        const p = this.local(e);
        if (this.cord.grab(p.x, p.y)) {
          cv.setPointerCapture(e.pointerId);
          cv.classList.add('grabbing');
          e.preventDefault();
          this.wakeLoop();
        }
      });
      cv.addEventListener('pointermove', (e) => {
        const p = this.local(e);
        const prev = this.pointer;
        this.pointer = p;
        if (this.cord.grabbed) { this.cord.drag(p.x, p.y); this.wakeLoop(); return; }
        const over = this.cord.nearest(p.x, p.y, 10);
        cv.classList.toggle('can-grab', !!over);
        if (prev && e.pointerType === 'mouse') {
          if (this.cord.push(p.x, p.y, (p.x - prev.x) * 0.25, (p.y - prev.y) * 0.25)) this.wakeLoop();
        }
      });
      const up = () => {
        if (!this.cord.grabbed) return;
        this.cord.release();
        cv.classList.remove('grabbing');
        this.wakeLoop();
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { this.pointer = null; });
      // On touch screens only block scrolling when the finger lands on the cord.
      cv.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        const r = this.canvas.getBoundingClientRect();
        if (!touchScroll || this.cord.nearest(t.clientX - r.left, t.clientY - r.top)) e.preventDefault();
      }, { passive: false });
    }

    start() { this.running = true; this.wakeLoop(); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); this.raf = 0; }
    wakeLoop() {
      this.cord.wake();
      if (this.running && !this.raf) { this.last = 0; this.raf = requestAnimationFrame(this.frame); }
    }

    frame(now) {
      this.raf = 0;
      if (!this.running) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 1 / 60;
      this.last = now;
      const busy = this.cord.update(dt);
      const extra = this.onFrame ? this.onFrame(dt, now) : false;
      if (busy || extra || this.forceDraw) {
        this.ctx.clearRect(0, 0, this.w, this.h);
        if (this.onDraw) this.onDraw(this.ctx, 'before');
        this.cord.draw(this.ctx, this.opts);
        if (this.onDraw) this.onDraw(this.ctx, 'after');
        this.forceDraw = false;
      }
      // Keep ticking while something moves or images are still loading; otherwise sleep until woken.
      const loading = this.cord.charms.some((c) => c.img && !c.img.complete);
      if (loading) this.forceDraw = true;
      if (busy || extra || loading || this.cord.grabbed) this.raf = requestAnimationFrame(this.frame);
    }

    redraw() { this.forceDraw = true; this.wakeLoop(); }
    destroy() { this.stop(); this.ro.disconnect(); }
  }

  global.PenduRope = { Cord, Stage, ROPES, ropeById, STEP, drawRope };
})(typeof window !== 'undefined' ? window : globalThis);
