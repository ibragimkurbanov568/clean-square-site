// ==== 8. WORLD: рендер, небо, трассы, погода ====
const TRACKS = {
  port: { name: { ru: 'Ночной порт', en: 'Night Port' }, weather: 'rain', width: 18, grip: .82,
    pts: [[0, 0], [120, 0], [175, 30], [175, 110], [125, 145], [65, 120], [35, 165], [-40, 175], [-95, 132], [-95, 50], [-50, 18]], medals: [5000, 11000, 20000] },
  mountain: { name: { ru: 'Горный серпантин', en: 'Mountain Pass' }, weather: 'clear', width: 15, grip: 1,
    pts: [[0, 0], [100, -20], [165, 20], [155, 95], [90, 115], [65, 175], [125, 235], [40, 285], [-60, 255], [-85, 170], [-25, 128], [-95, 80], [-115, 10], [-60, -22]], medals: [5500, 12500, 23000] },
  snow: { name: { ru: 'Снежная парковка', en: 'Snowy Lot' }, weather: 'snow', width: 24, grip: .68,
    pts: [[0, 0], [140, 0], [165, 60], [105, 95], [45, 72], [5, 115], [-80, 105], [-105, 42], [-62, -10]], medals: [4000, 9500, 17000] },
  city: { name: { ru: 'Неоновый город', en: 'Neon City' }, weather: 'night', width: 16, grip: .9,
    pts: [[0, 0], [140, 0], [165, 25], [165, 115], [140, 140], [70, 140], [45, 118], [45, 80], [-15, 72], [-45, 48], [-45, 20], [-25, 0]], medals: [4500, 10500, 19000] },
  airfield: { name: { ru: 'Аэродром', en: 'Airfield' }, weather: 'sunny', width: 28, grip: 1,
    pts: [[0, 0], [260, 0], [300, 40], [260, 82], [125, 82], [85, 122], [125, 162], [240, 162], [282, 202], [240, 242], [-40, 242], [-85, 200], [-85, 40], [-42, 0]], medals: [6000, 14000, 26000] },
  desert: { name: { ru: 'Каньон', en: 'Canyon' }, weather: 'dust', width: 20, grip: .9,
    pts: [[0, 0], [150, -30], [245, 40], [205, 145], [105, 122], [45, 205], [-80, 185], [-125, 85], [-72, 12]], medals: [5000, 12000, 21000] },
};
const THEME = {
  rain: { sky: ['#05070c', '#141c2a', '#1c2433'], fog: 0x0b1018, fogN: 30, fogF: 240, hemi: [0x33445a, 0x0c0c10, .5], sun: [0x8fa4c8, .45], sunPos: [-40, 80, 30], exp: 1.05, night: true, ground: 'concrete', wet: true, wall: 'concrete', lampCol: 0xffa040 },
  clear: { sky: ['#1f2a55', '#ff8a4c', '#ffd29a'], fog: 0x8a5a60, fogN: 90, fogF: 650, hemi: [0xffc59a, 0x3a2f35, .75], sun: [0xffa060, 2.6], sunPos: [-120, 40, -60], exp: 1.0, ground: 'grass', wall: 'rail', lampCol: 0xffc070 },
  snow: { sky: ['#a9b7c6', '#d7dee6', '#eef2f6'], fog: 0xd2dae3, fogN: 25, fogF: 260, hemi: [0xe6eef6, 0x8a96a6, 1.0], sun: [0xffffff, .9], sunPos: [60, 90, 40], exp: 1.0, ground: 'snow', wall: 'snowbank', lampCol: 0xfff0d0 },
  dust: { sky: ['#b98a55', '#d9a86a', '#e8c48f'], fog: 0xc8a070, fogN: 18, fogF: 170, hemi: [0xffe0b0, 0x8a6a4a, .9], sun: [0xfff0d0, 1.9], sunPos: [50, 120, -30], exp: 1.0, ground: 'sand', wall: 'rock', lampCol: 0xffe0a0 },
};
THEME.night = { sky: ['#030409', '#0e1330', '#241238'], fog: 0x0b0d1c, fogN: 40, fogF: 330, hemi: [0x4a5590, 0x0a0a12, .55], sun: [0x8090c0, .35], sunPos: [-40, 90, 30], exp: 1.12, night: true, ground: 'concrete', wet: true, wall: 'concrete', lampCol: 0xffc890 };
THEME.sunny = { sky: ['#2f6fd6', '#8ec5ff', '#e2f0ff'], fog: 0xc6dcf2, fogN: 140, fogF: 950, hemi: [0xdfefff, 0x6a6250, 1.05], sun: [0xfff2dc, 3.1], sunPos: [90, 160, 50], exp: .95, ground: 'grass', wall: 'tires', lampCol: 0xffffff };
const W = { renderer: null, scene: null, cam: null, track: null, lamps: [], lampLights: [], weather: null, flashT: 0, nextBolt: 8 };

