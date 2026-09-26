// Городской трафик: машины ездят по полосам сетки, соблюдают светофоры, держат дистанцию,
// тормозят перед игроком и пешеходами, сигналят. Появляются вокруг игрока и исчезают вдали.
import * as THREE from 'three';
import { CITY, HALF, LANES, PITCH, roadLine } from '../world/citygen';
import { Fleet, FleetSlot } from '../vehicles/fleet';
import { CARS } from '../vehicles/carModel';
import { createKinematicBox, PH, quatY } from '../core/physics';
import { clamp, pick, rand } from '../core/util';
import type RAPIER from '@dimforge/rapier3d-compat';

// ---------- светофоры ----------
export const CYCLE = 30;
// 0 зелёный, 1 жёлтый, 2 красный; axis: 0 — движение вдоль X, 1 — вдоль Z
export function lightState(i: number, j: number, axis: 0 | 1, t: number) {
  const ph = (t + i * 7 + j * 11) % CYCLE;
  if (axis === 0) return ph < 12 ? 0 : ph < 15 ? 1 : 2;
  return ph < 16 ? 2 : ph < 27 ? 0 : ph < 29.5 ? 1 : 2;
}

type Node = [number, number];
export interface TCar {
  slot: FleetSlot; model: number; color: number; def: typeof CARS[number];
  a: Node; b: Node; lane: number; s: number; L: number; v: number; vmax: number;
  turn: { p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3; len: number; t: number; to: [Node, Node] } | null;
  next: [Node, Node] | null; x: number; z: number; h: number; spin: number; steer: number; brake: boolean;
  wait: number; honk: number; body: RAPIER.RigidBody | null; kind: 'civ' | 'police' | 'taxi' | 'bus'; id: number; flee?: number; police?: any; stolen?: boolean;
}
const nodeValid = (n: Node) => n[0] >= 0 && n[1] >= 0 && n[0] <= CITY.N && n[1] <= CITY.N;
const P = (n: Node) => new THREE.Vector3(roadLine(n[0]), 0, roadLine(n[1]));
function dirOf(a: Node, b: Node) { return [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])]; }
// точка на полосе ребра a→b на расстоянии s от центра перекрёстка a
function lanePoint(a: Node, b: Node, lane: number, s: number, out = new THREE.Vector3()) {
  const [dx, dz] = dirOf(a, b), off = LANES[lane];
  return out.set(roadLine(a[0]) + dx * s - dz * off, 0, roadLine(a[1]) + dz * s + dx * off);
}
const HR = CITY.ROAD / 2, STOP = HR + 5.4, ENTER = HR + 1;
export const Traffic = {
  cars: [] as TCar[], t: 0, target: 40, nextId: 1,
  radius: 260, player: new THREE.Vector3(), playerV: new THREE.Vector3(), obstacles: [] as { x: number; z: number; r: number }[],
  init(target: number) { this.target = target; },
  spawnAt(a: Node, b: Node, lane: number, s: number, kind: TCar['kind'] = 'civ', model?: number, color?: number): TCar | null {
    const mi = model ?? pick([0, 0, 1, 1, 2, 3, 4, 5, 5, 2, 7], Math.random); const d = CARS[mi];
    const col = color ?? (d.kind === 'police' ? 0xf4f4f4 : d.kind === 'taxi' ? 0xffd21f : d.kind === 'bus' ? 0xe8e0c8 : pick([0xf2f2f2, 0x1a1a1c, 0x8a8f96, 0xb3b7bc, 0x7a1e1e, 0x1f3a6b, 0x2f5d3a, 0xc9b28a, 0x5a3b2a, 0x9c2a2a, 0x3b4a5a, 0xd8d0b8, 0x274b8c, 0x6b6b30]));
    const slot = Fleet.alloc(mi, col); if (!slot) return null;
    const L = PITCH;
    const c: TCar = { slot, model: mi, color: col, def: d, a, b, lane, s, L, v: 8, vmax: (d.kind === 'bus' ? 11 : rand(12.5, 16.5)), turn: null, next: null, x: 0, z: 0, h: 0, spin: 0, steer: 0, brake: false, wait: 0, honk: 0, body: null, kind: d.kind === 'police' ? 'police' : d.kind === 'taxi' ? 'taxi' : d.kind === 'bus' ? 'bus' : kind, id: this.nextId++ };
    c.body = createKinematicBox(d.W / 2, d.kind === 'bus' ? 1.3 : .65, d.L / 2);
    this.pose(c); c.body.setTranslation({ x: c.x, y: 0, z: c.z }, true); c.body.setRotation(quatY(c.h), true);
    this.cars.push(c); return c;
  },
  despawn(c: TCar) { Fleet.release(c.slot); if (c.body) PH.world.removeRigidBody(c.body); this.cars.splice(this.cars.indexOf(c), 1); },
  pickNext(c: TCar): [Node, Node] | null {
    const [dx, dz] = dirOf(c.a, c.b), opts: [Node, Node, number][] = [];
    const straight: Node = [c.b[0] + dx, c.b[1] + dz], right: Node = [c.b[0] - dz, c.b[1] + dx], left: Node = [c.b[0] + dz, c.b[1] - dx];
    // правый ряд — прямо или направо, левый — прямо или налево
    if (nodeValid(straight)) opts.push([c.b, straight, 3]);
    if (c.lane === 1 && nodeValid(right)) opts.push([c.b, right, 2]);
    if (c.lane === 0 && nodeValid(left)) opts.push([c.b, left, 1.5]);
    if (!opts.length) { if (nodeValid(right)) opts.push([c.b, right, 1]); if (nodeValid(left)) opts.push([c.b, left, 1]); }
    if (!opts.length) return null;
    let sum = opts.reduce((a, o) => a + o[2], 0), r = Math.random() * sum; for (const o of opts) { r -= o[2]; if (r <= 0) return [o[0], o[1]]; } return [opts[0][0], opts[0][1]];
  },
  pose(c: TCar) {
    if (c.turn) { const t = c.turn.t, u = 1 - t, p = c.turn; const x = u * u * p.p0.x + 2 * u * t * p.p1.x + t * t * p.p2.x, z = u * u * p.p0.z + 2 * u * t * p.p1.z + t * t * p.p2.z; const tx = 2 * u * (p.p1.x - p.p0.x) + 2 * t * (p.p2.x - p.p1.x), tz = 2 * u * (p.p1.z - p.p0.z) + 2 * t * (p.p2.z - p.p1.z); c.x = x; c.z = z; c.h = Math.atan2(tx, tz); return; }
    const v = lanePoint(c.a, c.b, c.lane, c.s); const [dx, dz] = dirOf(c.a, c.b); c.x = v.x; c.z = v.z; c.h = Math.atan2(dx, dz);
  },
  // расстояние до ближайшей помехи впереди (машины, игрок, пешеходы) в конусе
  gapAhead(c: TCar, look: number) {
    const fx = Math.sin(c.h), fz = Math.cos(c.h); let gap = look;
    const test = (x: number, z: number, r: number) => { const dx = x - c.x, dz = z - c.z, f = dx * fx + dz * fz; if (f <= 0 || f > look) return; const side = Math.abs(dx * fz - dz * fx); if (side < 1.3 + r) gap = Math.min(gap, f - c.def.L / 2 - r); };
    for (const o of this.cars) if (o !== c && Math.abs(o.x - c.x) < look && Math.abs(o.z - c.z) < look) test(o.x, o.z, o.def.L / 2);
    test(this.player.x, this.player.z, 1.4);
    for (const o of this.obstacles) if (Math.abs(o.x - c.x) < look && Math.abs(o.z - c.z) < look) test(o.x, o.z, o.r);
    return gap;
  },
  update(dt: number, tsim: number) {
    this.t = tsim;
    // поддерживаем плотность вокруг игрока
    let near = 0; for (const c of this.cars) if (Math.hypot(c.x - this.player.x, c.z - this.player.z) < this.radius) near++;
    for (let k = 0; k < 3 && near < this.target; k++) { if (this.trySpawn()) near++; }
    for (const c of [...this.cars]) {
      const dist = Math.hypot(c.x - this.player.x, c.z - this.player.z);
      if (dist > this.radius + 90 && !c.police) { this.despawn(c); continue; }
      this.step(c, dt);
    }
  },
  trySpawn() {
    const N = CITY.N, px = this.player.x, pz = this.player.z;
    for (let tries = 0; tries < 6; tries++) {
      const vertical = Math.random() < .5, line = Math.floor(Math.random() * (N + 1)), seg = Math.floor(Math.random() * N);
      const a: Node = vertical ? [line, seg] : [seg, line], b: Node = vertical ? [line, seg + 1] : [seg + 1, line];
      const fwd = Math.random() < .5, A = fwd ? a : b, B = fwd ? b : a, lane = Math.random() < .5 ? 0 : 1, s = rand(ENTER + 4, PITCH - STOP - 4);
      const p = lanePoint(A, B, lane, s), d = Math.hypot(p.x - px, p.z - pz);
      if (d < 90 || d > this.radius) continue;
      if (this.cars.some(o => Math.abs(o.x - p.x) < 9 && Math.abs(o.z - p.z) < 9)) continue;
      return this.spawnAt(A, B, lane, s);
    }
    return null;
  },
  step(c: TCar, dt: number) {
    if (c.flee !== undefined) { c.flee -= dt; }
    // желаемая скорость: ограничение, светофор, помеха впереди
    let vt = c.vmax;
    const gap = this.gapAhead(c, 22);
    vt = Math.min(vt, Math.max(0, (gap - 2) * 1.1));
    if (!c.turn) {
      const toStop = c.L - STOP - c.s;
      if (!c.next) c.next = this.pickNext(c);
      const [dx] = dirOf(c.a, c.b), axis: 0 | 1 = dx !== 0 ? 0 : 1, st = lightState(c.b[0], c.b[1], axis, this.t);
      if (st !== 0 && toStop > -.5 && !(st === 1 && toStop < c.v * .6)) vt = Math.min(vt, Math.max(0, toStop * .9));
      if (!c.next && toStop < 12) vt = Math.min(vt, Math.max(0, toStop));
    }
    const acc = vt > c.v ? 2.6 : -7.5; c.v = clamp(c.v + acc * dt, 0, Math.max(vt, c.v + acc * dt < vt ? vt : 0));
    if (vt < c.v) c.v = Math.max(vt, c.v - 7.5 * dt);
    c.brake = vt < c.v - .3 || c.v < .3;
    // ожидание: сигналит, если мешает игрок
    if (c.v < .5 && gap < 8) { c.wait += dt; if (c.wait > 2.5 && c.honk <= 0) { c.honk = 6; this.onHonk?.(c); } } else c.wait = 0;
    c.honk -= dt;
    const ds = c.v * dt;
    if (c.turn) {
      c.turn.t += ds / c.turn.len;
      if (c.turn.t >= 1) { const [a, b] = c.turn.to; c.a = a; c.b = b; c.s = ENTER + (c.turn.t - 1) * c.turn.len; c.turn = null; c.next = null; }
    } else {
      c.s += ds;
      if (c.s > c.L - STOP + 3.9 && c.next) {
        const p0 = lanePoint(c.a, c.b, c.lane, c.L - STOP + 4), p2 = lanePoint(c.next[0], c.next[1], c.lane, ENTER);
        const [dx, dz] = dirOf(c.a, c.b), proj = (p2.x - p0.x) * dx + (p2.z - p0.z) * dz;
        const straight = dirOf(c.next[0], c.next[1]).join() === [dx, dz].join();
        const p1 = straight ? p0.clone().lerp(p2, .5) : new THREE.Vector3(p0.x + dx * proj, 0, p0.z + dz * proj);
        const len = p0.distanceTo(p1) + p1.distanceTo(p2);
        c.turn = { p0, p1, p2, len: Math.max(1, len * .95), t: 0, to: c.next };
      } else if (c.s > c.L - HR && !c.next) { c.v = 0; }
    }
    const oh = c.h; this.pose(c);
    c.steer = clamp(((c.h - oh + Math.PI * 3) % (Math.PI * 2) - Math.PI) / Math.max(.02, dt) * .25, -.5, .5);
    c.spin += ds / c.def.R;
    if (c.body) { c.body.setNextKinematicTranslation({ x: c.x, y: 0, z: c.z }); c.body.setNextKinematicRotation(quatY(c.h)); }
  },
  render(cam: THREE.Vector3) {
    for (const c of this.cars) {
      const d2 = (c.x - cam.x) ** 2 + (c.z - cam.z) ** 2;
      if (d2 > 450 * 450) { Fleet.hide(c.slot); continue; }
      Fleet.place(c.slot, c.x, 0, c.z, c.h, c.spin, c.steer, c.brake);
    }
  },
  onHonk: null as null | ((c: TCar) => void),
};
export { HALF };
