// ==== 8. POOLS & SPATIAL HASH ====
class Pool {
  constructor(n, factory) { this.items = []; this.free = []; this.n = 0; for (let i = 0; i < n; i++) { const o = factory(); o.active = false; o.idx = i; this.items.push(o); this.free.push(n - 1 - i); } }
  get() { if (!this.free.length) return null; const o = this.items[this.free.pop()]; o.active = true; this.n++; return o; }
  release(o) { if (!o.active) return; o.active = false; this.free.push(o.idx); this.n--; }
  clear() { for (const o of this.items) if (o.active) this.release(o); }
}
const P = CONFIG.POOL;
const Enemies = new Pool(P.enemies, () => ({ id: '', x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, kx: 0, ky: 0, hp: 1, maxHp: 1, r: 10, spd: 0, dmg: 0, xp: 1, def: null,
  flashT: 0, frozenT: 0, slowT: 0, stunT: 0, blindT: 0, burnT: 0, burnD: 0, poisonTick: 0, t: 0, phase: 0, st: 0, stT: 0, dx: 0, dy: 0, elite: false, boss: false, big: false, scale: 1,
  under: false, split: false, hitBy: 0, march: false, anim: 0, bossData: null }));
const Projs = new Pool(P.proj, () => ({ kind: '', w: null, x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 0, pierce: 0, life: 0, max: 0, a: 0, ang: 0, rad: 0, tx: 0, ty: 0, sx: 0, sy: 0, target: null, ret: false, hits: new Map(), n: 0 }));
const Zones = new Pool(P.zones, () => ({ kind: '', w: null, x: 0, y: 0, r: 0, r0: 0, life: 0, max: 0, tick: .5, tickT: 0, dmg: 0, delay: 0, slow: 0, heal: false, follow: false, grow: 0, n: 0, done: false }));
const FX = new Pool(P.fx, () => ({ kind: '', x: 0, y: 0, a: 0, r: 0, life: 0, max: 0, col: '', pts: null, x2: 0, y2: 0 }));
const Embers = new Pool(P.embers, () => ({ x: 0, y: 0, v: 1, tier: 0, mag: false, vx: 0, vy: 0, sp: 0 }));
const Texts = new Pool(P.texts, () => ({ x: 0, y: 0, life: 0, text: '', col: '', size: 14 }));
const Hazards = new Pool(P.hazards, () => ({ kind: '', x: 0, y: 0, r: 0, tele: 0, tmax: 0, dmg: 0, life: 0, fired: false }));
const Bullets = new Pool(P.bullets, () => ({ kind: '', x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 0, life: 0, ax: 0, ay: 0 }));
const Items = new Pool(120, () => ({ kind: '', x: 0, y: 0, t: 0, v: 0 }));
const ALL_POOLS = [Enemies, Projs, Zones, FX, Embers, Texts, Hazards, Bullets, Items];

// Частицы — структура массивов
const Parts = { n: P.parts, x: new Float32Array(P.parts), y: new Float32Array(P.parts), vx: new Float32Array(P.parts), vy: new Float32Array(P.parts),
  life: new Float32Array(P.parts), max: new Float32Array(P.parts), size: new Float32Array(P.parts), col: new Uint8Array(P.parts), grav: new Float32Array(P.parts),
  free: new Int32Array(P.parts), top: 0, alive: 0 };
for (let i = 0; i < P.parts; i++) Parts.free[Parts.top++] = P.parts - 1 - i;
const PCOL = ['#ff7a1a', '#ffd27a', '#b3261e', '#6ae07a', '#6ab8ff', '#c08aff', '#e8dcc4', '#5a524a', '#9affe0', '#ff3a3a', '#ffffff', '#3a2a4a'];
function emit(x, y, n, col, spd = 120, life = .5, size = 3, grav = 0) {
  n = Math.ceil(n * Render.partMul);
  for (let k = 0; k < n && Parts.top > 0; k++) {
    const i = Parts.free[--Parts.top], a = Math.random() * TAU, s = spd * (.3 + Math.random() * .7);
    Parts.x[i] = x; Parts.y[i] = y; Parts.vx[i] = Math.cos(a) * s; Parts.vy[i] = Math.sin(a) * s; Parts.life[i] = life * (.6 + Math.random() * .4); Parts.max[i] = Parts.life[i];
    Parts.size[i] = size * (.6 + Math.random() * .8); Parts.col[i] = col; Parts.grav[i] = grav; Parts.alive++;
  }
}
function updateParts(dt) {
  for (let i = 0; i < Parts.n; i++) {
    if (Parts.life[i] <= 0) continue;
    Parts.life[i] -= dt;
    if (Parts.life[i] <= 0) { Parts.free[Parts.top++] = i; Parts.alive--; continue; }
    Parts.vx[i] *= .96; Parts.vy[i] = Parts.vy[i] * .96 + Parts.grav[i] * dt; Parts.x[i] += Parts.vx[i] * dt; Parts.y[i] += Parts.vy[i] * dt;
  }
}
function clearParts() { Parts.top = 0; for (let i = 0; i < Parts.n; i++) { Parts.life[i] = 0; Parts.free[Parts.top++] = Parts.n - 1 - i; } Parts.alive = 0; }

const Grid = {
  N: CONFIG.GRID_N, C: CONFIG.GRID_CELL, ox: 0, oy: 0, head: new Int32Array(CONFIG.GRID_N * CONFIG.GRID_N), next: new Int32Array(P.enemies),
  build(px, py) {
    const N = Grid.N, C = Grid.C; Grid.ox = px - N * C / 2; Grid.oy = py - N * C / 2; Grid.head.fill(-1);
    for (const e of Enemies.items) {
      if (!e.active || e.big || e.under) continue;
      const cx = ((e.x - Grid.ox) / C) | 0, cy = ((e.y - Grid.oy) / C) | 0;
      if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue;
      const c = cy * N + cx; Grid.next[e.idx] = Grid.head[c]; Grid.head[c] = e.idx;
    }
  },
  query(x, y, r, out) {
    out.length = 0; const N = Grid.N, C = Grid.C, rr = r + 30;
    const x0 = Math.max(0, ((x - rr - Grid.ox) / C) | 0), x1 = Math.min(N - 1, ((x + rr - Grid.ox) / C) | 0);
    const y0 = Math.max(0, ((y - rr - Grid.oy) / C) | 0), y1 = Math.min(N - 1, ((y + rr - Grid.oy) / C) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      for (let i = Grid.head[cy * N + cx]; i !== -1; i = Grid.next[i]) { const e = Enemies.items[i]; const R = r + e.r; if (dist2(x, y, e.x, e.y) < R * R) out.push(e); }
    }
    const run = Game.run; if (run) for (const e of run.bigs) { if (e.active && !e.under) { const R = r + e.r; if (dist2(x, y, e.x, e.y) < R * R) out.push(e); } }
    return out;
  },
};
const QA = [], QB = [], QC = [], QD = [], QE = [];

// ==== 10. GAME SYSTEMS ====
const Sys = {};

Sys.newRun = function (opts) {
  const s = Game.save;
  ALL_POOLS.forEach(p => p.clear()); clearParts();
  const ch = CHAR[opts.char], diff = CONFIG.DIFFICULTY[opts.diff];
  const seed = opts.seed || ((Math.random() * 2 ** 31) | 0);
  const run = Game.run = {
    char: opts.char, biome: opts.biome, diff: opts.diff, curses: opts.curses || [], daily: !!opts.daily, seed, rng: mulberry32(seed),
    t: 0, kills: 0, level: 1, xp: 0, xpNeed: CONFIG.xpNeed(1), ash: 0, endless: false, endlessStart: 0, over: false,
    weapons: [], passives: [], banished: new Set(), pendingLv: 0, chests: 0, chestEvo: 0,
    rerolls: s.meta.reroll || 0, skips: s.meta.skip || 0, banishes: s.meta.banish || 0,
    bigs: [], bossIdx: 0, nextElite: CONFIG.ELITE_EVERY, events: {}, bloodMoonT: 0, blackoutT: 0, eclipseT: 0, eclipseFx: 0,
    spawnT: 0, shake: 0, hitstop: 0, slow: 0, slowT: 0, dyingT: 0, dawnT: 0, emberCombo: 0, emberComboT: 0, bigEmber: null,
    lampsBroken: new Set(), chunks: new Map(), camX: 0, camY: 0, tutorialStep: s.tutorial ? 99 : 0, tutT: 0,
    skin: (s.skinSel || {})[opts.char] || 0, diffMul: diff, cur: Object.fromEntries((opts.curses || []).map(c => [c, true])),
    st: { stillTime: 0, moved: false, whisperTime: 0, minLightAfter1: 1, lastHit: 0, bestNoHit: 0, totalDmg: 0, ghost: false, graveKey: '', graveT: 0, flashes: 0, lamps: 0, embers: 0, bosses: {} },
    player: { x: 0, y: 0, px: 0, py: 0, hp: 100, fx: 1, fy: 0, face: 0, iframes: 0, flashCd: 0, invertT: 0, slowT: 0, hurtT: 0, anim: 0, light: CONFIG.LIGHT_MAX, lightMax: CONFIG.LIGHT_MAX, stats: null, revivals: 0, dropT: 0, regenAcc: 0 },
  };
  Sys.recalc(true);
  run.player.revivals = run.player.stats.revival;
  if (ch.noLight) run.player.light = 0;
  Sys.addWeapon(ch.weapon);
  if (opts.restore) Sys.restore(opts.restore);
  Music.set('run', run.biome); Music.intensity = 0; Music.boss = false;
  return run;
};

// Пересчёт характеристик: персонаж → алтарь → предметы → проклятия
Sys.recalc = function (init) {
  const run = Game.run, s = Game.save, ch = CHAR[run.char], st = Object.assign({}, BASE_STATS);
  for (const k in ch.mod) { if (k === 'maxHp' || k === 'speed' || k === 'might' || k === 'growth') st[k] *= ch.mod[k]; else if (k === 'dodge') st[k] += ch.mod[k]; else st[k] = ch.mod[k]; }
  for (const m of META) { const l = s.meta[m.id] || 0; if (l) m.apply(st, l); }
  for (const p of run.passives) PASSIVE[p.id].apply(st, p.lv);
  if (ch.armorPer10) st.armor += Math.floor(run.level / 10);
  if (run.cur.fragile) st.maxHp *= .7;
  if (run.cur.noregen) st.regen = 0;
  const pl = run.player, ratio = pl.stats ? pl.hp / pl.stats.maxHp : 1;
  pl.stats = st; pl.lightMax = CONFIG.LIGHT_MAX * st.light;
  pl.hp = init ? st.maxHp : Math.min(st.maxHp, ratio * st.maxHp);
  for (const w of run.weapons) Sys.weaponStats(w);
};

