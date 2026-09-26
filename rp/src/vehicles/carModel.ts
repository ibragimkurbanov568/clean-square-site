// Реалистичные машины (модели CC-BY из Objaverse/Sketchfab, см. assets/LICENSES.md; названия вымышленные).
// Загрузка каталога, поиск колёс, склейка деталей по материалам для инстансинга, объекты для машины игрока.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type CarKind = 'car' | 'bus' | 'police' | 'taxi' | 'van' | 'ambulance' | 'truck' | 'tram';
export interface CarDef {
  id: string; file: string; name: string; brand: string; kind: CarKind; L: number; W: number; H: number; wb: number; tr: number; R: number;
  mass: number; power: number; maxSpeed: number; price: number; author: string; title: string; url: string;
}
export interface Part { geo: THREE.BufferGeometry; mat: THREE.Material; light?: 'head' | 'tail' }
export interface CarAsset { def: CarDef; scene: THREE.Object3D; body: Part[]; wheels: { center: THREE.Vector3; parts: Part[] }[]; lightMats: { head: THREE.MeshStandardMaterial[]; tail: THREE.MeshStandardMaterial[] } }

export const CARS: CarDef[] = [];
export const CAR_BY_ID: Record<string, CarDef> = {};
export const ASSETS: Record<string, CarAsset> = {};
const BASE = import.meta.env.BASE_URL + 'assets/cars/';
const EXT = (import.meta.env.VITE_CAR_EXT as string) || '.glb';

const WHEEL = /wheel|tire|tyre|whl|disk|disc|rim|koles|колес|шин|диск/i, NOT_WHEEL = /steer|руль|spare|запаск|zapask/i;
const HEAD = /head|fara|фар|front.?light|headl|lamp_f|light_f/i, TAIL = /tail|stop|стоп|rear.?light|back.?light|zadn|задн/i;

// атрибуты в float, мировая матрица «запечена», лишнее удалено — чтобы склеивать сетки
function bake(mesh: THREE.Mesh, m: THREE.Matrix4) {
  const src = mesh.geometry, g = new THREE.BufferGeometry(), n = src.attributes.position.count;
  const copy = (name: string, size: number) => { const a = src.attributes[name]; if (!a) return null; const out = new Float32Array(n * size); for (let i = 0; i < n; i++) { out[i * size] = a.getX(i); if (size > 1) out[i * size + 1] = a.getY(i); if (size > 2) out[i * size + 2] = a.getZ(i); } return new THREE.BufferAttribute(out, size); };
  g.setAttribute('position', copy('position', 3)!);
  g.setAttribute('normal', copy('normal', 3) || (src.computeVertexNormals(), copy('normal', 3))!);
  g.setAttribute('uv', copy('uv', 2) || new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (src.index) g.setIndex(Array.from(src.index.array as ArrayLike<number>));
  g.applyMatrix4(m); if (m.determinant() < 0) { const ix = g.index; if (ix) { const a = ix.array as any; for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; } } }
  return g;
}
function groupByMat(list: { g: THREE.BufferGeometry; mat: THREE.Material }[]): Part[] {
  const map = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const { g, mat } of list) { if (!map.has(mat)) map.set(mat, []); map.get(mat)!.push(g.index ? g : g); }
  const out: Part[] = [];
  for (const [mat, gs] of map) { const ok = gs.every(x => !!x.index) || gs.every(x => !x.index); const merged = ok ? mergeGeometries(gs) : mergeGeometries(gs.map(x => x.index ? x.toNonIndexed() : x)); if (merged) out.push({ geo: merged, mat }); }
  return out;
}
function prepare(def: CarDef, gltf: { scene: THREE.Object3D }): CarAsset {
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = []; scene.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  const head: THREE.MeshStandardMaterial[] = [], tail: THREE.MeshStandardMaterial[] = [];
  // колёса: сетки с «колёсными» именами (своими или родителя), разложенные по четвертям
  const isWheel = (m: THREE.Mesh) => { let o: THREE.Object3D | null = m; for (let k = 0; k < 3 && o; k++, o = o.parent) { if (NOT_WHEEL.test(o.name)) return false; if (WHEEL.test(o.name) || WHEEL.test(((o as THREE.Mesh).material as THREE.Material)?.name || '')) return true; } return false; };
  const quad: THREE.Mesh[][] = [[], [], [], []], body: { g: THREE.BufferGeometry; mat: THREE.Material }[] = [];
  const box = new THREE.Box3(), c = new THREE.Vector3();
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mt of mats) { const n = mt.name + ' ' + m.name; if (HEAD.test(n)) head.push(mt as any); else if (TAIL.test(n)) tail.push(mt as any); }
    box.setFromObject(m).getCenter(c); const sz = box.getSize(new THREE.Vector3());
    if (isWheel(m) && sz.y < def.H * .6 && Math.abs(c.z) > def.L * .12 && c.y < def.H * .45) quad[(c.x < 0 ? 0 : 1) + (c.z > 0 ? 0 : 2)].push(m);
    else body.push({ g: bake(m, m.matrixWorld), mat: Array.isArray(m.material) ? m.material[0] : m.material });
  }
  const wheels: CarAsset['wheels'] = [];
  if (quad.every(q => q.length)) {
    for (const q of quad) {
      const b = new THREE.Box3(); q.forEach(m => b.expandByObject(m)); const center = b.getCenter(new THREE.Vector3());
      const inv = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
      wheels.push({ center, parts: groupByMat(q.map(m => ({ g: bake(m, inv.clone().multiply(m.matrixWorld)), mat: Array.isArray(m.material) ? m.material[0] : m.material }))) });
    }
    const R = (wheels[0].parts[0] ? new THREE.Box3().setFromBufferAttribute(wheels[0].parts[0].geo.attributes.position as THREE.BufferAttribute).getSize(new THREE.Vector3()).y / 2 : 0);
    def.wb = Math.abs(wheels[0].center.z - wheels[2].center.z); def.tr = Math.abs(wheels[0].center.x - wheels[1].center.x); def.R = Math.max(.25, Math.min(.6, R || wheels[0].center.y));
  } else {
    // колёса не отделены: вращения не будет, но ставим точки подвески по габаритам
    for (const q of quad) for (const m of q) body.push({ g: bake(m, m.matrixWorld), mat: Array.isArray(m.material) ? m.material[0] : m.material });
  }
  for (const mt of [...head, ...tail]) { if (mt.emissive) { mt.emissive.copy(mt.color || new THREE.Color(1, 1, 1)); if (tail.includes(mt)) mt.emissive.setRGB(1, .05, .02); mt.emissiveIntensity = .2; } }
  scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { def, scene, body: groupByMat(body), wheels, lightMats: { head, tail } };
}
export async function loadCars(onProgress: (k: number) => void) {
  const cat = await (await fetch(BASE + 'catalog.json')).json() as any[];
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  let done = 0;
  await Promise.all(cat.map(async (c: any) => {
    const heavy = c.kind === 'bus' || c.kind === 'truck' || c.kind === 'tram';
    const def: CarDef = { id: c.id, file: c.id, name: c.name, brand: c.brand, kind: c.kind, L: c.dims[2], W: Math.min(c.dims[0], c.kind === 'car' || c.kind === 'police' ? 1.85 : 2.6), H: c.dims[1], wb: c.dims[2] * .6, tr: c.dims[0] * .82, R: heavy ? .5 : .31,
      mass: c.mass, power: c.power, maxSpeed: c.vmax, price: c.price, author: c.author, title: c.title, url: c.url };
    try { const g = await loader.loadAsync(BASE + c.id + EXT); ASSETS[c.id] = prepare(def, g); CARS.push(def); CAR_BY_ID[def.id] = def; } catch (e) { console.warn('машина не загрузилась', c.id, e); }
    onProgress(++done / cat.length);
  }));
  // порядок как в каталоге
  CARS.sort((a, b) => cat.findIndex((c: any) => c.id === a.id) - cat.findIndex((c: any) => c.id === b.id));
  // такси: белый «Лоран» с шашечками на крыше
  const base = CAR_BY_ID.l15 || CARS.find(c => c.kind === 'car');
  if (base) { const t: CarDef = { ...base, id: 'taxi', kind: 'taxi', name: 'Такси', price: 0 }; ASSETS.taxi = { ...ASSETS[base.id], def: t }; CARS.push(t); CAR_BY_ID.taxi = t; }
}
export const idsOfKind = (k: CarKind) => CARS.filter(c => c.kind === k).map(c => c.id);

