// ==== 9b. RACE: соперники с ИИ, трафик, полиция, гоночные режимы ====
// laps — круги; ai — число соперников; traffic — гражданские машины; ko — выбывание; traps — радары за круг; drag — дистанция; police — погоня
const RMODES = {
  circuit: { laps: 3, ai: 5 },
  sprint: { laps: 1, ai: 5, traffic: 8 },
  knockout: { laps: 3, ai: 3, ko: true },
  speedtrap: { laps: 2, ai: 5, traps: 3, traffic: 4 },
  drag: { laps: 0, ai: 3, drag: 402 },
  pursuit: { laps: 0, ai: 0, police: true, traffic: 6 },
};
const RACER_NAMES = ['Кобра', 'Шёпот', 'Ронин', 'Искра', 'Вандал', 'Мираж', 'Тень', 'Фантом', 'Дизель', 'Ведьма', 'Сокол', 'Хан', 'Лис', 'Бритва', 'Нова', 'Жнец'];
const RACER_NAMES_EN = ['Cobra', 'Whisper', 'Ronin', 'Spark', 'Vandal', 'Mirage', 'Shade', 'Phantom', 'Diesel', 'Witch', 'Falcon', 'Khan', 'Fox', 'Razor', 'Nova', 'Reaper'];
const CLASS_MULT = { D: 1, C: 1.5, B: 2.2, A: 3.2, S: 4.5 };
const PRIZES = [3000, 1800, 1100, 600, 300, 150];
const RC = { on: false };
const isRaceMode = m => !!RMODES[m];
const pickR = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];
const wrapD = (d, total) => { d %= total; if (d > total / 2) d -= total; if (d < -total / 2) d += total; return d; };

// оценка максималки и разгона по характеристикам машины
function aiPerf(id, cfg) {
  const st = carStats(id, cfg || defaultConfig(id)), pw = st.power * 745.7;
  return { vmax: Math.min(96, .74 * Math.cbrt(pw / .42)), acc: clamp(pw / st.mass / 38, 3.4, 10), mu: st.mu, mass: st.mass };
}
// скорость прохождения поворотов вдоль трассы + тормозной проход; линия апекса
function trackProfile(tr) {
  const N = tr.N, seg = tr.total / N, cap = new Float32Array(N), line = new Float32Array(N), aLat = G * tr.def.grip * 1.05;
  for (let i = 0; i < N; i++) {
    const a = tr.Tn[(i - 3 + N) % N], b = tr.Tn[(i + 3) % N], ang = Math.acos(clamp(a.x * b.x + a.z * b.z, -1, 1)), k = ang / (6 * seg) + 1e-5;
    cap[i] = Math.min(110, Math.sqrt(aLat / k));
    const dx = b.x - a.x, dz = b.z - a.z; line[i] = Math.sign(dx * tr.Nm[i].x + dz * tr.Nm[i].z) * clamp(ang * 6, 0, 1);
  }
  for (let pass = 0; pass < 2; pass++) for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N; cap[i] = Math.min(cap[i], Math.sqrt(cap[j] * cap[j] + 2 * 7.2 * seg)); }
  const sm = new Float32Array(N), W2 = 14; for (let i = 0; i < N; i++) { let s = 0; for (let k = -W2; k <= W2; k++) s += line[(i + k + N) % N]; sm[i] = s / (W2 * 2 + 1) * (tr.hw - 2.4); }
  return { cap, line: sm, seg };
}

