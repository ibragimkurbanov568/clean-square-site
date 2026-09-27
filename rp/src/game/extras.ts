// Функции «жизни в городе», которые работают в 3D-мире: эмоции, фонарик, зонт, рыбалка, матрёшки, кошельки,
// сон на лавочке, поездки на автобусе, ремонт и заправка из рюкзака, лотереи, подарки прохожим, фоторежим, музыка.
import * as THREE from 'three';
import { R } from '../world/render';
import { City, RIVER, HALF } from '../world/citygen';
import { Player } from '../actors/player';
import { Peds } from '../actors/peds';
import { play } from '../actors/human';
import { Snd } from '../core/audio';
import { Music } from '../core/music';
import { Inp } from '../core/input';
import { ITEMS, rollFish, lotteryPrize, scratchPrize } from '../sim/items';
import { placeCollectibles, dailyProgress, checkAchievements, COLLECT_N, DailyKind } from '../sim/life';
import type { GameState, Cmd } from '../sim/state';
import type { Vehicle } from '../vehicles/vehicle';

export interface XCtx {
  s: GameState; city: City; vehicles: Vehicle[]; rain: number; night: number;
  cmd(c: Cmd): { ok: boolean; msg?: string }; toast(m: string, bad?: boolean): void; chat(html: string): void;
  teleport(x: number, z: number, h: number): void; fade(): void;
}
export const EMOTES: [string, string, string][] = [['wave', '👋', 'Interact'], ['dance', '💃', 'Dance_Loop'], ['sit', '🪑', 'Sitting_Idle_Loop'], ['crouch', '🧎', 'Crouch_Idle_Loop'], ['roll', '🤸', 'Roll'], ['fix', '🔧', 'Fixing_Kneeling'], ['talk', '🗣', 'Idle_Talking_Loop'], ['pistol', '🫵', 'Pistol_Idle_Loop']];