function canvasTex(size, draw, repeat = 1) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function noiseFill(g, s, base, spots, n, a = .5) { g.fillStyle = base; g.fillRect(0, 0, s, s); for (let i = 0; i < n; i++) { g.globalAlpha = Math.random() * a; g.fillStyle = spots[i % spots.length]; const r = Math.random() * 3 + .5; g.fillRect(Math.random() * s, Math.random() * s, r, r); } g.globalAlpha = 1; }

function initRenderer() {
  const canvas = document.getElementById('gl');
  const r = W.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  W.cam = new THREE.PerspectiveCamera(62, 1, .1, 1500);
  addEventListener('resize', resize); resize();
}
function quality() { const q = H.save.settings.quality; return q === 'auto' ? (Inp.usingTouch || matchMedia('(pointer:coarse)').matches ? 'mid' : 'high') : q; }
function resize() { const q = CFG.QUALITY[quality()]; W.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr)); W.renderer.setSize(innerWidth, innerHeight, false); W.cam.aspect = innerWidth / innerHeight; W.cam.updateProjectionMatrix(); }

function skyMesh(cols, stars) {
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(cols[0]) }, mid: { value: new THREE.Color(cols[1]) }, bot: { value: new THREE.Color(cols[2]) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(.08,.6,h)) : mix(bot, mid, smoothstep(-.1,.08,h)); gl_FragColor = vec4(c,1.); }' });
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat));
  if (stars) { const n = 1200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = Math.random() * .9 + .08, r = 850; pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 }))); }
  return g;
}
// карта окружения для отражений: небо + несколько ярких панелей
function envFromSky(th) {
  const s = new THREE.Scene(); s.add(skyMesh(th.sky, false));
  const lm = new THREE.MeshBasicMaterial({ color: th.night ? 0xffb070 : 0xffffff });
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(th.night ? 40 : 120, 20), lm); const a = i / 6 * TAU; m.position.set(Math.cos(a) * 300, th.night ? 30 : 160, Math.sin(a) * 300); m.lookAt(0, 0, 0); s.add(m); }
  const pm = new THREE.PMREMGenerator(W.renderer), rt = pm.fromScene(s, .04); pm.dispose(); return rt.texture;
}

function buildGarageScene() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x0a0c10); sc.fog = new THREE.Fog(0x0a0c10, 14, 40);
  const th = { sky: ['#0a0c12', '#1a2030', '#101218'], night: true }; sc.environment = envFromSky(th);
  sc.add(new THREE.HemisphereLight(0x8899bb, 0x111111, .6));
  const key = new THREE.SpotLight(0xffffff, 260, 30, .55, .5, 1.6); key.position.set(4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.002; key.shadow.normalBias = .03; sc.add(key);
  const rim = new THREE.SpotLight(0xff5a1f, 160, 30, .6, .6, 1.6); rim.position.set(-6, 5, -6); sc.add(rim);
  const rim2 = new THREE.SpotLight(0x22d3ee, 140, 30, .6, .6, 1.6); rim2.position.set(6, 4, -5); sc.add(rim2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0e1014, roughness: .55, metalness: .25 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, .12, 64), new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: .35, metalness: .7 })); disc.position.y = -.06; disc.receiveShadow = true; sc.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.65, .03, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff5a1f })); ring.rotation.x = Math.PI / 2; ring.position.y = .01; sc.add(ring);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, l = new THREE.Mesh(new THREE.BoxGeometry(.12, 4, .12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22d3ee : 0xff5a1f })); l.position.set(Math.cos(a) * 12, 2, Math.sin(a) * 12); sc.add(l); }
  sc.userData.disc = disc; return sc;
}

