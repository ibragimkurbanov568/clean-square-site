// КРАЙ — точка входа: загрузка, игровой цикл, связь систем (город, физика, игрок, трафик, пешеходы, полиция, работы, интерфейс)
import './ui/style.css';
import * as THREE from 'three';
import { initRender, R, updateSky, render, detectQuality, Quality } from './world/render';
import { loadTextures } from './world/materials';
import { generateCity, City, nearestNode, nodePos, routeGrid, blockAt, PITCH, HALF, RIVER, CITY } from './world/citygen';
import { buildCity, updateCity, CityMeshes } from './world/cityBuild';
import { Props, placeProps } from './world/props';
import { loadHumans, play, Look, randomLook, createHuman } from './actors/human';
import { initPhysics, PH, buildStaticColliders } from './core/physics';
import { initInput, pollInput, endFrameInput, Inp } from './core/input';
import { Snd } from './core/audio';
import { Fleet } from './vehicles/fleet';
import { CARS, CAR_BY_ID, loadCars, idsOfKind } from './vehicles/carModel';
import { spawnVehicle, destroyVehicle, syncVehicle, Vehicle, vehicleHeading, flipIfNeeded, driveVehicle } from './vehicles/vehicle';
import { Traffic, lightState, TCar } from './sim/traffic';
import { Peds } from './actors/peds';
import { Player } from './actors/player';
import { Police } from './sim/police';
import { Jobs, JobCtx } from './sim/jobs';
import { Markers } from './world/markers';
import { HUD, drawMapImage, POI_ICON } from './ui/hud';
import { Menu } from './ui/menus';
import { GameState, newState, loadState, saveState, apply, xpForLevel, randomPlate, Cmd } from './sim/state';
import { clamp, damp, fmtMoney, rand, $ } from './core/util';

const G = {
  s: newState() as GameState, mode: 'loading' as 'loading' | 'menu' | 'play' | 'pause', city: null as unknown as City, cm: null as unknown as CityMeshes,
  vehicles: [] as Vehicle[], tsim: 0, weather: { cloud: .2, rain: 0, target: 0, wet: 0, next: 3, wind: .15, windT: .15, fog: 0, fogT: 0, storm: false, bolt: 0, kind: 'Ясно', passT: 0, dogT: 20 }, route: null as THREE.Vector3[] | null, routeTarget: null as THREE.Vector3 | null,
  saveT: 60, needT: 30, baseTraffic: 26, basePeds: 18, lightT: 0, rain: null as THREE.Points | null, carry: null as THREE.Mesh | null, menuT: 0, wantedFlash: 0, lastPosT: 0,
};
(window as any).KRAI = { G, Player, Traffic, Peds, Police, Jobs, Markers, R, PH, Menu, HUD, Inp, dev: {} as any };

