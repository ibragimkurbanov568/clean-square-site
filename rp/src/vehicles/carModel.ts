// Процедурные модели машин (свои вымышленные марки). Кузов — лофт из плавных сечений.
// Каждая модель собирается в несколько геометрий по материалам — удобно для инстансинга всего трафика.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, TAU } from '../core/util';

export interface CarDef {
  id: string; name: string; brand: string; L: number; W: number; wb: number; tr: number; R: number;
  boxy: number; tumble: number; p: { noseY: number; hoodF: number; hoodR: number; belt: number; zA: number; zB: number; zC: number; zD: number; roof: number; trunk: number; tail: number };
  mass: number; power: number; maxSpeed: number; price: number; seats: number; kind: 'car' | 'bus' | 'police' | 'taxi' | 'van';
}
const P = (noseY: number, hoodF: number, hoodR: number, belt: number, zA: number, zB: number, zC: number, zD: number, roof: number, trunk: number, tail: number) => ({ noseY, hoodF, hoodR, belt, zA, zB, zC, zD, roof, trunk, tail });
export const CARS: CarDef[] = [
  { id: 'classic', name: 'Классик', brand: 'Волжанин', L: 4.15, W: 1.62, wb: 2.42, tr: 1.36, R: .31, boxy: 7, tumble: .04, p: P(.66, .9, .95, .98, .72, .2, -1.05, -1.4, 1.42, 1.0, .98), mass: 1030, power: 75, maxSpeed: 150, price: 90000, seats: 4, kind: 'car' },
  { id: 'hatch', name: 'Хэтч 9', brand: 'Волжанин', L: 4.0, W: 1.65, wb: 2.46, tr: 1.4, R: .3, boxy: 5.5, tumble: .06, p: P(.6, .85, .95, .98, .6, .02, -1.5, -1.9, 1.4, 1.02, 1.0), mass: 950, power: 80, maxSpeed: 160, price: 140000, seats: 4, kind: 'car' },
  { id: 'jsedan', name: 'Корса', brand: 'Кайдзен', L: 4.6, W: 1.72, wb: 2.68, tr: 1.48, R: .32, boxy: 4.5, tumble: .1, p: P(.6, .84, .92, .96, .72, .12, -1.2, -1.7, 1.42, 1.0, .98), mass: 1250, power: 140, maxSpeed: 200, price: 650000, seats: 4, kind: 'car' },
  { id: 'business', name: 'Е-класс', brand: 'Штальберг', L: 4.95, W: 1.84, wb: 2.9, tr: 1.58, R: .34, boxy: 4, tumble: .12, p: P(.62, .86, .94, .98, .78, .08, -1.35, -1.85, 1.46, 1.02, 1.0), mass: 1650, power: 250, maxSpeed: 240, price: 4200000, seats: 4, kind: 'car' },
  { id: 'suv', name: 'Кросс', brand: 'Сеул-Моторс', L: 4.55, W: 1.85, wb: 2.7, tr: 1.6, R: .37, boxy: 4, tumble: .12, p: P(.78, 1.02, 1.1, 1.14, .75, .15, -1.75, -2.05, 1.7, 1.18, 1.16), mass: 1700, power: 180, maxSpeed: 190, price: 1900000, seats: 4, kind: 'car' },
  { id: 'wagon', name: 'Универсал', brand: 'Волжанин', L: 4.2, W: 1.62, wb: 2.42, tr: 1.36, R: .31, boxy: 7, tumble: .04, p: P(.66, .9, .95, .98, .72, .2, -1.8, -2.02, 1.44, 1.04, 1.02), mass: 1080, power: 75, maxSpeed: 145, price: 110000, seats: 4, kind: 'car' },
  { id: 'police', name: 'Патруль', brand: 'Кайдзен', L: 4.6, W: 1.72, wb: 2.68, tr: 1.48, R: .32, boxy: 4.5, tumble: .1, p: P(.6, .84, .92, .96, .72, .12, -1.2, -1.7, 1.42, 1.0, .98), mass: 1300, power: 190, maxSpeed: 220, price: 0, seats: 4, kind: 'police' },
  { id: 'taxi', name: 'Такси', brand: 'Кайдзен', L: 4.6, W: 1.72, wb: 2.68, tr: 1.48, R: .32, boxy: 4.5, tumble: .1, p: P(.6, .84, .92, .96, .72, .12, -1.2, -1.7, 1.42, 1.0, .98), mass: 1250, power: 140, maxSpeed: 200, price: 0, seats: 4, kind: 'taxi' },
  { id: 'bus', name: 'Автобус КР-5', brand: 'Уралец', L: 11, W: 2.5, wb: 5.8, tr: 2.1, R: .5, boxy: 10, tumble: .02, p: P(1.1, 2.9, 2.9, 1.25, 5.3, 5.2, -5.2, -5.4, 3.0, 2.9, 2.9), mass: 10500, power: 250, maxSpeed: 90, price: 0, seats: 30, kind: 'bus' },
];
export const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));

