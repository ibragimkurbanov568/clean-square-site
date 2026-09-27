// Окна: главное меню, создание персонажа, телефон (карта, банк, работы, машины, настройки), автосалон, банк, АЗС, пауза
import { esc, fmtMoney, $ } from '../core/util';
import { HAIRS, HAIRCOLS, TOPS, BOTTOMS, SHOES, Look, randomLook } from '../actors/human';
import { CARS } from '../vehicles/carModel';
import { JOBS } from '../sim/jobs';
import { mapImg, MAP_EXT, POI_ICON } from './hud';
import { xpForLevel, type GameState } from '../sim/state';
import { ITEMS, SHOPS } from '../sim/items';
import { ACHIEVEMENTS, COLLECT_N, makeDaily } from '../sim/life';
import { EMOTES, NEWS } from '../game/extras';
import { Snd } from '../core/audio';
import { rpName } from '../actors/peds';
import { reliableTaps } from './tap';

export interface MenuHost {
  state: GameState; hasSave: boolean; newGame(look: Look, name: string): void; continueGame(): void; resume(): void; save(): void;
  setLook(look: Look): void; buyCar(model: string, color: number, price: number): void; startJob(id: string): void; quitJob(): void; activeJob(): string | null;
  setRoute(x: number, z: number): void; bank(op: 'dep' | 'wd', amount: number): void; refuel(): void; locateCar(id: string): void; setQuality(q: string): void; setVol(v: number): void; setOrient(o: string): void;
  useItem(id: string): void; buyItem(id: string): void; medCard(): void;
  sellItem(id: string): void; emote(id: string): void; taxiTo(kind: string): void; sos(): void; casino(bet: number): string; radio(): string; busTo(i: number): void; bench(sleep: boolean): void; setOpt(k: string, v: any): void; heal(): void;
  weather(): { now: string; next: string; temp: number }; stops: { x: number; z: number; name: string }[];
  toMenu(): void; pois: { kind: string; name: string; door: [number, number] }[]; player: { x: number; z: number }; license(): void;
}
let H: MenuHost;
const ui = () => $('#ui');
export const Menu = {
  open: '' as string, phoneApp: '',
  init(host: MenuHost) { H = host; reliableTaps(ui(), '[data-a]', b => { Snd.play('click'); this.act(b.dataset.a!, b.dataset); }); },
  close() { ui().innerHTML = ''; this.open = ''; },
  show(html: string, cls = 'dim') { ui().innerHTML = `<div class="screen ${cls}">${html}</div>`; },
  act(a: string, d: DOMStringMap) {
    switch (a) {
      case 'new': this.creator(); break;
      case 'cont': H.continueGame(); break;
      case 'resume': H.resume(); break;
      case 'save': H.save(); break;
      case 'credits': this.credits(); break;
      case 'main': H.toMenu(); this.main(); break;
      case 'lk': { this.nameDraft = (document.getElementById('nm') as HTMLInputElement | null)?.value ?? this.nameDraft; const k = d.k!, v = d.v!; (this.look as any)[k] = k === 'sex' ? v : k === 'hair' ? v : k === 'sleeves' ? v === '1' : +v; if (k === 'sex') this.look.hair = HAIRS[this.look.sex][0]; H.setLook(this.look); this.creator(); break; }
      case 'rnd': this.nameDraft = ''; this.look = randomLook(); H.setLook(this.look); this.creator(); break;
      case 'create': { const n = (document.getElementById('nm') as HTMLInputElement).value.trim().replace(/\s+/g, '_'); if (!/^[А-ЯЁA-Z][а-яёa-z]+_[А-ЯЁA-Z][а-яёa-z]+$/.test(n)) { const e = document.getElementById('nmErr')!; e.textContent = 'Нужно имя и фамилия с большой буквы, например: Иван Петров'; return; } H.newGame(this.look, n); break; }
      case 'app': this.phone(d.id!); break;
      case 'buy': H.buyCar(d.id!, +d.c!, +d.p!); break;
      case 'job': H.startJob(d.id!); this.close(); break;
      case 'quit': H.quitJob(); this.phone('jobs'); break;
      case 'dep': H.bank('dep', +(document.getElementById('amt') as HTMLInputElement).value || 0); this.bank(); break;
      case 'wd': H.bank('wd', +(document.getElementById('amt') as HTMLInputElement).value || 0); this.bank(); break;
      case 'fuel': H.refuel(); this.close(); break;
      case 'gps': { const p = H.pois.find(q => q.kind === d.id); if (p) H.setRoute(p.door[0], p.door[1]); this.close(); break; }
      case 'loc': H.locateCar(d.id!); this.close(); break;
      case 'q': H.setQuality(d.v!); this.phone('set'); break;
      case 'or': H.setOrient(d.v!); this.phone('set'); break;
      case 'rot': H.setOrient((H.state.settings.orient || 'auto') === 'auto' ? 'free' : 'auto'); this.main(); break;
      case 'lic': H.license(); this.close(); break;
      case 'x': this.close(); H.resume(); break;
      case 'ch': this.character(d.t!); break;
      case 'use': H.useItem(d.id!); this.character('inv'); break;
      case 'kbuy': H.buyItem(d.id!); this.shop(this.shopKind); break;
      case 'ksell': H.sellItem(d.id!); this.shop(this.shopKind, true); break;
      case 'stab': this.shop(this.shopKind, d.v === '1'); break;
      case 'shopk': this.shop(d.v!); break;
      case 'emo': H.emote(d.id!); this.close(); H.resume(); break;
      case 'taxi': H.taxiTo(d.id!); break;
      case 'sos': H.sos(); break;
      case 'bet': { const r = H.casino(+d.v!); this.phone('casino'); const el = document.getElementById('slot'); if (el) el.textContent = r; break; }
      case 'radio': { const n = H.radio(); this.phone('radio'); const el = document.getElementById('rnow'); if (el) el.textContent = n; break; }
      case 'bus': H.busTo(+d.v!); break;
      case 'bench': H.bench(d.v === '1'); break;
      case 'opt': H.setOpt(d.k!, d.v === 'true' ? true : d.v === 'false' ? false : +d.v!); this.phone('set'); break;
      case 'heal': H.heal(); break;
      case 'med': H.medCard(); this.close(); break;
      case 'dcol': this.dealerColor = +d.v!; this.dealer(); break;
    }
  },
  // ---------- главное меню ----------
  main() {
    this.open = 'main';
    const touch = document.body.classList.contains('touch');
    this.show(`${touch ? '<button class="btn rotbtn" data-a="rot">⟳ Повернуть экран</button>' : ''}<div class="menu"><div class="menu-brand"><div class="logo">КР<span>А</span>Й</div><div class="tag">Новоозёрск · жизнь с нуля</div></div><div class="menu-btns">
      ${H.hasSave ? `<button class="btn primary" data-a="cont">Продолжить <small>${esc(H.state.name)} · ${H.state.level} ур.</small></button>` : ''}
      <button class="btn ${H.hasSave ? '' : 'primary'}" data-a="new">Новая игра <small>создать персонажа</small></button>
      <button class="btn" disabled>Онлайн-сервера <small>скоро</small></button>
      <button class="btn" data-a="credits">Титры и лицензии <small>авторы моделей и звуков</small></button>
      ${touch ? `<p class="muted small" style="margin-top:12px">Телефон: джойстик слева — ходьба (до края — бег), правая половина экрана — камера, кнопки справа — удар, прыжок, бег, действие, сесть. Сверху — телефон, карта, рюкзак.</p>` : `<p class="muted small" style="margin-top:12px">ПК: WASD — ходьба, мышь — камера, F — сесть/выйти, E — действие, P — телефон, M — карта, I — персонаж и рюкзак, Shift — бег, Пробел — прыжок/ручник, H — сигнал. На телефоне — экранные кнопки.</p>`}</div></div>`, 'dim');
  },
  async credits() {
    const base = (import.meta.env.BASE_URL || './') + 'assets/', get = async (p: string) => { try { return await (await fetch(base + p)).json(); } catch { return null; } };
    const [cars, props, snd] = await Promise.all([get('cars/catalog.json'), get('props/catalog.json'), get('snd/credits.json')]);
    const a = (u: string, t: string) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(t);
    this.show(`<div class="win panel char"><h2>Титры и лицензии</h2><div class="pane small">
      <p>Игра «КРАЙ» — вымышленный город; марки машин показаны под вымышленными названиями. Код, город и интерфейс созданы для этой игры.</p>
      <h3>Персонажи и текстуры (CC0)</h3><p>Quaternius — Universal Base Characters, Universal Animation Library · ambientCG — асфальт, бетон, плитка, трава, кирпич, штукатурка</p>
      <h3>Машины (CC-BY 4.0, Sketchfab)</h3><ul style="padding-left:18px">${(cars || []).map((c: any) => `<li>${esc(c.brand + ' ' + c.name)} — ${a(c.url, c.title)}, автор ${esc(c.author)}</li>`).join('')}</ul>
      <h3>Деревья и предметы улицы</h3><ul style="padding-left:18px">${(props || []).map((p: any) => `<li>${p.url ? a(p.url, p.title) : 'Poly Haven'} — ${esc(p.author)} (${esc(p.license)})</li>`).join('')}</ul>
      <h3>Звуки (CC0, Freesound)</h3><ul style="padding-left:18px">${Object.values(snd || {}).map((s: any) => `<li>${a(s.url, s.title)} — ${esc(s.user)}</li>`).join('')}</ul>
      <p>Three.js (MIT), Rapier (Apache-2.0), meshoptimizer (MIT).</p></div>
      <button class="btn" data-a="main">Назад</button></div>`);
  },
  // ---------- создание персонажа ----------
  look: randomLook() as Look, nameDraft: '',
  creator() {
    if (this.open !== 'creator') H.setLook(this.look);
    this.open = 'creator'; const L = this.look;
    const sw = (k: string, list: number[], cur: number) => `<div class="row">${list.map((c, i) => `<button class="sw ${c === cur ? 'on' : ''}" style="background:#${c.toString(16).padStart(6, '0')}" data-a="lk" data-k="${k}" data-v="${c}" aria-label="цвет ${i + 1}"></button>`).join('')}</div>`;
    const hairNames: Record<string, string> = { hair_buzzed: 'Короткая', hair_simpleparted: 'С пробором', hair_beard: 'Борода', '': 'Лысый', hair_long: 'Длинные', hair_buns: 'Пучки', hair_buzzedfemale: 'Короткая' };
    // слева — сам персонаж (камера смотрит на него), справа — компактная панель: настройки прокручиваются,
    // имя и кнопка «Начать» закреплены внизу и видны всегда, на любом экране
    this.show(`<div class="creator"><div class="cr-view"></div><div class="panel cr-panel">
      <div class="cr-head"><h2 class="h">Новый житель</h2><button class="btn" data-a="rnd">🎲 Случайно</button></div>
      <div class="cr-opts">
        <div><h3>Пол</h3><div class="row"><button class="btn ${L.sex === 'male' ? 'primary' : ''}" data-a="lk" data-k="sex" data-v="male">Мужской</button><button class="btn ${L.sex === 'female' ? 'primary' : ''}" data-a="lk" data-k="sex" data-v="female">Женский</button></div></div>
        <div><h3>Кожа</h3><input type="range" min="0" max="1" step=".05" value="${L.skin}" id="skin"></div>
        <div><h3>Причёска</h3><div class="row">${HAIRS[L.sex].map(h => `<button class="btn ${h === L.hair ? 'primary' : ''}" data-a="lk" data-k="hair" data-v="${h}">${hairNames[h]}</button>`).join('')}</div></div>
        <div><h3>Цвет волос</h3>${sw('hairCol', HAIRCOLS, L.hairCol)}</div>
        <div><h3>Верх</h3>${sw('top', TOPS, L.top)}<div class="row" style="margin-top:6px"><button class="btn ${L.sleeves ? 'primary' : ''}" data-a="lk" data-k="sleeves" data-v="1">Рукав</button><button class="btn ${!L.sleeves ? 'primary' : ''}" data-a="lk" data-k="sleeves" data-v="0">Футболка</button></div></div>
        <div><h3>Низ</h3>${sw('bottom', BOTTOMS, L.bottom)}</div><div><h3>Обувь</h3>${sw('shoes', SHOES, L.shoes)}</div>
      </div>
      <div class="cr-foot"><input type="text" id="nm" placeholder="Имя Фамилия" value="${esc(this.nameDraft || H.state.name || rpName(L.sex === 'female').replace('_', ' '))}" maxlength="24" aria-label="Имя в городе">
        <button class="btn primary" data-a="create">Начать ▶</button></div><div id="nmErr" class="small" style="color:#ff8a7a"></div></div></div>`, '');
    const nm = document.getElementById('nm') as HTMLInputElement; nm.oninput = () => { this.nameDraft = nm.value; };
    const sk = document.getElementById('skin') as HTMLInputElement; sk.oninput = () => { L.skin = +sk.value; H.setLook(L); };
  },
  // ---------- персонаж (I / Tab) ----------
  charTab: 'me' as string,
  character(tab?: string) {
    tab = tab || this.charTab;
    this.open = 'char'; this.charTab = tab; const s = H.state, L = s.look;
    const tabs: [string, string][] = [['me', '👤 Персонаж'], ['needs', '❤ Состояние'], ['inv', '🎒 Рюкзак'], ['skills', '📈 Навыки'], ['docs', '🪪 Документы'], ['prop', '🏠 Имущество'], ['stats', '📊 Статистика']];
    const bar = (v: number, col = 'var(--red)') => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(0)}%;background:${col}"></i></div>`;
    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    let body = '';
    if (tab === 'me') body = `<div class="kv"><span>Имя</span><b>${esc(s.name.replace('_', ' '))}</b></div><div class="kv"><span>Уровень</span><b>${s.level} · ${s.xp}/${xpForLevel(s.level)} опыта</b></div>${bar(s.xp / xpForLevel(s.level) * 100, 'var(--yellow)')}
      <div class="kv"><span>Пол</span><b>${L?.sex === 'female' ? 'женский' : 'мужской'}</b></div>
      <div class="kv"><span>Одежда</span><b><span class="sw" style="display:inline-block;width:16px;height:16px;background:${hex(L?.top || 0)}"></span> верх · <span class="sw" style="display:inline-block;width:16px;height:16px;background:${hex(L?.bottom || 0)}"></span> низ · <span class="sw" style="display:inline-block;width:16px;height:16px;background:${hex(L?.shoes || 0)}"></span> обувь</b></div>
      <div class="kv"><span>Работа</span><b>${H.activeJob() ? esc(JOBS[H.activeJob()!].name) : 'безработный'}</b></div><div class="kv"><span>Розыск</span><b>${s.wanted ? '★'.repeat(s.wanted) : 'чист перед законом'}</b></div>
      <p class="small muted">Сменить одежду можно в магазине «Галерея» (в центре) — примерочная появится в следующей версии.</p>`;
    if (tab === 'needs') { const N = s.needs, st = (v: number) => v < 10 ? '<span style="color:#ff6a5a">критично</span>' : v < 30 ? '<span style="color:#ffb44a">низко</span>' : 'норма';
      body = `<div class="kv"><span>❤ Здоровье</span><b>${Math.round(s.health)}</b></div>${bar(s.health)}
      <div class="kv"><span>🍞 Сытость</span><b>${Math.round(N.food)} · ${st(N.food)}</b></div>${bar(N.food, '#8fd16a')}
      <div class="kv"><span>💧 Жажда</span><b>${Math.round(N.water)} · ${st(N.water)}</b></div>${bar(N.water, '#4aa8ff')}
      <div class="kv"><span>⚡ Бодрость</span><b>${Math.round(N.energy)} · ${st(N.energy)}</b></div>${bar(N.energy, '#f5c518')}
      <div class="kv"><span>😊 Настроение</span><b>${Math.round(N.mood)} · ${st(N.mood)}</b></div>${bar(N.mood, '#c77dff')}
      <p class="small muted">Еда и вода — в ларьках у остановок, выспаться — в гостинице «Край». Голод и жажда на нуле отнимают здоровье, без бодрости нельзя бежать. Настроение поднимают музыка, танцы, сладкое, подарки; портит — дождь без зонта.</p>`; }
    if (tab === 'inv') { const it = Object.entries(s.inv).filter(([, n]) => n > 0);
      body = it.length ? `<div class="grid">${it.map(([id, n]) => { const I = ITEMS[id]; return I ? `<div class="card"><b>${I.icon} ${I.name} ×${n}</b><span class="small muted">${I.desc}</span><button class="btn" data-a="use" data-id="${id}">Использовать</button></div>` : ''; }).join('')}</div>` : '<p class="muted">Рюкзак пуст. Купить еду и воду можно в ларьках.</p>';
      body += `<p class="small muted">Вещей: ${it.reduce((a, [, n]) => a + n, 0)}/20 · Наличные: ${fmtMoney(s.money)}</p>`; }
    if (tab === 'skills') { const sk: [string, number, string][] = [['🚗 Вождение', s.skills.drive, 'Растёт от пройденных за рулём километров. Уменьшает повреждения машины при ударах (до −30%).'], ['🏃 Выносливость', s.skills.stamina, 'Растёт от бега. Ускоряет бег (до +12%) и медленнее тратит бодрость.']];
      body = sk.map(([n, v, d]) => `<div class="doc"><div class="kv"><span>${n}</span><b>${v.toFixed(1)} / 100</b></div>${bar(v, 'var(--green)')}<span class="small muted">${d}</span></div>`).join(''); }
    if (tab === 'docs') body = `<div class="doc"><b>🪪 Паспорт гражданина</b><span class="small">${esc(s.name.replace('_', ' '))} · г. Новоозёрск · прописка: общежитие № 3</span></div>
      <div class="doc"><b>🚗 Водительское удостоверение</b><span class="small">${s.licenses.B ? 'Категория B — действует' : 'Нет. Получить — в мэрии (15 000 ₽)'}</span></div>
      <div class="doc"><b>🩺 Медицинская карта</b><span class="small">${s.docs.med ? 'Оформлена — годен' : 'Нет. Оформить — в больнице (1 500 ₽), нужна для работы в такси в будущих версиях'}</span></div>`;
    if (tab === 'prop') body = `<h3>Транспорт</h3>${s.cars.length ? s.cars.map(c => { const m = CARS.find(x => x.id === c.model); return `<div class="card"><b>${esc((m?.brand || '') + ' ' + (m?.name || c.model))}</b><span class="small">${esc(c.plate)} · топливо ${Math.round(c.fuel * 100)}% · повреждения ${Math.round(c.dmg)}%</span><button class="btn" data-a="loc" data-id="${c.id}">Показать на карте</button></div>`; }).join('') : '<p class="muted">Своих машин нет.</p>'}
      <h3>Жильё и бизнес</h3><p class="muted">Комната в общежитии (бесплатно). Квартиры, дома и бизнесы — в следующих обновлениях.</p>`;
    if (tab === 'stats') { const t = s.stats.playTime; body = `<div class="kv"><span>Заработано всего</span><b>${fmtMoney(s.stats.earned)}</b></div><div class="kv"><span>Проехано</span><b>${(s.stats.distance / 1000).toFixed(1)} км</b></div><div class="kv"><span>Задержаний</span><b>${s.stats.arrests}</b></div><div class="kv"><span>В игре</span><b>${Math.floor(t / 3600)} ч ${Math.floor(t / 60) % 60} мин</b></div><div class="kv"><span>Игровой день</span><b>${s.day}</b></div>`
      + Object.entries(JOBS).map(([id, j]) => `<div class="kv"><span>${j.name}</span><b>${s.job.done[id] || 0} заданий</b></div>`).join(''); }
    this.show(`<div class="char panel win"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(s.name.replace('_', ' '))}</h2><button class="btn" data-a="x">Закрыть [I]</button></div>
      <div class="tabs">${tabs.map(([id, n]) => `<button class="btn ${id === tab ? 'primary' : ''}" data-a="ch" data-t="${id}">${n}</button>`).join('')}</div><div class="pane">${body}</div></div>`);
  },
  // ---------- ларёк ----------
  // ---------- магазины ----------
  shopKind: 'kiosk' as string,
  kiosk() { this.shop('kiosk'); },
  shop(kind: string, sell = false) {
    this.open = 'kiosk'; this.shopKind = kind; const s = H.state, S = SHOPS[kind], bag = Object.values(s.inv).reduce((a, b) => a + b, 0);
    const fish = Object.entries(s.inv).filter(([id, n]) => n > 0 && ITEMS[id]?.sell);
    const rows = sell ? (fish.length ? fish.map(([id, n]) => { const I = ITEMS[id]; return `<div class="kv"><span>${I.icon} ${I.name} ×${n}</span><button class="btn" data-a="ksell" data-id="${id}">+${fmtMoney(I.sell!)}</button></div>`; }).join('') : '<p class="muted">Продавать нечего. Рыбу ловят удочкой на набережной.</p>')
      : S.items.map(id => { const I = ITEMS[id]; return `<div class="kv"><span>${I.icon} ${I.name} <span class="small muted">${I.desc}</span></span><button class="btn" data-a="kbuy" data-id="${id}">${fmtMoney(I.price)}</button></div>`; }).join('');
    this.show(`<div class="char panel win" style="max-width:560px"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${S.name}</h2><button class="btn" data-a="x">Уйти</button></div>
      <p class="small muted">Наличные: ${fmtMoney(s.money)} · в рюкзаке ${bag}/20</p>
      ${kind === 'kiosk' ? `<div class="tabs"><button class="btn ${!sell ? 'primary' : ''}" data-a="stab" data-v="0">Купить</button><button class="btn ${sell ? 'primary' : ''}" data-a="stab" data-v="1">Сдать улов</button></div>` : ''}
      <div class="list pane">${rows}</div></div>`);
  },
  // ---------- эмоции, автобус, лавочка, больница ----------
  emotes() { this.open = 'emo'; this.show(`<div class="char panel win" style="max-width:520px"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Эмоции</h2><button class="btn" data-a="x">Закрыть</button></div><div class="grid">${EMOTES.map(([id, ic]) => `<button class="btn" data-a="emo" data-id="${id}">${ic} ${({ wave: 'Помахать', dance: 'Танцевать', sit: 'Сесть', crouch: 'Присесть', roll: 'Кувырок', fix: 'Чинить', talk: 'Болтать', pistol: 'Руки вверх' } as any)[id]}</button>`).join('')}</div><p class="small muted">Эмоция держится, пока вы стоите. Танец поднимает настроение.</p></div>`); },
  bus(from: number) { this.open = 'bus'; this.show(`<div class="char panel win" style="max-width:560px"><div class="row" style="justify-content:space-between"><h2 style="margin:0">🚌 Остановка</h2><button class="btn" data-a="x">Уйти</button></div><p class="small muted">Проезд — 40 ₽. Куда едем?</p><div class="list pane">${H.stops.map((st, i) => i === from ? '' : `<div class="kv"><span>${esc(st.name)}</span><button class="btn" data-a="bus" data-v="${i}">Поехать</button></div>`).join('')}</div></div>`); },
  benchMenu(night: boolean) { this.open = 'bench'; this.show(`<div class="char panel win" style="max-width:440px"><h2 style="margin:0">🪑 Лавочка</h2><div class="list"><button class="btn" data-a="bench" data-v="0">Посидеть</button>${night ? '<button class="btn" data-a="bench" data-v="1">Поспать до утра <small>бодрость, но могут обокрасть</small></button>' : '<p class="small muted">Поспать на лавочке можно только ночью.</p>'}<button class="btn" data-a="x">Уйти</button></div></div>`); },
  hospital() { this.open = 'hosp'; this.show(`<div class="char panel win" style="max-width:440px"><h2 style="margin:0">✚ Областная больница</h2><div class="list"><button class="btn primary" data-a="heal">Лечение <small>300 ₽, здоровье 100</small></button><button class="btn" data-a="med" ${H.state.docs.med ? 'disabled' : ''}>Медкарта <small>1 500 ₽</small></button><button class="btn" data-a="shopk" data-v="pharmacy">Аптека</button><button class="btn" data-a="x">Уйти</button></div></div>`); },
  // ---------- телефон ----------
  phone(app = '') {
    this.open = 'phone'; this.phoneApp = app; const s = H.state;
    const apps: [string, string, string, string][] = [['map', 'Карта', '🗺', '#2d6cdf'], ['bank', 'Банк', '₽', '#1f9d55'], ['jobs', 'Работа', '💼', '#c77d1f'], ['cars', 'Мои авто', '🚗', '#8a3fd1'], ['stats', 'Профиль', '👤', '#3a4a66'], ['daily', 'Задания', '📅', '#d6352b'], ['ach', 'Награды', '🏆', '#b8860b'], ['taxi', 'Такси', '🚕', '#e0b400'], ['radio', 'Радио', '📻', '#6a4bc4'], ['weather', 'Погода', '⛅', '#3a8fd6'], ['news', 'Новости', '📰', '#707a8a'], ['casino', 'Слоты', '🎰', '#9c2a6b'], ['sos', '112', '🚑', '#e04848'], ['help', 'Справка', '❓', '#2f7d6a'], ['set', 'Настройки', '⚙', '#56627a']];
    let body = '';
    if (!app) body = `<div class="apps">${apps.map(([id, n, ic, c]) => `<button class="app" data-a="app" data-id="${id}"><i style="background:${c}">${ic}</i>${n}</button>`).join('')}</div>
      <div class="panel small" style="margin-top:10px"><b>Совет:</b> ${s.level < 2 ? 'начни с курьера на почте или грузчиком в порту — это рядом.' : 'права категории B покупаются в мэрии, потом можно в такси.'}</div>
      <button class="btn" data-a="save" style="margin-top:10px;width:100%">💾 Сохранить игру</button>`;
    if (app === 'map') body = `<canvas class="map" id="pmap" width="600" height="600"></canvas><p class="small muted">Нажми на карту — проложу маршрут. Или выбери место:</p><div class="list">${H.pois.map(p => `<button class="btn" data-a="gps" data-id="${p.kind}">${POI_ICON[p.kind]?.[0] || '●'} ${esc(p.name)}</button>`).join('')}</div>`;
    if (app === 'bank') body = `<div class="kv"><span>Наличные</span><b class="num">${fmtMoney(s.money)}</b></div><div class="kv"><span>На карте</span><b class="num">${fmtMoney(s.bank)}</b></div><p class="small muted" style="margin:8px 0">Переводы и снятие — у банка «Северный» (в центре). В телефоне — только баланс.</p>`;
    if (app === 'jobs') { const cur = H.activeJob(); body = `${cur ? `<div class="panel"><b>Сейчас: ${JOBS[cur].name}</b><button class="btn" data-a="quit" style="margin-top:8px;width:100%">Уволиться</button></div>` : ''}<div class="list" style="margin-top:8px">${Object.entries(JOBS).map(([id, j]) => `<div class="card"><b>${j.name}</b><span class="small muted">${j.desc}</span><span class="small">С ${j.minLevel} уровня · выполнено: ${s.job.done[id] || 0}</span><button class="btn" data-a="gps" data-id="${({ courier: 'courier', loader: 'loader', taxi: 'taxi' } as any)[id]}">Маршрут к работе</button></div>`).join('')}</div>`; }
    if (app === 'cars') body = s.cars.length ? `<div class="list">${s.cars.map(c => `<div class="card"><b>${esc(CARS.find(m => m.id === c.model)?.brand + ' ' + CARS.find(m => m.id === c.model)?.name)}</b><span class="small">${esc(c.plate)} · топливо ${Math.round(c.fuel * 100)}%</span><button class="btn" data-a="loc" data-id="${c.id}">Показать на карте</button></div>`).join('')}</div>` : '<p class="muted">Своих машин пока нет. Автосалон «Магистраль» — в центре, авторынок — на юго-востоке.</p>';
    if (app === 'stats') body = `<div class="kv"><span>Имя</span><b>${esc(s.name)}</b></div><div class="kv"><span>Уровень</span><b>${s.level}</b></div><div class="kv"><span>Заработано</span><b>${fmtMoney(s.stats.earned)}</b></div><div class="kv"><span>Права B</span><b>${s.licenses.B ? 'есть' : 'нет'}</b></div><div class="kv"><span>День</span><b>${s.day}</b></div>`;
    if (app === 'daily') { const d = s.daily && s.daily.day === s.day ? s.daily.list : makeDaily(s.day); body = `<p class="small muted">День ${s.day}. Новые задания — каждый игровой день.</p><div class="list">${d.map(t => `<div class="card ${t.done ? 'on' : ''}"><b>${t.done ? '✅' : '▫'} ${t.text}</b><div class="bar"><i style="width:${Math.round(t.prog / t.goal * 100)}%;background:var(--green)"></i></div><span class="small">Награда: ${fmtMoney(t.reward)}</span></div>`).join('')}</div>`; }
    if (app === 'ach') { const n = ACHIEVEMENTS.filter(a => s.ach[a.id]).length; body = `<p class="small muted">Получено ${n} из ${ACHIEVEMENTS.length} · матрёшек ${s.collect.length}/${COLLECT_N}</p><div class="list">${ACHIEVEMENTS.map(a => `<div class="card ${s.ach[a.id] ? 'on' : ''}" style="${s.ach[a.id] ? '' : 'opacity:.6'}"><b>${a.icon} ${a.name}</b><span class="small muted">${a.desc} · ${fmtMoney(a.reward)}</span></div>`).join('')}</div>`; }
    if (app === 'taxi') body = `<p class="small muted">Такси довезёт быстро. Цена зависит от расстояния (15 ₽/100 м, минимум 150 ₽).</p><div class="list">${H.pois.map(p => { const d = Math.hypot(p.door[0] - H.player.x, p.door[1] - H.player.z); return `<div class="kv"><span>${POI_ICON[p.kind]?.[0] || '●'} ${esc(p.name)}</span><button class="btn" data-a="taxi" data-id="${p.kind}">${fmtMoney(Math.max(150, Math.round(d / 100 * 15)))}</button></div>`; }).join('')}</div>`;
    if (app === 'radio') body = `<p>Сейчас: <b id="rnow">—</b></p><button class="btn primary" data-a="radio" style="width:100%">📻 Следующая станция / выкл.</button><p class="small muted">Музыка сочиняется на лету. В машине звучит через колонки, пешком — нужны наушники (продаются в супермаркете) или просто слушайте телефон.</p>`;
    if (app === 'weather') { const w = H.weather(); body = `<div class="card"><b>Сейчас: ${esc(w.now)}</b><span class="num" style="font:40px var(--head)">${w.temp > 0 ? '+' : ''}${w.temp}°</span><span class="small muted">Далее: ${esc(w.next)}</span></div><p class="small muted">Под дождём без зонта портится настроение.</p>`; }
    if (app === 'news') body = `<div class="list">${[...NEWS].sort(() => Math.random() - .5).slice(0, 6).map(n => `<div class="card"><span>${esc(n)}</span></div>`).join('')}</div>`;
    if (app === 'casino') body = `<div class="card" style="align-items:center"><span id="slot" style="font-size:44px;letter-spacing:6px">🍒🍋🔔</span></div><div class="row" style="margin-top:8px">${[100, 500, 1000].map(b => `<button class="btn" data-a="bet" data-v="${b}">Ставка ${fmtMoney(b)}</button>`).join('')}</div><p class="small muted">Три одинаковых — ×10, 🍀🍀🍀 — ×50, два одинаковых — ×2. Играйте ответственно: казино всегда в плюсе.</p>`;
    if (app === 'sos') body = `<p>Скорая помощь приедет и вылечит на месте.</p><button class="btn primary" data-a="sos" style="width:100%">🚑 Вызвать скорую — 500 ₽</button><p class="small muted">Здоровье сейчас: ${Math.round(s.health)}</p>`;
    if (app === 'help') body = `<div class="list small"><div class="card"><b>Как заработать</b><span>Работа в телефоне: курьер (почта), грузчик (порт), такси (нужны права B). Задания дня и достижения тоже платят.</span></div><div class="card"><b>Как не умереть с голоду</b><span>Ларьки у остановок, супермаркет в ТЦ «Галерея», аптека в больнице. Спать — в гостинице или на лавочке ночью.</span></div><div class="card"><b>Рыбалка</b><span>Купите удочку и наживку, встаньте на набережной у реки, используйте удочку в рюкзаке. Когда «КЛЮЁТ» — жмите E или ✊.</span></div><div class="card"><b>Матрёшки</b><span>30 штук спрятано по городу. Каждая — 500 ₽, все — большой приз.</span></div><div class="card"><b>Автобус</b><span>На любой остановке (E) — проезд в другой район за 40 ₽.</span></div></div>`;
    if (app === 'set') body = `<h3>Графика</h3><div class="row">${[['low', 'Низкая'], ['mid', 'Средняя'], ['high', 'Высокая']].map(([v, n]) => `<button class="btn ${s.settings.quality === v ? 'primary' : ''}" data-a="q" data-v="${v}">${n}</button>`).join('')}</div><p class="small muted">Смена качества применится после перезагрузки страницы.</p><h3>Экран</h3><div class="row">${[['auto', 'Горизонтально'], ['free', 'Как держу']].map(([v, n]) => `<button class="btn ${(s.settings.orient || 'auto') === v ? 'primary' : ''}" data-a="or" data-v="${v}">${n}</button>`).join('')}</div><p class="small muted">«Горизонтально» — игра сама разворачивается, даже если телефон держите вертикально.</p><h3>Громкость</h3><input type="range" id="vol" min="0" max="1" step=".05" value="${s.settings.vol}">
      <h3>Чувствительность камеры</h3><div class="row">${[.6, 1, 1.5, 2.2].map(v => `<button class="btn ${(s.settings.sens || 1) === v ? 'primary' : ''}" data-a="opt" data-k="sens" data-v="${v}">×${v}</button>`).join('')}</div>
      <h3>Обзор (FOV)</h3><div class="row">${[55, 62, 70, 80].map(v => `<button class="btn ${(s.settings.fov || 62) === v ? 'primary' : ''}" data-a="opt" data-k="fov" data-v="${v}">${v}°</button>`).join('')}</div>
      <h3>Длина суток</h3><div class="row">${[[24, '24 мин'], [48, '48 мин'], [96, '96 мин']].map(([v, n]) => `<button class="btn ${(s.settings.dayLen || 48) === v ? 'primary' : ''}" data-a="opt" data-k="dayLen" data-v="${v}">${n}</button>`).join('')}</div>
      <h3>Размер интерфейса</h3><div class="row">${[[.85, 'Мелкий'], [1, 'Обычный'], [1.15, 'Крупный']].map(([v, n]) => `<button class="btn ${(s.settings.hud || 1) === v ? 'primary' : ''}" data-a="opt" data-k="hud" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn ${s.settings.invert ? 'primary' : ''}" data-a="opt" data-k="invert" data-v="${!s.settings.invert}">Инверсия камеры</button><button class="btn ${s.settings.fps ? 'primary' : ''}" data-a="opt" data-k="fps" data-v="${!s.settings.fps}">Счётчик FPS</button></div>`;
    ui().innerHTML = `<div class="phone"><div class="bar"><span>${app ? `<button data-a="app" data-id="" style="background:none;border:0;color:#9cc8ff">‹ Назад</button>` : 'КрайТелеком'}</span><span>📶 🔋</span></div><div class="body">${body}</div><div class="home"><button data-a="x" aria-label="Закрыть"></button></div></div>`;
    if (app === 'map') this.drawBigMap();
    const vol = document.getElementById('vol') as HTMLInputElement | null; if (vol) vol.oninput = () => H.setVol(+vol.value);
  },
  drawBigMap() {
    const c = document.getElementById('pmap') as HTMLCanvasElement, g = c.getContext('2d')!, S = 600, k = S / 1024;
    g.drawImage(mapImg, 0, 0, S, S); const P = (x: number, z: number) => [(x + MAP_EXT) / (2 * MAP_EXT) * S, (z + MAP_EXT) / (2 * MAP_EXT) * S];
    for (const p of H.pois) { const [x, y] = P(p.door[0], p.door[1]), ic = POI_ICON[p.kind]; g.fillStyle = ic?.[1] || '#fff'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.font = '12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#111'; g.fillText(ic?.[0] || '', x, y + 1); }
    const [px, py] = P(H.player.x, H.player.z); g.fillStyle = '#fff'; g.strokeStyle = '#d6352b'; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill(); g.stroke();
    c.onclick = e => { const x = e.offsetX / c.clientWidth * 2 * MAP_EXT - MAP_EXT, z = e.offsetY / c.clientHeight * 2 * MAP_EXT - MAP_EXT; H.setRoute(x, z); this.close(); H.resume(); };
    void k;
  },
  // ---------- автосалон ----------
  dealerColor: 0xf2f2f2, dealerKind: 'dealer',
  dealer(kind?: string) {
    kind = kind || this.dealerKind; this.dealerKind = kind; this.open = 'dealer'; const s = H.state, used = kind === 'used';
    const list = CARS.filter(c => c.price > 0 && (used ? c.price < 300000 : c.price >= 100000));
    const cols = [0xf2f2f2, 0x1a1a1c, 0x8a8f96, 0x7a1e1e, 0x1f3a6b, 0x2f5d3a, 0xc9b28a, 0x274b8c, 0xd6352b, 0xf5c518];
    this.show(`<div class="win"><div class="row" style="justify-content:space-between"><h2>${used ? 'Авторынок б/у' : 'Автосалон «Магистраль»'}</h2><button class="btn" data-a="x">Закрыть</button></div>
      <p class="muted">Наличные: <b class="num">${fmtMoney(s.money)}</b> · на карте: <b class="num">${fmtMoney(s.bank)}</b>. ${s.licenses.B ? '' : '<span style="color:#ff8a7a">Без прав категории B ездить можно, но полиция оштрафует.</span>'}</p>
      <h3>Цвет</h3><div class="row">${cols.map(c => `<button class="sw ${c === this.dealerColor ? 'on' : ''}" style="background:#${c.toString(16).padStart(6, '0')}" data-a="dcol" data-v="${c}" aria-label="цвет"></button>`).join('')}</div>
      <div class="grid">${list.map(c => { const price = used ? Math.round(c.price * .7) : c.price; return `<div class="card"><span class="small muted">${esc(c.brand)}</span><b>${esc(c.name)}</b><span class="small">${c.power} л.с. · до ${c.maxSpeed} км/ч</span><span class="p">${fmtMoney(price)}</span><button class="btn primary" data-a="buy" data-id="${c.id}" data-c="${this.dealerColor}" data-p="${price}" ${s.money + s.bank < price ? 'disabled' : ''}>Купить</button></div>`; }).join('')}</div></div>`);
  },
  bank() {
    this.open = 'bank'; const s = H.state;
    this.show(`<div class="win panel" style="max-width:420px"><h2>Банк «Северный»</h2><div class="kv"><span>Наличные</span><b class="num">${fmtMoney(s.money)}</b></div><div class="kv"><span>На карте</span><b class="num">${fmtMoney(s.bank)}</b></div>
      <input type="text" id="amt" inputmode="numeric" placeholder="Сумма" value="${Math.max(0, Math.floor(s.money / 1000) * 1000) || ''}">
      <div class="row"><button class="btn primary" data-a="dep">Положить</button><button class="btn" data-a="wd">Снять</button><button class="btn" data-a="x">Выйти</button></div>
      <p class="small muted">На карте деньги не теряются, если вас ограбят или арестуют.</p></div>`);
  },
  gas(price: number) { this.open = 'gas'; this.show(`<div class="win panel" style="max-width:420px"><h2>АЗС</h2><p>Полный бак: <b>${fmtMoney(price)}</b></p><div class="row"><button class="btn primary" data-a="fuel">Заправить</button><button class="btn" data-a="x">Отмена</button></div></div>`); },
  cityhall() { this.open = 'hall'; const s = H.state; this.show(`<div class="win panel" style="max-width:460px"><h2>Мэрия</h2><p>Водительские права категории B: <b>${fmtMoney(15000)}</b> (экзамен — в следующей версии, пока — оплата пошлины).</p><div class="row"><button class="btn primary" data-a="lic" ${s.licenses.B ? 'disabled' : ''}>${s.licenses.B ? 'Права уже есть' : 'Получить права'}</button><button class="btn" data-a="x">Выйти</button></div></div>`); },
  jobOffer(id: string) {
    this.open = 'job'; const j = JOBS[id], s = H.state, cur = H.activeJob();
    this.show(`<div class="win panel" style="max-width:460px"><h2>${j.name}</h2><p>${j.desc}</p><p class="small muted">Выполнено заданий: ${s.job.done[id] || 0}. Ранги: ${j.ranks.join(' → ')}</p>
      ${s.level < j.minLevel ? `<p style="color:#ff8a7a">Нужен ${j.minLevel} уровень.</p>` : ''}${id === 'taxi' && !s.licenses.B ? '<p style="color:#ff8a7a">Нужны права категории B (мэрия).</p>' : ''}
      <div class="row"><button class="btn primary" data-a="job" data-id="${id}" ${s.level < j.minLevel || (id === 'taxi' && !s.licenses.B) || cur === id ? 'disabled' : ''}>${cur === id ? 'Вы уже работаете' : cur ? 'Сменить работу' : 'Устроиться'}</button><button class="btn" data-a="x">Уйти</button></div></div>`);
  },
  pause() { this.open = 'pause'; this.show(`<div class="menu"><div class="logo" style="font-size:64px">Пауза</div><button class="btn primary" data-a="resume">Продолжить</button><button class="btn" data-a="app" data-id="">Телефон</button><button class="btn" data-a="save">Сохранить</button><button class="btn" data-a="main">Главное меню</button></div>`); },
};
