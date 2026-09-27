// Library window: pick charms, create your own, tune the rope, and read about the app.
(async function () {
  const { Cord, Stage, ROPES, ropeById, drawRope } = window.PenduRope;
  const { COLLECTIONS, LIST, byId, fromFile } = window.PenduCharms;
  const api = window.pendu;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let S = await api.getSettings();
  let col = 'all';
  let frame = 'round';
  const set = (patch) => { S = { ...S, ...patch }; api.setSettings(patch); };
  const all = () => LIST.concat(S.mine || []);
  const charmFor = (id) => byId[id] || (S.mine || []).find((c) => c.id === id);

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- navigation ---------- */
  function go(page) {
    if (!$(`.page[data-page="${page}"]`)) page = 'library';
    $$('.side-nav button').forEach((b) => b.classList.toggle('on', b.dataset.page === page));
    $$('.page').forEach((p) => { p.hidden = p.dataset.page !== page; });
    $('.main').scrollTop = 0;
    if (page === 'library') { stage.resize(); stage.redraw(); }
    if (page === 'appearance') renderRopes();
    if (page === 'create') renderMine();
  }
  $$('.side-nav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.page)));
  api.onGoto(go);

  /* ---------- live preview ---------- */
  const canvas = $('#preview');
  const cord = new Cord();
  function hang(swing = 0) {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 520;
    const scale = Math.min(1, S.size / 100);
    const charms = (S.charms || []).map(charmFor).filter(Boolean).map((charm) => ({ charm }));
    const charmH = charms.reduce((s, c) => s + c.charm.size * scale, 0);
    cord.configure({
      anchor: { x: w / 2, y: 25 }, rope: S.rope, scale, swing,
      length: Math.max(50, Math.min(S.length * 0.8, h - 25 - charmH - 60)),
      charms,
    });
  }
  hang(0);
  const stage = new Stage(canvas, { cord, anchor: (w) => ({ x: w / 2, y: 25 }) });

  /* ---------- library ---------- */
  function renderCols() {
    const cols = [{ id: 'all', name: 'All' }, { id: 'favs', name: '♥ Favorites' }, ...COLLECTIONS, { id: 'mine', name: 'Mine' }];
    $('#cols').innerHTML = cols.map((c) => `<button class="chip ${c.id === col ? 'on' : ''}" data-col="${c.id}">${c.name}</button>`).join('');
  }
  $('#cols').addEventListener('click', (e) => {
    const b = e.target.closest('[data-col]');
    if (b) { col = b.dataset.col; renderCols(); renderGrid(); }
  });

  function tiles(list, { deletable = false } = {}) {
    return list.map((c, i) => `
      <div class="tile ${S.charms.includes(c.id) ? 'on' : ''}" data-id="${c.id}" style="--i:${i}" title="${c.name}">
        <button class="fav ${S.favs.includes(c.id) ? 'on' : ''}" data-fav="${c.id}">${S.favs.includes(c.id) ? '♥' : '♡'}</button>
        ${deletable ? `<button class="del" data-del="${c.id}">✕</button>` : ''}
        <img src="${c.url}" alt="">${c.name}
      </div>`).join('');
  }

  function renderGrid() {
    const q = $('#search').value.trim().toLowerCase();
    let list = all();
    if (col === 'favs') list = list.filter((c) => S.favs.includes(c.id));
    else if (col !== 'all') list = list.filter((c) => c.col === col);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    $('#grid').innerHTML = list.length ? tiles(list, { deletable: col === 'mine' }) : '<div class="empty">Nothing here yet.</div>';
  }
  $('#search').addEventListener('input', renderGrid);

  function toggle(id) {
    const charms = S.charms.slice();
    const i = charms.indexOf(id);
    if (i >= 0) {
      if (charms.length === 1) { toast('Your cord needs at least one charm'); return; }
      charms.splice(i, 1);
    } else {
      if (charms.length >= 3) { charms.pop(); toast('Three charms max, so the last one was swapped'); }
      charms.push(id);
    }
    set({ charms });
    refresh(i >= 0 ? 0 : 25);
  }

  function onGridClick(e) {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const id = fav.dataset.fav;
      set({ favs: S.favs.includes(id) ? S.favs.filter((x) => x !== id) : S.favs.concat(id) });
      renderGrid(); renderMine();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const id = del.dataset.del;
      const charms = S.charms.filter((x) => x !== id);
      set({ mine: S.mine.filter((c) => c.id !== id), charms: charms.length ? charms : ['nazar'] });
      refresh(0);
      return;
    }
    const tile = e.target.closest('.tile');
    if (tile) toggle(tile.dataset.id);
  }
  $('#grid').addEventListener('click', onGridClick);
  $('#mine').addEventListener('click', onGridClick);

  // Cord chips, drag to reorder
  let dragFrom = -1;
  function renderCord() {
    $('#cord').innerHTML = S.charms.map((id, i) => {
      const c = charmFor(id);
      return c ? `<span class="cord-chip" draggable="true" data-i="${i}"><span class="n">${i + 1}</span><img src="${c.url}" alt="">${c.name}<button data-rm="${id}">✕</button></span>` : '';
    }).join('');
  }
  const cordBox = $('#cord');
  cordBox.addEventListener('click', (e) => { const rm = e.target.closest('[data-rm]'); if (rm) toggle(rm.dataset.rm); });
  cordBox.addEventListener('dragstart', (e) => { const c = e.target.closest('.cord-chip'); if (c) { dragFrom = +c.dataset.i; e.dataTransfer.effectAllowed = 'move'; } });
  cordBox.addEventListener('dragover', (e) => { const c = e.target.closest('.cord-chip'); if (c && dragFrom >= 0) { e.preventDefault(); $$('.cord-chip').forEach((x) => x.classList.toggle('over', x === c)); } });
  cordBox.addEventListener('drop', (e) => {
    const c = e.target.closest('.cord-chip');
    if (!c || dragFrom < 0) return;
    e.preventDefault();
    const charms = S.charms.slice();
    const [m] = charms.splice(dragFrom, 1);
    charms.splice(+c.dataset.i, 0, m);
    dragFrom = -1;
    set({ charms });
    refresh(15);
  });
  cordBox.addEventListener('dragend', () => { dragFrom = -1; $$('.cord-chip').forEach((x) => x.classList.remove('over')); });

  function refresh(swing = 0) {
    hang(swing);
    stage.redraw();
    renderGrid();
    renderCord();
    renderMine();
  }

  /* ---------- create ---------- */
  function renderMine() {
    $('#mine').innerHTML = (S.mine || []).length ? tiles(S.mine, { deletable: true }) : '<div class="empty">Charms you make will appear here.</div>';
  }
  $('#frame').addEventListener('click', (e) => {
    const b = e.target.closest('[data-frame]');
    if (!b) return;
    frame = b.dataset.frame;
    $$('#frame button').forEach((x) => x.classList.toggle('on', x === b));
  });
  async function addFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Please choose an image'); return; }
    try {
      const charm = await fromFile(file, { frame });
      const charms = S.charms.slice(0, 2).concat(charm.id);
      set({ mine: (S.mine || []).concat(charm).slice(-24), charms });
      refresh(30);
      toast(`“${charm.name}” is hanging on your desktop`);
    } catch (err) { toast(err.message || 'Could not read that image'); }
  }
  const drop = $('#drop');
  $('#file').addEventListener('change', (e) => { addFile(e.target.files[0]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); addFile(e.dataTransfer.files[0]); });
  // Dropping an image anywhere on the window should not navigate away.
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => e.preventDefault());

  /* ---------- appearance ---------- */
  function renderRopes() {
    $('#ropes').innerHTML = ROPES.map((r) => `<button class="rope ${S.rope === r.id ? 'on' : ''}" data-rope="${r.id}"><canvas></canvas>${r.name}</button>`).join('');
    $$('.rope').forEach((b) => {
      const cv = b.querySelector('canvas');
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = 70 * dpr; cv.height = 46 * dpr;
      const c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.lineCap = 'round'; c.lineJoin = 'round';
      const pts = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return { x: 6 + t * 58, y: 10 + Math.sin(t * Math.PI) * 24 }; });
      drawRope(c, ropeById[b.dataset.rope], pts);
    });
  }
  $('#ropes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rope]');
    if (!b) return;
    set({ rope: b.dataset.rope });
    $$('.rope').forEach((x) => x.classList.toggle('on', x === b));
    hang(30);
    stage.redraw();
  });

  const len = $('#len'), size = $('#size'), pos = $('#pos');
  function syncSliders() {
    len.value = S.length; size.value = S.size; pos.value = Math.round(S.anchorX * 100);
    $('#lenOut').textContent = S.length + ' px';
    $('#sizeOut').textContent = S.size + '%';
    $('#posOut').textContent = Math.round(S.anchorX * 100) + '% from the left';
  }
  len.addEventListener('input', () => { set({ length: +len.value }); syncSliders(); hang(0); stage.redraw(); });
  size.addEventListener('input', () => { set({ size: +size.value }); syncSliders(); hang(0); stage.redraw(); });
  pos.addEventListener('input', () => { set({ anchorX: +pos.value / 100 }); syncSliders(); });

  const loginToggle = $('#loginToggle'), visibleToggle = $('#visibleToggle');
  loginToggle.addEventListener('change', () => set({ openAtLogin: loginToggle.checked }));
  visibleToggle.addEventListener('change', () => set({ visible: visibleToggle.checked }));
  $('#nudgeDesk').addEventListener('click', () => {
    if (!S.visible) { toast('The charm is hidden. Turn on “Show charm” first'); return; }
    api.nudge();
  });

  /* ---------- about ---------- */
  api.appInfo().then((i) => {
    const names = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' };
    $('#ver').textContent = `Version ${i.version} · ${names[i.platform] || i.platform} ${i.arch} · Electron ${i.electron}`;
  });
  $$('[data-link]').forEach((b) => b.addEventListener('click', () => api.openExternal(b.dataset.link)));

  /* ---------- keep in sync with the tray menu ---------- */
  api.onSettings((next) => {
    S = next;
    loginToggle.checked = S.openAtLogin;
    visibleToggle.checked = S.visible;
    syncSliders();
    renderCord();
  });

  loginToggle.checked = S.openAtLogin;
  visibleToggle.checked = S.visible;
  syncSliders();
  renderCols();
  renderGrid();
  renderCord();
  go((location.hash || '#library').slice(1));
})();