const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function keysAt(keys: number[][], z: number) {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (z <= keys[i][0]) { const [z0, y0] = keys[i - 1], [z1, y1] = keys[i], t = (z - z0) / (z1 - z0 || 1); return y0 + (y1 - y0) * (1 - Math.cos(t * Math.PI)) / 2; }
  return keys[keys.length - 1][1];
}
function loft(zs: number[], M: number, ring: (z: number, t: number) => number[]) {
  const pos: number[] = [], idx: number[] = [];
  for (const z of zs) for (let j = 0; j < M; j++) { const [x, y] = ring(z, j / M); pos.push(x, y, z); }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, b, c, b, d, c); }
  for (const [i, dir] of [[0, -1], [zs.length - 1, 1]]) {
    let cx = 0, cy = 0; for (let j = 0; j < M; j++) { cx += pos[(i * M + j) * 3]; cy += pos[(i * M + j) * 3 + 1]; }
    const ci = pos.length / 3; pos.push(cx / M, cy / M, zs[i] + dir * .01);
    for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M; if (dir > 0) idx.push(ci, a, b); else idx.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g.toNonIndexed();
}
function ring(hw: number, yb: number, yt: number, t: number, n: number, tumble: number) {
  const a = t * TAU, c = Math.cos(a), s = Math.sin(a), e = 2 / n, mid = (yt + yb) / 2;
  let x = hw * Math.sign(c) * Math.pow(Math.abs(c), e); const y = mid + (yt - yb) / 2 * Math.sign(s) * Math.pow(Math.abs(s), e);
  const k = (y - yb) / Math.max(.01, yt - yb); x *= 1 - tumble * k * k; return [x, y];
}
function bodyGeo(d: CarDef) {
  const p = d.p, F = d.L / 2, Rr = -d.L / 2, fa = d.wb / 2, ra = -d.wb / 2, aR = d.R + .07;
  const top = [[Rr, p.tail - .06], [Rr + .12, p.tail + .02], [Rr + .35, p.trunk], [p.zD, p.belt], [p.zA, p.belt], [p.zA + .2, p.hoodR], [F - .4, p.hoodF], [F - .1, p.noseY + .06], [F, p.noseY - .06]];
  const zs: number[] = []; const n = d.kind === 'bus' ? 60 : 72; for (let i = 0; i <= n; i++) zs.push(Rr + d.L * i / n);
  return loft(zs, 28, (z, t) => {
    const u = (z - Rr) / d.L; let yt = keysAt(top, z); let yb = .26 + .06 * (1 - sstep(0, .05, u)) + .04 * sstep(.95, 1, u);
    for (const ax of [fa, ra]) { const dz = z - ax; if (Math.abs(dz) < aR) yb = Math.max(yb, d.R + Math.sqrt(aR * aR - dz * dz) * .95); }
    if (d.kind === 'bus') yb = Math.max(.35, yb);
    yb = Math.min(yb, yt - .08);
    let w = d.W / 2 * (1 - .1 * Math.pow(sstep(.9, 1, u), 1.4) - .06 * (1 - sstep(0, .08, u)));
    const e = Math.max(sstep(.975, 1, u), 1 - sstep(0, .025, u)), mid = (yt + yb) / 2; w *= 1 - .4 * e * e; yt = lerp(yt, mid + (yt - mid) * .6, e); yb = lerp(yb, mid - (mid - yb) * .6, e);
    return ring(w, yb, yt, t, d.boxy, d.tumble);
  });
}
function cabinGeo(d: CarDef, lift = 0, thick = 0) {
  const p = d.p, Wc = d.W * (d.kind === 'bus' ? .99 : .86), keys = [[p.zD, p.belt - .02], [p.zC, p.roof], [p.zB, p.roof], [p.zA, p.belt - .02]], zs: number[] = [];
  const z0 = thick ? p.zC - .04 : p.zD, z1 = thick ? p.zB + .04 : p.zA; for (let i = 0; i <= 30; i++) zs.push(z0 + (z1 - z0) * i / 30);
  return loft(zs, 22, (z, t) => {
    const yt = keysAt(keys, z) + lift, yb = thick ? yt - thick : p.belt - .06, u = (z - z0) / (z1 - z0), w = Wc / 2 * (1 - .05 * Math.pow(Math.abs(u - .5) * 2, 3)) * (thick ? 1.015 : 1);
    return ring(w, yb, yt, t, thick ? 6 : Math.max(4, d.boxy - 1), d.kind === 'bus' ? .02 : .22);
  });
}
const box = (w: number, h: number, l: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, l).translate(x, y, z).toNonIndexed();
const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 12) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2).translate(x, y, z).toNonIndexed();
const strip = (g: THREE.BufferGeometry) => { g.deleteAttribute('uv'); return g; };

