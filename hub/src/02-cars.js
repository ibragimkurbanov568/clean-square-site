// ==== 7. CARS: каталог, детали и процедурные 3D-модели ====
// Размеры в метрах. Перед машины смотрит в +Z. Физика: масса, момент, распределение веса.
const CARS = {
  kaze: { name: 'Kaze GT', price: 0, L: 4.3, W: 1.76, wb: 2.5, tr: 1.56, R: .33, mass: 1240, torque: 310, redline: 7800, cyl: 4, snd: 'i4', front: .53, paint: '#d7263d',
    p: { noseY: .54, hoodF: .82, hoodR: .9, belt: .93, zA: .55, zB: -.28, zC: -.95, zD: -1.5, roof: 1.3, trunk: .98, tail: .95 } },
  hornet: { name: 'Hornet RS', price: 8000, L: 4.0, W: 1.74, wb: 2.46, tr: 1.54, R: .32, mass: 1110, torque: 285, redline: 8200, cyl: 4, snd: 'i4t', front: .55, paint: '#f5c518',
    p: { noseY: .58, hoodF: .86, hoodR: .95, belt: .98, zA: .62, zB: .02, zC: -1.5, zD: -1.86, roof: 1.43, trunk: 1.02, tail: 1.02 } },
  titan: { name: 'Titan V8', price: 15000, L: 4.75, W: 1.9, wb: 2.78, tr: 1.7, R: .35, mass: 1560, torque: 560, redline: 6600, cyl: 8, snd: 'v8', front: .54, paint: '#1c3faa',
    p: { noseY: .64, hoodF: .92, hoodR: .99, belt: .99, zA: .15, zB: -.48, zC: -1.08, zD: -1.62, roof: 1.33, trunk: 1.03, tail: 1.0 } },
  raijin: { name: 'Raijin R', price: 40000, L: 4.5, W: 1.96, wb: 2.66, tr: 1.74, R: .35, mass: 1380, torque: 540, redline: 8600, cyl: 10, snd: 'v10', front: .45, paint: '#16a34a',
    p: { noseY: .5, hoodF: .8, hoodR: .82, belt: .86, zA: .95, zB: .08, zC: -.8, zD: -1.65, roof: 1.16, trunk: .95, tail: .92 } },
};
const PAINTS = ['#d7263d', '#f5c518', '#1c3faa', '#16a34a', '#0f0f12', '#f4f4f5', '#8e8e93', '#ff6a00', '#7c3aed', '#ec4899', '#06b6d4', '#7f1d1d', '#0b3d2e', '#c9a227', '#3b3024', '#64748b', '#9ad0ff', '#b6ff4a', '#ff9eb1', '#5a3e2b'];
const WHEEL_COLORS = ['#c0c4ca', '#1a1a1c', '#d4af37', '#e5e7eb', '#7f1d1d', '#1e3a8a', '#3f3f46', '#ff6a00', '#16a34a', '#ec4899', '#8b5a2b', '#22d3ee'];
const CALIPERS = ['#b91c1c', '#facc15', '#2563eb', '#16a34a', '#e5e7eb', '#1a1a1c', '#ff6a00', '#a855f7'];
const NEONS = [null, '#22d3ee', '#ec4899', '#4ade80', '#ff6a00', '#a855f7', '#ffffff', '#ef4444'];
const LIGHT_COLS = ['#fff6e4', '#ffd9a0', '#cfe4ff', '#ffe066'];
const STRIPE_COLS = ['#f4f4f5', '#0f0f12', '#d7263d', '#f5c518', '#22d3ee', '#16a34a'];
const WHEEL_STYLES = ['5spoke', 'mesh', 'deepdish', 'turbine', 'multi', 'star6', 'cross', 'split5', 'steelie', 'rotor'];
// Каталог деталей: названия и цены (0 — бесплатно)
const N2 = (ru, en) => ({ ru, en });
const PARTS = {
  finish: [[N2('Глянец', 'Gloss'), 0], [N2('Металлик', 'Metallic'), 0], [N2('Мат', 'Matte'), 800], [N2('Перламутр', 'Pearl'), 1500], [N2('Кэнди', 'Candy'), 2500], [N2('Хром', 'Chrome'), 4000]],
  wheel: [[N2('5 спиц', '5-Spoke'), 0], [N2('Сетка', 'Mesh'), 0], [N2('Глубокая полка', 'Deep Dish'), 1500], [N2('Турбина', 'Turbine'), 1800], [N2('Мульти', 'Multi'), 1200],
    [N2('Звезда', 'Star 6'), 0], [N2('Крестовина', 'Cross'), 2200], [N2('Двойные 5', 'Split 5'), 900], [N2('Штамповка', 'Steelie'), 0], [N2('Ротор', 'Rotor'), 3000]],
  wsize: [['17"', 0], ['18"', 0], ['19"', 800], ['20"', 1500]],
  front: [[N2('Стоковый', 'Stock'), 0], [N2('Губа', 'Lip'), 0], [N2('Аэро', 'Aero'), 1200], [N2('Сплиттер + клыки', 'Splitter'), 2500], [N2('Ралли с фарами', 'Rally'), 1800]],
  rear: [[N2('Стоковый', 'Stock'), 0], [N2('Диффузор', 'Diffuser'), 0], [N2('Гоночный', 'Race'), 1500], [N2('Брызговики', 'Mudflaps'), 800]],
  hood: [[N2('Стоковый', 'Stock'), 0], [N2('Жабры', 'Vented'), 0], [N2('Карбон', 'Carbon'), 1500], [N2('Воздухозаборник', 'Scoop'), 2000], [N2('Горб', 'Bulge'), 0]],
  fenders: [[N2('Стоковые', 'Stock'), 0], [N2('Расширители', 'Overfenders'), 3000], [N2('Широкий кузов', 'Widebody'), 5000]],
  skirts: [[N2('Нет', 'None'), 0], [N2('Тонкие', 'Slim'), 0], [N2('Аэро', 'Aero'), 900]],
  spoiler: [[N2('Нет', 'None'), 0], [N2('Утиный хвост', 'Ducktail'), 0], [N2('Губа', 'Lip'), 0], [N2('Крышевой', 'Roof'), 0], [N2('GT низкий', 'GT low'), 1500],
    [N2('GT высокий', 'GT high'), 3000], [N2('Лебединая шея', 'Swan neck'), 4500], [N2('Большое крыло', 'Big wing'), 6000]],
  heads: [[N2('Стоковые', 'Stock'), 0], [N2('LED-полоса', 'LED strip'), 0], [N2('Ангельские глазки', 'Angel eyes'), 800], [N2('4 линзы', 'Quad'), 1200], [N2('Реснички', 'Eyelids'), 0]],
  tails: [[N2('Стоковые', 'Stock'), 0], [N2('Сквозная LED', 'Full LED'), 0], [N2('Тонированные', 'Smoked'), 600]],
  exhaust: [[N2('Двойной', 'Dual'), 0], [N2('Четыре трубы', 'Quad'), 0], [N2('Центральный', 'Center'), 900], [N2('Боковой', 'Side exit'), 1200]],
  stripes: [[N2('Нет', 'None'), 0], [N2('Двойные', 'Twin'), 0], [N2('Одна широкая', 'Wide'), 0], [N2('Боковые', 'Side'), 0]],
  tint: [['0%', 0], ['35%', 0], ['70%', 0], [N2('Лимузин', 'Limo'), 0]],
  neon: NEONS.map((c, i) => [i ? '●' : N2('Нет', 'None'), 0]),
};
const PRICES = { engine: [2000, 3500, 5500, 8000, 12000], turbo: [4000, 7000, 11000], tires: [1500, 2500, 4000, 6000], susp: [1800, 3000, 5000], weight: [2500, 4500, 7000], nitro: [2000, 4000, 7000] };
const UPGRADES = ['engine', 'turbo', 'tires', 'susp', 'weight', 'nitro'];
function partName(n) { return typeof n === 'string' ? n : (n[H.lang] || n.ru); }
function partPrice(key, v) { const o = PARTS[key] && PARTS[key][v]; return o ? o[1] : 0; }
function defaultConfig(id) {
  return { paint: CARS[id].paint, finish: 0, wheel: 0, wcol: 0, wsize: 1, caliper: 0, height: 0, camber: 1, front: 0, rear: 0, hood: 0, fenders: 0, skirts: 0, spoiler: 0,
    heads: 0, lightCol: 0, tails: 0, exhaust: 0, stripes: 0, stripeCol: 0, tint: 1, neon: 0, up: { engine: 0, turbo: 0, tires: 0, susp: 0, weight: 0, nitro: 0 } };
}
function carConfig(id) { const s = H.save; if (!s.cars[id]) s.cars[id] = defaultConfig(id); const c = s.cars[id]; for (const [k, v] of Object.entries(defaultConfig(id))) if (c[k] === undefined) c[k] = v; c.up = Object.assign(defaultConfig(id).up, c.up); return c; }
function owns(id, part, v) { if (!partPrice(part, v)) return true; return !!H.save.parts[`${id}:${part}:${v}`]; }
// параметры физики с учётом прокачки
function carStats(id, cfg) {
  const d = CARS[id], u = cfg.up, wide = cfg.fenders;
  const mass = d.mass * (1 - .05 * u.weight), a = d.wb * (1 - d.front), b = d.wb * d.front;
  return { torque: d.torque * (1 + .12 * u.engine + .14 * u.turbo), redline: d.redline + u.engine * 150, mass, a, b, L: d.wb, Iz: mass * a * b * 1.15, h: .48,
    mu: 1.05 * (1 + .06 * u.tires + .025 * wide), steerMax: .62 * (1 + .04 * u.susp), resp: 1 + .15 * u.susp, nitro: u.nitro, turbo: u.turbo, cyl: d.cyl, snd: d.snd,
    power: d.torque * (1 + .12 * u.engine + .14 * u.turbo) * d.redline * .85 / 7120 };
}