// ---------- старт режима ----------
function raceStart(mode, opts = {}) {
  const tr = D.tr, M = RMODES[mode], N = tr.N, seg = tr.total / N, prof = trackProfile(tr), s = H.save, pc = CARS[D.id];
  Object.assign(RC, { on: true, mode, M, prof, seg, cars: [], t: 0, done: false, result: null, finishT: 0, laps: M.laps, lapT: 0, lap: 1, bestLap: 0, lapStart: 0,
    diff: opts.diff ?? 1, cls: opts.cls || pc.cls, rng: mulberry32((Date.now() & 0xffff) + 7), traps: [], trapSum: 0, trapLog: [], heat: 1, bust: 0, evade: 0, bounty: 0, copT: 15,
    wrecked: 0, alive: M.ai + 1, event: opts.event || null, shiftT: 0, shiftMsgT: 0, sirenG: null, rivalIds: opts.rivals || null, boss: opts.boss || null });
  D.noDrift = true;
  // сетка старта: пары рядов позади стартовой арки
  const grid = k => ({ s: tr.total - 8 - Math.floor(k / 2) * 9, off: (k % 2 ? 1 : -1) * Math.min(3.4, tr.hw - 2) });
  let pSlot = M.ai;
  if (M.drag) {
    const lanes = [-7.5, -2.5, 2.5, 7.5].map(o => clamp(o, -tr.hw + 1.6, tr.hw - 1.6)); RC.lanes = lanes; RC.dragS0 = 10; pSlot = 1;
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(tr.hw * 2, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff })); const fi = Math.round((RC.dragS0 + M.drag) / seg) % N;
    fin.rotation.x = -Math.PI / 2; fin.rotation.z = Math.atan2(tr.Tn[fi].x, tr.Tn[fi].z); fin.position.set(tr.P[fi].x, .05, tr.P[fi].z); tr.sc.add(fin);
    placePlayer(RC.dragS0, lanes[pSlot]); D.rp = 0; D.manual = true; D.gear = 1;
  } else if (M.police) { placePlayer(4 * seg, 0); D.rp = 0; }
  else { const g = grid(pSlot); placePlayer(g.s, g.off); D.rp = g.s - tr.total; }
  // соперники
  const pool = Object.keys(CARS).filter(id => CARS[id].cls === RC.cls && id !== D.id), names = H.lang === 'en' ? RACER_NAMES_EN : RACER_NAMES, used = new Set();
  for (let k = 0; k < M.ai; k++) {
    const id = (RC.rivalIds && RC.rivalIds[k]) || pickR(pool.length ? pool : Object.keys(CARS), RC.rng); let nm; do { nm = pickR(names, RC.rng); } while (used.has(nm) && used.size < names.length); used.add(nm);
    const slot = M.drag ? (k >= pSlot ? k + 1 : k) : k, g = M.drag ? { s: RC.dragS0, off: RC.lanes[slot] } : grid(slot);
    const a = addAI('racer', id, g.s, g.off, { name: RC.boss && k === 0 ? RC.boss.name : nm, boss: RC.boss && k === 0 });
    a.p = M.drag ? 0 : g.s - tr.total; a.lane = g.off;
  }
  // трафик
  for (let k = 0; k < (M.traffic || 0); k++) { let s0 = (tr.total * (k + .5) / M.traffic + 60) % tr.total; if (s0 > tr.total - 70) s0 = (s0 + 90) % tr.total; spawnCiv(s0); }
  // полиция
  if (M.police) { for (let k = 0; k < 2; k++) addAI('cop', 'aster', (4 * seg - 40 - k * 14 + tr.total) % tr.total, (k ? 1 : -1) * 3, { name: T('police') }); RC.bounty = 0; }
  // радары: самые быстрые места каждой трети круга
  if (M.traps) for (let t = 0; t < M.traps; t++) { let bi = 0, bv = 0; for (let i = Math.floor(N * t / M.traps) + 8; i < Math.floor(N * (t + 1) / M.traps) - 8; i++) if (prof.cap[i] > bv) { bv = prof.cap[i]; bi = i; } RC.traps.push({ i: bi }); buildTrap(bi); }
  RC.lastIdx = D.idx;
}
function placePlayer(sAlong, off) {
  const tr = D.tr, i = Math.round(sAlong / RC.seg) % tr.N, P = tr.P[i], N = tr.Nm[i], T0 = tr.Tn[i];
  D.x = P.x + N.x * off; D.z = P.z + N.z * off; D.h = Math.atan2(T0.x, T0.z); D.idx = D.lastIdx = i; D.progress = 0; D.camPos = null;
}
function aiConfig(id, rng, kind) {
  const cfg = defaultConfig(id);
  if (kind === 'cop') Object.assign(cfg, { paint: '#f4f4f5', vinyl: 10, vcol: 1, vcol2: 0, wheel: 8, wcol: 1 });
  else if (kind === 'civ') Object.assign(cfg, { paint: pickR(['#8e8e93', '#64748b', '#3b3024', '#f4f4f5', '#0f0f12', '#7f1d1d', '#0b3d2e', '#1e3a8a', '#c9a227'], rng) });
  else Object.assign(cfg, { paint: pickR(PAINTS, rng), wheel: Math.floor(rng() * 10), wcol: Math.floor(rng() * WHEEL_COLORS.length), vinyl: rng() < .6 ? 1 + Math.floor(rng() * 11) : 0, vcol: Math.floor(rng() * 10), vcol2: Math.floor(rng() * 10),
    spoiler: rng() < .5 ? Math.floor(rng() * PARTS.spoiler.length) : cfg.spoiler, front: Math.floor(rng() * PARTS.front.length), height: 1 + Math.floor(rng() * 3), camber: Math.floor(rng() * 3), neon: rng() < .3 ? 1 + Math.floor(rng() * 7) : 0 });
  return cfg;
}
function addAI(kind, id, s, off, extra = {}) {
  const tr = D.tr, cfg = aiConfig(id, RC.rng, kind), car = buildCar(id, cfg, { noLights: true }); tr.sc.add(car);
  const u = car.userData, perf = aiPerf(id, cfg), d = CARS[id];
  u.headGlow.forEach(g => { g.visible = D.night; }); u.headMat.emissiveIntensity = D.night ? 3 : 1.2; u.pool.visible = false;
  car.traverse(o => { if (o.isMesh) { o.castShadow = kind !== 'civ' && quality() === 'high'; } });
  const skill = kind === 'racer' ? clamp(.9 + .05 * RC.diff + (RC.rng() - .5) * .12 + (extra.boss ? .05 : 0), .8, 1.08) : kind === 'cop' ? 1.03 + .01 * (RC.heat || 1) : .6;
  const a = { kind, id, car, d, u, s, p: 0, off, offT: off, lv: 0, v: 0, vmax: perf.vmax * (kind === 'cop' ? 1.1 : kind === 'civ' ? .3 : 1) * (kind === 'racer' ? .96 + .04 * RC.diff : 1), acc: perf.acc, mass: perf.mass, corner: skill,
    x: 0, z: 0, h: 0, steer: 0, spinT: 0, spinDir: 1, done: false, finT: 0, elim: false, hp: 3, name: extra.name || '', boss: !!extra.boss, lapT: 0, trapSum: 0, lastI: 0, lap: 0, idx: 0, react: kind === 'racer' && RMODES[RC.mode].drag ? rand(.18, .4) : 0 };
  if (kind === 'civ') { a.v = a.vmax = rand(12, 18); a.acc = 3; }
  if (kind === 'cop') addLightbar(a);
  aiPose(a, 0); a.lastI = a.idx; RC.cars.push(a); return a;
}
function spawnCiv(s) { const tr = D.tr, id = pickR(Object.keys(CARS).filter(k => ['sedan', 'wagon', 'hatch', 'mini'].includes(CARS[k].fam) && 'DC'.includes(CARS[k].cls)), RC.rng); const lane = (RC.rng() < .5 ? -1 : 1) * tr.hw * .4, a = addAI('civ', id, ((s % tr.total) + tr.total) % tr.total, lane); a.lane = lane; return a; }
function addLightbar(a) {
  const d = a.d, bar = new THREE.Group(); bar.position.set(0, d.p.roof + .06, -.1); a.u.body.add(bar);
  const mk = (col, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.5, .1, .22), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2 })); m.position.x = x; bar.add(m);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: Mat.glow.map, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); g.scale.set(3, 3, 1); g.position.x = x; bar.add(g); return { m, g }; };
  a.lb = [mk(0xff1a2a, -.3), mk(0x1a5cff, .3)];
}
function buildTrap(i) {
  const tr = D.tr, P = tr.P[i], N = tr.Nm[i], x = P.x + N.x * (tr.hw + 1.5), z = P.z + N.z * (tr.hw + 1.5), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(tr.Tn[i].x, tr.Tn[i].z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: .7, roughness: .4 })); pole.position.y = 2.1; g.add(pole);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(.45, .4, .7), new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: .5 })); cam.position.set(-.3, 4.1, 0); g.add(cam);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: Mat.glow.map, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); fl.scale.set(8, 8, 1); fl.position.set(-.3, 4.1, .4); g.add(fl);
  tr.sc.add(g); RC.traps[RC.traps.length - 1].flash = fl;
}

