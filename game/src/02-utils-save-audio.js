// ==== 3. UTILS ====
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash2(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
// одномерный value-noise для мерцания факела
const noise1 = (() => { const p = new Float32Array(256); for (let i = 0; i < 256; i++) p[i] = Math.random(); return x => { const i = Math.floor(x), f = x - i, a = p[i & 255], b = p[(i + 1) & 255]; const u = f * f * (3 - 2 * f); return a + (b - a) * u; }; })();
function weightedPick(items, wKey = 'w', rng = Math.random) {
  let sum = 0; for (const it of items) sum += it[wKey];
  let r = rng() * sum; for (const it of items) { r -= it[wKey]; if (r <= 0) return it; }
  return items[items.length - 1];
}
function fmtTime(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return (m < 10 ? '0' : '') + m + ':' + String(s % 60).padStart(2, '0'); }
function fmtNum(n) { return Math.floor(n).toLocaleString(L('locale')); }
function todayKey() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function dayNumber() { return Math.floor((Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - Date.UTC(2026, 0, 1)) / 864e5) + 1; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Единственное глобальное пространство имён
const Game = { state: 'BOOT', lang: 'ru', t: 0, run: null, save: null };
window.Game = Game;

function S() { return STRINGS[Game.lang] || STRINGS.ru; }
function L(key) { const u = S().ui; return u[key] !== undefined ? u[key] : (STRINGS.ru.ui[key] !== undefined ? STRINGS.ru.ui[key] : key); }

// ==== 4. SAVE SYSTEM ====
const Save = {
  ok: true,
  defaults() {
    return {
      version: CONFIG.SAVE_VERSION, ash: 0, spent: 0,
      meta: {},
      unlocked: { chars: ['iren'], biomes: ['cemetery'], nightmare: false, curses: false },
      stats: { kills: 0, runs: 0, wins: 0, embers: 0, time: 0, ashTotal: 0, flashes: 0, lamps: 0, bosses: {}, bestTime: 0,
        weaponUse: {}, winsByChar: {}, winsByBiome: {}, dailies: 0 },
      codex: { w: {}, p: {}, e: {}, evo: {} },
      ach: {},
      daily: { day: 0, result: null },
      skins: {}, skinSel: {}, skinsOwned: 0,
      tutorial: false,
      settings: { master: 0.8, music: 0.6, sfx: 0.8, lang: null, quality: 'auto', shake: true, dmgNums: true, vibrate: true,
        joy: 'float', joySide: 'left', fps: false, colorblind: false, reduceFlash: false, noInvert: false, uiScale: 1 },
    };
  },
  merge(def, src) {
    if (!src || typeof src !== 'object') return def;
    for (const k of Object.keys(src)) {
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) def[k] = Save.merge(def[k], src[k]);
      else def[k] = src[k];
    }
    return def;
  },
  migrate(d) {
    // v1 → v2: отдельный словарь побед по землям
    if (!d.version || d.version < 2) { d.stats = d.stats || {}; d.stats.winsByBiome = d.stats.winsByBiome || {}; d.version = 2; }
    return d;
  },
  load() {
    let raw = null;
    try { raw = localStorage.getItem(CONFIG.SAVE_KEY); localStorage.setItem('lastTorch.probe', '1'); localStorage.removeItem('lastTorch.probe'); }
    catch (e) { Save.ok = false; }
    let data = Save.defaults();
    if (raw) { try { data = Save.merge(Save.defaults(), Save.migrate(JSON.parse(raw))); } catch (e) { /* повреждённое сохранение — начинаем заново */ } }
    Game.save = data;
    return data;
  },
  write() {
    if (!Save.ok) return;
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(Game.save)); } catch (e) { Save.ok = false; }
  },
  exportStr() { try { return btoa(unescape(encodeURIComponent(JSON.stringify(Game.save)))); } catch (e) { return ''; } },
  importStr(str) {
    try { const d = JSON.parse(decodeURIComponent(escape(atob(str.trim())))); if (!d || typeof d !== 'object' || !d.stats) return false;
      Game.save = Save.merge(Save.defaults(), Save.migrate(d)); Save.write(); return true; } catch (e) { return false; }
  },
  saveRun(snapshot) { if (!Save.ok) return; try { localStorage.setItem(CONFIG.RUN_KEY, JSON.stringify(snapshot)); } catch (e) { /* нет места */ } },
  loadRun() { if (!Save.ok) return null; try { const r = localStorage.getItem(CONFIG.RUN_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } },
  clearRun() { if (!Save.ok) return; try { localStorage.removeItem(CONFIG.RUN_KEY); } catch (e) { /* ignore */ } },
};

