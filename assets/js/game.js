/* Bubble Swing: fling your charm cord into bubbles. Carrying does not count. */
(function () {
  const { Cord, Stage } = window.PenduRope;
  const site = window.PenduSite;
  const $ = (s) => document.querySelector(s);

  const DURATION = 45;
  const canvas = $('#gameCanvas');
  const overlay = $('#gameOverlay');
  const el = { score: $('#gScore'), combo: $('#gCombo'), time: $('#gTime'), bar: $('#gTimeBar'), best: $('#gBest') };

  let best = site.store.get('bubble-best', 0);
  el.best.textContent = best;

  const g = { running: false, paused: false, score: 0, combo: 1, lastHit: -9, time: DURATION, clock: 0, spawnT: 0, bubbles: [], fx: [], shake: 0 };

  const cord = new Cord();
  function layout(w, h) {
    return { x: w / 2, y: 31, len: Math.max(110, Math.min(230, h * 0.38)) };
  }
  function hang(swing = 0) {
    const L = layout(canvas.clientWidth || 800, canvas.clientHeight || 500);
    cord.configure({ anchor: { x: L.x, y: L.y }, length: L.len, swing, ...site.cordConfig() });
  }
  hang(0);
  site.onCordChange(() => { if (!g.running) { hang(0); stage.redraw(); } });

  function reach() {
    return cord.length + cord.charms.reduce((s, c) => s + c.size * 0.9, 0);
  }

  function spawn() {
    const w = stage.w, h = stage.h;
    const R = reach();
    for (let tries = 0; tries < 20; tries++) {
      const ang = (Math.random() - 0.5) * 2 * (Math.PI * 0.42);
      const dist = R * (0.45 + Math.random() * 0.5);
      const x = cord.anchor.x + Math.sin(ang) * dist;
      const y = cord.anchor.y + Math.cos(ang) * dist;
      const roll = Math.random();
      const type = roll < 0.12 ? 'gold' : roll < 0.27 ? 'thorn' : 'normal';
      const r = type === 'gold' ? 20 : type === 'thorn' ? 24 : 22 + Math.random() * 12;
      if (x < r + 8 || x > w - r - 8 || y < 60 || y > h - r - 8) continue;
      if (g.bubbles.some((b) => Math.hypot(b.x - x, b.y - y) < b.r + r + 12)) continue;
      g.bubbles.push({ x, y, r, type, age: 0, life: type === 'gold' ? 4 : 6.5, seed: Math.random() * 6.28, wob: 0 });
      return;
    }
  }

  function popBubble(b, i) {
    g.bubbles.splice(i, 1);
    if (b.type === 'thorn') {
      g.time = Math.max(0, g.time - 3);
      g.combo = 1;
      g.shake = 1;
      addText(b.x, b.y, '−3s', '#e5383b');
      burst(b.x, b.y, '#e5383b', 16);
      bump(el.time);
      return;
    }
    g.combo = g.clock - g.lastHit < 1.6 ? Math.min(8, g.combo + 1) : 1;
    g.lastHit = g.clock;
    const pts = (b.type === 'gold' ? 5 : 1) * g.combo;
    g.score += pts;
    addText(b.x, b.y, '+' + pts, b.type === 'gold' ? '#d9a93b' : '#2a9df4');
    burst(b.x, b.y, b.type === 'gold' ? '#f7c948' : '#7fd3ff', b.type === 'gold' ? 26 : 16);
    g.fx.push({ kind: 'ring', x: b.x, y: b.y, r: b.r, t: 0 });
    bump(el.score);
    if (g.combo > 1) bump(el.combo);
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
      g.fx.push({ kind: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, color });
    }
  }
  function addText(x, y, text, color) { g.fx.push({ kind: 'text', x, y, text, color, t: 0 }); }
  function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }

  function hud() {
    el.score.textContent = g.score;
    el.combo.textContent = '×' + g.combo;
    el.time.textContent = Math.ceil(g.time);
    el.bar.style.transform = `scaleX(${g.time / DURATION})`;
  }

  function start() {
    Object.assign(g, { running: true, paused: false, score: 0, combo: 1, lastHit: -9, time: DURATION, clock: 0, spawnT: 0, bubbles: [], fx: [] });
    hang(40);
    overlay.classList.add('hidden');
    hud();
    stage.wakeLoop();
  }

  function end() {
    g.running = false;
    const isBest = g.score > best;
    if (isBest) { best = g.score; site.store.set('bubble-best', best); el.best.textContent = best; }
    $('#goTitle').textContent = isBest && g.score > 0 ? 'New best!' : "Time's up";
    $('#goText').textContent = `You scored ${g.score}. ${isBest && g.score > 0 ? 'That beats your record.' : 'Best so far: ' + best + '.'}`;
    $('#goBtn').textContent = 'Play again';
    overlay.classList.remove('hidden');
    g.bubbles.forEach((b) => g.fx.push({ kind: 'ring', x: b.x, y: b.y, r: b.r, t: 0 }));
    g.bubbles = [];
  }

  function tick(dt) {
    // effects run even after the round ends
    for (let i = g.fx.length - 1; i >= 0; i--) {
      const f = g.fx[i];
      f.t += dt;
      if (f.kind === 'dot') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 500 * dt; f.vx *= 0.98; }
      if ((f.kind === 'dot' && f.t > 0.7) || (f.kind === 'ring' && f.t > 0.45) || (f.kind === 'text' && f.t > 0.9)) g.fx.splice(i, 1);
    }
    g.shake = Math.max(0, g.shake - dt * 3);
    if (!g.running || g.paused) return g.fx.length > 0 || g.shake > 0;

    g.clock += dt;
    g.time -= dt;
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.bubbles.length < 6) { spawn(); g.spawnT = 0.75 + Math.random() * 0.5; }
    if (g.clock - g.lastHit > 1.6 && g.combo > 1) g.combo = 1;

    for (let i = g.bubbles.length - 1; i >= 0; i--) {
      const b = g.bubbles[i];
      b.age += dt;
      b.wob = Math.max(0, b.wob - dt * 3);
      if (b.age > b.life) { g.bubbles.splice(i, 1); g.fx.push({ kind: 'ring', x: b.x, y: b.y, r: b.r * 0.6, t: 0 }); continue; }
      for (let k = 0; k < cord.charms.length; k++) {
        const s = cord.charmState(k);
        if (Math.hypot(s.x - b.x, s.y - b.y) < b.r + s.r * 0.8) {
          if (cord.grabbed) { b.wob = 1; break; } // carrying doesn't count
          if (Math.hypot(s.vx, s.vy) > 110) { popBubble(b, i); break; }
          b.wob = Math.max(b.wob, 0.6);
        }
      }
    }
    if (g.time <= 0) { g.time = 0; hud(); end(); return true; }
    hud();
    return true;
  }

  // A soap bubble: clear in the middle, a thin rim of shifting thin-film colours, two window glints.
  function soapBubble(c, x, y, r, t) {
    const body = c.createRadialGradient(x, y, r * 0.55, x, y, r);
    body.addColorStop(0, 'rgba(255,255,255,0.03)');
    body.addColorStop(0.75, 'rgba(170,220,255,0.16)');
    body.addColorStop(1, 'rgba(90,170,240,0.42)');
    c.fillStyle = body;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    if (c.createConicGradient) {
      const film = c.createConicGradient(t * 0.8, x, y);
      ['rgba(255,120,200,.55)', 'rgba(255,220,120,.5)', 'rgba(120,255,200,.45)', 'rgba(110,170,255,.55)', 'rgba(200,120,255,.5)', 'rgba(255,120,200,.55)']
        .forEach((col, i, a) => film.addColorStop(i / (a.length - 1), col));
      c.strokeStyle = film;
      c.lineWidth = Math.max(1.5, r * 0.09);
      c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
    }
    c.save();
    c.translate(x - r * 0.38, y - r * 0.42);
    c.rotate(-0.7);
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.ellipse(0, 0, r * 0.26, r * 0.12, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.arc(x + r * 0.45, y + r * 0.5, r * 0.07, 0, Math.PI * 2); c.fill();
  }

  function drawBubble(c, b, now) {
    const intro = Math.min(1, b.age / 0.35);
    const outro = Math.max(0, Math.min(1, (b.life - b.age) / 0.5));
    const s = (1 - Math.pow(1 - intro, 3)) * (0.6 + 0.4 * outro);
    const wob = Math.sin(now / 60) * b.wob * 3;
    const y = b.y + Math.sin(now / 700 + b.seed) * 4;
    const r = b.r * s + wob;
    if (r <= 0) return;
    c.save();
    c.globalAlpha = 0.35 + 0.65 * outro;
    if (b.type === 'thorn') {
      c.fillStyle = '#7b2d8b';
      c.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + now / 900, rr = i % 2 ? r * 0.8 : r * 1.12;
        c.lineTo(b.x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
      const gr = c.createRadialGradient(b.x - r * 0.3, y - r * 0.3, 1, b.x, y, r * 0.8);
      gr.addColorStop(0, '#ff7eb6'); gr.addColorStop(1, '#b0306a');
      c.fillStyle = gr;
      c.beginPath(); c.arc(b.x, y, r * 0.72, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      c.font = `700 ${Math.round(r * 0.7)}px Inter, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('!', b.x, y + 1);
    } else if (b.type === 'normal') {
      soapBubble(c, b.x, y, r, now / 1000 + b.seed);
      c.strokeStyle = 'rgba(42,157,244,.35)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(b.x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.age / b.life)); c.stroke();
    } else {
      const gold = b.type === 'gold';
      const gr = c.createRadialGradient(b.x - r * 0.35, y - r * 0.35, r * 0.1, b.x, y, r);
      if (gold) { gr.addColorStop(0, '#fff6d0'); gr.addColorStop(0.5, '#f7c948'); gr.addColorStop(1, 'rgba(201,138,0,.85)'); }
      else { gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.55, 'rgba(127,211,255,.35)'); gr.addColorStop(1, 'rgba(42,157,244,.55)'); }
      c.fillStyle = gr;
      c.beginPath(); c.arc(b.x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = gold ? 'rgba(160,110,0,.6)' : 'rgba(42,157,244,.5)';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.8)';
      c.beginPath(); c.ellipse(b.x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
      if (gold) {
        c.fillStyle = '#8a5a10';
        c.font = `700 ${Math.round(r * 0.75)}px Inter, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('5', b.x, y + 1);
      }
      // life ring
      c.strokeStyle = gold ? 'rgba(160,110,0,.5)' : 'rgba(42,157,244,.35)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(b.x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.age / b.life)); c.stroke();
    }
    c.restore();
  }

  function draw(c, phase) {
    const now = performance.now();
    if (phase === 'before') {
      if (g.shake > 0) { c.save(); c.translate((Math.random() - 0.5) * 10 * g.shake, (Math.random() - 0.5) * 10 * g.shake); }
      g.bubbles.forEach((b) => drawBubble(c, b, now));
      return;
    }
    for (const f of g.fx) {
      c.save();
      if (f.kind === 'dot') {
        c.globalAlpha = 1 - f.t / 0.7;
        c.fillStyle = f.color;
        c.beginPath(); c.arc(f.x, f.y, 3, 0, Math.PI * 2); c.fill();
      } else if (f.kind === 'ring') {
        const k = f.t / 0.45;
        c.globalAlpha = 1 - k;
        c.strokeStyle = '#7fd3ff';
        c.lineWidth = 3 * (1 - k) + 0.5;
        c.beginPath(); c.arc(f.x, f.y, f.r * (1 + k * 0.9), 0, Math.PI * 2); c.stroke();
      } else if (f.kind === 'text') {
        const k = f.t / 0.9;
        c.globalAlpha = 1 - k * k;
        c.fillStyle = f.color;
        c.font = `italic 400 ${30 + (1 - k) * 8}px 'Instrument Serif', Georgia, serif`;
        c.textAlign = 'center';
        c.fillText(f.text, f.x, f.y - 20 - k * 40);
      }
      c.restore();
    }
    if (g.shake > 0) c.restore();
    if (g.running && cord.grabbed && g.bubbles.some((b) => b.wob > 0.9)) {
      c.save();
      c.fillStyle = 'rgba(0,0,0,.55)';
      c.font = "italic 22px 'Instrument Serif', Georgia, serif";
      c.textAlign = 'center';
      c.fillText('let go to pop it!', stage.w / 2, stage.h - 24);
      c.restore();
    }
  }

  const stage = new Stage(canvas, {
    cord,
    anchor: (w, h) => layout(w, h),
    onFrame: (dt) => tick(dt),
    onDraw: draw,
  });

  if (window.Pendu3D) window.Pendu3D.enhance(stage);

  $('#goBtn').addEventListener('click', start);

  // Pause when the game scrolls out of view.
  new IntersectionObserver(([e]) => {
    g.paused = !e.isIntersecting;
    if (!g.paused) stage.wakeLoop();
  }, { threshold: 0.25 }).observe(canvas);
})();