Sys.weaponStats = function (w) {
  const d = WEAPON[w.id], st = Game.run.player.stats;
  const b = { dmg: d.base.dmg, cd: d.base.cd, area: d.base.area || 1, amount: d.base.amount || 1, speed: d.base.speed || 1, pierce: d.base.pierce || 0,
    dur: d.base.dur || 0, chain: d.base.chain || 0, freeze: d.base.freeze || 0, burn: 0 };
  for (let i = 0; i < w.lv - 1; i++) { const L = d.lv[i]; for (const k in L) { if (k === 'cd') b.cd *= 1 + L[k]; else b[k] += L[k]; } }
  if (b.pierce) b.pierce += st.pierce;
  b.dmg *= st.might; b.cd *= st.cooldown; b.area *= st.area; b.speed *= st.projSpeed; b.dur *= st.duration; b.amount += st.amount; b.freeze += st.freeze;
  if (w.id === 'poison' || w.id === 'flask') b.dmg *= st.poison;
  if (w.evo) {
    const E = { blade: { dmg: 2.2, area: 1.25 }, shovel: { dmg: 1.4 }, poison: { dmg: 1.5, dur: 1.5, area: 1.3 }, hammer: { dmg: 1.3 }, daggers: { dmg: 1.2 },
      flask: { dmg: 1.5 }, censer: { dmg: 1.5 }, lightning: { dmg: 1.5 }, arrows: { dmg: 1.4 }, rune: { dmg: 1.5, cd: .7 }, ice: { dmg: 1.5 }, black: { dmg: 1.5 }, crossbow: { dmg: 1.3 }, bell: { dmg: 1.4, area: 1.2 }, sickles: { dmg: 1.4 }, wisps: { dmg: 1.2 }, meteor: { dmg: 1.3 }, whip: { dmg: 1.6, area: 1.4 } }[w.id];
    for (const k in E) b[k] *= E[k];
    if (w.id === 'daggers') b.cd = .11 * st.cooldown;
    if (w.id === 'lightning') b.chain = 10;
    if (w.id === 'censer') b.amount += 3;
    if (w.id === 'meteor') b.amount += 3;
    if (w.id === 'sickles') b.amount += 2;
  }
  w.s = b;
  if (w.id === 'censer' || (w.id === 'shovel' && w.evo) || (w.id === 'arrows' && w.evo)) Weapons.resetOrbiters(w);
  return b;
};

Sys.addWeapon = function (id) {
  const run = Game.run; const w = { id, lv: 1, evo: false, t: .3, dmg: 0, kills: 0, orbs: [], x: {} };
  run.weapons.push(w); Game.save.codex.w[id] = 1; Sys.weaponStats(w);
  const u = Game.save.stats.weaponUse; u[id] = (u[id] || 0) + 1;
  return w;
};
Sys.addPassive = function (id) { const run = Game.run; run.passives.push({ id, lv: 1 }); Game.save.codex.p[id] = 1; Sys.recalc(); };

Sys.evolve = function (w) {
  w.evo = true; Game.save.codex.evo[w.id] = 1; Sys.weaponStats(w);
  Audio.play('evolve'); Render.flashScreen('#ffd27a', .6); Game.run.shake = 12;
  UI.toast(L('evolution') + ' ' + S().w[w.id][3]);
};

Sys.evolvable = function () {
  const run = Game.run;
  return run.weapons.filter(w => !w.evo && w.lv >= CONFIG.WEAPON_MAX_LV && run.passives.some(p => p.id === WEAPON[w.id].evoP));
};

// Варианты улучшений при повышении уровня
Sys.upgradePool = function () {
  const run = Game.run, s = Game.save, out = [], ownW = new Set(run.weapons.map(w => w.id)), ownP = new Set(run.passives.map(p => p.id));
  for (const w of run.weapons) if (!w.evo && w.lv < CONFIG.WEAPON_MAX_LV) out.push({ t: 'w', id: w.id, lv: w.lv + 1, w: 1.25 });
  if (run.weapons.length < CONFIG.MAX_WEAPONS) for (const d of WEAPONS) {
    if (ownW.has(d.id) || run.banished.has(d.id)) continue;
    if (d.secret && run.char !== 'hollow' && !s.stats.winsByChar.hollow) continue;
    out.push({ t: 'w', id: d.id, lv: 1, w: 1 });
  }
  for (const p of run.passives) { const max = PASSIVE[p.id].max || CONFIG.PASSIVE_MAX_LV; if (p.lv < max) out.push({ t: 'p', id: p.id, lv: p.lv + 1, w: 1 }); }
  if (run.passives.length < CONFIG.MAX_PASSIVES) for (const d of PASSIVES) {
    if (ownP.has(d.id) || run.banished.has(d.id) || d.secret) continue;
    out.push({ t: 'p', id: d.id, lv: 1, w: .9 });
  }
  return out;
};
Sys.makeChoices = function () {
  const run = Game.run, pool = Sys.upgradePool(), st = run.player.stats;
  let n = run.cur.fewchoice ? 2 : 3; if (!run.cur.fewchoice && Math.random() < .1 + (st.luck - 1) * .6) n = 4;
  const res = [];
  while (res.length < n && pool.length) { const c = weightedPick(pool); res.push(c); pool.splice(pool.indexOf(c), 1); }
  if (!res.length) { res.push({ t: 'gold', id: 'gold', lv: 0 }, { t: 'chicken', id: 'chicken', lv: 0 }); }
  for (const c of res) c.rar = c.t === 'gold' || c.t === 'chicken' ? 'common' : c.lv === 1 ? (Math.random() < .25 * st.luck ? 'rare' : 'common') : c.lv >= 7 ? 'epic' : c.lv >= 4 ? 'rare' : 'common';
  return res;
};
Sys.applyChoice = function (c) {
  const run = Game.run;
  if (c.t === 'w') { const w = run.weapons.find(x => x.id === c.id); if (w) { w.lv++; Sys.weaponStats(w); } else Sys.addWeapon(c.id); }
  else if (c.t === 'p') { const p = run.passives.find(x => x.id === c.id); if (p) { p.lv++; Sys.recalc(); } else Sys.addPassive(c.id); }
  else if (c.t === 'gold') run.ash += 25;
  else if (c.t === 'chicken') Sys.heal(30);
};
// Сундук: эволюция, если доступна, иначе 1–3 улучшения
Sys.openChest = function (fromBoss) {
  const run = Game.run, res = [];
  if (fromBoss === 'shepherd' && run.diff === 'nightmare' && !run.passives.some(p => p.id === 'abyssheart') && run.passives.length < CONFIG.MAX_PASSIVES) {
    Sys.addPassive('abyssheart'); res.push({ t: 'p', id: 'abyssheart', lv: 1 });
  }
  const evo = Sys.evolvable();
  if (evo.length) { const w = evo[0]; Sys.evolve(w); res.push({ t: 'evo', id: w.id }); return res; }
  const st = run.player.stats; let n = 1 + (Math.random() < .3 * st.luck ? 1 : 0) + (Math.random() < .12 * st.luck ? 1 : 0);
  if (fromBoss) n = Math.max(n, 3);
  for (let i = 0; i < n; i++) {
    const pool = Sys.upgradePool().filter(c => c.lv > 1); const c = pool.length ? weightedPick(pool) : null;
    if (c) { Sys.applyChoice(c); res.push(c); } else { run.ash += 25; res.push({ t: 'gold', id: 'gold' }); }
  }
  return res;
};

Sys.heal = function (n) { const p = Game.run.player; p.hp = Math.min(p.stats.maxHp, p.hp + n); };

Sys.hurtPlayer = function (dmg, src) {
  const run = Game.run, p = run.player, st = p.stats;
  if (p.iframes > 0 || run.dyingT > 0 || run.dawnT > 0) return;
  if (st.dodge && Math.random() < st.dodge) { Sys.text(p.x, p.y - 24, Game.lang === 'ru' ? 'уворот' : 'dodge', '#b9ab92', 12); p.iframes = .25; return; }
  const scale = 1 + CONFIG.ENEMY_DMG_PER_MIN * Math.min(run.t, 1800) / 60;
  const d = Math.max(1, dmg * run.diffMul.dmg * scale - st.armor);
  p.hp -= d; p.iframes = CONFIG.PLAYER_IFRAMES; p.hurtT = .25; run.shake = Math.max(run.shake, 6);
  const noHit = run.t - run.st.lastHit; if (noHit > run.st.bestNoHit) run.st.bestNoHit = noHit; run.st.lastHit = run.t;
  Audio.play('hurt'); UI.vibrate(35); emit(p.x, p.y, 6, 2, 140, .4, 3);
  if (p.hp <= 0) Sys.playerDown();
};
Sys.playerDown = function () {
  const run = Game.run, p = run.player;
  if (p.revivals > 0) {
    p.revivals--; p.hp = p.stats.maxHp * .5; p.iframes = 2.5; UI.toast(L('revive')); Audio.play('evolve');
    Sys.flash(true); Render.flashScreen('#ffb14a', .8); return;
  }
  p.hp = 0; run.dyingT = 1.6; run.slow = .25; run.slowT = 1.6; Audio.play('death'); Music.set('silent'); UI.vibrate([60, 40, 120]);
  emit(p.x, p.y, 40, 0, 220, 1.2, 4, -40);
};

Sys.text = function (x, y, text, col, size = 14) {
  const t = Texts.get(); if (!t) return; t.x = x + rand(-6, 6); t.y = y; t.life = .7; t.text = text; t.col = col; t.size = size;
};

// ---------- урон по врагам ----------
Sys.damage = function (e, amt, w, sx, sy, kb = 0, opts) {
  if (!e.active || e.hp <= 0 || e.under) return 0;
  const run = Game.run, p = run.player, st = p.stats;
  let crit = false;
  if (Math.random() < CONFIG.CRIT_BASE * st.luck + st.crit) { amt *= CONFIG.CRIT_MULT; crit = true; if (w && w.id === 'sickles' && w.evo) Sys.heal(.5); }
  if (st.bossDmg && (e.elite || e.boss)) amt *= 1 + st.bossDmg;
  if (!CHAR[run.char].noLight) amt *= 1 + CONFIG.LIGHT_DMG_BONUS * (p.light / p.lightMax);
  const def = e.def;
  if ((def.beh === 'shield') && !e.elite) { const fx = p.x - e.x, fy = p.y - e.y, sxv = sx - e.x, syv = sy - e.y, l1 = Math.hypot(fx, fy) || 1, l2 = Math.hypot(sxv, syv) || 1; if ((fx * sxv + fy * syv) / (l1 * l2) > .45) amt *= .5; }
  if (def.armor) amt = Math.max(1, amt - def.armor);
  if (e.frozenT > 0 && run.weapons.some(x => x.id === 'ice' && x.evo)) { amt *= 2; if (!e.boss && e.hp - amt < e.maxHp * .15) amt = e.hp; }
  if (opts === 'execute' && !e.boss && e.hp < e.maxHp * .05) amt = e.hp;
  e.hp -= amt; e.flashT = .08;
  if (kb && !e.boss) { const dx = e.x - sx, dy = e.y - sy, l = Math.hypot(dx, dy) || 1, k = kb / (e.elite ? 3 : 1); e.kx += dx / l * k; e.ky += dy / l * k; }
  if (w) w.dmg += amt; run.st.totalDmg += amt;
  if (st.lifesteal) Sys.heal(amt * st.lifesteal);
  if (Game.save.settings.dmgNums && (crit || amt >= 8 || Math.random() < .35)) Sys.text(e.x, e.y - e.r, Math.round(amt), crit ? '#ffd27a' : '#e8dcc4', crit ? 18 : 13);
  if (e.hp <= 0) Sys.kill(e, w);
  return amt;
};