// ---------- загрузка ----------
function loading(k: number, text: string) {
  $('#ui').innerHTML = `<div class="screen" style="display:flex;flex-direction:column;justify-content:flex-end;gap:10px;background:radial-gradient(ellipse at 70% 20%,#1c2c48,#0d1726 70%)">
    <div class="logo">КР<span>А</span>Й</div><div class="tag">${text}</div><div style="height:6px;max-width:520px;background:#1a2638;border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(k * 100)}%;background:#d6352b"></i></div>
    <p class="muted small" style="max-width:60ch">Совет: работу можно найти по значкам на карте — почта (курьер), порт (грузчик), таксопарк. Телефон — клавиша P.</p></div>`;
}
async function boot() {
  const saved = loadState(); if (saved) G.s = saved;
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const qParam = new URLSearchParams(location.search).get('q') as Quality | null;
  const q: Quality = qParam || (G.s.settings.quality !== 'auto' ? G.s.settings.quality as Quality : detectQuality());
  loading(.05, 'Запуск движка');
  initRender(canvas, q); initInput(canvas);
  try { await initPhysics(); } catch (e) {
    $('#ui').innerHTML = `<div class="screen" style="display:flex;align-items:center;justify-content:center"><div class="panel win" style="max-width:520px"><h2>Не удалось запустить физику</h2><p>Браузер заблокировал WebAssembly. Откройте игру в обычной вкладке Chrome, Firefox или Safari (или запустите локально: <code>npm run dev</code> в папке rp).</p><p class="small muted">${String(e)}</p></div></div>`; return;
  }
  loading(.15, 'Текстуры');
  await loadTextures(k => loading(.15 + k * .2, 'Текстуры'));
  loading(.38, 'Строим Новоозёрск'); await new Promise(r => setTimeout(r, 30));
  G.city = generateCity(); G.cm = buildCity(G.city); const places = placeProps(G.city); buildStaticColliders(G.city, places);
  loading(.55, 'Жители города');
  await loadHumans(k => loading(.55 + k * .2, 'Жители города'));
  await loadCars(k => loading(.75 + k * .1, 'Машины'));
  await Props.load(G.city, places, k => loading(.85 + k * .07, 'Деревья и улицы'));
  // машины: инстансы для трафика и припаркованных
  Fleet.init(Object.fromEntries(CARS.map(c => [c.id, c.kind === 'car' ? 14 : c.kind === 'taxi' ? 8 : 4])));
  G.baseTraffic = q === 'low' ? 16 : q === 'mid' ? 26 : 40; G.basePeds = q === 'low' ? 10 : q === 'mid' ? 18 : 28; Traffic.init(G.baseTraffic); Peds.target = G.basePeds;
  drawMapImage(G.city); HUD.init();
  for (const p of G.city.pois) { const ic = POI_ICON[p.kind]; Markers.add('poi:' + p.id, p.door[0], p.door[1], parseInt((ic?.[1] || '#ffffff').slice(1), 16), p.name, ic?.[0] || '●', 'poi', 1.4, p); }
  Traffic.stops = G.city.props.filter(p => p.kind === 'bus_stop').map(p => ({ x: p.x, z: p.z }));
  Traffic.onBus = (c, ev) => { if (Math.hypot(c.x - R.cam.position.x, c.z - R.cam.position.z) > 70) return; if (ev === 'brake') Snd.sample('bus_brake', .7, c.x, c.z); else Snd.sample('bus_door', .8, c.x, c.z); };
  Traffic.onHonk = c => { if (Math.hypot(c.x - Player.pos.x, c.z - Player.pos.z) < 40) Snd.play('horn', .6); };
  Peds.onHit = (_p, car: any) => { if (car?.player) { Snd.play('hit', .6); crime(1, 'Наезд на пешехода'); } };
  Police.onBust = busted; Police.onDrop = w => { G.s.wanted = Math.max(0, w); if (w <= 0) { HUD.toast('Розыск снят'); Police.clear(); } else HUD.toast('Вас потеряли из виду: розыск снижен'); };
  // прогрев шейдеров на экране загрузки, чтобы не было рывков при появлении первых людей и машин
  loading(.93, 'Подготовка шейдеров');
  const warm = [createHuman({ ...randomLook(), sex: 'male', hair: 'hair_buzzed' }), createHuman({ ...randomLook(), sex: 'female', hair: 'hair_long' })];
  warm.forEach((h, i) => { h.root.position.set(i * 2, 0, -HALF_W); R.scene.add(h.root); });
  const ws = CARS.map((c, i) => { const sl = Fleet.alloc(c.id); if (sl) Fleet.place(sl, (i % 8) * 6 - 20, 0, -HALF_W - 8 - Math.floor(i / 8) * 12, 0); return sl; });
  try { await R.renderer.compileAsync(R.scene, R.cam); } catch { /* старые браузеры */ }
  R.cam.position.set(1, 1.6, -HALF_W + 6); R.cam.lookAt(1, 1, -HALF_W); render();
  warm.forEach(h => h.root.removeFromParent()); ws.forEach(sl => sl && Fleet.release(sl));
  Menu.init(host);
  buildRain();
  G.mode = 'menu'; Menu.main();
  addEventListener('keydown', e => { if (e.code === 'Escape' && G.mode === 'play' && !Menu.open) pause(); if ((e.code === 'KeyI' || e.code === 'Tab' || e.code === 'Escape') && (Menu.open === 'char' || Menu.open === 'kiosk') && !e.repeat) { Menu.close(); host.resume(); } });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.mode === 'play' && !Menu.open && !Inp.touch && performance.now() - G.lastPosT > 400) pause(); });
  addEventListener('pointerdown', () => Snd.init());
  requestAnimationFrame(loop);
}