// ---------- материалы ----------
const Mat = {};
function initMaterials() {
  Mat.rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9, metalness: 0 });
  Mat.black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .5, metalness: .2 });
  Mat.gloss = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: .15, metalness: .1, clearcoat: 1 });
  Mat.carbon = new THREE.MeshPhysicalMaterial({ color: 0x1a1c20, roughness: .3, metalness: .4, clearcoat: 1, clearcoatRoughness: .08, map: carbonTex() });
  Mat.chrome = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: .06, metalness: 1 });
  Mat.disc = new THREE.MeshStandardMaterial({ color: 0x7a7b80, roughness: .32, metalness: .9 });
  Mat.interior = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: .85 });
  Mat.grille = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .6, metalness: .4 });
  Mat.lens = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .02, metalness: 0, transparent: true, opacity: .25, clearcoat: 1 });
  Mat.plate = new THREE.MeshStandardMaterial({ map: plateTex(), roughness: .5 });
  Mat.exhaust = new THREE.MeshStandardMaterial({ color: 0xa4a4aa, roughness: .22, metalness: 1 });
  Mat.soot = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1 });
  Mat.shadow = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: .85 });
  Mat.pool = new THREE.MeshBasicMaterial({ map: blobTex(true), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d0 });
  Mat.glow = new THREE.SpriteMaterial({ map: blobTex(true), color: 0xfff4e0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
}
function carbonTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) { g.fillStyle = ((x + y) / 8) % 2 ? '#2a2c30' : '#16171a'; g.fillRect(x, y, 8, 8); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, y, 8, 2); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace; return t; }
function plateTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#eef0f2'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58); g.fillStyle = '#111'; g.font = 'bold 40px Arial Narrow, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('М 0 0 1 Н Ч', 128, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function blobTex(light) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); if (light) { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); } else { gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.6, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); } g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function paintMaterial(cfg) {
  const f = cfg.finish, m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(cfg.paint), envMapIntensity: 1.25 });
  if (f === 0) Object.assign(m, { metalness: .15, roughness: .3, clearcoat: 1, clearcoatRoughness: .03 });
  if (f === 1) Object.assign(m, { metalness: .75, roughness: .3, clearcoat: 1, clearcoatRoughness: .05 });
  if (f === 2) Object.assign(m, { metalness: .1, roughness: .78, clearcoat: 0 });
  if (f === 3) Object.assign(m, { metalness: .45, roughness: .22, clearcoat: 1, clearcoatRoughness: .03, iridescence: .8, iridescenceIOR: 1.6, sheen: .6, sheenColor: new THREE.Color('#9fd8ff') });
  if (f === 4) Object.assign(m, { metalness: .6, roughness: .12, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.8 });
  if (f === 5) Object.assign(m, { metalness: 1, roughness: .05, clearcoat: 1, clearcoatRoughness: 0 });
  return m;
}
function glassMaterial(tint) {
  const t = [[.22, 0x9fb4c8], [.5, 0x46525e], [.78, 0x1a1f26], [.93, 0x07080a]][tint] || [.5, 0x46525e];
  return new THREE.MeshPhysicalMaterial({ color: t[1], metalness: 0, roughness: .03, transparent: true, opacity: t[0], clearcoat: 1, envMapIntensity: 2 });
}

