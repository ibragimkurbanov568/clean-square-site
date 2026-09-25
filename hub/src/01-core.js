'use strict';
(() => {
// ==== 1. CONFIG ====
const CFG = {
  SAVE_KEY: 'midnightHub.v1', STEP: 1 / 60, MAX_STEPS: 5,
  DRIFT_MIN_ANGLE: 0.2, DRIFT_MIN_SPEED: 7, DRIFT_MULT_EVERY: 2.2, DRIFT_MULT_MAX: 6, DRIFT_BANK_DELAY: 1.1,
  MONEY_PER_POINT: 0.06, CHALLENGE_TIME: 90, LAPS: 3, START_MONEY: 2500,
  QUALITY: { low: { pr: 1, shadow: 0, parts: .4 }, mid: { pr: 1.25, shadow: 1024, parts: .75 }, high: { pr: 2, shadow: 2048, parts: 1 } },
};

// ==== 2. STRINGS ====
const STR = {
  ru: {
    hub: 'Полночь', hubTag: 'Ночной игровой клуб', tapStart: 'Нажмите, чтобы начать', money: 'Деньги', back: 'Назад', play: 'Играть', settings: 'Настройки',
    mDrift: 'Дрифт и тюнинг', mDriftD: 'Уличный дрифт, гараж, 4 трассы и разная погода', mTorch: 'Последний Факел', mTorchD: 'Roguelike-выживание в тёмном фэнтези. Отдельная игра в папке game/',
    mArena: 'Арена: меч и автоматы', mArenaD: 'Бой от третьего лица', mParkour: 'Паркур', mParkourD: 'Бег, прыжки и стены', mTag: 'Догонялки', mTagD: 'Догони или убеги от ботов',
    ready: 'Готово', soon: 'В разработке', open: 'Открыть',
    garage: 'Гараж', race: 'На трассу', cars: 'Машины', buy: 'Купить', owned: 'Куплено', select: 'Выбрать', selected: 'Выбрана', price: 'Цена',
    tPaint: 'Кузов', tWheels: 'Диски', tStance: 'Посадка', tBody: 'Обвес', tGlass: 'Стёкла', tEngine: 'Тюнинг', tCars: 'Машины',
    paint: 'Цвет краски', custom: 'Свой цвет', finish: 'Покрытие', fGloss: 'Глянец', fMetallic: 'Металлик', fMatte: 'Мат', fPearl: 'Перламутр', fChrome: 'Хром',
    wheelStyle: 'Дизайн дисков', wheelColor: 'Цвет дисков', wheelSize: 'Размер дисков', caliper: 'Суппорты',
    height: 'Высота посадки', camber: 'Развал колёс', front: 'Передний бампер', rear: 'Задний бампер', hood: 'Капот', spoiler: 'Спойлер', skirts: 'Пороги',
    tint: 'Тонировка', neon: 'Подсветка днища', none: 'Нет', stock: 'Стоковый',
    upEngine: 'Двигатель', upTurbo: 'Турбина', upTires: 'Шины', upSusp: 'Подвеска', upWeight: 'Облегчение', upNitro: 'Нитро',
    sPower: 'Мощность', sGrip: 'Сцепление', sHandling: 'Управляемость', sWeight: 'Масса', sTop: 'Макс. скорость',
    chooseTrack: 'Трасса', chooseMode: 'Режим', start: 'Старт',
    modeFree: 'Свободный дрифт', modeFreeD: 'Катайтесь без ограничений, копите очки и деньги', modeChal: 'Дрифт-испытание', modeChalD: '90 секунд, чтобы набрать очки на медаль',
    modeTime: 'Круг на время', modeTimeD: '3 круга, лучшее время сохраняется',
    score: 'Очки', best: 'Рекорд', lap: 'Круг', time: 'Время', drift: 'ДРИФТ', crash: 'УДАР! Очки сгорели', perfect: 'ЧИСТО', great: 'ОТЛИЧНО', insane: 'БЕЗУМИЕ',
    angle: 'угол', paused: 'Пауза', resume: 'Продолжить', restart: 'Заново', toGarage: 'В гараж', toHub: 'В меню', results: 'Итоги',
    earned: 'Заработано', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', noMedal: 'Без медали', bestLap: 'Лучший круг', newRecord: 'Новый рекорд!',
    quality: 'Графика', qLow: 'Низкая', qMid: 'Средняя', qHigh: 'Высокая', volume: 'Громкость', music: 'Музыка', lang: 'Язык', units: 'Единицы', kmh: 'КМ/Ч', mph: 'MPH',
    camera: 'Камера', camChase: 'Сзади', camFar: 'Дальняя', camHood: 'С капота', controls: 'Управление',
    help: 'W/↑ газ · S/↓ тормоз · A/D руль · Пробел ручник · Shift нитро · C камера · Esc пауза', helpTouch: 'Кнопки на экране: руль слева, газ/тормоз/ручник/нитро справа',
    notEnough: 'Не хватает денег', bought: 'Куплено', lockedCar: 'Сначала купите машину', saved: 'Сохранено',
    hp: 'лс', kg: 'кг', mm: 'мм',
    weather: 'Погода', wRain: 'Ливень', wClear: 'Ясно, закат', wSnow: 'Снегопад', wDust: 'Пыльная буря', grip: 'сцепление',
  },
  en: {
    hub: 'Midnight', hubTag: 'Night game club', tapStart: 'Tap to start', money: 'Money', back: 'Back', play: 'Play', settings: 'Settings',
    mDrift: 'Drift & Tuning', mDriftD: 'Street drifting, garage, 4 tracks and weather', mTorch: 'The Last Torch', mTorchD: 'Dark fantasy survival roguelike. A separate game in game/',
    mArena: 'Arena: Swords & Guns', mArenaD: 'Third-person combat', mParkour: 'Parkour', mParkourD: 'Run, jump and wall-run', mTag: 'Tag', mTagD: 'Chase or escape the bots',
    ready: 'Ready', soon: 'In development', open: 'Open',
    garage: 'Garage', race: 'To the track', cars: 'Cars', buy: 'Buy', owned: 'Owned', select: 'Select', selected: 'Selected', price: 'Price',
    tPaint: 'Paint', tWheels: 'Wheels', tStance: 'Stance', tBody: 'Body kit', tGlass: 'Glass', tEngine: 'Tuning', tCars: 'Cars',
    paint: 'Paint colour', custom: 'Custom colour', finish: 'Finish', fGloss: 'Gloss', fMetallic: 'Metallic', fMatte: 'Matte', fPearl: 'Pearl', fChrome: 'Chrome',
    wheelStyle: 'Wheel design', wheelColor: 'Wheel colour', wheelSize: 'Wheel size', caliper: 'Calipers',
    height: 'Ride height', camber: 'Camber', front: 'Front bumper', rear: 'Rear bumper', hood: 'Hood', spoiler: 'Spoiler', skirts: 'Side skirts',
    tint: 'Window tint', neon: 'Underglow', none: 'None', stock: 'Stock',
    upEngine: 'Engine', upTurbo: 'Turbo', upTires: 'Tyres', upSusp: 'Suspension', upWeight: 'Weight cut', upNitro: 'Nitro',
    sPower: 'Power', sGrip: 'Grip', sHandling: 'Handling', sWeight: 'Weight', sTop: 'Top speed',
    chooseTrack: 'Track', chooseMode: 'Mode', start: 'Start',
    modeFree: 'Free drift', modeFreeD: 'Drive freely, earn points and money', modeChal: 'Drift challenge', modeChalD: '90 seconds to score for a medal',
    modeTime: 'Time attack', modeTimeD: '3 laps, best lap is saved',
    score: 'Score', best: 'Best', lap: 'Lap', time: 'Time', drift: 'DRIFT', crash: 'CRASH! Points lost', perfect: 'CLEAN', great: 'GREAT', insane: 'INSANE',
    angle: 'angle', paused: 'Paused', resume: 'Resume', restart: 'Restart', toGarage: 'Garage', toHub: 'Menu', results: 'Results',
    earned: 'Earned', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', noMedal: 'No medal', bestLap: 'Best lap', newRecord: 'New record!',
    quality: 'Graphics', qLow: 'Low', qMid: 'Medium', qHigh: 'High', volume: 'Volume', music: 'Music', lang: 'Language', units: 'Units', kmh: 'KM/H', mph: 'MPH',
    camera: 'Camera', camChase: 'Chase', camFar: 'Far', camHood: 'Hood', controls: 'Controls',
    help: 'W/↑ throttle · S/↓ brake · A/D steer · Space handbrake · Shift nitro · C camera · Esc pause', helpTouch: 'On-screen buttons: steering left, gas/brake/handbrake/nitro right',
    notEnough: 'Not enough money', bought: 'Purchased', lockedCar: 'Buy the car first', saved: 'Saved',
    hp: 'hp', kg: 'kg', mm: 'mm',
    weather: 'Weather', wRain: 'Downpour', wClear: 'Clear sunset', wSnow: 'Snowfall', wDust: 'Dust storm', grip: 'grip',
  },
};
const H = { lang: 'ru', state: 'BOOT' }; window.Hub = H;
const T = k => (STR[H.lang] || STR.ru)[k] ?? STR.ru[k] ?? k;

// ==== 3. UTILS ====
const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, rand = (a, b) => a + Math.random() * (b - a);
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n).toLocaleString(H.lang === 'ru' ? 'ru-RU' : 'en-US');
const fmtT = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ==== 4. SAVE ====
const Save = {
  ok: true,
  defaults() {
    return { v: 1, money: CFG.START_MONEY, car: 'kaze', cars: {}, owned: { kaze: true }, parts: {}, best: {}, stats: { drift: 0, runs: 0 },
      settings: { vol: .8, music: .4, quality: 'auto', lang: null, units: 'kmh', cam: 0 } };
  },
  load() {
    let d = Save.defaults();
    try { const raw = localStorage.getItem(CFG.SAVE_KEY); if (raw) { const p = JSON.parse(raw); d = Object.assign(d, p); d.settings = Object.assign(Save.defaults().settings, p.settings || {}); } }
    catch (e) { Save.ok = false; }
    H.save = d; return d;
  },
  write() { if (!Save.ok) return; try { localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(H.save)); } catch (e) { Save.ok = false; } },
};

