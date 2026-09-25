// ==== 9. DATA: characters, weapons, passives, enemies, bosses, biomes, waves ====
const BASE_STATS = { maxHp: 100, speed: 150, armor: 0, regen: 0, might: 1, area: 1, projSpeed: 1, duration: 1, cooldown: 1, luck: 1,
  magnet: 1, growth: 1, light: 1, lightR: 1, amount: 0, revival: 0, greed: 1, lifesteal: 0, freeze: 0, dodge: 0, poison: 1, decay: 1 };

const CHARS = [
  { id: 'iren', col: '#6a5a8a', trim: '#d4a94a', weapon: 'blade', mod: { lightR: 1.1 }, unlock: () => true },
  { id: 'borg', col: '#4a4a3a', trim: '#8a7a5a', weapon: 'shovel', mod: { maxHp: 1.2, speed: 0.9 }, unlock: s => s.stats.kills >= 1000 },
  { id: 'veyla', col: '#3a5a3a', trim: '#9ac87a', weapon: 'poison', mod: { poison: 1.25 }, unlock: s => s.stats.bestTime >= 600 },
  { id: 'cassian', col: '#7a7a8a', trim: '#e8dcc4', weapon: 'hammer', mod: {}, armorPer10: true, unlock: s => !!s.stats.bosses.rotmother },
  { id: 'nyx', col: '#2a2a3a', trim: '#8a3a4a', weapon: 'daggers', mod: { speed: 1.15, dodge: 0.1 }, unlock: s => s.stats.embers >= 5000 },
  { id: 'morten', col: '#6a4a2a', trim: '#ff7a1a', weapon: 'flask', mod: { growth: 1.2 }, unlock: s => Object.keys(s.codex.evo).length >= 10 },
  { id: 'ulrich', col: '#1e1e22', trim: '#c9c0a8', weapon: 'censer', mod: {}, whisperImmune: true, unlock: s => !!s.stats.winNightmare },
  { id: 'hollow', col: '#0e0c10', trim: '#5a3a8a', weapon: 'black', mod: { might: 2 }, noLight: true, secret: true,
    unlock: s => ['iren', 'borg', 'veyla', 'cassian', 'nyx', 'morten', 'ulrich'].every(c => s.stats.winsByChar[c]) },
];
const CHAR = Object.fromEntries(CHARS.map(c => [c.id, c]));

