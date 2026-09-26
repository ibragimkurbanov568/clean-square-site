// Генерация города Новоозёрск — только данные (без Three.js): сетка улиц, районы, здания, деревья,
// фонари, припаркованные машины, важные места. Один и тот же город при одном зерне.
import { mulberry32, pick } from '../core/util';

export const CITY = { N: 13, BLOCK: 110, ROAD: 14, SIDE: 4, SEED: 1307 };
export const PITCH = CITY.BLOCK + CITY.ROAD;
export const HALF = (CITY.N * PITCH) / 2;
export const LANES = [1.75, 5.25]; // смещения полос от осевой (правостороннее движение)
export const roadLine = (i: number) => -HALF + i * PITCH;
export const RIVER = { z0: HALF + 40, z1: HALF + 210 };

export type District = 'center' | 'office' | 'res' | 'khrush' | 'private' | 'industry' | 'park' | 'plaza';
export type BType = 'panel' | 'tower' | 'khrush' | 'stalin' | 'office' | 'house' | 'warehouse' | 'factory' | 'shop' | 'garage' | 'special';
export interface Building {
  x: number; z: number; w: number; d: number; h: number; floors: number; floorH: number;
  type: BType; color: number; seed: number; shop: boolean; roof: 'flat' | 'pitched'; name?: string; entrance?: [number, number];
}
export interface Tree { x: number; z: number; s: number; kind: number }
export interface Parked { x: number; z: number; rot: number; model: number; color: number }
export interface Poi { id: string; name: string; kind: string; x: number; z: number; door: [number, number]; block: [number, number] }
export interface Prop { kind: 'bench' | 'swing' | 'slide' | 'bin' | 'kiosk' | 'bus_stop' | 'fountain' | 'flag' | 'chimney' | 'fence' | 'container'; x: number; z: number; rot: number; s?: number; w?: number }
export interface City {
  districts: District[][]; buildings: Building[]; trees: Tree[]; parked: Parked[]; pois: Poi[]; props: Prop[];
  lamps: { x: number; z: number; rot: number }[]; lights: { i: number; j: number }[];
}

export const PAINTS = [0xe8e2d4, 0xd9d4c6, 0xcfd6dc, 0xe3d1b6, 0xc9b8a0, 0xb8c7c9, 0xe6c9a8, 0xd8c3c3, 0xc2cdb2, 0xf0ead8];
export const CAR_COLORS = [0xf2f2f2, 0x1a1a1c, 0x8a8f96, 0xb3b7bc, 0x7a1e1e, 0x1f3a6b, 0x2f5d3a, 0xc9b28a, 0x5a3b2a, 0x9c2a2a, 0x3b4a5a, 0xd8d0b8, 0x274b8c, 0x6b6b30];

export function blockRect(i: number, j: number) {
  const x0 = roadLine(i) + CITY.ROAD / 2, z0 = roadLine(j) + CITY.ROAD / 2;
  return { x0, z0, x1: x0 + CITY.BLOCK, z1: z0 + CITY.BLOCK, cx: x0 + CITY.BLOCK / 2, cz: z0 + CITY.BLOCK / 2 };
}
export function blockAt(x: number, z: number): [number, number] { return [Math.floor((x + HALF) / PITCH), Math.floor((z + HALF) / PITCH)]; }

function districtOf(i: number, j: number, r: () => number): District {
  const N = CITY.N, c = (N - 1) / 2, d = Math.max(Math.abs(i - c), Math.abs(j - c));
  if (i === c && j === c) return 'plaza';
  if (d <= 1) return 'center';
  if (i >= N - 4 && j <= 3) return 'industry';
  if (d === 2 && r() < .55) return 'office';
  if ((i <= 2 && j >= N - 5) || (i <= 1 && j >= 3)) return 'private';
  if (r() < .09) return 'park';
  return r() < .35 ? 'khrush' : 'res';
}

