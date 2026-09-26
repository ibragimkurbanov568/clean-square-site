// Физика на Rapier: мир, статичные коллайдеры города, машина игрока (рейкаст-подвеска), контроллер персонажа
import RAPIER from '@dimforge/rapier3d-compat';
import { City, RIVER } from '../world/citygen';

export let PH: { world: RAPIER.World; R: typeof RAPIER; eq: RAPIER.EventQueue } = null as any;
export async function initPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = 1 / 60;
  PH = { world, R: RAPIER, eq: new RAPIER.EventQueue(true) };
  return PH;
}
export const GROUP_STATIC = 0x0001, GROUP_CAR = 0x0002, GROUP_CHAR = 0x0004, GROUP_TRAFFIC = 0x0008;
const groups = (member: number, filter: number) => (member << 16) | filter;

export function buildStaticColliders(city: City) {
  const { world, R } = PH, fixed = world.createRigidBody(R.RigidBodyDesc.fixed());
  const add = (d: RAPIER.ColliderDesc) => world.createCollider(d.setCollisionGroups(groups(GROUP_STATIC, 0xffff)).setFriction(.9), fixed);
  // земля с руслом реки
  add(R.ColliderDesc.cuboid(2100, 1, (2100 + RIVER.z0) / 2).setTranslation(0, -1, (RIVER.z0 - 2100) / 2));
  add(R.ColliderDesc.cuboid(2100, 1, (2100 - RIVER.z1) / 2).setTranslation(0, -1, (RIVER.z1 + 2100) / 2));
  add(R.ColliderDesc.cuboid(2100, 1, (RIVER.z1 - RIVER.z0) / 2).setTranslation(0, -7, (RIVER.z0 + RIVER.z1) / 2));
  for (const b of city.buildings) add(R.ColliderDesc.cuboid(b.w / 2, b.h / 2 + (b.roof === 'pitched' ? 1.3 : 0), b.d / 2).setTranslation(b.x, b.h / 2, b.z));
  for (const t of city.trees) add(R.ColliderDesc.cylinder(2, .22 * t.s).setTranslation(t.x, 2, t.z));
  for (const l of city.lamps) add(R.ColliderDesc.cylinder(4, .12).setTranslation(l.x, 4, l.z));
  for (const p of city.parked) add(R.ColliderDesc.cuboid(.85, .7, 2.2).setTranslation(p.x, .7, p.z).setRotation(quatY(p.rot)));
  for (const p of city.props) {
    if (p.kind === 'kiosk') add(R.ColliderDesc.cuboid(1.3, 1.3, 1).setTranslation(p.x, 1.3, p.z).setRotation(quatY(p.rot)));
    if (p.kind === 'fountain') add(R.ColliderDesc.cylinder(.4, 7.2).setTranslation(p.x, .4, p.z));
    if (p.kind === 'container') add(R.ColliderDesc.cuboid(3, 1.3, 1.2).setTranslation(p.x, 1.3, p.z));
    if (p.kind === 'chimney') add(R.ColliderDesc.cylinder((p.s || 40) / 2, 2.4).setTranslation(p.x, (p.s || 40) / 2, p.z));
    if (p.kind === 'bus_stop') add(R.ColliderDesc.cuboid(2, 1.3, .1).setTranslation(p.x, 1.3, p.z).setRotation(quatY(p.rot)));
  }
  // набережная: невысокий парапет, чтобы в реку можно было свалиться только постаравшись
  add(R.ColliderDesc.cuboid(2100, .5, .3).setTranslation(0, .5, RIVER.z0 - .5));
}
export const quatY = (a: number) => ({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });

// ---------- персонаж ----------
export function createCharacter(x: number, y: number, z: number) {
  const { world, R } = PH;
  const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
  const col = world.createCollider(R.ColliderDesc.capsule(.55, .3).setCollisionGroups(groups(GROUP_CHAR, GROUP_STATIC | GROUP_CAR | GROUP_TRAFFIC)), body);
  const ctl = world.createCharacterController(.02);
  ctl.enableAutostep(.5, .25, true); ctl.enableSnapToGround(.4); ctl.setMaxSlopeClimbAngle(50 * Math.PI / 180); ctl.setApplyImpulsesToDynamicBodies(true);
  return { body, col, ctl };
}

// ---------- машина ----------
export interface VehPhys { body: RAPIER.RigidBody; ctl: RAPIER.DynamicRayCastVehicleController; col: RAPIER.Collider; half: [number, number, number]; rear: number[]; front: number[] }
export function createVehicle(def: { L: number; W: number; wb: number; tr: number; R: number; mass: number; kind: string }, x: number, y: number, z: number, heading: number): VehPhys {
  const { world, R } = PH, half: [number, number, number] = [def.W / 2 - .05, def.kind === 'bus' ? .9 : .38, def.L / 2 - .05];
  const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation(quatY(heading)).setLinearDamping(.05).setAngularDamping(.6).setCanSleep(false).setCcdEnabled(true));
  const vol = half[0] * half[1] * half[2] * 8, cy = def.kind === 'bus' ? 1.2 : .72;
  const col = world.createCollider(R.ColliderDesc.cuboid(...half).setTranslation(0, cy, 0).setDensity(def.mass / vol).setFriction(.3).setRestitution(.05)
    .setCollisionGroups(groups(GROUP_CAR, GROUP_STATIC | GROUP_CAR | GROUP_CHAR | GROUP_TRAFFIC)).setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(def.mass * 6), body);
  // центр масс пониже — меньше опрокидываний
  body.setAdditionalMassProperties(0, { x: 0, y: -.35, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }, true);
  const ctl = world.createVehicleController(body);
  (ctl as any).indexUpAxis = 1; (ctl as any).setIndexForwardAxis = 2;
  const rest = def.kind === 'bus' ? .35 : .28;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    ctl.addWheel({ x: sx * def.tr / 2, y: def.R + rest * .6, z: sz * def.wb / 2 }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, rest, def.R);
  }
  for (let i = 0; i < 4; i++) {
    ctl.setWheelSuspensionStiffness(i, def.kind === 'bus' ? 40 : 28); ctl.setWheelSuspensionCompression(i, 4.4); ctl.setWheelSuspensionRelaxation(i, 3.3);
    ctl.setWheelFrictionSlip(i, i < 2 ? 2.1 : 1.9); ctl.setWheelSideFrictionStiffness(i, 1); ctl.setWheelMaxSuspensionTravel(i, .25); ctl.setWheelMaxSuspensionForce(i, def.mass * 40);
  }
  return { body, ctl, col, half, front: [0, 1], rear: [2, 3] };
}
export function removeVehicle(v: VehPhys) { PH.world.removeVehicleController(v.ctl); PH.world.removeRigidBody(v.body); }

// кинематические тела для машин трафика (двигаются по полосам, толкают игрока)
export function createKinematicBox(hx: number, hy: number, hz: number) {
  const { world, R } = PH, body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
  world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(0, hy + .15, 0).setCollisionGroups(groups(GROUP_TRAFFIC, GROUP_CAR | GROUP_CHAR)), body);
  return body;
}
