// Управляемая машина (игрок): физика Rapier + модель + звук, топливо и повреждения
import * as THREE from 'three';
import { buildCarObject, CAR_BY_ID, CarDef } from './carModel';
import { createVehicle, removeVehicle, VehPhys } from '../core/physics';
import { R } from '../world/render';
import { clamp, damp } from '../core/util';

export interface Vehicle {
  id: string; def: CarDef; color: number; obj: THREE.Group; ph: VehPhys; owned: string | null; plate: string;
  fuel: number; dmg: number; speed: number; rpm: number; gear: number; steer: number; lights: boolean; brake: boolean; slip: number; job?: string;
}
let nextId = 1;
const FWD = new Set(['l15', 'l04', 'dn', 'k3', 'kac', 'v09p', 'taxi', 'raf']), AWD = new Set(['ldx', 'stc', 'ssp', 'u469']);
export function spawnVehicle(model: string, color: number, x: number, z: number, h: number, owned: string | null = null, plate = ''): Vehicle {
  const def = CAR_BY_ID[model], obj = buildCarObject(model, color); R.scene.add(obj);
  const ph = createVehicle(def, x, .6, z, h);
  const v: Vehicle = { id: 'v' + nextId++, def, color, obj, ph, owned, plate, fuel: 1, dmg: 0, speed: 0, rpm: 0, gear: 1, steer: 0, lights: false, brake: false, slip: 0 };
  syncVehicle(v, 0); return v;
}
export function destroyVehicle(v: Vehicle) { removeVehicle(v.ph); v.obj.removeFromParent(); }

// управление: газ/тормоз/руль/ручник; engineOn — есть ли водитель
export function driveVehicle(v: Vehicle, dt: number, gas: number, brake: number, steer: number, hb: boolean, nitro: boolean) {
  const { ctl, body } = v.ph, d = v.def, vel = body.linvel(), rot = body.rotation();
  const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const vf = vel.x * fwd.x + vel.y * fwd.y + vel.z * fwd.z; v.speed = vf;
  const kmh = Math.abs(vf) * 3.6, noFuel = v.fuel <= 0, broken = v.dmg >= 100;
  // руль: меньше угол на скорости
  const maxSteer = .62 / (1 + Math.abs(vf) / 14);
  v.steer = damp(v.steer, -steer * maxSteer, 6, dt);
  ctl.setWheelSteering(0, v.steer); ctl.setWheelSteering(1, v.steer);
  // тяга: мощность → сила, ограничение максималки, задний ход при остановке
  const powerW = d.power * 745.7 * (nitro ? 1.35 : 1) * (1 - v.dmg / 250);
  let force = 0, brakeF = 0;
  if (!noFuel && !broken) {
    const grip = d.mass * (1.6 + d.power / 70);
    if (gas > 0) { force = kmh < d.maxSpeed ? Math.min(grip, powerW / Math.max(4, Math.abs(vf))) * gas : 0; if (vf < -.5) { brakeF = d.mass * .12; force = 0; } }
    if (brake > 0) { if (vf > .8) brakeF = d.mass * .16 * brake; else force = -Math.min(d.mass * 2.2, powerW / 6) * brake * (kmh < 30 ? 1 : 0); }
  }
  if (gas === 0 && brake === 0) brakeF = d.mass * .006;
  // сопротивление воздуха: на максималке уравновешивает мощность
  const vm = d.maxSpeed / 3.6, kd = d.power * 745.7 / (vm * vm * vm), sp = Math.hypot(vel.x, vel.z);
  if (sp > 1) body.applyImpulse({ x: -vel.x * sp * kd * dt, y: 0, z: -vel.z * sp * kd * dt }, true);
  // привод: классика и грузовые — задний, современные легковые — передний, внедорожники — полный
  const drive = FWD.has(d.id) ? [0, 1] : AWD.has(d.id) ? [0, 1, 2, 3] : [2, 3];
  for (let i = 0; i < 4; i++) { ctl.setWheelEngineForce(i, drive.includes(i) ? force / drive.length : 0); ctl.setWheelBrake(i, brakeF / 4); }
  // ручник: блок задних колёс и меньше сцепления — занос
  for (const i of [2, 3]) { ctl.setWheelFrictionSlip(i, hb ? .9 : 1.9); if (hb) ctl.setWheelBrake(i, d.mass * .06); }
  v.brake = brake > 0 && vf > .5 || hb;
  // расход топлива
  v.fuel = Math.max(0, v.fuel - Math.abs(force) * Math.abs(vf) * dt / (d.mass * 9e4));
  // обороты и передачи для звука и HUD
  const ratios = [0, 3.2, 2.1, 1.5, 1.15, .92, .78], top = d.maxSpeed / 3.6;
  let g = 1; for (let i = 1; i <= 5; i++) if (Math.abs(vf) > top * [0, .18, .36, .55, .75, 1][i]) g = i + 1; v.gear = vf < -.5 ? -1 : Math.min(6, g);
  const lo = top * [0, 0, .18, .36, .55, .75, 1][Math.max(1, v.gear)] * .8, hi = top * [0, .18, .36, .55, .75, 1, 1.1][Math.max(1, v.gear)];
  v.rpm = damp(v.rpm, clamp((Math.abs(vf) - lo) / Math.max(1, hi - lo), 0, 1) * .85 + gas * .15, 8, dt); void ratios;
}
// скольжение колёс (для звука шин и дыма)
export function wheelSlip(v: Vehicle) { let s = 0; for (let i = 0; i < 4; i++) s = Math.max(s, Math.abs(v.ph.ctl.wheelSideImpulse(i) || 0)); return clamp(s / (v.def.mass * .012) - .3, 0, 1); }