// ==== 5. AUDIO ENGINE ====
const Audio = {
  ctx: null, master: null, music: null, sfx: null, rev: null, noise: null, active: {}, total: 0,
  ksCache: {}, whisperNode: null, whisperGain: null, heartT: 0,
  init() {
    if (Audio.ctx) { if (Audio.ctx.state === 'suspended') Audio.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = Audio.ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    Audio.master = ctx.createGain(); Audio.master.connect(comp);
    Audio.music = ctx.createGain(); Audio.music.connect(Audio.master);
    Audio.sfx = ctx.createGain(); Audio.sfx.connect(Audio.master);
    // синтезированная импульсная характеристика для реверба
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    Audio.rev = ctx.createConvolver(); Audio.rev.buffer = ir;
    const revGain = ctx.createGain(); revGain.gain.value = 0.5; Audio.rev.connect(revGain); revGain.connect(Audio.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    Audio.noise = nb;
    Audio.applyVolumes();
    Music.start();
  },
  applyVolumes() {
    if (!Audio.ctx) return; const s = Game.save.settings, t = Audio.ctx.currentTime;
    Audio.master.gain.setTargetAtTime(s.master, t, 0.05);
    Audio.music.gain.setTargetAtTime(s.music * 0.55, t, 0.05);
    Audio.sfx.gain.setTargetAtTime(s.sfx * 0.7, t, 0.05);
  },
  // ограничение полифонии: не больше 8 одинаковых и 32 всего
  claim(name, dur) {
    const n = Audio.active[name] || 0; if (n >= 8 || Audio.total >= 32) return false;
    Audio.active[name] = n + 1; Audio.total++;
    setTimeout(() => { Audio.active[name]--; Audio.total--; }, dur * 1000 + 30);
    return true;
  },
  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.005, dest = null, when = 0, rev = 0 } = {}) {
    const ctx = Audio.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || Audio.sfx); if (rev) { const rg = ctx.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(Audio.rev); }
    o.start(t); o.stop(t + dur + 0.02);
  },
  burst(dur, { freq = 1200, q = 1, vol = 0.3, type = 'bandpass', slide = 0, dest = null, when = 0, rev = 0 } = {}) {
    const ctx = Audio.ctx, t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = Audio.noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || Audio.sfx); if (rev) { const rg = ctx.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(Audio.rev); }
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(name, p = 1) {
    if (!Audio.ctx || Audio.ctx.state !== 'running') return;
    const v = 1 + (Math.random() - 0.5) * 0.1; // ±5% высоты
    const def = SFX[name]; if (!def) return;
    if (!Audio.claim(name, def.d)) return;
    def.f(v, p);
  },
  pluck(freq, vol = 0.25, when = 0, dest = null) {
    const ctx = Audio.ctx; const key = Math.round(freq);
    let buf = Audio.ksCache[key];
    if (!buf) {
      const sr = ctx.sampleRate, len = Math.floor(sr * 1.6), N = Math.max(2, Math.floor(sr / freq));
      buf = ctx.createBuffer(1, len, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
      for (let i = N; i < len; i++) d[i] = 0.498 * (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]);
      Audio.ksCache[key] = buf;
    }
    const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(dest || Audio.music); const rg = ctx.createGain(); rg.gain.value = 0.35; g.connect(rg); rg.connect(Audio.rev);
    s.start(ctx.currentTime + when);
  },
  setWhisper(level) {
    if (!Audio.ctx) return;
    if (!Audio.whisperNode) {
      const ctx = Audio.ctx, s = ctx.createBufferSource(); s.buffer = Audio.noise; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 8;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 3.3; lg.gain.value = 500; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(Audio.sfx); const rg = ctx.createGain(); rg.gain.value = 0.6; g.connect(rg); rg.connect(Audio.rev);
      s.start(); Audio.whisperNode = s; Audio.whisperGain = g;
    }
    Audio.whisperGain.gain.setTargetAtTime(level * 0.35, Audio.ctx.currentTime, 0.3);
  },
};

