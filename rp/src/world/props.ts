// Реальные модели предметов улицы (Poly Haven CC0) и деревьев (Sketchfab/Objaverse CC-BY) вокруг камеры.
// Вдали город рисуется лёгкими процедурными копиями: они скрываются в шейдере в радиусе, где стоят настоящие модели.
// Расстановка детерминирована (одно зерно) и нужна ещё и физике — поэтому генератор отдельный, без Three.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { City, CITY, HALF, PITCH, roadLine, blockRect, blockAt, District, Building } from './citygen';
import { mulberry32 } from '../core/util';
import { R } from './render';
import { windMaterial } from './materials';

const BASE = (import.meta.env.BASE_URL || './') + 'assets/props/';
const EXT = (import.meta.env.VITE_CAR_EXT as string) || '.glb';

export type PropId = 'lamp' | 'bin' | 'manhole' | 'ubox' | 'ubox2' | 'pbox' | 'aircon' | 'barrier' | 'trashbag' | 'cardboard' | 'crate' | 'pcrate' | 'planter' | 'picnic' | 'tyre' | 'lamp2'
  | 'tree_urban' | 'tree_poplar' | 'tree_leafy' | 'tree_oak';
export interface Place { id: PropId; x: number; y: number; z: number; rot: number; s: number }
export const TREE_IDS: PropId[] = ['tree_urban', 'tree_poplar', 'tree_leafy', 'tree_oak'];
// «классические» фонари-торшеры стоят в центре, на площади и набережной; в спальных районах — советские консольные
export const isClassicLamp = (city: City, x: number, z: number) => { const [i, j] = blockAt(x, z), d = city.districts[Math.min(CITY.N - 1, Math.max(0, i))]?.[Math.min(CITY.N - 1, Math.max(0, j))]; return d === 'center' || d === 'plaza' || z > HALF - 20; };
// реальная модель дерева для процедурного вида: 0 — берёза, 1 — липа/тополь, 2 — клён/дуб
export function treeModel(t: { x: number; z: number; kind: number }): { id: PropId; k: number } {
  const h = Math.abs(Math.floor(t.x * 7.13 + t.z * 3.71)) % 4;
  if (t.kind === 0) return { id: 'tree_leafy', k: 1 };
  if (t.kind === 1) return h < 2 ? { id: 'tree_poplar', k: .75 } : { id: 'tree_urban', k: 1 };
  return h === 0 ? { id: 'tree_oak', k: .7 } : { id: 'tree_urban', k: 1.05 };
}