// ---------- ИИ ----------
function aiPose(a, dt) {
  const tr = D.tr, N = tr.N, seg = RC.seg, ss = ((a.s % tr.total) + tr.total) % tr.total, fi = ss / seg, i = Math.floor(fi) % N, j = (i + 1) % N, f = fi - Math.floor(fi);
  const P0 = tr.P[i], P1 = tr.P[j], n = tr.Nm[i], t0 = tr.Tn[i], t1 = tr.Tn[j];
  a.idx = i; a.x = lerp(P0.x, P1.x, f) + n.x * a.off; a.z = lerp(P0.z, P1.z, f) + n.z * a.off;
  const th = Math.atan2(lerp(t0.x, t1.x, f), lerp(t0.z, t1.z, f)), slope = a.v > 1 ? Math.atan2(a.lv, a.v) : 0;
  let h = th - slope * 0; if (dt) { const lead = a.v > 2 ? (a.offT - a.off) * .06 : 0; h = th + clamp(lead, -.2, .2); }
  if (a.spinT > 0) h += a.spinDir * (1 - a.spinT / 1.4) * 2.2;
  a.h = h; const t2 = tr.Tn[(i + 4) % N]; a.steer = clamp(Math.atan2(t0.x * t2.z - t0.z * t2.x, t0.x * t2.x + t0.z * t2.z) * -2.5, -.5, .5);
}
function aiStep(a, dt) {
  const tr = D.tr, N = tr.N, prof = RC.prof, M = RC.M, go = D.count <= 0;
  if (a.elim) return;
  let vt = a.vmax;
  if (!go) vt = 0;
  else if (a.done) vt = a.kind === 'racer' ? a.vmax * .45 : vt;
  const i = ((Math.floor((((a.s % tr.total) + tr.total) % tr.total) / RC.seg)) % N + N) % N;
  if (!M.drag) vt = Math.min(vt, prof.cap[i] * a.corner);
  let offT = a.lane ?? a.off;
  const sP = D.idx * RC.seg, gapP = wrapD(sP - a.s, tr.total), pOff = (D.x - tr.P[D.idx].x) * tr.Nm[D.idx].x + (D.z - tr.P[D.idx].z) * tr.Nm[D.idx].z;
  if (a.kind === 'racer' && !M.drag) {
    offT = prof.line[i];
    // «резинка»: отставшие чуть быстрее, лидеры чуть медленнее
    if (!a.done && !RC.done) { const gap = a.p - D.rp; vt *= 1 + clamp(-gap / 300, -.05, .05) * (a.boss ? .5 : 1); }
  }
  if (a.kind === 'racer' && M.drag) { if (RC.t < a.react) vt = 0; }
  if (a.kind === 'cop') {
    if (gapP > 0) { vt = Math.min(vt * (gapP > 60 ? 1.12 : 1), Math.max(D.speed + clamp(gapP * .4, 5, 35), 14)); if (gapP < 45) offT = pOff; }
    else { vt = Math.min(vt, Math.max(D.speed - 5, 6)); offT = pOff; }
    if (!go) vt = 0;
  }
  // объезд: машина впереди в том же ряду
  for (const b of RC.cars) {
    if (b === a || b.elim) continue; const ds = wrapD(b.s - a.s, tr.total);
    if (ds > 0 && ds < 14 && Math.abs(b.off - a.off) < 2.4) {
      if (a.kind === 'civ') vt = Math.min(vt, b.v); else { const side = b.off > 0 ? -1 : 1; offT = clamp(b.off + side * 3.2, -tr.hw + 1.6, tr.hw - 1.6); if (ds < 7) vt = Math.min(vt, b.v + 1); }
    }
  }
  if (a.kind === 'civ' && gapP < 0 && gapP > -14 && Math.abs(pOff - a.off) < 2.4) vt = Math.min(vt, a.v);
  if (a.kind === 'racer' && gapP > 0 && gapP < 12 && Math.abs(pOff - a.off) < 2.4) offT = clamp(pOff + (pOff > 0 ? -3.4 : 3.4), -tr.hw + 1.6, tr.hw - 1.6);
  if (a.spinT > 0) { a.spinT -= dt; vt = 0; }
  a.offT = offT;
  if (a.v < vt) a.v = Math.min(vt, a.v + a.acc * Math.max(.12, 1 - (a.v / a.vmax) ** 2) * dt * (RC.boostT && a.kind === 'racer' ? 1 : 1));
  else a.v = Math.max(vt, a.v - (a.spinT > 0 ? 6 : 9) * dt);
  a.lv *= Math.exp(-3 * dt); a.off += a.lv * dt; a.off = damp(a.off, a.offT, a.kind === 'cop' ? 1.6 : 1.1, dt); a.off = clamp(a.off, -tr.hw + 1.2, tr.hw - 1.2);
  a.s += a.v * dt; a.p += a.v * dt; aiPose(a, dt);
  // трафик: переносим далеко отставшие машины вперёд
  if (a.kind === 'civ' && wrapD(a.s - sP, tr.total) < -120) { a.s = (sP + rand(200, 320)) % tr.total; a.off = a.lane = (Math.random() < .5 ? -1 : 1) * tr.hw * .4; a.spinT = 0; a.v = a.vmax; }
  // круги и финиш
  if (a.kind === 'racer' && !a.done) {
    if (M.drag) { if (a.p >= M.drag) { a.done = true; a.finT = RC.t; } }
    else { const lap = Math.floor(a.p / tr.total); if (lap > a.lap) { a.lap = lap; if (M.ko) koLap(a, lap); } if (a.p >= RC.laps * tr.total && !a.elim) { a.done = true; a.finT = RC.t; } }
    if (M.traps) for (const tp of RC.traps) if (crossed(a.lastI, i, tp.i)) a.trapSum += a.v * 3.6;
  }
  a.lastI = i;
}
function crossed(from, to, k) { if (from === to) return false; const N = D.tr.N, d = ((to - from) % N + N) % N; if (d > N / 2) return false; const e = ((k - from) % N + N) % N; return e > 0 && e <= d; }
function koLap(car, lap) {
  // выбывает последний, кто завершил круг: когда круг завершили все кроме одного
  const racers = [{ p: D.rp, me: true, elim: RC.meOut }, ...RC.cars.filter(c => c.kind === 'racer').map(c => ({ p: c.p, c, elim: c.elim }))].filter(r => !r.elim);
  if (lap >= RC.laps) return; const behind = racers.filter(r => r.p < lap * D.tr.total);
  if (behind.length === 1 && racers.length > 2) { const r = behind[0]; if (r.me) { RC.meOut = true; raceFinish(false); } else { r.c.elim = true; r.c.car.visible = false; UI.toast(`${r.c.name} ${T('koOut')}`); Snd.play('lose'); } }
}

