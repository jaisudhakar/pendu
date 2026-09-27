/* Pendu website: hero charm, library playground, rope previews, downloads, small UI touches. */
(function () {
  const { Cord, Stage, ROPES, ropeById, drawRope } = window.PenduRope;
  const { COLLECTIONS, LIST, byId, image, fromFile } = window.PenduCharms;
  const REPO = 'jaisudhakar/pendu';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('pendu:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pendu:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ================= theme ================= */
  $('#themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('pendu:theme', root.dataset.theme); } catch (e) { /* ignore */ }
  });

  /* ================= nav ================= */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();
  const links = $$('.nav-links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => spy.observe(s));

  /* ================= reveal on scroll ================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  // Gentle 3D tilt on feature cards
  if (!reduceMotion && matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (!card.classList.contains('in')) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        const k = card.classList.contains('big') ? 2 : 6;
        card.style.transform = `perspective(900px) rotateX(${(-y * k).toFixed(2)}deg) rotateY(${(x * k).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ================= OS detection + downloads ================= */
  const OS_INFO = {
    mac: { name: 'macOS', file: 'Pendu-mac-arm64.dmg', glyph: $('.dl[data-os="mac"] .dl-logo svg') },
    windows: { name: 'Windows', file: 'Pendu-win-x64-Setup.exe', glyph: $('.dl[data-os="windows"] .dl-logo svg') },
    linux: { name: 'Ubuntu', file: 'Pendu-linux-amd64.deb', glyph: $('.dl[data-os="linux"] .dl-logo svg') },
  };
  function detectOS() {
    const p = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '').toLowerCase();
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|android/.test(ua)) return null;
    if (p.includes('mac')) return 'mac';
    if (p.includes('win')) return 'windows';
    if (p.includes('linux') || ua.includes('ubuntu') || ua.includes('x11')) return 'linux';
    return null;
  }
  const releaseUrl = (file) => `https://github.com/${REPO}/releases/latest/download/${file}`;
  $$('[data-file]').forEach((a) => { a.href = releaseUrl(a.dataset.file); a.setAttribute('download', ''); });
  $('#releasesLink').href = `https://github.com/${REPO}/releases`;
  $('#sourceLink').href = `https://github.com/${REPO}`;
  $('#year').textContent = new Date().getFullYear();
  const myOS = detectOS();
  if (myOS) {
    const info = OS_INFO[myOS];
    $('[data-os-name]').textContent = info.name;
    $('[data-os-glyph]').append(info.glyph.cloneNode(true));
    $('#heroDownload').href = '#download';
    const card = $(`.dl[data-os="${myOS}"]`);
    card.classList.add('recommended');
    card.parentElement.prepend(card); // put the visitor's OS first
  } else {
    $('[data-os-name]').parentElement.textContent = 'Download free';
  }
  $$('.dl-code .copy').forEach((btn) => btn.addEventListener('click', async () => {
    const text = btn.previousElementSibling.textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; } catch (e) { btn.textContent = 'Select'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
  }));

  /* ================= marquee ================= */
  const mq = $('#marquee');
  const items = LIST.map((c, i) => `<span class="mq-item" style="--i:${i}"><img src="${c.url}" alt="" loading="lazy">${c.name}<span class="sep">✦</span></span>`).join('');
  mq.innerHTML = items + items;

  /* ================= hero ================= */
  const HERO_SETS = [
    { rope: 'gold', charms: ['nazar'] },
    { rope: 'leather', charms: ['hamsa'] },
    { rope: 'beads', charms: ['star', 'clover'] },
    { rope: 'pearl', charms: ['heart'] },
    { rope: 'silver', charms: ['crescent', 'bell'] },
    { rope: 'ribbon', charms: ['cherry'] },
    { rope: 'cotton', charms: ['mushroom', 'ghost'] },
    { rope: 'neon', charms: ['planet', 'rocket'] },
    { rope: 'thread', charms: ['lucky-cat'] },
    { rope: 'gold', charms: ['key', 'padlock', 'heart'] },
  ];
  const hero = $('.hero');
  const heroCanvas = $('#heroCanvas');
  const hint = $('#heroHint');
  const rail = $('.hero-rail');
  let heroSet = Math.floor(Math.random() * HERO_SETS.length);
  let hintDone = false;

  function heroLayout(w, h) {
    const mobile = w < 860;
    if (mobile) {
      const copy = $('.hero-copy').getBoundingClientRect();
      const top = copy.bottom - hero.getBoundingClientRect().top + 24;
      rail.style.top = top + 'px';
      return { x: w * 0.5, y: top, len: Math.max(80, Math.min(150, h - top - 190)), scale: 0.85 };
    }
    rail.style.top = '68px';
    return { x: w * (w > 1200 ? 0.74 : 0.76), y: 68, len: Math.min(260, h * 0.36), scale: w > 1200 ? 1.35 : 1.15 };
  }

  const heroCord = new Cord();
  function hangHero(swing) {
    const set = HERO_SETS[heroSet];
    const L = heroLayout(hero.clientWidth, hero.clientHeight);
    heroCord.configure({
      anchor: { x: L.x, y: L.y }, length: L.len, rope: set.rope, scale: L.scale, swing,
      charms: set.charms.map((id) => ({ charm: byId[id] })),
    });
  }
  hangHero(reduceMotion ? 0 : 50);
  const heroStage = new Stage(heroCanvas, {
    cord: heroCord,
    target: hero,
    anchor: (w, h) => { const L = heroLayout(w, h); return { x: L.x, y: L.y }; },
    onFrame() {
      if (!hintDone && heroCord.grabbed) { hintDone = true; hint.classList.add('gone'); }
      if (!hintDone) {
        // Park the hint where the charm comes to rest, not where it is mid-swing.
        hint.style.left = heroCord.anchor.x - 220 + 'px';
        hint.style.top = heroCord.anchor.y + heroCord.length + 40 * heroCord.scale + 'px';
      }
      return false;
    },
  });
  setTimeout(() => { if (!hintDone) hint.classList.add('show'); }, 1800);
  hero.addEventListener('pointermove', (e) => {
    if (hintDone || e.pointerType !== 'mouse') return;
    const r = heroCanvas.getBoundingClientRect();
    if (heroCord.nearest(e.clientX - r.left, e.clientY - r.top, 0)) { hintDone = true; hint.classList.add('gone'); }
  });
  $('#heroShuffle').addEventListener('click', () => {
    heroSet = (heroSet + 1) % HERO_SETS.length;
    hangHero(reduceMotion ? 0 : (Math.random() > 0.5 ? 55 : -55));
    heroStage.redraw();
  });
  // Scrolling jiggles the charm a little, like carrying it.
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const dy = scrollY - lastY;
    lastY = scrollY;
    if (reduceMotion || scrollY > innerHeight) return;
    heroCord.impulse(Math.max(-120, Math.min(120, dy * 2)), Math.max(-220, Math.min(220, dy * 4)));
    heroStage.wakeLoop();
  }, { passive: true });

  /* ================= library / playground ================= */
  const lab = Object.assign({ charms: ['nazar', 'star'], rope: 'gold', length: 230, size: 100, favs: [], col: 'all' }, store.get('lab', {}));
  let mine = store.get('mine', []);
  const allCharms = () => LIST.concat(mine);
  const charmById = (id) => byId[id] || mine.find((c) => c.id === id);
  lab.charms = lab.charms.filter(charmById);
  const saveLab = () => store.set('lab', lab);
  const changeListeners = [];

  const labCanvas = $('#labCanvas');
  const labCord = new Cord();
  function labLayout(w, h) {
    const scale = lab.size / 100;
    const charmH = lab.charms.reduce((sum, id) => sum + (charmById(id).size || 80) * scale, 0);
    const len = Math.max(60, Math.min(lab.length, h - 31 - charmH - 70));
    return { x: w / 2, y: 31, len, scale };
  }
  function hangLab(swing = 0) {
    const L = labLayout(labCanvas.clientWidth || 600, labCanvas.clientHeight || 560);
    labCord.configure({
      anchor: { x: L.x, y: L.y }, length: L.len, rope: lab.rope, scale: L.scale, swing,
      charms: lab.charms.map((id) => ({ charm: charmById(id) })),
    });
    changeListeners.forEach((fn) => fn());
  }
  hangLab(0);
  const labStage = new Stage(labCanvas, {
    cord: labCord,
    anchor: (w, h) => labLayout(w, h),
  });
  function relabel(swing) {
    hangLab(swing);
    labStage.redraw();
    renderCordList();
    renderGrid();
    saveLab();
  }

  // Tabs
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => { t.classList.toggle('on', t === tab); t.setAttribute('aria-selected', t === tab); });
    $$('.tab-body').forEach((b) => { b.hidden = b.dataset.body !== tab.dataset.tab; });
    if (tab.dataset.tab === 'ropes') renderRopes();
  }));

  // Collections + grid
  const colBox = $('#libCollections');
  function renderCollections() {
    const cols = [{ id: 'all', name: 'All' }, { id: 'favs', name: '♥ Favorites' }, ...COLLECTIONS, { id: 'mine', name: 'Mine' }];
    colBox.innerHTML = cols.map((c) => {
      const n = c.id === 'all' ? allCharms().length : c.id === 'favs' ? lab.favs.length : c.id === 'mine' ? mine.length : LIST.filter((x) => x.col === c.id).length;
      return `<button class="chip ${lab.col === c.id ? 'on' : ''}" data-col="${c.id}">${c.name}<span class="n">${n}</span></button>`;
    }).join('');
    const info = COLLECTIONS.find((c) => c.id === lab.col);
    $('#colBlurb').textContent = info ? info.blurb : lab.col === 'mine' ? 'Charms you made in Create.' : lab.col === 'favs' ? 'Your favorites, all in one place.' : 'Click a charm to hang it. Up to three per cord.';
  }
  colBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-col]');
    if (!b) return;
    lab.col = b.dataset.col;
    saveLab();
    renderCollections();
    renderGrid();
  });

  const grid = $('#libGrid');
  const search = $('#libSearch');
  function renderGrid() {
    const q = search.value.trim().toLowerCase();
    let list = allCharms();
    if (lab.col === 'favs') list = list.filter((c) => lab.favs.includes(c.id));
    else if (lab.col !== 'all') list = list.filter((c) => c.col === lab.col);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.col.includes(q));
    if (!list.length) {
      grid.innerHTML = `<div class="empty">${lab.col === 'mine' ? 'Nothing here yet. Make one in <b>Create</b>.' : lab.col === 'favs' ? 'Tap ♥ on a charm to keep it here.' : 'No charms match.'}</div>`;
      return;
    }
    grid.innerHTML = list.map((c, i) => `
      <div class="charm-tile ${lab.charms.includes(c.id) ? 'on' : ''}" role="button" tabindex="0" data-id="${c.id}" style="--i:${i}" title="${c.name}">
        <button class="fav ${lab.favs.includes(c.id) ? 'on' : ''}" data-fav="${c.id}" aria-label="Favorite ${c.name}">${lab.favs.includes(c.id) ? '♥' : '♡'}</button>
        ${c.custom ? `<button class="del" data-del="${c.id}" aria-label="Delete ${c.name}">✕</button>` : ''}
        <img src="${c.url}" alt="">${c.name}
      </div>`).join('');
  }
  search.addEventListener('input', renderGrid);
  function toggleCharm(id) {
    const i = lab.charms.indexOf(id);
    if (i >= 0) lab.charms.splice(i, 1);
    else {
      if (lab.charms.length >= 3) { lab.charms.pop(); toast('Three charms max, so the last one was swapped'); }
      lab.charms.push(id);
    }
    relabel(i >= 0 ? 0 : 25);
  }
  grid.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const id = fav.dataset.fav;
      lab.favs = lab.favs.includes(id) ? lab.favs.filter((x) => x !== id) : lab.favs.concat(id);
      saveLab();
      renderCollections();
      renderGrid();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      mine = mine.filter((c) => c.id !== del.dataset.del);
      lab.charms = lab.charms.filter((id) => id !== del.dataset.del);
      store.set('mine', mine);
      renderCollections();
      relabel(0);
      return;
    }
    const tile = e.target.closest('.charm-tile');
    if (tile) toggleCharm(tile.dataset.id);
  });
  grid.addEventListener('keydown', (e) => {
    const tile = e.target.closest('.charm-tile');
    if (tile && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleCharm(tile.dataset.id); }
  });

  // Cord list (drag to reorder)
  const cordList = $('#cordList');
  let dragIdx = -1;
  function renderCordList() {
    if (!lab.charms.length) { cordList.innerHTML = '<span class="cord-empty">Your cord is empty. Pick a charm.</span>'; return; }
    cordList.innerHTML = lab.charms.map((id, i) => {
      const c = charmById(id);
      return `<span class="cord-chip" draggable="true" data-i="${i}"><span class="num" title="Move up">${i + 1}</span><img src="${c.url}" alt="">${c.name}<button data-rm="${i}" aria-label="Remove ${c.name}">✕</button></span>`;
    }).join('');
  }
  cordList.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { lab.charms.splice(+rm.dataset.rm, 1); relabel(0); return; }
    const num = e.target.closest('.num');
    if (num) {
      const i = +num.parentElement.dataset.i;
      if (i > 0) { [lab.charms[i - 1], lab.charms[i]] = [lab.charms[i], lab.charms[i - 1]]; relabel(15); }
    }
  });
  cordList.addEventListener('dragstart', (e) => {
    const chip = e.target.closest('.cord-chip');
    if (!chip) return;
    dragIdx = +chip.dataset.i;
    chip.classList.add('drag');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragIdx));
  });
  cordList.addEventListener('dragover', (e) => {
    const chip = e.target.closest('.cord-chip');
    if (!chip || dragIdx < 0) return;
    e.preventDefault();
    $$('.cord-chip', cordList).forEach((c) => c.classList.toggle('over', c === chip));
  });
  cordList.addEventListener('drop', (e) => {
    const chip = e.target.closest('.cord-chip');
    if (!chip || dragIdx < 0) return;
    e.preventDefault();
    const to = +chip.dataset.i;
    const [moved] = lab.charms.splice(dragIdx, 1);
    lab.charms.splice(to, 0, moved);
    dragIdx = -1;
    relabel(15);
  });
  cordList.addEventListener('dragend', () => { dragIdx = -1; $$('.cord-chip', cordList).forEach((c) => c.classList.remove('drag', 'over')); });

  // Ropes tab
  const ropeGrid = $('#ropeGrid');
  function ropeSwatch(canvas, rope) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = 60, h = 44;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const pts = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return { x: 6 + t * 48, y: 10 + Math.sin(t * Math.PI) * 22 }; });
    drawRope(c, rope, pts);
  }
  function renderRopes() {
    ropeGrid.innerHTML = ROPES.map((r) => `<button class="rope-tile ${lab.rope === r.id ? 'on' : ''}" data-rope="${r.id}"><canvas></canvas>${r.name}</button>`).join('');
    $$('.rope-tile', ropeGrid).forEach((b) => ropeSwatch($('canvas', b), ropeById[b.dataset.rope]));
  }
  ropeGrid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rope]');
    if (!b) return;
    lab.rope = b.dataset.rope;
    $$('.rope-tile', ropeGrid).forEach((t) => t.classList.toggle('on', t === b));
    relabel(30);
  });
  const lenRange = $('#lenRange'), sizeRange = $('#sizeRange');
  lenRange.value = lab.length;
  sizeRange.value = lab.size;
  const syncOut = () => { $('#lenOut').textContent = lab.length + ' px'; $('#sizeOut').textContent = lab.size + '%'; };
  syncOut();
  lenRange.addEventListener('input', () => { lab.length = +lenRange.value; syncOut(); hangLab(0); labStage.redraw(); });
  sizeRange.addEventListener('input', () => { lab.size = +sizeRange.value; syncOut(); hangLab(0); labStage.redraw(); });
  [lenRange, sizeRange].forEach((r) => r.addEventListener('change', saveLab));

  // Create tab
  let frame = 'round';
  $('#frameSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-frame]');
    if (!b) return;
    frame = b.dataset.frame;
    $$('#frameSeg button').forEach((x) => x.classList.toggle('on', x === b));
  });
  async function addFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('That file is not an image'); return; }
    try {
      const charm = await fromFile(file, { frame });
      mine = mine.concat(charm).slice(-8);
      if (!store.set('mine', mine)) toast('Saved for this visit only (storage is full)');
      if (lab.charms.length >= 3) lab.charms.pop();
      lab.charms.push(charm.id);
      lab.col = 'mine';
      renderCollections();
      relabel(30);
      toast(`“${charm.name}” is on your cord`);
    } catch (err) { toast(err.message || 'Could not read that image'); }
  }
  const dz = $('#dropzone');
  $('#fileInput').addEventListener('change', (e) => { addFile(e.target.files[0]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('over')));
  dz.addEventListener('drop', (e) => { e.preventDefault(); addFile(e.dataTransfer.files[0]); });

  $('#nudgeBtn').addEventListener('click', () => { labCord.impulse((Math.random() > 0.5 ? 1 : -1) * (450 + Math.random() * 300), -60); labStage.wakeLoop(); });
  $('#clearBtn').addEventListener('click', () => { lab.charms = []; relabel(0); });

  renderCollections();
  renderGrid();
  renderCordList();

  /* ================= rope comparison (features) ================= */
  const compare = $$('[data-compare]').map((canvas) => {
    const cord = new Cord();
    cord.configure({ anchor: { x: 60, y: 14 }, length: 120, rope: canvas.dataset.compare, charms: [{ charm: byId.coin }], scale: 0.8 });
    const stage = new Stage(canvas, { cord, anchor: (w) => ({ x: w / 2, y: 14 }) });
    return { cord, stage };
  });
  let compareT = 0;
  const kick = () => compare.forEach(({ cord, stage }) => { cord.impulse(520, 0); stage.wakeLoop(); });
  const featObs = new IntersectionObserver(([e]) => {
    clearInterval(compareT);
    if (e.isIntersecting && !reduceMotion) { kick(); compareT = setInterval(kick, 5200); }
  }, { threshold: 0.3 });
  featObs.observe($('.rope-compare'));

  /* ================= shared with the game ================= */
  window.PenduSite = {
    store, toast,
    cordConfig: () => ({ rope: lab.rope, charms: (lab.charms.length ? lab.charms : ['nazar']).map((id) => ({ charm: charmById(id) })) }),
    onCordChange: (fn) => changeListeners.push(fn),
  };
})();