// Оружие: base — стартовые значения, lv — прибавки на уровнях 2..8
// cd со знаком минус — проценты сокращения; area/speed — доли
const WEAPONS = [
  { id: 'blade', evoP: 'reliquary', snd: 'slash', glow: 'gold', base: { dmg: 14, cd: 1.2, area: 1, amount: 1 },
    lv: [{ amount: 1 }, { dmg: 6 }, { area: .2 }, { dmg: 6 }, { cd: -.15 }, { area: .2 }, { dmg: 10, burn: 1 }] },
  { id: 'shovel', evoP: 'chains', snd: 'shovel', glow: 'white', base: { dmg: 13, cd: 1.6, amount: 1, speed: 1, area: 1 },
    lv: [{ amount: 1 }, { dmg: 6 }, { speed: .2 }, { amount: 1 }, { dmg: 8 }, { area: .25 }, { amount: 1, dmg: 6 }] },
  { id: 'poison', evoP: 'wormwood', snd: 'poison', glow: 'green', base: { dmg: 6, cd: 3.0, area: 1, dur: 3, amount: 1 },
    lv: [{ dmg: 3 }, { area: .2 }, { amount: 1 }, { dur: 1 }, { dmg: 4 }, { amount: 1 }, { area: .3, dmg: 4 }] },
  { id: 'hammer', evoP: 'relic', snd: 'hammer', glow: 'gold', base: { dmg: 32, cd: 2.6, area: 1, amount: 1 },
    lv: [{ dmg: 10 }, { amount: 1 }, { area: .2 }, { cd: -.15 }, { dmg: 15 }, { amount: 1 }, { area: .3, dmg: 15 }] },
  { id: 'daggers', evoP: 'glove', snd: 'dagger', glow: 'white', base: { dmg: 10, cd: 0.9, amount: 2, speed: 1, pierce: 1 },
    lv: [{ amount: 1 }, { dmg: 4 }, { pierce: 1 }, { amount: 1 }, { cd: -.15 }, { dmg: 5 }, { amount: 2, pierce: 1 }] },
  { id: 'flask', evoP: 'lamp', snd: 'flask', glow: 'fire', base: { dmg: 8, cd: 3.2, area: 1, dur: 2.5, amount: 1 },
    lv: [{ dmg: 3 }, { amount: 1 }, { area: .2 }, { dur: 1 }, { dmg: 4 }, { amount: 1 }, { area: .3, dmg: 5 }] },
  { id: 'censer', evoP: 'beads', snd: 'censer', glow: 'gold', base: { dmg: 10, cd: 0, area: 1, amount: 1, speed: 1 },
    lv: [{ amount: 1 }, { dmg: 4 }, { area: .2 }, { speed: .25 }, { amount: 1 }, { dmg: 6 }, { amount: 1, area: .2 }] },
  { id: 'lightning', evoP: 'stormstone', snd: 'zap', glow: 'ice', base: { dmg: 16, cd: 1.8, amount: 1, chain: 2 },
    lv: [{ chain: 1 }, { dmg: 6 }, { amount: 1 }, { chain: 1 }, { cd: -.15 }, { dmg: 8 }, { chain: 2, amount: 1 }] },
  { id: 'arrows', evoP: 'feather', snd: 'arrow', glow: 'green', base: { dmg: 10, cd: 1.3, amount: 2, speed: 1, pierce: 1 },
    lv: [{ amount: 1 }, { dmg: 4 }, { speed: .2 }, { amount: 1 }, { dmg: 5 }, { cd: -.15 }, { amount: 2, pierce: 1 }] },
  { id: 'rune', evoP: 'bloodvial', snd: 'rune', glow: 'blood', base: { dmg: 42, cd: 3.0, area: 1, amount: 1 },
    lv: [{ dmg: 12 }, { area: .2 }, { cd: -.15 }, { amount: 1 }, { dmg: 15 }, { area: .25 }, { dmg: 20, amount: 1 }] },
  { id: 'ice', evoP: 'frost', snd: 'ice', glow: 'ice', base: { dmg: 12, cd: 1.4, amount: 1, speed: 1, pierce: 2, freeze: .25 },
    lv: [{ amount: 1 }, { dmg: 5 }, { pierce: 1 }, { freeze: .1 }, { amount: 1 }, { dmg: 6 }, { pierce: 2, freeze: .15 }] },
  { id: 'black', evoP: 'abyssheart', snd: 'black', glow: 'violet', secret: true, base: { dmg: 24, cd: 2.2, area: 1, amount: 1 },
    lv: [{ dmg: 8 }, { area: .2 }, { cd: -.15 }, { dmg: 10 }, { amount: 1 }, { area: .2 }, { dmg: 15 }] },
];
const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Пассивы: apply(stats, lv) меняет итоговые характеристики
const PASSIVES = [
  { id: 'reliquary', apply: (s, l) => { s.might += .1 * l; } },
  { id: 'relic', apply: (s, l) => { s.area += .1 * l; } },
  { id: 'chains', apply: (s, l) => { s.amount += l >= 5 ? 3 : l >= 3 ? 2 : 1; } },
  { id: 'wormwood', apply: (s, l) => { s.duration += .1 * l; } },
  { id: 'glove', apply: (s, l) => { s.cooldown *= 1 - .08 * l; } },
  { id: 'lamp', apply: (s, l) => { s.light += .15 * l; s.decay *= 1 - .1 * l; } },
  { id: 'beads', apply: (s, l) => { s.projSpeed += .1 * l; } },
  { id: 'stormstone', apply: (s, l) => { s.luck += .1 * l; } },
  { id: 'feather', apply: (s, l) => { s.magnet += .2 * l; } },
  { id: 'bloodvial', apply: (s, l) => { s.lifesteal += .01 * l * .25; } },
  { id: 'frost', apply: (s, l) => { s.freeze += .1 * l; } },
  { id: 'boots', apply: (s, l) => { s.speed *= 1 + .08 * l; } },
  { id: 'cuirass', apply: (s, l) => { s.armor += l; } },
  { id: 'phoenix', max: 2, apply: (s, l) => { s.revival += l; } },
  { id: 'crown', apply: (s, l) => { s.growth += .08 * l; s.greed += .08 * l; } },
  { id: 'abyssheart', secret: true, max: 1, apply: (s, l) => { s.might += .2 * l; s.area += .1 * l; s.decay *= 1.25; } },
];
const PASSIVE = Object.fromEntries(PASSIVES.map(p => [p.id, p]));

