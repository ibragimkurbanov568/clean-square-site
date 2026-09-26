// Сборка 3D-города из данных генератора: земля, здания (объединёнными кусками по районам), деревья,
// фонари, светофоры, дворовые объекты, бордюры, река. Всё «инстансами» или склеенными сетками — мало вызовов отрисовки.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R } from './render';
import { City, Building, CITY, HALF, PITCH, roadLine, RIVER, blockRect } from './citygen';
import { groundMaterial, facadeMaterial, districtTexture, windMaterial } from './materials';
import { mulberry32 } from '../core/util';

const CHUNK = 4; // город режется на 4×4 куска для отсечения
const chunkOf = (x: number, z: number) => { const c = (v: number) => Math.max(0, Math.min(CHUNK - 1, Math.floor((v + HALF) / (2 * HALF) * CHUNK))); return c(x) * CHUNK + c(z); };

// ---------- здания ----------
const STYLE: Record<string, number> = { panel: 0, tower: 0, khrush: 1, stalin: 2, office: 3, house: 4, warehouse: 5, factory: 5, shop: 3, garage: 6, special: 2 };
const MW: Record<number, number> = { 0: 3, 1: 2.7, 2: 3.3, 3: 1.6, 4: 3.4, 5: 6, 6: 3, 9: 3 };
class GeoAcc {
  pos: number[] = []; nrm: number[] = []; uv: number[] = []; col: number[] = []; aB: number[] = []; aC: number[] = []; idx: number[] = [];
  // четырёхугольник: углы p0..p3 (против часовой снаружи), uv в метрах
  quad(p: number[][], n: number[], uvs: number[][], c: THREE.Color, B: number[], C: number[]) {
    // порядок вершин выравниваем по нормали, чтобы грань смотрела наружу
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { p = [...p].reverse(); uvs = [...uvs].reverse(); }
    const b = this.pos.length / 3;
    for (let k = 0; k < 4; k++) { this.pos.push(...p[k]); this.nrm.push(...n); this.uv.push(...uvs[k]); this.col.push(c.r, c.g, c.b); this.aB.push(...B); this.aC.push(...C); }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  // коробка без дна; flags: 1 магазин, 4 глухая, 8 фасад с подъездами — для передней грани (−z)
  box(x: number, y: number, z: number, w: number, h: number, d: number, c: THREE.Color, st: number, fh: number, seed: number, flags: number, H = h) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h, mw = MW[st] ?? 3;
    const off = (L: number) => ((mw - (L % mw)) / 2) % mw;
    const face = (p: number[][], n: number[], L: number, f: number) => { const o = off(L); this.quad(p, n, [[o, y], [o + L, y], [o + L, y1], [o, y1]], c, [fh, st, seed, f], [H, L, mw]); };
    const side = flags & 5; // магазин/глухость для всех, подъезды — только спереди
    face([[x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], w, flags);
    face([[x1, y, z1], [x0, y, z1], [x0, y1, z1], [x1, y1, z1]], [0, 0, 1], w, side);
    face([[x1, y, z0], [x1, y, z1], [x1, y1, z1], [x1, y1, z0]], [1, 0, 0], d, side);
    face([[x0, y, z1], [x0, y, z0], [x0, y1, z0], [x0, y1, z1]], [-1, 0, 0], d, side);
    this.quad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], [[x0, z0], [x0, z1], [x1, z1], [x1, z0]], c, [fh, st, seed, 2], [H, w, mw]);
  }
  prism(x: number, y: number, z: number, w: number, h: number, d: number, c: THREE.Color, seed: number) {
    // двускатная крыша вдоль длинной стороны
    const alongX = w >= d, x0 = x - w / 2 - .4, x1 = x + w / 2 + .4, z0 = z - d / 2 - .4, z1 = z + d / 2 + .4, yt = y + h;
    const B = [3, 9, seed, 4], C = [h, 1, 3];
    if (alongX) {
      const n1 = new THREE.Vector3(0, d, -2 * h).normalize(), n2 = new THREE.Vector3(0, d, 2 * h).normalize();
      this.quad([[x0, y, z0], [x1, y, z0], [x1, yt, z], [x0, yt, z]].reverse() as any, [n1.x, n1.y, n1.z], [[0, 0], [0, 1], [1, 1], [1, 0]], c, B, C);
      this.quad([[x1, y, z1], [x0, y, z1], [x0, yt, z], [x1, yt, z]].reverse() as any, [n2.x, n2.y, n2.z], [[0, 0], [0, 1], [1, 1], [1, 0]], c, B, C);
      this.tri([x0, y, z0], [x0, y, z1], [x0, yt, z], [-1, 0, 0], c, B, C); this.tri([x1, y, z1], [x1, y, z0], [x1, yt, z], [1, 0, 0], c, B, C);
    } else {
      const n1 = new THREE.Vector3(-2 * h, w, 0).normalize(), n2 = new THREE.Vector3(2 * h, w, 0).normalize();
      this.quad([[x0, y, z1], [x0, y, z0], [x, yt, z0], [x, yt, z1]].reverse() as any, [n1.x, n1.y, n1.z], [[0, 0], [0, 1], [1, 1], [1, 0]], c, B, C);
      this.quad([[x1, y, z0], [x1, y, z1], [x, yt, z1], [x, yt, z0]].reverse() as any, [n2.x, n2.y, n2.z], [[0, 0], [0, 1], [1, 1], [1, 0]], c, B, C);
      this.tri([x1, y, z0], [x0, y, z0], [x, yt, z0], [0, 0, -1], c, B, C); this.tri([x0, y, z1], [x1, y, z1], [x, yt, z1], [0, 0, 1], c, B, C);
    }
  }
  tri(a: number[], b: number[], c2: number[], n: number[], c: THREE.Color, B: number[], C: number[]) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]];
    if ((e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[1] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[2] < 0) [b, c2] = [c2, b];
    const s = this.pos.length / 3; for (const p of [a, b, c2]) { this.pos.push(...p); this.nrm.push(...n); this.uv.push(0, 0); this.col.push(c.r, c.g, c.b); this.aB.push(...B); this.aC.push(...C); } this.idx.push(s, s + 1, s + 2);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aB', new THREE.Float32BufferAttribute(this.aB, 4)); g.setAttribute('aC', new THREE.Float32BufferAttribute(this.aC, 3)); g.setIndex(this.idx);
    g.computeBoundingSphere(); return g;
  }
}
function addBuilding(acc: GeoAcc, b: Building) {
  const st = STYLE[b.type] ?? 2, c = new THREE.Color(b.color), flags = (b.shop ? 1 : 0) | 8;
  acc.box(b.x, 0, b.z, b.w, b.h, b.d, c, st, b.floorH, b.seed, flags);
  const r = mulberry32(b.seed * 31), dark = c.clone().multiplyScalar(.8);
  if (b.roof === 'pitched') acc.prism(b.x, b.h, b.z, b.w, 2.6, b.d, new THREE.Color([0x7a2e22, 0x3d5a3d, 0x5a4a40, 0x6a6e74][b.seed % 4]), b.seed);
  if (b.type === 'panel' || b.type === 'tower' || b.type === 'khrush') {
    // машинные отделения лифтов, парапет
    const n = b.type === 'tower' ? 1 : Math.max(1, Math.round(Math.max(b.w, b.d) / 30));
    for (let k = 0; k < n; k++) { const t = (k + .5) / n - .5; acc.box(b.x + (b.w > b.d ? t * b.w : 0), b.h, b.z + (b.w > b.d ? 0 : t * b.d), 5, 2.6, 4, dark, 9, 3, b.seed, 4); }
    // балконы: на передней стороне через модуль
    if (b.type !== 'khrush' && b.w > b.d) {
      const mw = MW[0], L = b.w, o = ((mw - (L % mw)) / 2) % mw, cols = Math.floor(L / mw);
      for (let f = 1; f < b.floors; f++) for (let ci = 0; ci < cols; ci++) {
        if ((ci + b.seed) % 3 !== 0) continue; const x = b.x - L / 2 - o + (ci + .5) * mw;
        if (x < b.x - L / 2 + 1.5 || x > b.x + L / 2 - 1.5) continue;
        acc.box(x, f * b.floorH - .05, b.z - b.d / 2 - .6, mw * .82, 1.05, 1.2, r() < .2 ? new THREE.Color(0xd8d0c0) : dark, 9, 3, b.seed, 4);
      }
    }
    // козырьки подъездов
    const mw = MW[st], L = b.w, o = ((mw - (L % mw)) / 2) % mw, cols = Math.floor(L / mw);
    for (let ci = 0; ci < cols; ci++) if ((ci + b.seed) % 4 === 1 && !b.shop) { const x = b.x - L / 2 - o + (ci + .5) * mw; if (x > b.x - L / 2 + 1 && x < b.x + L / 2 - 1) acc.box(x, 2.45, b.z - b.d / 2 - .8, 2.4, .15, 1.6, dark, 9, 3, b.seed, 4); }
  }
  if (b.type === 'office' && b.floors > 6) { acc.box(b.x, b.h, b.z, b.w * .5, 3, b.d * .5, dark, 9, 3, b.seed, 4); }
  if (b.type === 'stalin') { acc.box(b.x, b.h - .5, b.z, b.w + .6, .5, b.d + .6, c.clone().multiplyScalar(1.05), 9, 3, b.seed, 4); }
}

