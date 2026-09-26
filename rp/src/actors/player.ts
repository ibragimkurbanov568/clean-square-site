// Игрок: пешком (контроллер персонажа), в машине, посадка/угон, камера от третьего лица
import * as THREE from 'three';
import { Inp } from '../core/input';
import { PH, createCharacter, GROUP_STATIC } from '../core/physics';
import { createHuman, Human, play, Look } from './human';
import { R } from '../world/render';
import { Vehicle, driveVehicle, syncVehicle, vehicleHeading, wheelSlip } from '../vehicles/vehicle';
import { angDiff, clamp, damp, lerp } from '../core/util';
import { Snd } from '../core/audio';

export const Player = {
  h: null as unknown as Human, ch: null as unknown as ReturnType<typeof createCharacter>,
  pos: new THREE.Vector3(), heading: 0, vy: 0, grounded: true, speed: 0, inCar: null as Vehicle | null, busy: 0, animLock: 0,
  camYaw: 0, camPitch: .25, camDist: 4.4, camMode: 0, camIdle: 0, camPos: new THREE.Vector3(), camLook: new THREE.Vector3(),
  stepT: 0, frozen: false,
  init(look: Look, x: number, z: number, h: number) {
    if (this.h) this.h.root.removeFromParent();
    this.h = createHuman(look); R.scene.add(this.h.root);
    if (!this.ch) this.ch = createCharacter(x, 1, z); else this.ch.body.setTranslation({ x, y: 1, z }, true);
    this.pos.set(x, 0, z); this.heading = h; this.camYaw = h + Math.PI; this.camPos.set(x - Math.sin(h) * 5, 3, z - Math.cos(h) * 5);
  },
  setLook(look: Look) { const p = this.pos.clone(); this.h.root.removeFromParent(); this.h = createHuman(look); R.scene.add(this.h.root); this.h.root.position.copy(p); },
  // ---------- пешком ----------
  updateFoot(dt: number) {
    const sens = .0035;
    this.camYaw -= Inp.lookX * sens; this.camPitch = clamp(this.camPitch + Inp.lookY * sens, -.35, 1.1);
    if (this.frozen) { this.h.mixer.update(dt); return; }
    const mag = Math.min(1, Math.hypot(Inp.mx, Inp.my));
    const sprint = Inp.btn.sprint || (Inp.touch && mag > .95);
    const target = mag < .05 ? 0 : sprint ? 6.2 : mag > .6 ? 3.6 : 1.6;
    this.speed = damp(this.speed, target, 10, dt);
    if (mag > .05) {
      // направление относительно камеры
      const a = Math.atan2(Inp.mx, Inp.my), want = this.camYaw + Math.PI + a;
      this.heading += angDiff(this.heading, want) * Math.min(1, dt * 12);
    }
    if (this.grounded && Inp.tap.jump && this.animLock <= 0) { this.vy = 5.2; this.grounded = false; play(this.h, 'Jump_Start', .1); }
    this.vy -= 18 * dt; if (this.vy < -30) this.vy = -30;
    const dx = Math.sin(this.heading) * this.speed * dt, dz = Math.cos(this.heading) * this.speed * dt;
    const { ctl, col, body } = this.ch;
    ctl.computeColliderMovement(col, { x: dx, y: this.vy * dt, z: dz }, undefined, undefined, c => !c.parent()?.isDynamic() || true);
    const m = ctl.computedMovement(), p = body.translation();
    const np = { x: p.x + m.x, y: p.y + m.y, z: p.z + m.z }; body.setNextKinematicTranslation(np);
    this.grounded = ctl.computedGrounded(); if (this.grounded && this.vy < 0) this.vy = 0;
    this.pos.set(np.x, np.y - .85, np.z);
    // анимации
    this.animLock -= dt;
    if (this.animLock <= 0) {
      if (!this.grounded && this.vy < -2) play(this.h, 'Jump_Loop', .15);
      else if (this.speed < .2) play(this.h, 'Idle_Loop', .25);
      else if (this.speed < 2.4) play(this.h, 'Walk_Loop', .25, this.speed / 1.5);
      else if (this.speed < 5) play(this.h, 'Jog_Fwd_Loop', .25, this.speed / 3.6);
      else play(this.h, 'Sprint_Loop', .25, this.speed / 6.2);
    }
    this.stepT -= dt * this.speed; if (this.stepT <= 0 && this.grounded && this.speed > .5) { this.stepT = 1.3; Snd.play('step'); }
    const r = this.h.root; r.visible = true; r.position.copy(this.pos); r.rotation.y = this.heading;
    this.h.mixer.update(dt);
  },
  // ---------- в машине ----------
  updateCar(dt: number) {
    const v = this.inCar!;
    driveVehicle(v, dt, Inp.gas, Inp.brake, Inp.steer, !!Inp.btn.hb, !!Inp.btn.nitro);
    const p = v.ph.body.translation(); this.pos.set(p.x, p.y, p.z); this.heading = vehicleHeading(v);
    // камера: свободный обзор мышью, возвращается за машину
    const moved = Math.abs(Inp.lookX) + Math.abs(Inp.lookY) > 0;
    if (moved) { this.camYaw -= Inp.lookX * .0035; this.camPitch = clamp(this.camPitch + Inp.lookY * .0035, -.2, 1.1); this.camIdle = 1.6; }
    this.camIdle -= dt;
    if (this.camIdle <= 0 && Math.abs(v.speed) > 2) { const back = this.heading + Math.PI + (v.speed < -1 ? Math.PI : 0); this.camYaw += angDiff(this.camYaw, back) * Math.min(1, dt * 2.2); this.camPitch = damp(this.camPitch, .22, 1.5, dt); }
    const slip = wheelSlip(v); v.slip = slip; Snd.tire(slip * Math.min(1, Math.abs(v.speed) / 8));
    Snd.engine(true, v.rpm, Inp.gas, v.def.kind === 'bus' ? 6 : 4);
    syncVehicle(v, dt);
  },
  // ---------- камера ----------
  updateCamera(dt: number) {
    const cam = R.cam, car = this.inCar;
    if (Inp.wheel) this.camDist = clamp(this.camDist + Inp.wheel * .6, 2.5, 9);
    const dist = car ? (car.def.kind === 'bus' ? 14 : 6.2) + (this.camMode ? 3 : 0) : this.camDist;
    const target = car ? new THREE.Vector3(this.pos.x, this.pos.y + (car.def.kind === 'bus' ? 3 : 1.5), this.pos.z) : new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    // плечо: камера чуть справа от персонажа
    if (!car) { const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw); target.x += rx * .45; target.z += rz * .45; }
    const cp = Math.cos(this.camPitch), dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    let d = dist;
    // не проходить сквозь стены: луч от цели к камере
    const ray = new PH.R.Ray({ x: target.x, y: target.y, z: target.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = PH.world.castRay(ray, dist, true, undefined, (GROUP_STATIC << 16) | GROUP_STATIC);
    if (hit) d = Math.max(1, hit.timeOfImpact - .3);
    const want = target.clone().addScaledVector(dir, d); if (want.y < .4) want.y = .4;
    this.camPos.lerp(want, 1 - Math.exp(-(car ? 10 : 18) * dt)); this.camLook.lerp(target, 1 - Math.exp(-20 * dt));
    if (this.camPos.distanceTo(want) > 30) { this.camPos.copy(want); this.camLook.copy(target); }
    cam.position.copy(this.camPos); cam.lookAt(this.camLook);
    const fov = car ? 62 + Math.min(18, Math.abs(car.speed) * .35) : (innerWidth < innerHeight ? 70 : 60);
    cam.fov = lerp(cam.fov, fov, 1 - Math.exp(-3 * dt)); cam.updateProjectionMatrix();
  },
};
