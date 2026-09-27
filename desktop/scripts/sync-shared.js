// Copy the physics engine and charm library from the website into the desktop renderer,
// so the app and the site always run the same code.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'assets', 'js');
const dest = path.join(__dirname, '..', 'renderer', 'shared');
fs.mkdirSync(dest, { recursive: true });
for (const file of ['rope.js', 'charms.js']) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  console.log(`synced ${file}`);
}