// ---------- деревья, фонари, светофоры, объекты ----------
function colGeo(g: THREE.BufferGeometry, hex: number, jitter = 0, seed = 1) {
  g = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(hex), n = g.attributes.position.count, cols = new Float32Array(n * 3), r = mulberry32(seed);
  for (let i = 0; i < n; i++) { const k = 1 - jitter * r(); cols.set([c.r * k, c.g * k, c.b * k], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.deleteAttribute('uv'); return g;
}
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz)));
function lumpy(r: number, detail: number, seed: number) { const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rr = mulberry32(seed); for (let i = 0; i < p.count; i++) { const k = .82 + rr() * .3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; }
function treeGeo(kind: number) {
  if (kind === 0) { // берёза
    const t = colGeo(at(new THREE.CylinderGeometry(.1, .16, 7, 6), 0, 3.5, 0), 0xe8e6de, .1);
    const c = [colGeo(at(lumpy(1.9, 1, 3), 0, 6.4, 0, 0, 1, 1.5, 1), 0x7fa446, .25, 2), colGeo(at(lumpy(1.5, 1, 4), .6, 5.2, .4, 0, 1, 1.3, 1), 0x8cb24e, .25, 3)];
    return mergeGeometries([t, ...c]);
  }
  if (kind === 1) { // липа / тополь
    const t = colGeo(at(new THREE.CylinderGeometry(.18, .3, 4, 7), 0, 2, 0), 0x4a3a2c, .1);
    const c = [colGeo(at(lumpy(2.6, 1, 5), 0, 5.6, 0), 0x4f7a32, .3, 4), colGeo(at(lumpy(2, 1, 6), 1.3, 4.9, .6), 0x5a8a38, .3, 5), colGeo(at(lumpy(1.9, 1, 7), -1.1, 5.1, -.7), 0x46702c, .3, 6)];
    return mergeGeometries([t, ...c]);
  }
  const t = colGeo(at(new THREE.CylinderGeometry(.15, .25, 3, 6), 0, 1.5, 0), 0x5a4030, .1); // ель
  const c = [0, 1, 2].map(k => colGeo(at(new THREE.ConeGeometry(2.4 - k * .6, 3.2, 8), 0, 3.4 + k * 1.9, 0), 0x2f5a32, .25, 8 + k));
  return mergeGeometries([t, ...c]);
}
function lampGeo() {
  const pole = colGeo(at(new THREE.CylinderGeometry(.08, .12, 8, 8), 0, 4, 0), 0x5b6066);
  const arm = colGeo(at(new THREE.BoxGeometry(.08, .08, 2.2), 0, 7.9, 1.05), 0x5b6066);
  return mergeGeometries([pole, arm]);
}
function propGeo(p: City['props'][number]): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [], { x, z, rot } = p;
  const put = (geo: THREE.BufferGeometry, hex: number, lx: number, ly: number, lz: number) => { const c = Math.cos(rot), s = Math.sin(rot); g.push(colGeo(at(geo, x + lx * c + lz * s, ly, z - lx * s + lz * c, rot), hex, .08)); };
  if (p.kind === 'bench') { put(new THREE.BoxGeometry(1.8, .08, .45), 0x8a5a34, 0, .45, 0); put(new THREE.BoxGeometry(1.8, .4, .06), 0x8a5a34, 0, .7, -.2); put(new THREE.BoxGeometry(.08, .45, .4), 0x333333, -.8, .22, 0); put(new THREE.BoxGeometry(.08, .45, .4), 0x333333, .8, .22, 0); }
  if (p.kind === 'swing') { put(new THREE.BoxGeometry(.1, 2.4, .1), 0xc0392b, -1.4, 1.2, 0); put(new THREE.BoxGeometry(.1, 2.4, .1), 0xc0392b, 1.4, 1.2, 0); put(new THREE.BoxGeometry(2.9, .1, .1), 0xc0392b, 0, 2.4, 0); put(new THREE.BoxGeometry(.5, .06, .3), 0x2e86c1, -.5, .6, 0); put(new THREE.BoxGeometry(.5, .06, .3), 0x2e86c1, .6, .6, 0); }
  if (p.kind === 'slide') { put(new THREE.BoxGeometry(1, 1.6, 1), 0xf1c40f, 0, .8, 0); put(at(new THREE.BoxGeometry(.7, .05, 2.6), 0, 0, 0).rotateX(-.55), 0x27ae60, 0, .8, 1.5); }
  if (p.kind === 'bin') { for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(1.1, 1.1, .9), [0x2e7d32, 0x5d6d7e, 0x2e7d32][k], (k - 1) * 1.3, .55, 0); }
  if (p.kind === 'kiosk') { put(new THREE.BoxGeometry(2.6, 2.5, 2), 0xe8e1d0, 0, 1.25, 0); put(new THREE.BoxGeometry(2.8, .3, 2.2), 0x1f6fb2, 0, 2.6, 0); }
  if (p.kind === 'bus_stop') { put(new THREE.BoxGeometry(4, .1, 1.6), 0x3a4a5a, 0, 2.6, 0); put(new THREE.BoxGeometry(4, 2.4, .05), 0x9fb4c8, 0, 1.3, -.75); put(new THREE.BoxGeometry(3, .08, .4), 0x8a5a34, 0, .5, -.4); put(new THREE.BoxGeometry(.08, 2.6, .08), 0x3a4a5a, -1.9, 1.3, .7); put(new THREE.BoxGeometry(.08, 2.6, .08), 0x3a4a5a, 1.9, 1.3, .7); }
  if (p.kind === 'fountain') { put(new THREE.CylinderGeometry(7, 7.3, .7, 28), 0xb8b2a6, 0, .35, 0); put(new THREE.CylinderGeometry(6.4, 6.4, .12, 28), 0x3d6a86, 0, .62, 0); put(new THREE.CylinderGeometry(.6, 1, 2.4, 12), 0xb8b2a6, 0, 1.2, 0); put(new THREE.CylinderGeometry(2, 1.6, .3, 16), 0xb8b2a6, 0, 2.4, 0); }
  if (p.kind === 'flag') { put(new THREE.CylinderGeometry(.08, .1, 14, 8), 0xcccccc, 0, 7, 0); put(new THREE.BoxGeometry(.04, 1.4, 2.4), 0xffffff, 0, 13, 1.2); }
  if (p.kind === 'chimney') { const h = p.s || 40; put(new THREE.CylinderGeometry(1.6, 2.6, h, 14), 0xb04a3a, 0, h / 2, 0); put(new THREE.CylinderGeometry(1.7, 1.7, 2, 14), 0xeeeeee, 0, h - 4, 0); }
  if (p.kind === 'container') { put(new THREE.BoxGeometry(6, 2.6, 2.4), [0x2e5e8e, 0xb03a2e, 0x2e7d4f, 0xd3a032][Math.abs(Math.round(x * 7 + z)) % 4], 0, 1.3, 0); }
  if (p.kind === 'fence') { const w = p.w || 100; for (const [dx, dz, ww, dd] of [[0, -w / 2, w, .15], [0, w / 2, w, .15], [-w / 2, 0, .15, w], [w / 2, 0, .15, w]]) g.push(colGeo(at(new THREE.BoxGeometry(ww, 2.2, dd), x + dx, 1.1, z + dz), 0x7a8288, .05)); }
  return g;
}

