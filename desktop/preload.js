// Minimal, explicit bridge between the renderer pages and the main process.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (fn) => {
  const handler = (_e, payload) => fn(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('pendu', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.send('settings:set', patch),
  onSettings: on('settings'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  reportRects: (rects, grabbing) => ipcRenderer.send('overlay:rects', { rects, grabbing }),
  nudge: () => ipcRenderer.send('overlay:nudge'),
  onNudge: on('nudge'),
  onGoto: on('goto'),
  openExternal: (url) => ipcRenderer.send('open:external', url),
});