// матрёшка из примитивов: три «шара» разной величины, яркая роспись
function matryoshka() {
  const g = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: 0xd6352b, roughness: .4, emissive: 0x401008 }), face = new THREE.MeshStandardMaterial({ color: 0xf3d7b6, roughness: .6 }), gold = new THREE.MeshStandardMaterial({ color: 0xf5c518, metalness: .6, roughness: .3, emissive: 0x302000 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 12), red); body.scale.y = 1.25; body.position.y = .35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), red); head.position.y = .78;
  const f = new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 10), face); f.position.set(0, .78, .1);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.26, .03, 8, 20), gold); belt.rotation.x = Math.PI / 2; belt.position.y = .38;
  g.add(body, head, f, belt); return g;
}
export const Extras = {
  ctx: null as unknown as XCtx, torch: null as THREE.SpotLight | null, umb: null as THREE.Object3D | null, umbOn: false, torchOn: false,
  collect: [] as { x: number; z: number; obj: THREE.Object3D | null }[], wallets: [] as { x: number; z: number; v: number; obj: THREE.Object3D }[], walletT: 40,
  fish: null as null | { state: 'wait' | 'bite'; t: number; bob: THREE.Mesh }, photo: false, achT: 1, lastDist: 0, lastWalk: 0, headphones: false,
  init(ctx: XCtx) {
    this.ctx = ctx;
    this.collect = placeCollectibles(ctx.city).map(p => ({ ...p, obj: null }));
    this.lastDist = ctx.s.stats.distance;
  },
  // ---------- эмоции ----------
  doEmote(id: string) {
    if (Player.inCar) { this.ctx.toast('Сначала выйдите из машины', true); return; }
    const e = EMOTES.find(x => x[0] === id); if (!e) return; Player.emote = e[2]; play(Player.h, e[2], .2);
    if (id === 'wave') { const p = this.nearPed(5); if (p) { p.heading = Math.atan2(Player.pos.x - p.x, Player.pos.z - p.z); p.state = 'idle'; p.timer = 3; play(p.h, 'Interact', .2); this.ctx.chat(`<span class="n">${p.nick || 'Прохожий'}</span>: Привет!`); } }
  },
  nearPed(r: number) { let best = null as any, bd = r; for (const p of Peds.list) { const d = Math.hypot(p.x - Player.pos.x, p.z - Player.pos.z); if (d < bd && p.state !== 'down' && p.state !== 'ride') { bd = d; best = p; } } return best; },
  ownCarNear(r = 7) { return this.ctx.vehicles.find(v => v.owned && v.obj.position.distanceTo(Player.pos) < r) || (Player.inCar?.owned ? Player.inCar : null); },
  // ---------- вещи с действием ----------
  useSpecial(id: string): boolean {
    const it = ITEMS[id], c = this.ctx, s = c.s; if (!it?.special) return false;
    switch (it.special) {
      case 'flashlight': this.torchOn = !this.torchOn; c.toast(this.torchOn ? '🔦 Фонарик включён' : 'Фонарик выключен'); return true;
      case 'umbrella': this.umbOn = !this.umbOn; c.toast(this.umbOn ? '☂ Зонт раскрыт' : 'Зонт сложен'); return true;
      case 'headphones': this.headphones = !this.headphones; if (this.headphones) { Music.start(Music.st); c.toast('🎧 ' + (['Край FM', 'Дорожное радио', 'Ночной город'][Music.st])); } else if (!Player.inCar) Music.stop(); return true;
      case 'camera': this.setPhoto(true); return true;
      case 'rod': this.castRod(); return true;
      case 'bait': c.toast('Наживка нужна для удочки: встаньте у реки и используйте 🎣', true); return true;
      case 'repair': { const v = this.ownCarNear(); if (!v) { c.toast('Подойдите к своей машине', true); return true; } if (!this.take(id)) return true; v.dmg = 0; Snd.play('door'); c.toast('🧰 Машина отремонтирована'); return true; }
      case 'canister': { const v = this.ownCarNear(); if (!v) { c.toast('Подойдите к своей машине', true); return true; } if (!this.take(id)) return true; v.fuel = Math.min(1, v.fuel + .4); c.toast(`⛽ Залито. Бак: ${Math.round(v.fuel * 100)}%`); return true; }
      case 'lottery': case 'scratch': {
        if (!this.take(id)) return true; const win = it.special === 'lottery' ? lotteryPrize(Math.random()) : scratchPrize(Math.random());
        if (win) { s.money += win; s.stats.earned += win; s.stats.bigWin = Math.max(s.stats.bigWin, win); Snd.play('money'); c.toast(`🎉 Выигрыш: ${win.toLocaleString('ru-RU')} ₽!`); } else c.toast('Без выигрыша. Повезёт в другой раз', true);
        return true;
      }
      case 'newspaper': { if (!this.take(id)) return true; s.needs.mood = Math.min(100, s.needs.mood + 3); c.toast('📰 ' + NEWS[Math.floor(Math.random() * NEWS.length)]); return true; }
      case 'flowers': {
        const p = this.nearPed(3.5); if (!p) { c.toast('Подойдите к прохожему (ближе 3 м)', true); return true; } if (!this.take(id)) return true;
        p.heading = Math.atan2(Player.pos.x - p.x, Player.pos.z - p.z); p.state = 'talk'; p.timer = 5; s.needs.mood = Math.min(100, s.needs.mood + 25); s.xp += 60;
        c.chat(`<span class="n">${p.nick || 'Прохожий'}</span>: ${['Ой, спасибо! Как приятно!', 'Это мне? Вы чудо!', 'Спасибо, день стал лучше!'][Math.floor(Math.random() * 3)]}`); return true;
      }
      case 'freshener': if (!this.take(id)) return true; s.needs.mood = Math.min(100, s.needs.mood + (it.mood || 0)); c.toast('🌲 В салоне пахнет хвоей'); return true;
    }
    return false;
  },
  take(id: string) { const s = this.ctx.s; if (!s.inv[id]) return false; s.inv[id]--; if (!s.inv[id]) delete s.inv[id]; return true; },
  // ---------- рыбалка: заброс → ждём поклёвку → вовремя подсечь (E / кнопка) ----------
  canFish() { return !Player.inCar && Player.pos.z > RIVER.z0 - 4.5 && Player.pos.z < RIVER.z0 + 1 && Math.abs(Player.pos.x) < HALF + 400; },
  castRod() {
    const c = this.ctx; if (!this.canFish()) { c.toast('Рыбачить можно на набережной — у реки на юге города', true); return; }
    if (this.fish) return; if (!c.s.inv.bait) { c.toast('Нет наживки — купите червей в ларьке', true); return; }
    this.take('bait'); const bob = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b2f }));
    bob.position.set(Player.pos.x + Math.sin(Player.heading) * 6, -1.15, Math.max(RIVER.z0 + 4, Player.pos.z + Math.cos(Player.heading) * 6)); R.scene.add(bob);
    this.fish = { state: 'wait', t: 3 + Math.random() * 6, bob }; Player.emote = 'Idle_Loop'; c.toast('🎣 Заброшено. Ждём поклёвку…');
  },
  fishTick(dt: number): string {
    const f = this.fish; if (!f) return ''; f.t -= dt; const c = this.ctx;
    f.bob.position.y = -1.15 + Math.sin(performance.now() / 300) * .02 - (f.state === 'bite' ? .08 + Math.sin(performance.now() / 60) * .04 : 0);
    const end = () => { f.bob.removeFromParent(); this.fish = null; };
    if (Inp.mx || Inp.my) { end(); c.toast('Рыбалка прервана'); return ''; }
    if (f.state === 'wait' && f.t <= 0) { f.state = 'bite'; f.t = 1.3; Snd.play('click'); return 'КЛЮЁТ! Подсекай!'; }
    if (f.state === 'bite') {
      if (Inp.tap.use || Inp.tap.attack) {
        const id = rollFish(Math.random()), r = c.cmd({ type: 'AddItem', item: id }); end();
        if (!r.ok) { c.toast(r.msg || 'Рюкзак полон', true); return ''; }
        c.s.stats.fish += id === 'f_boot' ? 0 : 1; if (id === 'f_pike') c.s.stats.pike++; if (id !== 'f_boot') this.daily('fish');
        Snd.play('money'); c.toast(`${ITEMS[id].icon} Улов: ${ITEMS[id].name}!`); return '';
      }
      if (f.t <= 0) { end(); c.toast('Сорвалась…', true); return ''; }
      return 'КЛЮЁТ! Подсекай!';
    }
    return 'Ждём поклёвку…';
  },
  // ---------- фоторежим ----------
  setPhoto(on: boolean) { this.photo = on; document.body.classList.toggle('photo', on); if (on) this.ctx.toast('📷 Фоторежим: нажмите в любом месте, чтобы выйти'); },
  // ---------- ежедневные задания и достижения ----------
  daily(kind: DailyKind, n = 1) { for (const d of dailyProgress(this.ctx.s, kind, n)) { Snd.play('level'); this.ctx.toast(`✅ Задание дня: ${d.text} (+${d.reward} ₽)`); } },
  // ---------- кадр ----------
  update(dt: number) {
    const c = this.ctx, s = c.s, P = Player.pos;
    // эмоция держится, пока игрок стоит
    if (Player.emote && (Inp.mx || Inp.my || Inp.tap.jump || Player.inCar)) Player.emote = '';
    // фонарик
    if (this.torchOn && !this.torch) { const l = this.torch = new THREE.SpotLight(0xfff1d6, 30, 28, .45, .5, 1.6); l.position.set(0, 1.4, .2); l.target.position.set(0, .2, 6); Player.h.root.add(l, l.target); }
    if (this.torch) { this.torch.visible = this.torchOn && !Player.inCar; this.torch.intensity = 30 * Math.max(.15, c.night); if (this.torch.parent !== Player.h.root) Player.h.root.add(this.torch, this.torch.target); }
    // зонт
    if (this.umbOn && !this.umb) { this.umb = umbrellaMesh(); }
    if (this.umb) { if (this.umb.parent !== Player.h.root) Player.h.root.add(this.umb); this.umb.visible = this.umbOn && !Player.inCar; }
    // настроение: дождь без зонта, музыка, голод
    const N = s.needs, mh = dt / 120;
    let dm = -.6; if (c.rain > .3 && !this.umbOn && !Player.inCar) dm -= 4; if (this.headphones || Music.on) dm += 3; if (N.food < 20 || N.water < 20) dm -= 2; if (Player.emote === 'Dance_Loop') dm += 12;
    N.mood = Math.max(0, Math.min(100, N.mood + dm * mh));
    // пройдено пешком / проехано — для заданий
    if (!Player.inCar) { const w = Player.speed * dt; s.stats.walked += w; this.lastWalk += w; if (this.lastWalk > 100) { this.daily('walk', this.lastWalk); this.lastWalk = 0; } }
    const dd = s.stats.distance - this.lastDist; if (dd > 100) { this.daily('drive', dd); this.lastDist = s.stats.distance; }
    // матрёшки: видны ближе 120 м, подбираются рядом
    for (let i = 0; i < this.collect.length; i++) {
      const m = this.collect[i]; if (s.collect.includes(i)) { if (m.obj) { m.obj.removeFromParent(); m.obj = null; } continue; }
      const d = Math.hypot(m.x - P.x, m.z - P.z);
      if (d < 120 && !m.obj) { m.obj = matryoshka(); m.obj.position.set(m.x, 0, m.z); R.scene.add(m.obj); }
      if (d >= 140 && m.obj) { m.obj.removeFromParent(); m.obj = null; }
      if (m.obj) { m.obj.rotation.y += dt * 1.5; m.obj.position.y = .15 + Math.sin(performance.now() / 400 + i) * .12; }
      if (d < 1.8 && !Player.inCar) { s.collect.push(i); Snd.play('level'); c.toast(`🪆 Матрёшка найдена! ${s.collect.length} из ${COLLECT_N} (+500 ₽)`); s.money += 500; this.daily('collect'); }
    }
    // потерянные кошельки на тротуарах
    this.walletT -= dt;
    if (this.walletT <= 0 && this.wallets.length < 3 && !Player.inCar) {
      this.walletT = 60 + Math.random() * 90; const a = Math.random() * 6.28, r = 25 + Math.random() * 35, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
      if (!c.city.buildings.some(b => Math.abs(x - b.x) < b.w / 2 + 1 && Math.abs(z - b.z) < b.d / 2 + 1)) {
        const o = new THREE.Mesh(new THREE.BoxGeometry(.22, .05, .14), new THREE.MeshStandardMaterial({ color: 0x5a3b2a, roughness: .5, emissive: 0x201008 })); o.position.set(x, .03, z); o.rotation.y = a; R.scene.add(o);
        this.wallets.push({ x, z, v: [50, 100, 150, 300, 500, 800][Math.floor(Math.random() * 6)], obj: o });
      }
    }
    for (const w of [...this.wallets]) {
      const d = Math.hypot(w.x - P.x, w.z - P.z);
      if (d < 1.4 && !Player.inCar) { s.money += w.v; Snd.play('money'); c.toast(`👛 Найден кошелёк: +${w.v} ₽`); w.obj.removeFromParent(); this.wallets.splice(this.wallets.indexOf(w), 1); }
      else if (d > 200) { w.obj.removeFromParent(); this.wallets.splice(this.wallets.indexOf(w), 1); }
    }
    // достижения — раз в секунду
    this.achT -= dt; if (this.achT <= 0) { this.achT = 1; for (const a of checkAchievements(s)) { Snd.play('level'); c.toast(`🏆 Достижение: ${a.name} (+${a.reward.toLocaleString('ru-RU')} ₽)`); } }
  },
};
function umbrellaMesh() {
  const g = new THREE.Group(), c = new THREE.Mesh(new THREE.ConeGeometry(.6, .3, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f3a6b, roughness: .5, side: THREE.DoubleSide })); c.position.y = .82;
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .9, 5), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: .6 })); st.position.y = .42; g.add(c, st); g.position.set(.2, 1.15, .12); g.rotation.z = -.06; return g;
}
export const NEWS = [
  'Мэрия обещает отремонтировать дороги в спальных районах до зимы.', 'Рыбаки хвалят клёв у набережной: попадаются щуки!', 'В городе нашли старинную матрёшку — говорят, их спрятано тридцать.',
  'Таксопарк набирает водителей с правами категории B.', 'Синоптики: к вечеру возможен дождь, не забудьте зонт.', 'Курс рубля стабилен, шаурма подорожала на 10 рублей.',
  'ДПС предупреждает: не превышайте скорость в центре.', 'На вокзале открылся новый ларёк с горячими пирожками.', 'Порт ищет грузчиков: оплата каждый день.',
  'Жители жалуются на шум автобусов по ночам.', 'В парке прошёл фестиваль уличной музыки.', 'Автосалон «Магистраль» объявил скидки на классику.',
];