// ---------- связь с меню ----------
const menuSpot = { x: 12, z: -28 }, HALF_W = 700;
const host = {
  get state() { return G.s; }, get hasSave() { return !!G.s.name; }, get pois() { return G.city.pois; }, get player() { return { x: Player.pos.x, z: Player.pos.z }; },
  newGame(look: Look, name: string) {
    const settings = G.s.settings; G.s = newState(); G.s.settings = settings; G.s.look = look; G.s.name = name;
    const st = G.city.pois.find(p => p.kind === 'station')!; G.s.pos = { x: st.door[0], z: st.door[1] - 3, h: Math.PI };
    startPlay(); HUD.toast(`Добро пожаловать в Новоозёрск, ${name.replace('_', ' ')}!`); persist();
    setTimeout(() => HUD.chatTick(0, 'Совет: открой телефон (P) → «Работа» — там маршрут к почте и порту.'), 2500);
  },
  continueGame() { startPlay(); },
  toMenu() { persist(); if (Player.inCar) exitCar(); G.mode = 'menu'; document.body.classList.remove('playing'); Snd.engine(false, 0, 0); Snd.sirenLevel(0); },
  resume() { Menu.close(); if (G.mode !== 'menu') { G.mode = 'play'; document.body.classList.add('playing'); } G.lastPosT = performance.now(); },
  save() { persist(); HUD.toast('Игра сохранена'); },
  setLook(look: Look) { if (Player.h) Player.setLook(look); else { Player.init(look, menuSpot.x, menuSpot.z, 0); Player.frozen = true; } },
  buyCar(model: string, color: number, price: number) {
    const poi = G.city.pois.find(p => p.kind === Menu.dealerKind)!, x = poi.x - 20, z = poi.z + 22, plate = randomPlate();
    const r = cmd({ type: 'BuyCar', model, color, price, plate, x, z, h: Math.PI / 2 }); if (!r.ok) { HUD.toast(r.msg || 'Не получилось', true); return; }
    const oc = G.s.cars[G.s.cars.length - 1], v = spawnVehicle(model, color, x, z, Math.PI / 2, oc.id, plate); G.vehicles.push(v);
    Snd.play('money'); HUD.toast(`Поздравляем с покупкой! ${CAR_BY_ID[model].brand} ${CAR_BY_ID[model].name}, номер ${plate}`); host.resume(); setRoute(x, z); persist();
  },
  startJob(id: string) { if (Jobs.active) Jobs.stop(jobCtx()); G.s.job.id = id; Jobs.start(id, jobCtx(), G.s.job.done[id] || 0); host.resume(); },
  quitJob() { Jobs.stop(jobCtx()); G.s.job.id = null; HUD.toast('Вы уволились'); },
  activeJob() { return Jobs.active; },
  setRoute(x: number, z: number) { setRoute(x, z); },
  bank(op: 'dep' | 'wd', amount: number) { cmd(op === 'dep' ? { type: 'Deposit', amount } : { type: 'Withdraw', amount }); Snd.play('money'); },
  refuel() { const v = Player.inCar; if (!v) return; const price = Math.round((1 - v.fuel) * 2500) + 50; const r = cmd({ type: 'Pay', amount: price, reason: 'fuel' }); if (r.ok) { v.fuel = 1; HUD.toast(`Заправлено: −${price} ₽`); } else HUD.toast(r.msg || '', true); host.resume(); },
  locateCar(id: string) { const v = G.vehicles.find(q => q.owned === id); if (v) setRoute(v.obj.position.x, v.obj.position.z); host.resume(); },
  setQuality(q: string) { G.s.settings.quality = q; persist(); },
  setVol(v: number) { G.s.settings.vol = v; Snd.setVol(v); },
  useItem(id: string) { const r = cmd({ type: 'UseItem', item: id }); if (r.ok) { HUD.toast(r.msg!); Snd.play('click'); } },
  buyItem(id: string) { const r = cmd({ type: 'BuyItem', item: id }); HUD.toast(r.msg || (r.ok ? 'Куплено' : 'Не получилось'), !r.ok); if (r.ok) Snd.play('money'); },
  medCard() { const r = cmd({ type: 'MedCard' }); HUD.toast(r.ok ? 'Медкарта оформлена (−1 500 ₽)' : r.msg || 'Медкарта уже есть', !r.ok); host.resume(); },
  license() { const r = cmd({ type: 'Pay', amount: 15000, reason: 'license' }); if (!r.ok) { HUD.toast(r.msg || 'Не хватает денег', true); return; } cmd({ type: 'License', kind: 'B' }); HUD.toast('Права категории B получены!'); Snd.play('level'); host.resume(); },
};
function cmd(c: Cmd) { const r = apply(G.s, c); if (r.level) { Snd.play('level'); HUD.toast(`Новый уровень: ${r.level}!`); } return r; }
function persist() {
  if (!G.s.name || !Player.h) return;
  G.s.pos = { x: Player.pos.x, z: Player.pos.z, h: Player.heading };
  for (const oc of G.s.cars) { const v = G.vehicles.find(q => q.owned === oc.id); if (v) { const p = v.ph.body.translation(); oc.x = p.x; oc.z = p.z; oc.h = vehicleHeading(v); oc.fuel = v.fuel; oc.dmg = v.dmg; } }
  saveState(G.s);
}
function startPlay() {
  Menu.close(); Snd.init(); Snd.setVol(G.s.settings.vol);
  const look = G.s.look || randomLook();
  if (Player.h) Player.h.root.removeFromParent();
  Player.init(look, G.s.pos.x, G.s.pos.z, G.s.pos.h); Player.frozen = false;
  for (const v of G.vehicles) destroyVehicle(v); G.vehicles = [];
  for (const oc of G.s.cars) { const v = spawnVehicle(oc.model, oc.color, oc.x, oc.z, oc.h, oc.id, oc.plate); v.fuel = oc.fuel; v.dmg = oc.dmg; G.vehicles.push(v); }
  if (G.s.job.id) Jobs.start(G.s.job.id, jobCtx(), G.s.job.done[G.s.job.id] || 0);
  G.mode = 'play'; G.lastPosT = performance.now(); HUD.touchMode(false); document.body.classList.add('playing');
}
function pause() { G.mode = 'pause'; document.body.classList.remove('playing'); Menu.pause(); document.exitPointerLock?.(); }

// ---------- работа ----------
function jobCtx(): JobCtx {
  return {
    city: G.city, playerPos: Player.pos, inCar: !!Player.inCar, carSpeed: Player.inCar?.speed || 0, carDamage: Player.inCar?.dmg || 0, isTaxiCar: Player.inCar?.job === 'taxi',
    earn(amount, xp, reason) { cmd({ type: 'Earn', amount, xp, reason }); Snd.play('money'); const id = Jobs.active; if (id) G.s.job.done[id] = (G.s.job.done[id] || 0) + 1; },
    toast: m => HUD.toast(m), objective: m => HUD.objective(m),
    spawnTaxi() { const poi = G.city.pois.find(p => p.kind === 'taxi')!; const v = spawnVehicle('taxi', 0xffd21f, poi.x - 15, poi.z + 25, Math.PI / 2, null, randomPlate()); v.job = 'taxi'; G.vehicles.push(v); setRoute(poi.x - 15, poi.z + 25); },
    endTaxi() { const v = G.vehicles.find(q => q.job === 'taxi'); if (v) { if (Player.inCar === v) exitCar(); destroyVehicle(v); G.vehicles.splice(G.vehicles.indexOf(v), 1); } },
    carry(on) { if (on && !G.carry) { G.carry = new THREE.Mesh(new THREE.BoxGeometry(.5, .4, .4), new THREE.MeshStandardMaterial({ color: 0xa87a4a, roughness: .8 })); G.carry.castShadow = true; R.scene.add(G.carry); play(Player.h, 'PickUp_Table', .1); Player.animLock = .8; } if (!on && G.carry) { G.carry.removeFromParent(); G.carry = null; } },
  };
}

