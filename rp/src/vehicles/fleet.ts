// Инстансинг реалистичных машин: весь трафик и припаркованные — по одному вызову отрисовки на материал модели.
// Колёса крутятся, фары и стопы светятся «ореолами» (стопы ярче при торможении).
import * as THREE from 'three';
import { ASSETS, CARS, taxiSign } from './carModel';
import { R } from '../world/render';

export interface FleetSlot { model: string; idx: number; color: number; glow: number }
interface ModelSet { body: THREE.InstancedMesh[]; wheels: THREE.InstancedMesh[][]; free: number[]; used: Set<number>; cap: number }
const M = new THREE.Matrix4(), W = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), E = new THREE.Euler();
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
function glowTexture(r: number, g: number, b: number) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.2, `rgba(${r},${g},${b},.5)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
export const Fleet = {
  sets: {} as Record<string, ModelSet>, group: new THREE.Group(),
  heads: null as unknown as THREE.Points, tails: null as unknown as THREE.Points, glowFree: [] as number[], glowCap: 0,
  init(capacity: Record<string, number>) {
    const g = this.group; g.name = 'fleet';
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, cap: number) => { const im = new THREE.InstancedMesh(geo, mat, cap); im.count = 0; im.frustumCulled = false; im.castShadow = R.quality === 'high'; im.receiveShadow = true; g.add(im); return im; };
    let total = 0;
    for (const d of CARS) {
      const cap = capacity[d.id] || 0; if (!cap) continue; const A = ASSETS[d.id]; total += cap;
      const body = A.body.map(p => mk(p.geo, p.mat, cap));
      if (d.kind === 'taxi') { const s = taxiSign(d); s.updateMatrix(); body.push(mk(s.geometry.clone().applyMatrix4(s.matrix), s.material as THREE.Material, cap)); }
      const wheels = A.wheels.map(w => w.parts.map(p => mk(p.geo, p.mat, cap)));
      this.sets[d.id] = { body, wheels, free: Array.from({ length: cap }, (_, i) => cap - 1 - i), used: new Set(), cap };
    }
    // ореолы фар и стопов: по 2 точки на машину
    this.glowCap = total; const mkPts = (tex: THREE.Texture, size: number) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 2 * 3).fill(-9999), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 2 * 3), 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); p.frustumCulled = false; g.add(p); return p; };
    this.heads = mkPts(glowTexture(255, 240, 210), 1.3); this.tails = mkPts(glowTexture(255, 40, 30), .9);
    this.glowFree = Array.from({ length: total }, (_, i) => total - 1 - i);
    R.scene.add(g);
  },
  alloc(model: string, color = 0xffffff): FleetSlot | null {
    const s = this.sets[model]; if (!s) return null; s.free.sort((a, b) => b - a); const idx = s.free.pop(); if (idx === undefined) return null;
    s.used.add(idx); this.recount(s); const glow = this.glowFree.pop() ?? -1; return { model, idx, color, glow };
  },
  release(slot: FleetSlot) {
    const s = this.sets[slot.model]; this.hide(slot); s.free.push(slot.idx); s.used.delete(slot.idx); this.recount(s);
    if (slot.glow >= 0) this.glowFree.push(slot.glow);
  },
  recount(s: ModelSet) { let m = -1; for (const i of s.used) if (i > m) m = i; for (const im of s.body) im.count = m + 1; for (const w of s.wheels) for (const im of w) im.count = m + 1; },
  place(slot: FleetSlot, x: number, y: number, z: number, heading: number, spin = 0, steer = 0, brake = false, roll = 0, lit = true) {
    const s = this.sets[slot.model], A = ASSETS[slot.model], d = A.def;
    E.set(0, heading, roll, 'YXZ'); Q.setFromEuler(E); M.compose(P.set(x, y, z), Q, S.set(1, 1, 1));
    for (const im of s.body) { im.setMatrixAt(slot.idx, M); im.instanceMatrix.needsUpdate = true; }
    A.wheels.forEach((w, k) => {
      W.makeRotationY(k < 2 ? steer : 0).multiply(new THREE.Matrix4().makeRotationX(spin)); W.setPosition(w.center); const mw = M.clone().multiply(W);
      for (const im of s.wheels[k]) { im.setMatrixAt(slot.idx, mw); im.instanceMatrix.needsUpdate = true; }
    });
    if (slot.glow >= 0) {
      const c = Math.cos(heading), sn = Math.sin(heading), hp = this.heads.geometry.attributes.position as THREE.BufferAttribute, tp = this.tails.geometry.attributes.position as THREE.BufferAttribute;
      const hc = this.heads.geometry.attributes.color as THREE.BufferAttribute, tc = this.tails.geometry.attributes.color as THREE.BufferAttribute;
      for (let k = 0; k < 2; k++) {
        const sx = (k ? 1 : -1) * d.W * .36, fz = d.L / 2 + .02, rz = -d.L / 2 - .02, hy = d.kind === 'bus' ? .9 : d.H * .42, ty = d.kind === 'bus' ? 1.1 : d.H * .5;
        hp.setXYZ(slot.glow * 2 + k, x + sx * c + fz * sn, y + hy, z - sx * sn + fz * c); tp.setXYZ(slot.glow * 2 + k, x + sx * c + rz * sn, y + ty, z - sx * sn + rz * c);
        const h = lit ? 1 : 0; hc.setXYZ(slot.glow * 2 + k, h, h, h); const b = !lit ? 0 : brake ? 1 : .35; tc.setXYZ(slot.glow * 2 + k, b, b, b);
      }
      hp.needsUpdate = tp.needsUpdate = hc.needsUpdate = tc.needsUpdate = true;
    }
  },
  hide(slot: FleetSlot) {
    const s = this.sets[slot.model]; for (const im of s.body) { im.setMatrixAt(slot.idx, HIDE); im.instanceMatrix.needsUpdate = true; } for (const w of s.wheels) for (const im of w) { im.setMatrixAt(slot.idx, HIDE); im.instanceMatrix.needsUpdate = true; }
    if (slot.glow >= 0) { const hp = this.heads.geometry.attributes.position as THREE.BufferAttribute, tp = this.tails.geometry.attributes.position as THREE.BufferAttribute; for (let k = 0; k < 2; k++) { hp.setXYZ(slot.glow * 2 + k, 0, -9999, 0); tp.setXYZ(slot.glow * 2 + k, 0, -9999, 0); } hp.needsUpdate = tp.needsUpdate = true; }
  },
  // вечером и ночью фары горят, днём — только стопы при торможении
  setNight(k: number, rain = 0) { (this.heads.material as THREE.PointsMaterial).opacity = Math.max(k, rain * .6) * .9; (this.tails.material as THREE.PointsMaterial).opacity = .35 + Math.max(k, rain * .5) * .55; },
};