Sys.kill = function (e, w) {
  const run = Game.run, def = e.def, s = Game.save;
  run.kills++; if (w) w.kills++; s.codex.e[e.id] = 1;
  const xpMul = run.bloodMoonT > 0 ? 2 : 1;
  if (!e.boss) Sys.dropEmber(e.x, e.y, e.xp * xpMul * (e.elite ? 6 : 1));
  const col = { ghoul: 3, bat: 11, skeleton: 6, drowned: 8, shade: 5, gargoyle: 7, cultist: 2, spider: 2, spiderling: 2, knight: 7, eater: 5, banshee: 6, imp: 0, golem: 7, voideye: 5, wisp: 5, chorister: 8, stained: 1, worm: 2, wraith: 8 }[e.id] ?? 6;
  emit(e.x, e.y, e.big ? 26 : 6, col, 120, .45, 3);
  if (Math.random() < .5) Audio.play('kill');
  // особые выпадения
  const r = Math.random();
  if (r < .004) Sys.item('chicken', e.x, e.y); else if (r < .0055) Sys.item('magnet', e.x, e.y); else if (r < .016) Sys.item('ash', e.x, e.y);
  if (def.beh === 'brood') { const kid = e.id === 'golem' ? 'imp' : 'spiderling', n = e.id === 'golem' ? 3 : 6; for (let i = 0; i < n; i++) { const a = i / n * TAU; Sys.spawnEnemy(kid, e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18); } }
  if (def.beh === 'bonebrood') for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; Sys.spawnEnemy('skeleton', e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24); }
  if (def.beh === 'explode') Sys.hazard('explode', e.x, e.y, 58, .35, 14);
  if (e.elite) { Sys.item('chest', e.x, e.y); run.shake = 10; run.hitstop = .05; Audio.play('explode'); }
  if (run.weapons.some(x => x.id === 'censer' && x.evo) && run.kills % 100 === 0) { Sys.heal(1); Sys.text(run.player.x, run.player.y - 30, '+1', '#6ae07a', 14); }
  if (e.boss) Bosses.onDeath(e);
  Enemies.release(e);
  if (e.big) { const i = run.bigs.indexOf(e); if (i >= 0) run.bigs.splice(i, 1); }
};

Sys.dropEmber = function (x, y, v) {
  const run = Game.run;
  if (Embers.n > CONFIG.EMBER_MERGE_AT) {
    if (!run.bigEmber || !run.bigEmber.active) { run.bigEmber = null; for (const m of Embers.items) if (m.active && !m.mag && dist2(m.x, m.y, run.player.x, run.player.y) > 250000) { run.bigEmber = m; break; } }
    if (run.bigEmber) { run.bigEmber.v += v; run.bigEmber.tier = Sys.emberTier(run.bigEmber.v); return; }
  }
  const m = Embers.get(); if (!m) return;
  m.x = x + rand(-6, 6); m.y = y + rand(-6, 6); m.v = v; m.tier = Sys.emberTier(v); m.mag = false; m.vx = m.vy = 0; m.sp = 0;
};
Sys.emberTier = v => v >= 100 ? 3 : v >= 25 ? 2 : v >= 5 ? 1 : 0;

Sys.item = function (kind, x, y) { const it = Items.get(); if (!it) return; it.kind = kind; it.x = x; it.y = y; it.t = 0; it.v = 0; return it; };

Sys.hazard = function (kind, x, y, r, tele, dmg, life = .25) {
  const h = Hazards.get(); if (!h) return; h.kind = kind; h.x = x; h.y = y; h.r = r; h.tele = tele; h.tmax = tele; h.dmg = dmg; h.life = life; h.fired = false; return h;
};
Sys.bullet = function (kind, x, y, vx, vy, dmg, r = 7, life = 6) {
  const b = Bullets.get(); if (!b) return; b.kind = kind; b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.dmg = dmg; b.r = r; b.life = life; b.ax = 0; b.ay = 0; return b;
};
Sys.fx = function (kind, x, y, r, life, col, a = 0) { const f = FX.get(); if (!f) return null; f.kind = kind; f.x = x; f.y = y; f.r = r; f.life = life; f.max = life; f.col = col; f.a = a; f.pts = null; return f; };

// ---------- враги ----------
Sys.spawnEnemy = function (id, x, y, opt) {
  const run = Game.run, def = ENEMY[id], e = Enemies.get(); if (!e) return null;
  const min = Math.min(run.t, 1800) / 60, endless = run.endless ? 1 + .3 * (run.t - CONFIG.DAWN) / 60 : 1;
  const hpMul = (1 + CONFIG.ENEMY_HP_PER_MIN * min) * run.diffMul.hp * (run.cur.iron ? 1.4 : 1) * endless;
  e.id = id; e.def = def; e.x = e.px = x; e.y = e.py = y; e.vx = e.vy = e.kx = e.ky = 0; e.r = def.r; e.scale = 1;
  e.maxHp = e.hp = def.hp * hpMul; e.spd = def.spd * run.diffMul.spd * (run.cur.fury ? 1.15 : 1) * (BIOME[run.biome].enemySpd || 1) * rand(.92, 1.08); e.dmg = def.dmg; e.xp = def.xp;
  e.flashT = e.frozenT = e.slowT = e.stunT = e.blindT = e.burnT = e.burnD = 0; e.t = rand(0, 3); e.phase = rand(0, TAU); e.st = 0; e.stT = rand(1.5, 3.5);
  e.elite = false; e.boss = false; e.big = false; e.under = def.beh === 'burrow'; e.split = false; e.march = false; e.anim = rand(0, 1); e.bossData = null;
  if (opt === 'elite') { e.elite = true; e.big = true; e.r *= 1.6; e.scale = 1.6; e.maxHp = e.hp = e.maxHp * 12; e.spd *= .9; e.dmg *= 1.5; e.under = false; run.bigs.push(e); }
  return e;
};

Sys.spawnPos = function (out) {
  const run = Game.run, p = run.player, R = Math.hypot(Game.vw, Game.vh) / 2 * CONFIG.SPAWN_RING;
  let a = Math.random() * TAU;
  if (Input.moving && Math.random() < .55) a = Math.atan2(p.fy, p.fx) + rand(-1.1, 1.1);
  out.x = p.x + Math.cos(a) * R; out.y = p.y + Math.sin(a) * R; return out;
};
const SP = { x: 0, y: 0 };

const Director = {
  update(dt) {
    const run = Game.run, p = run.player, t = run.t;
    const lightRatio = CHAR[run.char].noLight ? .5 : p.light / p.lightMax;
    let target = CONFIG.target(Math.min(t, 900)) * (1 + CONFIG.LIGHT_SPAWN_BONUS * lightRatio) * (run.cur.swarm ? 1.3 : 1);
    if (run.endless) target *= 1 + (t - CONFIG.DAWN) / 300;
    target = Math.min(target, CONFIG.POOL.enemies - 60);
    run.spawnT -= dt;
    const alive = Enemies.n - run.bigs.length;
    if (alive < target && run.spawnT <= 0) {
      const n = Math.min(Math.ceil((target - alive) / 8), 8);
      const pool = ENEMIES.filter(e => e.w > 0 && t >= e.from && (!e.bio || e.bio.includes(run.biome)));
      for (let i = 0; i < n; i++) {
        const d = weightedPick(pool.map(e => ({ e, w: e.w * (e.until && t > e.until ? .3 : 1) }))).e;
        Sys.spawnPos(SP); Sys.spawnEnemy(d.id, SP.x, SP.y);
      }
      run.spawnT = .12;
    }
    // элиты
    if (t >= run.nextElite && !run.endless) {
      run.nextElite += CONFIG.ELITE_EVERY; if (CONFIG.BOSS_TIMES.includes(run.nextElite)) run.nextElite += 60;
      const pool = ENEMIES.filter(e => e.w > 0 && t >= e.from && (!e.bio || e.bio.includes(run.biome)) && e.beh !== 'burrow');
      const d = pool.sort((a, b) => b.hp - a.hp)[Math.min(2, pool.length - 1)];
      for (let i = 0; i < (run.cur.elites ? 2 : 1); i++) { Sys.spawnPos(SP); Sys.spawnEnemy(d.id, SP.x, SP.y, 'elite'); }
      UI.toast(L('eliteIncoming')); Audio.play('warn');
    }
    if (run.endless && t >= run.nextElite) { run.nextElite = t + 60; Sys.spawnPos(SP); Sys.spawnEnemy(pick(['knight', 'eater', 'gargoyle']), SP.x, SP.y, 'elite'); }
    // боссы
    if (run.bossIdx < CONFIG.BOSS_TIMES.length && t >= CONFIG.BOSS_TIMES[run.bossIdx] && !run.endless) {
      Bosses.spawn(['rotmother', 'bishop', 'shepherd'][run.bossIdx]); run.bossIdx++;
    }
    // события
    const ev = run.events;
    for (const et of [150, 450, 780]) if (t >= et && !ev['swarm' + et]) { ev['swarm' + et] = 1; Director.swarm(); }
    for (const et of [400, 700]) if (t >= et && !ev['proc' + et]) { ev['proc' + et] = 1; Director.procession(); }
    if (t >= 510 && !ev.blood) { ev.blood = 1; run.bloodMoonT = run.biome === 'forest' ? 90 : 60; UI.toast(L('bloodMoon')); Audio.play('roar'); }
    if (run.bloodMoonT > 0) run.bloodMoonT -= dt;
    Music.intensity = t < 120 ? 0 : t < 300 ? 1 : t < 600 ? 2 : 3;
  },
  swarm() {
    const run = Game.run, p = run.player, n = 36;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, e = Sys.spawnEnemy('bat', p.x + Math.cos(a) * 470, p.y + Math.sin(a) * 470); if (e) { e.maxHp = e.hp = e.hp * 1.5; } }
    UI.toast(L('swarm'));
  },
  procession() {
    const run = Game.run, p = run.player, a = rand(0, TAU), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    for (let i = 0; i < 26; i++) {
      const off = (i - 13) * 34, e = Sys.spawnEnemy('skeleton', p.x - dx * 560 + nx * off, p.y - dy * 560 + ny * off);
      if (e) { e.march = true; e.dx = dx; e.dy = dy; e.stT = 16; }
    }
    UI.toast(L('procession'));
  },
};