// Описания звуков: d — длительность (для лимита полифонии), f — синтез
const SFX = {
  slash: { d: .2, f: v => Audio.burst(.18, { freq: 2600 * v, q: 1.2, vol: .22, slide: .35 }) },
  shovel: { d: .25, f: v => { Audio.burst(.2, { freq: 700 * v, q: 3, vol: .18, slide: 2 }); Audio.tone(220 * v, .12, { type: 'triangle', vol: .08 }); } },
  poison: { d: .4, f: v => Audio.burst(.4, { freq: 500 * v, q: .7, vol: .12, type: 'lowpass', slide: 2.2 }) },
  hammer: { d: .5, f: v => { Audio.tone(90 * v, .45, { vol: .45, slide: .4 }); Audio.burst(.35, { freq: 900, vol: .25, type: 'lowpass', slide: .2 }); } },
  dagger: { d: .12, f: v => Audio.burst(.09, { freq: 4200 * v, q: 4, vol: .12, slide: .6 }) },
  flask: { d: .4, f: v => { Audio.tone(900 * v, .06, { type: 'triangle', vol: .12 }); Audio.burst(.35, { freq: 1400, vol: .18, type: 'highpass', when: .05 }); } },
  censer: { d: .2, f: v => Audio.tone(660 * v, .18, { type: 'sine', vol: .07, rev: .4 }) },
  zap: { d: .25, f: v => { Audio.tone(1400 * v, .18, { type: 'square', vol: .1, slide: .25 }); Audio.burst(.15, { freq: 5000, vol: .12, type: 'highpass' }); } },
  arrow: { d: .2, f: v => Audio.tone(1200 * v, .16, { type: 'sine', vol: .08, slide: 1.8, rev: .5 }) },
  rune: { d: .5, f: v => { Audio.tone(70 * v, .5, { vol: .4, slide: .5 }); Audio.burst(.45, { freq: 400, vol: .3, type: 'lowpass', slide: .3 }); } },
  ice: { d: .2, f: v => { Audio.tone(2400 * v, .12, { type: 'triangle', vol: .08, slide: .7 }); Audio.tone(3600 * v, .08, { type: 'sine', vol: .05 }); } },
  black: { d: .6, f: v => { Audio.tone(55 * v, .6, { type: 'sawtooth', vol: .12, slide: 2 }); Audio.burst(.5, { freq: 300, vol: .2, type: 'lowpass', slide: 3 }); } },
  crossbow: { d: .2, f: v => { Audio.burst(.12, { freq: 900 * v, q: 3, vol: .2, slide: .4 }); Audio.tone(140 * v, .1, { type: 'triangle', vol: .12 }); } },
  bell: { d: 1.5, f: v => { [1, 2.76, 5.4].forEach((m, i) => Audio.tone(196 * m * v, 1.4 - i * .3, { type: 'sine', vol: .14 / (i + 1), rev: .8 })); } },
  hit: { d: .06, f: v => Audio.burst(.05, { freq: 1800 * v, q: 2, vol: .08 }) },
  kill: { d: .12, f: v => { Audio.burst(.1, { freq: 600 * v, q: 1, vol: .1, type: 'lowpass', slide: .5 }); } },
  ember: { d: .1, f: (v, p) => Audio.tone(880 * Math.pow(1.0595, p % 24), .08, { type: 'sine', vol: .07 }) },
  levelup: { d: .8, f: () => { [523, 659, 784, 1047].forEach((f, i) => Audio.tone(f, .35, { type: 'triangle', vol: .16, when: i * .07, rev: .5 })); } },
  chest: { d: 1.4, f: () => { [392, 440, 494, 523, 587, 659, 784, 1047].forEach((f, i) => Audio.tone(f, .3, { type: 'triangle', vol: .12, when: i * .12, rev: .6 })); } },
  evolve: { d: 1.5, f: () => { [262, 330, 392, 523, 659, 784].forEach((f, i) => Audio.tone(f, 1, { type: 'sawtooth', vol: .06, when: i * .05, rev: .8 })); Audio.tone(1047, 1.2, { vol: .15, when: .3, rev: .8 }); } },
  hurt: { d: .25, f: v => { Audio.tone(180 * v, .22, { type: 'square', vol: .14, slide: .5 }); Audio.burst(.12, { freq: 700, vol: .15, type: 'lowpass' }); } },
  roar: { d: 1.6, f: () => { Audio.tone(60, 1.5, { type: 'sawtooth', vol: .25, slide: .6, attack: .2 }); Audio.burst(1.4, { freq: 300, q: 2, vol: .3, slide: .4, rev: .6 }); } },
  flash: { d: .9, f: () => { Audio.burst(.8, { freq: 3000, vol: .35, type: 'highpass', slide: .2, rev: .8 }); Audio.tone(110, .7, { vol: .35, slide: .3 }); } },
  click: { d: .06, f: () => Audio.tone(1200, .04, { type: 'triangle', vol: .08 }) },
  lamp: { d: .5, f: () => { Audio.burst(.2, { freq: 5000, vol: .18, type: 'highpass' }); Audio.tone(784, .45, { type: 'sine', vol: .12, rev: .7, when: .05 }); } },
  explode: { d: .5, f: v => { Audio.tone(80 * v, .4, { vol: .3, slide: .3 }); Audio.burst(.4, { freq: 1200, vol: .28, type: 'lowpass', slide: .15 }); } },
  heal: { d: .5, f: () => { Audio.tone(660, .3, { type: 'sine', vol: .1, rev: .6 }); Audio.tone(990, .3, { type: 'sine', vol: .08, when: .08, rev: .6 }); } },
  heart: { d: .3, f: () => { Audio.tone(55, .12, { vol: .35 }); Audio.tone(50, .12, { vol: .25, when: .16 }); } },
  shoot: { d: .15, f: v => Audio.tone(300 * v, .14, { type: 'triangle', vol: .08, slide: .5 }) },
  warn: { d: .5, f: () => Audio.tone(440, .4, { type: 'square', vol: .06, slide: .5 }) },
  eclipse: { d: 2, f: () => { Audio.tone(40, 2, { type: 'sawtooth', vol: .25, slide: 3, attack: .4 }); Audio.burst(1.8, { freq: 200, vol: .3, type: 'lowpass', slide: 8, rev: 1 }); } },
  dawn: { d: 3, f: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => Audio.tone(f, 2.5, { type: 'sine', vol: .12, when: i * .25, rev: 1 })); } },
  death: { d: 2, f: () => { Audio.tone(220, 1.6, { type: 'triangle', vol: .2, slide: .25, rev: .8 }); Audio.burst(1.2, { freq: 600, vol: .2, type: 'lowpass', slide: .1, rev: .8 }); } },
};

