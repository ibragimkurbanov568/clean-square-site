// Инстансинг машин: весь трафик и припаркованные — несколько вызовов отрисовки на модель
import * as THREE from 'three';
import { CARS, carParts, sharedWheel, MATS } from './carModel';
import { R } from '../world/render';

export interface FleetSlot { model: number; idx: number; color: number }
interface ModelSet { meshes: THREE.InstancedMesh[]; paint: THREE.InstancedMesh; tail: THREE.InstancedMesh; head: THREE.InstancedMesh; free: number[]; used: Set<number> }
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0), E = new THREE.Euler(), C = new THREE.Color();
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

// стопы: яркость по цвету экземпляра (торможение)
const tailMat = MATS.tail.clone(); tailMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance *= vColor.r*vColor.r;\n#endif'); };
const headMat = MATS.head.clone();
const extraMats: Record<string, THREE.MeshStandardMaterial> = {
  taxi: new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0xffb000, emissiveIntensity: .4 }),
  police: new THREE.MeshStandardMaterial({ color: 0x2050ff, emissive: 0x2050ff, emissiveIntensity: 1 }),
  bus: new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0xff9000, emissiveIntensity: .8 }),
};
export const Fleet = {
  sets: [] as ModelSet[], wheels: null as unknown as THREE.InstancedMesh, wheelFree: [] as number[],
  init(capacity: number[]) {
    const g = new THREE.Group(); g.name = 'fleet';
    CARS.forEach((d, mi) => {
      const parts = carParts(d.id), cap = capacity[mi] || 0, list: THREE.InstancedMesh[] = [];
      const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, cap)); im.count = Math.max(1, cap); im.frustumCulled = false; im.castShadow = shadow && R.quality === 'high'; im.receiveShadow = true; for (let i = 0; i < cap; i++) im.setMatrixAt(i, HIDE); list.push(im); g.add(im); return im; };
      const paint = mk(parts.paint, MATS.paint); for (let i = 0; i < cap; i++) paint.setColorAt(i, C.set(0xffffff));
      mk(parts.glass, MATS.glass, false); mk(parts.dark, MATS.dark); mk(parts.chrome, MATS.chrome, false);
      const head = mk(parts.head, headMat, false), tail = mk(parts.tail, tailMat, false); for (let i = 0; i < cap; i++) tail.setColorAt(i, C.setScalar(1));
      if (parts.extra) mk(parts.extra, extraMats[d.kind] || MATS.extra, false);
      this.sets.push({ meshes: list, paint, tail, head, free: Array.from({ length: cap }, (_, i) => cap - 1 - i), used: new Set() }); for (const im of list) im.count = 0;
    });
    const total = capacity.reduce((a, b) => a + b, 0) * 4;
    this.wheels = new THREE.InstancedMesh(sharedWheel(), MATS.wheel, total); this.wheels.frustumCulled = false; this.wheels.castShadow = false;
    for (let i = 0; i < total; i++) this.wheels.setMatrixAt(i, HIDE);
    this.wheelFree = Array.from({ length: total }, (_, i) => total - 1 - i); g.add(this.wheels); this.wheels.count = 0;
    R.scene.add(g);
  },
  alloc(model: number, color: number): FleetSlot | null {
    const s = this.sets[model]; s.free.sort((a, b) => b - a); const idx = s.free.pop(); if (idx === undefined) return null; s.used.add(idx); this.recount(s);
    s.paint.setColorAt(idx, C.set(color)); s.paint.instanceColor!.needsUpdate = true;
    this.wheelFree.sort((a, b) => b - a); const slot: any = { model, idx, color, wheels: [this.wheelFree.pop(), this.wheelFree.pop(), this.wheelFree.pop(), this.wheelFree.pop()] };
    this.wheels.count = Math.max(this.wheels.count, ...slot.wheels.map((w: number) => w + 1));
    return slot;
  },
  release(slot: FleetSlot) {
    const s = this.sets[slot.model]; for (const im of s.meshes) { im.setMatrixAt(slot.idx, HIDE); im.instanceMatrix.needsUpdate = true; }
    for (const w of (slot as any).wheels) if (w !== undefined) { this.wheels.setMatrixAt(w, HIDE); this.wheelFree.push(w); }
    this.wheels.instanceMatrix.needsUpdate = true; s.free.push(slot.idx); s.used.delete(slot.idx); this.recount(s);
  },
  // рисуем только до последнего занятого слота
  recount(s: ModelSet) { let m = -1; for (const i of s.used) if (i > m) m = i; for (const im of s.meshes) im.count = m + 1; },
  // положение: x,z, курс, наклон по тангажу/крену, вращение колёс, поворот руля, тормоз
  place(slot: FleetSlot, x: number, y: number, z: number, heading: number, spin = 0, steer = 0, brake = false, roll = 0) {
    const d = CARS[slot.model], s = this.sets[slot.model];
    E.set(0, heading, roll, 'YXZ'); Q.setFromEuler(E); M.compose(P.set(x, y, z), Q, S.set(1, 1, 1));
    for (const im of s.meshes) { im.setMatrixAt(slot.idx, M); im.instanceMatrix.needsUpdate = true; }
    s.tail.setColorAt(slot.idx, C.setScalar(brake ? 2.4 : 1)); s.tail.instanceColor!.needsUpdate = true;
    const ws = (slot as any).wheels as number[], parts = carParts(d.id), wScale = d.kind === 'bus' ? .3 : .2;
    for (let k = 0; k < 4; k++) {
      const wp = parts.wheelPos[k], c = Math.cos(heading), sn = Math.sin(heading);
      const wx = x + wp.x * c + wp.z * sn, wz = z - wp.x * sn + wp.z * c;
      E.set(spin, heading + (k < 2 ? steer : 0), 0, 'YXZ'); Q.setFromEuler(E); M.compose(P.set(wx, y + wp.y, wz), Q, S.set(wScale, d.R, d.R));
      this.wheels.setMatrixAt(ws[k], M);
    }
    this.wheels.instanceMatrix.needsUpdate = true;
  },
  hide(slot: FleetSlot) { const s = this.sets[slot.model]; for (const im of s.meshes) { im.setMatrixAt(slot.idx, HIDE); im.instanceMatrix.needsUpdate = true; } for (const w of (slot as any).wheels) this.wheels.setMatrixAt(w, HIDE); this.wheels.instanceMatrix.needsUpdate = true; },
  setNight(k: number) { headMat.emissiveIntensity = .3 + k * 3; tailMat.emissiveIntensity = .4 + k * 1.2; },
};
