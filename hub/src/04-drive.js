// ==== 9. DRIVE: физика дрифта, очки, эффекты, камера, режимы ====
const D = { on: false };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------- частицы: дым, искры ----------
function makeParticles(n, additive) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), col = new Float32Array(n * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: 'attribute float aSize; attribute float aAlpha; attribute vec3 aCol; varying float vA; varying vec3 vC; void main(){ vA=aAlpha; vC=aCol; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aSize * (420. / -mv.z); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord-.5; float r = length(d); if(r>.5) discard; float a = smoothstep(.5,.0,r); gl_FragColor = vec4(vC, a*vA); }' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  return { pts, n, pos, size, alpha, col, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), grow: new Float32Array(n), cur: 0, g };
}
function emitP(P, x, y, z, vx, vy, vz, life, size, grow, r, gg, b, a = 1) {
  const i = P.cur; P.cur = (P.cur + 1) % P.n;
  P.pos.set([x, y, z], i * 3); P.vel.set([vx, vy, vz], i * 3); P.life[i] = P.max[i] = life; P.size[i] = size; P.grow[i] = grow; P.col.set([r, gg, b], i * 3); P.alpha[i] = a;
}
function updateP(P, dt, grav, drag) {
  for (let i = 0; i < P.n; i++) {
    if (P.life[i] <= 0) { P.alpha[i] = 0; continue; }
    P.life[i] -= dt; const k = P.life[i] / P.max[i], o = i * 3;
    P.vel[o] *= drag; P.vel[o + 1] = P.vel[o + 1] * drag + grav * dt; P.vel[o + 2] *= drag;
    P.pos[o] += P.vel[o] * dt; P.pos[o + 1] += P.vel[o + 1] * dt; P.pos[o + 2] += P.vel[o + 2] * dt;
    if (P.pos[o + 1] < .02) { P.pos[o + 1] = .02; P.vel[o + 1] *= -.4; }
    P.size[i] += P.grow[i] * dt; P.alpha[i] = Math.min(1, k * 1.6) * (P.col[o] > 0 ? 1 : 1) * (P.a0 || 1) * (k > .9 ? (1 - k) * 10 : 1) * P.alphaMul(i);
  }
  P.g.attributes.position.needsUpdate = true; P.g.attributes.aSize.needsUpdate = true; P.g.attributes.aAlpha.needsUpdate = true; P.g.attributes.aCol.needsUpdate = true;
}