// Процедурная музыка: планировщик с упреждением
const Music = {
  mode: 'camp', biome: 'cemetery', intensity: 0, boss: false, next: 0, step: 0, timer: null, droneNodes: [],
  SCALES: { aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] },
  ROOTS: { cemetery: 55, cathedral: 49, wastes: 58.27, abyss: 46.25, camp: 65.41 },
  start() {
    if (Music.timer) return;
    Music.next = Audio.ctx.currentTime + 0.1;
    Music.timer = setInterval(Music.tick, 90);
    Music.setDrone();
  },
  set(mode, biome) { const changed = mode !== Music.mode || (biome && biome !== Music.biome); Music.mode = mode; if (biome) Music.biome = biome; if (changed && Audio.ctx) Music.setDrone(); },
  setDrone() {
    const ctx = Audio.ctx; if (!ctx) return; const t = ctx.currentTime;
    for (const n of Music.droneNodes) { try { n.g.gain.setTargetAtTime(0, t, 0.8); n.o.stop(t + 4); } catch (e) { /* ok */ } }
    Music.droneNodes = [];
    if (Music.mode === 'silent') return;
    const root = Music.mode === 'camp' ? Music.ROOTS.camp : Music.mode === 'dawn' ? 65.41 : Music.ROOTS[Music.biome] || 55;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = Music.mode === 'camp' ? 500 : 380; fl.Q.value = 2; fl.connect(Audio.music);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 160; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
    [[1, 'sawtooth', .05], [1.5, 'sawtooth', .03], [2.003, 'triangle', .04], [0.5, 'sine', .09]].forEach(([m, type, vol]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = root * m; o.detune.value = rand(-7, 7);
      g.gain.value = 0; g.gain.setTargetAtTime(vol * (Music.mode === 'camp' ? .5 : 1), t, 1.5); o.connect(g); g.connect(fl); o.start(); Music.droneNodes.push({ o, g });
    });
    Music.droneNodes.push({ o: lfo, g: lg });
  },
  note(deg, oct = 0) {
    const sc = Music.mode === 'dawn' ? Music.SCALES.major : Music.biome === 'abyss' || Music.biome === 'wastes' ? Music.SCALES.phrygian : Music.SCALES.aeolian;
    const root = Music.mode === 'camp' ? Music.ROOTS.camp : Music.ROOTS[Music.biome] || 55;
    const n = sc.length, o = Math.floor(deg / n), d = ((deg % n) + n) % n;
    return root * Math.pow(2, oct + o + sc[d] / 12);
  },
  tick() {
    const ctx = Audio.ctx; if (!ctx || ctx.state !== 'running') return;
    const bpm = Music.boss ? 132 : Music.mode === 'camp' ? 76 : 96 + Music.intensity * 6, sp = 60 / bpm / 2;
    while (Music.next < ctx.currentTime + 0.25) { Music.play(Music.step, Music.next - ctx.currentTime, sp); Music.step++; Music.next += sp; }
  },
  play(s, when, sp) {
    const dm = Music.mode, I = Music.boss ? 4 : Music.intensity, bar = s % 16;
    if (dm === 'camp') {
      const prog = [0, 5, 3, 4][Math.floor(s / 16) % 4];
      if (s % 2 === 0) Audio.pluck(Music.note(prog + [0, 2, 4, 7, 4, 2, 0, 4][(s / 2) % 8 | 0], 2), .22, when);
      if (Math.random() < .5) Audio.burst(.03, { freq: 3000, q: .5, vol: .03, type: 'highpass', when, dest: Audio.music }); // потрескивание костра
      return;
    }
    if (dm === 'dawn') { if (s % 4 === 0) Audio.tone(Music.note([0, 2, 4, 7, 9, 4][(s / 4) % 6 | 0], 3), 2.2, { vol: .08, when, dest: Audio.music, rev: .9 }); return; }
    if (dm !== 'run') return;
    // колокольные ноты
    if (s % 8 === 0 && Math.random() < .6) Audio.tone(Music.note(pick([0, 2, 4, 5, 7]), 3), 2.4, { type: 'sine', vol: .05, when, dest: Audio.music, rev: 1 });
    if (I >= 1) { // барабаны
      if (bar % 4 === 0) Audio.tone(58, .25, { vol: .28, slide: .5, when, dest: Audio.music });
      if (bar % 8 === 4) Audio.burst(.12, { freq: 1500, vol: .1, when, dest: Audio.music });
      if (I >= 3 && bar % 2 === 1) Audio.burst(.04, { freq: 7000, vol: .04, type: 'highpass', when, dest: Audio.music });
    }
    if (I >= 2 && s % 2 === 0) { // бас
      const deg = [0, 0, 5, 5, 3, 3, 4, 4][(s / 4 | 0) % 8];
      Audio.tone(Music.note(deg, 1), sp * 1.8, { type: 'sawtooth', vol: .05, when, dest: Audio.music });
    }
    if (I >= 3) { // остинато
      Audio.tone(Music.note([0, 3, 4, 7, 4, 3, 2, 3][s % 8], 3), sp * .9, { type: 'triangle', vol: Music.boss ? .05 : .035, when, dest: Audio.music });
    }
    if (Music.boss && bar % 4 === 2) Audio.tone(Music.note(1, 2), sp * 1.5, { type: 'square', vol: .025, when, dest: Audio.music });
  },
};
