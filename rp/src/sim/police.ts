// Полиция и розыск: патрульные машины едут к игроку по улицам (маршрут по сетке), в конце — напрямую, таранят.
// Арест, если игрок стоит рядом с полицией; розыск спадает, если долго не попадаться на глаза.
import * as THREE from 'three';
import { nearestNode, nodePos, routeGrid } from '../world/citygen';
import { spawnVehicle, destroyVehicle, driveVehicle, syncVehicle, Vehicle, vehicleHeading, flipIfNeeded } from '../vehicles/vehicle';
import { angDiff, clamp, rand } from '../core/util';

export interface Cop { v: Vehicle; path: THREE.Vector3[]; repath: number; stuck: number; back: number }
export const Police = {
  cops: [] as Cop[], lost: 0, seen: 0, bust: 0, spawnT: 0,
  onBust: null as null | (() => void), onClear: null as null | (() => void), onDrop: null as null | ((w: number) => void),
  update(dt: number, wanted: number, pl: THREE.Vector3, plSpeed: number) {
    const want = wanted === 0 ? 0 : Math.min(5, wanted + (wanted >= 3 ? 1 : 0));
    this.spawnT -= dt;
    if (this.cops.length < want && this.spawnT <= 0) { this.spawnT = 6; this.spawn(pl); }
    if (wanted === 0 && this.cops.length) { for (const c of this.cops) if (c.v.obj.position.distanceTo(pl) > 120) { destroyVehicle(c.v); c.v = null as any; } this.cops = this.cops.filter(c => c.v); }
    let nearest = 1e9, closeSlow = false;
    for (const c of this.cops) {
      const p = c.v.obj.position, d = p.distanceTo(pl); nearest = Math.min(nearest, d);
      if (d < 7 && plSpeed < 2 && Math.abs(c.v.speed) < 3) closeSlow = true;
      if (wanted > 0) this.drive(c, dt, pl, d); else { driveVehicle(c.v, dt, 0, 1, 0, false, false); syncVehicle(c.v, dt); }
      if (d > 420) { destroyVehicle(c.v); c.v = null as any; }
    }
    this.cops = this.cops.filter(c => c.v);
    if (wanted > 0) {
      // арест
      if (closeSlow) { this.bust += dt; if (this.bust > 3) { this.bust = 0; this.onBust?.(); } } else this.bust = Math.max(0, this.bust - dt);
      // ушёл от погони: звёзды падают по одной
      if (nearest > 110) { this.lost += dt; if (this.lost > 14) { this.lost = 0; this.onDrop?.(wanted - 1); } } else this.lost = 0;
    } else { this.bust = 0; this.lost = 0; }
    return nearest;
  },
  spawn(pl: THREE.Vector3) {
    const [ni, nj] = nearestNode(pl.x, pl.z);
    for (let t = 0; t < 10; t++) {
      const i = clamp(ni + Math.round(rand(-2, 2)), 0, 13), j = clamp(nj + Math.round(rand(-2, 2)), 0, 13), p = nodePos(i, j), d = Math.hypot(p.x - pl.x, p.z - pl.z);
      if (d < 110 || d > 300) continue;
      const v = spawnVehicle('police', 0xf4f4f4, p.x + 2, p.z, Math.atan2(pl.x - p.x, pl.z - p.z)); v.lights = true;
      this.cops.push({ v, path: [], repath: 0, stuck: 0, back: 0 }); return;
    }
  },
  drive(c: Cop, dt: number, pl: THREE.Vector3, d: number) {
    const p = c.v.obj.position; c.repath -= dt;
    if (c.repath <= 0) { c.repath = 2; const route = routeGrid(nearestNode(p.x, p.z), nearestNode(pl.x, pl.z)); c.path = route.slice(1).map(([i, j]) => { const q = nodePos(i, j); return new THREE.Vector3(q.x, 0, q.z); }); }
    let target = pl.clone();
    if (d > 45 && c.path.length) { target = c.path[0]; if (Math.hypot(target.x - p.x, target.z - p.z) < 12) c.path.shift(); }
    const h = vehicleHeading(c.v), want = Math.atan2(target.x - p.x, target.z - p.z), err = angDiff(h, want);
    const steer = clamp(-err * 2.2, -1, 1);
    let gas = 1, brake = 0; const sp = c.v.speed;
    if (Math.abs(err) > .9 && sp > 12) { gas = 0; brake = 1; }
    if (d < 10) { gas = sp > 6 ? 0 : .6; }
    // застрял — сдаёт назад
    if (Math.abs(sp) < .8 && gas > 0) c.stuck += dt; else c.stuck = Math.max(0, c.stuck - dt);
    if (c.stuck > 1.6) { c.back = 1.2; c.stuck = 0; }
    if (c.back > 0) { c.back -= dt; driveVehicle(c.v, dt, 0, 1, -steer, false, false); }
    else driveVehicle(c.v, dt, gas, brake, steer, false, false);
    flipIfNeeded(c.v); syncVehicle(c.v, dt);
  },
  clear() { for (const c of this.cops) destroyVehicle(c.v); this.cops = []; this.bust = 0; this.lost = 0; },
};