export function generateCity(): City {
  const r = mulberry32(CITY.SEED), N = CITY.N;
  const districts: District[][] = [];
  for (let i = 0; i < N; i++) { districts.push([]); for (let j = 0; j < N; j++) districts[i].push(districtOf(i, j, r)); }
  // особые кварталы
  const SPECIAL: Record<string, [number, number, string, string]> = {
    police: [5, 6, 'ГУ МВД', 'police'], hospital: [7, 5, 'Областная больница', 'hospital'], bank: [6, 7, 'Банк «Северный»', 'bank'],
    dealer: [8, 7, 'Автосалон «Магистраль»', 'dealer'], taxi: [4, 5, 'Таксопарк', 'taxi'], post: [5, 8, 'Почта и курьеры', 'courier'],
    port: [10, 12, 'Речной порт — склад', 'loader'], shop: [7, 7, 'ТЦ «Галерея»', 'clothes'], hotel: [5, 5, 'Гостиница «Край»', 'hotel'], station: [6, 1, 'Вокзал', 'station'],
    gas1: [3, 7, 'АЗС', 'gas'], gas2: [9, 4, 'АЗС', 'gas'], market: [9, 9, 'Авторынок б/у', 'used'], cityhall: [6, 6, 'Мэрия', 'cityhall'],
  };
  for (const [, [i, j]] of Object.entries(SPECIAL)) if (districts[i][j] !== 'plaza') districts[i][j] = 'center';
  districts[10][12] = 'industry';
  const buildings: Building[] = [], trees: Tree[] = [], parked: Parked[] = [], pois: Poi[] = [], props: Prop[] = [];
  let seed = 1;
  const B = (x: number, z: number, w: number, d: number, floors: number, type: BType, extra: Partial<Building> = {}) => {
    const floorH = type === 'office' ? 3.6 : type === 'stalin' ? 3.6 : type === 'warehouse' || type === 'factory' ? 6 : type === 'garage' ? 2.6 : 2.9;
    const b: Building = { x, z, w, d, h: floors * floorH + (type === 'panel' || type === 'tower' ? .8 : .4), floors, floorH, type, color: pick(PAINTS, r), seed: seed++, shop: false, roof: 'flat', ...extra };
    buildings.push(b); return b;
  };
  const tree = (x: number, z: number, kind = Math.floor(r() * 3)) => trees.push({ x, z, s: .8 + r() * .5, kind });
  const park = (x: number, z: number, rot: number) => parked.push({ x, z, rot, model: Math.floor(r() * 6), color: pick(CAR_COLORS, r) });

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const D = districts[i][j], R = blockRect(i, j), m = CITY.SIDE + 5, x0 = R.x0 + m, x1 = R.x1 - m, z0 = R.z0 + m, z1 = R.z1 - m, W = x1 - x0, cx = R.cx, cz = R.cz;
    const special = Object.entries(SPECIAL).find(([, v]) => v[0] === i && v[1] === j);
    if (special) {
      const [id, [, , name, kind]] = special; let b: Building;
      if (kind === 'station') { b = B(cx, z0 + 14, 70, 22, 3, 'stalin', { name }); b.color = 0xe9dcc0; }
      else if (kind === 'loader') { b = B(cx - 10, cz, 60, 30, 2, 'warehouse', { name }); for (let k = 0; k < 10; k++) props.push({ kind: 'container', x: x0 + 8 + (k % 5) * 12, z: z1 - 10 - Math.floor(k / 5) * 4, rot: 0 }); }
      else if (kind === 'gas') { b = B(cx + 25, cz + 25, 16, 12, 1, 'shop', { name }); }
      else if (kind === 'dealer' || kind === 'used') { b = B(cx, z0 + 14, 50, 20, 2, 'office', { name }); b.color = 0xdfe6ea; for (let k = 0; k < 8; k++) park(x0 + 10 + k * 10, cz + 20, Math.PI / 2); }
      else if (kind === 'cityhall') { b = B(cx, z0 + 12, 60, 22, 6, 'stalin', { name }); b.color = 0xf0e9d8; }
      else if (kind === 'hospital') { b = B(cx, cz - 10, 70, 18, 7, 'panel', { name }); b.color = 0xf2f2ee; B(cx - 25, cz + 25, 20, 18, 3, 'stalin'); }
      else if (kind === 'police') { b = B(cx, z0 + 14, 50, 18, 5, 'stalin', { name }); b.color = 0xd8dfe6; for (let k = 0; k < 4; k++) park(x0 + 12 + k * 8, cz + 18, Math.PI / 2); }
      else if (kind === 'bank') { b = B(cx, cz, 40, 30, 8, 'office', { name }); }
      else if (kind === 'clothes') { b = B(cx, cz, 80, 60, 3, 'office', { name, shop: true }); b.color = 0xe8e0d0; }
      else { b = B(cx, z0 + 15, 60, 20, 6, 'stalin', { name }); }
      b.shop = b.shop || kind === 'gas' || kind === 'clothes';
      const door: [number, number] = [b.x, b.z - b.d / 2 - 1.5];
      pois.push({ id, name, kind, x: b.x, z: b.z, door, block: [i, j] });
      // деревья и лавочки вокруг
      for (let k = 0; k < 8; k++) tree(x0 + r() * W, z1 - r() * 20);
      if (kind === 'cityhall') { props.push({ kind: 'fountain', x: cx, z: cz + 25, rot: 0 }); props.push({ kind: 'flag', x: cx, z: z0 + 30, rot: 0 }); }
      continue;
    }
    if (D === 'plaza') { props.push({ kind: 'fountain', x: cx, z: cz, rot: 0 }); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; tree(cx + Math.cos(a) * 40, cz + Math.sin(a) * 40, 2); props.push({ kind: 'bench', x: cx + Math.cos(a + .2) * 30, z: cz + Math.sin(a + .2) * 30, rot: -a }); } continue; }
    if (D === 'park') {
      for (let k = 0; k < 70; k++) tree(x0 + r() * W, z0 + r() * W);
      for (let k = 0; k < 10; k++) props.push({ kind: 'bench', x: cx + (r() - .5) * 70, z: cz + (r() - .5) * 70, rot: r() * 6 });
      continue;
    }
    if (D === 'center') {
      // сталинки по периметру квартала, первые этажи — магазины
      const f = 5 + Math.floor(r() * 3);
      B(cx, z0 + 9, W, 18, f, 'stalin', { shop: true }); B(cx, z1 - 9, W, 18, f, 'stalin', { shop: true });
      B(x0 + 9, cz, 18, W - 40, f, 'stalin', { shop: true }); B(x1 - 9, cz, 18, W - 40, f - 1, 'stalin', { shop: true });
      for (let k = 0; k < 10; k++) tree(cx + (r() - .5) * 40, cz + (r() - .5) * 40);
      for (let k = 0; k < 6; k++) park(cx - 20 + k * 8, cz + 8, Math.PI / 2);
      continue;
    }
    if (D === 'office') {
      const n = 1 + Math.floor(r() * 2);
      if (n === 1) B(cx, cz, 44, 44, 14 + Math.floor(r() * 16), 'office', { shop: true });
      else { B(cx - 22, cz - 18, 34, 34, 10 + Math.floor(r() * 12), 'office', { shop: true }); B(cx + 22, cz + 20, 30, 30, 16 + Math.floor(r() * 14), 'office'); }
      for (let k = 0; k < 12; k++) park(x0 + 6 + (k % 6) * 8, k < 6 ? z1 - 6 : z0 + 6, Math.PI / 2);
      for (let k = 0; k < 10; k++) tree(x0 + r() * W, z0 + r() * W);
      continue;
    }
    if (D === 'industry') {
      B(cx - 18, cz - 15, 50, 36, 2, r() < .5 ? 'factory' : 'warehouse'); B(cx + 25, cz + 25, 36, 22, 1, 'warehouse');
      props.push({ kind: 'chimney', x: cx + 30, z: cz - 30, rot: 0, s: 30 + r() * 25 });
      props.push({ kind: 'fence', x: cx, z: cz, rot: 0, w: W + 8 });
      for (let k = 0; k < 6; k++) props.push({ kind: 'container', x: x0 + 8 + k * 7, z: z1 - 8, rot: 0 });
      continue;
    }
    if (D === 'private') {
      // частный сектор: дома 2×3 с огородами
      for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) {
        const hx = x0 + 15 + a * (W - 30) / 2 + (r() - .5) * 4, hz = z0 + 15 + b2 * (W - 30) / 2 + (r() - .5) * 4;
        const hb = B(hx, hz, 9 + r() * 3, 8 + r() * 3, 1 + (r() < .3 ? 1 : 0), 'house', { roof: 'pitched' }); hb.color = pick([0xc8a878, 0xa8b89a, 0x9aa9b8, 0xd8c8a8, 0xb07858, 0xe0d8c8], r);
        for (let k = 0; k < 3; k++) tree(hx + (r() - .5) * 26, hz + (r() - .5) * 26, 1);
      }
      continue;
    }
    if (D === 'khrush') {
      // хрущёвки: 4 пятиэтажки рядами
      for (let k = 0; k < 4; k++) { const b = B(x0 + 12 + k * (W - 24) / 3, cz, 12, 62, 5, 'khrush'); b.entrance = [b.x - 7, b.z]; }
      for (let k = 0; k < 30; k++) tree(x0 + r() * W, z0 + r() * W, r() < .5 ? 0 : 1);
      for (let k = 0; k < 8; k++) park(x0 + 18 + (k % 3) * 27, z0 + 8 + Math.floor(k / 3) * 38, 0);
      props.push({ kind: 'swing', x: cx + 14, z: z1 - 10, rot: 0 });
      continue;
    }
    // спальный район: панельки 9/16 этажей и двор
    const t = Math.floor(r() * 3);
    if (t === 0) { B(cx, z0 + 7, W - 6, 13, 9, 'panel', { shop: r() < .5 }); B(cx, z1 - 7, W - 6, 13, 9, 'panel'); }
    else if (t === 1) { B(x0 + 7, cz + 8, 13, W - 20, 9, 'panel'); B(cx + 10, z0 + 7, W - 30, 13, 12, 'panel', { shop: true }); B(x1 - 10, z1 - 10, 18, 18, 16, 'tower'); }
    else { B(cx - 22, cz - 22, 18, 18, 16, 'tower'); B(cx + 22, cz + 22, 18, 18, 16, 'tower'); B(cx + 20, z0 + 7, 44, 13, 9, 'panel', { shop: true }); }
    // двор: площадка, лавочки, деревья, машины
    props.push({ kind: 'swing', x: cx - 6, z: cz, rot: 0 }); props.push({ kind: 'slide', x: cx + 6, z: cz + 3, rot: 1.2 });
    for (let k = 0; k < 4; k++) props.push({ kind: 'bench', x: cx - 12 + k * 8, z: cz - 10, rot: 0 });
    props.push({ kind: 'bin', x: x1 - 4, z: cz, rot: 0 });
    for (let k = 0; k < 22; k++) { const tx = x0 + r() * W, tz = z0 + r() * W; if (Math.abs(tx - cx) > 14 || Math.abs(tz - cz) > 14) tree(tx, tz, r() < .6 ? 0 : 1); }
    for (let k = 0; k < 7; k++) park(cx - 24 + k * 8, cz + 18, Math.PI / 2);
  }
  // лишние деревья внутри зданий — убираем
  const inside = (x: number, z: number, pad: number) => buildings.some(b => Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad);
  const tr2 = trees.filter(t => !inside(t.x, t.z, 2.5));
  const pk2 = parked.filter(p => !inside(p.x, p.z, 3));
  // фонари вдоль всех улиц (обе стороны, через 30 м), светофоры на перекрёстках
  const lamps: City['lamps'] = [], lights: City['lights'] = [];
  for (let i = 0; i <= N; i++) for (let s = -HALF + 20; s < HALF; s += 32) {
    const c = roadLine(i), off = CITY.ROAD / 2 + 1.2;
    if (Math.abs(((s + HALF) % PITCH)) < 14 || Math.abs(((s + HALF) % PITCH) - PITCH) < 14) continue;
    lamps.push({ x: c + off, z: s, rot: -Math.PI / 2 }); lamps.push({ x: c - off, z: s + 16, rot: Math.PI / 2 });
    lamps.push({ x: s, z: c + off, rot: Math.PI }); lamps.push({ x: s + 16, z: c - off, rot: 0 });
  }
  for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) lights.push({ i, j });
  // остановки общественного транспорта
  for (let k = 0; k < 24; k++) { const i = 1 + Math.floor(r() * (N - 1)), s = -HALF + PITCH * (Math.floor(r() * N) + .5); props.push({ kind: 'bus_stop', x: roadLine(i) + CITY.ROAD / 2 + 2, z: s, rot: -Math.PI / 2 }); props.push({ kind: 'kiosk', x: roadLine(i) + CITY.ROAD / 2 + 3, z: s + 8, rot: -Math.PI / 2 }); }
  return { districts, buildings, trees: tr2, parked: pk2, pois, props, lamps, lights };
}