// машина игрока: копия сцены, колёса вынесены в поворотные узлы
export function buildCarObject(id: string, _color = 0xffffff) {
  const A = ASSETS[id], d = A.def, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  // свои копии материалов фар и стопов, чтобы не зажигать их у всего потока
  const own = new Map<THREE.Material, THREE.Material>(), lm = { head: [] as THREE.MeshStandardMaterial[], tail: [] as THREE.MeshStandardMaterial[] };
  const mat = (m: THREE.Material) => { const isH = A.lightMats.head.includes(m as any), isT = A.lightMats.tail.includes(m as any); if (!isH && !isT) return m; if (!own.has(m)) { const c = m.clone(); own.set(m, c); (isH ? lm.head : lm.tail).push(c as any); } return own.get(m)!; };
  for (const p of A.body) { const m = new THREE.Mesh(p.geo, mat(p.mat)); m.castShadow = true; m.receiveShadow = true; body.add(m); }
  const wheels = A.wheels.map((w, i) => {
    const pivot = new THREE.Group(), spin = new THREE.Group(); pivot.position.copy(w.center); pivot.add(spin);
    for (const p of w.parts) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; spin.add(m); }
    root.add(pivot); return { pivot, spin, front: i < 2, rest: w.center.clone() };
  });
  if (d.kind === 'taxi') body.add(taxiSign(d));
  // ореолы фар и стопов (видны вечером и при торможении), мигалки у полиции и скорой
  const sprite = (col: number, s: number, x: number, y: number, z: number) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(s); sp.position.set(x, y, z); return sp; };
  const glow = new THREE.Group(), tglow = new THREE.Group();
  for (const sx of [-1, 1]) { glow.add(sprite(0xfff2d8, 1.2, sx * d.W * .36, d.H * .42, d.L / 2 + .05)); tglow.add(sprite(0xff2010, .8, sx * d.W * .38, d.H * .5, -d.L / 2 - .05)); }
  body.add(glow, tglow);
  let beacon: THREE.Group | null = null;
  if (d.kind === 'police' || d.kind === 'ambulance') { beacon = new THREE.Group(); beacon.add(sprite(0x2050ff, 1.4, -.25, d.H + .05, 0), sprite(d.kind === 'police' ? 0xff2030 : 0x2050ff, 1.4, .25, d.H + .05, 0)); body.add(beacon); }
  root.userData = { def: d, body, wheels, lightMats: lm, glow, tglow, beacon };
  return root;
}
let _glow: THREE.Texture | null = null;
function glowTex() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (_glow = new THREE.CanvasTexture(c)); }
export function taxiSign(d: CarDef) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d')!;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f5c518'; g.fillRect(x * 8, y * 8, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.BoxGeometry(.7, .16, .25), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffc000, emissiveMap: t, emissiveIntensity: .4 }));
  m.position.set(0, d.H + .08, -d.L * .05); return m;
}
