// ==== 7. CARS: каталог, детали и процедурные 3D-модели ====
// Размеры в метрах. Перед машины смотрит в +Z.
const CARS = {
  kaze: { name: 'Kaze GT', price: 0, L: 4.3, W: 1.76, wb: 2.5, tr: 1.56, R: .33, mass: 1150, power: 10500, top: 64, grip: 1, steer: .58, paint: '#d7263d',
    p: { noseY: .54, hoodF: .82, hoodR: .9, belt: .93, zA: .55, zB: -.28, zC: -.95, zD: -1.5, roof: 1.3, trunk: .98, tail: .95 } },
  hornet: { name: 'Hornet RS', price: 8000, L: 4.0, W: 1.74, wb: 2.46, tr: 1.54, R: .32, mass: 1040, power: 10000, top: 60, grip: 1.12, steer: .62, paint: '#f5c518',
    p: { noseY: .58, hoodF: .86, hoodR: .95, belt: .98, zA: .62, zB: .02, zC: -1.5, zD: -1.86, roof: 1.43, trunk: 1.02, tail: 1.02 } },
  titan: { name: 'Titan V8', price: 15000, L: 4.75, W: 1.9, wb: 2.78, tr: 1.7, R: .35, mass: 1480, power: 15500, top: 71, grip: .92, steer: .52, paint: '#1c3faa',
    p: { noseY: .64, hoodF: .92, hoodR: .99, belt: .99, zA: .15, zB: -.48, zC: -1.08, zD: -1.62, roof: 1.33, trunk: 1.03, tail: 1.0 } },
  raijin: { name: 'Raijin R', price: 40000, L: 4.5, W: 1.96, wb: 2.66, tr: 1.74, R: .35, mass: 1290, power: 19000, top: 84, grip: 1.16, steer: .6, paint: '#16a34a',
    p: { noseY: .5, hoodF: .8, hoodR: .82, belt: .86, zA: .95, zB: .08, zC: -.8, zD: -1.65, roof: 1.16, trunk: .95, tail: .92 } },
};
const PAINTS = ['#d7263d', '#f5c518', '#1c3faa', '#16a34a', '#0f0f12', '#f4f4f5', '#8e8e93', '#ff6a00', '#7c3aed', '#ec4899', '#06b6d4', '#7f1d1d', '#0b3d2e', '#c9a227', '#3b3024', '#64748b'];
const WHEEL_COLORS = ['#c0c4ca', '#1a1a1c', '#d4af37', '#e5e7eb', '#7f1d1d', '#1e3a8a', '#3f3f46', '#ff6a00'];
const CALIPERS = ['#b91c1c', '#facc15', '#2563eb', '#16a34a', '#e5e7eb', '#1a1a1c'];
const NEONS = [null, '#22d3ee', '#ec4899', '#4ade80', '#ff6a00', '#a855f7'];
const WHEEL_STYLES = ['5spoke', 'mesh', 'deepdish', 'turbine', 'multi'];
// цены деталей: индекс — вариант
const PRICES = {
  finish: [0, 800, 1200, 2000, 5000], wheel: [0, 1200, 1800, 2500, 3500], wsize: [0, 800, 1500], front: [0, 1500, 3000], rear: [0, 1200, 2600],
  hood: [0, 1200, 2500], spoiler: [0, 900, 2500, 4000], skirts: [0, 1000], tint: [0, 300, 300, 300], neon: [0, 1500, 1500, 1500, 1500, 1500],
  engine: [2000, 3500, 5500, 8000, 12000], turbo: [4000, 7000, 11000], tires: [1500, 2500, 4000, 6000], susp: [1800, 3000, 5000], weight: [2500, 4500, 7000], nitro: [2000, 4000, 7000],
};
const UPGRADES = ['engine', 'turbo', 'tires', 'susp', 'weight', 'nitro'];
function defaultConfig(id) {
  return { paint: CARS[id].paint, finish: 0, wheel: 0, wcol: 0, wsize: 0, caliper: 0, height: 0, camber: 0, front: 0, rear: 0, hood: 0, spoiler: 0, skirts: 0, tint: 1, neon: 0,
    up: { engine: 0, turbo: 0, tires: 0, susp: 0, weight: 0, nitro: 0 } };
}
function carConfig(id) { const s = H.save; if (!s.cars[id]) s.cars[id] = defaultConfig(id); const c = s.cars[id]; c.up = Object.assign(defaultConfig(id).up, c.up); return c; }
function owns(id, part, v) { if (!v) return true; const k = `${id}:${part}:${v}`; return !!H.save.parts[k]; }
function carStats(id, cfg) {
  const d = CARS[id], u = cfg.up;
  return { power: d.power * (1 + .14 * u.engine + .13 * u.turbo), mass: d.mass * (1 - .055 * u.weight), grip: d.grip * (1 + .07 * u.tires), steer: d.steer * (1 + .06 * u.susp),
    top: d.top * (1 + .04 * u.engine + .05 * u.turbo), nitro: u.nitro, turbo: u.turbo, susp: u.susp };
}