function buildTrack(id) {
  const def = TRACKS[id], th = THEME[def.weather], sc = new THREE.Scene(), q = CFG.QUALITY[quality()];
  sc.fog = new THREE.Fog(th.fog, th.fogN, th.fogF); sc.add(skyMesh(th.sky, th.night)); sc.environment = envFromSky(th); sc.background = new THREE.Color(th.fog);
  const hemi = new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]); sc.add(hemi);
  const sun = new THREE.DirectionalLight(th.sun[0], th.sun[1]); sun.castShadow = q.shadow > 0; sun.shadow.mapSize.set(q.shadow || 512, q.shadow || 512);
  const sh = sun.shadow.camera; sh.left = -35; sh.right = 35; sh.top = 35; sh.bottom = -35; sh.near = 1; sh.far = 300; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sc.add(sun); sc.add(sun.target);
  // центральная линия трассы
  const curve = new THREE.CatmullRomCurve3(def.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const total = curve.getLength(), N = Math.round(total / 2), P = [], Tn = [], Nm = [], D = [];
  for (let i = 0; i < N; i++) { const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u); P.push(p); Tn.push(t); Nm.push(new THREE.Vector3(t.z, 0, -t.x)); D.push(u * total); }
  const hw = def.width / 2;
  // асфальт
  const roadTex = canvasTex(512, (g, s) => { noiseFill(g, s, th.wet ? '#1b1d21' : def.weather === 'snow' ? '#3a3e44' : '#2b2c2f', ['#3a3b3f', '#141518', '#46474b', '#222'], 9000, .7);
    g.globalAlpha = .5; g.fillStyle = '#1a1b1e'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * s, Math.random() * s, 30 + Math.random() * 90, 20 + Math.random() * 60);
    g.strokeStyle = '#0c0c0e'; g.lineWidth = 1.5; for (let i = 0; i < 14; i++) { let x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.random() * 30 - 15; y += Math.random() * 30 - 15; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = .18; g.strokeStyle = '#000'; g.lineWidth = 14; for (let i = 0; i < 4; i++) { const x = s * (.3 + Math.random() * .4); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 60, s * .3, x - 60, s * .6, x + 20, s); g.stroke(); } g.globalAlpha = 1;
    g.fillStyle = '#e8e8e8'; g.fillRect(8, 0, 10, s); g.fillRect(s - 18, 0, 10, s); g.fillStyle = '#e8c547'; for (let y = 0; y < s; y += 128) g.fillRect(s / 2 - 5, y, 10, 70);
    if (def.weather === 'snow') { g.globalAlpha = .35; g.fillStyle = '#f4f7fa'; for (let i = 0; i < 60; i++) { g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 60, 6 + Math.random() * 20, 0, 0, TAU); g.fill(); } g.globalAlpha = 1; } });
  roadTex.repeat.set(1, 1);
  const strip = (off0, off1, vScale, mat, y = 0) => {
    const pos = new Float32Array(N * 2 * 3 + 6), uv = new Float32Array(N * 2 * 2 + 4), idx = [];
    for (let i = 0; i <= N; i++) { const k = i % N, p = P[k], n = Nm[k], v = (i === N ? total : D[k]) / vScale;
      pos.set([p.x + n.x * off0, y, p.z + n.z * off0, p.x + n.x * off1, y, p.z + n.z * off1], i * 6); uv.set([0, v, 1, v], i * 4);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; sc.add(m); return m;
  };
  strip(-hw, hw, def.width * 1.2, new THREE.MeshStandardMaterial({ map: roadTex, roughness: th.wet ? .12 : def.weather === 'snow' ? .6 : .82, metalness: th.wet ? .35 : .05, envMapIntensity: th.wet ? 1.4 : .6 }), .02);
  const curbTex = canvasTex(64, (g, s) => { g.fillStyle = '#d42a2a'; g.fillRect(0, 0, s, s / 2); g.fillStyle = '#f2f2f2'; g.fillRect(0, s / 2, s, s / 2); });
  const curbMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: .6 });
  strip(-hw - 1.1, -hw, 3, curbMat, .03); strip(hw, hw + 1.1, 3, curbMat, .03);
  // земля
  const gcol = { concrete: ['#23262b', ['#2c3036', '#1b1d21', '#34383e']], grass: ['#27301f', ['#324027', '#1d2517', '#3d4a2c']], snow: ['#e6ebf0', ['#ffffff', '#d4dbe3', '#c8d0da']], sand: ['#c59a62', ['#d8ae74', '#b0854f', '#caa06a']] }[th.ground];
  const gTex = canvasTex(512, (g, s) => noiseFill(g, s, gcol[0], gcol[1], 14000, .6), 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: gTex, roughness: th.ground === 'snow' ? .9 : .95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  // ограждения вдоль трассы (инстансы)
  const segN = Math.floor(N / 2), wallGeo = { tires: new THREE.BoxGeometry(.9, .95, 4.2), concrete: new THREE.BoxGeometry(.6, 1.05, 4.2), rail: new THREE.BoxGeometry(.18, .35, 4.2), snowbank: new THREE.BoxGeometry(1.8, .9, 4.4), rock: new THREE.BoxGeometry(1.4, 1.3, 4.3) }[th.wall];
  const tireTex = th.wall === 'tires' ? canvasTex(256, (g, s2) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, s2, s2); for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) { const cx = 32 + i * 64, cy = 64 + row * 128; g.fillStyle = '#141414'; g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.fill(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(cx, cy, 14, 0, TAU); g.fill(); } g.fillStyle = (Math.random() < .5) ? '#d7263d' : '#e8e8e8'; g.fillRect(0, 118, s2, 20); }) : null;
  const wallMat = { tires: new THREE.MeshStandardMaterial({ map: tireTex, roughness: .9 }), concrete: new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: .9 }), rail: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: .9, roughness: .3 }), snowbank: new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: .95 }), rock: new THREE.MeshStandardMaterial({ color: 0x8a6444, roughness: .95 }) }[th.wall];
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, segN * 2), m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sv = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const wallOff = hw + 1.6, wy = th.wall === 'rail' ? .7 : th.wall === 'snowbank' ? .3 : th.wall === 'tires' ? .45 : .52; let wi = 0;
  const posts = th.wall === 'rail' ? new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .8, .12), new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: .6, roughness: .5 }), segN * 2) : null;
  for (let i = 0; i < N; i += 2) for (const sd of [-1, 1]) {
    const p = P[i], n = Nm[i], t = Tn[i]; qt.setFromAxisAngle(up, Math.atan2(t.x, t.z));
    m4.compose(new THREE.Vector3(p.x + n.x * wallOff * sd, wy, p.z + n.z * wallOff * sd), qt, sv); walls.setMatrixAt(wi, m4);
    if (posts) { m4.compose(new THREE.Vector3(p.x + n.x * (wallOff + .15) * sd, .4, p.z + n.z * (wallOff + .15) * sd), qt, sv); posts.setMatrixAt(wi, m4); }
    wi++;
  }
  walls.castShadow = walls.receiveShadow = true; sc.add(walls); if (posts) sc.add(posts);
  // старт
  const chk = canvasTex(128, (g, s) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5'; g.fillRect(x * s / 16, y * s / 4, s / 16, s / 4); } });
  const startG = new THREE.Group(), start = new THREE.Mesh(new THREE.PlaneGeometry(def.width, 2.4), new THREE.MeshStandardMaterial({ map: chk, roughness: .6 })); start.rotation.x = -Math.PI / 2; start.receiveShadow = true;
  startG.add(start); startG.position.set(P[0].x, .04, P[0].z); startG.rotation.y = Math.atan2(Tn[0].x, Tn[0].z); sc.add(startG);
  const gant = new THREE.Group(), gm = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: .7, roughness: .4 });
  for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.5, 7, .5), gm); c.position.set(sd * (hw + 1.5), 3.5, 0); c.castShadow = true; gant.add(c); }
  const beamM = new THREE.Mesh(new THREE.BoxGeometry(def.width + 3.5, 1.2, .6), gm); beamM.position.y = 7; gant.add(beamM);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(def.width * .7, .8, .05), new THREE.MeshBasicMaterial({ color: 0xff5a1f })); sign.position.set(0, 7, .33); gant.add(sign);
  gant.position.copy(P[0]); gant.rotation.y = Math.atan2(Tn[0].x, Tn[0].z); sc.add(gant);
  // окружение
  const rng = mulberry32(id.length * 7919), lamps = [];
  const far = (x, z, m) => { let best = 1e9; for (let i = 0; i < N; i += 3) { const dx = P[i].x - x, dz = P[i].z - z, d = dx * dx + dz * dz; if (d < best) best = d; } return Math.sqrt(best) > hw + m; };
  const scatter = (n, minD, maxD, fn) => { let k = 0, tries = 0; while (k < n && tries < n * 20) { tries++; const i = Math.floor(rng() * N), sd = rng() < .5 ? -1 : 1, off = hw + minD + rng() * (maxD - minD), x = P[i].x + Nm[i].x * off * sd, z = P[i].z + Nm[i].z * off * sd; if (far(x, z, minD - 1)) { fn(x, z, rng); k++; } } };
  const inst = (geo, mat, list, shadow = true) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((o, i) => { m4.compose(new THREE.Vector3(o.x, o.y, o.z), new THREE.Quaternion().setFromAxisAngle(up, o.r || 0), new THREE.Vector3(o.sx || 1, o.sy || 1, o.sz || 1)); im.setMatrixAt(i, m4); if (o.c && im.setColorAt) im.setColorAt(i, new THREE.Color(o.c)); }); im.castShadow = shadow; im.receiveShadow = true; sc.add(im); return im; };
  // фонари вдоль трассы
  const lampStep = th.night ? 14 : 22, poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: .6, roughness: .5 }), headMat = new THREE.MeshStandardMaterial({ color: 0x222, emissive: th.lampCol, emissiveIntensity: th.night ? 3 : .6 });
  const poles = [], heads = [];
  for (let i = 0; i < N; i += lampStep) { const sd = (i / lampStep) % 2 ? 1 : -1, off = hw + 3.2, x = P[i].x + Nm[i].x * off * sd, z = P[i].z + Nm[i].z * off * sd, r = Math.atan2(Tn[i].x, Tn[i].z);
    poles.push({ x, y: 4, z }); heads.push({ x: x - Nm[i].x * 1.2 * sd, y: 7.9, z: z - Nm[i].z * 1.2 * sd, r }); lamps.push(new THREE.Vector3(x - Nm[i].x * 1.2 * sd, 7.5, z - Nm[i].z * 1.2 * sd)); }
  inst(new THREE.CylinderGeometry(.12, .16, 8, 8), poleMat, poles); inst(new THREE.BoxGeometry(.5, .18, 1.1), headMat, heads, false);
  const anim = [];
  if (th.night) { const gm = new THREE.SpriteMaterial({ map: Mat.glow.map, color: th.lampCol, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }); for (const l of lamps) { const sp = new THREE.Sprite(gm); sp.position.copy(l).add(V3w(0, .25, 0)); sp.scale.set(3.2, 3.2, 1); sc.add(sp); }
    const pm = new THREE.MeshBasicMaterial({ map: Mat.pool.map, color: th.lampCol, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }); for (const l of lamps) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), pm); pl.rotation.x = -Math.PI / 2; pl.position.set(l.x, .05, l.z); sc.add(pl); } }
  if (id === 'port') {
    const cont = []; const cols = ['#b83a2a', '#1f5a9a', '#2f7a3a', '#c9a227', '#6a6d72', '#8a3a7a', '#d0692a'];
    scatter(90, 8, 70, (x, z, r) => { const h = 1 + Math.floor(r() * 3), rot = Math.round(r() * 2) * Math.PI / 2 + (r() - .5) * .1, c = cols[Math.floor(r() * cols.length)]; for (let k = 0; k < h; k++) cont.push({ x, y: 1.3 + k * 2.6, z, r: rot, c }); });
    const ctex = canvasTex(128, (g, s) => { g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < s; x += 8) g.fillRect(x, 0, 3, s); });
    inst(new THREE.BoxGeometry(12, 2.6, 2.45), new THREE.MeshStandardMaterial({ map: ctex, roughness: .7, metalness: .3 }), cont);
    const crane = [], cm = new THREE.MeshStandardMaterial({ color: 0xd9a21b, metalness: .5, roughness: .5 });
    scatter(5, 40, 90, (x, z, r) => { for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) crane.push({ x: x + dx, y: 14, z: z + dz });
      const jib = new THREE.Group(); jib.position.set(x, 29, z); const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 46), cm); arm.position.z = 12; arm.castShadow = true; jib.add(arm);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), cm); cab.position.y = -2; jib.add(cab); const cable = new THREE.Mesh(new THREE.BoxGeometry(.08, 16, .08), Mat.black); cable.position.set(0, -8, 28); jib.add(cable);
      const box2 = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.4), new THREE.MeshStandardMaterial({ color: 0x1f5a9a })); box2.position.set(0, -17, 28); jib.add(box2);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); bl.position.set(0, 1.4, 35); jib.add(bl);
      sc.add(jib); const sp0 = r() * 6, spd = .05 + r() * .06; jib.rotation.y = sp0; anim.push((t) => { jib.rotation.y = sp0 + Math.sin(t * spd) * 1.2; bl.visible = (t * 1.5 | 0) % 2 === 0; }); });
    inst(new THREE.BoxGeometry(.8, 28, .8), cm, crane);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 900), new THREE.MeshStandardMaterial({ color: 0x05080d, roughness: .05, metalness: .9 })); water.rotation.x = -Math.PI / 2; water.position.set(0, -.5, -700); sc.add(water);
  }
  if (id === 'mountain' || id === 'snow') {
    const trees = [], trunks = [], snowy = id === 'snow';
    scatter(id === 'snow' ? 140 : 380, 6, 120, (x, z, r) => { const s = .7 + r() * .9; trees.push({ x, y: 4.4 * s, z, sx: s, sy: s, sz: s, r: r() * 6 }); trunks.push({ x, y: .8 * s, z, sx: s, sy: s, sz: s }); });
    inst(new THREE.ConeGeometry(2.2, 7, 8), new THREE.MeshStandardMaterial({ color: snowy ? 0xdfe8ee : 0x1d3a24, roughness: .9 }), trees); inst(new THREE.CylinderGeometry(.25, .3, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x3a2618 }), trunks);
    const rocks = []; scatter(60, 5, 60, (x, z, r) => rocks.push({ x, y: .5, z, sx: 1 + r() * 2, sy: .6 + r(), sz: 1 + r() * 2, r: r() * 6 }));
    inst(new THREE.DodecahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: snowy ? 0xcfd6de : 0x6a6660, roughness: .95, flatShading: true }), rocks);
    if (!snowy) { const hills = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; hills.push({ x: Math.cos(a) * 520, y: 0, z: 130 + Math.sin(a) * 520, sx: 120 + rng() * 80, sy: 90 + rng() * 140, sz: 120 + rng() * 80 }); }
      inst(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a40, roughness: 1, flatShading: true }), hills.map(h => ({ ...h, y: h.sy / 2 })), false); }
    if (snowy) { const piles = []; scatter(70, 3, 30, (x, z, r) => piles.push({ x, y: 0, z, sx: 2 + r() * 3, sy: .8 + r(), sz: 2 + r() * 3 })); inst(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf6f8fa, roughness: .95 }), piles); }
  }
  if (id === 'city') {
    const winTex = canvasTex(256, (g, s2) => { g.fillStyle = '#0b0d14'; g.fillRect(0, 0, s2, s2); for (let y = 8; y < s2; y += 16) for (let x = 6; x < s2; x += 12) { const on = Math.random() < .42; g.fillStyle = on ? ['#ffd79a', '#fff1c8', '#9ad0ff', '#ffb070'][Math.random() * 4 | 0] : '#141824'; g.fillRect(x, y, 7, 9); } });
    const bmat = new THREE.MeshStandardMaterial({ color: 0x2a2e3a, roughness: .7, metalness: .3, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.1, map: winTex });
    const blds = []; scatter(120, 10, 90, (x, z, r) => { const h = 14 + r() * 55, w = 10 + r() * 14; blds.push({ x, y: h / 2, z, sx: w, sy: h, sz: 10 + r() * 14, r: Math.round(r() * 4) * Math.PI / 2 }); });
    inst(new THREE.BoxGeometry(1, 1, 1), bmat, blds);
    const neonCols = [0xff2d95, 0x22d3ee, 0xa855f7, 0xffb020, 0x4ade80], neons = [];
    for (let i = 0; i < 40; i++) { const k = Math.floor(rng() * N), sd = rng() < .5 ? -1 : 1, off = hw + 9 + rng() * 6, p = P[k], n = Nm[k];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4 + rng() * 5, 1.2 + rng() * 1.5), new THREE.MeshBasicMaterial({ color: neonCols[i % 5], side: THREE.DoubleSide }));
      m.position.set(p.x + n.x * off * sd, 5 + rng() * 10, p.z + n.z * off * sd); m.lookAt(p.x, m.position.y, p.z); sc.add(m);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: Mat.glow.map, color: neonCols[i % 5], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .5 })); gl.position.copy(m.position); gl.scale.set(10, 5, 1); sc.add(gl); neons.push([m, rng() * 10, gl]); }
    anim.push(t => { for (const [m, ph, gl] of neons) { const on = Math.sin(t * 7 + ph) > -.92 && !(Math.sin(t * 23 + ph * 3) > .97); m.visible = on; gl.visible = on; } });
    const pud = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: .02, metalness: .9, transparent: true, opacity: .7 });
    for (let i = 0; i < 40; i++) { const k = Math.floor(rng() * N), o = (rng() - .5) * def.width * .8, p = P[k], n = Nm[k], m = new THREE.Mesh(new THREE.CircleGeometry(1 + rng() * 2.2, 20), pud); m.rotation.x = -Math.PI / 2; m.scale.y = .6; m.position.set(p.x + n.x * o, .04, p.z + n.z * o); sc.add(m); }
  }
  if (id === 'airfield') {
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(60, 700), new THREE.MeshStandardMaterial({ map: canvasTex(256, (g, s2) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, s2, s2); g.fillStyle = '#f2f2f2'; for (let y = 0; y < s2; y += 64) g.fillRect(s2 / 2 - 4, y, 8, 32); g.fillRect(6, 0, 6, s2); g.fillRect(s2 - 12, 0, 6, s2); }), roughness: .85 }));
    runway.material.map.repeat.set(1, 8); runway.rotation.x = -Math.PI / 2; runway.rotation.z = Math.PI / 2; runway.position.set(100, .01, -90); runway.receiveShadow = true; sc.add(runway);
    const hm = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: .6, roughness: .45, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) { const hg = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 36, 24, 1, true, 0, Math.PI), hm); hg.rotation.z = Math.PI / 2; hg.rotation.y = Math.PI / 2; hg.position.set(-40 + i * 40, 0, 330); hg.castShadow = hg.receiveShadow = true; sc.add(hg); }
    const pl = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: .3, roughness: .35 }), stripe = new THREE.MeshStandardMaterial({ color: 0xd7263d });
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 30, 20), pm); fus.rotation.x = Math.PI / 2; pl.add(fus); const nose = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 12, 0, TAU, 0, Math.PI / 2), pm); nose.rotation.x = Math.PI / 2; nose.position.z = 15; pl.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(34, .4, 5), pm); wing.position.set(0, -.5, 1); pl.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(12, .3, 3), pm); tail.position.set(0, .5, -13.5); pl.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.4, 6, 4), stripe); fin.position.set(0, 3.5, -13.5); pl.add(fin);
    for (const sx of [-1, 1]) { const en = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 3.5, 16), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: .7, roughness: .3 })); en.rotation.x = Math.PI / 2; en.position.set(sx * 7, -1.4, 2.5); pl.add(en); }
    pl.position.set(-150, 3.2, 110); pl.rotation.y = .6; pl.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); sc.add(pl);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 28, 12), new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: .6 })); tw.position.set(350, 14, 120); tw.castShadow = true; sc.add(tw);
    const tcab = new THREE.Mesh(new THREE.CylinderGeometry(5, 4, 4, 12), new THREE.MeshPhysicalMaterial({ color: 0x3a6a8a, roughness: .05, metalness: .2, clearcoat: 1 })); tcab.position.set(350, 30, 120); sc.add(tcab);
    const beacon = new THREE.Group(); beacon.position.set(350, 33, 120); const bm = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, 2), new THREE.MeshBasicMaterial({ color: 0xffe28a })); bm.position.z = .8; beacon.add(bm);
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: Mat.glow.map, color: 0xffe28a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); bg.scale.set(6, 6, 1); bg.position.z = 1.8; beacon.add(bg); sc.add(beacon);
    const ws = new THREE.Group(); ws.position.set(160, 0, 110); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 7, 8), Mat.black); pole.position.y = 3.5; ws.add(pole);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(.6, 3, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xff6a00, side: THREE.DoubleSide })); sock.rotation.z = -Math.PI / 2; sock.position.set(1.5, 6.8, 0); ws.add(sock); sc.add(ws);
    anim.push((t) => { beacon.rotation.y = t * 2.4; ws.rotation.y = .5 + Math.sin(t * .6) * .4; sock.rotation.x = Math.sin(t * 3) * .12; });
    const cones = []; for (let i = 0; i < N; i += 6) { const j = (i + 3) % N, cr = Tn[j].x * Tn[i].z - Tn[j].z * Tn[i].x; if (Math.abs(cr) > .05) { const sd = Math.sign(cr); cones.push({ x: P[i].x - Nm[i].x * sd * (hw - 1.5), y: .35, z: P[i].z - Nm[i].z * sd * (hw - 1.5) }); } }
    if (cones.length) inst(new THREE.ConeGeometry(.25, .7, 12), new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: .6 }), cones);
    const cloudTex = canvasTex(128, (g, s2) => { for (let i = 0; i < 8; i++) { const gr = g.createRadialGradient(20 + Math.random() * 88, 50 + Math.random() * 30, 0, 64, 64, 40); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s2, s2); } });
    const clouds = []; for (let i = 0; i < 14; i++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: .85, depthWrite: false, fog: false })); c.position.set(-600 + rng() * 1200, 180 + rng() * 120, -600 + rng() * 1200); c.scale.set(220, 90, 1); sc.add(c); clouds.push(c); }
    anim.push((t, dt) => { for (const c of clouds) { c.position.x += dt * 4; if (c.position.x > 700) c.position.x = -700; } });
    const trees = []; scatter(120, 20, 150, (x, z, r) => { const s2 = .8 + r() * .8; trees.push({ x, y: 4 * s2, z, sx: s2 * 1.2, sy: s2, sz: s2 * 1.2 }); });
    inst(new THREE.SphereGeometry(3, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: .9 }), trees);
  }
  if (id === 'desert') {
    const mesas = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + rng() * .2, d = 300 + rng() * 200; mesas.push({ x: 60 + Math.cos(a) * d, y: 0, z: 90 + Math.sin(a) * d, sx: 40 + rng() * 60, sy: 40 + rng() * 70, sz: 40 + rng() * 60 }); }
    inst(new THREE.CylinderGeometry(.8, 1, 1, 7), new THREE.MeshStandardMaterial({ color: 0xa4643a, roughness: 1, flatShading: true }), mesas.map(m => ({ ...m, y: m.sy / 2 })), false);
    const rocks = [], cacti = [], arms = []; scatter(70, 5, 70, (x, z, r) => rocks.push({ x, y: .6, z, sx: 1 + r() * 3, sy: .8 + r() * 2, sz: 1 + r() * 3, r: r() * 6 }));
    scatter(80, 6, 80, (x, z, r) => { const s = .8 + r() * .8; cacti.push({ x, y: 2 * s, z, sy: s }); arms.push({ x: x + .6, y: 2.4 * s, z, sy: s * .5 }); });
    inst(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x9a6a44, roughness: 1, flatShading: true }), rocks);
    inst(new THREE.CylinderGeometry(.35, .4, 4, 8), new THREE.MeshStandardMaterial({ color: 0x3f6a34, roughness: .9 }), cacti); inst(new THREE.CylinderGeometry(.25, .25, 2, 8), new THREE.MeshStandardMaterial({ color: 0x3f6a34, roughness: .9 }), arms);
  }
  // пул точечных света для ближайших фонарей
  const lights = []; if (th.night || id === 'snow') for (let i = 0; i < (quality() === 'low' ? 2 : 5); i++) { const l = new THREE.PointLight(th.lampCol, th.night ? 60 : 20, 26, 1.8); sc.add(l); lights.push(l); }
  // погода
  const weather = buildWeather(def.weather, sc);
  W.renderer.toneMappingExposure = th.exp;
  W.track = { id, def, th, sc, P, Tn, Nm, D, N, total, hw, sun, hemi, lamps, lights, weather, hemiBase: th.hemi[2], anim };
  return W.track;
}