// ---------- расстановка ----------
export function placeProps(city: City): Place[] {
  const r = mulberry32(CITY.SEED ^ 0x5eed), out: Place[] = [], N = CITY.N;
  const add = (id: PropId, x: number, z: number, rot = r() * 6.28, y = 0, s = 1) => out.push({ id, x, y, z, rot, s });
  const dist = (i: number, j: number): District => city.districts[i][j];
  // люки на проезжей части (по полосам) и на тротуарах
  for (let i = 0; i <= N; i++) for (let s = -HALF + 30; s < HALF; s += 38 + r() * 30) {
    const c = roadLine(i), lane = (r() < .5 ? -1 : 1) * (r() < .5 ? 1.75 : 3.6);
    if (((s + HALF) % PITCH) < 10 || ((s + HALF) % PITCH) > PITCH - 10) continue;
    if (r() < .5) add('manhole', c + lane, s, r() * 6.28, .005); else add('manhole', s, c + lane, r() * 6.28, .005);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const d = dist(i, j), rc = blockRect(i, j), urban = d !== 'park' && d !== 'private' && d !== 'industry';
    // тротуар: 4 м внутри квартала; предметы — в 0.8…3 м от бордюра
    const edges: [number, number, number, number, number][] = [ // x0,z0 начало, dx,dz направление, rot «лицом к дороге»
      [rc.x0, rc.z0, 1, 0, Math.PI], [rc.x0, rc.z1, 1, 0, 0], [rc.x0, rc.z0, 0, 1, -Math.PI / 2], [rc.x1, rc.z0, 0, 1, Math.PI / 2]];
    for (const [ex, ez, dx, dz, face] of edges) {
      const nx = Math.sin(face), nz = Math.cos(face); // нормаль наружу, к дороге
      const at = (t: number, inset: number): [number, number] => [ex + dx * t - nx * inset, ez + dz * t - nz * inset];
      // урны каждые ~40 м (в центре чаще), электрошкафы у углов, кадки с цветами в центре
      for (let t = 12 + r() * 10; t < CITY.BLOCK - 10; t += urban ? (d === 'center' || d === 'plaza' ? 26 : 42) : 70) { const [x, z] = at(t, 1.1); add('bin', x, z, face + (r() - .5) * .3); }
      if (r() < .6) { const t = r() < .5 ? 5 + r() * 4 : CITY.BLOCK - 5 - r() * 4, [x, z] = at(t, 3.1); add(r() < .5 ? 'ubox' : 'ubox2', x, z, face); }
      if (r() < .25) { const [x, z] = at(10 + r() * (CITY.BLOCK - 20), 3.4); add('pbox', x, z, face); }
      if (d === 'center' || d === 'plaza' || d === 'office') for (let t = 20; t < CITY.BLOCK - 15; t += 32) { const [x, z] = at(t + 6, 2.9); add('planter', x, z, face + Math.PI / 2); }
    }
    // промзона: бетонные блоки, шины, поддоны
    if (d === 'industry') for (let k = 0; k < 10; k++) { const x = rc.x0 + 8 + r() * (CITY.BLOCK - 16), z = rc.z0 + 8 + r() * (CITY.BLOCK - 16); if (inside(city.buildings, x, z, 2)) continue; if (r() < .6) for (let q = 0; q < 3; q++) add('barrier', x + q * 1.6, z, 0); else { add('tyre', x, z, r() * 6, 0); add('tyre', x + .3, z + .2, r() * 6, .22); add('crate', x + 1.5, z, r() * 6); } }
    // частный сектор: шины-клумбы, ящики у калиток
    if (d === 'private') for (let k = 0; k < 8; k++) { const x = rc.x0 + 6 + r() * (CITY.BLOCK - 12), z = rc.z0 + 6 + r() * (CITY.BLOCK - 12); if (inside(city.buildings, x, z, 1)) continue; add(r() < .5 ? 'tyre' : 'crate', x, z); }
    // парк: столы для пикника
    if (d === 'park') for (let k = 0; k < 5; k++) { const x = rc.cx + (r() - .5) * 70, z = rc.cz + (r() - .5) * 70; if (inside(city.buildings, x, z, 2)) continue; add('picnic', x, z); }
  }
  // здания: кондиционеры на фасадах, мешки и коробки у подъездов/магазинов
  for (const b of city.buildings) {
    const multi = b.floors >= 2 && b.type !== 'warehouse' && b.type !== 'factory' && b.type !== 'garage';
    const faces: [number, number, number, number][] = [[b.x, b.z + b.d / 2, 0, b.w], [b.x, b.z - b.d / 2, Math.PI, b.w], [b.x + b.w / 2, b.z, Math.PI / 2, b.d], [b.x - b.w / 2, b.z, -Math.PI / 2, b.d]];
    if (multi) for (const [fx, fz, rot, len] of faces) {
      const n = Math.min(10, Math.floor(len / 9 * (b.type === 'office' || b.type === 'shop' ? .5 : .8) * r()));
      const tx = Math.cos(rot), tz = -Math.sin(rot), nx = Math.sin(rot), nz = Math.cos(rot);
      for (let k = 0; k < n; k++) { const t = (r() - .5) * (len - 3), fl = 1 + Math.floor(r() * (b.floors - 1)); add('aircon', fx + tx * t + nx * .2, fz + tz * t + nz * .2, rot, fl * b.floorH + .5 + r() * .3, .8); }
    }
    if (b.shop || b.type === 'khrush' || b.type === 'panel' || b.type === 'shop') {
      const [fx, fz, rot, len] = faces[Math.floor(r() * 4)], tx = Math.cos(rot), tz = -Math.sin(rot), nx = Math.sin(rot), nz = Math.cos(rot), t = (r() - .5) * (len - 4);
      const x = fx + tx * t + nx * 1.2, z = fz + tz * t + nz * 1.2;
      for (let k = 0; k < 2 + Math.floor(r() * 4); k++) add(r() < .7 ? 'trashbag' : 'cardboard', x + (r() - .5) * 1.6, z + (r() - .5) * 1.6);
    }
  }
  // у ларьков — ящики с товаром, у остановок — урна
  for (const p of city.props) {
    if (p.kind === 'kiosk') { add('pcrate', p.x + 1.8, p.z - 1.2); add('pcrate', p.x + 1.8, p.z - 1.2, r() * 6, .26); add('cardboard', p.x + 1.7, p.z + 1.4); }
    if (p.kind === 'bus_stop') add('bin', p.x + .6, p.z + 2.6, p.rot + Math.PI);
    if (p.kind === 'bench') add('bin', p.x + Math.cos(p.rot) * 1.3, p.z - Math.sin(p.rot) * 1.3, p.rot);
  }
  // фонари: только «классические» — настоящая модель; советские консольные остаются процедурными
  for (const l of city.lamps) if (isClassicLamp(city, l.x, l.z)) add('lamp', l.x, l.z, l.rot + Math.PI / 2);
  return out.filter(p => !(p.y < .5 && inside(city.buildings, p.x, p.z, .2)));
}
function inside(bs: Building[], x: number, z: number, pad: number) { for (const b of bs) if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return true; return false; }
// размеры для коллайдеров (полуоси), только то, во что реально можно упереться
export const SOLID: Partial<Record<PropId, [number, number, number]>> = { bin: [.3, .45, .3], ubox: [.26, .56, .22], ubox2: [.26, .56, .22], barrier: [.78, .42, .33], planter: [.45, .21, .21], picnic: [1.1, .38, 1.5], pbox: [.3, .25, .2] };