// ---------- материалы ----------
const Mat = {};
function initMaterials() {
  Mat.rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .92, metalness: 0 });
  Mat.black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .55, metalness: .2 });
  Mat.carbon = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: .28, metalness: .5 });
  Mat.chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: .08, metalness: 1 });
  Mat.disc = new THREE.MeshStandardMaterial({ color: 0x77787c, roughness: .35, metalness: .9 });
  Mat.interior = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: .85 });
  Mat.grille = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .6, metalness: .4 });
  Mat.head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 2.2, roughness: .1 });
  Mat.plate = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: .5 });
  Mat.exhaust = new THREE.MeshStandardMaterial({ color: 0x9a9aa0, roughness: .25, metalness: 1 });
}
function paintMaterial(cfg) {
  const f = cfg.finish, m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(cfg.paint) });
  if (f === 0) Object.assign(m, { metalness: .15, roughness: .32, clearcoat: 1, clearcoatRoughness: .04 });
  if (f === 1) Object.assign(m, { metalness: .75, roughness: .32, clearcoat: 1, clearcoatRoughness: .06 });
  if (f === 2) Object.assign(m, { metalness: .1, roughness: .78, clearcoat: 0 });
  if (f === 3) Object.assign(m, { metalness: .45, roughness: .22, clearcoat: 1, clearcoatRoughness: .03, iridescence: .8, iridescenceIOR: 1.6, sheen: .6, sheenColor: new THREE.Color('#9fd8ff') });
  if (f === 4) Object.assign(m, { metalness: 1, roughness: .06, clearcoat: 1, clearcoatRoughness: 0 });
  return m;
}
function glassMaterial(tint) {
  const t = [[.25, 0x9fb4c8], [.55, 0x46525e], [.8, 0x1a1f26], [.94, 0x07080a]][tint] || [.55, 0x46525e];
  return new THREE.MeshPhysicalMaterial({ color: t[1], metalness: 0, roughness: .04, transparent: true, opacity: t[0], clearcoat: 1, envMapIntensity: 1.6 });
}