function buildWeather(kind, sc) {
  const q = CFG.QUALITY[quality()].parts, box = 60;
  if (kind === 'rain') {
    const n = Math.round(2200 * q), pos = new Float32Array(n * 6), sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = rand(-box, box), y = rand(0, 30), z = rand(-box, box); pos.set([x, y, z, x + .08, y + .9, z + .05], i * 6); sp[i] = rand(22, 30); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xa6bcd4, transparent: true, opacity: .38 })); m.frustumCulled = false; sc.add(m);
    return { kind, m, n, sp, box };
  }
  const n = Math.round((kind === 'snow' ? 2600 : 1800) * q), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([rand(-box, box), rand(0, 26), rand(-box, box)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(64, (c, s) => { const gr = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, s, s); });
  if (kind === 'clear' || kind === 'night' || kind === 'sunny') return { kind, m: null };
  const m = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, color: kind === 'snow' ? 0xffffff : 0xd9b27c, size: kind === 'snow' ? .22 : .9, transparent: true, opacity: kind === 'snow' ? .9 : .35, depthWrite: false }));
  m.frustumCulled = false; sc.add(m); return { kind, m, n, box };
}
function updateWeather(dt, cx, cz) {
  const w = W.track.weather; if (!w || !w.m) return;
  const a = w.m.geometry.attributes.position, arr = a.array, b = w.box;
  if (w.kind === 'rain') {
    for (let i = 0; i < w.n; i++) { const o = i * 6; let dy = w.sp[i] * dt; arr[o + 1] -= dy; arr[o + 4] -= dy; if (arr[o + 1] < 0) { const x = cx + rand(-b, b), z = cz + rand(-b, b), y = rand(22, 30); arr.set([x, y, z, x + .08, y + .9, z + .05], o); }
      if (arr[o] - cx > b) { arr[o] -= 2 * b; arr[o + 3] -= 2 * b; } else if (arr[o] - cx < -b) { arr[o] += 2 * b; arr[o + 3] += 2 * b; }
      if (arr[o + 2] - cz > b) { arr[o + 2] -= 2 * b; arr[o + 5] -= 2 * b; } else if (arr[o + 2] - cz < -b) { arr[o + 2] += 2 * b; arr[o + 5] += 2 * b; } }
    // молнии
    W.nextBolt -= dt; if (W.nextBolt <= 0) { W.nextBolt = rand(9, 20); W.flashT = .35; setTimeout(() => Snd.play('thunder'), 700); }
    if (W.flashT > 0) { W.flashT -= dt; W.track.hemi.intensity = W.track.hemiBase + (W.flashT > .2 || (W.flashT > .08 && W.flashT < .14) ? 4 : 0); } else W.track.hemi.intensity = W.track.hemiBase;
  } else {
    const snow = w.kind === 'snow', t = performance.now() / 1000;
    for (let i = 0; i < w.n; i++) { const o = i * 3;
      if (snow) { arr[o + 1] -= (1.6 + (i % 5) * .2) * dt; arr[o] += Math.sin(t + i) * .4 * dt; } else { arr[o] += 14 * dt; arr[o + 1] += Math.sin(t * 2 + i) * .5 * dt; arr[o + 2] += 3 * dt; }
      if (arr[o + 1] < 0) arr[o + 1] += 26; if (arr[o + 1] > 26) arr[o + 1] -= 26;
      if (arr[o] - cx > b) arr[o] -= 2 * b; else if (arr[o] - cx < -b) arr[o] += 2 * b;
      if (arr[o + 2] - cz > b) arr[o + 2] -= 2 * b; else if (arr[o + 2] - cz < -b) arr[o + 2] += 2 * b; }
  }
  a.needsUpdate = true;
}
function animateTrack(t, dt) { const tr = W.track; if (tr && tr.anim) for (const f of tr.anim) f(t, dt); }
const V3w = (x, y, z) => new THREE.Vector3(x, y, z);
function updateLamps(cx, cz) {
  const t = W.track; if (!t.lights.length) return;
  const near = t.lamps.map(l => [l, (l.x - cx) ** 2 + (l.z - cz) ** 2]).sort((a, b) => a[1] - b[1]);
  t.lights.forEach((l, i) => { const n = near[i]; if (n) l.position.copy(n[0]); });
}
// ближайшая точка трассы: локальный поиск от подсказки
function nearestIdx(x, z, hint) {
  const t = W.track, N = t.N; let best = hint, bd = 1e12;
  const scan = (from, to) => { for (let k = from; k <= to; k++) { const i = ((k % N) + N) % N, p = t.P[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } } };
  if (hint < 0) scan(0, N - 1); else scan(hint - 25, hint + 25);
  return best;
}