// ---------- столкновения ----------
function circlesOf(x, z, h, d) { const fx = Math.sin(h), fz = Math.cos(h), q = d.L / 3; return [[x + fx * q, z + fz * q], [x, z], [x - fx * q, z - fz * q]]; }
function collideAll(dt) {
  const tr = D.tr, pd = CARS[D.id], pr = pd.W / 2 + .05, pc = circlesOf(D.x, D.z, D.h, pd);
  for (const a of RC.cars) {
    if (a.elim) continue; const dx0 = a.x - D.x, dz0 = a.z - D.z; if (dx0 * dx0 + dz0 * dz0 > 64) continue;
    const ac = circlesOf(a.x, a.z, a.h, a.d), ar = a.d.W / 2 + .05; let best = null;
    for (const p of pc) for (const q of ac) { const dx = p[0] - q[0], dz = p[1] - q[1], dist = Math.hypot(dx, dz), pen = pr + ar - dist; if (pen > 0 && (!best || pen > best.pen)) best = { pen, nx: dx / (dist || 1), nz: dz / (dist || 1) }; }
    if (!best) continue;
    const { pen, nx, nz } = best, mp = D.st.mass, ma = a.mass * (a.kind === 'civ' ? .8 : 1), kP = ma / (mp + ma);
    D.x += nx * pen * kP; D.z += nz * pen * kP;
    const n = tr.Nm[a.idx], t = tr.Tn[a.idx]; a.off -= (nx * n.x + nz * n.z) * pen * (1 - kP); a.s -= (nx * t.x + nz * t.z) * pen * (1 - kP);
    const avx = t.x * a.v + n.x * a.lv, avz = t.z * a.v + n.z * a.lv, vn = (D.vx - avx) * nx + (D.vz - avz) * nz;
    if (vn >= 0) continue;
    const j = -(1.25) * vn / (1 / mp + 1 / ma);
    D.vx += j / mp * nx; D.vz += j / mp * nz; const fx = Math.sin(D.h), fz = Math.cos(D.h), lx = Math.cos(D.h), lz = -Math.sin(D.h); D.u = D.vx * fx + D.vz * fz; D.v = D.vx * lx + D.vz * lz;
    const dvx = -j / ma * nx, dvz = -j / ma * nz; a.v = Math.max(0, a.v + dvx * t.x + dvz * t.z); a.lv += dvx * n.x + dvz * n.z;
    D.r += (Math.random() - .5) * Math.min(1.2, -vn * .08);
    const imp = -vn;
    if (imp > 2) {
      Snd.play('hit', Math.min(1, imp / 14)); D.shake = Math.min(1, imp / 14);
      const cx = D.x - nx * pr, cz = D.z - nz * pr; for (let k = 0; k < 18; k++) emitP(D.sparks, cx, .5, cz, rand(-4, 4) + D.vx * .3, rand(1, 4), rand(-4, 4) + D.vz * .3, rand(.3, .6), rand(.1, .2), -.1, 1, rand(.5, .8), .2);
      if (imp > 5) {
        const clx = -nx * lx - nz * lz, clz = -nx * fx - nz * fz, m = Math.hypot(clx, clz) || 1; dentCar(D.car, clx / m * pd.W / 2, .6, clz / m * pd.L / 2, Math.min(.1, imp * .006)); D.damage = Math.min(100, D.damage + imp * .7);
        if (imp > 9 && a.kind !== 'civ') { a.spinT = 1.4; a.spinDir = Math.random() < .5 ? -1 : 1; }
        if (a.kind === 'civ' && imp > 7) { a.spinT = 1.4; a.spinDir = Math.random() < .5 ? -1 : 1; }
        if (a.kind === 'cop') { a.hp -= imp > 12 ? 2 : 1; RC.heat = Math.min(5, RC.heat + .15); RC.bounty += 250; if (a.hp <= 0 && !a.wreck) { a.wreck = true; a.spinT = 99; RC.wrecked++; RC.bounty += 2500; UI.driftMsg(T('copDown'), true); Snd.play('bank'); } }
        if (a.kind === 'civ' && RC.M.police) RC.bounty += 100;
      }
    }
  }
  // ИИ между собой: простое расталкивание
  for (let x = 0; x < RC.cars.length; x++) for (let y = x + 1; y < RC.cars.length; y++) {
    const a = RC.cars[x], b = RC.cars[y]; if (a.elim || b.elim) continue; const ds = wrapD(b.s - a.s, tr.total), dOff = b.off - a.off;
    if (Math.abs(ds) < (a.d.L + b.d.L) / 2 && Math.abs(dOff) < (a.d.W + b.d.W) / 2) { const push = ((a.d.W + b.d.W) / 2 - Math.abs(dOff)) * .5 * (dOff >= 0 ? 1 : -1); a.off -= push; b.off += push; if (ds > 0) { a.v = Math.min(a.v, b.v); } else { b.v = Math.min(b.v, a.v); } }
  }
}