// ---------- модели ----------
interface Part { geo: THREE.BufferGeometry; mat: THREE.Material }
interface Kind { parts: Part[]; meshes: THREE.InstancedMesh[]; cap: number; radius: number; list: Place[] }
const KINDS = new Map<PropId, Kind>();
export const PropCredits: { id: string; author: string; title: string; url: string; license: string; source: string }[] = [];

function bake(mesh: THREE.Mesh) {
  const src = mesh.geometry, g = new THREE.BufferGeometry(), n = src.attributes.position.count;
  const copy = (name: string, size: number) => { const a = src.attributes[name]; if (!a) return null; const o = new Float32Array(n * size); for (let i = 0; i < n; i++) { o[i * size] = a.getX(i); if (size > 1) o[i * size + 1] = a.getY(i); if (size > 2) o[i * size + 2] = a.getZ(i); } return new THREE.BufferAttribute(o, size); };
  g.setAttribute('position', copy('position', 3)!);
  if (!src.attributes.normal) src.computeVertexNormals();
  g.setAttribute('normal', copy('normal', 3)!); g.setAttribute('uv', copy('uv', 2) || new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  g.setIndex(src.index ? Array.from(src.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i));
  const m = mesh.matrixWorld; g.applyMatrix4(m);
  if (m.determinant() < 0) { const a = g.index!.array as any; for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; } }
  return g;
}
// в некоторых наборах Poly Haven лежат два варианта рядом (два бака, два блока кондиционера) — берём левый
const HALF_SET = new Set(['bin', 'aircon']);
function prepare(scene: THREE.Object3D, tree: boolean, half: boolean): Part[] {
  scene.updateMatrixWorld(true);
  const all: [THREE.Material, THREE.BufferGeometry][] = [], box = new THREE.Box3(), c = new THREE.Vector3();
  scene.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; all.push([(Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material, bake(m)]); });
  const kept = half ? all.filter(([, g]) => { g.computeBoundingBox(); return g.boundingBox!.getCenter(c).x < 0; }) : all;
  if (half && kept.length) { box.makeEmpty(); for (const [, g] of kept) box.union(g.boundingBox!); box.getCenter(c); for (const [, g] of kept) g.translate(-c.x, 0, -c.z); }
  const map = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const [mat, g] of kept) { if (!map.has(mat)) map.set(mat, []); map.get(mat)!.push(g); }
  const parts: Part[] = [];
  for (const [mat, gs] of map) {
    const geo = mergeGeometries(gs); if (!geo) continue;
    const sm = mat as THREE.MeshStandardMaterial;
    if (tree) { if (sm.alphaTest > 0 || sm.transparent) { sm.transparent = false; sm.alphaTest = Math.max(sm.alphaTest, .45); sm.side = THREE.DoubleSide; } windMaterial(sm); }
    sm.envMapIntensity = .7;
    parts.push({ geo, mat: sm });
  }
  return parts;
}

// радиусы и лимиты по качеству графики
function budget(id: PropId): { radius: number; cap: number } {
  const q = R.quality, k = q === 'low' ? .55 : q === 'mid' ? .8 : 1;
  if (TREE_IDS.includes(id)) return { radius: 200 * k, cap: Math.round(260 * k) };
  if (id === 'lamp') return { radius: 230 * k, cap: Math.round(220 * k) };
  if (id === 'aircon') return { radius: 110 * k, cap: Math.round(400 * k) };
  if (id === 'manhole') return { radius: 90 * k, cap: 120 };
  return { radius: 85 * k, cap: Math.round(320 * k) };
}

