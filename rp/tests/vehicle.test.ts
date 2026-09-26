// Физика машины без графики: разгон, максималка, торможение, поворот
import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, PH } from '../src/core/physics';
import { spawnVehicle, driveVehicle, vehicleHeading, Vehicle } from '../src/vehicles/vehicle';

function run(v: Vehicle, secs: number, gas: number, brake: number, steer: number, hb = false) {
  for (let i = 0; i < secs * 60; i++) { driveVehicle(v, 1 / 60, gas, brake, steer, hb, false); v.ph.ctl.updateVehicle(1 / 60); PH.world.step(); }
}
describe('машина', () => {
  beforeAll(async () => {
    await initPhysics();
    const f = PH.world.createRigidBody(PH.R.RigidBodyDesc.fixed());
    PH.world.createCollider(PH.R.ColliderDesc.cuboid(3000, 1, 3000).setTranslation(0, -1, 0), f);
  });
  for (const model of ['classic', 'jsedan', 'business', 'bus']) it(`${model}: разгон, торможение, поворот`, () => {
    const v = spawnVehicle(model, 0xffffff, 0, 0, 0);
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