const tq = new THREE.Quaternion();
export function syncVehicle(v: Vehicle, dt: number) {
  const b = v.ph.body, p = b.translation(), r = b.rotation(), ctl = v.ph.ctl;
  v.obj.position.set(p.x, p.y, p.z); v.obj.quaternion.set(r.x, r.y, r.z, r.w);
  const w = (v.obj.userData.wheels as { pivot: THREE.Group; spin: THREE.Object3D; front: boolean; rest: THREE.Vector3 }[]);
  w.forEach((wh, i) => {
    const conn = ctl.wheelChassisConnectionPointCs(i), len = ctl.wheelSuspensionLength(i) ?? .2;
    if (conn) wh.pivot.position.set(wh.rest.x, conn.y - len, wh.rest.z);
    wh.pivot.rotation.y = wh.front ? ctl.wheelSteering(i) ?? 0 : 0; wh.spin.rotation.x = ctl.wheelRotation(i) ?? 0;
  });
  const ud = v.obj.userData;
  for (const m of ud.lightMats.tail as THREE.MeshStandardMaterial[]) m.emissiveIntensity = v.brake ? 4 : v.lights ? 1.2 : .15;
  for (const m of ud.lightMats.head as THREE.MeshStandardMaterial[]) m.emissiveIntensity = v.lights ? 3 : .15;
  if (ud.glow) { ud.glow.visible = v.lights; for (const c of ud.tglow.children) c.material.opacity = v.brake ? 1 : v.lights ? .45 : 0; }
  if (ud.beacon) { const on = Math.floor(performance.now() / 180) % 2; ud.beacon.children[0].visible = !!on; ud.beacon.children[1].visible = !on; }
  void dt; void tq;
}
export function vehicleForward(v: Vehicle) { const r = v.ph.body.rotation(); return new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w)); }
export function vehicleHeading(v: Vehicle) { const f = vehicleForward(v); return Math.atan2(f.x, f.z); }
// перевернулась — ставим на колёса
export function flipIfNeeded(v: Vehicle) {
  const r = v.ph.body.rotation(), up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
  if (up.y < .3) { const h = vehicleHeading(v), p = v.ph.body.translation(); v.ph.body.setTranslation({ x: p.x, y: p.y + 1.2, z: p.z }, true); v.ph.body.setRotation({ x: 0, y: Math.sin(h / 2), z: 0, w: Math.cos(h / 2) }, true); v.ph.body.setAngvel({ x: 0, y: 0, z: 0 }, true); return true; }
  return false;
}