// ---------- шаг режима ----------
function raceStep(dt) {
  if (!RC.on) return; const tr = D.tr, M = RC.M, go = D.count <= 0;
  if (go && !RC.done) RC.t += dt;
  // прогресс игрока по трассе
  let di = D.idx - RC.lastIdx; if (di > tr.N / 2) di -= tr.N; if (di < -tr.N / 2) di += tr.N;
  if (!RC.done) D.rp += di * RC.seg;
  if (M.traps && go && !RC.done) for (const tp of RC.traps) if (crossed(RC.lastIdx, D.idx, tp.i)) {
    const kmh = D.speed * 3.6; RC.trapSum += kmh; RC.trapLog.push(kmh); tp.flashT = .25; W.flashT = Math.max(W.flashT || 0, .12);
    UI.driftMsg(`${T('trap')} ${Math.round(H.save.settings.units === 'mph' ? kmh / 1.609 : kmh)} ${T(H.save.settings.units === 'mph' ? 'mph' : 'kmh')}`, true); Snd.play('bank');
  }
  RC.lastIdx = D.idx;
  for (const a of RC.cars) aiStep(a, dt);
  collideAll(dt);
  // драг: удержание полосы и ручная коробка
  if (M.drag) {
    const t = tr.Tn[D.idx], th = Math.atan2(t.x, t.z), lane = RC.lanes[1], off = (D.x - tr.P[D.idx].x) * tr.Nm[D.idx].x + (D.z - tr.P[D.idx].z) * tr.Nm[D.idx].z;
    if (Math.abs(Inp.steer) < .2) { D.h = lerpAngle(D.h, th + clamp((lane - off) * .05, -.12, .12), 1 - Math.exp(-4 * dt)); D.r *= Math.exp(-6 * dt); D.v *= Math.exp(-4 * dt); }
    if (Inp.shiftUp) { Inp.shiftUp = false; dragShift(1); } if (Inp.shiftDown) { Inp.shiftDown = false; dragShift(-1); }
    if (RC.wasCount && D.count <= 0) { const r = D.rpm / D.st.redline; if (r > .5 && r < .82) { RC.boostT = 1.2; UI.driftMsg(T('launchPerfect'), true); } else UI.driftMsg(r >= .82 ? T('launchSpin') : T('launchBog'), r >= .82); }
    if (!RC.done && D.rp >= M.drag) { RC.finishT = RC.t; raceFinish(true); }
  }
  RC.wasCount = D.count > 0;
  if (Inp.reset) { Inp.reset = false; if (go && !RC.done) { const i = D.idx; placePlayer(i * RC.seg, M.drag ? RC.lanes[1] : 0); RC.lastIdx = D.idx; D.u = D.v = D.r = 0; D.vx = D.vz = 0; } }
  if (RC.boostT > 0) { RC.boostT -= dt; D.u += dt * 1.6; }
  // круги
  if (!M.drag && !M.police && !RC.done && go) {
    const lap = Math.floor(D.rp / tr.total) + 1;
    if (lap > RC.lap && D.rp > 0) { const lt = RC.t - RC.lapStart; RC.lapStart = RC.t; if (RC.lap >= 1 && lt > 5) { if (!RC.bestLap || lt < RC.bestLap) RC.bestLap = lt; UI.toast(`${T('lap')} ${RC.lap}: ${fmtT(lt)}`); } RC.lap = lap; if (M.ko) koLap(null, lap - 1); if (RC.lap <= RC.laps) Snd.play('bank'); }
    if (D.rp >= RC.laps * tr.total) { RC.finishT = RC.t; raceFinish(true); }
  }
  if (M.police && go && !RC.done) pursuitStep(dt);
  RC.trapFlash(dt);
}
RC.trapFlash = dt => { for (const tp of RC.traps) { if (!tp.flash) continue; tp.flashT = Math.max(0, (tp.flashT || 0) - dt); tp.flash.material.opacity = tp.flashT * 4; } };
function dragShift(dir) {
  if (D.count > 0 || RC.done || D.shiftT > 0) return; const r = D.rpm / D.st.redline, g = D.gear + dir; if (g < 1 || g > 6) return;
  D.gear = g; D.shiftT = .12; Snd.shift();
  if (dir > 0) { if (r > .86 && r < .985) { RC.boostT = .9; UI.driftMsg(T('shiftPerfect'), true); } else if (r >= .985) UI.driftMsg(T('shiftLate'), false); else if (r > .72) UI.driftMsg(T('shiftGood'), true); else UI.driftMsg(T('shiftEarly'), false); }
}
function pursuitStep(dt) {
  const tr = D.tr, sP = D.idx * RC.seg; RC.bounty += dt * 20 * RC.heat; RC.heat = Math.min(5, RC.heat + dt / 45);
  const cops = RC.cars.filter(c => c.kind === 'cop' && !c.wreck); let nearest = 1e9, close = false;
  for (const c of cops) { const g = Math.abs(wrapD(sP - c.s, tr.total)); nearest = Math.min(nearest, g); if (Math.hypot(c.x - D.x, c.z - D.z) < 9) close = true; }
  // «арест»: стоишь рядом с полицией
  if (close && D.speed < 6) RC.bust = Math.min(1, RC.bust + dt / 2.6); else RC.bust = Math.max(0, RC.bust - dt / 1.5);
  if (RC.bust >= 1) { raceFinish(false); return; }
  // уход от погони: далеко от всех патрулей
  if (nearest > 120) RC.evade = Math.min(1, RC.evade + dt / 7); else RC.evade = Math.max(0, RC.evade - dt / 3);
  if (RC.evade >= 1) { raceFinish(true); return; }
  // подкрепление с ростом розыска
  RC.copT -= dt; const want = Math.min(6, 1 + Math.ceil(RC.heat));
  if (RC.copT <= 0 && cops.length < want) { RC.copT = 12 / RC.heat; const ahead = Math.random() < .35 && RC.heat >= 2, s = (sP + (ahead ? 260 : -150) + tr.total) % tr.total, c = addAI('cop', RC.heat >= 3 ? 'vesper' : 'aster', s, rand(-3, 3), { name: T('police') }); c.v = ahead ? 0 : 30; if (ahead) c.roadblock = 4; UI.toast(T(ahead ? 'roadblock' : 'backup')); }
  RC.cars = RC.cars.filter(c => { if (c.kind === 'cop' && c.wreck && Math.abs(wrapD(sP - c.s, tr.total)) > 120) { tr.sc.remove(c.car); disposeTree(c.car); return false; } return true; });
}
function raceFinish(win) {
  if (RC.done) return; RC.done = true; RC.win = win; D.noDrift = true;
  const M = RC.M, tr = D.tr;
  if (!M.police) {
    // оценка времени финиша тех, кто ещё едет
    const total = M.drag ? M.drag : RC.laps * tr.total;
    for (const a of RC.cars) if (a.kind === 'racer' && !a.done && !a.elim) { const left = total - a.p; a.estT = RC.t + Math.max(0, left) / Math.max(8, a.v * .9); }
  }
  endDrive();
}
function raceStanding() {
  const M = RC.M, tr = D.tr; if (!RC.cars) return [];
  const rows = [{ me: true, name: T('you'), car: CARS[D.id].name, p: D.rp, t: RC.done && RC.win !== false ? RC.finishT : null, elim: !!RC.meOut, trap: RC.trapSum }, ...RC.cars.filter(c => c.kind === 'racer').map(c => ({ name: c.name, car: c.d.name, p: c.p, t: c.done ? c.finT : (RC.done ? c.estT : null), elim: c.elim, trap: c.trapSum, boss: c.boss }))];
  if (M.traps && RC.done) return rows.sort((a, b) => b.trap - a.trap);
  return rows.sort((a, b) => (a.elim - b.elim) || ((a.t != null && b.t != null) ? a.t - b.t : a.t != null ? -1 : b.t != null ? 1 : b.p - a.p));
}
function racePos() { const st = raceStanding(); return [st.findIndex(r => r.me) + 1, st.length]; }

