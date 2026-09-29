/* Pendu 3D: draws a Verlet cord with WebGL (three.js) so it looks like the real thing.
   Metal chains and pearls reflect a studio light, cords have twisted strands, and every charm
   is a thick, bevelled piece that slowly turns on its ring and casts a soft shadow on the page.

   Physics and input stay in rope.js. This file only replaces how a Stage draws its cord:
   one shared, offscreen WebGL renderer draws the region around the cord, and the result is
   copied into the Stage's own 2D canvas. If WebGL is missing (or the context is lost) the
   original Canvas 2D drawing is used instead. Website only; the desktop app does not load it. */
(function (global) {
  const THREE = global.THREE;
  const PR = global.PenduRope;
  if (!THREE || !PR) return;

  const TAU = Math.PI * 2;
  const LIGHT_DIR = new THREE.Vector3(-0.42, 0.62, 1).normalize(); // key light: upper left, in front
  const SHADOW_DEPTH = 16; // px between the cord and the "page" that catches its shadow
  const MAX_RING = 180; // tube rings per rope
  const MAX_INST = 140; // beads / pearls / chain links per rope
  const TEX = 512; // charm texture size

  /* ================= shared renderer + studio lighting ================= */
  let renderer = null;
  let envMap = null;
  let failed = false;
  const views = new Set();

  function init() {
    if (renderer) return true;
    if (failed) return false;
    try {
      const canvas = document.createElement('canvas');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      failed = true;
      return false;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(512, 512, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      failed = true;
      views.forEach((v) => v.fallback());
    });
    envMap = studio();
    return true;
  }

  // A small photo studio (softboxes in a warm room), baked into a prefiltered environment map.
  // Metal and pearls get their look from reflecting it.
  function studio() {
    const scene = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(24, 16, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9a8b7a), side: THREE.BackSide }));
    room.position.y = 2;
    scene.add(room);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2e261f) }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.9;
    scene.add(floor);
    const panel = (power, w, h, pos, tint = 0xffffff) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      scene.add(m);
    };
    panel(7, 9, 6, [-4, 4, 9]); // key softbox, front left
    panel(3.2, 14, 3, [3, -2.5, 9.5], 0xfff1dc); // low front fill, so flat faces never go black
    panel(6, 12, 9, [0, 9.8, 0]); // ceiling
    panel(9, 2.2, 10, [9, 1.5, -5]); // strip light, back right (rims)
    panel(4, 2, 8, [-10, 0, -3], 0xffd9a8); // warm strip, back left
    panel(3, 8, 10, [-11.5, 1, 4]); // side softboxes, so a turned face still catches light
    panel(2.4, 8, 10, [11.5, 1, 4], 0xfff3e2);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(scene, 0.035).texture;
    pmrem.dispose();
    scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    return tex;
  }

  /* ================= materials ================= */
  const mats = {};
  function mat(key, make) { return mats[key] || (mats[key] = make()); }
  const color = (c) => new THREE.Color(c);

  function ropeMaterial(R) {
    switch (R.id) {
      case 'thread': return mat('thread', () => new THREE.MeshStandardMaterial({ color: color(R.color), roughness: 0.85 }));
      case 'cotton': return mat('cotton', () => new THREE.MeshPhysicalMaterial({ color: color(R.color), roughness: 0.92, sheen: 0.6, sheenColor: color('#ffffff'), sheenRoughness: 0.8 }));
      case 'leather': return mat('leather', () => new THREE.MeshPhysicalMaterial({ color: color(R.color), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 }));
      case 'ribbon': return mat('ribbon', () => new THREE.MeshPhysicalMaterial({ color: color(R.color), roughness: 0.38, sheen: 1, sheenColor: color('#ffc4cf'), sheenRoughness: 0.35, side: THREE.DoubleSide }));
      case 'gold': return mat('gold', () => new THREE.MeshStandardMaterial({ color: color('#f2c25a'), metalness: 1, roughness: 0.24 }));
      case 'silver': return mat('silver', () => new THREE.MeshStandardMaterial({ color: color('#e4e8ee'), metalness: 1, roughness: 0.22 }));
      case 'pearl': return mat('pearl', () => new THREE.MeshPhysicalMaterial({ color: color('#f6efe2'), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.75, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 420], sheen: 0.4, sheenColor: color('#ffe9f0') }));
      case 'beads': return mat('beads', () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 }));
      case 'neon': return mat('neon', () => new THREE.MeshBasicMaterial({ color: color('#effeff'), toneMapped: false }));
      default: return mat('rope:' + R.id, () => new THREE.MeshStandardMaterial({ color: color(R.color || '#444'), roughness: 0.7 }));
    }
  }
  const stringMat = () => mat('string', () => new THREE.MeshStandardMaterial({ color: color('#3a3029'), roughness: 0.8 }));
  const pinMat = () => mat('pin', () => new THREE.MeshStandardMaterial({ color: color('#e8b84e'), metalness: 1, roughness: 0.2 }));
  const glowMat = (c) => mat('glow:' + c, () => new THREE.ShaderMaterial({
    uniforms: { glow: { value: color(c) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 glow; varying vec3 vN; void main(){ float f = pow(clamp(vN.z, 0.0, 1.0), 2.2); gl_FragColor = vec4(glow, f * 0.55); }',
    transparent: true, depthWrite: false,
  }));

  const geoms = {};
  const geom = (key, make) => geoms[key] || (geoms[key] = make());

  /* ================= charm textures: colour, alpha, relief, metal ================= */
  const charmCache = new Map();

  function boxBlur(src, S, r) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    const w = 2 * r + 1;
    for (let y = 0; y < S; y++) {
      const row = y * S;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(S - 1, Math.max(0, x))];
      for (let x = 0; x < S; x++) {
        tmp[row + x] = acc / w;
        acc += src[row + Math.min(S - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < S; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(S - 1, Math.max(0, y)) * S + x];
      for (let y = 0; y < S; y++) {
        out[y * S + x] = acc / w;
        acc += tmp[Math.min(S - 1, y + r + 1) * S + x] - tmp[Math.max(0, y - r) * S + x];
      }
    }
    return out;
  }
  const blur2 = (a, S, r) => boxBlur(boxBlur(a, S, r), S, r);

  function toTexture(imageData, srgb) {
    const cv = document.createElement('canvas');
    cv.width = imageData.width;
    cv.height = imageData.height;
    cv.getContext('2d').putImageData(imageData, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  }

  // Everything the renderer needs to turn a flat charm drawing into a thick, bevelled piece.
  function charmLook(charm, img) {
    let look = charmCache.get(charm.url);
    if (look) return look;
    const S = TEX, N = S * S;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0, S, S);
    const src = c.getImageData(0, 0, S, S);
    const d = src.data;
    const A = new Float32Array(N), L = new Float32Array(N);
    const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
    const colorOut = c.createImageData(S, S), alphaOut = c.createImageData(S, S);
    const relief = c.createImageData(S, S), mr = c.createImageData(S, S);
    for (let i = 0; i < N; i++) {
      const a = d[i * 4 + 3] / 255;
      const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
      A[i] = a;
      R[i] = r * a; G[i] = g * a; B[i] = b * a;
      L[i] = (0.3 * r + 0.59 * g + 0.11 * b) * a;
      // Guess the material from the colour: golds, rose golds and mid greys are metal, the rest is glossy enamel.
      const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max ? (max - min) / max : 0;
      let hue = 0;
      if (max > min) {
        if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
        else if (max === g) hue = (b - r) / (max - min) + 2;
        else hue = (r - g) / (max - min) + 4;
        hue *= 60;
      }
      const goldish = hue > 15 && hue < 58 && sat > 0.2 && sat < 0.92 && max > 0.33;
      const greyish = sat < 0.12 && max > 0.4 && max < 0.93;
      const metal = !charm.custom && (goldish || greyish);
      mr.data[i * 4 + 1] = metal ? 70 : 105; // roughness (G)
      mr.data[i * 4 + 2] = metal ? 255 : 0; // metalness (B)
      mr.data[i * 4 + 3] = 255;
      alphaOut.data[i * 4] = alphaOut.data[i * 4 + 1] = alphaOut.data[i * 4 + 2] = d[i * 4 + 3];
      alphaOut.data[i * 4 + 3] = 255;
    }
    // Bleed edge colours outwards so filtering never pulls black into the silhouette.
    const bA = blur2(A, S, 6), bR = blur2(R, S, 6), bG = blur2(G, S, 6), bB = blur2(B, S, 6);
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (A[i] > 0.6) {
        colorOut.data[o] = d[o]; colorOut.data[o + 1] = d[o + 1]; colorOut.data[o + 2] = d[o + 2];
      } else if (bA[i] > 0.001) {
        colorOut.data[o] = (bR[i] / bA[i]) * 255; colorOut.data[o + 1] = (bG[i] / bA[i]) * 255; colorOut.data[o + 2] = (bB[i] / bA[i]) * 255;
      } else {
        colorOut.data[o] = colorOut.data[o + 1] = colorOut.data[o + 2] = 128;
      }
      colorOut.data[o + 3] = 255;
    }
    // Height = a rounded bevel at the silhouette plus a little relief between colours; normals from its slope.
    const bevel = blur2(A, S, 5), detail = blur2(L, S, 1);
    const H = new Float32Array(N);
    for (let i = 0; i < N; i++) H[i] = bevel[i] + detail[i] * 0.3;
    const k = 4.2;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        const dx = H[y * S + Math.min(S - 1, x + 1)] - H[y * S + Math.max(0, x - 1)];
        const dy = H[Math.min(S - 1, y + 1) * S + x] - H[Math.max(0, y - 1) * S + x];
        let nx = -dx * k, ny = dy * k, nz = 1;
        const len = Math.hypot(nx, ny, nz);
        nx /= len; ny /= len; nz /= len;
        relief.data[i * 4] = (nx * 0.5 + 0.5) * 255;
        relief.data[i * 4 + 1] = (ny * 0.5 + 0.5) * 255;
        relief.data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255;
        relief.data[i * 4 + 3] = 255;
      }
    }
    const map = toTexture(colorOut, true), alphaMap = toTexture(alphaOut, false);
    const normalMap = toTexture(relief, false), mrMap = toTexture(mr, false);
    const face = new THREE.MeshPhysicalMaterial({
      map, alphaMap, normalMap, roughnessMap: mrMap, metalnessMap: mrMap,
      metalness: 1, roughness: 1, alphaTest: 0.5, alphaToCoverage: true,
      clearcoat: 0.55, clearcoatRoughness: 0.1, normalScale: new THREE.Vector2(1, 1),
    });
    const edge = new THREE.MeshStandardMaterial({
      map, alphaMap, roughnessMap: mrMap, metalnessMap: mrMap, metalness: 1, roughness: 1,
      alphaTest: 0.5, color: color('#9a9189'), side: THREE.DoubleSide,
    });
    look = { face, edge };
    charmCache.set(charm.url, look);
    return look;
  }

  /* ================= a charm: front, back and stacked edge layers ================= */
  const LAYERS = 8; // edge layers between the faces
  const tmpM = new THREE.Matrix4();

  function buildCharm(ch) {
    const look = charmLook(ch.charm, ch.img);
    const size = ch.size;
    const thick = Math.max(3.5, size * 0.07);
    const outer = new THREE.Group();
    const spin = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = -0.47 * size;
    body.scale.set(size, size, 1);
    const plane = geom('plane', () => new THREE.PlaneGeometry(1, 1));
    const front = new THREE.Mesh(plane, look.face);
    front.position.z = thick / 2;
    const back = new THREE.Mesh(plane, look.face);
    back.position.z = -thick / 2;
    back.rotation.y = Math.PI;
    const edges = new THREE.InstancedMesh(plane, look.edge, LAYERS);
    for (let i = 0; i < LAYERS; i++) {
      tmpM.makeTranslation(0, 0, -thick / 2 + (thick * (i + 1)) / (LAYERS + 1));
      edges.setMatrixAt(i, tmpM);
    }
    front.castShadow = true;
    [front, back, edges].forEach((m) => { m.frustumCulled = false; body.add(m); });
    spin.add(body);
    outer.add(spin);
    return { outer, spin };
  }

  /* ================= a rope: a tube swept along the cord, plus beads / links ================= */
  function tube() {
    const RS = 12;
    const pos = new Float32Array(MAX_RING * (RS + 1) * 3);
    const nor = new Float32Array(pos.length);
    const uv = new Float32Array(MAX_RING * (RS + 1) * 2);
    const idx = [];
    for (let i = 0; i < MAX_RING - 1; i++) {
      for (let j = 0; j < RS; j++) {
        const a = i * (RS + 1) + j, b = a + RS + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    return { g, RS, pos, nor, uv };
  }

  // Sweep a cross-section along the curve. shape(s, phi) -> [rx, rz, twist, strands]
  function sweep(t, curve, shape) {
    const { RS, pos, nor, uv } = t;
    const n = Math.min(curve.n, MAX_RING);
    for (let i = 0; i < n; i++) {
      const x = curve.x[i], y = curve.y[i], s = curve.s[i];
      const tx = curve.tx[i], ty = curve.ty[i];
      const nx = -ty, ny = tx; // in-plane normal; the binormal is +z (towards the viewer)
      const [rx, rz, tw, strands, depth] = shape(s);
      const ct = Math.cos(tw), st = Math.sin(tw);
      for (let j = 0; j <= RS; j++) {
        const phi = (j / RS) * TAU;
        const cp = Math.cos(phi), sp = Math.sin(phi);
        let r = 1, dr = 0;
        if (strands) {
          const w = strands * (phi + s * 0.55);
          r = 1 - depth + depth * Math.abs(Math.cos(w / 2));
          dr = -depth * 0.5 * strands * Math.sign(Math.cos(w / 2)) * Math.sin(w / 2);
        }
        // cross-section point (in the rope's own frame), then twisted about the tangent
        const a = cp * rx * r, b = sp * rz * r;
        const u = a * ct - b * st, v = a * st + b * ct;
        // normal of the cross-section (ellipse, with strand grooves)
        let ea = cp * rz, eb = sp * rx;
        if (strands) { ea -= (dr / r) * -sp * rz; eb -= (dr / r) * cp * rx; }
        const el = Math.hypot(ea, eb) || 1;
        ea /= el; eb /= el;
        const nu = ea * ct - eb * st, nv = ea * st + eb * ct;
        const k = (i * (RS + 1) + j) * 3;
        pos[k] = x + nx * u; pos[k + 1] = y + ny * u; pos[k + 2] = v;
        nor[k] = nx * nu; nor[k + 1] = ny * nu; nor[k + 2] = nv;
        const q = (i * (RS + 1) + j) * 2;
        uv[q] = s / 20; uv[q + 1] = j / RS;
      }
    }
    t.g.setDrawRange(0, Math.max(0, n - 1) * RS * 6);
    t.g.attributes.position.needsUpdate = true;
    t.g.attributes.normal.needsUpdate = true;
    t.g.attributes.uv.needsUpdate = true;
  }

  class RopeMesh {
    constructor(R) {
      this.R = R;
      this.group = new THREE.Group();
      this.tubes = [];
      const add = (material, shape, shadow = true) => {
        const t = tube();
        const m = new THREE.Mesh(t.g, material);
        m.frustumCulled = false;
        m.castShadow = shadow;
        this.group.add(m);
        this.tubes.push({ t, shape });
        return m;
      };
      const w = R.width;
      switch (R.style) {
        case 'twist': add(ropeMaterial(R), () => [w * 0.62, w * 0.62, 0, 3, 0.22]); break;
        case 'ribbon': add(ropeMaterial(R), (s) => [w * 0.55, 0.55, 0.85 * Math.sin(s * 0.021 + this.phase), 0, 0]); break;
        case 'neon': {
          add(ropeMaterial(R), () => [w * 0.42, w * 0.42, 0, 0, 0]);
          add(mat('neon-tube', () => new THREE.MeshBasicMaterial({ color: color(R.color), toneMapped: false, transparent: true, opacity: 0.55, depthWrite: false })), () => [w * 0.7, w * 0.7, 0, 0, 0], false);
          const glow = add(glowMat(R.color), () => [7.5, 7.5, 0, 0, 0], false);
          glow.renderOrder = -1;
          break;
        }
        case 'beads': case 'pearls':
          add(stringMat(), () => [0.6, 0.6, 0, 0, 0]);
          this.inst = new THREE.InstancedMesh(geom('bead', () => new THREE.SphereGeometry(1, 24, 16)), ropeMaterial(R), MAX_INST);
          break;
        case 'chain':
          this.inst = new THREE.InstancedMesh(geom('link', () => new THREE.TorusGeometry(2.3, 0.78, 10, 22)), ropeMaterial(R), MAX_INST);
          break;
        default: add(ropeMaterial(R), () => [Math.max(0.7, w * 0.55), Math.max(0.7, w * 0.55), 0, 0, 0]);
      }
      if (this.inst) {
        this.inst.frustumCulled = false;
        this.inst.castShadow = true;
        this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (R.style === 'beads') {
          for (let i = 0; i < MAX_INST; i++) this.inst.setColorAt(i, color(R.beads[i % R.beads.length]));
        }
        this.group.add(this.inst);
      }
      this.phase = Math.random() * TAU;
    }

    update(curve, time) {
      this.phase = time * 0.0009;
      for (const { t, shape } of this.tubes) sweep(t, curve, shape);
      if (!this.inst) return;
      const R = this.R;
      const chain = R.style === 'chain';
      const spacing = chain ? 5.9 : R.style === 'pearls' ? 8.4 : 10.5;
      const radius = R.style === 'pearls' ? 4.25 : 4;
      const pts = even(curve, spacing, chain ? 0 : spacing);
      const n = Math.min(pts.length, MAX_INST);
      const m = tmpM, e = m.elements;
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        if (chain) {
          // Links alternate between facing the viewer and standing edge-on, like a real cable chain.
          const tx = p.tx, ty = p.ty, nx = -ty, ny = tx, sx = 1.45;
          const flat = i % 2 === 0;
          const ax = flat ? nx : 0, ay = flat ? ny : 0, az = flat ? 0 : 1;
          const bx = flat ? 0 : -nx, by = flat ? 0 : -ny, bz = flat ? 1 : 0;
          e[0] = tx * sx; e[1] = ty * sx; e[2] = 0; e[3] = 0;
          e[4] = ax; e[5] = ay; e[6] = az; e[7] = 0;
          e[8] = bx; e[9] = by; e[10] = bz; e[11] = 0;
          e[12] = p.x; e[13] = p.y; e[14] = 0; e[15] = 1;
        } else {
          m.makeScale(radius, radius, radius);
          m.setPosition(p.x, p.y, 0);
        }
        this.inst.setMatrixAt(i, m);
      }
      this.inst.count = n;
      this.inst.instanceMatrix.needsUpdate = true;
    }

    dispose() {
      this.tubes.forEach(({ t }) => t.g.dispose());
      if (this.inst) this.inst.dispose();
    }
  }

  /* ================= curve helpers (world units = CSS px, y up) ================= */
  function makeCurve() {
    const n = MAX_RING;
    return { n: 0, x: new Float32Array(n), y: new Float32Array(n), s: new Float32Array(n), tx: new Float32Array(n), ty: new Float32Array(n) };
  }

  // Smooth Catmull-Rom through the rope points, sampled into the curve buffers.
  function fillCurve(curve, pts, count) {
    const segs = count - 1;
    const sub = Math.max(1, Math.min(6, Math.floor((MAX_RING - 1) / Math.max(1, segs))));
    let n = 0;
    const P = (i) => pts[Math.max(0, Math.min(segs, i))];
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let k = 0; k < sub; k++) {
        const t = k / sub, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        curve.x[n] = x; curve.y[n] = -y; n++;
      }
    }
    const last = pts[segs];
    curve.x[n] = last.x; curve.y[n] = -last.y; n++;
    curve.n = n;
    let s = 0;
    for (let i = 0; i < n; i++) {
      if (i) s += Math.hypot(curve.x[i] - curve.x[i - 1], curve.y[i] - curve.y[i - 1]);
      curve.s[i] = s;
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let tx = curve.x[b] - curve.x[a], ty = curve.y[b] - curve.y[a];
      const l = Math.hypot(tx, ty) || 1;
      curve.tx[i] = tx / l; curve.ty[i] = ty / l;
    }
    return curve;
  }

  // Evenly spaced points along the curve.
  function even(curve, spacing, start) {
    const out = [];
    let target = start;
    for (let i = 1; i < curve.n; i++) {
      const s0 = curve.s[i - 1], s1 = curve.s[i];
      while (target <= s1) {
        const f = s1 > s0 ? (target - s0) / (s1 - s0) : 0;
        out.push({ x: curve.x[i - 1] + (curve.x[i] - curve.x[i - 1]) * f, y: curve.y[i - 1] + (curve.y[i] - curve.y[i - 1]) * f, tx: curve.tx[i], ty: curve.ty[i] });
        target += spacing;
      }
    }
    return out;
  }

  /* ================= a view: one cord's scene ================= */
  // One key light and one shadow catcher, shared by every view (so there is only one shadow map).
  let rig = null;
  function getRig() {
    if (rig) return rig;
    const light = new THREE.DirectionalLight(0xfff4e6, 1.5);
    light.shadow.mapSize.set(512, 512);
    light.shadow.blurSamples = 12;
    light.shadow.bias = -0.0005;
    const catcher = new THREE.Mesh(geom('plane', () => new THREE.PlaneGeometry(1, 1)), new THREE.ShadowMaterial({ opacity: 0.3, color: color('#2a1a0c') }));
    catcher.receiveShadow = true;
    rig = { light, catcher };
    return rig;
  }
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  };

  class View {
    constructor({ idle = false } = {}) {
      this.idle = idle;
      this.visible = true;
      this.scene = new THREE.Scene();
      this.scene.environment = envMap;
      this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, 1, 4000);
      this.camera.position.z = 1000;
      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.curve = makeCurve();
      this.sig = '';
      this.rope = null;
      this.charms = [];
      this.rings = [];
      this.twist = [];
      this.pin = new THREE.Mesh(geom('pin', () => new THREE.SphereGeometry(5.5, 24, 16)), pinMat());
      this.pin.castShadow = true;
      this.root.add(this.pin);
    }

    // Rebuild meshes when the cord's rope or charms change.
    sync(cord) {
      const ready = cord.charms.every((ch) => ch.img && ch.img.complete && ch.img.naturalWidth);
      const sig = (cord.rope ? cord.rope.id : '-') + '|' + cord.charms.map((ch) => ch.charm.id + ':' + ch.size.toFixed(1)).join(',') + '|' + ready;
      if (sig === this.sig) return;
      this.sig = sig;
      if (this.rope) { this.root.remove(this.rope.group); this.rope.dispose(); this.rope = null; }
      this.charms.forEach((c) => {
        if (!c) return;
        this.root.remove(c.outer);
        c.outer.traverse((m) => { if (m.isInstancedMesh) m.dispose(); });
      });
      this.rings.forEach((r) => this.root.remove(r));
      this.charms = [];
      this.rings = [];
      if (cord.rope) {
        this.rope = new RopeMesh(cord.rope);
        this.root.add(this.rope.group);
      }
      cord.charms.forEach((ch, k) => {
        if (!(ch.img && ch.img.complete && ch.img.naturalWidth)) { this.charms.push(null); return; }
        const c = buildCharm(ch);
        this.root.add(c.outer);
        this.charms.push(c);
        if (k > 0) {
          const ring = new THREE.Mesh(geom('ring', () => new THREE.TorusGeometry(3, 0.8, 10, 24)), pinMat());
          ring.castShadow = true;
          this.root.add(ring);
          this.rings.push(ring);
        }
      });
    }

    // Twist each charm on its ring: a torsion spring kicked by sideways acceleration.
    tick(cord, dt, now) {
      if (!cord.charms) return false;
      let moving = false;
      while (this.twist.length < cord.charms.length) this.twist.push({ a: 0, w: 0, vx: 0 });
      cord.charms.forEach((ch, k) => {
        const tw = this.twist[k];
        const s = cord.charmState(k);
        const ax = Math.max(-9000, Math.min(9000, (s.vx - tw.vx) / Math.max(dt, 1 / 240)));
        tw.vx = s.vx;
        const target = this.idle && this.visible ? 0.5 * Math.sin(now * 0.00052 + k * 1.9) + 0.22 * Math.sin(now * 0.00023 + k) : 0;
        const acc = -6.5 * (tw.a - target) - 0.85 * tw.w - ax * 0.0011 * (k % 2 ? -1.2 : 1);
        tw.w += acc * dt;
        tw.a += tw.w * dt;
        if (Math.abs(tw.w) > 0.003 || Math.abs(tw.a - target) > 0.003) moving = true;
      });
      return moving || (this.idle && this.visible);
    }

    pose(cord, { pin = true } = {}) {
      const pts = cord.pts;
      if (this.rope && cord.ropeEnd > 0) {
        fillCurve(this.curve, pts, cord.ropeEnd + 1);
        this.rope.update(this.curve, performance.now());
      }
      this.pin.visible = pin && !!cord.rope;
      if (pts.length) this.pin.position.set(pts[0].x, -pts[0].y, 0);
      cord.charms.forEach((ch, k) => {
        const c = this.charms[k];
        if (!c) return;
        const t = pts[ch.top], b = pts[ch.bottom];
        c.outer.position.set(t.x, -t.y, 0);
        c.outer.rotation.z = Math.atan2(b.x - t.x, b.y - t.y);
        c.spin.rotation.y = this.twist[k] ? this.twist[k].a : 0;
        if (k > 0) {
          const ring = this.rings[k - 1];
          const a = pts[cord.charms[k - 1].bottom];
          ring.position.set((a.x + t.x) / 2, -(a.y + t.y) / 2, 0);
          ring.rotation.set(0, Math.PI / 2, 0);
          ring.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.atan2(t.x - a.x, t.y - a.y));
        }
      });
    }

    // Region of the view the cord (and its shadow) can touch, in CSS px.
    bounds(cord, w, h, shadow) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const grow = (p, r) => { x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r); x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r); };
      const rp = cord.rope ? cord.ropeEnd : -1;
      for (let i = 0; i <= rp; i++) grow(cord.pts[i], 14);
      cord.charms.forEach((ch) => { grow(cord.pts[ch.top], ch.size * 0.62); grow(cord.pts[ch.bottom], ch.size * 0.62); });
      if (shadow) { x1 += SHADOW_DEPTH * 0.7 + 14; y1 += SHADOW_DEPTH + 16; x0 -= 8; y0 -= 6; }
      return { x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(w, x1), y1: Math.min(h, y1) };
    }

    draw(ctx, cord, w, h, { pin = true, shadow = true } = {}) {
      if (failed) return false;
      this.sync(cord);
      this.pose(cord, { pin });
      const m = ctx.getTransform();
      let dpr = Math.hypot(m.a, m.b) || 1;
      const bb = this.bounds(cord, w, h, shadow);
      if (bb.x1 <= bb.x0 || bb.y1 <= bb.y0) return true;
      // Keep very large regions affordable.
      const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0) * dpr * dpr;
      const res = area > 2.2e6 ? dpr * Math.sqrt(2.2e6 / area) : dpr;
      const px0 = Math.floor(bb.x0 * res), py0 = Math.floor(bb.y0 * res);
      const pw = Math.ceil(bb.x1 * res) - px0, ph = Math.ceil(bb.y1 * res) - py0;
      const x0 = px0 / res, y0 = py0 / res, cw = pw / res, chh = ph / res;

      const size = renderer.getSize(new THREE.Vector2());
      if (size.x < pw || size.y < ph) {
        renderer.setSize(Math.max(size.x, Math.ceil(pw / 256) * 256), Math.max(size.y, Math.ceil(ph / 256) * 256), false);
      }
      const H = renderer.domElement.height;

      const cam = this.camera;
      cam.left = x0; cam.right = x0 + cw; cam.top = -y0; cam.bottom = -(y0 + chh);
      cam.updateProjectionMatrix();

      const cx = x0 + cw / 2, cy = -(y0 + chh / 2);
      const { light, catcher } = getRig();
      this.scene.add(light, light.target, catcher);
      catcher.visible = shadow;
      catcher.position.set(cx, cy, -SHADOW_DEPTH);
      catcher.scale.set(cw + 40, chh + 40, 1);
      light.castShadow = shadow;
      if (shadow) {
        const r = Math.max(cw, chh) / 2 + 30;
        const sc = light.shadow.camera;
        sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 2400;
        sc.updateProjectionMatrix();
        const texel = (2 * r) / 512;
        light.shadow.radius = Math.max(2, Math.min(24, 8 / texel));
        catcher.material.opacity = isDark() ? 0.5 : 0.3;
      }
      light.target.position.set(cx, cy, 0);
      light.position.set(cx + LIGHT_DIR.x * 1000, cy + LIGHT_DIR.y * 1000, LIGHT_DIR.z * 1000);

      renderer.setViewport(0, 0, pw, ph);
      renderer.setScissor(0, 0, pw, ph);
      renderer.setScissorTest(true);
      renderer.clear();
      renderer.render(this.scene, cam);
      ctx.drawImage(renderer.domElement, 0, H - ph, pw, ph, x0, y0, cw, chh);
      return true;
    }

    fallback() {}
  }

  /* ================= public API ================= */

  // Make a Stage draw its cord in 3D. idle: keep the charm gently turning while on screen.
  function enhance(stage, { idle = false } = {}) {
    if (!init()) return null;
    const view = new View({ idle });
    const cord = stage.cord;
    const draw2d = cord.draw;
    cord.draw = function (ctx, opts) {
      if (failed || !view.draw(ctx, cord, stage.w, stage.h, opts)) draw2d.call(cord, ctx, opts);
    };
    const onFrame = stage.onFrame;
    stage.onFrame = (dt, now) => {
      const a = onFrame ? onFrame(dt, now) : false;
      const b = failed ? false : view.tick(cord, dt, now);
      return a || b;
    };
    view.fallback = () => { cord.draw = draw2d; stage.onFrame = onFrame; stage.redraw(); };
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(([e]) => {
        view.visible = e.isIntersecting;
        if (view.visible) stage.wakeLoop();
      }).observe(stage.canvas);
    }
    views.add(view);
    stage.redraw();
    return view;
  }

  // Draw a static rope (e.g. a swatch) in 3D into a 2D canvas context.
  let stillView = null;
  function drawStill(ctx, cordLike, w, h, opts) {
    if (!init()) return false;
    if (!stillView) stillView = new View();
    return stillView.draw(ctx, cordLike, w, h, opts);
  }

  function ropeSwatch(ctx, rope, pts, w, h) {
    return drawStill(ctx, { rope, pts, ropeEnd: pts.length - 1, charms: [] }, w, h, { pin: false, shadow: true });
  }

  global.Pendu3D = { enhance, ropeSwatch, supported: () => init() };
})(typeof window !== 'undefined' ? window : globalThis);