// части: paint (перекрашивается по экземпляру), glass, dark (пластик/резина), chrome, head (фары), tail (стопы), extra (особая окраска: шашки, мигалки)
export interface CarParts { paint: THREE.BufferGeometry; glass: THREE.BufferGeometry; dark: THREE.BufferGeometry; chrome: THREE.BufferGeometry; head: THREE.BufferGeometry; tail: THREE.BufferGeometry; extra: THREE.BufferGeometry | null; wheelPos: THREE.Vector3[] }
export function buildCarParts(d: CarDef): CarParts {
  const p = d.p, F = d.L / 2, Rr = -d.L / 2, W2 = d.W / 2;
  const paint: THREE.BufferGeometry[] = [bodyGeo(d)], glass: THREE.BufferGeometry[] = [cabinGeo(d)], dark: THREE.BufferGeometry[] = [], chrome: THREE.BufferGeometry[] = [], head: THREE.BufferGeometry[] = [], tail: THREE.BufferGeometry[] = [], extra: THREE.BufferGeometry[] = [];
  paint.push(cabinGeo(d, .012, .06));
  if (d.kind === 'bus') {
    // автобус: окна-ленты уже в стекле кабины; двери, бампер
    for (const z of [F - 1.2, 0, -F + 1.5]) dark.push(box(.05, 2.1, 1.2, -W2 - .01, 1.35, z));
    dark.push(box(d.W + .05, .35, .25, 0, .45, F)); dark.push(box(d.W + .05, .35, .25, 0, .45, Rr));
    head.push(box(.4, .18, .05, -W2 + .35, .8, F + .01)); head.push(box(.4, .18, .05, W2 - .35, .8, F + .01));
    tail.push(box(.3, .3, .05, -W2 + .3, 1, Rr - .01)); tail.push(box(.3, .3, .05, W2 - .3, 1, Rr - .01));
    extra.push(box(1.6, .3, .05, 0, 2.7, F + .02));
  } else {
    // бамперы, решётка, фары, стопы, зеркала, ручки, номер
    const bumperC = d.boxy >= 6; const bm = bumperC ? chrome : dark;
    bm.push(box(d.W * .98, .16, .16, 0, .4, F + .02)); bm.push(box(d.W * .98, .16, .16, 0, .42, Rr - .02));
    dark.push(box(d.W * .5, .14, .04, 0, p.noseY - .14, F + .01));
    const hy = p.noseY - .12, hw = d.boxy >= 6 ? .22 : .32;
    if (d.boxy >= 6) { for (const s of [-1, 1]) { head.push(cyl(.09, .04, 0, 0, 0, 14).rotateY(Math.PI / 2).translate(s * (W2 - .26), hy, F + .005)); head.push(cyl(.07, .04, 0, 0, 0, 14).rotateY(Math.PI / 2).translate(s * (W2 - .48), hy, F + .005)); } }
    else for (const s of [-1, 1]) head.push(box(hw, .11, .06, s * (W2 - .24), hy, F - .01));
    for (const s of [-1, 1]) tail.push(box(d.boxy >= 6 ? .3 : .38, .13, .06, s * (W2 - .24), p.tail - .14, Rr + .01));
    for (const s of [-1, 1]) { dark.push(box(.12, .1, .06, s * (W2 + .06), p.belt + .08, p.zA - .15)); chrome.push(box(.02, .025, .12, s * (W2 + .002), p.belt - .12, (p.zA + p.zB) / 2 - .3)); }
    dark.push(box(.52, .12, .02, 0, .52, Rr - .1));
    if (d.kind === 'taxi') { extra.push(box(.6, .16, .22, 0, p.roof + .12, (p.zB + p.zC) / 2)); }
    if (d.kind === 'police') { extra.push(box(1.1, .12, .24, 0, p.roof + .1, (p.zB + p.zC) / 2 + .1)); }
  }
  const wheelPos = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([s, f]) => new THREE.Vector3(s * d.tr / 2, d.R, f * d.wb / 2));
  const m = (a: THREE.BufferGeometry[]) => (a.length ? mergeGeometries(a.map(strip)) : new THREE.BufferGeometry());
  return { paint: m(paint), glass: m(glass), dark: m(dark), chrome: m(chrome), head: m(head), tail: m(tail), extra: extra.length ? m(extra) : null, wheelPos };
}
// колесо: шина + диск (цвета вершин), ось вдоль X
export function wheelGeo() {
  const pts = [[.62, -.5], [.93, -.5], [.99, -.38], [1, 0], [.99, .38], [.93, .5], [.62, .5]].map(([x, y]) => new THREE.Vector2(x, y));
  const tire = new THREE.LatheGeometry(pts, 20).rotateZ(Math.PI / 2).toNonIndexed(); tire.deleteAttribute('uv');
  const rim = new THREE.CylinderGeometry(.62, .62, .9, 16, 1).rotateZ(Math.PI / 2).toNonIndexed(); rim.deleteAttribute('uv');
  const hub = new THREE.CylinderGeometry(.2, .2, .96, 8).rotateZ(Math.PI / 2).toNonIndexed(); hub.deleteAttribute('uv');
  const color = (g: THREE.BufferGeometry, c: number) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  return mergeGeometries([color(tire, 0x151515), color(rim, 0x9a9ea3), color(hub, 0x6a6e73)]);
}
export const MATS = {
  paint: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .32, metalness: .45, clearcoat: 1, clearcoatRoughness: .08 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x1b242c, roughness: .05, metalness: .2, transparent: true, opacity: .78 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x151618, roughness: .7 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xdadde0, roughness: .12, metalness: 1 }),
  head: new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xfff0d0, emissiveIntensity: .4 }),
  tail: new THREE.MeshStandardMaterial({ color: 0x8a0e10, emissive: 0xff1010, emissiveIntensity: .5 }),
  extra: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .3, vertexColors: false }),
  wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .3 }),
};
const partsCache = new Map<string, CarParts>(); let wheelCache: THREE.BufferGeometry | null = null;
export function carParts(id: string) { if (!partsCache.has(id)) partsCache.set(id, buildCarParts(CAR_BY_ID[id])); return partsCache.get(id)!; }
export function sharedWheel() { return (wheelCache = wheelCache || wheelGeo()); }