// ---------- геометрия ----------
function extrudeShape(shape, width, bevel = .08) {
  const depth = Math.max(.01, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel * 1.3, bevelSize: bevel, bevelSegments: 4, curveSegments: 18, steps: 1 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g;
}
// ---------- лофт: кузов из плавных поперечных сечений ----------
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function keysAt(keys, z) {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (z <= keys[i][0]) { const [z0, y0] = keys[i - 1], [z1, y1] = keys[i], t = (z - z0) / (z1 - z0 || 1), q = (1 - Math.cos(t * Math.PI)) / 2; return y0 + (y1 - y0) * q; }
  return keys[keys.length - 1][1];
}
// zs — станции вдоль длины; ring(z, t) → [x, y] для t∈[0,1) по кругу против часовой стрелки (вид спереди)
function loftGeo(zs, M, ring) {
  const pos = [], idx = [];
  for (const z of zs) for (let j = 0; j < M; j++) { const [x, y] = ring(z, j / M); pos.push(x, y, z); }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, b, c, b, d, c); }
  // заглушки на концах
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
function bodyProfile(d) {
  const p = d.p, F = d.L / 2, Rr = -d.L / 2, fa = d.wb / 2 + .04, ra = -d.wb / 2 + .04, aR = d.R + .07, wy = d.R;
  const top = [[Rr, p.tail - .06], [Rr + .14, p.tail + .02], [Rr + .42, p.trunk], [p.zD, p.belt], [p.zA, p.belt], [p.zA + .2, p.hoodR], [F - .5, p.hoodF], [F - .12, p.noseY + .06], [F, p.noseY - .06]];
  const yt0 = z => keysAt(top, z);
  const hw = z => { const u = (z - Rr) / d.L; return d.W / 2 * (1 - .17 * Math.pow(sstep(.84, 1, u), 1.4) - .1 * (1 - sstep(0, .12, u))); };
  const yb0 = z => { const u = (z - Rr) / d.L; let yb = .27 + .07 * (1 - sstep(0, .05, u)) + .05 * sstep(.95, 1, u); for (const ax of [fa, ra]) { const dz = z - ax; if (Math.abs(dz) < aR) yb = Math.max(yb, wy + Math.sqrt(aR * aR - dz * dz) * .96); } return yb; };
  const flare = z => .04 * (Math.exp(-Math.pow((z - fa) / .55, 2)) + 1.25 * Math.exp(-Math.pow((z - ra) / .6, 2)));
  return { F, Rr, yt0, yb0, hw, flare };
}
function bodyGeo(d) {
  const pr = bodyProfile(d), zs = []; for (let i = 0; i <= 72; i++) zs.push(pr.Rr + d.L * i / 72);
  return loftGeo(zs, 28, (z, t) => {
    const u = (z - pr.Rr) / d.L; let yt = pr.yt0(z), yb = Math.min(pr.yb0(z), yt - .07), w = pr.hw(z);
    const e = Math.max(sstep(.972, 1, u), 1 - sstep(0, .028, u)), mid = (yt + yb) / 2; w *= 1 - .45 * e * e; yt = lerp(yt, mid + (yt - mid) * .5, e); yb = lerp(yb, mid - (mid - yb) * .5, e);
    const [x, y, k] = superRing(w, yb, yt, t, 5, .1); return [x * (1 + pr.flare(z) * Math.exp(-Math.pow((k - .42) / .3, 2))), y];
  });
}
function cabinGeo(d, Wc, lift = 0, thick = 0) {
  const p = d.p, keys = [[p.zD, p.belt - .02], [p.zC, p.roof], [p.zB, p.roof], [p.zA, p.belt - .02]], zs = [];
  const z0 = thick ? p.zC - .04 : p.zD, z1 = thick ? p.zB + .04 : p.zA; for (let i = 0; i <= 36; i++) zs.push(z0 + (z1 - z0) * i / 36);
  return loftGeo(zs, 24, (z, t) => {
    const yt = keysAt(keys, z) + lift, yb = thick ? yt - thick : p.belt - .06, u = (z - z0) / (z1 - z0), w = Wc / 2 * (1 - .06 * Math.pow(Math.abs(u - .5) * 2, 3)) * (thick ? 1.015 : 1);
    return superRing(w, yb, yt, t, thick ? 6 : 4, .26).slice(0, 2);
  });
}
function beam(a, b, t, mat) { // тонкая балка между двумя точками
  const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(t, t, len), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b); return m;
}
function box(w, h, l, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat); m.position.set(x, y, z); return m; }