const Enemy = {
  update(dt) {
    const run = Game.run, p = run.player, lightR = Render.lightRadius(), leash = Math.hypot(Game.vw, Game.vh) / 2 * CONFIG.LEASH;
    const hollowStealth = CHAR[run.char].noLight;
    for (const e of Enemies.items) {
      if (!e.active) continue;
      e.px = e.x; e.py = e.y; e.t += dt; e.anim += dt;
      if (e.flashT > 0) e.flashT -= dt;
      if (e.burnT > 0) { e.burnT -= dt; e.poisonTick -= dt; if (e.poisonTick <= 0) { e.poisonTick = .5; Sys.damage(e, e.burnD * .5, null, e.x, e.y); if (!e.active) continue; } }
      let dx = p.x - e.x, dy = p.y - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (e.boss) { Bosses.update(e, dt, dx, dy, d); continue; }
      if (d > leash && !e.boss && !e.march) { Sys.spawnPos(SP); e.x = e.px = SP.x; e.y = e.py = SP.y; continue; }
      let sp = e.spd * (run.bloodMoonT > 0 ? 1.2 : 1);
      if (e.slowT > 0) { e.slowT -= dt; sp *= .55; }
      if (e.frozenT > 0) { e.frozenT -= dt; sp = 0; }
      if (e.stunT > 0) { e.stunT -= dt; sp = 0; }
      if (hollowStealth && d > 300 && !e.boss) sp *= .45; // Погасшего не видно издалека
      let mx = dx, my = dy;
      if (e.blindT > 0) { e.blindT -= dt; mx = -dx; my = -dy; sp *= .8; }
      else if (!e.boss) {
        switch (e.def.beh) {
          case 'zigzag': { const s = Math.sin(e.t * 5 + e.phase) * .9; mx = dx - dy * s; my = dy + dx * s; break; }
          case 'dash': {
            e.stT -= dt;
            if (e.st === 0 && e.stT <= 0 && d < 420) { e.st = 1; e.stT = .5; }
            else if (e.st === 1) { sp = 0; if (e.stT <= 0) { e.st = 2; e.stT = .45; e.dx = dx; e.dy = dy; } }
            else if (e.st === 2) { mx = e.dx; my = e.dy; sp *= 4.5; if (e.stT <= 0) { e.st = 0; e.stT = rand(2.5, 3.5); } }
            break;
          }
          case 'ranged': case 'ranged3': {
            if (d < 220) { mx = -dx; my = -dy; } else if (d < 300) { mx = -dy * .6; my = dx * .6; }
            e.stT -= dt;
            if (e.stT <= 0 && d < 520) {
              e.stT = e.def.beh === 'ranged3' ? 3 : 2.4; Audio.play('shoot');
              const n = e.def.beh === 'ranged3' ? 3 : 1, a0 = Math.atan2(dy, dx);
              for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .25; Sys.bullet(e.id === 'chorister' ? 'note' : 'orb', e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190, e.dmg); }
            }
            break;
          }
          case 'puddle': e.stT -= dt; if (e.stT <= 0) { e.stT = 2.2; Sys.hazard('slow', e.x, e.y, 34, 0, 0, 4); } break;
          case 'eater': {
            if (d < 220 && !hollowStealth) p.light = Math.max(0, p.light - 1.2 * dt);
            for (const m of Embers.items) if (m.active && !m.mag && Math.abs(m.x - e.x) < 34 && Math.abs(m.y - e.y) < 34) { e.hp += m.v * 3; e.maxHp += m.v * 3; Embers.release(m); }
            break;
          }
          case 'scream': e.stT -= dt; if (e.stT <= 0 && d < 320) { e.stT = rand(6, 8); Sys.fx('ring', e.x, e.y, 320, .6, '#dfe8f0'); Audio.play('roar');
            if (Game.save.settings.noInvert) p.slowT = 1; else p.invertT = 1; } break;
          case 'burrow':
            if (e.under) { sp *= 2.2; if (d < 110) { e.under = false; Sys.fx('dust', e.x, e.y, 30, .5, '#6e4a3a'); emit(e.x, e.y, 10, 7, 100, .5, 3); } }
            break;
        }
      }
      if (e.march) { mx = e.dx; my = e.dy; e.stT -= dt; if (e.stT <= 0) { Enemies.release(e); continue; } }
      e.vx = mx * sp; e.vy = my * sp;
      // разделение стаи
      if (!e.big && !e.under) {
        Grid.query(e.x, e.y, e.r, QC);
        for (let i = 0; i < QC.length && i < 8; i++) {
          const o = QC[i]; if (o === e) continue;
          let ox = e.x - o.x, oy = e.y - o.y; const dd = ox * ox + oy * oy, R = e.r + o.r;
          if (dd < R * R && dd > .01) { const l = Math.sqrt(dd), push = (R - l) / l * .5; e.x += ox * push; e.y += oy * push; }
        }
      }
      e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt; e.kx *= .86; e.ky *= .86;
      // касание игрока
      if (!e.under && run.dyingT <= 0) {
        const R = e.r * .85 + 12;
        if (dist2(e.x, e.y, p.x, p.y) < R * R) {
          if (p.iframes <= 0) { Sys.hurtPlayer(e.dmg, e); if (e.def.beh === 'shade') p.light = Math.max(0, p.light - p.lightMax * .05); }
        }
      }
    }
  },
};

// ---------- боссы ----------
const Bosses = {
  spawn(id) {
    const run = Game.run, def = BOSSES[id]; Sys.spawnPos(SP);
    const e = Enemies.get(); if (!e) return;
    const hp = def.hp * run.diffMul.hp * (run.cur.iron ? 1.4 : 1);
    Object.assign(e, { id, def: { beh: 'boss', hp: def.hp }, x: SP.x, y: SP.y, px: SP.x, py: SP.y, vx: 0, vy: 0, kx: 0, ky: 0, r: def.r, scale: 1, maxHp: hp, hp,
      spd: def.spd * run.diffMul.spd, dmg: def.dmg, xp: 0, flashT: 0, frozenT: 0, slowT: 0, stunT: 0, blindT: 0, burnT: 0, burnD: 0, t: 0, phase: 0, st: 0, stT: 2,
      elite: false, boss: true, big: true, under: false, split: false, march: false, anim: 0, bossData: { atk: 0, blackout: false, teleT: 0, hands: 2, lampT: 0 } });
    run.bigs.push(e); Music.boss = true; Audio.play('roar'); run.shake = 14;
    UI.toast(L('bossIncoming') + ': ' + S().e[id]);
    Game.save.codex.e[id] = Game.save.codex.e[id] || 0;
  },
  update(e, dt, dx, dy, d) {
    const run = Game.run, p = run.player, b = e.bossData; e.stT -= dt;
    let sp = e.spd;
    if (e.id === 'rotmother') {
      if (e.stT <= 0) {
        b.atk = (b.atk + 1) % 2; e.stT = e.split ? 3.6 : 3;
        if (b.atk === 0) { const a0 = Math.atan2(dy, dx); for (let i = 0; i < 9; i++) { const a = a0 + (i - 4) * .17; Sys.bullet('acid', e.x, e.y, Math.cos(a) * 200, Math.sin(a) * 200, 14, 9); } Audio.play('poison'); }
        else { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; Sys.spawnEnemy('worm', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80); } Audio.play('roar'); }
      }
      if (!e.split && e.hp < e.maxHp * .5) {
        e.split = true; e.r *= .78; e.scale = .78; const hp = e.hp;
        const c = Enemies.get(); if (c) { Object.assign(c, { ...e, idx: c.idx, active: true, bossData: { ...b }, x: e.x + 60, y: e.y }); c.hp = hp; c.maxHp = e.maxHp; run.bigs.push(c); }
        e.x -= 60; emit(e.x, e.y, 40, 3, 200, .7, 5); run.shake = 12; Audio.play('explode');
      }
    } else if (e.id === 'bishop') {
      // держит дистанцию
      if (d < 240) sp = -e.spd; else if (d < 320) sp = 0;
      if (e.stT <= 0) {
        b.atk = (b.atk + 1) % 3; e.stT = 3.4;
        if (b.atk === 0 || b.atk === 2) { // кольцо черепов с проходом
          const n = 28, gap = rand(0, TAU), R = 420;
          for (let i = 0; i < n; i++) { const a = i / n * TAU; let da = Math.abs(((a - gap + Math.PI) % TAU + TAU) % TAU - Math.PI); if (da < .5) continue;
            Sys.bullet('skull', p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, -Math.cos(a) * 130, -Math.sin(a) * 130, 16, 10, 4.5); }
          Audio.play('warn');
        } else { // телепорт с ловушками
          for (let i = 0; i < 3; i++) Sys.hazard('circle', e.x + rand(-60, 60), e.y + rand(-60, 60), 70, 1.1, 22);
          const a = rand(0, TAU); e.x = e.px = p.x + Math.cos(a) * 300; e.y = e.py = p.y + Math.sin(a) * 300;
          Sys.fx('ring', e.x, e.y, 90, .4, '#b394ff'); for (let i = 0; i < 2; i++) Sys.hazard('circle', p.x + rand(-120, 120), p.y + rand(-120, 120), 60, 1.2, 20);
        }
      }
      if (!b.blackout && e.hp < e.maxHp * .3) { b.blackout = true; run.blackoutT = 5; Audio.play('eclipse'); UI.toast(S().e.bishop + '…'); }
    } else if (e.id === 'shepherd') {
      const ph = e.hp > e.maxHp * .6 ? 1 : e.hp > e.maxHp * .25 ? 2 : 3;
      if (ph === 3) sp *= 2.1;
      if (e.stT <= 0) {
        e.stT = ph === 1 ? 2 : ph === 2 ? 2.6 : 1.2;
        const n = ph === 3 ? 2 : 3;
        for (let i = 0; i < n; i++) { const lead = i === 0 ? 0 : .6 * i; Sys.hazard('hand', p.x + Input.mx * 150 * lead + rand(-40, 40), p.y + Input.my * 150 * lead + rand(-40, 40), 72, 1, 30); }
        Audio.play('warn');
      }
      if (ph === 2) { p.light = Math.max(0, p.light - 3.5 * dt); run.eclipseFx = Math.min(1, run.eclipseFx + dt);
        b.lampT -= dt; if (b.lampT <= 0) { b.lampT = 7; for (let i = 0; i < 3; i++) { const a = rand(0, TAU); Sys.item('lampItem', p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240); } } }
      else run.eclipseFx = Math.max(0, run.eclipseFx - dt);
    }
    // движение босса
    e.x += dx * sp * dt * (e.slowT > 0 ? .7 : 1) * (e.frozenT > 0 ? .5 : 1); e.y += dy * sp * dt * (e.slowT > 0 ? .7 : 1) * (e.frozenT > 0 ? .5 : 1);
    if (e.slowT > 0) e.slowT -= dt; if (e.frozenT > 0) e.frozenT -= dt;
    // касание
    if (run.dyingT <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r * .8 + 12) ** 2) Sys.hurtPlayer(e.dmg, e);
    // не даём убежать далеко
    if (d > 900) { e.x = e.px = p.x - dx * 700; e.y = e.py = p.y - dy * 700; }
  },
  onDeath(e) {
    const run = Game.run, s = Game.save;
    if (run.bigs.some(o => o !== e && o.active && o.boss && o.id === e.id)) { emit(e.x, e.y, 40, 3, 200, .8, 5); return; }
    run.st.bosses[e.id] = 1; s.stats.bosses[e.id] = 1; s.codex.e[e.id] = 1;
    if (e.id === 'shepherd' && run.diff === 'nightmare') s.stats.shepherdNightmare = 1;
    run.ash += CONFIG.ASH_PER_BOSS; run.hitstop = .12; run.slow = .3; run.slowT = 1; run.shake = 20; run.eclipseFx = 0;
    Audio.play('explode'); setTimeout(() => Audio.play('explode'), 200); setTimeout(() => Audio.play('chest'), 500);
    for (let i = 0; i < 6; i++) Sys.fx('ring', e.x + rand(-40, 40), e.y + rand(-40, 40), 80 + i * 30, .5 + i * .1, '#ffd27a');
    emit(e.x, e.y, 90, 1, 320, 1.2, 5);
    for (let i = 0; i < 40; i++) Sys.dropEmber(e.x + rand(-90, 90), e.y + rand(-90, 90), 25);
    const c = Sys.item('chest', e.x, e.y); if (c) c.v = e.id;
    Music.boss = run.bigs.some(o => o !== e && o.active && o.boss);
    UI.vibrate([80, 50, 80]);
  },
};