export interface CityMeshes { root: THREE.Group; chunks: THREE.Object3D[][]; lampHeads: THREE.InstancedMesh[]; lampPos: THREE.Vector3[]; bulbs: THREE.InstancedMesh; bulbMap: { i: number; j: number; axis: 0 | 1 }[]; glow: THREE.Points }
export function buildCity(city: City): CityMeshes {
  const root = new THREE.Group(), chunks: THREE.Object3D[][] = Array.from({ length: CHUNK * CHUNK }, () => []);
  const q = R.quality;
  // земля
  const codes = city.districts.map(col => col.map(d => ({ res: 0, khrush: 0, plaza: 1, industry: 2, park: 3, private: 4, center: 5, office: 6 } as any)[d]));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200, 1, 1).rotateX(-Math.PI / 2), groundMaterial(districtTexture(codes)));
  ground.receiveShadow = true; root.add(ground);
  // здания по кускам
  const facade = facadeMaterial(), accs = Array.from({ length: CHUNK * CHUNK }, () => new GeoAcc());
  for (const b of city.buildings) addBuilding(accs[chunkOf(b.x, b.z)], b);
  accs.forEach((a, k) => { if (!a.pos.length) return; const m = new THREE.Mesh(a.geo(), facade); m.castShadow = q !== 'low'; m.receiveShadow = true; root.add(m); chunks[k].push(m); });
  // бордюры кварталов (невысокие) — одна сетка
  const curbs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < CITY.N; i++) for (let j = 0; j < CITY.N; j++) {
    const rc = blockRect(i, j); // бордюр по краю проезжей части
    for (const [x, z, w, d] of [[rc.cx, rc.z0 + .12, CITY.BLOCK, .25], [rc.cx, rc.z1 - .12, CITY.BLOCK, .25], [rc.x0 + .12, rc.cz, .25, CITY.BLOCK], [rc.x1 - .12, rc.cz, .25, CITY.BLOCK]] as number[][])
      curbs.push(colGeo(at(new THREE.BoxGeometry(w, .14, d), x, .07, z), 0xa8aca8, .05));
  }
  // деревья-инстансы по кускам и по видам + лес за городом
  const rng = mulberry32(99), trees = [...city.trees];
  for (let k = 0; k < (q === 'low' ? 700 : 1600); k++) { const a = rng() * Math.PI * 2, rr = HALF + 60 + rng() * 520, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (z > RIVER.z0 - 10 && z < RIVER.z1 + 10) continue; if (Math.abs(z - roadLine(6)) < 14 && x > 0) continue; if (Math.abs(x - roadLine(6)) < 14 && z < 0) continue; trees.push({ x, z, s: .9 + rng() * .6, kind: rng() < .5 ? 2 : rng() < .5 ? 0 : 1 }); }
  const tg = [0, 1, 2].map(treeGeo), tm = windMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }));
  const buckets = new Map<string, typeof trees>();
  for (const t of trees) { const key = `${chunkOf(t.x, t.z)}:${t.kind}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key)!.push(t); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (const [key, list] of buckets) {
    const [ch, kind] = key.split(':').map(Number), im = new THREE.InstancedMesh(tg[kind], tm, list.length);
    list.forEach((t, i) => { M.compose(P.set(t.x, 0, t.z), Q.setFromAxisAngle(Y, (t.x * 13 + t.z) % 6.28), S.setScalar(t.s)); im.setMatrixAt(i, M); });
    im.castShadow = q === 'high'; im.receiveShadow = false; im.computeBoundingSphere(); root.add(im); chunks[ch].push(im);
  }
  // фонари
  const lg = lampGeo(), lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .6 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffc87a, emissiveIntensity: 0 });
  const lampHeads: THREE.InstancedMesh[] = [], lampPos: THREE.Vector3[] = [], lb = new Map<number, typeof city.lamps>();
  for (const l of city.lamps) { const k = chunkOf(l.x, l.z); if (!lb.has(k)) lb.set(k, []); lb.get(k)!.push(l); }
  const glowPos: number[] = [];
  for (const [k, list] of lb) {
    const im = new THREE.InstancedMesh(lg, lampMat, list.length), hm = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, .15, .9), headMat, list.length);
    list.forEach((l, i) => { Q.setFromAxisAngle(Y, l.rot); M.compose(P.set(l.x, 0, l.z), Q, S.setScalar(1)); im.setMatrixAt(i, M); const hx = l.x + Math.sin(l.rot) * 2.1, hz = l.z + Math.cos(l.rot) * 2.1; M.compose(P.set(hx, 7.85, hz), Q, S.setScalar(1)); hm.setMatrixAt(i, M); lampPos.push(new THREE.Vector3(hx, 7.6, hz)); glowPos.push(hx, 7.7, hz); });
    im.castShadow = q === 'high'; root.add(im, hm); chunks[k].push(im, hm); lampHeads.push(hm);
  }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,160,1)'); gr.addColorStop(.25, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const glow = new THREE.Points(gg, new THREE.PointsMaterial({ map: glowTex, size: 5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: true }));
  root.add(glow);
  // светофоры: столбы на углах, по три лампы на каждую из 4 сторон
  const poles: THREE.BufferGeometry[] = [], bulbMap: CityMeshes['bulbMap'] = [];
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(.2, .2, .08), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), city.lights.length * 4 * 3);
  let bi = 0; const hr = CITY.ROAD / 2 + 1;
  for (const L of city.lights) {
    const cx = roadLine(L.i), cz = roadLine(L.j);
    // сторона: светофор стоит справа от въезжающих машин, смотрит на них
    const sides: [number, number, number, 0 | 1][] = [[cx - hr, cz - hr, 0, 1], [cx + hr, cz + hr, Math.PI, 1], [cx + hr, cz - hr, -Math.PI / 2, 0], [cx - hr, cz + hr, Math.PI / 2, 0]];
    for (const [x, z, ry, axis] of sides) {
      poles.push(colGeo(at(new THREE.CylinderGeometry(.07, .09, 3.2, 6), x, 1.6, z), 0x3a3f44));
      poles.push(colGeo(at(new THREE.BoxGeometry(.38, 1.1, .3), x, 3.4, z, ry), 0x1a1c1e));
      for (let k = 0; k < 3; k++) { M.compose(P.set(x + Math.sin(ry) * -.17, 3.75 - k * .34, z + Math.cos(ry) * -.17), Q.identity(), S.setScalar(1)); bulbs.setMatrixAt(bi, M); bulbs.setColorAt(bi, new THREE.Color(0x111111)); bi++; }
      bulbMap.push({ i: L.i, j: L.j, axis });
    }
  }
  bulbs.frustumCulled = false; root.add(bulbs);
  // дворовые объекты и бордюры — одной сеткой
  const pg = [...curbs, ...poles]; for (const p of city.props) pg.push(...propGeo(p));
  const propMesh = new THREE.Mesh(mergeGeometries(pg), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 })); propMesh.castShadow = q !== 'low'; propMesh.receiveShadow = true; root.add(propMesh);
  // река: вода, набережная, мост-пирс
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4200, RIVER.z1 - RIVER.z0).rotateX(-Math.PI / 2), waterMaterial()); water.position.set(0, -1.2, (RIVER.z0 + RIVER.z1) / 2); root.add(water);
  const emb: THREE.BufferGeometry[] = [];
  for (const z of [RIVER.z0, RIVER.z1]) emb.push(colGeo(at(new THREE.BoxGeometry(4200, 5, 1.2), 0, -2.5, z), 0xa8a39a, .05));
  for (let x = -HALF; x < HALF; x += 3) emb.push(colGeo(at(new THREE.BoxGeometry(.08, 1, .08), x, .5, RIVER.z0 - .5), 0x2a2a2a));
  emb.push(colGeo(at(new THREE.BoxGeometry(4200, .06, .06), 0, 1, RIVER.z0 - .5), 0x2a2a2a));
  const embM = new THREE.Mesh(mergeGeometries(emb), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 })); root.add(embM);
  R.scene.add(root);
  return { root, chunks, lampHeads, lampPos, bulbs, bulbMap, glow };
}
function waterMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x1d3a44, roughness: .06, metalness: .2, transparent: true, opacity: .92 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = R.U.uTime;
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'uniform float uTime; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `
      vec2 p = vWp.xz; float t = uTime;
      vec3 wn = normalize(vec3(sin(p.x*.35 + t*1.1)*.08 + sin(p.x*1.3 + p.y*.7 + t*2.3)*.04, 1., cos(p.y*.4 + t*.9)*.08 + sin(p.y*1.7 - p.x*.5 + t*2.9)*.04));
      normal = normalize((viewMatrix * vec4(wn, 0.)).xyz);`);
  };
  return m;
}
// обновление по времени суток и расстоянию до камеры
export function updateCity(cm: CityMeshes, cam: THREE.Vector3, night: number) {
  const far = (R.scene.fog as THREE.Fog).far + 150;
  for (let k = 0; k < cm.chunks.length; k++) {
    const cx = -HALF + (Math.floor(k / CHUNK) + .5) * (2 * HALF / CHUNK), cz = -HALF + ((k % CHUNK) + .5) * (2 * HALF / CHUNK);
    const d = Math.max(0, Math.hypot(cam.x - cx, cam.z - cz) - HALF / CHUNK * 1.42), vis = d < far;
    for (const o of cm.chunks[k]) o.visible = vis;
  }
  for (const h of cm.lampHeads) (h.material as THREE.MeshStandardMaterial).emissiveIntensity = night * 2.5;
  (cm.glow.material as THREE.PointsMaterial).opacity = night * .55;
}
export { PITCH };
