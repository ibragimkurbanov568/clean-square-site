// HUD: деньги, время, уровень, розыск, мини-карта, спидометр, задание, подсказки, чат «сервера», уведомления, сенсорные кнопки
import { City, CITY, HALF, roadLine, RIVER } from '../world/citygen';
import { Markers } from '../world/markers';
import { esc, fmtMoney, fmtTime, pick, $ } from '../core/util';
import { touchBtn, Inp } from '../core/input';
import { rpName } from '../actors/peds';

export const MAP_EXT = 1150; // половина размера карты в метрах
export let mapImg: HTMLCanvasElement;
export function drawMapImage(city: City) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!, k = S / (2 * MAP_EXT), X = (x: number) => (x + MAP_EXT) * k;
  g.fillStyle = '#35462f'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#2b4a63'; g.fillRect(0, X(RIVER.z0), S, (RIVER.z1 - RIVER.z0) * k);
  g.fillStyle = '#2a3140'; g.fillRect(X(-HALF - 11), X(-HALF - 11), (2 * HALF + 22) * k, (2 * HALF + 22) * k);
  g.fillStyle = '#6b7385'; const w = CITY.ROAD * k;
  for (let i = 0; i <= CITY.N; i++) { const p = X(roadLine(i)); g.fillRect(p - w / 2, X(-HALF - 7), w, (2 * HALF + 14) * k); g.fillRect(X(-HALF - 7), p - w / 2, (2 * HALF + 14) * k, w); }
  const cl = X(roadLine(6)); g.fillRect(cl - w / 2, X(-MAP_EXT), w, X(roadLine(6)) - X(-MAP_EXT)); g.fillRect(cl, cl - w / 2, S - cl, w);
  g.fillStyle = '#4a5468'; for (const b of city.buildings) g.fillRect(X(b.x - b.w / 2), X(b.z - b.d / 2), b.w * k, b.d * k);
  g.fillStyle = '#3d5a36'; for (const t of city.trees) if (Math.abs(t.x) < HALF && Math.abs(t.z) < HALF) g.fillRect(X(t.x) - 1, X(t.z) - 1, 2, 2);
  mapImg = c; return c;
}
export const POI_ICON: Record<string, [string, string]> = {
  police: ['👮', '#3f7fd6'], hospital: ['✚', '#e04848'], bank: ['₽', '#3fbf6a'], dealer: ['🚗', '#f5c518'], taxi: ['🚕', '#f5c518'], courier: ['📦', '#f5a13d'], loader: ['⚓', '#f5a13d'],
  clothes: ['👕', '#c77dff'], hotel: ['🏨', '#9cc8ff'], station: ['🚉', '#9cc8ff'], gas: ['⛽', '#ff8a3d'], used: ['🔧', '#f5c518'], cityhall: ['🏛', '#ffffff'],
};