function makeWheel(cfg, d, left) {
  const R = d.R, rimR = R * [.63, .7, .77][cfg.wsize], w = .28 + cfg.wsize * .015, rimMat = cfg.finish === 4 && cfg.wheel === 2 ? Mat.chrome : new THREE.MeshStandardMaterial({ color: WHEEL_COLORS[cfg.wcol], metalness: .85, roughness: .28 });
  const spin = new THREE.Group();
  // шина — вращение профиля сечения
  const pts = [[rimR, -w / 2], [R - .045, -w / 2], [R - .008, -w / 2 + .03], [R, -w / 2 + .06], [R, w / 2 - .06], [R - .008, w / 2 - .03], [R - .045, w / 2], [rimR, w / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), Mat.rubber); tire.rotation.z = Math.PI / 2; spin.add(tire);
  // обод и бочка
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, w * .92, 36, 1, true), rimMat); barrel.rotation.z = Math.PI / 2; spin.add(barrel);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR - .006, .014, 8, 40), cfg.wheel === 2 ? Mat.chrome : rimMat); lip.rotation.y = Math.PI / 2; lip.position.x = w / 2 - .01; spin.add(lip);
  const faceX = w / 2 - (cfg.wheel === 2 ? .09 : .03), face = new THREE.Group(); face.position.x = faceX; spin.add(face);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(rimR * .22, rimR * .24, .05, 20), rimMat); hub.rotation.z = Math.PI / 2; face.add(hub);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rimR * .1, rimR * .1, .06, 16), Mat.chrome); cap.rotation.z = Math.PI / 2; cap.position.x = .012; face.add(cap);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, n = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .03, 6), Mat.chrome); n.rotation.z = Math.PI / 2; n.position.set(.02, Math.cos(a) * rimR * .15, Math.sin(a) * rimR * .15); face.add(n); }
  const spoke = (ang, wd, th, tw = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(th, rimR * .82, wd), rimMat); m.position.set(0, Math.cos(ang) * rimR * .55, Math.sin(ang) * rimR * .55); m.rotation.x = -ang; m.rotation.y = tw; face.add(m); };
  const st = WHEEL_STYLES[cfg.wheel];
  if (st === '5spoke') for (let i = 0; i < 5; i++) spoke(i / 5 * TAU, rimR * .28, .045);
  if (st === 'mesh') for (let i = 0; i < 10; i++) { spoke(i / 10 * TAU + .18, rimR * .07, .03); spoke(i / 10 * TAU - .18, rimR * .07, .03); }
  if (st === 'deepdish') { face.position.x = w / 2 - .1; for (let i = 0; i < 6; i++) spoke(i / 6 * TAU, rimR * .16, .04); const dish = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR * .96, .09, 36, 1, true), Mat.chrome); dish.rotation.z = Math.PI / 2; dish.position.x = w / 2 - .05; spin.add(dish); }
  if (st === 'turbine') for (let i = 0; i < 14; i++) spoke(i / 14 * TAU, rimR * .12, .03, .45);
  if (st === 'multi') for (let i = 0; i < 7; i++) { spoke(i / 7 * TAU + .09, rimR * .07, .04); spoke(i / 7 * TAU - .09, rimR * .07, .04); }
  // тормоза (не вращаются вместе с колесом)
  const brakes = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(rimR * .86, rimR * .86, .025, 32), Mat.disc); disc.rotation.z = Math.PI / 2; disc.position.x = .02; spin.add(disc);
  const cal = new THREE.Mesh(new THREE.BoxGeometry(.07, rimR * .5, rimR * .28), new THREE.MeshStandardMaterial({ color: CALIPERS[cfg.caliper], roughness: .35, metalness: .3 }));
  cal.position.set(.05, rimR * .45, -rimR * .45); cal.rotation.x = .8; brakes.add(cal);
  const camber = new THREE.Group(); camber.add(spin); camber.add(brakes);
  if (left) camber.rotation.y = Math.PI; // лицевая сторона диска наружу
  const pivot = new THREE.Group(); pivot.add(camber);
  tire.castShadow = barrel.castShadow = true;
  return { pivot, camber, spin };
}