// ---------- оружие ----------
const Weapons = {
  nearest(x, y, maxR, out = QA) {
    Grid.query(x, y, maxR, out); let best = null, bd = Infinity;
    for (const e of out) { const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    return best;
  },
  randomNear(x, y, maxR, out = QA) { Grid.query(x, y, maxR, out); return out.length ? out[(Math.random() * out.length) | 0] : null; },
  proj(kind, w, x, y, vx, vy, r, dmg, pierce, life) {
    const p = Projs.get(); if (!p) return null;
    p.kind = kind; p.w = w; p.x = p.sx = x; p.y = p.sy = y; p.vx = vx; p.vy = vy; p.r = r; p.dmg = dmg; p.pierce = pierce; p.life = p.max = life; p.target = null; p.ret = false; p.hits.clear(); p.n = 0; p.a = 0;
    return p;
  },
  zone(kind, w, x, y, r, life, dmg, tick = .5, delay = 0) {
    const z = Zones.get(); if (!z) return null;
    z.kind = kind; z.w = w; z.x = x; z.y = y; z.r = z.r0 = r; z.life = z.max = life; z.dmg = dmg; z.tick = tick; z.tickT = 0; z.delay = delay; z.slow = 0; z.heal = false; z.follow = false; z.grow = 0; z.n = 0; z.done = false;
    return z;
  },
  resetOrbiters(w) {
    for (const o of w.orbs) Projs.release(o); w.orbs.length = 0;
    const run = Game.run; if (!run) return; const s = w.s, p = run.player;
    let n = 0, kind = '';
    if (w.id === 'censer') { n = s.amount; kind = 'orbit'; }
    else if (w.id === 'shovel' && w.evo) { n = Math.min(2 + Math.floor(s.amount / 2), 5); kind = 'scythe'; }
    else if (w.id === 'arrows' && w.evo) { n = Math.min(3 + Math.floor(s.amount / 2), 7); kind = 'wolf'; }
    w.needOrbs = n > 0;
    for (let i = 0; i < n; i++) { const o = Weapons.proj(kind, w, p.x, p.y, 0, 0, 14, s.dmg, 999, 1e9); if (!o) break; o.a = i / n * TAU; w.orbs.push(o); }
  },
  update(dt) {
    const run = Game.run, p = run.player;
    for (const w of run.weapons) {
      const s = w.s; w.t -= dt;
      if (w.id === 'black' && w.evo) { w.x.ecl = (w.x.ecl ?? 12) - dt; if (w.x.ecl <= 0) { w.x.ecl = 12; Weapons.eclipse(w); } }
      if (w.id === 'flask' && w.evo && Input.moving) { w.x.trail = (w.x.trail || 0) - dt; if (w.x.trail <= 0) { w.x.trail = .22; Weapons.zone('fire', w, p.x, p.y, 44 * s.area, 2, s.dmg * .6); } }
      if (w.id === 'ice' && w.evo) { if (!w.x.aura || !w.x.aura.active) { w.x.aura = Weapons.zone('frostaura', w, p.x, p.y, 170 * s.area, 1e9, 0, .3); if (w.x.aura) w.x.aura.follow = true; } else w.x.aura.r = 170 * s.area; }
      if (w.orbs.length && w.orbs.some(o => !o.active || o.w !== w) || (w.needOrbs && !w.orbs.length)) { w.x.orbT = (w.x.orbT || 0) - dt; if (w.x.orbT <= 0) { w.x.orbT = 1; Weapons.resetOrbiters(w); } }
      if (s.cd <= 0 || w.t > 0) continue;
      w.t = s.cd;
      Weapons.fire[w.id](w, s, p);
    }
  },
  eclipse(w) {
    const run = Game.run, p = run.player; run.eclipseT = 1.6; Audio.play('eclipse'); run.shake = 16;
    setTimeout(() => {
      if (Game.run !== run || !run.player) return;
      Grid.query(p.x, p.y, Math.hypot(Game.vw, Game.vh) / 2, QB);
      for (const e of QB.slice()) Sys.damage(e, w.s.dmg * 25, w, p.x, p.y, 0);
      Render.flashScreen('#7b4fd6', .5);
    }, 900);
  },
  fire: {
    blade(w, s, p) {
      const dirs = [];
      // автоприцел: ближайший враг в радиусе удара, иначе — направление движения
      const tgt = Weapons.nearest(p.x, p.y, 150 * s.area, QB);
      const f = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : Math.atan2(p.fy, p.fx);
      if (w.evo) for (let i = 0; i < 4; i++) dirs.push(f + i * Math.PI / 2);
      else { dirs.push(f); if (s.amount >= 2) dirs.push(f + Math.PI); if (s.amount >= 3) dirs.push(f + Math.PI / 2); if (s.amount >= 4) dirs.push(f - Math.PI / 2); }
      const R = 108 * s.area;
      Grid.query(p.x, p.y, R, QA);
      for (const a of dirs) {
        Sys.fx('slash', p.x, p.y, R, .2, w.evo ? '#ffb14a' : '#fff6d0', a);
        for (const e of QA) {
          let da = Math.atan2(e.y - p.y, e.x - p.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < 1.15) { Sys.damage(e, s.dmg, w, p.x, p.y, 160); if (s.burn || w.evo) { e.burnT = 2; e.burnD = s.dmg * .25; } }
        }
        if (w.evo) Weapons.zone('fire', w, p.x + Math.cos(a) * R * .7, p.y + Math.sin(a) * R * .7, 40 * s.area, 1.4, s.dmg * .3);
      }
      Audio.play('slash');
    },
    shovel(w, s, p) {
      if (w.evo) return;
      Grid.query(p.x, p.y, 420, QA); QA.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
      for (let i = 0; i < s.amount; i++) {
        const t = QA[i % Math.max(1, QA.length)]; let a = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.fy, p.fx) + i * .5;
        if (!t && i) a += rand(-.4, .4);
        const v = 440 * s.speed, o = Weapons.proj('boomer', w, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 17 * s.area, s.dmg, 999, 3);
        if (o) o.rad = 320 * s.area;
      }
      Audio.play('shovel');
    },
    poison(w, s, p) {
      for (let i = 0; i < s.amount; i++) {
        const t = Weapons.randomNear(p.x, p.y, 320); const x = t ? t.x : p.x + rand(-200, 200), y = t ? t.y : p.y + rand(-200, 200);
        const z = Weapons.zone('poison', w, x, y, 72 * s.area, s.dur, s.dmg); if (z && w.evo) { z.grow = .6; z.slow = 1; }
      }
      Audio.play('poison');
    },
    hammer(w, s, p) {
      for (let i = 0; i < s.amount; i++) {
        const t = Weapons.randomNear(p.x, p.y, 380); const x = t ? t.x : p.x + rand(-220, 220), y = t ? t.y : p.y + rand(-220, 220);
        const n = w.evo ? 5 : 1;
        for (let k = 0; k < n; k++) Weapons.zone('strike', w, x + (k ? rand(-50, 50) : 0), y + (k ? rand(-50, 50) : 0), 92 * s.area * (w.evo ? 1.15 : 1), .25, s.dmg, 1, .32 + k * .16 + i * .08);
      }
    },
    daggers(w, s, p) {
      const base = Math.atan2(p.fy, p.fx), n = w.evo ? 2 : s.amount, v = 720 * s.speed;
      if (w.evo) { w.x.sweep = (w.x.sweep || 0) + .55; }
      for (let i = 0; i < n; i++) {
        const a = w.evo ? base + Math.sin(w.x.sweep + i * Math.PI) * .7 : base + (i - (n - 1) / 2) * .11 + rand(-.03, .03);
        const o = Weapons.proj('dagger', w, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 7, s.dmg, s.pierce + (w.evo ? 2 : 0), .9); if (o) o.ang = a;
      }
      Audio.play('dagger');
    },
    flask(w, s, p) {
      for (let i = 0; i < s.amount; i++) {
        const t = Weapons.randomNear(p.x, p.y, 360); const x = t ? t.x : p.x + rand(-220, 220), y = t ? t.y : p.y + rand(-220, 220);
        const o = Weapons.proj('flask', w, p.x, p.y, 0, 0, 8, s.dmg, 0, .6); if (o) { o.tx = x; o.ty = y; }
      }
      Audio.play('flask');
    },
    censer() {},
    lightning(w, s, p) {
      for (let i = 0; i < s.amount; i++) {
        const t = Weapons.randomNear(p.x, p.y, 420); if (!t) break;
        const hit = [t]; let cur = t;
        for (let c = 0; c < s.chain; c++) {
          Grid.query(cur.x, cur.y, 170, QB); let nx = null, nd = Infinity;
          for (const e of QB) if (!hit.includes(e)) { const d = dist2(cur.x, cur.y, e.x, e.y); if (d < nd) { nd = d; nx = e; } }
          if (!nx) break; hit.push(nx); cur = nx;
        }
        const pts = [p.x, p.y - 20]; for (const e of hit) pts.push(e.x, e.y);
        const f = Sys.fx('bolt', 0, 0, 0, .18, w.evo ? '#e0f4ff' : '#9fd4ff'); if (f) f.pts = pts;
        for (const e of hit) { Sys.damage(e, s.dmg, w, p.x, p.y, 40); if (w.evo && e.active) e.stunT = .8; emit(e.x, e.y, 3, 4, 90, .25, 2); }
      }
      Audio.play('zap');
    },
    arrows(w, s, p) {
      if (w.evo) return;
      for (let i = 0; i < s.amount; i++) {
        const a = rand(0, TAU), v = 380 * s.speed, o = Weapons.proj('arrow', w, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 7, s.dmg, s.pierce, 2.6);
        if (o) o.target = Weapons.randomNear(p.x, p.y, 520);
      }
      Audio.play('arrow');
    },
    rune(w, s, p) {
      for (let i = 0; i < s.amount; i++) { const z = Weapons.zone('rune', w, p.x + (i ? rand(-110, 110) : 0), p.y + (i ? rand(-110, 110) : 0), 112 * s.area, .35, s.dmg, 1, 2); if (z && w.evo) z.heal = true; }
    },
    ice(w, s, p) {
      Grid.query(p.x, p.y, 480, QA); QA.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
      for (let i = 0; i < s.amount; i++) {
        const t = QA[i % Math.max(1, QA.length)]; const a = t ? Math.atan2(t.y - p.y, t.x - p.x) + (i >= QA.length ? rand(-.3, .3) : 0) : rand(0, TAU);
        const v = 540 * s.speed, o = Weapons.proj('ice', w, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 8, s.dmg, s.pierce, 1.3); if (o) o.ang = a;
      }
      Audio.play('ice');
    },
    crossbow(w, s, p) {
      Grid.query(p.x, p.y, 520, QA); QA.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
      for (let i = 0; i < s.amount; i++) {
        const t = QA[i % Math.max(1, QA.length)]; const a = (t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.fy, p.fx)) + (i >= QA.length ? rand(-.2, .2) : 0);
        const v = 900 * s.speed, o = Weapons.proj('bolt', w, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 8, s.dmg, s.pierce, 1); if (o) o.ang = a;
      }
      Audio.play('crossbow');
    },
    bell(w, s, p) {
      const n = w.evo ? 3 : s.amount;
      for (let i = 0; i < n; i++) { const o = Weapons.proj('bellring', w, p.x, p.y, 0, 0, 20, s.dmg, 999, .7 + i * .25); if (o) { o.rad = 210 * s.area; o.n = -i * .25; } }
      Audio.play('bell');
    },
    sickles(w, s, p) {
      const a0 = rand(0, TAU);
      for (let i = 0; i < s.amount; i++) { const o = Weapons.proj('sickle', w, p.x, p.y, 0, 0, 14 * s.area, s.dmg, 999, s.dur * (w.evo ? 1.7 : 1)); if (o) { o.a = a0 + i / s.amount * TAU; o.rad = 250 * s.area; } }
      Audio.play('slash');
    },
    wisps(w, s, p) {
      for (let i = 0; i < s.amount; i++) { const a = rand(0, TAU), o = Weapons.proj('wispbomb', w, p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, Math.cos(a) * 120, Math.sin(a) * 120, 9, s.dmg, 0, 4); if (o) { o.target = Weapons.randomNear(p.x, p.y, 480); o.n = 0; } }
      Audio.play('arrow');
    },
    meteor(w, s, p) {
      for (let i = 0; i < s.amount; i++) {
        const t = Weapons.randomNear(p.x, p.y, 460); const x = t ? t.x + rand(-20, 20) : p.x + rand(-300, 300), y = t ? t.y + rand(-20, 20) : p.y + rand(-250, 250);
        const z = Weapons.zone('meteor', w, x, y, 80 * s.area, .25, s.dmg, 1, .7 + i * .12); if (z && w.evo) z.heal = false;
      }
    },
    whip(w, s, p) {
      const dir = p.fx >= 0 ? 1 : -1, len = 200 * s.area * (w.evo ? 1.4 : 1), sides = s.amount >= 2 ? [dir, -dir] : [dir], hits = w.evo ? 2 : 1;
      for (const sd of sides) {
        Sys.fx('whip', p.x, p.y - 6, len, .22, w.evo ? '#ff4a4a' : '#e8c8a8', sd);
        Grid.query(p.x + sd * len / 2, p.y, len / 2, QA); let healed = 0;
        for (const e of QA.slice()) { if (Math.abs(e.y - p.y) > 34 * s.area + e.r || (e.x - p.x) * sd < -10) continue;
          for (let k = 0; k < hits && e.active; k++) Sys.damage(e, s.dmg, w, p.x, p.y, 140); if (w.evo && healed < 3) { Sys.heal(1); healed++; } }
      }
      Audio.play('slash');
    },
    black(w, s, p) {
      const run = Game.run;
      for (let i = 0; i < s.amount; i++) {
        const o = Weapons.proj('wave', w, p.x, p.y, 0, 0, 20, s.dmg * 1.4, 999, .65 + i * .12); if (o) { o.rad = 270 * s.area; o.n = -i * .12; }
      }
      if (!CHAR[run.char].noLight) run.player.light = Math.max(0, run.player.light - 1.5);
      Audio.play('black');
    },
  },
};

