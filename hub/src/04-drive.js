// ==== 9. DRIVE: физика дрифта, очки, повреждения, эффекты, камеры ====
const D = { on: false };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const GEARS = [-3.2, 3.3, 2.15, 1.55, 1.18, .95, .8], FINAL = 3.9, G = 9.81;
const CAMS = ['camChase', 'camFar', 'camHood', 'camBumper', 'camCine'];

// ---------- частицы ----------
function makeParticles(n, additive) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), col = new Float32Array(n * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: 'attribute float aSize; attribute float aAlpha; attribute vec3 aCol; varying float vA; varying vec3 vC; void main(){ vA=aAlpha; vC=aCol; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aSize * (420. / -mv.z); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord-.5; float r = length(d); if(r>.5) discard; float a = smoothstep(.5,.0,r); gl_FragColor = vec4(vC, a*vA); }' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  return { pts, n, pos, size, alpha, col, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), grow: new Float32Array(n), a0: new Float32Array(n), cur: 0, g };
}
function emitP(P, x, y, z, vx, vy, vz, life, size, grow, r, gg, b, a = 1) {
  const i = P.cur; P.cur = (P.cur + 1) % P.n;
  P.pos.set([x, y, z], i * 3); P.vel.set([vx, vy, vz], i * 3); P.life[i] = P.max[i] = life; P.size[i] = size; P.grow[i] = grow; P.col.set([r, gg, b], i * 3); P.a0[i] = a;
}
function updateP(P, dt, grav, drag) {
  for (let i = 0; i < P.n; i++) {
    if (P.life[i] <= 0) { P.alpha[i] = 0; continue; }
    P.life[i] -= dt; const k = Math.max(0, P.life[i] / P.max[i]), o = i * 3;
    P.vel[o] *= drag; P.vel[o + 1] = P.vel[o + 1] * drag + grav * dt; P.vel[o + 2] *= drag;
    P.pos[o] += P.vel[o] * dt; P.pos[o + 1] += P.vel[o + 1] * dt; P.pos[o + 2] += P.vel[o + 2] * dt;
    if (P.pos[o + 1] < .02) { P.pos[o + 1] = .02; P.vel[o + 1] *= -.4; }
    P.size[i] += P.grow[i] * dt; P.alpha[i] = P.a0[i] * Math.min(1, k * 1.8) * (k > .92 ? (1 - k) * 12 : 1);
  }
  const a = P.g.attributes; a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = a.aCol.needsUpdate = true;
}
function makeSkids(max) {
  const pos = new Float32Array(max * 4 * 3), idx = new Uint32Array(max * 6);
  for (let i = 0; i < max; i++) { const v = i * 4; idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.frustumCulled = false;
  return { m, pos, max, cur: 0, last: [null, null], g };
}
function addSkid(S, w, x, z, dx, dz) {
  const last = S.last[w], nx = -dz * .13, nz = dx * .13;
  if (last) { const i = S.cur; S.cur = (S.cur + 1) % S.max; const y = .035; S.pos.set([last[0] + last[2], y, last[1] + last[3], last[0] - last[2], y, last[1] - last[3], x + nx, y, z + nz, x - nx, y, z - nz], i * 12); S.g.attributes.position.needsUpdate = true; }
  S.last[w] = [x, z, nx, nz];
}

// ---------- старт заезда ----------
function startDrive(trackId, mode) {
  const s = H.save, id = s.car, cfg = carConfig(id), st = carStats(id, cfg);
  const tr = buildTrack(trackId), car = buildCar(id, cfg); tr.sc.add(car);
  const P0 = tr.P[2], T0 = tr.Tn[2], night = !!tr.th.night || tr.def.weather === 'dust' || tr.def.weather === 'rain';
  Object.assign(D, { on: true, trackId, mode, id, cfg, st, car, tr, x: P0.x, z: P0.z, h: Math.atan2(T0.x, T0.z), u: 0, v: 0, r: 0, delta: 0, ax: 0, ay: 0, vx: 0, vz: 0,
    rpm: 900, gear: 1, shiftT: 0, spin: false, locked: false, nitro: 1, nosOn: false, idx: 2, lastIdx: 2, progress: 0, lap: 1, lapT: 0, laps: [], bestLap: 0,
    score: 0, dPts: 0, dMul: 1, dT: 0, grace: 0, angle: 0, beta: 0, longest: 0, maxMul: 1, crashes: 0, damage: (s.damage && s.damage[id]) || 0,
    t: 0, left: CFG.CHALLENGE_TIME, count: mode === 'free' ? 0 : 3.2, lastCount: 4, shake: 0, camPos: null, camLook: null, ended: false, pitch: 0, roll: 0, msgT: 0, hudT: 0, slip: 0, slipRear: 0,
    pops: 0, popT: 0, lastThr: 0, flashT: 0, night, speed: 0, thr: 0, brk: 0, hb: false, dR: CARS[id].R });
  const q = CFG.QUALITY[quality()].parts;
  D.smoke = makeParticles(Math.round(800 * q), false); tr.sc.add(D.smoke.pts);
  D.exSmoke = makeParticles(Math.round(260 * q), false); tr.sc.add(D.exSmoke.pts);
  D.sparks = makeParticles(260, true); tr.sc.add(D.sparks.pts);
  D.skids = makeSkids(Math.round(2600 * q)); tr.sc.add(D.skids.m);
  // пламя выхлопа: внутренний и внешний конус + свечение
  const u = car.userData, L2 = CARS[id].L / 2;
  D.flames = u.exh.map(p => {
    const g = new THREE.Group(); g.position.copy(p); u.body.add(g); const side = Math.abs(p.z) < L2 - .3;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(.1, .8, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.05, .5, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
    outer.rotation.x = inner.rotation.x = -Math.PI / 2; outer.position.z = -.35; inner.position.z = -.22; g.add(outer, inner);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Mat.glow.map, color: 0xff8a3a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.scale.set(1.2, 1.2, 1); glow.position.z = -.3; g.add(glow);
    if (side) g.rotation.y = Math.sign(p.x) * Math.PI / 2 + Math.PI; g.visible = false; return { g, outer, inner, glow };
  });
  D.popLight = new THREE.PointLight(0xff8a3a, 0, 6, 2); D.popLight.position.set(0, .4, -L2 - .3); u.body.add(D.popLight);
  // фары: прожекторы, пятно света на дороге, свечение
  if (night) for (const sx of [-1, 1]) { const l = new THREE.SpotLight(new THREE.Color(LIGHT_COLS[cfg.lightCol]), 170, 85, .45, .5, 1.3); l.position.set(sx * .6, .7, L2); l.target.position.set(sx * .4, 0, 30); car.add(l); car.add(l.target); }
  u.pool.visible = night; u.pool.material.opacity = .24; u.headGlow.forEach(g => { g.visible = night; }); u.headMat.emissiveIntensity = night ? 3 : 1.4;
  D.smokeCol = { rain: [.6, .63, .67], clear: [.84, .84, .86], snow: [.96, .97, 1], dust: [.8, .66, .5], night: [.62, .64, .7], sunny: [.86, .86, .88] }[tr.def.weather] || [.8, .8, .82];
  D.grip = tr.def.grip;
  // живые отражения окружения на кузове (высокое качество)
  if (quality() === 'high') { const rt = new THREE.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    D.cube = new THREE.CubeCamera(.5, 400, rt); tr.sc.add(D.cube); D.cubeT = 0;
    car.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && (o.material === u.paint || o.material === u.glass || o.material.metalness > .6)) { if (o.material === Mat.chrome) return; o.material.envMap = rt.texture; } }); } else D.cube = null;
  if (D.damage) dentFromDamage();
  UI.drawMini(); H.state = 'DRIVE'; UI.hud(true);
}
function dentFromDamage() { const d = CARS[D.id]; let left = D.damage; for (const [lx, lz] of [[1, .8], [-1, -.6], [.3, 1], [-.4, -1]]) { if (left <= 0) break; dentCar(D.car, lx * d.W / 2, .6, lz * d.L / 2, Math.min(.1, left * .002)); left -= 25; } }
function stopDrive() {
  if (!D.tr) return; const s = H.save; s.damage = s.damage || {}; s.damage[D.id] = Math.round(D.damage); Save.write();
  disposeTree(D.tr.sc); if (D.tr.sc.environment) D.tr.sc.environment.dispose(); D.on = false; D.tr = null; W.track = null; Snd.engine(0, 0, false); Snd.tires(0);
}