// ==== 5. AUDIO ====
const Snd = {
  ctx: null, master: null, noise: null, eng: null, screech: null, music: null, musT: null,
  init() {
    if (Snd.ctx) { if (Snd.ctx.state === 'suspended') Snd.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = Snd.ctx = new AC(), comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(c.destination);
    Snd.master = c.createGain(); Snd.master.connect(comp); Snd.music = c.createGain(); Snd.music.connect(Snd.master);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; Snd.noise = nb;
    Snd.vol();
    // двигатель: пила + квадрат через фильтр
    const e = Snd.eng = { o1: c.createOscillator(), o2: c.createOscillator(), o3: c.createOscillator(), f: c.createBiquadFilter(), g: c.createGain(), tg: c.createGain(), turbo: c.createOscillator() };
    e.o1.type = 'sawtooth'; e.o2.type = 'square'; e.o3.type = 'sawtooth'; e.f.type = 'lowpass'; e.f.Q.value = 3; e.g.gain.value = 0;
    [e.o1, e.o2, e.o3].forEach(o => { o.connect(e.f); o.start(); }); e.f.connect(e.g); e.g.connect(Snd.master);
    e.turbo.type = 'sine'; e.tg.gain.value = 0; e.turbo.connect(e.tg); e.tg.connect(Snd.master); e.turbo.start();
    // визг шин
    const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1900; sf.Q.value = 5;
    const sg = c.createGain(); sg.gain.value = 0; s.connect(sf); sf.connect(sg); sg.connect(Snd.master); s.start(); Snd.screech = { g: sg, f: sf };
    Snd.startMusic();
  },
  vol() { if (!Snd.ctx) return; const st = H.save.settings, t = Snd.ctx.currentTime; Snd.master.gain.setTargetAtTime(st.vol * .8, t, .05); Snd.music.gain.setTargetAtTime(st.music * .35, t, .05); },
  engine(rpm, thr, on, turbo) {
    if (!Snd.eng) return; const e = Snd.eng, t = Snd.ctx.currentTime, f = 38 + rpm * 190;
    e.o1.frequency.setTargetAtTime(f, t, .03); e.o2.frequency.setTargetAtTime(f * .5, t, .03); e.o3.frequency.setTargetAtTime(f * 1.01 + 2, t, .03);
    e.f.frequency.setTargetAtTime(300 + rpm * 1800 + thr * 900, t, .05); e.g.gain.setTargetAtTime(on ? .05 + thr * .07 + rpm * .03 : 0, t, .08);
    e.turbo.frequency.setTargetAtTime(1800 + rpm * 2600, t, .1); e.tg.gain.setTargetAtTime(on ? turbo * thr * rpm * .012 : 0, t, .1);
  },
  tires(slip) { if (!Snd.screech) return; const t = Snd.ctx.currentTime; Snd.screech.g.gain.setTargetAtTime(clamp(slip, 0, 1) * .16, t, .06); Snd.screech.f.frequency.setTargetAtTime(1500 + slip * 900, t, .1); },
  tone(f, d, type = 'sine', v = .2, slide = 1, when = 0) { if (!Snd.ctx) return; const c = Snd.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(Snd.master); o.start(t); o.stop(t + d + .02); },
  burst(d, f, v = .3, type = 'lowpass', q = 1) { if (!Snd.ctx) return; const c = Snd.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = Snd.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(Snd.master); s.start(t, Math.random() * .5); s.stop(t + d); },
  play(n) {
    switch (n) {
      case 'click': Snd.tone(900, .05, 'triangle', .08); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => Snd.tone(f, .2, 'triangle', .12, 1, i * .06)); break;
      case 'hit': Snd.burst(.35, 500, .5); Snd.tone(70, .3, 'sine', .4, .5); break;
      case 'pop': Snd.burst(.08, 1200, .35, 'bandpass', 2); break;
      case 'nitro': Snd.burst(.6, 2500, .25, 'highpass'); break;
      case 'bank': [523, 784].forEach((f, i) => Snd.tone(f, .25, 'square', .06, 1, i * .07)); break;
      case 'lose': Snd.tone(300, .4, 'sawtooth', .1, .4); break;
      case 'medal': [523, 659, 784, 1047].forEach((f, i) => Snd.tone(f, .5, 'triangle', .14, 1, i * .1)); break;
      case 'thunder': Snd.burst(2.5, 180, .6); break;
      case 'count': Snd.tone(660, .15, 'square', .1); break;
      case 'go': Snd.tone(1320, .35, 'square', .12); break;
    }
  },
  // короткая синтвейв-петля
  startMusic() {
    const c = Snd.ctx; let next = c.currentTime + .2, step = 0; const bass = [45, 45, 52, 52, 48, 48, 43, 43], bpm = 104, sp = 60 / bpm / 2;
    Snd.musT = setInterval(() => {
      while (next < c.currentTime + .3) {
        const b = bass[Math.floor(step / 4) % 8], f = 440 * Math.pow(2, (b - 69) / 12), t = next - c.currentTime;
        const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 500;
        g.gain.setValueAtTime(.12, next); g.gain.exponentialRampToValueAtTime(.001, next + sp * .95); o.connect(fl); fl.connect(g); g.connect(Snd.music); o.start(next); o.stop(next + sp);
        if (step % 2 === 0) { const a = c.createOscillator(), ag = c.createGain(); a.type = 'triangle'; a.frequency.value = f * [4, 6, 5, 8][(step / 2) % 4]; ag.gain.setValueAtTime(.035, next); ag.gain.exponentialRampToValueAtTime(.001, next + sp * 1.6); a.connect(ag); ag.connect(Snd.music); a.start(next); a.stop(next + sp * 1.7); }
        if (step % 4 === 2) { const s = c.createBufferSource(); s.buffer = Snd.noise; const hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000; const hg = c.createGain(); hg.gain.setValueAtTime(.05, next); hg.gain.exponentialRampToValueAtTime(.001, next + .05); s.connect(hf); hf.connect(hg); hg.connect(Snd.music); s.start(next); s.stop(next + .06); }
        next += sp; step++;
      }
    }, 100);
  },
};