const Proj = {
  update(dt) {
    const run = Game.run, p = run.player;
    for (const o of Projs.items) {
      if (!o.active) continue;
      o.life -= dt; if (o.life <= 0) { Projs.release(o); continue; }
      const w = o.w, s = w.s;
      switch (o.kind) {
        case 'boomer': {
          const dd = Math.hypot(o.x - o.sx, o.y - o.sy);
          if (!o.ret && dd > o.rad) o.ret = true;
          if (o.ret) { const dx = p.x - o.x, dy = p.y - o.y, l = Math.hypot(dx, dy) || 1, v = 520 * s.speed; o.vx = lerp(o.vx, dx / l * v, .12); o.vy = lerp(o.vy, dy / l * v, .12); if (l < 22) { Projs.release(o); continue; } }
          o.a += dt * 16; Proj.hitArea(o, .5, 90); break;
        }
        case 'scythe': case 'orbit': {
          const R = (o.kind === 'scythe' ? 150 : 96) * s.area, spd = (o.kind === 'scythe' ? 2.8 : 2.6) * s.speed;
          o.a += spd * dt; o.x = p.x + Math.cos(o.a) * R; o.y = p.y + Math.sin(o.a) * R; o.r = (o.kind === 'scythe' ? 30 : 15) * s.area; o.dmg = s.dmg;
          Proj.hitArea(o, o.kind === 'scythe' ? .35 : .4, o.kind === 'scythe' ? 60 : 200, o.kind === 'scythe' ? 'execute' : null);
          if (o.kind === 'orbit' && Math.random() < dt * 8) emit(o.x, o.y, 1, 6, 20, .6, 3, -30);
          continue;
        }
        case 'wolf': {
          o.dmg = s.dmg; o.r = 16;
          if (!o.target || !o.target.active || dist2(o.target.x, o.target.y, p.x, p.y) > 420 * 420) { o.target = Weapons.nearest(o.x, o.y, 300, QB); o.n = 0; }
          let tx, ty; if (o.target) { tx = o.target.x; ty = o.target.y; } else { o.a += dt * 1.5; tx = p.x + Math.cos(o.a) * 70; ty = p.y + Math.sin(o.a) * 70; }
          const dx = tx - o.x, dy = ty - o.y, l = Math.hypot(dx, dy) || 1, v = 380 * s.speed;
          o.vx = lerp(o.vx, dx / l * v, .1); o.vy = lerp(o.vy, dy / l * v, .1); o.ang = Math.atan2(o.vy, o.vx);
          o.x += o.vx * dt; o.y += o.vy * dt; Proj.hitArea(o, .5, 60);
          continue;
        }
        case 'arrow': {
          if (!o.target || !o.target.active) o.target = Weapons.nearest(o.x, o.y, 300, QB);
          if (o.target) { const dx = o.target.x - o.x, dy = o.target.y - o.y, l = Math.hypot(dx, dy) || 1, v = 380 * s.speed; o.vx = lerp(o.vx, dx / l * v, .09); o.vy = lerp(o.vy, dy / l * v, .09); }
          o.ang = Math.atan2(o.vy, o.vx); if (Math.random() < .5) emit(o.x, o.y, 1, 8, 10, .3, 2);
          Proj.hitOnce(o); break;
        }
        case 'dagger': case 'ice': case 'bolt': Proj.hitOnce(o); break;
        case 'sickle': {
          const k = 1 - o.life / o.max, R = w.evo ? o.rad * Math.sin(k * Math.PI) : o.rad * easeOut(k);
          o.a += (w.evo ? 4 : 5) * dt; o.x = p.x + Math.cos(o.a) * (20 + R); o.y = p.y + Math.sin(o.a) * (20 + R); o.ang += dt * 14;
          Proj.hitArea(o, .3, 80); continue;
        }
        case 'wispbomb': {
          o.n += dt; if (!o.target || !o.target.active) o.target = Weapons.nearest(o.x, o.y, 360, QB);
          if (o.target && o.n > .25) { const dx = o.target.x - o.x, dy = o.target.y - o.y, l = Math.hypot(dx, dy) || 1, v = 340 * s.speed; o.vx = lerp(o.vx, dx / l * v, .1); o.vy = lerp(o.vy, dy / l * v, .1); }
          else { o.vx *= .96; o.vy *= .96; }
          if (Math.random() < .5) emit(o.x, o.y, 1, 3, 10, .3, 2, -20);
          Grid.query(o.x, o.y, o.r, QB);
          if (QB.length) {
            const R = 55 * s.area; Grid.query(o.x, o.y, R, QE); for (const e of QE.slice()) Sys.damage(e, o.dmg, w, o.x, o.y, 120);
            Sys.fx('ring', o.x, o.y, R, .3, '#9affb0'); emit(o.x, o.y, 8, 3, 140, .4, 3); Render.lightPulse(o.x, o.y);
            if (w.evo && !o.pierce) for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, c = Weapons.proj('wispbomb', w, o.x, o.y, Math.cos(a) * 200, Math.sin(a) * 200, 7, o.dmg * .5, 1, 2); if (c) { c.n = 0; c.target = null; } }
            Projs.release(o); continue;
          }
          break;
        }
        case 'flask': {
          const k = 1 - o.life / o.max; o.x = lerp(o.sx, o.tx, k); o.y = lerp(o.sy, o.ty, k) - Math.sin(k * Math.PI) * 80; o.a += dt * 10;
          if (o.life - dt <= 0) { Weapons.zone('fire', w, o.tx, o.ty, 62 * s.area, s.dur, s.dmg); emit(o.tx, o.ty, 10, 0, 160, .5, 3, -60); Projs.release(o); }
          continue;
        }
        case 'bellring': case 'wave': {
          o.n += dt; if (o.n < 0) { o.x = p.x; o.y = p.y; continue; }
          const k = Math.min(1, o.n / .55); o.r = 20 + o.rad * easeOut(k);
          Grid.query(o.x, o.y, o.r, QB);
          const bell = o.kind === 'bellring';
          for (const e of QB) { if (o.hits.has(e)) continue; const d = Math.hypot(e.x - o.x, e.y - o.y); if (d > o.r - 40 - e.r) { o.hits.set(e, 1); Sys.damage(e, o.dmg, w, o.x, o.y, bell ? 380 : 120); if (bell && w.evo && e.active) e.stunT = .6; } }
          continue;
        }
      }
      o.x += o.vx * dt; o.y += o.vy * dt;
    }
  },
  hitOnce(o) {
    Grid.query(o.x, o.y, o.r, QB);
    for (const e of QB) {
      if (o.hits.has(e)) continue; o.hits.set(e, 1);
      const w = o.w; Sys.damage(e, o.dmg, w, o.x - o.vx * .02, o.y - o.vy * .02, o.kind === 'ice' ? 30 : 60);
      if (o.kind === 'ice' && e.active && Math.random() < w.s.freeze) { if (e.boss) e.slowT = 1; else e.frozenT = 1.3 * Game.run.player.stats.duration; }
      if (o.kind === 'dagger' && w.evo) { const n = Weapons.nearest(o.x, o.y, 260, QD); if (n && !o.hits.has(n)) { const a = Math.atan2(n.y - o.y, n.x - o.x), v = Math.hypot(o.vx, o.vy); o.vx = Math.cos(a) * v; o.vy = Math.sin(a) * v; o.ang = a; } }
      if (o.kind === 'bolt' && w.evo) { Grid.query(o.x, o.y, 60, QE); for (const x of QE.slice()) if (x !== e) Sys.damage(x, o.dmg * .6, w, o.x, o.y, 100); Sys.fx('ring', o.x, o.y, 60, .25, '#ffd27a'); Render.lightPulse(o.x, o.y); }
      emit(o.x, o.y, 2, o.kind === 'ice' ? 4 : 6, 80, .2, 2);
      if (--o.pierce < 0) { Projs.release(o); return; }
    }
  },
  hitArea(o, cd, kb, opt) {
    Grid.query(o.x, o.y, o.r, QB); const t = Game.run.t;
    for (const e of QB) { const last = o.hits.get(e); if (last !== undefined && t - last < cd) continue; o.hits.set(e, t); Sys.damage(e, o.dmg, o.w, o.x, o.y, kb, opt); }
    if (o.hits.size > 300) o.hits.clear();
  },
};