// ---------- визуализация ----------
function raceVisual(dt) {
  if (!RC.on) return; const now = performance.now() / 1000;
  for (const a of RC.cars) {
    if (a.elim) continue; const c = a.car, u = a.u; c.position.set(a.x, 0, a.z); c.rotation.y = a.h;
    for (const w of u.wheels) { w.spin.rotation.x += a.v * dt / a.d.R; if (w.front) w.pivot.rotation.y = a.steer; }
    u.body.rotation.z = damp(u.body.rotation.z, clamp(a.steer * a.v * -.004, -.05, .05), 5, dt);
    u.tailMat.emissiveIntensity = a.spinT > 0 || (a.v < a.vmax * .5 && a.kind !== 'civ') ? 3 : .9;
    if (a.lb) { const ph = Math.floor(now * 6) % 2; a.lb[0].g.visible = ph === 0 && !a.wreck; a.lb[1].g.visible = ph === 1 && !a.wreck; }
    if (a.spinT > 0 && a.spinT < 90 && a.v > 3) emitP(D.smoke, a.x, .3, a.z, rand(-1, 1), rand(.5, 1.5), rand(-1, 1), rand(1.2, 2.2), 1, 2, ...D.smokeCol, .45);
    if (a.wreck && Math.random() < dt * 8) emitP(D.smoke, a.x, 1, a.z, rand(-.3, .3), rand(1, 2), rand(-.3, .3), 3, .8, 1.5, .15, .15, .17, .6);
  }
  sirenUpdate();
}
function sirenUpdate() {
  if (!Snd.ctx) return; const cops = RC.cars.filter(c => c.kind === 'cop' && !c.wreck);
  if (!RC.siren && cops.length) { const c = Snd.ctx, o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 950; l.frequency.value = .45; lg.gain.value = 380; l.connect(lg); lg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 2400; g.gain.value = 0; o.connect(f); f.connect(g); g.connect(Snd.master); o.start(); l.start(); RC.siren = { o, l, g }; }
  if (!RC.siren) return; let dmin = 1e9; for (const c of cops) dmin = Math.min(dmin, Math.hypot(c.x - D.x, c.z - D.z));
  RC.siren.g.gain.setTargetAtTime(H.state === 'DRIVE' && D.on ? clamp(1 - dmin / 160, 0, 1) * .05 : 0, Snd.ctx.currentTime, .1);
}
function raceStop() {
  if (!RC.on) return; if (RC.siren) { try { RC.siren.o.stop(); RC.siren.l.stop(); } catch (e) { /* ok */ } RC.siren = null; }
  RC.on = false; RC.cars = []; D.noDrift = false; D.manual = false;
}
function raceMini(g, m) {
  if (!RC.on) return;
  for (const a of RC.cars) { if (a.elim || (a.kind === 'civ')) continue; const x = m.ox + (a.x - m.x0) * m.sc, y = m.oz + (a.z - m.z0) * m.sc; g.fillStyle = a.kind === 'cop' ? (Math.floor(performance.now() / 160) % 2 ? '#ff2a3a' : '#2a6aff') : a.boss ? '#ffd700' : '#ffffff'; g.beginPath(); g.arc(x, y, a.kind === 'cop' ? 5 : 4, 0, TAU); g.fill(); }
}
function raceHud() {
  const M = RC.M, el = document.getElementById('hRace');
  const lab = document.getElementById('hScoreL'), big = document.getElementById('hScore'), sub = document.getElementById('hBest');
  if (M.police) {
    lab.textContent = T('bounty'); big.textContent = '$ ' + fmt(Math.round(RC.bounty)); sub.textContent = '★'.repeat(Math.ceil(RC.heat)) + '☆'.repeat(5 - Math.ceil(RC.heat));
    el.innerHTML = `<div class="rb"><span>${esc(T('bust'))}</span><div class="bar"><i style="width:${RC.bust * 100}%;background:var(--bad)"></i></div></div><div class="rb"><span>${esc(T('evade'))}</span><div class="bar"><i style="width:${RC.evade * 100}%;background:var(--good)"></i></div></div>`;
    document.getElementById('hTimer').textContent = fmtT(RC.t); return;
  }
  const [pos, n] = racePos(); lab.textContent = T('pos'); big.textContent = `${pos}/${n}`;
  sub.textContent = M.drag ? `${Math.max(0, Math.round(M.drag - D.rp))} м` : M.traps ? `${T('trapSum')}: ${fmt(Math.round(RC.trapSum))}` : `${T('lap')} ${Math.min(RC.lap, RC.laps)}/${RC.laps}`;
  document.getElementById('hTimer').textContent = D.count > 0 ? Math.ceil(D.count) : fmtT(RC.t);
  const r = D.rpm / D.st.redline;
  el.innerHTML = M.drag ? `<div class="shiftL ${r > .86 ? (r > .985 ? 'late' : 'on') : ''}">${esc(T('shift'))} ▲</div>` : '';
}