function buildCar(id, cfg, opts = {}) {
  const d = CARS[id], p = d.p, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = paintMaterial(cfg), glass = glassMaterial(cfg.tint), trimMat = cfg.finish === 4 ? Mat.chrome : Mat.black;
  const add = (m, parent = body) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // кузов, кабина-стекло, крыша
  const pr = bodyProfile(d);
  add(new THREE.Mesh(bodyGeo(d), paint));
  const Wc = d.W * .86; add(new THREE.Mesh(cabinGeo(d, Wc), glass));
  add(new THREE.Mesh(cabinGeo(d, Wc, .014, .07), paint));
  for (const sx of [-1, 1]) {
    const x = sx * (Wc / 2 - .01), xt = x * .76;
    add(beam(new THREE.Vector3(x, p.belt, p.zA - .05), new THREE.Vector3(xt, p.roof - .02, p.zB + .02), .05, paint));
    add(beam(new THREE.Vector3(xt, p.roof - .02, p.zC - .02), new THREE.Vector3(x, p.belt, p.zD + .05), .08, paint));
    // зеркала на ножке
    const mx = sx * (pr.hw(p.zA - .1) * .9 + .02);
    add(box(.1, .03, .05, Mat.black, mx, p.belt + .03, p.zA - .12)); add(box(.15, .09, .12, paint, mx + sx * .1, p.belt + .07, p.zA - .14)); add(box(.01, .07, .1, Mat.chrome, mx + sx * .18, p.belt + .07, p.zA - .14));
    // ручка двери
    add(box(.02, .025, .14, Mat.black, sx * (pr.hw(0) * .95 + .005), p.belt - .1, (p.zA + p.zD) / 2 + .1));
  }
  // салон
  const seatZ = (p.zB + p.zC) / 2 + .15;
  for (const sx of [-1, 1]) { add(box(.4, .08, .42, Mat.interior, sx * .34, p.belt - .06, seatZ)); const bk = add(box(.4, .34, .09, Mat.interior, sx * .34, p.belt + .12, seatZ - .24)); bk.rotation.x = -.18; }
  const sw = new THREE.Mesh(new THREE.TorusGeometry(.14, .018, 8, 20), Mat.interior); sw.position.set(-.34, p.belt + .1, p.zA - .3); sw.rotation.x = -.5; body.add(sw);
  // решётка, фары, стопы, номера
  const F = d.L / 2, Rr = -d.L / 2;
  const hz = F - .1, hy = pr.yt0(hz) - .07, hx = pr.hw(hz) * .66;
  add(box(d.W * .38, .1, .08, Mat.grille, 0, hy - .12, F - .05));
  const head = [];
  for (const sx of [-1, 1]) {
    const hb = add(box(.4, .1, .1, Mat.black, sx * hx, hy, hz)); hb.rotation.y = sx * .25; hb.rotation.x = -.35;
    const h = add(box(.34, .05, .1, Mat.head, sx * hx, hy + .005, hz + .015)); h.rotation.copy(hb.rotation); head.push(h);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: .8, roughness: .2 });
  const tz = Rr + .06, ty = pr.yt0(tz) - .1, tw = pr.hw(tz) * .8;
  add(box(tw * 1.6, .05, .06, tailMat, 0, ty, tz - .02));
  for (const sx of [-1, 1]) { const tl = add(box(.34, .1, .08, tailMat, sx * (tw - .12), ty, tz)); tl.rotation.y = -sx * .2; }
  add(box(.42, .12, .02, Mat.plate, 0, .5, Rr + .05));
  // выхлоп
  const exh = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .22, 14, 1, true), Mat.exhaust); e.rotation.x = Math.PI / 2; e.position.set(sx * .45, .3, Rr - .05); body.add(e); exh.push(new THREE.Vector3(sx * .45, .3, Rr - .18)); }
  // ---- обвес ----
  if (cfg.front >= 1) { add(box(d.W * .92, .035, .22, Mat.carbon, 0, .25, F - .02)); }
  if (cfg.front === 2) { for (const sx of [-1, 1]) { add(box(.2, .02, .12, Mat.carbon, sx * (d.W / 2 - .05), .42, F - .05)); add(box(.25, .12, .04, Mat.grille, sx * (d.W / 2 - .45), .36, F + .01)); } add(box(d.W * .98, .04, .32, Mat.carbon, 0, .22, F + .02)); }
  if (cfg.rear >= 1) { add(box(d.W * .8, .05, .35, Mat.carbon, 0, .26, Rr + .12)); for (let i = -2; i <= 2; i++) add(box(.02, .12, .3, Mat.carbon, i * .28, .31, Rr + .1)); }
  if (cfg.rear === 2) { add(box(d.W * .96, .06, .5, Mat.carbon, 0, .24, Rr + .15)); add(box(.08, .08, .08, new THREE.MeshStandardMaterial({ color: 0xdc2626 }), -.55, .3, Rr - .05)); }
  const hoodY = z => pr.yt0(z) + .045 * (1 - 0); // верх капота по оси
  if (cfg.hood === 1) for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const z = F - .75 - i * .1; const v = add(box(.36, .015, .05, Mat.grille, sx * .36, hoodY(z) + .004, z)); v.rotation.x = -.15; }
  if (cfg.hood === 2) {
    const z0 = p.zA + .22, z1 = F - .35, zs = []; for (let i = 0; i <= 20; i++) zs.push(z0 + (z1 - z0) * i / 20);
    add(new THREE.Mesh(loftGeo(zs, 24, (z, t) => { const yt = pr.yt0(z); return superRing(pr.hw(z) * .7, yt - .03, yt + .062, t, 6, .1).slice(0, 2); }), Mat.carbon));
    const zm = (z0 + z1) / 2 + .1, sc = add(box(.5, .12, .55, Mat.carbon, 0, hoodY(zm) + .08, zm)); sc.rotation.x = -Math.atan2(pr.yt0(zm + .3) - pr.yt0(zm - .3), .6); add(box(.42, .07, .02, Mat.grille, 0, hoodY(zm) + .08, zm + .28)); }
  if (cfg.spoiler === 1) { const dt = add(box(d.W * .86, .05, .2, paint, 0, p.trunk + .03, Rr + .22)); dt.rotation.x = -.35; }
  if (cfg.spoiler >= 2) {
    const big = cfg.spoiler === 3, h = big ? .42 : .24, wy = p.trunk + h, wz = Rr + .3;
    for (const sx of [-1, 1]) add(box(.04, h, .16, Mat.carbon, sx * .5, p.trunk + h / 2, wz));
    const af = new THREE.Shape(); af.moveTo(.18, 0); af.quadraticCurveTo(.05, .07, -.2, .03); af.lineTo(-.2, 0); af.quadraticCurveTo(.05, .02, .18, 0);
    const wing = add(new THREE.Mesh(extrudeShape(af, d.W * (big ? 1.02 : .92), .01), Mat.carbon)); wing.position.set(0, wy, wz); wing.rotation.x = big ? .12 : .06;
    if (big) for (const sx of [-1, 1]) add(box(.02, .16, .42, Mat.carbon, sx * d.W * .51, wy + .03, wz));
  }
  if (cfg.skirts) for (const sx of [-1, 1]) add(box(.08, .09, d.wb - .45, cfg.finish === 4 ? Mat.chrome : Mat.carbon, sx * (d.W / 2 + .01), .3, .04));
  // подсветка днища
  let neonLight = null;
  if (cfg.neon) { const col = NEONS[cfg.neon], nm = new THREE.MeshBasicMaterial({ color: col }); for (const sx of [-1, 1]) body.add(box(.03, .02, d.wb, nm, sx * (d.W / 2 - .12), .22, 0)); body.add(box(d.W * .7, .02, .03, nm, 0, .22, d.L / 2 - .3));
    if (!opts.noLights) { neonLight = new THREE.PointLight(col, 4, 5, 2); neonLight.position.set(0, .15, 0); body.add(neonLight); } }
  // колёса
  const wheels = [];
  for (const [x, z, front] of [[-1, 1, 1], [1, 1, 1], [-1, -1, 0], [1, -1, 0]]) {
    const w = makeWheel(cfg, d, x < 0); w.pivot.position.set(x * d.tr / 2, d.R, z * (d.wb / 2 + .04)); w.camber.rotation.z = cfg.camber * .03; w.front = front; w.side = x; root.add(w.pivot); wheels.push(w);
  }
  // посадка: ниже кузов — колёса глубже в арках
  body.position.y = -cfg.height * .035 + .01;
  root.userData = { id, d, body, wheels, head, tailMat, exh, paint, glass, neonLight };
  return root;
}
function disposeTree(o) { o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material && !Object.values(Mat).includes(m.material)) { if (Array.isArray(m.material)) m.material.forEach(x => x.dispose()); else m.material.dispose(); } }); }