const ZoneSys = {
  update(dt) {
    const run = Game.run, p = run.player;
    for (const z of Zones.items) {
      if (!z.active) continue;
      if (z.follow) { z.x = p.x; z.y = p.y; }
      if (z.delay > 0) { z.delay -= dt; if (z.delay <= 0) ZoneSys.trigger(z); continue; }
      z.life -= dt; if (z.life <= 0) { Zones.release(z); continue; }
      if (z.grow) z.r = z.r0 * (1 + z.grow * (1 - z.life / z.max));
      z.tickT -= dt;
      if (z.tickT <= 0) {
        z.tickT = z.tick;
        Grid.query(z.x, z.y, z.r, QB);
        for (const e of QB) {
          if (z.kind === 'frostaura') { e.slowT = Math.max(e.slowT, .4); continue; }
          if (z.dmg > 0) Sys.damage(e, z.dmg, z.w, z.x, z.y, 0);
          if (z.slow && e.active) e.slowT = Math.max(e.slowT, .6);
        }
      }
      if ((z.kind === 'poison' || z.kind === 'fire') && Math.random() < dt * 14 * Render.partMul) {
        const a = rand(0, TAU), d = rand(0, z.r); emit(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 1, z.kind === 'fire' ? 0 : 3, 20, .7, 4, -40);
      }
    }
  },
  trigger(z) {
    const run = Game.run, p = run.player;
    if (z.kind === 'meteor') {
      Grid.query(z.x, z.y, z.r, QB); for (const e of QB.slice()) { Sys.damage(e, z.dmg, z.w, z.x, z.y, 220); if (e.active) { e.burnT = 2; e.burnD = z.dmg * .15; } }
      Sys.fx('ring', z.x, z.y, z.r * 1.2, .45, '#ff9a4a'); emit(z.x, z.y, 24, 0, 260, .7, 4, 80); Render.lightPulse(z.x, z.y); Audio.play('explode'); run.shake = Math.max(run.shake, 6);
      if (z.w.evo) Weapons.zone('fire', z.w, z.x, z.y, z.r * .7, 2.5, z.dmg * .2);
      z.life = .01; return;
    }
    if (z.kind === 'strike' || z.kind === 'rune') {
      Grid.query(z.x, z.y, z.r, QB); let n = 0;
      for (const e of QB.slice()) { Sys.damage(e, z.dmg, z.w, z.x, z.y, 200); n++; }
      if (z.heal && n) { Sys.heal(Math.min(8, n) * p.stats.maxHp * .01); Audio.play('heal'); }
      Sys.fx(z.kind === 'strike' ? 'pillar' : 'ring', z.x, z.y, z.r, .35, z.kind === 'strike' ? '#fff0b0' : '#ff3a3a');
      emit(z.x, z.y, 14, z.kind === 'strike' ? 1 : 2, 220, .5, 4);
      Audio.play(z.kind === 'strike' ? 'hammer' : 'rune'); run.shake = Math.max(run.shake, z.kind === 'strike' ? 5 : 7);
      z.life = .01;
    }
  },
};

const HazardSys = {
  update(dt) {
    const run = Game.run, p = run.player;
    p.slowZone = false;
    for (const h of Hazards.items) {
      if (!h.active) continue;
      if (h.kind === 'slow') { h.life -= dt; if (h.life <= 0) { Hazards.release(h); continue; } if (dist2(h.x, h.y, p.x, p.y) < h.r * h.r) p.slowZone = true; continue; }
      if (!h.fired) {
        h.tele -= dt;
        if (h.tele <= 0) {
          h.fired = true; if (dist2(h.x, h.y, p.x, p.y) < (h.r + 10) ** 2) Sys.hurtPlayer(h.dmg);
          emit(h.x, h.y, 16, h.kind === 'hand' ? 11 : h.kind === 'explode' ? 0 : 9, 180, .5, 4);
          if (h.kind !== 'explode') run.shake = Math.max(run.shake, 5); Audio.play(h.kind === 'explode' ? 'explode' : 'hammer');
        }
      } else { h.life -= dt; if (h.life <= 0) Hazards.release(h); }
    }
    for (const b of Bullets.items) {
      if (!b.active) continue;
      b.life -= dt; if (b.life <= 0) { Bullets.release(b); continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (dist2(b.x, b.y, p.x, p.y) < (b.r + 10) ** 2) { Sys.hurtPlayer(b.dmg); Bullets.release(b); }
    }
  },
};

// ---------- мир: чанки, лампы, декор ----------
const World = {
  CH: 512,
  chunk(cx, cy) {
    const run = Game.run, key = cx + ',' + cy; let c = run.chunks.get(key); if (c) return c;
    const rng = mulberry32(hash2(cx, cy, run.seed)), list = BIOME_DECOR[run.biome], decor = [];
    const tot = list.reduce((a, d) => a + d[1], 0);
    const n = 10 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      let r = rng() * tot, d = list[0]; for (const it of list) { r -= it[1]; if (r <= 0) { d = it; break; } }
      const v = Math.floor(rng() * 3), x = cx * World.CH + rng() * World.CH, y = cy * World.CH + rng() * World.CH;
      if (Math.abs(x) < 80 && Math.abs(y) < 80) continue;
      decor.push({ id: d[0], sp: Sprites.decor[d[0] + v], x, y, key: key + ':' + i });
    }
    decor.sort((a, b) => a.y - b.y);
    const lamps = []; const lampChance = .55 * BIOME[run.biome].lamps;
    if (rng() < lampChance) lamps.push({ x: cx * World.CH + 60 + rng() * (World.CH - 120), y: cy * World.CH + 60 + rng() * (World.CH - 120), key: key + ':L' });
    c = { decor, lamps }; run.chunks.set(key, c);
    if (run.chunks.size > 80) { for (const k of run.chunks.keys()) { const [x, y] = k.split(',').map(Number); if (Math.abs(x - cx) > 4 || Math.abs(y - cy) > 4) run.chunks.delete(k); } }
    return c;
  },
  forNear(x, y, fn) { const cx = Math.floor(x / World.CH), cy = Math.floor(y / World.CH); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) fn(World.chunk(cx + i, cy + j)); },
  update(dt) {
    const run = Game.run, p = run.player, bio = BIOME[run.biome];
    let nearGrave = '';
    World.forNear(p.x, p.y, c => {
      for (const l of c.lamps) {
        if (run.lampsBroken.has(l.key)) continue;
        if (dist2(l.x, l.y, p.x, p.y) < 32 * 32) World.breakLamp(l.x, l.y, l.key);
      }
      for (const d of c.decor) {
        const dd = dist2(d.x, d.y, p.x, p.y);
        if (bio.hot && d.id === 'lava' && dd < 42 * 42) { if (!CHAR[run.char].noLight) p.light = Math.min(p.lightMax, p.light + 8 * dt); if (p.iframes <= 0) Sys.hurtPlayer(4); }
        if (bio.gravity && d.id === 'voidpool' && dd < 200 * 200 && dd > 100) { const l = Math.sqrt(dd); p.x += (d.x - p.x) / l * 45 * dt; p.y += (d.y - p.y) / l * 45 * dt; }
        if (d.id === 'grave' && dd < 60 * 60) nearGrave = d.key;
        if (bio.bog && d.id === 'bog' && dd < 46 * 46) p.slowZone = true;
      }
    });
    // пасхалка: стоять у одной могилы 60 секунд
    if (nearGrave && nearGrave === run.st.graveKey) { run.st.graveT += dt; if (run.st.graveT >= 60 && !run.st.ghost) { run.st.ghost = true; UI.toast(L('ghost')); Sys.item('chest', p.x + 40, p.y); Sys.fx('ring', p.x, p.y, 120, 1, '#dfe8f0'); Audio.play('chest'); } }
    else { run.st.graveKey = nearGrave; run.st.graveT = 0; }
  },
  breakLamp(x, y, key) {
    const run = Game.run, p = run.player;
    if (key) run.lampsBroken.add(key);
    if (!CHAR[run.char].noLight) p.light = Math.min(p.lightMax, p.light + CONFIG.LAMP_LIGHT);
    Sys.heal(CONFIG.LAMP_HEAL); run.st.lamps++; Audio.play('lamp');
    Sys.fx('ring', x, y, 140, .5, '#ffd27a'); emit(x, y, 20, 1, 180, .8, 3, -60); Render.lightPulse(x, y);
  },
};

