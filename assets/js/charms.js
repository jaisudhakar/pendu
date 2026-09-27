/* Pendu charms: every charm is a hand-drawn SVG (viewBox 100x100, jump ring at the top).
   Shared by the website and the desktop app. */
(function (global) {
  const G = {
    gold: '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c7"/><stop offset=".42" stop-color="#e8b646"/><stop offset="1" stop-color="#9c6a14"/></linearGradient>',
    silver: '<linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c9ced6"/><stop offset="1" stop-color="#7d8591"/></linearGradient>',
    rose: '<linearGradient id="rose" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3d6"/><stop offset=".5" stop-color="#e9a58a"/><stop offset="1" stop-color="#a8614a"/></linearGradient>',
    shine: '<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>',
  };

  const svg = (defs, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${defs.map((d) => G[d] || d).join('')}</defs>${body}</svg>`;
  // Jump ring + bail connecting the ring to the charm body at y = to.
  const ring = (to = 16, metal = 'gold') =>
    `<path d="M50 11V${to}" stroke="url(#${metal})" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="7" r="4.6" fill="none" stroke="url(#${metal})" stroke-width="2.6"/>`;
  const star = (cx, cy, R, r, fill, extra = '') => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return `<path d="${d}Z" fill="${fill}" ${extra}/>`;
  };

  const COLLECTIONS = [
    { id: 'protection', name: 'Protection', blurb: 'Eyes, hands and keys that keep watch over your screen.' },
    { id: 'luck', name: 'Luck', blurb: 'Clovers, horseshoes and lucky dice for good days.' },
    { id: 'ritual', name: 'Ritual', blurb: 'Crystals, bells and suns for slow mornings.' },
    { id: 'story', name: 'Story', blurb: 'Little characters with a little story each.' },
  ];

  const LIST = [
    /* ---------------- Protection ---------------- */
    { id: 'nazar', name: 'Nazar', col: 'protection', size: 86, mass: 5, svg: svg(['gold', 'shine'],
      `${ring(18)}<circle cx="50" cy="56" r="37" fill="url(#gold)"/><circle cx="50" cy="56" r="33" fill="#1747b8"/>
       <circle cx="50" cy="56" r="23" fill="#f7fbff"/><circle cx="50" cy="56" r="15" fill="#5cc3f2"/><circle cx="50" cy="56" r="7.5" fill="#0b1026"/>
       <ellipse cx="40" cy="38" rx="14" ry="7" fill="url(#shine)" transform="rotate(-25 40 38)"/>`) },
    { id: 'hamsa', name: 'Hamsa', col: 'protection', size: 92, mass: 6, svg: svg(['gold', 'shine'],
      `${ring(18)}<g fill="url(#gold)" stroke="#8a5a10" stroke-width="1.2">
        <rect x="20" y="40" width="11" height="30" rx="5.5" transform="rotate(-12 25 55)"/>
        <rect x="69" y="40" width="11" height="30" rx="5.5" transform="rotate(12 75 55)"/>
        <rect x="32" y="24" width="11" height="40" rx="5.5"/><rect x="44.5" y="18" width="11" height="44" rx="5.5"/><rect x="57" y="24" width="11" height="40" rx="5.5"/>
        <path d="M24 56h52v12c0 14-12 26-26 28-14-2-26-14-26-28z"/></g>
       <path d="M36 70q14-12 28 0q-14 12-28 0z" fill="#fff"/><circle cx="50" cy="70" r="5.2" fill="#2f6fe4"/><circle cx="50" cy="70" r="2.3" fill="#0b1026"/>`) },
    { id: 'crescent', name: 'Crescent', col: 'protection', size: 80, mass: 4, svg: svg(['silver'],
      `${ring(20, 'silver')}<path d="M60 22A34 34 0 1 0 60 92A27 27 0 1 1 60 22Z" fill="url(#silver)" stroke="#6d7580" stroke-width="1.2"/>
       ${star(70, 50, 8, 3.4, '#ffd966', 'stroke="#b8860b" stroke-width=".8"')}${star(78, 72, 4.5, 1.9, '#ffd966')}`) },
    { id: 'key', name: 'Old Key', col: 'protection', size: 96, mass: 6, svg: svg(['gold'],
      `${ring(14)}<path fill-rule="evenodd" d="M50 14a15 15 0 1 1 0 30a15 15 0 1 1 0-30zm0 7a8 8 0 1 0 0 16a8 8 0 1 0 0-16z" fill="url(#gold)" stroke="#8a5a10" stroke-width="1"/>
       <rect x="45.5" y="42" width="9" height="52" rx="3" fill="url(#gold)" stroke="#8a5a10" stroke-width="1"/>
       <path d="M54 76h11v6H54zM54 86h8v6h-8z" fill="url(#gold)" stroke="#8a5a10" stroke-width="1"/>`) },
    { id: 'padlock', name: 'Padlock', col: 'protection', size: 78, mass: 6, svg: svg(['gold', 'silver'],
      `${ring(18, 'silver')}<path d="M35 50V38a15 15 0 0 1 30 0v12" fill="none" stroke="url(#silver)" stroke-width="7"/>
       <rect x="24" y="46" width="52" height="46" rx="9" fill="url(#gold)" stroke="#8a5a10" stroke-width="1.2"/>
       <circle cx="50" cy="64" r="6" fill="#3b2a0a"/><path d="M47.5 66h5l2 13h-9z" fill="#3b2a0a"/>`) },
    { id: 'bolt', name: 'Bolt', col: 'protection', size: 84, mass: 3, svg: svg(['gold'],
      `${ring(16)}<path d="M58 16L26 58h20l-8 36 36-46H52z" fill="#ffd23f" stroke="#c98a00" stroke-width="2.5" stroke-linejoin="round"/>
       <path d="M56 20L32 54h10" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>`) },
    { id: 'shield', name: 'Shield', col: 'protection', size: 80, mass: 6, svg: svg(['silver', 'gold'],
      `${ring(18, 'silver')}<path d="M50 18l32 10v22c0 22-14 36-32 44C32 86 18 72 18 50V28z" fill="url(#silver)" stroke="#5f6772" stroke-width="1.5"/>
       <path d="M50 26l24 8v16c0 17-10 28-24 34z" fill="#c2413b"/><path d="M50 26L26 34v16c0 17 10 28 24 34z" fill="#1f4e9c"/>
       ${star(50, 54, 11, 4.6, 'url(#gold)')}`) },

    /* ---------------- Luck ---------------- */
    { id: 'clover', name: 'Clover', col: 'luck', size: 84, mass: 3, svg: svg(['gold'],
      `${ring(22)}<path d="M52 60q10 16 4 34" fill="none" stroke="#2f8a3a" stroke-width="4" stroke-linecap="round"/>
       <g fill="#3fb24f" stroke="#1f6e2a" stroke-width="1.4">
       ${[0, 90, 180, 270].map((a) => `<path transform="rotate(${a} 50 50)" d="M50 50C38 44 28 36 30 26s14-10 20 0c6-10 18-10 20 0s-8 18-20 24z"/>`).join('')}</g>
       <circle cx="50" cy="50" r="4" fill="#1f6e2a"/>`) },
    { id: 'horseshoe', name: 'Horseshoe', col: 'luck', size: 82, mass: 7, svg: svg(['silver', 'gold'],
      `${ring(24, 'gold')}<path d="M28 92V56a22 22 0 0 1 44 0v36" fill="none" stroke="url(#silver)" stroke-width="13" stroke-linecap="round"/>
       ${[[28, 84], [28, 70], [31, 56], [72, 84], [72, 70], [69, 56], [40, 40], [60, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#4b525c"/>`).join('')}`) },
    { id: 'dice', name: 'Lucky Die', col: 'luck', size: 70, mass: 5, svg: svg(['gold'],
      `${ring(22)}<g transform="rotate(8 50 60)"><rect x="22" y="30" width="56" height="56" rx="12" fill="#fffaf0" stroke="#d8c9a8" stroke-width="2"/>
       ${[[36, 44], [64, 44], [50, 58], [36, 72], [64, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${x === 50 ? '#e0393e' : '#232323'}"/>`).join('')}</g>`) },
    { id: 'star', name: 'Wish Star', col: 'luck', size: 84, mass: 4, svg: svg(['gold', 'shine'],
      `${ring(18)}${star(50, 58, 40, 17, 'url(#gold)', 'stroke="#8a5a10" stroke-width="1.5" stroke-linejoin="round"')}
       ${star(50, 58, 22, 9.5, '#fff', 'opacity=".28"')}`) },
    { id: 'ladybug', name: 'Ladybug', col: 'luck', size: 72, mass: 3, svg: svg(['gold', 'shine'],
      `${ring(20)}<circle cx="50" cy="28" r="10" fill="#1b1b1b"/><circle cx="46" cy="25" r="2" fill="#fff"/><circle cx="54" cy="25" r="2" fill="#fff"/>
       <ellipse cx="50" cy="62" rx="30" ry="32" fill="#e53935" stroke="#1b1b1b" stroke-width="2.5"/><path d="M50 31v63" stroke="#1b1b1b" stroke-width="2.5"/>
       ${[[36, 50], [64, 50], [34, 70], [66, 70], [42, 84], [58, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#1b1b1b"/>`).join('')}
       <ellipse cx="38" cy="44" rx="8" ry="4" fill="url(#shine)" transform="rotate(-35 38 44)"/>`) },
    { id: 'lucky-cat', name: 'Lucky Cat', col: 'luck', size: 84, mass: 6, svg: svg(['gold'],
      `${ring(22)}<path d="M26 44l4-18 14 12M74 44l-4-18-14 12" fill="#fff" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round"/>
       <ellipse cx="50" cy="52" rx="28" ry="24" fill="#fff" stroke="#2b2b2b" stroke-width="2"/>
       <path d="M30 29l4 8M70 29l-4 8" stroke="#ff8fa3" stroke-width="3" stroke-linecap="round"/>
       <path d="M38 50q4-4 8 0M54 50q4-4 8 0" fill="none" stroke="#2b2b2b" stroke-width="2.4" stroke-linecap="round"/>
       <path d="M47 58h6l-3 3z" fill="#ff8fa3"/><path d="M44 63q6 4 12 0" fill="none" stroke="#2b2b2b" stroke-width="1.8" stroke-linecap="round"/>
       <path d="M24 56h8M24 61h8M68 56h8M68 61h8" stroke="#2b2b2b" stroke-width="1.4" stroke-linecap="round"/>
       <path d="M30 72q20 8 40 0" fill="none" stroke="#d62828" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="82" r="7" fill="url(#gold)" stroke="#8a5a10"/>`) },
    { id: 'coin', name: 'Lucky Coin', col: 'luck', size: 72, mass: 5, svg: svg(['gold'],
      `${ring(18)}<circle cx="50" cy="56" r="37" fill="url(#gold)" stroke="#8a5a10" stroke-width="1.5"/><circle cx="50" cy="56" r="29" fill="none" stroke="#8a5a10" stroke-width="1.5" stroke-dasharray="2 3"/>
       <rect x="41" y="47" width="18" height="18" fill="#6b4a0e" rx="2"/><rect x="44.5" y="50.5" width="11" height="11" fill="url(#gold)" rx="1"/>`) },
    { id: 'rainbow', name: 'Rainbow', col: 'luck', size: 88, mass: 3, svg: svg(['gold'],
      `${ring(28)}${['#ff5a5f', '#ff9f1c', '#ffd23f', '#3bb273', '#3a86ff', '#8338ec'].map((c, i) =>
        `<path d="M${14 + i * 5} 78a${36 - i * 5} ${36 - i * 5} 0 0 1 ${72 - i * 10} 0" fill="none" stroke="${c}" stroke-width="5.4"/>`).join('')}
       <circle cx="18" cy="80" r="11" fill="#fff"/><circle cx="28" cy="84" r="9" fill="#fff"/><circle cx="82" cy="80" r="11" fill="#fff"/><circle cx="72" cy="84" r="9" fill="#fff"/>`) },

    /* ---------------- Ritual ---------------- */
    { id: 'crystal', name: 'Crystal', col: 'ritual', size: 90, mass: 5, svg: svg(['silver', '<linearGradient id="cr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d6ff"/><stop offset=".5" stop-color="#a45cf0"/><stop offset="1" stop-color="#4b1d9e"/></linearGradient>'],
      `${ring(18, 'silver')}<path d="M50 16L70 34 64 86 50 96 36 86 30 34z" fill="url(#cr)" stroke="#3b1680" stroke-width="1.2" stroke-linejoin="round"/>
       <path d="M50 16L56 36 50 96 44 36z" fill="#fff" opacity=".28"/><path d="M30 34h40M36 86h28" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`) },
    { id: 'bell', name: 'Temple Bell', col: 'ritual', size: 80, mass: 7, svg: svg(['gold', 'shine'],
      `${ring(18)}<circle cx="50" cy="84" r="7" fill="url(#gold)" stroke="#8a5a10"/>
       <path d="M50 18c-16 0-22 14-22 30 0 14-6 22-12 28h68c-6-6-12-14-12-28 0-16-6-30-22-30z" fill="url(#gold)" stroke="#8a5a10" stroke-width="1.5"/>
       <rect x="14" y="74" width="72" height="7" rx="3.5" fill="#c99532"/><path d="M38 30q-4 10-4 24" stroke="url(#shine)" stroke-width="5" stroke-linecap="round" fill="none"/>`) },
    { id: 'feather', name: 'Feather', col: 'ritual', size: 96, mass: 2, svg: svg(['gold'],
      `${ring(14)}<path d="M50 14c20 14 24 42 8 70L46 96C28 70 30 34 50 14z" fill="#29b3a6"/>
       <path d="M50 14c-8 24-10 54-4 82" fill="none" stroke="#fef6e4" stroke-width="2" stroke-linecap="round"/>
       ${[30, 42, 54, 66].map((y) => `<path d="M${49 - (y - 14) / 16} ${y}l12 -6M${48 - (y - 14) / 16} ${y + 4}l-10 -4" stroke="#1a7f76" stroke-width="1.5" stroke-linecap="round"/>`).join('')}
       <path d="M54 40c10 10 10 24 4 38" fill="none" stroke="#e76f51" stroke-width="4" stroke-linecap="round" opacity=".8"/>`) },
    { id: 'sun', name: 'Sun', col: 'ritual', size: 84, mass: 5, svg: svg(['gold'],
      `${ring(14)}<g transform="translate(50 56)">${Array.from({ length: 12 }, (_, i) =>
        `<path d="M-5 -26L0 -38 5 -26z" fill="#ffb627" transform="rotate(${i * 30})"/>`).join('')}
       <circle r="25" fill="url(#gold)" stroke="#b7791f" stroke-width="1.5"/>
       <circle cx="-8" cy="-4" r="2.6" fill="#7a4b00"/><circle cx="8" cy="-4" r="2.6" fill="#7a4b00"/>
       <path d="M-9 7q9 8 18 0" fill="none" stroke="#7a4b00" stroke-width="2.4" stroke-linecap="round"/></g>`) },
    { id: 'hourglass', name: 'Hourglass', col: 'ritual', size: 86, mass: 6, svg: svg(['gold'],
      `${ring(16)}<rect x="26" y="16" width="48" height="8" rx="3" fill="url(#gold)"/><rect x="26" y="88" width="48" height="8" rx="3" fill="url(#gold)"/>
       <path d="M32 24h36c0 20-14 24-14 32s14 12 14 32H32c0-20 14-24 14-32s-14-12-14-32z" fill="#e8f4ff" fill-opacity=".85" stroke="#9fb6cc" stroke-width="1.5"/>
       <path d="M38 34h24c-2 8-10 12-12 16-2-4-10-8-12-16zM36 86c2-10 12-12 14-14 2 2 12 4 14 14z" fill="#e9c46a"/><path d="M50 50v24" stroke="#e9c46a" stroke-width="1.5"/>`) },
    { id: 'lotus', name: 'Lotus', col: 'ritual', size: 86, mass: 3, svg: svg(['gold'],
      `${ring(28)}<g stroke="#b83b6b" stroke-width="1.2">
       <path d="M50 30c10 12 10 34 0 50-10-16-10-38 0-50z" fill="#ff9ec4"/>
       <path d="M50 80C38 76 26 62 26 44c12 4 22 18 24 36z" fill="#ff7eb0"/><path d="M50 80c12-4 24-18 24-36-12 4-22 18-24 36z" fill="#ff7eb0"/>
       <path d="M50 82C36 84 20 76 14 62c14-2 28 6 36 20z" fill="#f45b95"/><path d="M50 82c14 2 30-6 36-20-14-2-28 6-36 20z" fill="#f45b95"/></g>
       <ellipse cx="50" cy="86" rx="24" ry="4" fill="#3bb273"/>`) },
    { id: 'tarot', name: 'Tarot Star', col: 'ritual', size: 90, mass: 3, svg: svg(['gold'],
      `${ring(14)}<rect x="24" y="14" width="52" height="82" rx="6" fill="#1d1b4f" stroke="url(#gold)" stroke-width="3"/>
       <rect x="30" y="20" width="40" height="70" rx="3" fill="none" stroke="#e9c46a" stroke-width="1"/>
       ${star(50, 48, 14, 6, '#ffd166')}${star(38, 30, 3, 1.3, '#fff')}${star(62, 72, 3.5, 1.5, '#fff')}${star(62, 30, 2.4, 1, '#fff')}
       <path d="M36 78q14-10 28 0" fill="none" stroke="#e9c46a" stroke-width="1.5"/>`) },

    /* ---------------- Story ---------------- */
    { id: 'heart', name: 'Locket Heart', col: 'story', size: 80, mass: 5, svg: svg(['gold', 'shine'],
      `${ring(24)}<path d="M50 92C26 76 14 62 14 46c0-12 9-21 20-21 7 0 12 4 16 9 4-5 9-9 16-9 11 0 20 9 20 21 0 16-12 30-36 46z" fill="url(#gold)" stroke="#8a5a10" stroke-width="1.5"/>
       <path d="M50 84C32 72 22 61 22 47c0-8 6-14 13-14 6 0 11 4 15 11 4-7 9-11 15-11 7 0 13 6 13 14 0 14-10 25-28 37z" fill="#e63950"/>
       <ellipse cx="34" cy="44" rx="7" ry="4" fill="url(#shine)" transform="rotate(-40 34 44)"/>`) },
    { id: 'cherry', name: 'Cherries', col: 'story', size: 84, mass: 3, svg: svg(['gold', 'shine'],
      `${ring(16)}<path d="M50 16c-4 20-16 36-22 50M50 16c2 20 10 36 22 48" fill="none" stroke="#3e7d2c" stroke-width="3.4" stroke-linecap="round"/>
       <path d="M50 18c10-6 22-4 28 4-10 4-20 4-28-4z" fill="#58b346"/>
       <circle cx="28" cy="76" r="16" fill="#d7263d"/><circle cx="72" cy="74" r="16" fill="#c21d33"/>
       <ellipse cx="22" cy="70" rx="5" ry="3" fill="url(#shine)" transform="rotate(-40 22 70)"/><ellipse cx="66" cy="68" rx="5" ry="3" fill="url(#shine)" transform="rotate(-40 66 68)"/>`) },
    { id: 'mushroom', name: 'Mushroom', col: 'story', size: 80, mass: 4, svg: svg(['gold'],
      `${ring(20)}<path d="M40 56h20l4 34c-8 4-20 4-28 0z" fill="#fff4e0" stroke="#c9a77c" stroke-width="1.5"/>
       <path d="M12 60C12 36 30 20 50 20s38 16 38 40c-8 4-68 4-76 0z" fill="#e63946" stroke="#9d1c28" stroke-width="1.5"/>
       ${[[30, 42, 6], [50, 32, 5], [70, 44, 6.5], [44, 50, 3.6], [60, 52, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('')}`) },
    { id: 'ghost', name: 'Little Ghost', col: 'story', size: 80, mass: 2, svg: svg(['silver'],
      `${ring(20, 'silver')}<path d="M22 58c0-22 12-38 28-38s28 16 28 38v34l-7-6-7 6-7-6-7 6-7-6-7 6-7-6-7 6z" fill="#fbfbff" stroke="#b7bccc" stroke-width="1.8" stroke-linejoin="round"/>
       <ellipse cx="41" cy="52" rx="4.5" ry="6" fill="#2b2d42"/><ellipse cx="59" cy="52" rx="4.5" ry="6" fill="#2b2d42"/>
       <ellipse cx="36" cy="62" rx="4" ry="2.4" fill="#ffb3c6"/><ellipse cx="64" cy="62" rx="4" ry="2.4" fill="#ffb3c6"/>
       <path d="M46 64q4 4 8 0" fill="none" stroke="#2b2d42" stroke-width="2" stroke-linecap="round"/>`) },
    { id: 'planet', name: 'Planet', col: 'story', size: 88, mass: 5, svg: svg(['gold', '<linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6a5"/><stop offset=".6" stop-color="#f28f3b"/><stop offset="1" stop-color="#b5541c"/></linearGradient>'],
      `${ring(28)}<ellipse cx="50" cy="60" rx="44" ry="11" fill="none" stroke="#caa6ff" stroke-width="4" transform="rotate(-14 50 60)"/>
       <circle cx="50" cy="60" r="26" fill="url(#pl)"/><path d="M28 54q22 6 44-2M26 64q24 6 48-2" stroke="#b5541c" stroke-opacity=".45" stroke-width="3" fill="none"/>
       <path d="M7.3 70.6A44 11 -14 0 0 92.7 49.4" fill="none" stroke="#caa6ff" stroke-width="4"/>`) },
    { id: 'rocket', name: 'Rocket', col: 'story', size: 96, mass: 5, svg: svg(['silver'],
      `${ring(16, 'silver')}<path d="M36 70l-12 14 2-20 10-8zM64 70l12 14-2-20-10-8z" fill="#e63946"/>
       <path d="M50 16c14 12 18 32 14 58H36c-4-26 0-46 14-58z" fill="url(#silver)" stroke="#6d7580" stroke-width="1.5"/>
       <circle cx="50" cy="44" r="8" fill="#48cae4" stroke="#6d7580" stroke-width="2.5"/><path d="M50 16c6 5 10 10 12 16H38c2-6 6-11 12-16z" fill="#e63946"/>
       <path d="M42 76c2 10 6 16 8 20 2-4 6-10 8-20z" fill="#ffb703"/><path d="M46 76c1 6 3 10 4 12 1-2 3-6 4-12z" fill="#fff3b0"/>`) },
    { id: 'strawberry', name: 'Strawberry', col: 'story', size: 76, mass: 3, svg: svg(['gold', 'shine'],
      `${ring(20)}<path d="M50 94C28 80 18 60 22 44c3-10 14-14 28-14s25 4 28 14c4 16-6 36-28 50z" fill="#e5383b"/>
       ${[[36, 48], [50, 46], [64, 48], [30, 60], [44, 60], [58, 60], [70, 60], [38, 72], [52, 72], [64, 72], [46, 84], [56, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#ffe066"/>`).join('')}
       <path d="M50 22l6 10 12-4-8 10 10 6H38l10-6-8-10 12 4z" fill="#2d9d3a" stroke="#1d6b26" stroke-width="1" stroke-linejoin="round"/>
       <ellipse cx="32" cy="52" rx="5" ry="3" fill="url(#shine)" transform="rotate(-50 32 52)"/>`) },
    { id: 'cloud', name: 'Rain Cloud', col: 'story', size: 84, mass: 2, svg: svg(['silver'],
      `${ring(28, 'silver')}<path d="M26 66a14 14 0 0 1 2-28 18 18 0 0 1 34-6 14 14 0 0 1 14 18 10 10 0 0 1-2 16z" fill="#fff" stroke="#b9c4d4" stroke-width="2"/>
       ${[[34, 76], [50, 80], [66, 76]].map(([x, y]) => `<path d="M${x} ${y}q-4 7 0 10q4-3 0-10z" fill="#4cc9f0"/>`).join('')}
       <circle cx="42" cy="52" r="2.3" fill="#2b2d42"/><circle cx="58" cy="52" r="2.3" fill="#2b2d42"/><path d="M46 58q4 3 8 0" fill="none" stroke="#2b2d42" stroke-width="1.8" stroke-linecap="round"/>`) },
    { id: 'notes', name: 'Melody', col: 'story', size: 80, mass: 3, svg: svg(['gold'],
      `${ring(18)}<path d="M36 26L72 18v52" fill="none" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/><path d="M36 26v56" stroke="url(#gold)" stroke-width="6"/>
       <ellipse cx="28" cy="84" rx="11" ry="8" fill="url(#gold)" transform="rotate(-20 28 84)"/><ellipse cx="64" cy="74" rx="11" ry="8" fill="url(#gold)" transform="rotate(-20 64 74)"/>
       <path d="M36 32l36-8" stroke="#8a5a10" stroke-width="1.2"/>`) },
    { id: 'cactus', name: 'Cactus', col: 'story', size: 88, mass: 5, svg: svg(['gold'],
      `${ring(18)}<rect x="40" y="18" width="20" height="60" rx="10" fill="#52b788" stroke="#2d6a4f" stroke-width="1.5"/>
       <path d="M40 54H30a8 8 0 0 1-8-8V36" fill="none" stroke="#52b788" stroke-width="9" stroke-linecap="round"/>
       <path d="M60 46h8a8 8 0 0 0 8-8v-6" fill="none" stroke="#52b788" stroke-width="9" stroke-linecap="round"/>
       <path d="M30 70h40l-5 24H35z" fill="#e07a5f" stroke="#a44a3f" stroke-width="1.5"/><rect x="27" y="68" width="46" height="8" rx="2" fill="#f2a07b"/>
       <circle cx="50" cy="16" r="5" fill="#ff5d8f"/>`) },
  ];

  const byId = Object.fromEntries(LIST.map((c) => [c.id, c]));
  for (const c of LIST) c.url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(c.svg);

  // Image cache so the physics renderer can draw charms on canvas.
  const cache = new Map();
  function image(charm) {
    if (!charm) return null;
    let img = cache.get(charm.url);
    if (!img) {
      img = new Image();
      img.decoding = 'async';
      img.src = charm.url;
      cache.set(charm.url, img);
    }
    return img;
  }

  // Turn a user image (File/Blob) into a charm: fit it into a round or free frame with a jump ring.
  function fromFile(file, { frame = 'round', name } = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.onload = () => {
          const S = 256;
          const cv = document.createElement('canvas');
          cv.width = cv.height = S;
          const c = cv.getContext('2d');
          const k = S / 100;
          // ring + bail
          const metal = c.createLinearGradient(40 * k, 0, 60 * k, 16 * k);
          metal.addColorStop(0, '#fff4c7');
          metal.addColorStop(0.5, '#e8b646');
          metal.addColorStop(1, '#9c6a14');
          c.strokeStyle = metal;
          c.lineWidth = 2.6 * k;
          c.beginPath(); c.arc(50 * k, 7 * k, 4.6 * k, 0, Math.PI * 2); c.stroke();
          c.lineWidth = 3 * k;
          c.beginPath(); c.moveTo(50 * k, 11 * k); c.lineTo(50 * k, 18 * k); c.stroke();
          if (frame === 'round') {
            const cx = 50 * k, cy = 57 * k, r = 38 * k;
            c.save();
            c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
            const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
            c.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
            c.restore();
            c.lineWidth = 4 * k;
            c.strokeStyle = metal;
            c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
          } else {
            const box = 78 * k, top = 18 * k;
            const s = Math.min(box / img.width, box / img.height);
            c.drawImage(img, 50 * k - (img.width * s) / 2, top, img.width * s, img.height * s);
          }
          const id = 'custom-' + Date.now().toString(36);
          resolve({ id, name: name || (file.name || 'My charm').replace(/\.[^.]+$/, '').slice(0, 24), col: 'mine', size: 86, mass: 4, custom: true, url: cv.toDataURL('image/png') });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  global.PenduCharms = { COLLECTIONS, LIST, byId, image, fromFile };
})(typeof window !== 'undefined' ? window : globalThis);