// ---------- лофт: кузов из плавных поперечных сечений ----------
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function keysAt(keys, z) {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (z <= keys[i][0]) { const [z0, y0] = keys[i - 1], [z1, y1] = keys[i], t = (z - z0) / (z1 - z0 || 1), q = (1 - Math.cos(t * Math.PI)) / 2; return y0 + (y1 - y0) * q; }
  return keys[keys.length - 1][1];
}
function loftGeo(zs, M, ring) {
  const pos = [], idx = [];
  for (const z of zs) for (let j = 0; j < M; j++) { const [x, y] = ring(z, j / M); pos.push(x, y, z); }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, b, c, b, d, c); }
  for (const [i, dir] of [[0, -1], [zs.length - 1, 1]]) {
    let cx = 0, cy = 0; for (let j = 0; j < M; j++) { cx += pos[(i * M + j) * 3]; cy += pos[(i * M + j) * 3 + 1]; }
    const ci = pos.length / 3; pos.push(cx / M, cy / M, zs[i] + dir * .01);
    for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M; if (dir > 0) idx.push(ci, a, b); else idx.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function superRing(hw, yb, yt, t, n, tumble) {
  const a = t * TAU, c = Math.cos(a), s = Math.sin(a), e = 2 / n, mid = (yt + yb) / 2;
  let x = hw * Math.sign(c) * Math.pow(Math.abs(c), e); const y = mid + (yt - yb) / 2 * Math.sign(s) * Math.pow(Math.abs(s), e);
  const k = (y - yb) / Math.max(.01, yt - yb); x *= 1 - tumble * k * k; return [x, y, k];
}
function bodyProfile(d, wide = 0) {
  const p = d.p, F = d.L / 2, Rr = -d.L / 2, fa = d.wb / 2 + .04, ra = -d.wb / 2 + .04, aR = d.R + .07 + wide * .02, wy = d.R;
  const top = [[Rr, p.tail - .06], [Rr + .14, p.tail + .02], [Rr + .42, p.trunk], [p.zD, p.belt], [p.zA, p.belt], [p.zA + .2, p.hoodR], [F - .5, p.hoodF], [F - .12, p.noseY + .06], [F, p.noseY - .06]];
  const yt0 = z => keysAt(top, z);
  const hw = z => { const u = (z - Rr) / d.L; return d.W / 2 * (1 - .17 * Math.pow(sstep(.84, 1, u), 1.4) - .1 * (1 - sstep(0, .12, u))); };
  const yb0 = z => { const u = (z - Rr) / d.L; let yb = .27 + .07 * (1 - sstep(0, .05, u)) + .05 * sstep(.95, 1, u); for (const ax of [fa, ra]) { const dz = z - ax; if (Math.abs(dz) < aR) yb = Math.max(yb, wy + Math.sqrt(aR * aR - dz * dz) * .96); } return yb; };
  const fl = .04 + wide * .05, flare = z => fl * (Math.exp(-Math.pow((z - fa) / (.55 + wide * .08), 2)) + 1.25 * Math.exp(-Math.pow((z - ra) / (.6 + wide * .08), 2)));
  return { F, Rr, yt0, yb0, hw, flare, fa, ra };
}
function bodyGeo(d, wide) {
  const pr = bodyProfile(d, wide), zs = []; for (let i = 0; i <= 96; i++) zs.push(pr.Rr + d.L * i / 96);
  return loftGeo(zs, 36, (z, t) => {
    const u = (z - pr.Rr) / d.L; let yt = pr.yt0(z), yb = Math.min(pr.yb0(z), yt - .07), w = pr.hw(z);
    const e = Math.max(sstep(.972, 1, u), 1 - sstep(0, .028, u)), mid = (yt + yb) / 2; w *= 1 - .45 * e * e; yt = lerp(yt, mid + (yt - mid) * .5, e); yb = lerp(yb, mid - (mid - yb) * .5, e);
    const [x, y, k] = superRing(w, yb, yt, t, 5, .1); return [x * (1 + pr.flare(z) * Math.exp(-Math.pow((k - .42) / .3, 2))), y];
  });
}
function cabinGeo(d, Wc, lift = 0, thick = 0) {
  const p = d.p, keys = [[p.zD, p.belt - .02], [p.zC, p.roof], [p.zB, p.roof], [p.zA, p.belt - .02]], zs = [];
  const z0 = thick ? p.zC - .04 : p.zD, z1 = thick ? p.zB + .04 : p.zA; for (let i = 0; i <= 40; i++) zs.push(z0 + (z1 - z0) * i / 40);
  return loftGeo(zs, 28, (z, t) => {
    const yt = keysAt(keys, z) + lift, yb = thick ? yt - thick : p.belt - .06, u = (z - z0) / (z1 - z0), w = Wc / 2 * (1 - .06 * Math.pow(Math.abs(u - .5) * 2, 3)) * (thick ? 1.015 : 1);
    return superRing(w, yb, yt, t, thick ? 6 : 4, .26).slice(0, 2);
  });
}
// полоса по верху кузова: x∈[x0,x1] на поверхности сечения
function topStrip(zs, x0, x1, surf, lift = .006) {
  const S = 4, pos = [], idx = [];
  zs.forEach((z, i) => { for (let k = 0; k <= S; k++) { const x = lerp(x0, x1, k / S); pos.push(x, surf(x, z) + lift, z); } if (i) for (let k = 0; k < S; k++) { const a = (i - 1) * (S + 1) + k, b = a + 1, c = a + S + 1, dd = c + 1; idx.push(a, c, b, b, c, dd); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function surfTop(yb, yt, w, x, n, tumble) { const X = clamp(Math.abs(x) / (w * (1 - tumble)), 0, .999); return (yt + yb) / 2 + (yt - yb) / 2 * Math.pow(1 - Math.pow(X, n), 1 / n); }
function beam(a, b, t, mat) { const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(t, t, len), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b); return m; }
function box(w, h, l, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat); m.position.set(x, y, z); return m; }
function cyl(r0, r1, h, mat, seg = 16, open = false) { return new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat); }

// ---------- колёса ----------
function makeWheel(cfg, d, left) {
  const R = d.R, rimR = R * [.6, .66, .72, .78][cfg.wsize], w = .27 + cfg.wsize * .015 + cfg.fenders * .02, st = WHEEL_STYLES[cfg.wheel];
  const rimMat = new THREE.MeshStandardMaterial({ color: WHEEL_COLORS[cfg.wcol], metalness: .85, roughness: .26, envMapIntensity: 1.3 });
  const spin = new THREE.Group();
  const pts = [[rimR, -w / 2], [R - .05, -w / 2], [R - .012, -w / 2 + .03], [R, -w / 2 + .07], [R + .004, 0], [R, w / 2 - .07], [R - .012, w / 2 - .03], [R - .05, w / 2], [rimR, w / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), Mat.rubber); tire.rotation.z = Math.PI / 2; spin.add(tire);
  const barrel = cyl(rimR, rimR, w * .9, rimMat, 40, true); barrel.rotation.z = Math.PI / 2; spin.add(barrel);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR - .006, .014, 8, 48), st === 'deepdish' || st === 'rotor' ? Mat.chrome : rimMat); lip.rotation.y = Math.PI / 2; lip.position.x = w / 2 - .01; spin.add(lip);
  const deep = st === 'deepdish' || st === 'rotor', face = new THREE.Group(); face.position.x = w / 2 - (deep ? .1 : .03); spin.add(face);
  const hub = cyl(rimR * .22, rimR * .24, .05, rimMat, 20); hub.rotation.z = Math.PI / 2; face.add(hub);
  const cap = cyl(rimR * .1, rimR * .1, .06, Mat.chrome, 16); cap.rotation.z = Math.PI / 2; cap.position.x = .012; face.add(cap);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, n = cyl(.011, .011, .03, Mat.chrome, 6); n.rotation.z = Math.PI / 2; n.position.set(.02, Math.cos(a) * rimR * .15, Math.sin(a) * rimR * .15); face.add(n); }
  const spoke = (ang, wd, th, tw = 0, len = .82, rOff = .55) => { const m = new THREE.Mesh(new THREE.BoxGeometry(th, rimR * len, wd), rimMat); m.position.set(0, Math.cos(ang) * rimR * rOff, Math.sin(ang) * rimR * rOff); m.rotation.x = -ang; m.rotation.y = tw; face.add(m); };
  if (st === '5spoke') for (let i = 0; i < 5; i++) spoke(i / 5 * TAU, rimR * .28, .045);
  if (st === 'mesh') for (let i = 0; i < 10; i++) { spoke(i / 10 * TAU + .18, rimR * .07, .03); spoke(i / 10 * TAU - .18, rimR * .07, .03); }
  if (st === 'deepdish') { for (let i = 0; i < 6; i++) spoke(i / 6 * TAU, rimR * .16, .04); const dish = cyl(rimR, rimR * .95, .09, Mat.chrome, 40, true); dish.rotation.z = Math.PI / 2; dish.position.x = w / 2 - .05; spin.add(dish); }
  if (st === 'turbine') for (let i = 0; i < 14; i++) spoke(i / 14 * TAU, rimR * .12, .03, .45);
  if (st === 'multi') for (let i = 0; i < 7; i++) { spoke(i / 7 * TAU + .09, rimR * .07, .04); spoke(i / 7 * TAU - .09, rimR * .07, .04); }
  if (st === 'star6') for (let i = 0; i < 6; i++) { spoke(i / 6 * TAU, rimR * .2, .05, 0, .5, .38); spoke(i / 6 * TAU + .26, rimR * .08, .035, 0, .5, .72); spoke(i / 6 * TAU - .26, rimR * .08, .035, 0, .5, .72); }
  if (st === 'cross') { for (let i = 0; i < 10; i++) { spoke(i / 10 * TAU + .3, rimR * .05, .025); spoke(i / 10 * TAU - .3, rimR * .05, .025); } for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, rv = cyl(.008, .008, .02, Mat.chrome, 6); rv.rotation.z = Math.PI / 2; rv.position.set(.01, Math.cos(a) * rimR * .92, Math.sin(a) * rimR * .92); face.add(rv); } }
  if (st === 'split5') for (let i = 0; i < 5; i++) { spoke(i / 5 * TAU + .12, rimR * .1, .04); spoke(i / 5 * TAU - .12, rimR * .1, .04); }
  if (st === 'steelie') { const disc = cyl(rimR * .95, rimR * .95, .03, rimMat, 36); disc.rotation.z = Math.PI / 2; face.add(disc); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, h = cyl(rimR * .1, rimR * .1, .04, Mat.black, 12); h.rotation.z = Math.PI / 2; h.position.set(.005, Math.cos(a) * rimR * .62, Math.sin(a) * rimR * .62); face.add(h); } }
  if (st === 'rotor') { for (let i = 0; i < 5; i++) spoke(i / 5 * TAU, rimR * .34, .06, 0, .7, .5); const ring = new THREE.Mesh(new THREE.TorusGeometry(rimR * .62, .03, 8, 40), rimMat); ring.rotation.y = Math.PI / 2; face.add(ring); }
  const disc = cyl(rimR * .86, rimR * .86, .025, Mat.disc, 36); disc.rotation.z = Math.PI / 2; disc.position.x = .02; spin.add(disc);
  const brakes = new THREE.Group(), cal = new THREE.Mesh(new THREE.BoxGeometry(.07, rimR * .5, rimR * .28), new THREE.MeshStandardMaterial({ color: CALIPERS[cfg.caliper], roughness: .35, metalness: .3 }));
  cal.position.set(.05, rimR * .45, -rimR * .45); cal.rotation.x = .8; brakes.add(cal);
  const camber = new THREE.Group(); camber.add(spin); camber.add(brakes); if (left) camber.rotation.y = Math.PI;
  const pivot = new THREE.Group(); pivot.add(camber); tire.castShadow = barrel.castShadow = true;
  return { pivot, camber, spin };
}