// ---------- игрок, свет, подбор ----------
const Player = {
  update(dt) {
    const run = Game.run, p = run.player, st = p.stats, ch = CHAR[run.char];
    p.px = p.x; p.py = p.y;
    if (run.dyingT > 0) return;
    let mx = Input.mx, my = Input.my;
    if (p.invertT > 0) { p.invertT -= dt; mx = -mx; my = -my; }
    let sp = st.speed; if (p.slowT > 0) { p.slowT -= dt; sp *= .6; } if (p.slowZone) sp *= .6;
    p.x += mx * sp * dt; p.y += my * sp * dt;
    if (Input.moving) { const l = Math.hypot(mx, my) || 1; p.fx = mx / l; p.fy = my / l; run.st.moved = true; p.anim += dt * 8; }
    else if (!run.st.moved) run.st.stillTime = run.t;
    if (p.iframes > 0) p.iframes -= dt; if (p.hurtT > 0) p.hurtT -= dt;
    if (st.regen) Sys.heal(st.regen * dt);
    if (p.flashCd > 0) p.flashCd -= dt;
    // свет
    if (!ch.noLight) {
      const decay = (CONFIG.LIGHT_DECAY + CONFIG.LIGHT_DECAY_GROWTH * Math.min(run.t, 900) / 300) * BIOME[run.biome].decay * run.diffMul.decay * st.decay * (run.cur.dim ? 1.4 : 1);
      p.light = Math.max(0, p.light - decay * dt);
      const ratio = p.light / p.lightMax;
      if (run.t > 60) run.st.minLightAfter1 = Math.min(run.st.minLightAfter1, ratio);
      const whisper = ratio < CONFIG.WHISPER_AT && !ch.whisperImmune;
      if (whisper) { p.hp -= CONFIG.WHISPER_DPS * dt; run.st.whisperTime += dt; if (p.hp <= 0) Sys.playerDown(); }
      Audio.setWhisper(whisper ? 1 - ratio / CONFIG.WHISPER_AT * .6 : 0);
      if (whisper && !run.whisperToast && run.t - (run.whisperToastT || -99) > 45) { run.whisperToast = true; run.whisperToastT = run.t; UI.toast(L('whisper')); } if (!whisper) run.whisperToast = false;
    }
    // низкое здоровье — сердцебиение
    if (p.hp < st.maxHp * .3) { Audio.heartT -= dt; if (Audio.heartT <= 0) { Audio.heartT = .9; Audio.play('heart'); } }
    // вспышка
    if (Input.flash) {
      Input.flash = false;
      if (p.flashCd <= 0 && (ch.noLight || p.light >= 8)) Sys.flash(false);
    }
    Player.pickups(dt);
  },
  pickups(dt) {
    const run = Game.run, p = run.player, st = p.stats, ch = CHAR[run.char];
    const ratio = ch.noLight ? .3 : p.light / p.lightMax, R = 72 * st.magnet * (1 + .4 * ratio);
    run.emberComboT -= dt; if (run.emberComboT <= 0) run.emberCombo = 0;
    for (const m of Embers.items) {
      if (!m.active) continue;
      const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
      if (!m.mag && d2 < R * R) { m.mag = true; const l = Math.sqrt(d2) || 1; m.vx = -dx / l * 160; m.vy = -dy / l * 160; m.sp = 0; }
      if (m.mag) {
        const l = Math.sqrt(d2) || 1; m.sp = Math.min(m.sp + 1500 * dt, 900);
        m.vx = lerp(m.vx, dx / l * m.sp, .15); m.vy = lerp(m.vy, dy / l * m.sp, .15); m.x += m.vx * dt; m.y += m.vy * dt;
        if (l < 16) Player.collect(m);
      }
    }
    for (const it of Items.items) {
      if (!it.active) continue; it.t += dt;
      if (it.kind === 'lampItem') { if (dist2(it.x, it.y, p.x, p.y) < 32 * 32) { World.breakLamp(it.x, it.y); Items.release(it); } if (it.t > 20) Items.release(it); continue; }
      if (dist2(it.x, it.y, p.x, p.y) < 30 * 30) {
        if (it.kind === 'chest') { run.chests++; run.chestFrom = it.v || run.chestFrom; Audio.play('chest'); }
        else if (it.kind === 'chicken') { Sys.heal(30); Audio.play('heal'); Sys.text(p.x, p.y - 30, '+30', '#6ae07a', 16); }
        else if (it.kind === 'magnet') { for (const m of Embers.items) if (m.active) { m.mag = true; m.sp = 300; } Audio.play('levelup'); }
        else if (it.kind === 'ash') { run.ash += 5; Audio.play('click'); }
        Items.release(it);
      }
    }
  },
  collect(m) {
    const run = Game.run, p = run.player, st = p.stats;
    const xp = m.v * CONFIG.XP_MUL * st.growth * (run.cur.hunger ? .75 : 1);
    run.xp += xp; run.st.embers++;
    if (!CHAR[run.char].noLight) p.light = Math.min(p.lightMax, p.light + CONFIG.LIGHT_PER_XP * Math.pow(m.v, .8));
    run.emberCombo++; run.emberComboT = .45; Audio.play('ember', Math.min(run.emberCombo, 24));
    Embers.release(m); if (run.bigEmber === m) run.bigEmber = null;
    while (run.xp >= run.xpNeed) {
      run.xp -= run.xpNeed; run.level++; run.xpNeed = CONFIG.xpNeed(run.level); run.pendingLv++;
      if (CHAR[run.char].armorPer10 && run.level % 10 === 0) Sys.recalc();
    }
  },
};

Sys.flash = function (free) {
  const run = Game.run, p = run.player, ch = CHAR[run.char];
  if (!free) {
    if (!ch.noLight) p.light = Math.max(0, p.light - p.lightMax * CONFIG.FLASH_COST);
    p.flashCd = CONFIG.FLASH_CD * (run.cur.shortflash ? 2 : 1) * Math.max(.6, p.stats.cooldown);
    run.st.flashes++;
  }
  Grid.query(p.x, p.y, CONFIG.FLASH_R, QA);
  for (const e of QA.slice()) { Sys.damage(e, CONFIG.FLASH_DMG * p.stats.might, null, p.x, p.y, 900); if (e.active && !e.boss) e.blindT = 2; }
  for (const b of Bullets.items) if (b.active && dist2(b.x, b.y, p.x, p.y) < CONFIG.FLASH_R ** 2) Bullets.release(b);
  Sys.fx('ring', p.x, p.y, CONFIG.FLASH_R, .45, '#fff6d0'); Sys.fx('ring', p.x, p.y, CONFIG.FLASH_R * .6, .3, '#ffb14a');
  Render.flashScreen('#fff3d0', .45); Render.lightPulse(p.x, p.y);
  run.shake = 10; Audio.play('flash'); UI.vibrate(40);
  emit(p.x, p.y, 40, 1, 400, .6, 3);
};

// ---------- главный шаг симуляции ----------
Sys.step = function (dt) {
  const run = Game.run, real = dt;
  if (run.hitstop > 0) { run.hitstop -= dt; return; }
  if (run.slowT > 0) { run.slowT -= dt; dt *= run.slow; }
  if (run.dyingT > 0) {
    run.dyingT -= real;
    updateParts(dt); Enemy.update(dt * .3);
    if (run.dyingT <= 0) Game.endRun(false);
    return;
  }
  if (run.dawnT > 0) {
    run.dawnT -= dt; updateParts(dt);
    if (Math.random() < .3) { for (const e of Enemies.items) if (e.active) { emit(e.x, e.y, 6, 7, 60, 1, 3, -40); Enemies.release(e); break; } }
    if (run.dawnT <= 0) { for (const e of Enemies.items) if (e.active) Enemies.release(e); run.bigs.length = 0; UI.dawnChoice(); }
    return;
  }
  run.t += dt;
  const p = run.player;
  Grid.build(p.x, p.y);
  Player.update(dt);
  Director.update(dt);
  Enemy.update(dt);
  Grid.build(p.x, p.y);
  Weapons.update(dt);
  Proj.update(dt);
  ZoneSys.update(dt);
  HazardSys.update(dt);
  World.update(dt);
  updateParts(dt);
  for (const t of Texts.items) if (t.active) { t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) Texts.release(t); }
  for (const f of FX.items) if (f.active) { f.life -= dt; if (f.life <= 0) FX.release(f); }
  if (run.blackoutT > 0) run.blackoutT -= dt;
  if (run.eclipseT > 0) run.eclipseT -= dt;
  if (run.shake > 0) run.shake = Math.max(0, run.shake - 40 * dt);
  // рассвет
  if (!run.endless && run.t >= CONFIG.DAWN && run.dyingT <= 0) {
    run.dawnT = 3.2; run.won = true; Audio.play('dawn'); Music.set('dawn'); Music.boss = false; Render.flashScreen('#ffe6b0', 1.2);
    for (const h of Hazards.items) if (h.active) Hazards.release(h); for (const b of Bullets.items) if (b.active) Bullets.release(b);
    return;
  }
  Tutorial.update(dt);
  if (Game.queue || Game.state !== 'RUN' || run.dyingT > 0) return;
  if (run.pendingLv > 0) { run.pendingLv--; Audio.play('levelup'); UI.vibrate(20); Sys.fx('ring', p.x, p.y, 120, .5, '#ffd27a'); Render.lightPulse(p.x, p.y); run.slow = .3; run.slowT = .3; Game.queue = 'levelup'; Game.queueT = .3; }
  else if (run.chests > 0) { run.chests--; Game.queue = 'chest'; Game.queueT = .15; }
};

// Обучение прямо в игре: 4 подсказки
const Tutorial = {
  update(dt) {
    const run = Game.run; if (run.tutorialStep >= 4) return;
    run.tutT += dt; const keys = ['hintMove', 'hintEmbers', 'hintLight', 'hintFlash'], at = [0.5, 7, 22, 40];
    if (run.tutT >= at[run.tutorialStep]) { UI.hint(L(keys[run.tutorialStep])); run.tutorialStep++; if (run.tutorialStep >= 4) { Game.save.tutorial = true; Save.write(); } }
  },
};

// Снимок забега для сохранения при сворачивании
Sys.snapshot = function () {
  const run = Game.run; if (!run || run.dyingT > 0 || run.dawnT > 0 || run.daily) return null;
  return { char: run.char, biome: run.biome, diff: run.diff, curses: run.curses, seed: run.seed, t: run.t, kills: run.kills, level: run.level, xp: run.xp, ash: run.ash,
    hp: run.player.hp, light: run.player.light, revivals: run.player.revivals, weapons: run.weapons.map(w => ({ id: w.id, lv: w.lv, evo: w.evo, dmg: w.dmg, kills: w.kills })),
    passives: run.passives.map(p => ({ id: p.id, lv: p.lv })), rerolls: run.rerolls, skips: run.skips, banishes: run.banishes, banished: [...run.banished],
    bossIdx: run.bossIdx, nextElite: run.nextElite, endless: run.endless, events: run.events, st: run.st, saved: Date.now() };
};
Sys.restore = function (s) {
  const run = Game.run;
  Object.assign(run, { t: s.t, kills: s.kills, level: s.level, xp: s.xp, xpNeed: CONFIG.xpNeed(s.level), ash: s.ash, rerolls: s.rerolls, skips: s.skips, banishes: s.banishes,
    banished: new Set(s.banished), bossIdx: s.bossIdx, nextElite: s.nextElite, endless: s.endless, events: s.events || {}, st: Object.assign(run.st, s.st), tutorialStep: 99 });
  if (run.endless) run.endlessStart = CONFIG.DAWN;
  run.weapons = []; run.passives = s.passives.map(p => ({ ...p }));
  Sys.recalc(true);
  for (const w of s.weapons) { const nw = Sys.addWeapon(w.id); nw.lv = w.lv; nw.evo = w.evo; nw.dmg = w.dmg; nw.kills = w.kills; Sys.weaponStats(nw); }
  run.player.hp = Math.min(run.player.stats.maxHp, s.hp); run.player.light = s.light; run.player.revivals = s.revivals;
};
