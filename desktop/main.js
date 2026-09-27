// Pendu desktop: a transparent, click-through overlay with a charm on a rope,
// a tray / menu-bar icon, and a Library window. Runs on Ubuntu (Linux), Windows and macOS.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const STARTED_HIDDEN = process.argv.includes('--hidden');

// Always-on-top, click-through overlays are an X11 feature, so Linux runs through X11/XWayland.
if (IS_LINUX) {
  app.commandLine.appendSwitch('ozone-platform', 'x11');
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.disableHardwareAcceleration();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

/* ---------------- settings (one JSON file, one write path) ---------------- */
const DEFAULTS = {
  charms: ['nazar'],
  rope: 'gold',
  length: 200,
  size: 100,
  anchorX: 0.82,
  visible: true,
  openAtLogin: true,
  favs: [],
  mine: [],
};
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = { ...DEFAULTS };
let saveTimer = null;

function loadSettings() {
  try {
    settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch (e) {
    settings = { ...DEFAULTS };
  }
}
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
      fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
    } catch (e) {
      console.error('Could not save settings', e);
    }
  }, 150);
}
function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings();
  if ('openAtLogin' in patch) applyLoginItem();
  if ('visible' in patch) applyVisibility();
  broadcast('settings', settings);
  rebuildTrayMenu();
}
function broadcast(channel, payload) {
  for (const win of [overlay, library]) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

/* ---------------- start at login ---------------- */
function applyLoginItem() {
  if (IS_LINUX) {
    const dir = path.join(os.homedir(), '.config', 'autostart');
    const file = path.join(dir, 'pendu.desktop');
    try {
      if (settings.openAtLogin) {
        const exec = process.env.APPIMAGE || process.execPath;
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, [
          '[Desktop Entry]', 'Type=Application', 'Name=Pendu', `Exec="${exec}" --hidden`,
          'X-GNOME-Autostart-enabled=true', 'NoDisplay=false', 'Comment=A little charm that swings on your desktop', '',
        ].join('\n'));
      } else if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      console.error('Autostart', e);
    }
    return;
  }
  if (!app.isPackaged) return; // don't register the dev Electron binary
  app.setLoginItemSettings({ openAtLogin: settings.openAtLogin, openAsHidden: true, args: ['--hidden'] });
}

/* ---------------- overlay ---------------- */
let overlay = null;
let rects = [];
let grabbing = false;
let interactive = false;
let pollTimer = null;

function overlayBounds() {
  // workArea excludes the macOS menu bar, the GNOME top bar and the Windows taskbar.
  return screen.getPrimaryDisplay().workArea;
}

function createOverlay() {
  const b = overlayBounds();
  overlay = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    transparent: true, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, hasShadow: false, skipTaskbar: true, focusable: false, alwaysOnTop: true,
    backgroundColor: '#00000000', show: false, title: 'Pendu charm', acceptFirstMouse: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  overlay.setAlwaysOnTop(true, IS_MAC ? 'floating' : 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlay.once('ready-to-show', () => { if (settings.visible) overlay.showInactive(); });
  overlay.on('closed', () => { overlay = null; });
  startPolling();
}

// Click-through everywhere except the charm: poll the cursor and compare it to the charm rectangles
// the renderer reports. Polling works the same on all three platforms (Linux has no forwarded mouse moves).
function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!overlay || overlay.isDestroyed() || !overlay.isVisible()) return;
    const p = screen.getCursorScreenPoint();
    const b = overlay.getBounds();
    const x = p.x - b.x, y = p.y - b.y;
    const over = grabbing || rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (over !== interactive) {
      interactive = over;
      if (over) overlay.setIgnoreMouseEvents(false);
      else overlay.setIgnoreMouseEvents(true, { forward: true });
    }
  }, 40);
}

function fitOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.setBounds(overlayBounds());
}