// Граф дорог: узлы — перекрёстки (i,j), рёбра — участки между ними. Для трафика и GPS.
export const nodePos = (i: number, j: number) => ({ x: roadLine(i), z: roadLine(j) });
export function nearestNode(x: number, z: number): [number, number] {
  const i = Math.round((x + HALF) / PITCH), j = Math.round((z + HALF) / PITCH);
  return [Math.max(0, Math.min(CITY.N, i)), Math.max(0, Math.min(CITY.N, j))];
}
// кратчайший путь по сетке (A*): список узлов
export function routeGrid(a: [number, number], b: [number, number]): [number, number][] {
  const N = CITY.N + 1, key = (p: [number, number]) => p[0] * N + p[1], open: [number, number][] = [a], came = new Map<number, number>(), g = new Map<number, number>([[key(a), 0]]);
  const hh = (p: [number, number]) => Math.abs(p[0] - b[0]) + Math.abs(p[1] - b[1]);
  while (open.length) {
    open.sort((p, q) => g.get(key(p))! + hh(p) - g.get(key(q))! - hh(q)); const cur = open.shift()!;
    if (cur[0] === b[0] && cur[1] === b[1]) { const path = [cur]; let k = key(cur); while (came.has(k)) { k = came.get(k)!; path.unshift([Math.floor(k / N), k % N]); } return path; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [cur[0] + dx, cur[1] + dz]; if (n[0] < 0 || n[1] < 0 || n[0] >= N || n[1] >= N) continue;
      const ng = g.get(key(cur))! + 1; if (ng < (g.get(key(n)) ?? 1e9)) { g.set(key(n), ng); came.set(key(n), key(cur)); if (!open.some(o => o[0] === n[0] && o[1] === n[1])) open.push(n); }
    }
  }
  return [a, b];
}