// ---------- преступления и полиция ----------
function crime(stars: number, why: string) { cmd({ type: 'Wanted', delta: stars }); G.wantedFlash = 3; HUD.toast(`Розыск: ${why}`, true); Snd.play('bad'); }
function busted() {
  const fine = Math.round(G.s.money * .15) + G.s.wanted * 500; G.s.money = Math.max(0, G.s.money - fine);
  if (Player.inCar) exitCar(); Police.clear(); cmd({ type: 'ClearWanted' });
  const poi = G.city.pois.find(p => p.kind === 'police')!; teleport(poi.door[0], poi.door[1] - 3, Math.PI);
  G.s.hour = (G.s.hour + 3) % 24; HUD.toast(`Вас задержали. Штраф ${fmtMoney(fine)}, 3 часа в КПЗ`, true);
}
function teleport(x: number, z: number, h: number) { Player.ch.body.setTranslation({ x, y: 1, z }, true); Player.pos.set(x, 0, z); Player.heading = h; Player.camYaw = h + Math.PI; }

// ---------- машины: посадка, высадка, угон ----------
function nearestVehicle(max: number): Vehicle | null { let best: Vehicle | null = null, bd = max; for (const v of G.vehicles) { const d = v.obj.position.distanceTo(Player.pos) - v.def.L / 2 + 1; if (d < bd) { bd = d; best = v; } } return best; }
function nearestTraffic(max: number): TCar | null { let best: TCar | null = null, bd = max; for (const c of Traffic.cars) { const d = Math.hypot(c.x - Player.pos.x, c.z - Player.pos.z) - c.def.L / 2 + 1; if (d < bd && c.v < 4 && c.kind !== 'bus') { bd = d; best = c; } } return best; }
function enterCar(v: Vehicle) {
  Player.inCar = v; Player.h.root.visible = false; Player.ch.body.setTranslation({ x: 0, y: -50, z: 0 }, true); Snd.play('door_open'); setTimeout(() => { Snd.play('door'); Snd.play('start'); }, 450); HUD.touchMode(true);
  if (v.job === 'taxi' && Jobs.active === 'taxi') HUD.toast('Катайся по городу — заказы придут сами');
}
function exitCar() {
  const v = Player.inCar!; Player.inCar = null; const h = vehicleHeading(v), p = v.ph.body.translation();
  const x = p.x - Math.cos(h) * (v.def.W / 2 + .9), z = p.z + Math.sin(h) * (v.def.W / 2 + .9);
  Player.ch.body.setTranslation({ x, y: 1.2, z }, true); Player.pos.set(x, 0, z); Player.heading = h; Player.vy = 0; Player.h.root.visible = true;
  Snd.engine(false, 0, 0); Snd.tire(0); Snd.play('door'); HUD.touchMode(false); persist();
}
function carjack(c: TCar) {
  const v = spawnVehicle(c.model, c.color, c.x, c.z, c.h, null, randomPlate()); G.vehicles.push(v);
  // водитель выскакивает и убегает
  const ped = Peds.spawn(new THREE.Vector3(c.x, 0, c.z), 0); if (ped) { ped.x = c.x - Math.cos(c.h) * 1.8; ped.z = c.z + Math.sin(c.h) * 1.8; ped.state = 'flee'; ped.timer = 5; ped.heading = c.h + Math.PI / 2; }
  Traffic.despawn(c); enterCar(v); crime(1, 'Угон автомобиля');
}

// ---------- GPS ----------
function setRoute(x: number, z: number) {
  const a = nearestNode(Player.pos.x, Player.pos.z), b = nearestNode(x, z), path = routeGrid(a, b).map(([i, j]) => { const p = nodePos(i, j); return new THREE.Vector3(p.x, 0, p.z); });
  G.route = [Player.pos.clone(), ...path, new THREE.Vector3(x, 0, z)]; G.routeTarget = new THREE.Vector3(x, 0, z);
  Markers.add('gps', x, z, 0xb55cff, 'Точка', '📍', 'gps', 2.2); HUD.toast('Маршрут проложен');
}

// ---------- погода: дождь ----------
function buildRain() {
  const n = R.quality === 'low' ? 1200 : 4000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([rand(-40, 40), rand(0, 30), rand(-40, 40)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  G.rain = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaabbcc, size: .08, transparent: true, opacity: 0, depthWrite: false })); G.rain.frustumCulled = false; R.scene.add(G.rain);
}
// погода: ясно / облачно / ветрено / дождь / гроза / утренний туман — с плавными переходами
const WEATHER: [string, number, number, number, number][] = [ // название, облачность, дождь, ветер, туман
  ['Ясно', .1, 0, .15, 0], ['Облачно', .5, 0, .3, 0], ['Ветрено', .45, 0, .85, 0], ['Дождь', .85, .6, .45, .2], ['Ливень', 1, 1, .6, .3], ['Гроза', 1, 1, .9, .25], ['Туман', .6, 0, .05, 1]];
