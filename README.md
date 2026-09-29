# Pendu

A little charm that swings on your desktop.

Pendu (French for "hanging") hangs a charm from the top of your screen on a real, simulated rope. Push it, flick it, and watch it swing and settle like the real thing. The rest of the time it stays out of your way.

This repository contains two things built from the same HTML, CSS and JavaScript:

| | What | Where |
|---|---|---|
| **Website** | Animated landing page with a live charm you can push, a charm library playground, the *Bubble Swing* game and download buttons | `index.html`, `assets/` |
| **Desktop app** | The charm itself on Ubuntu/Linux, Windows and macOS: a transparent, click-through overlay with a tray/menu-bar icon and a Library window | `desktop/` |

## Features

- **Realistic 3D on the website.** Every cord is drawn with WebGL: gold and silver chains are real interlocking links, pearls have a nacre sheen, cotton cord has twisted strands, and each charm is a thick, bevelled piece that turns slowly on its ring and casts a soft shadow on the page. The metal gets its look from a small virtual photo studio it reflects.
- **Real rope physics.** A Verlet solver runs at a fixed 240 Hz, independent of screen refresh. The rope never stretches past 1.02× its length. It sleeps when the charm settles, so it uses no CPU at rest.
- **32 hand-drawn charms** in four collections (Protection, Luck, Ritual, Story), all inline SVG.
- **Up to three charms on one cord**, in any order (drag to reorder).
- **Nine ropes, nine feels.** Thread, cotton cord, leather, silk ribbon, bead string, gold chain, silver chain, pearls and neon wire. Each is its own set of solver values (mass, drag, stiffness), not just a colour.
- **Make your own charm** from a PNG, JPG, SVG or WebP. It stays on your device.
- **Bubble Swing** (website): flick your cord into bubbles for 45 seconds. Carrying the charm into a bubble doesn't count.
- Light and dark themes, scroll animations, and `prefers-reduced-motion` support.

## Website

There is no build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### 3D rendering

`assets/js/charms3d.js` draws the cord in 3D with [three.js](https://threejs.org). The physics and input still live in `rope.js`, so nothing about how the charm moves changes. One shared, offscreen WebGL renderer draws only the region around each cord and copies it into that section's canvas. The hero, the playground, the rope comparison, the rope swatches and Bubble Swing all use it.

- Charms are built from their flat drawings at runtime: the silhouette becomes a solid with thickness, the edges get a rounded bevel (a normal map), and golds, rose golds and greys become polished metal while the other colours become glossy enamel.
- A charm twists on its ring when you flick it. In the hero and the playground it also turns gently at rest, but only while it's on screen. `prefers-reduced-motion` turns that off.
- If WebGL isn't available, or the GPU drops the context, the site falls back to the original Canvas 2D drawing.

three.js is vendored as `assets/vendor/three.min.js`, a minified subset (about 120 KB gzipped) that sets `window.THREE`. It needs no CDN and works from `file://`. To rebuild it (for example after using another three.js class in `charms3d.js`), edit the export list in `tools/three/entry.js` and run:

```bash
cd tools/three && npm install && npm run build
```

To publish on **GitHub Pages**, go to *Settings → Pages → Source* and choose **GitHub Actions**. The `Website` workflow (`.github/workflows/pages.yml`) then deploys `index.html` and `assets/` on every push to `main`.

The download buttons link to `https://github.com/jaisudhakar/pendu/releases/latest/download/<file>`, so they start working once the first release exists (see below). The visitor's OS is detected and its card is highlighted.

## Desktop app (Ubuntu, Windows, macOS)

The app is an [Electron](https://www.electronjs.org/) shell around the same physics engine. `desktop/scripts/sync-shared.js` copies `assets/js/rope.js` and `assets/js/charms.js` into the app before every run or build, so the website and the app never drift apart.

```bash
cd desktop
npm install
npm start            # run it locally
```

What it does:

- Draws a transparent overlay over the work area (below the macOS menu bar or GNOME top bar, above the Windows taskbar), with the charm hanging from the top edge.
- The overlay is **click-through everywhere except the charm**. The main process polls the cursor and turns on input only over the charm, which works the same way on all three platforms.
- A **tray / menu-bar icon** gives you Open Library, Nudge the charm, Hide/Show charm, Appearance, Start at login, About and Quit.
- The **Library window** has four pages: Library (collections, search, favorites, your cord), Create (your own charms), Appearance (rope, length, size, position on screen, start at login) and About.
- Only one copy runs at a time. Opening it again brings the Library forward.
- Settings live in one JSON file in the app's user-data folder. Pendu makes no network requests.

### Building installers

```bash
cd desktop
npm run dist:linux   # Pendu-linux-amd64.deb + Pendu-linux-x86_64.AppImage
npm run dist:win     # Pendu-win-x64-Setup.exe + Pendu-win-arm64-Setup.exe
npm run dist:mac     # Pendu-mac-arm64.dmg + Pendu-mac-x64.dmg
```

Output goes to `desktop/dist/`. Each platform is best built on that platform, which is what CI does.

### Releases via GitHub Actions

`.github/workflows/desktop.yml` builds all three platforms on `ubuntu-latest`, `windows-latest` and `macos-latest`. It runs on pull requests that touch the app, and you can also start it by hand. To publish a release that the website links to:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow attaches the six installers to a GitHub Release with the exact file names the website expects.

### Platform notes

- **Ubuntu / Linux.** Install with `sudo apt install ./Pendu-linux-amd64.deb`, or run the AppImage (`chmod +x` first). The tray icon uses AppIndicator, which Ubuntu enables by default. The overlay runs through X11 (XWayland on Wayland sessions). On a Wayland session the charm hangs and swings, and *Nudge* from the tray always works. Grabbing it with the mouse is most reliable on an "Ubuntu on Xorg" session, because Wayland doesn't share the cursor position with click-through windows. Start at login writes `~/.config/autostart/pendu.desktop`.
- **Windows.** Installs per user into `%LOCALAPPDATA%`, with no admin rights needed. The builds are unsigned, so SmartScreen may warn on first run: click **More info → Run anyway**.
- **macOS.** Lives in the menu bar, with no Dock icon (`LSUIElement`). The builds are unsigned, so on first launch right-click the app, choose **Open**, then **Open** again. To sign and notarize, set `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`, then remove `"identity": null` from `desktop/package.json`.

## Project layout

```
index.html                 website
assets/css/site.css        website styles (light/dark, animations)
assets/js/rope.js          Verlet rope engine + canvas renderer + Stage (shared with the app)
assets/js/charms.js        charm library as inline SVG + custom-charm maker (shared with the app)
assets/js/charms3d.js      WebGL renderer for cords and charms (website only)
assets/vendor/three.min.js three.js subset, built from tools/three
assets/js/site.js          hero, library playground, rope comparison, downloads
assets/js/game.js          Bubble Swing
tools/three/               how assets/vendor/three.min.js is built
desktop/main.js            Electron main process: overlay, click-through, tray, settings, autostart
desktop/preload.js         the small bridge between main and renderer
desktop/renderer/          overlay page and Library window
desktop/build/             app + tray icons
.github/workflows/         desktop builds/releases and GitHub Pages
```

## License

MIT