// ==== 6. INPUT ====
const Inp = {
  keys: new Set(), touch: { L: 0, R: 0, G: 0, B: 0, H: 0, N: 0 }, steer: 0, gas: 0, brake: 0, hb: false, nitro: false, cam: false, pause: false, usingTouch: false, padPrev: {},
  init() {
    addEventListener('keydown', e => {
      if (e.repeat) return; Inp.keys.add(e.code);
      if (e.code === 'KeyC') Inp.cam = true; if (e.code === 'Escape' || e.code === 'KeyP') Inp.pause = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && H.state === 'DRIVE') e.preventDefault();
    });
    addEventListener('keyup', e => Inp.keys.delete(e.code)); addEventListener('blur', () => Inp.keys.clear());
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('touchstart', () => { if (!Inp.usingTouch) { Inp.usingTouch = true; document.body.classList.add('touch'); UI.touchHud(); } }, { passive: true });
    for (const k of ['L', 'R', 'G', 'B', 'H', 'N']) {
      const el = document.getElementById('t' + k);
      const on = e => { e.preventDefault(); Inp.touch[k] = 1; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } };
      const off = () => { Inp.touch[k] = 0; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    }
    document.getElementById('pauseB').addEventListener('click', () => { Inp.pause = true; });
  },
  poll(dt) {
    const k = Inp.keys, t = Inp.touch;
    let st = (k.has('KeyA') || k.has('ArrowLeft') || t.L ? -1 : 0) + (k.has('KeyD') || k.has('ArrowRight') || t.R ? 1 : 0);
    let gas = k.has('KeyW') || k.has('ArrowUp') || t.G ? 1 : 0, br = k.has('KeyS') || k.has('ArrowDown') || t.B ? 1 : 0;
    let hb = k.has('Space') || !!t.H, nos = k.has('ShiftLeft') || k.has('ShiftRight') || !!t.N;
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (gp) {
      const ax = gp.axes[0] || 0; if (Math.abs(ax) > .12) st = ax;
      const bv = i => gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0;
      gas = Math.max(gas, bv(7)); br = Math.max(br, bv(6)); hb = hb || bv(0) > .5; nos = nos || bv(2) > .5 || bv(5) > .5;
      if (bv(9) > .5 && !Inp.padPrev[9]) Inp.pause = true; if (bv(3) > .5 && !Inp.padPrev[3]) Inp.cam = true;
      Inp.padPrev[9] = bv(9) > .5; Inp.padPrev[3] = bv(3) > .5;
    }
    // руль плавно: клавиатура даёт резкие ±1
    Inp.steer = Math.abs(st) < 1 && gp ? st : damp(Inp.steer, st, st === 0 ? 10 : 7, dt);
    Inp.gas = gas; Inp.brake = br; Inp.hb = hb; Inp.nitro = nos;
  },
};