function updateWeather(dt: number, gameDt: number) {
  const w = G.weather; w.next -= gameDt;
  if (w.next <= 0) {
    w.next = rand(2.5, 7); const h = G.s.hour, r = Math.random();
    const pick = h > 4 && h < 8 && r < .25 ? 6 : r < .35 ? 0 : r < .55 ? 1 : r < .68 ? 2 : r < .84 ? 3 : r < .93 ? 4 : 5;
    const [name, cl, rn, wd, fg] = WEATHER[pick]; w.kind = name; w.target = cl; w.windT = wd; w.fogT = fg; w.storm = pick === 5; (w as any).rainT = rn;
    if (G.mode === 'play') HUD.chatTick(0, `[Погода] ${name}`);
  }
  const rainT = (w as any).rainT ?? 0;
  w.rain = damp(w.rain, rainT, .12, dt); w.cloud = damp(w.cloud, w.target, .1, dt); w.wind = damp(w.wind, w.windT + Math.sin(G.tsim * .7) * .12 * w.windT, .3, dt); w.fog = damp(w.fog, w.fogT, .08, dt);
  w.wet = damp(w.wet, w.rain > .25 ? 1 : 0, w.rain > .25 ? .08 : .015, dt);
  R.U.uWet.value = w.wet; R.U.uWind.value = w.wind;
  // гроза: вспышки молний и гром с задержкой
  w.bolt -= dt; if (w.storm && w.rain > .6 && w.bolt <= 0) { w.bolt = rand(6, 18); R.flash = 1; const delay = rand(.4, 3); setTimeout(() => Snd.play('thunder', 1 - delay / 4), delay * 1000); }
  if (G.rain) {
    const m = G.rain.material as THREE.PointsMaterial; m.opacity = w.rain * .55; G.rain.visible = w.rain > .02;
    if (G.rain.visible) { const a = G.rain.geometry.attributes.position as THREE.BufferAttribute, c = R.cam.position, wx = w.wind * 6 * dt; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 22; if (y < 0) y += 30; a.setY(i, y); a.setX(i, ((a.getX(i) + wx + 40) % 80) - 40); } a.needsUpdate = true; G.rain.position.set(c.x, c.y - 12, c.z); }
  }
  soundscape(dt);
}
// звуковая картина: где стоит слушатель (центр, двор, парк, река) и что вокруг
function soundscape(dt: number) {
  const cam = R.cam, f = new THREE.Vector3(); cam.getWorldDirection(f); Snd.listener(cam.position.x, cam.position.y, cam.position.z, f.x, f.y, f.z);
  const p = G.mode === 'play' ? Player.pos : cam.position, w = G.weather, [bi, bj] = blockAt(p.x, p.z), d = G.city.districts[bi]?.[bj];
  const P = PITCH, lx = ((p.x + HALF) % P + P) % P, lz = ((p.z + HALF) % P + P) % P, toRoad = Math.min(lx, P - lx, lz, P - lz);
  const onRoad = toRoad < 14 ? 1 : 0, inCity = Math.abs(p.x) < HALF + 30 && Math.abs(p.z) < HALF + 30;
  const city = !inCity ? .2 : d === 'center' || d === 'office' || d === 'plaza' ? .9 : onRoad ? .75 : .35;
  const yard = inCity && (d === 'res' || d === 'khrush') && !onRoad ? .9 : 0, park = !inCity || d === 'park' || d === 'private' ? .8 : 0, river = clamp(1 - Math.abs(p.z - RIVER.z0) / 90, 0, 1);
  Snd.ambient({ city, yard, park, river, hour: G.s.hour, rain: w.rain, wind: w.wind, inCar: !!Player.inCar && G.mode === 'play', night: R.U.uNight.value });
  if (G.mode !== 'play') return;
  // ближайшие машины — объёмный звук; пролёт мимо
  const near = Traffic.cars.map(c => ({ c, d: Math.hypot(c.x - p.x, c.z - p.z) })).filter(o => o.d < 70).sort((a, b) => a.d - b.d).slice(0, 5);
  Snd.traffic(near.map(o => ({ id: o.c.id, x: o.c.x, z: o.c.z, v: o.c.v, bus: o.c.def.kind === 'bus' || o.c.def.kind === 'truck' })));
  w.passT -= dt; const fast = near.find(o => o.d < 9 && o.c.v > 11); if (fast && w.passT <= 0 && !Player.inCar) { w.passT = 2.5; Snd.play('pass', .8, fast.c.x, fast.c.z); }
  // светофор у ближайшего перекрёстка: тиканье для пешеходов
  const [ni, nj] = nearestNode(p.x, p.z), np = nodePos(ni, nj), dn = Math.hypot(np.x - p.x, np.z - p.z);
  const crossingVertical = Math.abs(p.x - np.x) < Math.abs(p.z - np.z) ? 0 : 1, walk = lightState(ni, nj, crossingVertical ? 1 : 0, G.tsim) === 2;
  Snd.pedSignal(np.x + (p.x > np.x ? 9 : -9), np.z + (p.z > np.z ? 9 : -9), walk, dn < 30 && !Player.inCar && ni > 0 && nj > 0 && ni < CITY.N && nj < CITY.N);
  // собаки лают ночью во дворах
  w.dogT -= dt; if (w.dogT <= 0) { w.dogT = rand(15, 45); if (yard || park) Snd.play('dog', .7, p.x + rand(-60, 60), p.z + rand(-60, 60)); }
  // сирена погони
  const cop = Police.cops[0]; if (cop) Snd.sirenAt(cop.v.obj.position.x, cop.v.obj.position.z, 1); else Snd.sirenLevel(0);
}