export const HUD = {
  el: {} as Record<string, HTMLElement>, chatLines: [] as string[], chatT: 4, mini: null as unknown as CanvasRenderingContext2D,
  init() {
    const hud = $('#hud');
    hud.innerHTML = `<div class="chat" id="chat"></div><div class="objective" id="obj"></div>
      <div class="hud-tr"><div class="hud-clock"><span id="clock" class="num"></span><span id="wx"></span></div><div class="hud-money num" id="money"></div><div class="hud-bank num" id="bank"></div>
      <div class="hud-lvl"><b id="lvl">1</b><div class="xp"><i id="xp"></i></div></div><div class="health"><i id="hp"></i></div><div class="stars" id="stars"></div></div>
      <canvas id="mini" width="380" height="380"></canvas><div class="hint" id="hint"></div><div class="bust" id="bust"></div>
      <div class="speedo" id="speedo"><div><span class="v num" id="spd">0</span> <span class="u">КМ/Ч</span></div><div class="row"><span id="gear">1</span><span>⛽</span><div class="fuel"><i id="fuel"></i></div></div></div>`;
    for (const id of ['chat', 'obj', 'clock', 'wx', 'money', 'bank', 'lvl', 'xp', 'hp', 'stars', 'hint', 'bust', 'speedo', 'spd', 'gear', 'fuel']) this.el[id] = document.getElementById(id)!;
    this.mini = (document.getElementById('mini') as HTMLCanvasElement).getContext('2d')!;
    // сенсорные кнопки
    const t = $('#touch');
    const B = (id: string, label: string, css: string) => `<div class="tb" data-b="${id}" style="${css}">${label}</div>`;
    t.innerHTML = `<div class="joy" id="joy"><i></i></div>` +
      B('jump', 'ПРЫЖ', 'right:calc(24px + var(--sar));bottom:calc(120px + var(--sab));width:70px;height:70px') +
      B('sprint', 'БЕГ', 'right:calc(104px + var(--sar));bottom:calc(40px + var(--sab));width:70px;height:70px') +
      B('enter', 'СЕСТЬ', 'right:calc(24px + var(--sar));bottom:calc(210px + var(--sab));width:62px;height:62px;color:#f5c518') +
      B('use', 'E', 'right:calc(104px + var(--sar));bottom:calc(130px + var(--sab));width:56px;height:56px') +
      B('attack', '✊', 'right:calc(24px + var(--sar));bottom:calc(40px + var(--sab));width:70px;height:70px') +
      B('gas', 'ГАЗ', 'right:calc(24px + var(--sar));bottom:calc(40px + var(--sab));width:84px;height:84px') +
      B('brake', 'ТОРМ', 'right:calc(120px + var(--sar));bottom:calc(30px + var(--sab));width:66px;height:66px') +
      B('hb', 'РУЧН', 'right:calc(120px + var(--sar));bottom:calc(110px + var(--sab));width:60px;height:60px') +
      B('horn', '📯', 'right:calc(40px + var(--sar));bottom:calc(140px + var(--sab));width:52px;height:52px') +
      B('phone', '📱', 'right:calc(24px + var(--sar));top:calc(210px + var(--sat));width:52px;height:52px') +
      B('cam', '🎥', 'right:calc(84px + var(--sar));top:calc(210px + var(--sat));width:52px;height:52px');
    t.querySelectorAll<HTMLElement>('.tb').forEach(el => {
      const b = el.dataset.b!, on = (e: PointerEvent) => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); touchBtn(b, true); try { el.setPointerCapture(e.pointerId); } catch { /* ок */ } };
      const off = () => { el.classList.remove('on'); touchBtn(b, false); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    });
  },
  touchMode(inCar: boolean) {
    document.querySelectorAll<HTMLElement>('#touch .tb').forEach(el => { const b = el.dataset.b!, car = ['gas', 'brake', 'hb', 'horn'].includes(b), foot = ['jump', 'sprint', 'attack'].includes(b); el.classList.toggle('hide', inCar ? foot : car); if (b === 'enter') el.textContent = inCar ? 'ВЫЙТИ' : 'СЕСТЬ'; });
    const j = document.getElementById('joy')!; if (Inp.joy.id >= 0) { j.style.display = 'block'; j.style.left = Inp.joy.x0 - 60 + 'px'; j.style.top = Inp.joy.y0 - 60 + 'px'; const i = j.firstElementChild as HTMLElement; i.style.transform = `translate(${Math.max(-40, Math.min(40, Inp.joy.x - Inp.joy.x0))}px,${Math.max(-40, Math.min(40, Inp.joy.y - Inp.joy.y0))}px)`; } else j.style.display = 'none';
  },
  update(s: { money: number; bank: number; level: number; xpk: number; hour: number; weather: string; wanted: number; health: number; speed: number | null; gear: number; fuel: number; flash: boolean }) {
    const e = this.el;
    e.money.textContent = fmtMoney(s.money); e.bank.textContent = '💳 ' + fmtMoney(s.bank); e.clock.textContent = fmtTime(s.hour); e.wx.textContent = s.weather;
    e.lvl.textContent = String(s.level); e.xp.style.width = (s.xpk * 100).toFixed(1) + '%'; e.hp.style.width = s.health + '%';
    const st = Array.from({ length: 6 }, (_, i) => `<span class="${i < s.wanted ? 'on' : ''}">★</span>`).join(''); if (e.stars.innerHTML !== st) e.stars.innerHTML = st; e.stars.classList.toggle('flash', s.flash);
    e.speedo.classList.toggle('on', s.speed !== null);
    if (s.speed !== null) { e.spd.textContent = String(Math.round(Math.abs(s.speed) * 3.6)); e.gear.textContent = s.gear < 0 ? 'R' : s.speed < .3 && s.speed > -.3 ? 'N' : String(s.gear); e.fuel.style.width = s.fuel * 100 + '%'; }
  },
  hint(text: string, key = 'E') { const h = text ? `<kbd>${Inp.touch ? '👆' : key}</kbd>${esc(text)}` : ''; if (this.el.hint.innerHTML !== h) this.el.hint.innerHTML = h; },
  objective(text: string) { if (this.el.obj.textContent !== text) this.el.obj.textContent = text; },
  bust(text: string) { if (this.el.bust.textContent !== text) this.el.bust.textContent = text; },
  toast(msg: string, bad = false) { const d = document.createElement('div'); d.textContent = msg; if (bad) d.className = 'bad'; $('#toast').appendChild(d); setTimeout(() => d.remove(), 3700); },
  chat(html: string) { this.chatLines.push(html); if (this.chatLines.length > 7) this.chatLines.shift(); this.el.chat.innerHTML = this.chatLines.map(l => `<div>${l}</div>`).join(''); },
  // «жизнь сервера»: боты-игроки переписываются
  chatTick(dt: number, extra?: string) {
    this.chatT -= dt; if (this.chatT > 0) return; this.chatT = 7 + Math.random() * 12;
    const lines = ['кто на завод?', 'продам Классик, 80к, торг', 'где тут банк?', 'такси до вокзала кто?', 'в порту платят норм', 'копы на Ленина, осторожно', 'куплю гараж в центре', 'ищу семью, 5 лвл', 'кто в полицию идёт?', 'сегодня дождь обещали', 'на трассе ДПС стоит', 'продам квартиру в панельке', 'всем привет)', 'помогите сдать на права', 'почта курьеров набирает', 'на авторынке есть норм тачки', 'кто катается ночью?'];
    const news = ['Мэрия объявила ремонт дорог на пр. Строителей', 'Полиция усилила патрули в центре', 'В порт пришла баржа — нужны грузчики', 'Автосалон «Магистраль» снизил цены', 'Синоптики обещают ночью дождь'];
    if (extra) { this.chat(`<span class="sys">${esc(extra)}</span>`); return; }
    if (Math.random() < .15) this.chat(`<span class="news">[Новости] ${esc(pick(news))}</span>`);
    else this.chat(`<span class="n">${esc(rpName(Math.random() < .4))}</span>: ${esc(pick(lines))}`);
  },
  drawMini(px: number, pz: number, heading: number, pois: City['pois'], cops: { x: number; z: number }[], owned: { x: number; z: number }[], route: { x: number; z: number }[] | null) {
    // вид сверху: x вправо, z вниз; поворачиваем так, чтобы направление движения было вверх
    const g = this.mini, S = 380, zoom = 2.2, k = 1024 / (2 * MAP_EXT) * zoom, rot = heading - Math.PI;
    g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
    g.translate(S / 2, S / 2); g.rotate(rot);
    const sx = (px + MAP_EXT) / (2 * MAP_EXT) * 1024, sz = (pz + MAP_EXT) / (2 * MAP_EXT) * 1024;
    g.drawImage(mapImg, -sx * zoom, -sz * zoom, 1024 * zoom, 1024 * zoom);
    const P = (x: number, z: number) => [(x - px) * k, (z - pz) * k];
    if (route && route.length > 1) { g.strokeStyle = '#b55cff'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); route.forEach((q, i) => { const [x, y] = P(q.x, q.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    const dot = (x: number, z: number, col: string, r: number, txt?: string) => { let [a, b] = P(x, z); const d = Math.hypot(a, b), lim = S / 2 - 14; if (d > lim) { a *= lim / d; b *= lim / d; } g.save(); g.translate(a, b); g.rotate(-rot); g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); if (txt) { g.fillStyle = '#111'; g.font = `${r * 1.3}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 1); } g.restore(); };
    for (const p of pois) { const ic = POI_ICON[p.kind]; if (ic) dot(p.door[0], p.door[1], ic[1], 11, ic[0]); }
    for (const o of owned) dot(o.x, o.z, '#7ee28f', 8, '🚗');
    for (const m of Markers.list) if (m.kind === 'job') dot(m.x, m.z, '#f5c518', 12, '!');
    for (const c of cops) dot(c.x, c.z, Math.floor(performance.now() / 200) % 2 ? '#ff3030' : '#3060ff', 8);
    g.save(); g.translate(0, 0); const nx = 0, nz = -(S / 2 - 24); void nx; g.restore();
    // «С» — север (−z)
    g.save(); g.translate(0, nz); g.rotate(-rot); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('С', 0, 0); g.restore();
    g.restore();
    g.save(); g.translate(S / 2, S / 2); g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.stroke(); g.fill(); g.restore();
  },
};