// ---------- физика: шины (Пачейка), перенос веса, круг трения, двигатель ----------
const torqueCurve = (rpm, red) => clamp(.55 + .45 * Math.sin(Math.PI * clamp((rpm - 900) / (red * 1.08 - 900), 0, 1)), .35, 1);
const latF = (alpha, Fz, mu) => -mu * Fz * Math.sin(1.4 * Math.atan(8 * alpha));
function physStep(dt) {
  const st = D.st, m = st.mass, a = st.a, b = st.b, L = st.L, dmg = D.damage / 100, mu = st.mu * D.grip * (1 - .12 * dmg), R = D.dR;
  let thr = Inp.gas, brk = Inp.brake, hb = Inp.hb;
  if (D.count > 0) { brk = 0; hb = false; } if (D.ended) { thr = 0; brk = .5; }
  const spd = Math.hypot(D.u, D.v), beta = spd > 2 ? Math.atan2(D.v, Math.abs(D.u)) : 0;
  // руль: полный угол на малой скорости, меньше на большой; помощь в контруле
  const lock = st.steerMax / (1 + spd / 32) + .1;
  let target = -Inp.steer * lock + (H.save.settings.assist ? beta * CFG.ASSIST * clamp(spd / 10, 0, 1) * (1 - Math.abs(Inp.steer) * .6) : 0) + dmg * .03;
  target = clamp(target, -.8, .8); D.delta += clamp(target - D.delta, -4.5 * dt * st.resp, 4.5 * dt * st.resp);
  // нагрузки на оси с переносом веса
  const Fzf = Math.max(.25 * m * G, m * G * b / L - m * D.ax * st.h / L), Fzr = Math.max(.25 * m * G, m * G * a / L + m * D.ax * st.h / L);
  // двигатель
  const ue = Math.max(Math.abs(D.u), 3), gr = GEARS[D.gear] * FINAL;
  const groundRpm = Math.abs(D.u) / R * Math.abs(gr) * 60 / TAU;
  const nos = D.nosOn ? 1.35 : 1, limiter = D.rpm >= st.redline - 30 ? 0 : 1;
  const Tq = D.shiftT > 0 ? 0 : st.torque * torqueCurve(D.rpm, st.redline) * thr * nos * limiter;
  const Fdrive = Tq * gr * .88 / R;
  // боковые силы шин
  const af = Math.atan2(D.v + a * D.r, ue) - D.delta * Math.sign(D.u || 1), ar = Math.atan2(D.v - b * D.r, ue);
  let Fyf = latF(af, Fzf, mu), Fyr = latF(ar, Fzr, mu), Fxf = 0, Fxr = 0;
  const capR = mu * Fzr, capF = mu * Fzf; D.spin = false; D.locked = false;
  if (hb && spd > 1) { D.locked = true; Fxr = -Math.sign(D.u) * capR * .7; Fyr *= .32; }
  else if (D.gear > 0 && Fdrive > capR * .9) { D.spin = true; Fxr = capR * .86; const lim = Math.sqrt(Math.max(0, capR * capR - Fxr * Fxr)) * CFG.SPIN_LAT; Fyr = clamp(Fyr, -lim, lim); }
  else { Fxr = Fdrive; const lim = Math.sqrt(Math.max(0, capR * capR - Fxr * Fxr)); Fyr = clamp(Fyr, -lim, lim); }
  if (brk > 0) {
    if (D.u > .6) { Fxf = -brk * capF * .85; if (!D.locked) Fxr -= brk * capR * .45; const lf = Math.sqrt(Math.max(0, capF * capF - Fxf * Fxf)); Fyf = clamp(Fyf, -lf, lf); }
    else if (thr === 0 && D.count <= 0 && !D.ended) { D.gear = 0; Fxr = D.u > -9 ? -3400 * brk : 0; }
  }
  if (D.gear === 0 && thr > 0) D.gear = 1;
  if (D.count > 0) { Fxr = 0; Fxf = 0; Fyf = 0; Fyr = 0; D.u = 0; D.v = 0; D.r = 0; }
  const drag = .42 * D.u * Math.abs(D.u) + 12 * D.u + (Math.abs(D.u) > .2 ? Math.sign(D.u) * .013 * m * G : 0);
  const cd = Math.cos(D.delta), sd = Math.sin(D.delta);
  const ax = (Fxr + Fxf * cd - Fyf * sd - drag) / m, ay = (Fyr + Fyf * cd + Fxf * sd) / m, rd = (a * (Fyf * cd + Fxf * sd) - b * Fyr) / st.Iz - D.r * CFG.YAW_DAMP * Math.min(1, spd / 15);
  D.u += (ax + D.r * D.v) * dt; D.v += (ay - D.r * D.u) * dt; D.r += rd * dt;
  // устойчивость на малой скорости: переход к кинематической модели
  if (spd < 3.5) { const k = 1 - spd / 3.5; D.v *= Math.exp(-7 * k * dt); D.r = lerp(D.r, D.u * Math.tan(D.delta) / L, 1 - Math.exp(-9 * k * dt)); }
  if (thr === 0 && brk === 0 && Math.abs(D.u) < .15) D.u *= Math.exp(-4 * dt);
  D.ax = lerp(D.ax, ax, .25); D.ay = ay; D.h += D.r * dt;
  const fx = Math.sin(D.h), fz = Math.cos(D.h), lx = Math.cos(D.h), lz = -Math.sin(D.h);
  D.vx = fx * D.u + lx * D.v; D.vz = fz * D.u + lz * D.v; D.x += D.vx * dt; D.z += D.vz * dt;
  // обороты: при пробуксовке взлетают
  const rpmT = D.count > 0 ? 900 + thr * (st.redline - 1400) : D.spin ? Math.min(st.redline, Math.max(groundRpm, 900) + 2400 * thr + 800) : Math.max(900 + thr * 300, groundRpm);
  D.rpm = damp(D.rpm, rpmT, D.spin || D.count > 0 ? 7 : 18, dt); if (D.rpm > st.redline) D.rpm = st.redline;
  // коробка-автомат
  if (D.shiftT > 0) D.shiftT -= dt;
  else if (D.gear > 0 && D.count <= 0) {
    if (groundRpm > st.redline * .95 && D.gear < 6 && !D.spin) { D.gear++; D.shiftT = .16; D.popT = .25; D.pops = 1 + (Math.random() * 2 | 0); Snd.shift(); }
    else if (groundRpm < 2900 && D.gear > 1) D.gear--;
  }
  D.speed = Math.hypot(D.vx, D.vz); D.slipRear = Math.abs(ar); D.beta = beta; D.thr = thr; D.brk = brk; D.hb = hb;
}