// ---------- игровой цикл ----------
let last = performance.now(), acc = 0;
function loop(now: number) {
  requestAnimationFrame(loop);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  tick(dt, true);
}
function tick(dt: number, draw: boolean) {
  R.U.uTime.value += dt;
  pollInput(dt);
  if (G.mode === 'loading') { endFrameInput(); return; }
  const playing = G.mode === 'play';
  const gameDt = playing ? dt / 120 : dt / 400; G.s.hour = (G.s.hour + gameDt) % 24; if (G.s.hour < gameDt) G.s.day++;
  if (G.mode !== 'pause') G.tsim += dt;
  if (G.mode === 'menu') menuCamera(dt);
  if (playing) playStep(dt);
  if (G.mode !== 'pause') {
    acc += dt; let n = 0; while (acc >= 1 / 60 && n < 4) { for (const v of G.vehicles) v.ph.ctl.updateVehicle(1 / 60); for (const c of Police.cops) c.v.ph.ctl.updateVehicle(1 / 60); PH.world.step(PH.eq); acc -= 1 / 60; n++; } if (n >= 4) acc = 0;
    if (playing) handleContacts(); else PH.eq.drainContactForceEvents(() => {});
  }
  const focus = playing ? Player.pos : R.cam.position;
  Traffic.player.copy(focus); Peds.player.copy(focus);
  if (Player.inCar) { const p = Player.inCar.obj.position; Traffic.player.set(p.x, 0, p.z); }
  if (G.mode !== 'pause') {
    Traffic.update(dt, G.tsim);
    const cars: any[] = Traffic.cars.map(c => ({ x: c.x, z: c.z, v: c.v, h: c.h }));
    for (const v of G.vehicles) { const p = v.obj.position; cars.push({ x: p.x, z: p.z, v: Math.abs(v.speed), h: vehicleHeading(v), player: v === Player.inCar }); }
    Traffic.obstacles = Peds.list.filter(p => p.state === 'cross' || p.state === 'down').map(p => ({ x: p.x, z: p.z, r: .6 }));
    for (const v of G.vehicles) if (v !== Player.inCar) { const p = v.obj.position; Traffic.obstacles.push({ x: p.x, z: p.z, r: 1.2 }); }
    for (const c of Police.cops) { const p = c.v.obj.position; Traffic.obstacles.push({ x: p.x, z: p.z, r: 1.2 }); }
    // жизнь по часам: утром и вечером — час пик, ночью улицы пустеют, в дождь людей меньше
    const hr = G.s.hour, rush = Math.exp(-((hr - 8.5) ** 2) / 2) + Math.exp(-((hr - 18.5) ** 2) / 2.5), night = hr < 5.5 || hr > 23 ? 1 : hr < 7 ? (7 - hr) / 1.5 : hr > 21.5 ? (hr - 21.5) / 1.5 : 0;
    Traffic.target = Math.round(G.baseTraffic * clamp(.75 + rush * .45 - night * .6, .2, 1.2)); Peds.target = Math.round(G.basePeds * clamp(.85 + rush * .35 - night * .7, .15, 1.2) * (1 - G.weather.rain * .45)); Peds.rain = G.weather.rain;
    Peds.update(dt, G.tsim, cars);
    for (const v of G.vehicles) if (v !== Player.inCar) { driveVehicle(v, dt, 0, 0, 0, true, false); syncVehicle(v, dt); }
  }
  Traffic.render(R.cam.position);
  G.lightT -= dt; if (G.lightT <= 0) { G.lightT = .25; updateBulbs(); streamParked(R.cam.position); }
  const night = R.U.uNight.value;
  updateSky(G.s.hour, G.weather.cloud, G.weather.rain, focus, G.weather.fog, dt); updateWeather(dt, gameDt);
  updateCity(G.cm, R.cam.position, night); Props.update(R.cam.position); Props.setNight(night); Fleet.setNight(night); Markers.update(G.tsim, R.cam.position);
  render();
  endFrameInput();
}
// припаркованные машины показываем только рядом с камерой
const parkedSlots = new Map<number, any>();
function streamParked(c: THREE.Vector3) {
  G.city.parked.forEach((p, i) => {
    const d = Math.hypot(p.x - c.x, p.z - c.z), has = parkedSlots.get(i);
    if (d < 230 && !has) { const ids = idsOfKind('car'), slot = Fleet.alloc(ids[(i * 7 + p.model) % ids.length]); if (slot) { Fleet.place(slot, p.x, 0, p.z, p.rot, 0, 0, false, 0, false); parkedSlots.set(i, slot); } }
    else if (d > 270 && has) { Fleet.release(has); parkedSlots.delete(i); }
  });
}
const bulbCol = [new THREE.Color(0xff2a1a).multiplyScalar(4), new THREE.Color(0xffb000).multiplyScalar(4), new THREE.Color(0x20ff60).multiplyScalar(4), new THREE.Color(0x151515)];
function updateBulbs() {
  const b = G.cm.bulbs; let k = 0;
  for (const m of G.cm.bulbMap) { const st = lightState(m.i, m.j, m.axis, G.tsim); b.setColorAt(k++, st === 2 ? bulbCol[0] : bulbCol[3]); b.setColorAt(k++, st === 1 ? bulbCol[1] : bulbCol[3]); b.setColorAt(k++, st === 0 ? bulbCol[2] : bulbCol[3]); }
  b.instanceColor!.needsUpdate = true;
}
function menuCamera(dt: number) {
  const c = R.cam;
  if (Menu.open === 'creator' && Player.h) {
    const p = Player.pos; c.position.set(p.x + 1.6, 1.45, p.z + 3); c.lookAt(p.x + (innerWidth > 760 ? -.7 : 0), 1.05, p.z); c.fov = 45; c.updateProjectionMatrix();
    Player.h.root.position.copy(p); Player.h.root.rotation.y += dt * .5; Player.h.mixer.update(dt); play(Player.h, 'Idle_Loop');
    return;
  }
  G.menuT += dt * .03; const r = 240;
  c.position.set(Math.sin(G.menuT) * r, 70, Math.cos(G.menuT) * r); c.lookAt(0, 20, 0); c.fov = 55; c.updateProjectionMatrix();
}
function handleContacts() {
  PH.eq.drainContactForceEvents(e => {
    const v = Player.inCar; if (!v) return; const h1 = e.collider1(), h2 = e.collider2(); if (h1 !== v.ph.col.handle && h2 !== v.ph.col.handle) return;
    const f = e.totalForceMagnitude() / v.def.mass; if (f < 30) return;
    v.dmg = Math.min(100, v.dmg + f * .02 * (1 - G.s.skills.drive / 100 * .3)); Snd.play('hit', Math.min(1, f / 150));
    if (Police.cops.some(c => c.v.ph.col.handle === h1 || c.v.ph.col.handle === h2) && G.s.wanted === 0) crime(1, 'Таран полицейской машины');
  });
}

