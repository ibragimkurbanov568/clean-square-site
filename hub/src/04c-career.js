// ==== 9c. CAREER: «Восьмёрка» — сюжет, главы, боссы, диалоги ====
// портреты: стилизованные силуэты (SVG), без чужих образов
const FACES = {
  mira: { skin: '#c89478', hair: '#1b1b22', style: 1, acc: '#ff5a1f', glasses: false, band: true },
  spark: { skin: '#e0b08f', hair: '#ff3b3b', style: 2, acc: '#ff3b3b', glasses: false },
  diesel: { skin: '#9b6b4f', hair: '#2a2420', style: 0, acc: '#f5c518', glasses: false, beard: true },
  razor: { skin: '#d9a88a', hair: '#e5e7eb', style: 3, acc: '#e5e7eb', glasses: true },
  witch: { skin: '#f0c9ae', hair: '#6d28d9', style: 4, acc: '#a855f7', glasses: false },
  khan: { skin: '#b98262', hair: '#111', style: 0, acc: '#22c55e', glasses: true, beard: true },
  mirage: { skin: '#e8b996', hair: '#06b6d4', style: 2, acc: '#06b6d4', glasses: true },
  phantom: { skin: '#3a3a44', hair: '#0a0a0c', style: 5, acc: '#9ca3af', glasses: false, mask: true },
  count: { skin: '#d7ad91', hair: '#c9a227', style: 3, acc: '#c9a227', glasses: false, beard: true },
};
function portrait(k, rank) {
  const f = FACES[k] || FACES.mira, id = 'p' + k, hair = [
    'M30 58 Q30 22 60 20 Q90 22 90 58 L86 44 Q60 34 34 44 Z',
    'M28 64 Q26 18 60 18 Q94 18 92 64 L92 96 L84 70 Q86 40 60 36 Q34 40 36 70 L28 96 Z',
    'M32 56 Q34 14 62 16 Q96 20 90 60 L84 38 L74 46 L66 34 L56 46 L44 36 Z',
    'M30 54 Q36 20 62 20 Q88 22 90 54 Q76 30 44 40 Z',
    'M26 60 Q24 14 60 14 Q98 14 94 60 L100 120 L84 112 L86 62 Q84 36 60 34 Q36 36 34 62 L36 112 L20 120 Z',
    'M24 70 Q22 10 60 10 Q98 10 96 70 L96 110 L24 110 Z'][f.style];
  return `<svg class="face" viewBox="0 0 120 140" role="img" aria-label="${esc(k)}"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.acc}" stop-opacity=".55"/><stop offset="1" stop-color="#07080b"/></linearGradient></defs>
    <rect width="120" height="140" fill="url(#${id}g)"/>
    <path d="M8 140 Q12 104 40 98 L60 106 L80 98 Q108 104 112 140 Z" fill="#14161c"/><path d="M40 98 L60 124 L80 98 L72 96 L60 110 L48 96 Z" fill="${f.acc}" opacity=".8"/>
    <rect x="50" y="78" width="20" height="24" rx="6" fill="${f.skin}" filter="brightness(.8)"/>
    <ellipse cx="60" cy="62" rx="26" ry="31" fill="${f.skin}"/>
    ${f.beard ? `<path d="M36 68 Q38 94 60 96 Q82 94 84 68 Q78 84 60 84 Q42 84 36 68 Z" fill="${f.hair}" opacity=".9"/>` : ''}
    <path d="${hair}" fill="${f.hair}"/>
    ${f.band ? `<rect x="33" y="40" width="54" height="6" rx="3" fill="${f.acc}"/>` : ''}
    ${f.mask ? `<path d="M34 56 Q60 50 86 56 L86 70 Q60 78 34 70 Z" fill="#0b0b0f"/><rect x="40" y="59" width="40" height="4" rx="2" fill="${f.acc}"/>`
      : f.glasses ? `<rect x="36" y="55" width="48" height="11" rx="4" fill="#0b0d12"/><rect x="38" y="57" width="44" height="3" rx="1.5" fill="${f.acc}" opacity=".9"/>`
      : `<ellipse cx="49" cy="61" rx="3.2" ry="2.2" fill="#15171c"/><ellipse cx="71" cy="61" rx="3.2" ry="2.2" fill="#15171c"/><path d="M44 55 L54 54 M66 54 L76 55" stroke="${f.hair}" stroke-width="2.4" stroke-linecap="round"/>`}
    <path d="M52 80 Q60 ${f.mask ? 80 : 83} 68 80" stroke="#5a3a30" stroke-width="2" fill="none" stroke-linecap="round" opacity="${f.mask ? 0 : .8}"/>
    ${rank ? `<text x="112" y="132" text-anchor="end" font-family="Oswald,Impact,sans-serif" font-weight="700" font-style="italic" font-size="34" fill="#fff" opacity=".92">#${rank}</text>` : ''}</svg>`;
}

