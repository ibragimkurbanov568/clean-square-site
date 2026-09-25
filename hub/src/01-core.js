'use strict';
(() => {
// ==== 1. CONFIG ====
const CFG = {
  SAVE_KEY: 'midnightHub.v1', STEP: 1 / 60, MAX_STEPS: 5,
  DRIFT_MIN_ANGLE: 0.2, DRIFT_MIN_SPEED: 7, DRIFT_MULT_EVERY: 2.2, DRIFT_MULT_MAX: 6, DRIFT_BANK_DELAY: 1.1,
  ASSIST: .45, YAW_DAMP: .8, SPIN_LAT: .95,
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
    camBumper: 'С бампера', camCine: 'Кино', assist: 'Помощь в контруле', repair: 'Починить бесплатно', damage: 'Повреждения', repaired: 'Машина как новая', tHeads: 'Свет', tExtra: 'Детали', heads: 'Фары', lightCol: 'Цвет света', tails: 'Стопы', exhaust: 'Выхлоп', fenders: 'Расширители', stripes: 'Полосы', stripeCol: 'Цвет полос', free: 'Бесплатно', camHint: 'Камера', wNight: 'Ясная ночь', wSunny: 'Солнечно', goGo: 'ВПЕРЁД!', duel: 'Дуэль', tagline: 'уличные гонки · тюнинг · погони', mGarage: 'Гараж и тюнинг', mGarageD: '24 машины, винилы, диски, обвесы, мотор', mDriftQ: 'Свободный дрифт, челлендж и время круга', mSetD: 'Графика, звук, камера, управление', otherGames: 'Другие игры клуба', rank: 'Ранг', unranked: 'Вне списка', carsOwned: 'машин', crownShort: 'Корона ваша', tip: 'Совет', tips: ['В погоне остановка рядом с патрулём — это арест. Не сбрасывай скорость.', 'В драге переключайся, когда загорится зелёная надпись ПЕРЕДАЧА.', 'R или кнопка ↺ возвращает машину на трассу.', 'Машина босса достаётся победителю — выигрывай дуэли Восьмёрки.', 'Нитро копится в заносах и само по себе. Жми Shift на прямых.', 'Радары считают сумму скоростей — выходи из поворота на максимальной.', 'Повреждения чинятся в гараже бесплатно.', 'Выбывание: последний на каждом круге вылетает. Не оставайся позади.', 'Камеры переключаются клавишей C — попробуй вид с бампера.'], tapNext: 'Нажмите, чтобы продолжить', beaten: 'побеждён', career: 'Карьера', theEight: 'Восьмёрка', chapter: 'Глава', bossCar: 'Машина босса', done: 'Пройдено', win2: 'Выиграйте 2 заезда', pinkSlip: 'Машина босса ваша', crownKept: 'Корона ваша. Все заезды можно проходить снова.', needClass: 'Нужна машина класса', bonus: 'Бонус', mCareer: 'Карьера: Восьмёрка', mCareerD: 'Сюжет: 8 глав, 8 боссов, машины на кону', mRace: 'Быстрая гонка', mRaceD: 'Любой режим, любая трасса, соперники и полиция', modeCircuit: 'Кольцо', modeCircuitD: '3 круга против 5 соперников', modeSprint: 'Спринт', modeSprintD: 'Один круг сквозь ночной трафик', modeKO: 'На выбывание', modeKOD: 'Последний на круге выбывает', modeTrap: 'Радары', modeTrapD: 'Сумма скоростей на камерах решает', modeDrag: 'Драг', modeDragD: '402 метра, ручная коробка: E — выше, Q — ниже', modePursuit: 'Погоня', modePursuitD: 'Уйди от полиции и собери награду', police: 'Полиция', koOut: 'выбывает', copDown: 'ПАТРУЛЬ ВЫВЕДЕН', trap: 'РАДАР', trapSum: 'Сумма', launchPerfect: 'ИДЕАЛЬНЫЙ СТАРТ', launchSpin: 'ПРОБУКСОВКА', launchBog: 'ВЯЛЫЙ СТАРТ', shiftPerfect: 'ИДЕАЛЬНОЕ ПЕРЕКЛЮЧЕНИЕ', shiftGood: 'ХОРОШО', shiftLate: 'ПОЗДНО', shiftEarly: 'РАНО', roadblock: 'Впереди блокпост!', backup: 'Подкрепление в пути', bounty: 'Награда', bust: 'Арест', evade: 'Отрыв', pos: 'Позиция', you: 'Вы', shift: 'ПЕРЕДАЧА', busted: 'АРЕСТОВАН', escaped: 'УШЁЛ ОТ ПОГОНИ', place: 'Место', raceWin: 'ПОБЕДА', raceLose: 'ПОРАЖЕНИЕ', catRace: 'Гонки', catDrift: 'Дрифт', eliminated: 'Выбыл', continue: 'Продолжить', driver: 'Гонщик', car: 'Машина', copsDown: 'Патрулей выведено', vinyl: 'Винил', vcol: 'Цвет винила', vcol2: 'Второй цвет', cls: 'Класс', allCls: 'Все', 
    camera: 'Камера', camChase: 'Сзади', camFar: 'Дальняя', camHood: 'С капота', controls: 'Управление',
    help: 'W/↑ газ · S/↓ тормоз · A/D руль · Пробел ручник · Shift нитро · C камера (5 видов) · Esc пауза', helpTouch: 'Кнопки на экране: руль слева, газ/тормоз/ручник/нитро справа',
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
    camBumper: 'Bumper', camCine: 'Cinematic', assist: 'Countersteer assist', repair: 'Repair for free', damage: 'Damage', repaired: 'Good as new', tHeads: 'Lights', tExtra: 'Parts', heads: 'Headlights', lightCol: 'Light colour', tails: 'Tail lights', exhaust: 'Exhaust', fenders: 'Fenders', stripes: 'Stripes', stripeCol: 'Stripe colour', free: 'Free', camHint: 'Camera', wNight: 'Clear night', wSunny: 'Sunny', goGo: 'GO!', duel: 'Duel', tagline: 'street racing · tuning · pursuits', mGarage: 'Garage & Tuning', mGarageD: '24 cars, vinyls, rims, body kits, engine', mDriftQ: 'Free drift, challenge and lap time', mSetD: 'Graphics, sound, camera, controls', otherGames: 'Other club games', rank: 'Rank', unranked: 'Unranked', carsOwned: 'cars', crownShort: 'The crown is yours', tip: 'Tip', tips: ['In a pursuit, stopping next to a cop means busted. Keep moving.', 'In drag, shift when the green SHIFT light comes on.', 'R or the ↺ button puts your car back on track.', 'Beat a boss and their car is yours.', 'Nitro refills while drifting and over time. Hit Shift on the straights.', 'Speedtraps add up your speeds — exit corners flat out.', 'Damage is repaired for free in the garage.', 'Knockout: the last car each lap is out. Do not fall behind.', 'Press C to switch cameras — try the bumper view.'], tapNext: 'Tap to continue', beaten: 'beaten', career: 'Career', theEight: 'The Eight', chapter: 'Chapter', bossCar: 'Boss car', done: 'Completed', win2: 'Win 2 events', pinkSlip: 'Boss car is yours', crownKept: 'The crown is yours. Every event can be replayed.', needClass: 'Requires a class', bonus: 'Bonus', mCareer: 'Career: The Eight', mCareerD: 'Story: 8 chapters, 8 bosses, cars on the line', mRace: 'Quick Race', mRaceD: 'Any mode, any track, rivals and police', modeCircuit: 'Circuit', modeCircuitD: '3 laps against 5 rivals', modeSprint: 'Sprint', modeSprintD: 'One lap through night traffic', modeKO: 'Knockout', modeKOD: 'Last car each lap is out', modeTrap: 'Speedtrap', modeTrapD: 'Highest total camera speed wins', modeDrag: 'Drag', modeDragD: '402 metres, manual gears: E up, Q down', modePursuit: 'Pursuit', modePursuitD: 'Escape the police and build your bounty', police: 'Police', koOut: 'is out', copDown: 'COP DISABLED', trap: 'SPEEDTRAP', trapSum: 'Total', launchPerfect: 'PERFECT LAUNCH', launchSpin: 'WHEELSPIN', launchBog: 'BOGGED START', shiftPerfect: 'PERFECT SHIFT', shiftGood: 'GOOD', shiftLate: 'LATE', shiftEarly: 'EARLY', roadblock: 'Roadblock ahead!', backup: 'Backup en route', bounty: 'Bounty', bust: 'Bust', evade: 'Evade', pos: 'Position', you: 'You', shift: 'SHIFT', busted: 'BUSTED', escaped: 'ESCAPED', place: 'Place', raceWin: 'VICTORY', raceLose: 'DEFEAT', catRace: 'Races', catDrift: 'Drift', eliminated: 'Out', continue: 'Continue', driver: 'Driver', car: 'Car', copsDown: 'Cops disabled', vinyl: 'Vinyl', vcol: 'Vinyl colour', vcol2: 'Second colour', cls: 'Class', allCls: 'All', 
    camera: 'Camera', camChase: 'Chase', camFar: 'Far', camHood: 'Hood', controls: 'Controls',
    help: 'W/↑ throttle · S/↓ brake · A/D steer · Space handbrake · Shift nitro · C camera (5 views) · Esc pause', helpTouch: 'On-screen buttons: steering left, gas/brake/handbrake/nitro right',
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
      settings: { vol: .8, music: .4, quality: 'auto', lang: null, units: 'kmh', cam: 0, assist: true } };
  },
  load() {
    let d = Save.defaults();
    try { const raw = localStorage.getItem(CFG.SAVE_KEY); if (raw) { const p = JSON.parse(raw); d = Object.assign(d, p); d.settings = Object.assign(Save.defaults().settings, p.settings || {}); } }
    catch (e) { Save.ok = false; }
    if (typeof CARS !== 'undefined') { if (!CARS[d.car]) d.car = 'kaze'; d.owned.kaze = true; for (const k of Object.keys(d.owned)) if (!CARS[k]) delete d.owned[k]; }
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
    // двигатель: гармоники частоты вспышек → перегруз → фильтр → модуляция (рык V8)
    const e = Snd.eng = { o1: c.createOscillator(), o2: c.createOscillator(), o3: c.createOscillator(), o4: c.createOscillator(), ws: c.createWaveShaper(), f: c.createBiquadFilter(), am: c.createGain(), g: c.createGain(),
      lfo: c.createOscillator(), lfoG: c.createGain(), turbo: c.createOscillator(), tg: c.createGain(), intake: c.createBufferSource(), inF: c.createBiquadFilter(), inG: c.createGain(), g2: c.createGain(), g3: c.createGain(), g4: c.createGain() };
    e.o1.type = 'sawtooth'; e.o2.type = 'square'; e.o3.type = 'sawtooth'; e.o4.type = 'triangle';
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.2); } e.ws.curve = curve; e.ws.oversample = '2x';
    e.f.type = 'lowpass'; e.f.Q.value = 4; e.g.gain.value = 0; e.am.gain.value = 1; e.g2.gain.value = .6; e.g3.gain.value = .35; e.g4.gain.value = .4;
    e.o1.connect(e.ws); e.o2.connect(e.g2); e.g2.connect(e.ws); e.o3.connect(e.g3); e.g3.connect(e.ws); e.o4.connect(e.g4); e.g4.connect(e.ws);
    e.ws.connect(e.f); e.f.connect(e.am); e.am.connect(e.g); e.g.connect(Snd.master);
    e.lfo.type = 'sine'; e.lfoG.gain.value = 0; e.lfo.connect(e.lfoG); e.lfoG.connect(e.am.gain);
    [e.o1, e.o2, e.o3, e.o4, e.lfo].forEach(o => o.start());
    e.turbo.type = 'sine'; e.tg.gain.value = 0; e.turbo.connect(e.tg); e.tg.connect(Snd.master); e.turbo.start();
    e.intake.buffer = nb; e.intake.loop = true; e.inF.type = 'bandpass'; e.inF.Q.value = 1.5; e.inG.gain.value = 0; e.intake.connect(e.inF); e.inF.connect(e.inG); e.inG.connect(Snd.master); e.intake.start();
    // визг шин
    const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1900; sf.Q.value = 5;
    const sg = c.createGain(); sg.gain.value = 0; s.connect(sf); sf.connect(sg); sg.connect(Snd.master); s.start(); Snd.screech = { g: sg, f: sf };
    Snd.startMusic();
  },
  vol() { if (!Snd.ctx) return; const st = H.save.settings, t = Snd.ctx.currentTime; Snd.master.gain.setTargetAtTime(st.vol * .8, t, .05); Snd.music.gain.setTargetAtTime(st.music * .35, t, .05); },
  engine(r01, thr, on, pr) {
    if (!Snd.eng) return; const e = Snd.eng, t = Snd.ctx.currentTime;
    if (!on || !pr) { e.g.gain.setTargetAtTime(0, t, .08); e.tg.gain.setTargetAtTime(0, t, .08); e.inG.gain.setTargetAtTime(0, t, .08); return; }
    const f = pr.rpm / 60 * pr.cyl / 2, v8 = pr.snd === 'v8', v10 = pr.snd === 'v10', i4t = pr.snd === 'i4t';
    e.o1.frequency.setTargetAtTime(f, t, .02); e.o2.frequency.setTargetAtTime(f * .5, t, .02); e.o3.frequency.setTargetAtTime(f * 2.01, t, .02); e.o4.frequency.setTargetAtTime(f * (v10 ? 3 : 1.5), t, .02);
    e.g3.gain.setTargetAtTime(v10 ? .55 : v8 ? .2 : .4, t, .1); e.g2.gain.setTargetAtTime(v8 ? .9 : .55, t, .1);
    const bright = v10 ? 1.6 : v8 ? .75 : 1.15;
    e.f.frequency.setTargetAtTime((260 + r01 * 2200 * bright) * (.45 + .55 * thr + .15), t, .04);
    e.lfo.frequency.setTargetAtTime(v8 ? f * .25 : f * .5, t, .05); e.lfoG.gain.setTargetAtTime(v8 ? .45 * (1 - r01 * .5) : .12, t, .1);
    const lim = pr.limit && Math.random() < .5 ? .3 : 1;
    e.g.gain.setTargetAtTime((.05 + thr * .09 + r01 * .04) * lim * (v8 ? 1.15 : 1), t, .04);
    e.inF.frequency.setTargetAtTime(f * 5, t, .05); e.inG.gain.setTargetAtTime(thr * (.02 + r01 * .04), t, .06);
    e.turbo.frequency.setTargetAtTime(1600 + r01 * 3600, t, .12); e.tg.gain.setTargetAtTime(pr.turbo || i4t ? thr * r01 * (.006 + (pr.turbo || 0) * .006) : 0, t, .12);
  },
  shift() { if (!Snd.eng) return; const t = Snd.ctx.currentTime, g = Snd.eng.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(g.value * .25, t + .05); g.linearRampToValueAtTime(g.value, t + .16); Snd.burst(.06, 900, .25, 'bandpass', 3); },
  tires(slip) { if (!Snd.screech) return; const t = Snd.ctx.currentTime; Snd.screech.g.gain.setTargetAtTime(clamp(slip, 0, 1) * .16, t, .06); Snd.screech.f.frequency.setTargetAtTime(1500 + slip * 900, t, .1); },
  tone(f, d, type = 'sine', v = .2, slide = 1, when = 0) { if (!Snd.ctx) return; const c = Snd.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(Snd.master); o.start(t); o.stop(t + d + .02); },
  burst(d, f, v = .3, type = 'lowpass', q = 1) { if (!Snd.ctx) return; const c = Snd.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = Snd.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(Snd.master); s.start(t, Math.random() * .5); s.stop(t + d); },
  play(n, v = .6) {
    switch (n) {
      case 'click': Snd.tone(900, .05, 'triangle', .08); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => Snd.tone(f, .2, 'triangle', .12, 1, i * .06)); break;
      case 'hit': Snd.burst(.4, 600, .35 + v * .4); Snd.burst(.25, 2600, .12 + v * .2, 'bandpass', 4); Snd.tone(70, .3, 'sine', .3 + v * .3, .5); break;
      case 'pop': Snd.burst(.07, rand(700, 1400), .4, 'bandpass', 2); setTimeout(() => Snd.burst(.05, rand(500, 1000), .3, 'bandpass', 2), rand(30, 70)); break;
      case 'blowoff': Snd.burst(.45, 2200, .22, 'highpass', 1); break;
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
      if (e.code === 'KeyC' || e.code === 'KeyV') Inp.cam = true; if (e.code === 'KeyE') Inp.shiftUp = true; if (e.code === 'KeyQ') Inp.shiftDown = true; if (e.code === 'KeyR') Inp.reset = true; if (e.code === 'Escape' || e.code === 'KeyP') Inp.pause = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && H.state === 'DRIVE') e.preventDefault();
    });
    addEventListener('keyup', e => Inp.keys.delete(e.code)); addEventListener('blur', () => Inp.keys.clear());
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('touchstart', () => { if (!Inp.usingTouch) { Inp.usingTouch = true; document.body.classList.add('touch'); UI.touchHud(); } }, { passive: true });
    for (const k of ['L', 'R', 'G', 'B', 'H', 'N', 'C', 'U', 'D', 'X']) {
      const el = document.getElementById('t' + k);
      const on = e => { e.preventDefault(); if (k === 'C') { Inp.cam = true; return; } if (k === 'U') { Inp.shiftUp = true; return; } if (k === 'D') { Inp.shiftDown = true; return; } if (k === 'X') { Inp.reset = true; return; } Inp.touch[k] = 1; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } };
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
      if (bv(1) > .5 && !Inp.padPrev[1]) Inp.shiftUp = true; if (bv(4) > .5 && !Inp.padPrev[4]) Inp.shiftDown = true; if (bv(8) > .5 && !Inp.padPrev[8]) Inp.reset = true; Inp.padPrev[1] = bv(1) > .5; Inp.padPrev[4] = bv(4) > .5; Inp.padPrev[8] = bv(8) > .5;
      if (bv(9) > .5 && !Inp.padPrev[9]) Inp.pause = true; if (bv(3) > .5 && !Inp.padPrev[3]) Inp.cam = true;
      Inp.padPrev[9] = bv(9) > .5; Inp.padPrev[3] = bv(3) > .5;
    }
    // руль плавно: клавиатура даёт резкие ±1
    Inp.steer = Math.abs(st) < 1 && gp ? st : damp(Inp.steer, st, st === 0 ? 10 : 7, dt);
    Inp.gas = gas; Inp.brake = br; Inp.hb = hb; Inp.nitro = nos;
  },
};