function driveStep(dt) {
  const tr = D.tr, st = D.st;
  const nosCap = .6 + .25 * st.nitro;
  D.nosOn = Inp.nitro && D.nitro > .01 && Inp.gas > 0 && D.count <= 0 && !D.ended;
  if (D.nosOn) { D.nitro = Math.max(0, D.nitro - dt / (2.4 * nosCap)); if (!D.nosWas) Snd.play('nitro'); } D.nosWas = D.nosOn;
  // отстрелы при сбросе газа на высоких оборотах
  if (D.lastThr > .7 && Inp.gas < .2 && D.rpm > st.redline * .6) { D.pops = 2 + (Math.random() * 3 | 0); D.popT = .3; if (st.turbo) Snd.play('blowoff'); }
  D.lastThr = Inp.gas;
  physStep(dt / 2); physStep(dt / 2);
  // стены
  D.idx = nearestIdx(D.x, D.z, D.idx);
  const P = tr.P[D.idx], N = tr.Nm[D.idx], off = (D.x - P.x) * N.x + (D.z - P.z) * N.z, lim = tr.hw + .45;
  if (Math.abs(off) > lim) {
    const sg = Math.sign(off); D.x -= N.x * (off - sg * lim); D.z -= N.z * (off - sg * lim);
    const vn = D.vx * N.x + D.vz * N.z;
    if (vn * sg > 0) {
      D.vx -= N.x * vn * 1.3; D.vz -= N.z * vn * 1.3; D.vx *= .85; D.vz *= .85; D.r *= .5;
      const fx = Math.sin(D.h), fz = Math.cos(D.h), lx = Math.cos(D.h), lz = -Math.sin(D.h); D.u = D.vx * fx + D.vz * fz; D.v = D.vx * lx + D.vz * lz;
      const imp = Math.abs(vn);
      if (imp > 2.2) {
        D.shake = Math.min(1, imp / 12); Snd.play('hit', Math.min(1, imp / 15));
        for (let i = 0; i < 30; i++) emitP(D.sparks, D.x + N.x * sg * .9, .4, D.z + N.z * sg * .9, rand(-4, 4) - N.x * sg * 3 + D.vx * .3, rand(1, 5), rand(-4, 4) - N.z * sg * 3 + D.vz * .3, rand(.3, .7), rand(.1, .22), -.1, 1, rand(.5, .8), .2);
        // вмятина в точке удара (координаты машины)
        const d = CARS[D.id], wx = N.x * sg, wz = N.z * sg, clx = wx * lx + wz * lz, clz = wx * fx + wz * fz, n = Math.hypot(clx, clz) || 1;
        if (imp > 4) { dentCar(D.car, clx / n * d.W / 2, .6, clz / n * d.L / 2, Math.min(.12, imp * .007)); D.damage = Math.min(100, D.damage + imp * 1.1); }
        if (imp > 4 && D.dPts > 0) { D.dPts = 0; D.dT = 0; D.dMul = 1; D.crashes++; UI.driftMsg(T('crash')); Snd.play('lose'); }
      }
    }
  }
  // круги
  let di = D.idx - D.lastIdx; if (di > tr.N / 2) di -= tr.N; if (di < -tr.N / 2) di += tr.N; D.progress += di; D.lastIdx = D.idx;
  if (D.mode === 'time' && D.count <= 0 && !D.ended) {
    D.lapT += dt;
    if (D.progress >= tr.N) { D.progress -= tr.N; D.laps.push(D.lapT); if (!D.bestLap || D.lapT < D.bestLap) D.bestLap = D.lapT; Snd.play('bank'); UI.toast(T('lap') + ' ' + D.lap + ': ' + fmtT(D.lapT)); D.lapT = 0; D.lap++; if (D.lap > CFG.LAPS) endDrive(); }
  }
  // очки за дрифт
  const ang = Math.abs(D.beta); D.angle = ang; D.slip = clamp((D.slipRear - .12) * 2.4, 0, 1) * Math.min(1, D.speed / 8);
  const drifting = D.speed > CFG.DRIFT_MIN_SPEED && ang > CFG.DRIFT_MIN_ANGLE && ang < 1.9 && D.u > 0 && D.count <= 0 && !D.ended;
  if (drifting) {
    D.dT += dt; D.grace = CFG.DRIFT_BANK_DELAY; D.dMul = Math.min(CFG.DRIFT_MULT_MAX, 1 + Math.floor(D.dT / CFG.DRIFT_MULT_EVERY));
    D.dPts += dt * D.speed * (ang * 57.3) * .09 * D.dMul; D.maxMul = Math.max(D.maxMul, D.dMul); D.longest = Math.max(D.longest, D.dT); D.nitro = Math.min(1, D.nitro + dt * .1);
  } else if (D.dPts > 0) { D.grace -= dt; if (D.grace <= 0) bankDrift(); }
  if (!D.nosOn) D.nitro = Math.min(1, D.nitro + dt * .025);
  if (D.count > 0) { D.count -= dt; const c = Math.ceil(D.count); if (c !== D.lastCount && c > 0) { Snd.play('count'); D.lastCount = c; } if (D.count <= 0) Snd.play('go'); }
  else if (!D.ended) { D.t += dt; if (D.mode === 'chal') { D.left -= dt; if (D.left <= 0) { D.left = 0; endDrive(); } } }
}
function bankDrift() {
  const pts = Math.round(D.dPts); D.score += pts;
  if (pts > 50) { UI.driftMsg('+' + fmt(pts) + (pts > 8000 ? ' ' + T('insane') : pts > 3000 ? ' ' + T('great') : pts > 800 ? ' ' + T('perfect') : ''), true); Snd.play('bank'); }
  D.dPts = 0; D.dT = 0; D.dMul = 1;
}
function endDrive() { if (D.ended) return; if (D.dPts > 0) bankDrift(); D.ended = true; setTimeout(() => { if (D.on) UI.results(); }, 1400); }

