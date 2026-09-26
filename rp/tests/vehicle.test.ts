// Физика машины без графики: разгон, максималка, торможение, поворот
import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, PH } from '../src/core/physics';
import { driveVehicle, vehicleHeading, Vehicle } from '../src/vehicles/vehicle';
import { createVehicle } from '../src/core/physics';
import type { CarDef } from '../src/vehicles/carModel';
// габариты как у реальных моделей из каталога
const DEFS: Record<string, Partial<CarDef>> = {
  v07: { L: 4.13, W: 1.62, H: 1.44, wb: 2.42, tr: 1.36, R: .3, mass: 1060, power: 75, maxSpeed: 150, kind: 'car' },
  l15: { L: 4.35, W: 1.73, H: 1.52, wb: 2.63, tr: 1.47, R: .31, mass: 1100, power: 102, maxSpeed: 180, kind: 'car' },
  s212: { L: 4.87, W: 1.85, H: 1.45, wb: 2.87, tr: 1.6, R: .33, mass: 1700, power: 250, maxSpeed: 245, kind: 'car' },
  paz: { L: 6.93, W: 2.5, H: 2.9, wb: 3.6, tr: 2.0, R: .47, mass: 5000, power: 130, maxSpeed: 90, kind: 'bus' },
};
function spawnVehicle(id: string): Vehicle { const def = { id, name: id, brand: '', file: id, price: 0, author: '', title: '', url: '', ...DEFS[id] } as CarDef; return { id, def, color: 0, obj: null as any, ph: createVehicle(def, 0, .6, 0, 0), owned: null, plate: '', fuel: 1, dmg: 0, speed: 0, rpm: 0, gear: 1, steer: 0, lights: false, brake: false, slip: 0 }; }

function run(v: Vehicle, secs: number, gas: number, brake: number, steer: number, hb = false) {
  for (let i = 0; i < secs * 60; i++) { driveVehicle(v, 1 / 60, gas, brake, steer, hb, false); v.ph.ctl.updateVehicle(1 / 60); PH.world.step(); }
}
describe('машина', () => {
  beforeAll(async () => {
    await initPhysics();
    const f = PH.world.createRigidBody(PH.R.RigidBodyDesc.fixed());
    PH.world.createCollider(PH.R.ColliderDesc.cuboid(3000, 1, 3000).setTranslation(0, -1, 0), f);
  });
  for (const model of ['v07', 'l15', 's212', 'paz']) it(`${model}: разгон, торможение, поворот`, () => {
    const v = spawnVehicle(model);
    run(v, 1, 0, 0, 0); const y0 = v.ph.body.translation().y;
    let t100 = -1; for (let i = 0; i < 60 * 25; i++) { run(v, 1 / 60, 1, 0, 0); if (t100 < 0 && v.speed * 3.6 >= 40) t100 = i / 60; }
    const top = v.speed * 3.6; const p1 = v.ph.body.translation();
    let stop = 0; while (v.speed > .5 && stop < 30 * 60) { run(v, 1 / 60, 0, 1, 0); stop++; }
    const p2 = v.ph.body.translation(), brakeDist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    run(v, 3, 1, 0, 0); const h0 = vehicleHeading(v); run(v, 2, .6, 0, 1); const dh = vehicleHeading(v) - h0;
    console.log(`${model}: y=${y0.toFixed(2)} 0-40=${t100.toFixed(1)}s top=${top.toFixed(0)}км/ч тормозной путь с ${top.toFixed(0)}=${brakeDist.toFixed(0)}м dH(вправо)=${(dh * 57.3).toFixed(0)}°`);
    expect(y0).toBeGreaterThan(-.3); expect(t100).toBeGreaterThan(0); expect(top).toBeGreaterThan(45); expect(brakeDist).toBeLessThan(90);
  });
});