// ---------- следы шин ----------
function makeSkids(max) {
  const pos = new Float32Array(max * 4 * 3), idx = new Uint32Array(max * 6);
  for (let i = 0; i < max; i++) { const v = i * 4; idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.frustumCulled = false;
  return { m, pos, max, cur: 0, last: [null, null], g };
}
function addSkid(S, w, x, z, dx, dz) {
  const last = S.last[w]; if (last) {
    const i = S.cur; S.cur = (S.cur + 1) % S.max; const nx = -dz * .12, nz = dx * .12, o = i * 12, y = .035;
    S.pos.set([last[0] + last[2], y, last[1] + last[3], last[0] - last[2], y, last[1] - last[3], x + nx, y, z + nz, x - nx, y, z - nz], o);
    S.g.attributes.position.needsUpdate = true;
    S.last[w] = [x, z, nx, nz];
  } else S.last[w] = [x, z, -dz * .12, dx * .12];
}

// ---------- старт заезда ----------
function startDrive(trackId, mode) {
  const s = H.save, id = s.car, cfg = carConfig(id), st = carStats(id, cfg);
  const tr = buildTrack(trackId);
  const car = buildCar(id, cfg); tr.sc.add(car);
  const P0 = tr.P[2], T0 = tr.Tn[2];
  Object.assign(D, { on: true, trackId, mode, id, cfg, st, car, tr, x: P0.x, z: P0.z, h: Math.atan2(T0.x, T0.z), vx: 0, vz: 0, w: 0, steer: 0,
    rpm: 0, gear: 1, nitro: 1, nosOn: false, idx: 2, lastIdx: 2, progress: 0, lap: 1, lapT: 0, laps: [], bestLap: 0,
    score: 0, dPts: 0, dMul: 1, dT: 0, grace: 0, angle: 0, longest: 0, maxMul: 1, crashes: 0,
    t: 0, left: CFG.CHALLENGE_TIME, count: mode === 'free' ? 0 : 3.2, lastCount: 4, shake: 0, camPos: null, ended: false, pitch: 0, roll: 0, msgT: 0, hudT: 0, slip: 0 });
  const q = CFG.QUALITY[quality()].parts;
  D.smoke = makeParticles(Math.round(700 * q), false); D.smoke.alphaMul = () => .55; tr.sc.add(D.smoke.pts);
  D.sparks = makeParticles(220, true); D.sparks.alphaMul = () => 1; tr.sc.add(D.sparks.pts);
  D.skids = makeSkids(Math.round(2400 * q)); tr.sc.add(D.skids.m);
  // пламя нитро и выхлопа
  D.flames = D.car.userData.exh.map(p => { const f = new THREE.Mesh(new THREE.ConeGeometry(.09, .7, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    f.rotation.x = -Math.PI / 2; f.position.copy(p).add(V3(0, 0, -.3)); f.visible = false; D.car.userData.body.add(f); return f; });
  // фары ночью
  if (tr.th.night || tr.def.weather === 'dust') for (const sx of [-1, 1]) { const l = new THREE.SpotLight(0xfff2d8, 120, 70, .5, .55, 1.4); l.position.set(sx * .6, .7, CARS[id].L / 2); l.target.position.set(sx * .6, 0, 30); D.car.add(l); D.car.add(l.target); }
  D.smokeCol = { rain: [.55, .58, .62], clear: [.8, .8, .82], snow: [.95, .97, 1], dust: [.78, .64, .48] }[tr.def.weather];
  D.grip = tr.def.grip;
  UI.drawMini(); H.state = 'DRIVE'; UI.hud(true);
  W.renderer.shadowMap.needsUpdate = true;
}
function stopDrive() {
  if (!D.tr) return; disposeTree(D.tr.sc); D.tr.sc.environment && D.tr.sc.environment.dispose(); D.on = false; D.tr = null; W.track = null; Snd.engine(0, 0, false, 0); Snd.tires(0);
}

// ---------- физика ----------
function driveStep(dt) {
  const st = D.st, d = CARS[D.id], tr = D.tr;
  let gas = Inp.gas, brake = Inp.brake, hb = Inp.hb, s = Inp.steer;
  if (D.count > 0 || D.ended) { gas = 0; brake = D.ended ? .6 : 1; hb = false; }
  const fx = Math.sin(D.h), fz = Math.cos(D.h), rx = -Math.cos(D.h), rz = Math.sin(D.h); // вперёд и вправо (экранное)
  let vf = D.vx * fx + D.vz * fz, vr = D.vx * rx + D.vz * rz;
  const speed = Math.hypot(D.vx, D.vz);
  // нитро
  const nosCap = .6 + .25 * st.nitro;
  D.nosOn = Inp.nitro && D.nitro > .01 && gas > 0 && D.count <= 0 && !D.ended;
  if (D.nosOn) { D.nitro = Math.max(0, D.nitro - dt / (2.2 * nosCap)); if (!D.nosWas) Snd.play('nitro'); } D.nosWas = D.nosOn;
  const pw = st.power * (D.nosOn ? 1.55 : 1), top = st.top * (D.nosOn ? 1.2 : 1);
  // тяга и торможение
  if (gas > 0 && vf > -1) vf += gas * pw / st.mass * Math.max(0, 1 - Math.pow(Math.max(0, vf) / top, 2)) * dt;
  if (D.count > 0) vf = 0; // на старте машина стоит
  else if (D.ended) vf = Math.max(0, vf - 9 * dt);
  else if (brake > 0) { if (vf > .8) vf -= 15 * brake * dt; else vf = Math.max(-11, vf - 6 * brake * dt); }
  if (gas > 0 && vf < -.5) vf += 12 * dt;
  if (hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 3.5 * dt);
  vf -= (vf * .05 + Math.sign(vf) * .3 + .0009 * vf * Math.abs(vf)) * dt * (gas > 0 ? .4 : 1);
  if (Math.abs(vf) < .05 && gas === 0) vf = 0;
  // боковое сцепление
  const slip = Math.atan2(vr, Math.abs(vf) + .5), aslip = Math.abs(slip), baseK = 7.5 * st.grip * D.grip;
  let k = baseK;
  if (hb) k = .9; else if (aslip > .14 && gas > .3) k = baseK * (.2 + .05 * (1 - gas)); else if (aslip > .14) k = baseK * .55;
  const vr0 = vr; vr *= Math.exp(-k * dt); vf -= Math.abs(vr0 - vr) * .12 * Math.sign(vf);
  // руление и вращение
  const steerMax = st.steer / (1 + speed / 40), wTarget = -(vf / d.wb) * Math.tan(s * steerMax);
  const rate = hb ? 2.2 : aslip > .14 ? 3.2 + st.susp * .4 : 8 + st.susp;
  D.w += (wTarget - D.w) * Math.min(1, dt * rate);
  if (hb && speed > 6) D.w += -s * 2.6 * dt * Math.min(1, speed / 18);
  if (aslip > .14 && gas > .3 && !hb) D.w += Math.sign(D.w) * gas * .9 * dt * Math.min(1, speed / 20);
  D.w = clamp(D.w, -3.2, 3.2);
  D.h += D.w * dt;
  D.vx = fx * vf + rx * vr; D.vz = fz * vf + rz * vr;
  D.x += D.vx * dt; D.z += D.vz * dt;
  // стены
  D.idx = nearestIdx(D.x, D.z, D.idx);
  const P = tr.P[D.idx], N = tr.Nm[D.idx], off = (D.x - P.x) * N.x + (D.z - P.z) * N.z, lim = tr.hw + .45;
  if (Math.abs(off) > lim) {
    const sg = Math.sign(off); D.x -= N.x * (off - sg * lim); D.z -= N.z * (off - sg * lim);
    const vn = D.vx * N.x + D.vz * N.z;
    if (vn * sg > 0) {
      D.vx -= N.x * vn * 1.35; D.vz -= N.z * vn * 1.35; D.vx *= .8; D.vz *= .8; D.w *= .5;
      const imp = Math.abs(vn);
      if (imp > 2.2) {
        D.shake = Math.min(1, imp / 14); Snd.play('hit');
        for (let i = 0; i < 26; i++) emitP(D.sparks, D.x + N.x * sg * .9, .4, D.z + N.z * sg * .9, rand(-4, 4) - N.x * sg * 3, rand(1, 5), rand(-4, 4) - N.z * sg * 3, rand(.3, .7), rand(.12, .25), -.1, 1, rand(.5, .8), .2);
        if (imp > 4 && D.dPts > 0) { D.dPts = 0; D.dT = 0; D.dMul = 1; D.crashes++; UI.driftMsg(T('crash')); Snd.play('lose'); }
      }
    }
  }
  // прогресс круга
  let di = D.idx - D.lastIdx; if (di > tr.N / 2) di -= tr.N; if (di < -tr.N / 2) di += tr.N; D.progress += di; D.lastIdx = D.idx;
  if (D.mode === 'time' && D.count <= 0 && !D.ended) {
    D.lapT += dt;
    if (D.progress >= tr.N) { D.progress -= tr.N; D.laps.push(D.lapT); if (!D.bestLap || D.lapT < D.bestLap) D.bestLap = D.lapT; Snd.play('bank'); UI.toast(T('lap') + ' ' + D.lap + ': ' + fmtT(D.lapT)); D.lapT = 0; D.lap++; if (D.lap > CFG.LAPS) endDrive(); }
  }
  // дрифт-очки
  const ang = speed > 3 ? Math.abs(Math.atan2(vr, vf)) : 0; D.angle = ang; D.slip = clamp((aslip - .1) * 2.2, 0, 1) * Math.min(1, speed / 8);
  const drifting = speed > CFG.DRIFT_MIN_SPEED && ang > CFG.DRIFT_MIN_ANGLE && ang < 1.9 && vf > 0 && D.count <= 0 && !D.ended;
  if (drifting) {
    D.dT += dt; D.grace = CFG.DRIFT_BANK_DELAY; D.dMul = Math.min(CFG.DRIFT_MULT_MAX, 1 + Math.floor(D.dT / CFG.DRIFT_MULT_EVERY));
    D.dPts += dt * speed * (ang * 57.3) * .09 * D.dMul; D.maxMul = Math.max(D.maxMul, D.dMul); D.longest = Math.max(D.longest, D.dT);
    D.nitro = Math.min(1, D.nitro + dt * .1);
  } else if (D.dPts > 0) { D.grace -= dt; if (D.grace <= 0) bankDrift(); }
  if (!D.nosOn) D.nitro = Math.min(1, D.nitro + dt * .025);
  // обороты и передачи
  const g = [0, .16, .3, .46, .63, .8, 1.05].map(v => v * st.top); let gear = 1; while (gear < 6 && speed > g[gear]) gear++;
  const within = clamp((speed - g[gear - 1]) / (g[gear] - g[gear - 1]), 0, 1), spin = D.slip * gas * .35;
  const rpmT = clamp(.18 + within * .8 + spin + (D.count > 0 ? Inp.gas * .7 : 0), 0, 1);
  if (gear !== D.gear) { if (gear > D.gear && gas > 0) { Snd.play('pop'); D.backfire = .12; } D.gear = gear; }
  D.rpm = damp(D.rpm, rpmT, 12, dt);
  // время режима
  if (D.count > 0) { D.count -= dt; const c = Math.ceil(D.count); if (c !== D.lastCount && c > 0) { Snd.play('count'); D.lastCount = c; } if (D.count <= 0) Snd.play('go'); }
  else if (!D.ended) { D.t += dt; if (D.mode === 'chal') { D.left -= dt; if (D.left <= 0) { D.left = 0; endDrive(); } } }
  D.vf = vf; D.vr = vr; D.speed = speed; D.gas = gas; D.brake = brake; D.hb = hb; D.s = s;
}
function bankDrift() {
  const pts = Math.round(D.dPts); D.score += pts;
  if (pts > 50) { UI.driftMsg('+' + fmt(pts) + (pts > 8000 ? ' ' + T('insane') : pts > 3000 ? ' ' + T('great') : pts > 800 ? ' ' + T('perfect') : ''), true); Snd.play('bank'); }
  D.dPts = 0; D.dT = 0; D.dMul = 1;
}
function endDrive() {
  if (D.ended) return; if (D.dPts > 0) bankDrift(); D.ended = true;
  setTimeout(() => { if (D.on) UI.results(); }, 1400);
}

// ---------- визуализация и эффекты ----------
const tmpV = V3();
function driveVisual(dt) {
  const car = D.car, u = car.userData, d = CARS[D.id];
  car.position.set(D.x, 0, D.z); car.rotation.y = D.h;
  // крен и тангаж
  const acc = (D.vf - (D.pvf || 0)) / Math.max(dt, 1e-3); D.pvf = D.vf;
  D.pitch = damp(D.pitch, clamp(-acc * .004, -.05, .05), 6, dt); D.roll = damp(D.roll, clamp(D.w * D.speed * .0022, -.07, .07), 6, dt);
  u.body.rotation.x = D.pitch; u.body.rotation.z = D.roll;
  for (const w of u.wheels) { w.spin.rotation.x += D.vf * dt / d.R * (w.front ? 1 : 1 + D.slip * D.gas * 2); if (w.front) w.pivot.rotation.y = -D.s * .5 * (1 / (1 + D.speed / 40)) + (D.slip > .2 ? Math.sign(D.vr) * .25 * D.slip : 0); }
  u.tailMat.emissiveIntensity = D.brake > 0 ? 3.5 : .8;
  // нитро и выхлоп
  const fl = .7 + Math.random() * .6;
  D.flames.forEach(f => { f.visible = D.nosOn || D.backfire > 0; f.material.color.set(D.nosOn ? 0x7ad7ff : 0xff8a2a); f.scale.set(fl, (D.nosOn ? 1.4 : .7) * fl, fl); });
  if (D.backfire > 0) D.backfire -= dt;
  // дым и следы от задних колёс
  const smokeK = Math.max(D.slip, D.hb && D.speed > 4 ? .6 : 0, D.count > 0 && Inp.gas ? .8 : 0), [cr, cg, cb] = D.smokeCol;
  const fx = Math.sin(D.h), fz = Math.cos(D.h), rx = Math.cos(D.h), rz = -Math.sin(D.h);
  u.wheels.forEach((w, i) => {
    if (w.front) return; const lx = w.side * d.tr / 2, lz = -d.wb / 2, x = D.x + rx * lx + fx * lz, z = D.z + rz * lx + fz * lz;
    if (smokeK > .25) {
      const n = smokeK * CFG.QUALITY[quality()].parts * 2.4; for (let k = 0; k < n; k++) if (Math.random() < n / Math.ceil(n))
        emitP(D.smoke, x + rand(-.2, .2), .25, z + rand(-.2, .2), D.vx * .15 + rand(-1, 1), rand(.6, 1.8), D.vz * .15 + rand(-1, 1), rand(1.4, 2.6), rand(.9, 1.4), rand(1.4, 2.4), cr, cg, cb);
      if (D.speed > 2) addSkid(D.skids, i - 2, x, z, D.vx / (D.speed || 1), D.vz / (D.speed || 1));
    } else D.skids.last[i - 2] = null;
  });
  updateP(D.smoke, dt, .35, .985); updateP(D.sparks, dt, -12, .99);
  // звук
  Snd.engine(D.rpm, D.gas, true, D.st.turbo); Snd.tires(Math.max(D.slip * Math.min(1, D.speed / 10), D.hb && D.speed > 4 ? .6 : 0));
  // камера
  const cam = W.cam, mode = H.save.settings.cam % 3, dist = [6.2, 9.5, 0][mode], ht = [2.1, 3.6, 0][mode];
  const vdir = D.speed > 4 ? Math.atan2(D.vx, D.vz) : D.h, look = mode === 2 ? D.h : lerpAngle(D.h, vdir, .45);
  if (mode === 2) { cam.position.set(D.x + fx * .4, 1.25, D.z + fz * .4); cam.lookAt(D.x + fx * 20, 1, D.z + fz * 20); }
  else {
    const tx = D.x - Math.sin(look) * dist, tz = D.z - Math.cos(look) * dist, ty = ht;
    if (!D.camPos) D.camPos = V3(tx, ty, tz);
    D.camPos.x = damp(D.camPos.x, tx, 5, dt); D.camPos.y = damp(D.camPos.y, ty, 5, dt); D.camPos.z = damp(D.camPos.z, tz, 5, dt);
    cam.position.copy(D.camPos); if (D.shake > 0) { cam.position.x += rand(-1, 1) * D.shake * .35; cam.position.y += rand(-1, 1) * D.shake * .25; D.shake = Math.max(0, D.shake - dt * 2.5); }
    cam.lookAt(D.x + fx * 2.5, .9, D.z + fz * 2.5);
  }
  const fov = (innerWidth < innerHeight ? 78 : 62) + Math.min(D.speed, 80) * .22 + (D.nosOn ? 9 : 0); cam.fov = damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix();
  // солнце-тень следует за машиной
  const tr = D.tr, sp = tr.th.sunPos; tr.sun.position.set(D.x + sp[0], sp[1], D.z + sp[2]); tr.sun.target.position.set(D.x, 0, D.z);
  updateWeather(dt, D.x, D.z); updateLamps(D.x, D.z);
}
function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * t; }