// одиночная машина (для игрока): группа с отдельными материалами и колёсами
export function buildCarObject(id: string, color: number) {
  const d = CAR_BY_ID[id], parts = carParts(id), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = MATS.paint.clone(); paint.color.setHex(color);
  const head = MATS.head.clone(), tail = MATS.tail.clone(), extra = MATS.extra.clone();
  if (d.kind === 'taxi') extra.color.setHex(0xffd21f), extra.emissive.setHex(0xffc000);
  if (d.kind === 'police') extra.color.setHex(0x2050ff), extra.emissive.setHex(0x2050ff);
  if (d.kind === 'bus') extra.color.setHex(0xffa020), extra.emissive.setHex(0xff9000);
  const add = (g: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh); return mesh; };
  add(parts.paint, paint); add(parts.glass, MATS.glass); add(parts.dark, MATS.dark); add(parts.chrome, MATS.chrome); add(parts.head, head); add(parts.tail, tail); if (parts.extra) add(parts.extra, extra);
  const wheels = parts.wheelPos.map((p, i) => { const pivot = new THREE.Group(), spin = new THREE.Mesh(sharedWheel(), MATS.wheel); spin.scale.set(d.R * (d.kind === 'bus' ? .6 : .45), d.R, d.R); spin.castShadow = true; pivot.add(spin); pivot.position.copy(p); root.add(pivot); return { pivot, spin, front: i < 2 }; });
  root.userData = { def: d, body, paint, head, tail, extra, wheels };
  return root;
}