// Враги. beh: поведение; from/until — окно появления в секундах; bio — только в этих землях
const ENEMIES = [
  { id: 'ghoul', hp: 9, spd: 60, dmg: 8, r: 14, xp: 1, from: 0, until: 360, w: 10, beh: 'chase' },
  { id: 'bat', hp: 6, spd: 105, dmg: 5, r: 10, xp: 1, from: 30, until: 480, w: 7, beh: 'zigzag' },
  { id: 'skeleton', hp: 28, spd: 64, dmg: 10, r: 15, xp: 2, from: 90, until: 720, w: 8, beh: 'chase' },
  { id: 'drowned', hp: 46, spd: 44, dmg: 12, r: 17, xp: 3, from: 180, w: 5, beh: 'puddle' },
  { id: 'shade', hp: 30, spd: 78, dmg: 10, r: 15, xp: 3, from: 240, w: 4, beh: 'shade' },
  { id: 'gargoyle', hp: 85, spd: 50, dmg: 14, r: 18, xp: 5, from: 300, w: 4, beh: 'dash', armor: 3 },
  { id: 'cultist', hp: 40, spd: 58, dmg: 9, r: 15, xp: 4, from: 360, w: 3, beh: 'ranged' },
  { id: 'spider', hp: 95, spd: 48, dmg: 12, r: 19, xp: 6, from: 420, w: 3, beh: 'brood' },
  { id: 'spiderling', hp: 8, spd: 120, dmg: 5, r: 8, xp: 1, from: 9999, w: 0, beh: 'chase' },
  { id: 'knight', hp: 320, spd: 40, dmg: 20, r: 26, xp: 20, from: 540, w: 2, beh: 'shield' },
  { id: 'eater', hp: 160, spd: 68, dmg: 14, r: 22, xp: 10, from: 660, w: 2, beh: 'eater', glow: 'violet' },
  { id: 'banshee', hp: 130, spd: 74, dmg: 12, r: 18, xp: 8, from: 720, w: 2, beh: 'scream' },
  { id: 'worm', hp: 24, spd: 70, dmg: 9, r: 14, xp: 2, from: 60, w: 4, beh: 'burrow', bio: ['cemetery'] },
  { id: 'wraith', hp: 50, spd: 90, dmg: 11, r: 15, xp: 4, from: 270, w: 3, beh: 'zigzag', bio: ['cemetery'] },
  { id: 'chorister', hp: 60, spd: 50, dmg: 10, r: 16, xp: 4, from: 120, w: 4, beh: 'ranged', bio: ['cathedral'] },
  { id: 'stained', hp: 220, spd: 42, dmg: 16, r: 24, xp: 12, from: 420, w: 2, beh: 'shield', bio: ['cathedral'] },
  { id: 'imp', hp: 30, spd: 88, dmg: 10, r: 13, xp: 3, from: 90, w: 5, beh: 'explode', bio: ['wastes'], glow: 'fire' },
  { id: 'golem', hp: 180, spd: 38, dmg: 18, r: 24, xp: 10, from: 360, w: 3, beh: 'brood', bio: ['wastes'] },
  { id: 'voideye', hp: 70, spd: 45, dmg: 10, r: 17, xp: 5, from: 180, w: 4, beh: 'ranged3', bio: ['abyss'], glow: 'violet' },
  { id: 'wisp', hp: 40, spd: 60, dmg: 9, r: 12, xp: 3, from: 60, w: 5, beh: 'dash', bio: ['abyss'], glow: 'violet' },
];
const ENEMY = Object.fromEntries(ENEMIES.map(e => [e.id, e]));

const BOSSES = {
  rotmother: { hp: 3200, spd: 42, dmg: 22, r: 60, time: 300 },
  bishop: { hp: 9500, spd: 55, dmg: 26, r: 48, time: 600 },
  shepherd: { hp: 26000, spd: 50, dmg: 32, r: 80, time: 840 },
};

const BIOMES = [
  { id: 'cemetery', dark: [6, 8, 6], fog: 'rgba(160,170,150,', decay: 1, lamps: 1, unlock: () => true },
  { id: 'cathedral', dark: [4, 7, 10], fog: 'rgba(120,150,170,', decay: 1, lamps: .7, unlock: s => !!s.stats.winsByBiome.cemetery },
  { id: 'wastes', dark: [10, 5, 3], fog: 'rgba(170,110,80,', decay: 1.3, lamps: .8, hot: true, unlock: s => !!s.stats.winsByBiome.cathedral },
  { id: 'abyss', dark: [7, 3, 12], fog: 'rgba(130,90,190,', decay: 1.1, lamps: .8, gravity: true, unlock: s => !!s.stats.winsByBiome.wastes },
];
const BIOME = Object.fromEntries(BIOMES.map(b => [b.id, b]));