function applyVisibility() {
  if (!overlay || overlay.isDestroyed()) return;
  if (settings.visible) overlay.showInactive(); else overlay.hide();
}

/* ---------------- library window ---------------- */
let library = null;
function openLibrary(page) {
  if (library && !library.isDestroyed()) {
    if (library.isMinimized()) library.restore();
    library.show();
    library.focus();
    if (page) library.webContents.send('goto', page);
    return;
  }
  library = new BrowserWindow({
    width: 1040, height: 700, minWidth: 760, minHeight: 540, show: false, title: 'Pendu',
    backgroundColor: '#f5efe6', autoHideMenuBar: true,
    titleBarStyle: IS_MAC ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, 'build', 'tray@2x.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  library.loadFile(path.join(__dirname, 'renderer', 'library.html'), page ? { hash: page } : undefined);
  library.once('ready-to-show', () => library.show());
  library.on('closed', () => { library = null; if (IS_MAC && app.dock) app.dock.hide(); });
  if (IS_MAC && app.dock) app.dock.show();
  // Open external links in the browser, never inside the app.
  library.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  library.webContents.on('will-navigate', (e) => e.preventDefault());
}

/* ---------------- tray / menu bar ---------------- */
let tray = null;
function trayImage() {
  if (IS_MAC) {
    const img = nativeImage.createFromPath(path.join(__dirname, 'build', 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  return nativeImage.createFromPath(path.join(__dirname, 'build', process.platform === 'win32' ? 'tray.png' : 'tray@2x.png'));
}
function createTray() {
  tray = new Tray(trayImage());
  tray.setToolTip('Pendu');
  if (!IS_MAC) tray.on('click', () => openLibrary());
  rebuildTrayMenu();
}
function rebuildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Library…', click: () => openLibrary() },
    { label: 'Nudge the charm', enabled: settings.visible, click: () => overlay && overlay.webContents.send('nudge') },
    { label: settings.visible ? 'Hide charm' : 'Show charm', click: () => updateSettings({ visible: !settings.visible }) },
    { type: 'separator' },
    { label: 'Appearance…', click: () => openLibrary('appearance') },
    { label: 'Start at login', type: 'checkbox', checked: settings.openAtLogin, click: (item) => updateSettings({ openAtLogin: item.checked }) },
    { type: 'separator' },
    { label: 'About Pendu', click: () => openLibrary('about') },
    { label: 'Quit Pendu', accelerator: IS_MAC ? 'Command+Q' : undefined, click: () => app.quit() },
  ]));
}

/* ---------------- IPC ---------------- */
ipcMain.handle('settings:get', () => settings);
ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, arch: process.arch, electron: process.versions.electron }));
ipcMain.on('settings:set', (_e, patch) => {
  if (patch && typeof patch === 'object') updateSettings(patch);
});
ipcMain.on('overlay:rects', (e, payload) => {
  if (!overlay || e.sender !== overlay.webContents) return;
  rects = Array.isArray(payload.rects) ? payload.rects : [];
  grabbing = !!payload.grabbing;
});
ipcMain.on('overlay:nudge', () => overlay && overlay.webContents.send('nudge'));
ipcMain.on('open:external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

/* ---------------- lifecycle ---------------- */
app.on('second-instance', () => openLibrary());

app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide();
  loadSettings();
  applyLoginItem();
  // A short delay helps compositors on Linux pick up the transparent visual.
  setTimeout(() => {
    createOverlay();
    createTray();
    if (!STARTED_HIDDEN) openLibrary();
  }, IS_LINUX ? 300 : 0);
  screen.on('display-metrics-changed', fitOverlay);
  screen.on('display-added', fitOverlay);
  screen.on('display-removed', fitOverlay);
});

// Pendu keeps running in the tray when the Library closes.
app.on('window-all-closed', () => {});
app.on('activate', () => openLibrary());
app.on('before-quit', () => { clearInterval(pollTimer); });