export const Props = {
  group: new THREE.Group(), ready: false, last: new THREE.Vector2(1e9, 1e9), treeR: 0, lampR: 0,
  async load(city: City, places: Place[], onProgress: (k: number) => void) {
    let cat: any[] = [];
    try { cat = await (await fetch(BASE + 'catalog.json')).json(); } catch { return; }
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    // деревья города: те же точки, что у процедурных
    const lists = new Map<PropId, Place[]>();
    for (const p of places) { if (!lists.has(p.id)) lists.set(p.id, []); lists.get(p.id)!.push(p); }
    for (const t of city.trees) { const m = treeModel(t); if (!lists.has(m.id)) lists.set(m.id, []); lists.get(m.id)!.push({ id: m.id, x: t.x, y: 0, z: t.z, rot: (t.x * 13 + t.z) % 6.28, s: t.s * m.k }); }
    let done = 0;
    await Promise.all(cat.filter(c => lists.has(c.id)).map(async (c: any) => {
      try {
        const g = await loader.loadAsync(BASE + c.id + EXT), parts = prepare(g.scene, c.tree, HALF_SET.has(c.id)), { radius, cap } = budget(c.id);
        const meshes = parts.map(p => { const im = new THREE.InstancedMesh(p.geo, p.mat, cap); im.count = 0; im.frustumCulled = false; im.castShadow = R.quality === 'high' && (c.tree || c.id === 'lamp'); im.receiveShadow = true; this.group.add(im); return im; });
        if (c.id === 'lamp') for (const p of parts) { const m = p.mat as THREE.MeshStandardMaterial; if (/glass|light|bulb|lamp_?glow|emis/i.test(m.name) || m.transparent || m.emissiveMap) { m.emissive = new THREE.Color(0xffc27a); this.glass.push(m); } }
        KINDS.set(c.id, { parts, meshes, cap, radius, list: lists.get(c.id)! });
        PropCredits.push({ id: c.id, author: c.author, title: c.title, url: c.url, license: c.license, source: c.source });
      } catch (e) { console.warn('prop', c.id, e); }
      onProgress(++done / cat.length);
    }));
    this.treeR = budget('tree_urban').radius - 6; this.lampR = KINDS.has('lamp') ? budget('lamp').radius - 6 : 0;
    this.group.name = 'props'; R.scene.add(this.group); this.ready = true;
  },
  // перестраиваем набор ближайших экземпляров, когда камера сместилась
  update(cam: THREE.Vector3) {
    // процедурные копии прячутся ровно там, где стоят настоящие
    R.U.uNear.value.set(cam.x, cam.z, this.ready ? this.treeR : 0, this.ready ? this.lampR : 0);
    if (!this.ready || this.last.distanceTo(new THREE.Vector2(cam.x, cam.z)) < 6) return;
    this.last.set(cam.x, cam.z);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (const [, k] of KINDS) {
      const r2 = k.radius * k.radius, near: [number, Place][] = [];
      for (const p of k.list) { const dx = p.x - cam.x, dz = p.z - cam.z, d = dx * dx + dz * dz; if (d < r2) near.push([d, p]); }
      if (near.length > k.cap) near.sort((a, b) => a[0] - b[0]);
      const n = Math.min(k.cap, near.length);
      for (let i = 0; i < n; i++) { const p = near[i][1]; M.compose(P.set(p.x, p.y, p.z), Q.setFromAxisAngle(Y, p.rot), S.setScalar(p.s)); for (const im of k.meshes) im.setMatrixAt(i, M); }
      for (const im of k.meshes) { im.count = n; im.instanceMatrix.needsUpdate = true; }
    }
  },
  // стекло фонарей светится вечером и ночью
  glass: [] as THREE.MeshStandardMaterial[],
  setNight(k: number) { for (const m of this.glass) m.emissiveIntensity = k * 3; },
  stats() { let inst = 0, tris = 0; for (const [, k] of KINDS) { const n = k.meshes[0]?.count || 0; inst += n; for (const p of k.parts) tris += n * (p.geo.index ? p.geo.index.count / 3 : 0); } return { kinds: KINDS.size, inst, tris: Math.round(tris) }; },
};