const META = [
  { id: 'might', max: 5, apply: (s, l) => { s.might += .05 * l; } },
  { id: 'armor', max: 5, apply: (s, l) => { s.armor += l; } },
  { id: 'maxhp', max: 5, apply: (s, l) => { s.maxHp *= 1 + .1 * l; } },
  { id: 'regen', max: 5, apply: (s, l) => { s.regen += .2 * l; } },
  { id: 'speed', max: 5, apply: (s, l) => { s.speed *= 1 + .05 * l; } },
  { id: 'area', max: 5, apply: (s, l) => { s.area += .05 * l; } },
  { id: 'duration', max: 5, apply: (s, l) => { s.duration += .05 * l; } },
  { id: 'cooldown', max: 5, apply: (s, l) => { s.cooldown *= 1 - .03 * l; } },
  { id: 'luck', max: 5, apply: (s, l) => { s.luck += .05 * l; } },
  { id: 'magnet', max: 5, apply: (s, l) => { s.magnet += .15 * l; } },
  { id: 'growth', max: 5, apply: (s, l) => { s.growth += .04 * l; } },
  { id: 'greed', max: 5, apply: (s, l) => { s.greed += .1 * l; } },
  { id: 'light', max: 5, apply: (s, l) => { s.light += .06 * l; } },
  { id: 'revival', max: 1, apply: (s, l) => { s.revival += l; } },
  { id: 'reroll', max: 5, apply: () => {} },
  { id: 'skip', max: 5, apply: () => {} },
  { id: 'banish', max: 5, apply: () => {} },
];

const CURSES = ['swarm', 'fury', 'iron', 'dim', 'fragile', 'noregen', 'elites', 'shortflash', 'fewchoice', 'hunger'];

// Испытания: check(save, r) — r это итоги только что завершённого забега (или null)
const ACHIEVEMENTS = [
  ['kill100', 50, s => s.stats.kills >= 100], ['kill1k', 100, s => s.stats.kills >= 1000], ['kill10k', 300, s => s.stats.kills >= 10000], ['kill100k', 1500, s => s.stats.kills >= 100000],
  ['surv5', 100, s => s.stats.bestTime >= 300], ['surv10', 200, s => s.stats.bestTime >= 600], ['win1', 400, s => s.stats.wins >= 1],
  ['winNight', 800, s => !!s.stats.winNightmare], ['winEvery', 1500, s => CHARS.slice(0, 7).every(c => s.stats.winsByChar[c.id])],
  ['boss1', 150, s => !!s.stats.bosses.rotmother], ['boss2', 300, s => !!s.stats.bosses.bishop], ['boss3', 500, s => !!s.stats.bosses.shepherd],
  ['evo1', 100, s => Object.keys(s.codex.evo).length >= 1], ['evo5', 300, s => Object.keys(s.codex.evo).length >= 5],
  ['evo10', 600, s => Object.keys(s.codex.evo).length >= 10], ['evoAll', 1500, s => Object.keys(s.codex.evo).length >= 12],
  ['lvl30', 150, (s, r) => r && r.level >= 30], ['lvl50', 400, (s, r) => r && r.level >= 50],
  ['flash50', 100, s => s.stats.flashes >= 50], ['lamps100', 150, s => s.stats.lamps >= 100], ['embers5k', 200, s => s.stats.embers >= 5000],
  ['noPassWin', 600, (s, r) => r && r.win && r.passives === 0], ['brightWin', 600, (s, r) => r && r.win && r.minLightAfter1 >= .5],
  ['still5', 300, (s, r) => r && r.stillTime >= 300], ['daily1', 100, s => s.stats.dailies >= 1], ['daily7', 400, s => s.stats.dailies >= 7],
  ['runs10', 100, s => s.stats.runs >= 10], ['runs50', 400, s => s.stats.runs >= 50], ['ash10k', 500, s => s.stats.ashTotal >= 10000],
  ['maxWeapons', 150, (s, r) => r && r.weapons >= 6], ['maxPassives', 150, (s, r) => r && r.passives >= 6],
  ['cathedralWin', 500, s => !!s.stats.winsByBiome.cathedral], ['wastesWin', 700, s => !!s.stats.winsByBiome.wastes], ['abyssWin', 1000, s => !!s.stats.winsByBiome.abyss],
  ['curse5', 800, (s, r) => r && r.win && r.curses >= 5], ['curse10', 2000, (s, r) => r && r.win && r.curses >= 10],
  ['endless20', 600, (s, r) => r && r.time >= 1200], ['whisper60', 150, (s, r) => r && r.whisperTime >= 60], ['noHit3', 300, (s, r) => r && r.bestNoHit >= 180],
  ['codex100', 2000, s => Codex.percent(s) >= 100], ['ghost', 300, (s, r) => r && r.ghost], ['hollowWin', 1500, s => !!s.stats.winsByChar.hollow],
  ['dmg1m', 400, (s, r) => r && r.totalDmg >= 1e6], ['kills5kRun', 300, (s, r) => r && r.kills >= 5000], ['boss3nm', 1000, s => !!s.stats.shepherdNightmare],
].map(([id, reward, check]) => ({ id, reward, check }));

const Codex = {
  total() { return WEAPONS.length * 2 + PASSIVES.length + ENEMIES.length + Object.keys(BOSSES).length; },
  percent(s) {
    const n = Object.keys(s.codex.w).length + Object.keys(s.codex.evo).length + Object.keys(s.codex.p).length + Object.keys(s.codex.e).length;
    return Math.min(100, Math.round(n / Codex.total() * 100));
  },
};