// главы: босс, класс, три заезда и поединок
const N2c = (ru, en) => ({ ru, en });
const CHAPTERS = [
  { boss: 'spark', rank: 8, name: N2c('Искра', 'Spark'), car: 'hornet', cls: 'D', ev: [['circuit', 'port', N2c('Портовое кольцо', 'Harbour Ring')], ['sprint', 'city', N2c('Неоновый спринт', 'Neon Sprint')], ['chal', 'snow', N2c('Ледяной дрифт', 'Ice Drift'), 1]], bossEv: ['sprint', 'port'] },
  { boss: 'diesel', rank: 7, name: N2c('Дизель', 'Diesel'), car: 'titan', cls: 'C', ev: [['drag', 'drag', N2c('Четверть мили', 'Quarter Mile')], ['circuit', 'mountain', N2c('Перевал', 'The Pass')], ['speedtrap', 'airfield', N2c('Взлётная полоса', 'Runway Trap')]], bossEv: ['drag', 'drag'] },
  { boss: 'razor', rank: 6, name: N2c('Бритва', 'Razor'), car: 'ronin', cls: 'C', ev: [['knockout', 'city', N2c('Неоновое выбывание', 'Neon Knockout')], ['sprint', 'desert', N2c('Пыльный спринт', 'Dust Sprint')], ['pursuit', 'port', N2c('Облава в порту', 'Harbour Heat')]], bossEv: ['knockout', 'mountain'] },
  { boss: 'witch', rank: 5, name: N2c('Ведьма', 'Witch'), car: 'kitsune', cls: 'B', ev: [['circuit', 'snow', N2c('Белое кольцо', 'White Ring')], ['chal', 'desert', N2c('Дрифт в каньоне', 'Canyon Drift'), 1], ['speedtrap', 'port', N2c('Камеры набережной', 'Pier Cameras')]], bossEv: ['chal', 'snow', 2] },
  { boss: 'khan', rank: 4, name: N2c('Хан', 'Khan'), car: 'condor', cls: 'B', ev: [['drag', 'drag', N2c('Ночной драг', 'Night Drag')], ['knockout', 'airfield', N2c('Ангарное выбывание', 'Hangar Knockout')], ['sprint', 'mountain', N2c('Спуск', 'Downhill')]], bossEv: ['speedtrap', 'airfield'] },
  { boss: 'mirage', rank: 3, name: N2c('Мираж', 'Mirage'), car: 'raijin', cls: 'A', ev: [['circuit', 'desert', N2c('Кольцо каньона', 'Canyon Ring')], ['pursuit', 'city', N2c('Город в огне', 'City Heat')], ['speedtrap', 'mountain', N2c('Горные радары', 'Mountain Traps')]], bossEv: ['pursuit', 'snow'] },
  { boss: 'phantom', rank: 2, name: N2c('Фантом', 'Phantom'), car: 'oni', cls: 'A', ev: [['knockout', 'port', N2c('Последний причал', 'Last Pier')], ['drag', 'drag', N2c('Дуэль на прямой', 'Straight Duel')], ['sprint', 'airfield', N2c('Форсаж', 'Afterburner')]], bossEv: ['sprint', 'city'] },
  { boss: 'count', rank: 1, name: N2c('Граф', 'The Count'), car: 'zenith', cls: 'S', ev: [['circuit', 'city', N2c('Корона города', 'City Crown')], ['speedtrap', 'desert', N2c('Мираж скорости', 'Speed Mirage')], ['pursuit', 'mountain', N2c('Последняя облава', 'Final Heat')]], bossEv: ['circuit', 'mountain'] },
];
// реплики: [кто, ru, en]
const STORY = {
  intro: [['mira', 'Добро пожаловать в Полночь. Днём это обычный город. Ночью — трасса.', 'Welcome to Midnight. By day it is just a city. By night it is a racetrack.'],
    ['mira', 'Улицами правит Восьмёрка — восемь гонщиков. Первый в списке — Граф. Год назад он забрал мой гараж по расписке.', 'The streets belong to the Eight. Number one is the Count. A year ago he took my garage on a pink slip.'],
    ['mira', 'Этот Kaze — всё, что у меня осталось. Побеждай, поднимайся по списку — и мы вернём своё.', 'This Kaze is all I have left. Win, climb the list, and we take back what is ours.'],
    ['mira', 'Начни с Искры, номер восемь. Выиграй два заезда — и она сама тебя найдёт.', 'Start with Spark, number eight. Win two events and she will come looking for you.']],
  spark: { pre: ['Новенький на машине Миры? Порт — мой дом. Не заблудись.', 'The new kid in Mira\'s car? The harbour is my home. Try not to get lost.'], post: ['Ладно… ты едешь чище, чем я думала. Держи ключи — и удачи с Дизелем.', 'Fine… you drive cleaner than I thought. Take the keys, and good luck with Diesel.'] },
  diesel: { pre: ['Повороты — для слабых. Четыреста метров. Прямая. Чистая мощность.', 'Corners are for the weak. Four hundred metres. Straight line. Pure power.'], post: ['Хм. Коробку ты дёргаешь как надо. Бритва в горах тебя не пожалеет.', 'Huh. You work that gearbox right. Razor will not go easy on you.'] },
  razor: { pre: ['Здесь выживает один. Каждый круг кто-то вылетает. Сегодня — ты.', 'Only one survives out here. Every lap somebody drops. Tonight it is you.'], post: ['Последний круг был твой. Ведьма заметила тебя. На льду не зевай.', 'That last lap was yours. The Witch has noticed you. Stay sharp on the ice.'] },
  witch: { pre: ['Лёд не прощает ошибок. Покажи, как держишь занос. Мне нужно золото.', 'Ice forgives nothing. Show me how you hold a slide. Gold, or go home.'], post: ['Красиво. Почти как я. Хан ждёт на аэродроме — у него радары и деньги.', 'Beautiful. Almost like me. Khan waits at the airfield — he has cameras and cash.'] },
  khan: { pre: ['Скорость — это цифры, а камеры не врут. Проиграешь — заплатишь.', 'Speed is numbers, and cameras do not lie. Lose, and you pay.'], post: ['Цифры сказали своё. Мираж работает на Графа — жди полицию.', 'The numbers have spoken. Mirage works for the Count — expect the police.'] },
  mirage: { pre: ['Граф сдал тебя копам. Уйдёшь от погони — тогда поговорим.', 'The Count sold you out to the cops. Shake them off, then we talk.'], post: ['Ты ушёл от целого участка? Фантом о тебе уже знает.', 'You lost an entire precinct? Phantom already knows your name.'] },
  phantom: { pre: ['Меня никто не видел впереди. Город, трафик, один круг.', 'Nobody has ever seen me from behind. City, traffic, one lap.'], post: ['…Граф ждёт в горах. Там всё и закончится.', '…The Count waits in the mountains. That is where it ends.'] },
  count: { pre: ['Мира прислала ученика? Я выиграл её гараж честно. Горы, три круга. Проиграешь — машина моя.', 'Mira sent her student? I won her garage fair and square. Mountains, three laps. Lose, and your car is mine.'], post: ['Забирай. Гараж, машину, список. Полночь теперь твоя.', 'Take it. The garage, the car, the list. Midnight is yours now.'] },
  finale: [['mira', 'Мы дома. Спасибо тебе.', 'We are home. Thank you.'], ['mira', 'Но слухи уже идут: из соседних городов едут новые гонщики. Все заезды открыты — держи корону.', 'But word travels: racers from other cities are coming. Every event is open — keep the crown.']],
};
const Career = {
  st() { const s = H.save; s.career = s.career || { ch: 0, won: {}, boss: {}, intro: false, fin: false }; return s.career; },
  evId: (ci, k) => `c${ci}e${k}`,
  unlockedBoss(ci) { const c = Career.st(); return CHAPTERS[ci].ev.filter((_, k) => c.won[Career.evId(ci, k)]).length >= 2; },
  // диалог: список реплик → по одной, затем callback
  dialog(lines, done) {
    let i = 0; const L = H.lang === 'en' ? 2 : 1;
    const show = () => {
      if (i >= lines.length) { done && done(); return; }
      const [who, ...txt] = lines[i], chap = CHAPTERS.find(c => c.boss === who), nm = who === 'mira' ? (H.lang === 'en' ? 'Mira' : 'Мира') : chap ? chap.name[H.lang] || chap.name.ru : who;
      UI.show(`<div class="dlg" data-act="dlgNext"><div class="dlgBox"><div class="dlgFace">${portrait(who, chap && chap.rank)}</div><div><div class="dlgName">${esc(nm)}</div><p class="dlgText">${esc(txt[L - 1])}</p><div class="muted small">${esc(T('tapNext'))} ▸</div></div></div></div>`, 'clear');
      UI.dlgNext = () => { i++; show(); }; Snd.play('click');
    };
    show();
  },
  open() {
    const c = Career.st(); if (!c.intro) { c.intro = true; Save.write(); Career.dialog(STORY.intro, Career.open); return; }
    H.state = 'CAREER'; UI.hud(false); const L = H.lang, s = H.save, modeName = { circuit: 'modeCircuit', sprint: 'modeSprint', knockout: 'modeKO', speedtrap: 'modeTrap', drag: 'modeDrag', pursuit: 'modePursuit', chal: 'modeChal' }, ico = { circuit: '🏁', sprint: '⚡', knockout: '✖', speedtrap: '📷', drag: '⏱', pursuit: '🚨', chal: '🔥' };
    const list = CHAPTERS.map((ch, ci) => { const beat = c.boss[ch.boss], cur = ci === Math.min(c.ch, 7) && !c.fin, locked = ci > c.ch;
      return `<button class="bl ${beat ? 'beat' : ''} ${cur ? 'cur' : ''} ${locked ? 'locked' : ''}" data-act="chapter" data-id="${ci}" ${locked ? 'disabled' : ''}><span class="rk">#${ch.rank}</span><span class="bf">${portrait(ch.boss)}</span><span class="bn">${locked ? '???' : esc(ch.name[L] || ch.name.ru)}<small>${esc(T('cls'))} ${ch.cls} · ${beat ? '✓ ' + esc(T('beaten')) : locked ? '🔒' : esc(CARS[ch.car].name)}</small></span></button>`; }).join('');
    const ci = UI.chapter ?? Math.min(c.ch, 7), ch = CHAPTERS[ci], cm = CLASS_MULT[ch.cls];
    const evCard = (e, k, boss) => { const id = boss ? 'boss' + ci : Career.evId(ci, k), won = boss ? c.boss[ch.boss] : c.won[id], lock = boss && !Career.unlockedBoss(ci) && !won, tr = TRACKS[e[1]], nm = boss ? (L === 'en' ? 'vs ' : 'против ') + (ch.name[L] || ch.name.ru) : e[2][L] || e[2].ru;
      const reward = Math.round((boss ? 5000 : 1000) * cm);
      return `<button class="card ev ${boss ? 'boss' : ''} ${won ? 'won' : ''}" data-act="${lock ? '' : 'event'}" data-ci="${ci}" data-k="${boss ? -1 : k}" ${lock ? 'disabled' : ''}><span class="evm">${ico[e[0]]} ${esc(T(modeName[e[0]]))}</span><b>${esc(nm)}</b><span class="muted small">${esc(tr.name[L] || tr.name.ru)} · ${esc(T('cls'))} ${ch.cls}+${e[3] ? ' · ' + esc(T(e[3] === 2 ? 'gold' : 'silver')) : ''}</span>
        <span class="small">${won ? '✓ ' + esc(T('done')) : lock ? '🔒 ' + esc(T('win2')) : `$ ${fmt(reward)}${boss ? ' + ' + esc(T('pinkSlip')) : ''}`}</span></button>`; };
    UI.show(`${UI.top(T('career'), 'hub')}<div class="career"><div class="blist"><div class="bltitle">${esc(T('theEight'))}</div>${list}</div>
      <div class="chap"><div class="chead">${portrait(ch.boss, ch.rank)}<div><div class="muted small" style="letter-spacing:.2em;text-transform:uppercase">${esc(T('chapter'))} ${ci + 1}/8</div><h2 style="margin:4px 0">${esc(ch.name[L] || ch.name.ru)}</h2><div class="muted">${esc(T('bossCar'))}: <b>${esc(CARS[ch.car].name)}</b> · ${esc(T('cls'))} ${ch.cls}</div></div></div>
      <div class="cards">${ch.ev.map((e, k) => evCard(e, k)).join('')}${evCard(ch.bossEv, -1, true)}</div>${c.fin ? `<p class="muted">${esc(T('crownKept'))}</p>` : ''}</div></div>`, '');
    UI.root.querySelector('.screen').style.background = 'linear-gradient(90deg,rgba(7,8,11,.94),rgba(7,8,11,.72))';
  },
  start(ci, k) {
    const ch = CHAPTERS[ci], boss = k < 0, e = boss ? ch.bossEv : ch.ev[k], s = H.save, pc = CARS[s.car];
    if (CLASSES.indexOf(pc.cls) < CLASSES.indexOf(ch.cls)) { UI.toast(T('needClass') + ' ' + ch.cls); return; }
    const cls = CLASSES[Math.max(CLASSES.indexOf(ch.cls), CLASSES.indexOf(pc.cls))];
    const go = () => { UI.clear(); UI.sel.track = e[1]; UI.sel.mode = e[0]; UI.sel.opts = { event: { ci, k, medal: e[2] && !boss ? e[3] : boss ? e[2] : 0 }, cls, diff: 1 + ci * .06 + (boss ? .15 : 0), rivals: boss ? [ch.car] : null, boss: boss ? { name: ch.name[H.lang] || ch.name.ru } : null };
      if (boss && e[0] === 'chal') UI.sel.opts.event.medal = e[2];
      Game.toDrive(UI.sel.track, UI.sel.mode, UI.sel.opts); };
    if (boss) Career.dialog([[ch.boss, ...STORY[ch.boss].pre]], go); else go();
  },
  // итог заезда карьеры
  after() {
    const o = UI.sel.opts, ev = o && o.event; if (!ev) return UI.hubMenu(); const c = Career.st(), ch = CHAPTERS[ev.ci], lr = UI.lastRace || {}, s = H.save, cm = CLASS_MULT[ch.cls];
    Game.leaveDrive(); UI.sel.opts = {};
    if (!lr.win) { Career.open(); return; }
    if (ev.k < 0) {
      const first = !c.boss[ch.boss]; c.boss[ch.boss] = true;
      if (first) { s.money += Math.round(5000 * cm); s.owned[ch.car] = true; c.ch = Math.max(c.ch, ev.ci + 1); if (ev.ci === 7) c.fin = true; Save.write();
        UI.toast(`${T('pinkSlip')}: ${CARS[ch.car].name}`); Snd.play('medal');
        const lines = [[ch.boss, ...STORY[ch.boss].post]].concat(ev.ci === 7 ? STORY.finale : []); UI.chapter = Math.min(ev.ci + 1, 7);
        Career.dialog(lines, Career.open); return; }
    } else { const id = Career.evId(ev.ci, ev.k); if (!c.won[id]) { c.won[id] = true; s.money += Math.round(1000 * cm); UI.toast(`${T('bonus')}: $ ${fmt(Math.round(1000 * cm))}`); }
      if (Career.unlockedBoss(ev.ci) && !c.boss[ch.boss] && !c['seen' + ev.ci]) { c['seen' + ev.ci] = true; Save.write(); Career.dialog([['mira', `${ch.name.ru} вызывает тебя на дуэль. Будь готов.`, `${ch.name.en} wants to race you. Be ready.`]], Career.open); return; } }
    Save.write(); Career.open();
  },
};
