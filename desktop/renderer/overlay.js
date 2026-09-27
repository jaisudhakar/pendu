// The desktop overlay: one cord hanging from the top edge of the screen.
(async function () {
  const { Cord, Stage } = window.PenduRope;
  const { byId } = window.PenduCharms;
  const api = window.pendu;
  const canvas = document.getElementById('stage');

  let settings = await api.getSettings();
  const cord = new Cord();

  const charmFor = (id) => byId[id] || (settings.mine || []).find((c) => c.id === id);
  const anchorFor = (w) => ({ x: Math.round(w * settings.anchorX), y: -2 });

  function hang(swing = 0) {
    const charms = (settings.charms || []).map(charmFor).filter(Boolean).map((charm) => ({ charm }));
    const a = anchorFor(innerWidth);
    const scale = settings.size / 100;
    const charmH = charms.reduce((s, c) => s + (c.charm.size || 80) * scale, 0);
    cord.configure({
      anchor: a, rope: settings.rope, scale, swing,
      length: Math.max(40, Math.min(settings.length, innerHeight - charmH - 40)),
      charms: charms.length ? charms : [{ charm: byId.nazar }],
    });
  }

  // Report where the charms are so the main process can make only those pixels clickable.
  let lastSent = 0;
  let settleTimer = 0;
  function report() {
    api.reportRects(cord.bounds(10), !!cord.grabbed);
    lastSent = performance.now();
  }

  hang(35);
  const stage = new Stage(canvas, {
    cord,
    pin: false,
    anchor: (w) => anchorFor(w),
    touchScroll: false,
    onFrame() {
      if (performance.now() - lastSent > 33) report();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(report, 120); // final position once the charm falls asleep
      return false;
    },
  });
  report();

  api.onSettings((next) => {
    const prev = settings;
    settings = next;
    const shape = ['charms', 'rope', 'length', 'size', 'mine'].some((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]));
    if (shape) {
      hang(prev.charms.join() !== next.charms.join() ? 30 : 0);
      stage.redraw();
    } else if (prev.anchorX !== next.anchorX) {
      const a = anchorFor(innerWidth);
      cord.setAnchor(a.x, a.y); // moving the anchor makes the charm swing, like sliding a hook
      stage.wakeLoop();
    }
    report();
  });

  api.onNudge(() => {
    cord.impulse((Math.random() > 0.5 ? 1 : -1) * (500 + Math.random() * 300), -40);
    stage.wakeLoop();
  });
})();