// ---------- сборка машины ----------
function buildCar(id, cfg, opts = {}) {
  const d = CARS[id], p = d.p, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = paintMaterial(cfg), glass = glassMaterial(cfg.tint), wide = cfg.fenders, lightCol = new THREE.Color(LIGHT_COLS[cfg.lightCol]);
  const add = (m, parent = body) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const pr = bodyProfile(d, wide), F = d.L / 2, Rr = -d.L / 2;
  const bodyMesh = add(new THREE.Mesh(bodyGeo(d, wide), paint));
  const Wc = d.W * .86, cabin = add(new THREE.Mesh(cabinGeo(d, Wc), glass)), roofM = add(new THREE.Mesh(cabinGeo(d, Wc, .014, .07), paint));
  // стойки, молдинги, зеркала
  for (const sx of [-1, 1]) {
    const x = sx * (Wc / 2 - .01), xt = x * .76;
    add(beam(new THREE.Vector3(x, p.belt, p.zA - .05), new THREE.Vector3(xt, p.roof - .02, p.zB + .02), .05, paint));
    add(beam(new THREE.Vector3(xt, p.roof - .02, p.zC - .02), new THREE.Vector3(x, p.belt, p.zD + .05), .08, paint));
    add(beam(new THREE.Vector3(x * 1.005, p.belt - .01, p.zA - .08), new THREE.Vector3(x * 1.005, p.belt - .01, p.zD + .1), .025, cfg.finish === 5 ? Mat.gloss : Mat.chrome));
    const mx = sx * (pr.hw(p.zA - .1) * .9 + .02);
    add(box(.1, .03, .05, Mat.black, mx, p.belt + .03, p.zA - .12)); add(box(.15, .09, .12, paint, mx + sx * .1, p.belt + .07, p.zA - .14)); add(box(.01, .07, .1, Mat.chrome, mx + sx * .18, p.belt + .07, p.zA - .14));
    add(box(.02, .025, .14, Mat.black, sx * (pr.hw(0) * .95 + .005), p.belt - .1, (p.zA + p.zD) / 2 + .1));
    // швы дверей
    for (const z of [p.zA - .05, (p.zB + p.zC) / 2 - .1]) add(box(.012, p.belt - .38, .012, Mat.black, sx * pr.hw(z) * .985, (p.belt + .38) / 2, z));
    // боковые воздухозаборники суперкара
    if (id === 'raijin') { const v = add(box(.05, .16, .5, Mat.grille, sx * pr.hw(-.9) * .96, .62, -.85)); v.rotation.y = sx * .08; }
  }
  // салон
  const seatZ = (p.zB + p.zC) / 2 + .15;
  for (const sx of [-1, 1]) { add(box(.4, .08, .42, Mat.interior, sx * .34, p.belt - .06, seatZ)); const bk = add(box(.4, .34, .09, Mat.interior, sx * .34, p.belt + .12, seatZ - .24)); bk.rotation.x = -.18; }
  const sw = new THREE.Mesh(new THREE.TorusGeometry(.14, .018, 8, 20), Mat.interior); sw.position.set(-.34, p.belt + .1, p.zA - .3); sw.rotation.x = -.5; body.add(sw);
  add(box(d.W * .7, .08, .3, Mat.interior, 0, p.belt - .02, p.zA - .15));
  // ---- фары ----
  const hz = F - .1, hy = pr.yt0(hz) - .07, hx = pr.hw(hz) * .66, head = [], headGlow = [];
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: lightCol, emissiveIntensity: 2.4, roughness: .1 });
  add(box(d.W * .38, .1, .08, Mat.grille, 0, hy - .12, F - .05));
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * hx, hy, hz); g.rotation.set(-.35, sx * .25, 0); body.add(g);
    add(box(.42, .11, .1, Mat.gloss), g);
    if (cfg.heads === 0) { add(box(.36, .055, .1, headMat, 0, .005, .015), g); }
    if (cfg.heads === 1) { add(box(.4, .018, .1, headMat, 0, .03, .02), g); for (const px of [-.1, .1]) { const pj = cyl(.03, .03, .06, headMat, 12); pj.rotation.x = Math.PI / 2; pj.position.set(px, -.01, .03); g.add(pj); } }
    if (cfg.heads === 2) for (const px of [-.1, .1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.04, .008, 6, 20), headMat); r.position.set(px, 0, .055); g.add(r); const pj = cyl(.022, .022, .04, Mat.chrome, 12); pj.rotation.x = Math.PI / 2; pj.position.set(px, 0, .04); g.add(pj); }
    if (cfg.heads === 3) for (let i = 0; i < 4; i++) { const pj = cyl(.022, .022, .06, headMat, 12); pj.rotation.x = Math.PI / 2; pj.position.set(-.14 + i * .093, 0, .03); g.add(pj); }
    if (cfg.heads === 4) { add(box(.36, .05, .1, headMat, 0, -.015, .015), g); const lid = add(box(.43, .05, .11, paint, 0, .04, .012), g); lid.rotation.x = .25; }
    const lens = new THREE.Mesh(new THREE.BoxGeometry(.43, .12, .02), Mat.lens); lens.position.z = .06; g.add(lens);
    head.push(g); const gl = new THREE.Sprite(Mat.glow.clone()); gl.material.color.copy(lightCol); gl.scale.set(.9, .9, 1); gl.position.set(sx * hx, hy, hz + .15); gl.visible = false; body.add(gl); headGlow.push(gl);
  }
  // ---- стопы ----
  const tz = Rr + .06, ty = pr.yt0(tz) - .1, tw = pr.hw(tz) * .8;
  const tailMat = new THREE.MeshStandardMaterial({ color: cfg.tails === 2 ? 0x1a0505 : 0x550000, emissive: 0xff1a1a, emissiveIntensity: .8, roughness: .15 });
  if (cfg.tails === 1) add(box(tw * 2, .04, .06, tailMat, 0, ty + .02, tz - .02)); else add(box(tw * 1.6, .03, .06, Mat.gloss, 0, ty, tz - .02));
  for (const sx of [-1, 1]) { const tl = add(box(.34, .1, .08, tailMat, sx * (tw - .12), ty, tz)); tl.rotation.y = -sx * .2; if (cfg.tails !== 1) for (let i = 0; i < 3; i++) add(box(.3, .008, .082, Mat.grille, sx * (tw - .12), ty - .03 + i * .03, tz)); }
  const tailGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Mat.glow.map, color: 0xff2020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); tailGlow.scale.set(2.2, .8, 1); tailGlow.position.set(0, ty, tz - .25); body.add(tailGlow);
  // номера
  const pl = add(box(.44, .11, .01, Mat.plate, 0, .5, Rr + .04)); pl.rotation.y = Math.PI; add(box(.44, .11, .01, Mat.plate, 0, hy - .2, F - .02));
  // ---- выхлоп ----
  const exh = [], ex = cfg.exhaust, tip = (x, y, z, r, rot = 0) => { const t = cyl(r, r * .92, .24, Mat.exhaust, 18, true); t.rotation.x = Math.PI / 2; t.position.set(x, y, z); if (rot) { t.rotation.set(0, 0, Math.PI / 2); t.rotation.y = rot; } body.add(t); const s = cyl(r * .8, r * .8, .02, Mat.soot, 14); s.rotation.copy(t.rotation); s.position.set(x, y, z + (rot ? 0 : .08)); body.add(s); };
  if (ex === 0) for (const sx of [-1, 1]) { tip(sx * .45, .3, Rr - .03, .05); exh.push(new THREE.Vector3(sx * .45, .3, Rr - .18)); }
  if (ex === 1) for (const sx of [-1, 1]) for (const o of [-.07, .07]) { tip(sx * .5 + o, .3, Rr - .03, .042); exh.push(new THREE.Vector3(sx * .5 + o, .3, Rr - .17)); }
  if (ex === 2) { tip(-.06, .32, Rr - .03, .065); tip(.06, .32, Rr - .03, .065); exh.push(new THREE.Vector3(-.06, .32, Rr - .19), new THREE.Vector3(.06, .32, Rr - .19)); }
  if (ex === 3) for (const sx of [-1, 1]) { const z = -d.wb / 2 + .55; tip(sx * (pr.hw(z) + .02), .28, z, .045, sx * Math.PI / 2); exh.push(new THREE.Vector3(sx * (pr.hw(z) + .15), .28, z)); }
  // ---- обвес ----
  if (cfg.front === 1) add(box(d.W * .9, .03, .2, Mat.carbon, 0, .25, F - .03));
  if (cfg.front === 2) { add(box(d.W * .94, .035, .26, Mat.carbon, 0, .24, F - .02)); for (const sx of [-1, 1]) add(box(.26, .13, .04, Mat.grille, sx * (d.W / 2 - .45), .38, F - .03)); }
  if (cfg.front === 3) { add(box(d.W * 1.0, .04, .36, Mat.carbon, 0, .22, F + .02)); for (const sx of [-1, 1]) { const c = add(box(.24, .02, .14, Mat.carbon, sx * (d.W / 2 - .02), .42, F - .12)); c.rotation.z = sx * .25; add(box(.02, .1, .3, Mat.carbon, sx * d.W * .47, .28, F - .05)); } }
  if (cfg.front === 4) { add(box(d.W * .9, .06, .1, Mat.black, 0, .3, F + .03)); for (const sx of [-1, 1]) { const fl = cyl(.08, .08, .07, Mat.black, 18); fl.rotation.x = Math.PI / 2; fl.position.set(sx * .4, .42, F + .04); body.add(fl); const lg = cyl(.065, .065, .02, headMat, 18); lg.rotation.x = Math.PI / 2; lg.position.set(sx * .4, .42, F + .08); body.add(lg); } }
  if (cfg.rear === 1) { add(box(d.W * .78, .05, .32, Mat.carbon, 0, .26, Rr + .12)); for (let i = -2; i <= 2; i++) add(box(.02, .11, .3, Mat.carbon, i * .28, .31, Rr + .1)); }
  if (cfg.rear === 2) { add(box(d.W * .96, .06, .5, Mat.carbon, 0, .24, Rr + .15)); for (let i = -3; i <= 3; i++) add(box(.02, .16, .45, Mat.carbon, i * .24, .3, Rr + .14)); add(box(.08, .08, .08, new THREE.MeshStandardMaterial({ color: 0xdc2626 }), -.55, .3, Rr - .05)); }
  if (cfg.rear === 3) for (const sx of [-1, 1]) add(box(.28, .26, .02, Mat.black, sx * d.tr / 2, .2, -d.wb / 2 + .04 - d.R - .12));
  const hoodY = z => pr.yt0(z) + .045;
  if (cfg.hood === 1) for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const z = F - .75 - i * .1, v = add(box(.36, .015, .05, Mat.grille, sx * .36, hoodY(z) + .004, z)); v.rotation.x = -.15; }
  if (cfg.hood === 2 || cfg.hood === 3) {
    const z0 = p.zA + .22, z1 = F - .35, zs = []; for (let i = 0; i <= 20; i++) zs.push(z0 + (z1 - z0) * i / 20);
    add(new THREE.Mesh(loftGeo(zs, 24, (z, t) => { const yt = pr.yt0(z); return superRing(pr.hw(z) * .7, yt - .03, yt + .062, t, 6, .1).slice(0, 2); }), cfg.hood === 2 ? Mat.carbon : paint));
    const zm = (z0 + z1) / 2 + .1, sc = add(box(.5, .12, .55, cfg.hood === 2 ? Mat.carbon : paint, 0, hoodY(zm) + .08, zm)); sc.rotation.x = -Math.atan2(pr.yt0(zm + .3) - pr.yt0(zm - .3), .6); add(box(.42, .07, .02, Mat.grille, 0, hoodY(zm) + .08, zm + .28));
  }
  if (cfg.hood === 4) { const z0 = p.zA + .2, z1 = F - .5, zs = []; for (let i = 0; i <= 20; i++) zs.push(z0 + (z1 - z0) * i / 20);
    add(new THREE.Mesh(loftGeo(zs, 20, (z, t) => { const yt = pr.yt0(z), q = Math.sin(clamp((z - z0) / (z1 - z0), 0, 1) * Math.PI); return superRing(.32, yt - .03, yt + .04 + .05 * q, t, 3, 0).slice(0, 2); }), paint)); }
  if (cfg.fenders) for (const ax of [pr.fa, pr.ra]) for (const sx of [-1, 1]) { // накладные расширители
    const arc = new THREE.Mesh(new THREE.TorusGeometry(d.R + .1, .045 + wide * .02, 8, 24, Math.PI), cfg.fenders === 1 ? Mat.black : paint); arc.rotation.y = Math.PI / 2; arc.position.set(sx * (d.tr / 2 + .06 + wide * .05), d.R, ax); add(arc);
    if (cfg.fenders === 2) for (let i = 0; i < 6; i++) { const a = .3 + i / 5 * (Math.PI - .6), bl = cyl(.012, .012, .02, Mat.chrome, 6); bl.rotation.z = Math.PI / 2; bl.position.set(sx * (d.tr / 2 + .12 + wide * .06), d.R + Math.sin(a) * (d.R + .1), ax + Math.cos(a) * (d.R + .1)); body.add(bl); }
  }
  if (cfg.skirts) for (const sx of [-1, 1]) add(box(.07 + cfg.skirts * .03, .08, d.wb - .5, cfg.skirts === 2 ? Mat.carbon : Mat.black, sx * (pr.hw(0) * .93 + .03 + wide * .04), .29, .04));
  // спойлеры
  const sp = cfg.spoiler, wingAt = (h, wz, span, big, neck) => {
    const af = new THREE.Shape(); af.moveTo(.18, 0); af.quadraticCurveTo(.05, .07, -.22, .035); af.lineTo(-.22, 0); af.quadraticCurveTo(.05, .02, .18, 0);
    const g = new THREE.ExtrudeGeometry(af, { depth: span, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -span / 2); g.rotateY(-Math.PI / 2);
    const wing = add(new THREE.Mesh(g, Mat.carbon)); wing.position.set(0, p.trunk + h, wz); wing.rotation.x = big ? .14 : .06;
    for (const sx of [-1, 1]) { if (neck) { const n = add(beam(new THREE.Vector3(sx * .45, p.trunk + h + .06, wz - .05), new THREE.Vector3(sx * .45, p.trunk, wz + .25), .04, Mat.black)); } else add(box(.04, h, .16, Mat.carbon, sx * .5, p.trunk + h / 2, wz)); }
    if (big) for (const sx of [-1, 1]) add(box(.02, .18, .44, Mat.carbon, sx * span / 2, p.trunk + h + .03, wz));
  };
  if (sp === 1) { const dt = add(box(d.W * .86, .05, .2, paint, 0, p.trunk + .03, Rr + .22)); dt.rotation.x = -.35; }
  if (sp === 2) add(box(d.W * .8, .025, .08, Mat.carbon, 0, pr.yt0(Rr + .1) + .01, Rr + .1));
  if (sp === 3) { const rs = add(box(Wc * .72, .03, .3, paint, 0, p.roof + .02, p.zC - .12)); rs.rotation.x = .12; }
  if (sp === 4) wingAt(.2, Rr + .3, d.W * .9, false);
  if (sp === 5) wingAt(.38, Rr + .3, d.W * .95, true);
  if (sp === 6) wingAt(.34, Rr + .25, d.W * .98, true, true);
  if (sp === 7) wingAt(.5, Rr + .28, d.W * 1.05, true);
  // полосы
  if (cfg.stripes) {
    const sm = new THREE.MeshPhysicalMaterial({ color: STRIPE_COLS[cfg.stripeCol], roughness: .3, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    const bodySurf = (x, z) => { const u = (z - pr.Rr) / d.L, yt = pr.yt0(z), yb = Math.min(pr.yb0(z), yt - .07); return surfTop(yb, yt, pr.hw(z), x, 5, .1); };
    const roofSurf = (x, z) => { const keys = [[p.zD, p.belt - .02], [p.zC, p.roof], [p.zB, p.roof], [p.zA, p.belt - .02]], yt = keysAt(keys, z) + .014; return surfTop(yt - .07, yt, Wc / 2 * 1.015, x, 6, .26); };
    const range = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
    const bands = cfg.stripes === 1 ? [[-.26, -.1], [.1, .26]] : cfg.stripes === 2 ? [[-.2, .2]] : [];
    for (const [x0, x1] of bands) { add(new THREE.Mesh(topStrip(range(p.zA + .05, F - .2), x0, x1, bodySurf), sm)); add(new THREE.Mesh(topStrip(range(p.zC + .05, p.zB - .05, 10), x0, x1, roofSurf), sm)); add(new THREE.Mesh(topStrip(range(Rr + .2, p.zD - .05, 10), x0, x1, bodySurf), sm)); }
    if (cfg.stripes === 3) for (const sx of [-1, 1]) add(box(.012, .06, d.L * .7, sm, sx * pr.hw(0) * .99, p.belt - .2, 0));
  }
  // подсветка днища
  let neonLight = null;
  if (cfg.neon) { const col = NEONS[cfg.neon], nm = new THREE.MeshBasicMaterial({ color: col }); for (const sx of [-1, 1]) body.add(box(.03, .02, d.wb, nm, sx * (d.W / 2 - .12), .22, 0)); body.add(box(d.W * .7, .02, .03, nm, 0, .22, d.L / 2 - .3));
    if (!opts.noLights) { neonLight = new THREE.PointLight(col, 5, 5.5, 2); neonLight.position.set(0, .15, 0); body.add(neonLight); } }
  // контактная тень и пятно фар
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(d.W * 1.6, d.L * 1.35), Mat.shadow); sh.rotation.x = -Math.PI / 2; sh.position.y = .015; root.add(sh);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 16), Mat.pool.clone()); pool.material.color.copy(lightCol); pool.rotation.x = -Math.PI / 2; pool.position.set(0, .03, F + 8.5); pool.visible = false; root.add(pool);
  // колёса
  const wheels = [];
  for (const [x, z, front] of [[-1, 1, 1], [1, 1, 1], [-1, -1, 0], [1, -1, 0]]) {
    const w = makeWheel(cfg, d, x < 0), trk = d.tr + wide * .08;
    w.pivot.position.set(x * trk / 2, d.R, z * (d.wb / 2 + .04)); w.camber.rotation.z = cfg.camber * .03; w.front = front; w.side = x; w.baseCamber = cfg.camber * .03; root.add(w.pivot); wheels.push(w);
  }
  body.position.y = -cfg.height * .035 + .01;
  // исходные вершины для вмятин
  const deform = [bodyMesh, roofM].map(m => ({ m, orig: Float32Array.from(m.geometry.attributes.position.array) }));
  root.userData = { id, d, body, wheels, head, headGlow, headMat, tailMat, tailGlow, exh, paint, glass, neonLight, pool, deform, trk: d.tr + wide * .08 };
  return root;
}
// вмятина в точке удара (локальные координаты кузова)
function dentCar(car, lx, ly, lz, depth) {
  for (const { m } of car.userData.deform) {
    const a = m.geometry.attributes.position, arr = a.array, r = .75;
    for (let i = 0; i < arr.length; i += 3) { const dx = arr[i] - lx, dy = arr[i + 1] - ly, dz = arr[i + 2] - lz, d2 = dx * dx + dy * dy + dz * dz; if (d2 < r * r) { const k = Math.pow(1 - Math.sqrt(d2) / r, 2) * depth; arr[i] -= Math.sign(arr[i]) * k * Math.abs(lx) / (Math.abs(lx) + Math.abs(lz) + .01); arr[i + 2] -= Math.sign(arr[i + 2]) * k * Math.abs(lz) / (Math.abs(lx) + Math.abs(lz) + .01); arr[i + 1] += (Math.random() - .5) * k * .2; } }
    a.needsUpdate = true; m.geometry.computeVertexNormals();
  }
}
function repairCar(car) { for (const { m, orig } of car.userData.deform) { m.geometry.attributes.position.array.set(orig); m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals(); } }
function disposeTree(o) { o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material && !Object.values(Mat).includes(m.material)) { if (Array.isArray(m.material)) m.material.forEach(x => x.dispose()); else m.material.dispose(); } }); }