// ---------- визуализация ----------
function driveVisual(dt) {
  const car = D.car, u = car.userData, d = CARS[D.id], st = D.st, now = performance.now() / 1000;
  car.position.set(D.x, 0, D.z); car.rotation.y = D.h;
  D.pitch = damp(D.pitch, clamp(-D.ax * .006, -.05, .05), 7, dt); D.roll = damp(D.roll, clamp(-D.ay * .0065, -.07, .07), 7, dt);
  u.body.rotation.x = D.pitch; u.body.rotation.z = D.roll;
  for (const w of u.wheels) { const k = !w.front && D.spin ? 2.5 : !w.front && D.locked ? 0 : 1; w.spin.rotation.x += D.u * dt / d.R * k; if (w.front) w.pivot.rotation.y = D.delta; }
  u.tailMat.emissiveIntensity = D.brk > 0 ? 4 : .9; u.tailGlow.material.opacity = D.brk > 0 ? .75 : D.night ? .2 : 0;
  const fx = Math.sin(D.h), fz = Math.cos(D.h), lx = Math.cos(D.h), lz = -Math.sin(D.h);
  // отстрелы, нитро, дым выхлопа
  if (D.popT > 0) D.popT -= dt;
  const popping = D.pops > 0 && Math.random() < dt * 22;
  if (popping) { D.pops--; D.flashT = .07; Snd.play('pop'); }
  if (D.flashT > 0) D.flashT -= dt;
  const show = D.nosOn || D.flashT > 0, blue = D.nosOn;
  D.popLight.intensity = D.flashT > 0 ? 18 : D.nosOn ? 6 : 0; D.popLight.color.set(blue ? 0x6ac8ff : 0xff8a3a);
  D.flames.forEach(f => { f.g.visible = show; if (!show) return; const k = .75 + Math.random() * .5;
    f.outer.material.color.set(blue ? 0x3a8cff : 0xff6a1a); f.inner.material.color.set(blue ? 0xd8f4ff : 0xfff0b0); f.glow.material.color.set(blue ? 0x5ab0ff : 0xff8a3a); f.g.scale.set(k, k, (blue ? 1.5 : 1) * k);
    if (popping && !blue) { const wp = f.g.getWorldPosition(V3()); for (let i = 0; i < 5; i++) emitP(D.sparks, wp.x, wp.y, wp.z, -fx * rand(3, 7) + rand(-1, 1), rand(0, 2), -fz * rand(3, 7) + rand(-1, 1), rand(.15, .35), rand(.06, .12), 0, 1, .7, .3); } });
  if (Math.random() < dt * (4 + D.thr * 18) * CFG.QUALITY[quality()].parts) for (const p of u.exh) {
    const wp = V3(p.x, p.y, p.z).applyMatrix4(u.body.matrixWorld), c = D.flashT > 0 ? .35 : .55;
    emitP(D.exSmoke, wp.x, wp.y, wp.z, -fx * (1 + D.thr * 2) + D.vx * .6, rand(.2, .6), -fz * (1 + D.thr * 2) + D.vz * .6, rand(.6, 1.2), rand(.15, .25), rand(.6, 1.1), c, c, c + .03, .22 + D.thr * .15);
  }
  // дым и следы задних колёс
  const smokeK = Math.max(D.slip, D.locked && D.speed > 4 ? .6 : 0, D.spin ? .9 : 0), [cr, cg, cb] = D.smokeCol, trk = u.trk;
  u.wheels.forEach((w, i) => {
    if (w.front) return; const wlx = w.side * trk / 2, wlz = -d.wb / 2, x = D.x + lx * wlx + fx * wlz, z = D.z + lz * wlx + fz * wlz;
    if (smokeK > .25) {
      const n = smokeK * CFG.QUALITY[quality()].parts * 2.8; for (let k = 0; k < Math.ceil(n); k++) if (Math.random() < n / Math.ceil(n))
        emitP(D.smoke, x + rand(-.25, .25), .28, z + rand(-.25, .25), D.vx * .12 + rand(-1.2, 1.2), rand(.5, 1.6), D.vz * .12 + rand(-1.2, 1.2), rand(1.6, 3), rand(.9, 1.4), rand(1.6, 2.8), cr, cg, cb, .55);
      if (D.speed > 2) addSkid(D.skids, i - 2, x, z, D.vx / (D.speed || 1), D.vz / (D.speed || 1));
    } else D.skids.last[i - 2] = null;
  });
  updateP(D.smoke, dt, .35, .985); updateP(D.exSmoke, dt, .5, .97); updateP(D.sparks, dt, -12, .99);
  Snd.engine((D.rpm - 900) / (st.redline - 900), D.thr, true, { turbo: st.turbo, cyl: st.cyl, snd: st.snd, rpm: D.rpm, limit: D.rpm >= st.redline - 40 });
  Snd.tires(Math.max(D.slip * Math.min(1, D.speed / 10), D.locked && D.speed > 4 ? .7 : 0));
  cameraUpdate(dt, fx, fz, lx, lz);
  const tr = D.tr, sp = tr.th.sunPos; tr.sun.position.set(D.x + sp[0], sp[1], D.z + sp[2]); tr.sun.target.position.set(D.x, 0, D.z);
  updateWeather(dt, D.x, D.z); updateLamps(D.x, D.z); animateTrack(now, dt);
}
// 5 камер: сзади, дальняя, с капота, с бампера, кинематографичная сбоку
function cameraUpdate(dt, fx, fz, lx, lz) {
  const cam = W.cam, mode = H.save.settings.cam % CAMS.length, d = CARS[D.id], vdir = D.speed > 4 ? Math.atan2(D.vx, D.vz) : D.h;
  let tx, ty, tz, kx, ky, kz, stiff = 6;
  if (mode === 0 || mode === 1) { const dist = mode ? 9.5 : 6, ht = mode ? 3.4 : 2, look = lerpAngle(D.h, vdir, .5); tx = D.x - Math.sin(look) * dist; tz = D.z - Math.cos(look) * dist; ty = ht; kx = D.x + fx * 2.5; ky = .9; kz = D.z + fz * 2.5; stiff = 5; }
  if (mode === 2) { tx = D.x + fx * .2; ty = d.p.belt + .3; tz = D.z + fz * .2; kx = D.x + fx * 20; ky = .9; kz = D.z + fz * 20; stiff = 60; }
  if (mode === 3) { tx = D.x + fx * (d.L / 2 + .15); ty = .42; tz = D.z + fz * (d.L / 2 + .15); kx = tx + fx * 20; ky = .5; kz = tz + fz * 20; stiff = 60; }
  if (mode === 4) { const side = D.angle > .15 ? -Math.sign(D.beta) : 1; tx = D.x + lx * side * 5.5 - Math.sin(vdir) * 3.2; tz = D.z + lz * side * 5.5 - Math.cos(vdir) * 3.2; ty = 1.3; kx = D.x; ky = .7; kz = D.z; stiff = 3; }
  if (!D.camPos || D.camMode !== mode) { D.camPos = V3(tx, ty, tz); D.camLook = V3(kx, ky, kz); D.camMode = mode; }
  D.camPos.set(damp(D.camPos.x, tx, stiff, dt), damp(D.camPos.y, ty, stiff, dt), damp(D.camPos.z, tz, stiff, dt));
  D.camLook.set(damp(D.camLook.x, kx, stiff * 1.5, dt), damp(D.camLook.y, ky, stiff * 1.5, dt), damp(D.camLook.z, kz, stiff * 1.5, dt));
  cam.position.copy(D.camPos); if (D.shake > 0) { cam.position.x += rand(-1, 1) * D.shake * .35; cam.position.y += rand(-1, 1) * D.shake * .25; D.shake = Math.max(0, D.shake - dt * 2.5); }
  if (mode <= 1 || mode === 4) { const t = performance.now(); cam.position.x += Math.sin(t / 70) * D.speed * .0006; cam.position.y += Math.sin(t / 53) * D.speed * .0005; }
  cam.lookAt(D.camLook);
  const fov = (innerWidth < innerHeight ? 78 : 62) + (mode === 2 || mode === 3 ? 8 : 0) + Math.min(D.speed, 70) * .2 + (D.nosOn ? 9 : 0);
  cam.fov = damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix();
}
function updateReflections() {
  D.cubeT = (D.cubeT + 1) % 3; if (D.cubeT) return;
  D.car.visible = false; D.cube.position.set(D.x, 1, D.z); D.cube.update(W.renderer, D.tr.sc); D.car.visible = true;
}
function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * t; }