// ---------- шаг игры ----------
function playStep(dt: number) {
  const s = G.s; s.stats.playTime += dt;
  if (Menu.open) { if (Player.inCar) syncVehicle(Player.inCar, dt); else Player.h.mixer.update(dt); Player.updateCamera(dt); return; }
  if (Inp.tap.phone) { Menu.phone(); document.exitPointerLock?.(); return; }
  if (Inp.tap.map) { Menu.phone('map'); document.exitPointerLock?.(); return; }
  if (Inp.tap.inv) { Menu.character(); document.exitPointerLock?.(); return; }
  lifeTick(dt);
  if (Inp.tap.cam) Player.camMode = 1 - Player.camMode;
  if (Inp.tap.lights && Player.inCar) Player.inCar.lights = !Player.inCar.lights;
  if (Inp.tap.horn && Player.inCar) Snd.play('horn');
  let hint = '', key = 'E';
  if (Player.inCar) {
    Player.updateCar(dt);
    if (Inp.tap.enter && Math.abs(Player.inCar.speed) < 3) exitCar();
    else if (flipIfNeeded(Player.inCar)) HUD.toast('Машина поставлена на колёса');
    if (Player.inCar) { if (R.U.uNight.value > .5) Player.inCar.lights = true; s.stats.distance += Math.abs(Player.inCar.speed) * dt; if (Player.inCar.fuel <= 0) hint = 'Бензин кончился — нужна АЗС'; }
  } else {
    Player.updateFoot(dt);
    if (Inp.tap.attack && Player.animLock <= 0) punch();
    const v = nearestVehicle(2.2), tc = v ? null : nearestTraffic(2.4);
    if (v) { hint = v.owned ? 'Сесть в свою машину' : v.job ? 'Сесть в такси таксопарка' : 'Сесть в машину'; key = 'F'; if (Inp.tap.enter) enterCar(v); }
    else if (tc) { hint = 'Угнать машину (розыск!)'; key = 'F'; if (Inp.tap.enter) carjack(tc); }
    const kiosk = !hint && G.city.props.find(p => p.kind === 'kiosk' && Math.hypot(p.x - Player.pos.x, p.z - Player.pos.z) < 3.4);
    if (kiosk) { hint = 'Ларёк — еда и вода'; if (Inp.tap.use) { document.exitPointerLock?.(); Menu.kiosk(); } }
    if (G.carry) { const hr = Player.h.root; G.carry.position.set(hr.position.x + Math.sin(Player.heading) * .45, 1.1, hr.position.z + Math.cos(Player.heading) * .45); G.carry.rotation.y = Player.heading; }
  }
  HUD.touchMode(!!Player.inCar);
  const here = Markers.inside(Player.pos.x, Player.pos.z).find(m => m.kind === 'poi');
  if (here && !hint) {
    const kind = here.data.kind, names: Record<string, string> = { bank: 'Банк', dealer: 'Автосалон', used: 'Авторынок', gas: 'Заправиться', cityhall: 'Мэрия', taxi: 'Таксопарк — работа', courier: 'Почта — работа курьером', loader: 'Склад — работа грузчиком', hospital: 'Больница', police: 'Полиция', hotel: 'Гостиница — отдых', clothes: 'Магазин одежды', station: 'Вокзал' };
    hint = names[kind] || here.label;
    if (Inp.tap.use || (Inp.touch && Inp.tap.enter)) poiAction(kind);
  }
  if (G.routeTarget && Math.hypot(G.routeTarget.x - Player.pos.x, G.routeTarget.z - Player.pos.z) < 15) { G.route = null; G.routeTarget = null; Markers.remove('gps'); HUD.toast('Вы прибыли'); }
  HUD.hint(hint, key);
  Player.updateCamera(dt);
  Jobs.update(dt, jobCtx(), s.job.done[Jobs.active || ''] || 0, !!Inp.tap.use);
  const nearest = Police.update(dt, s.wanted, Player.pos, Player.inCar ? Math.abs(Player.inCar.speed) : Player.speed);
  Snd.sirenLevel(s.wanted > 0 ? clamp(1 - nearest / 200, 0, 1) : 0);
  HUD.bust(Police.bust > .3 ? `ЗАДЕРЖАНИЕ… ${Math.ceil(3 - Police.bust)}` : '');
  if (!Player.inCar) Snd.engine(false, 0, 0);
  G.wantedFlash = Math.max(0, G.wantedFlash - dt);
  HUD.update({ money: s.money, bank: s.bank, level: s.level, xpk: s.xp / xpForLevel(s.level), hour: s.hour, weather: G.weather.rain > .4 ? '🌧' : G.weather.cloud > .3 ? '☁' : R.U.uNight.value > .5 ? '🌙' : '☀', wanted: s.wanted, health: s.health, speed: Player.inCar ? Player.inCar.speed : null, gear: Player.inCar?.gear || 1, fuel: Player.inCar?.fuel || 0, flash: G.wantedFlash > 0 || Police.cops.length > 0, needs: s.needs });
  if (G.route) G.route[0].copy(Player.pos);
  HUD.drawMini(Player.pos.x, Player.pos.z, Player.inCar ? vehicleHeading(Player.inCar) : Player.camYaw + Math.PI, G.city.pois, Police.cops.map(c => c.v.obj.position), G.vehicles.filter(v => v.owned).map(v => v.obj.position), G.route);
  HUD.chatTick(dt);
  G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 60; persist(); }
}
// «реальная жизнь»: голод, жажда, усталость идут по игровому времени (1 игровой час = 2 минуты)
function lifeTick(dt: number) {
  const s = G.s, N = s.needs, h = dt / 120, running = !Player.inCar && Player.speed > 5, sk = s.skills;
  N.food = Math.max(0, N.food - h * 3.5); N.water = Math.max(0, N.water - h * (5 + (running ? 6 : 0) + 0)); N.energy = Math.max(0, N.energy - h * (3 + (running ? 5 * (1 - sk.stamina / 200) : 0)));
  if (running) sk.stamina = Math.min(100, sk.stamina + dt * .004);
  if (Player.inCar) sk.drive = Math.min(100, sk.drive + Math.abs(Player.inCar.speed) * dt / 1000 * .4);
  Player.sprintK = N.energy < 8 ? 0 : 1 + sk.stamina / 100 * .12;
  if (N.food <= 0 || N.water <= 0) s.health = Math.max(1, s.health - h * 6);
  G.needT -= dt; if (G.needT <= 0) { G.needT = 90; const w = N.water < 15 ? 'Хочется пить — купите воду в ларьке' : N.food < 15 ? 'Вы проголодались — ларьки у остановок' : N.energy < 10 ? 'Вы очень устали — выспитесь в гостинице' : ''; if (w) HUD.toast(w, true); }
}
function punch() {
  play(Player.h, Math.random() < .5 ? 'Punch_Jab' : 'Punch_Cross', .08); Player.animLock = .55;
  const fx = Math.sin(Player.heading), fz = Math.cos(Player.heading);
  for (const p of Peds.list) { const dx = p.x - Player.pos.x, dz = p.z - Player.pos.z, f = dx * fx + dz * fz; if (f > 0 && f < 1.6 && Math.abs(dx * fz - dz * fx) < .8 && p.state !== 'down') { Peds.knock(p, { x: Player.pos.x, z: Player.pos.z, v: 1, h: Player.heading }); Snd.play('hit', .3); if (Police.cops.length || Math.random() < .5) crime(1, 'Драка'); break; } }
}
function poiAction(kind: string) {
  document.exitPointerLock?.();
  if (kind === 'bank') Menu.bank();
  else if (kind === 'dealer' || kind === 'used') Menu.dealer(kind);
  else if (kind === 'gas') { if (Player.inCar) Menu.gas(Math.round((1 - Player.inCar.fuel) * 2500) + 50); else HUD.toast('Подъезжайте на машине'); }
  else if (kind === 'cityhall') Menu.cityhall();
  else if (kind === 'taxi') Menu.jobOffer('taxi');
  else if (kind === 'courier') Menu.jobOffer('courier');
  else if (kind === 'loader') Menu.jobOffer('loader');
  else if (kind === 'hospital') { const r = cmd({ type: 'Pay', amount: 300, reason: 'heal' }); if (r.ok) { G.s.health = 100; HUD.toast('Вас подлечили: −300 ₽'); } }
  else if (kind === 'police') { if (G.s.wanted > 0) { const fine = G.s.wanted * 1500, r = cmd({ type: 'Pay', amount: fine, reason: 'fine' }); if (r.ok) { cmd({ type: 'ClearWanted' }); Police.clear(); HUD.toast(`Вы сдались и оплатили штраф ${fmtMoney(fine)}`); } else HUD.toast('Не хватает денег на штраф', true); } else HUD.toast('Дежурный: «Проходите, гражданин»'); }
  else if (kind === 'hotel') { const r = cmd({ type: 'Pay', amount: 800, reason: 'hotel' }); if (r.ok) { G.s.hour = (G.s.hour + 8) % 24; G.s.needs.energy = 100; G.s.needs.food = Math.max(0, G.s.needs.food - 20); G.s.needs.water = Math.max(0, G.s.needs.water - 25); persist(); HUD.toast('Вы выспались в гостинице (−800 ₽). Игра сохранена'); } }
  else HUD.toast('Скоро откроется');
}
(window as any).KRAI.dev = { simulate: (sec: number, step = 1 / 30) => { for (let t = 0; t < sec; t += step) tick(step, false); }, spawn: (m: string, x: number, z: number, h: number) => { const v = spawnVehicle(m, 0x7a1e1e, x, z, h); G.vehicles.push(v); return v; }, enterCar: (v: Vehicle) => enterCar(v), exitCar: () => exitCar(), setRoute, crime, teleport };
boot();
