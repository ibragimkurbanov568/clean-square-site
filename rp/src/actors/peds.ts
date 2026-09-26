// Пешеходы: гуляют по тротуарам вокруг кварталов, переходят дорогу по зебре на зелёный,
// разбегаются от опасности, падают от удара машиной и встают. У части — ник «игрока» над головой.
import * as THREE from 'three';
import { CITY, HALF, PITCH, roadLine } from '../world/citygen';
import { createHuman, disposeHuman, Human, play, randomLook } from './human';
import { lightState } from '../sim/traffic';
import { R } from '../world/render';
import { angDiff, clamp, pick, rand } from '../core/util';

const FIRST = ['Иван', 'Алексей', 'Дмитрий', 'Сергей', 'Максим', 'Артём', 'Никита', 'Егор', 'Кирилл', 'Олег', 'Роман', 'Павел', 'Анна', 'Мария', 'Елена', 'Ольга', 'Дарья', 'Алина', 'Юлия', 'Ксения', 'Виктория', 'Полина'];
const LAST = ['Смирнов', 'Кузнецов', 'Попов', 'Волков', 'Соколов', 'Морозов', 'Лебедев', 'Новиков', 'Орлов', 'Зайцев', 'Громов', 'Белов', 'Тихонов', 'Ершов', 'Фомин', 'Жуков'];
export function rpName(female: boolean) { const f = pick(FIRST.slice(female ? 12 : 0, female ? FIRST.length : 12)), l = pick(LAST); return `${f}_${l}${female ? 'а' : ''}`; }

export interface Ped {
  h: Human; x: number; z: number; heading: number; speed: number; state: 'walk' | 'wait' | 'cross' | 'flee' | 'down' | 'idle' | 'ride' | 'talk';
  // маршрут: квартал (bi,bj), позиция на периметре тротуара (0..4) и направление обхода
  bi: number; bj: number; u: number; dir: number; cross: { x0: number; z0: number; x1: number; z1: number; t: number; axis: 0 | 1; ni: number; nj: number } | null;
  timer: number; nick: string | null; tag: THREE.Sprite | null; id: number; fare?: boolean; hp: number;
}
const SIDEW = CITY.ROAD / 2 + 2; // линия тротуара от осевой улицы
// точка периметра квартала: u∈[0,4) — стороны против часовой
function perim(bi: number, bj: number, u: number) {
  const x0 = roadLine(bi) + SIDEW, x1 = roadLine(bi + 1) - SIDEW, z0 = roadLine(bj) + SIDEW, z1 = roadLine(bj + 1) - SIDEW, s = ((u % 4) + 4) % 4, k = s - Math.floor(s);
  switch (Math.floor(s)) { case 0: return [x0 + (x1 - x0) * k, z0]; case 1: return [x1, z0 + (z1 - z0) * k]; case 2: return [x1 - (x1 - x0) * k, z1]; default: return [x0, z1 - (z1 - z0) * k]; }
}
const PERIM_LEN = (PITCH - 2 * SIDEW) * 4;

function tagSprite(text: string, color = '#ffffff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48; const g = c.getContext('2d')!;
  g.font = '600 26px Rubik, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(text, 128, 24); g.fillStyle = color; g.fillText(text, 128, 24);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true, fog: true })); s.scale.set(2.4, .45, 1); s.position.y = 2.15; s.renderOrder = 5; return s;
}

export const Peds = {
  list: [] as Ped[], target: 30, radius: 110, player: new THREE.Vector3(), nextId: 1, time: 0,
  onHit: null as null | ((p: Ped, car: any) => void),
  spawn(near: THREE.Vector3, minD = 45) {
    for (let t = 0; t < 8; t++) {
      const bi = clamp(Math.floor((near.x + HALF) / PITCH + rand(-2, 2)), 0, CITY.N - 1), bj = clamp(Math.floor((near.z + HALF) / PITCH + rand(-2, 2)), 0, CITY.N - 1), u = Math.random() * 4;
      const [x, z2] = perim(bi, bj, u), d = Math.hypot(x - near.x, z2 - near.z); if (d < minD || d > this.radius) continue;
      const look = randomLook(), h = createHuman(look); R.scene.add(h.root);
      const nick = Math.random() < .35 ? rpName(look.sex === 'female') : null;
      const p: Ped = { h, x, z: z2, heading: 0, speed: rand(1.1, 1.5), state: 'walk', bi, bj, u, dir: Math.random() < .5 ? 1 : -1, cross: null, timer: rand(5, 30), nick, tag: null, id: this.nextId++, hp: 100 };
      if (nick) { p.tag = tagSprite(nick); h.root.add(p.tag); }
      this.list.push(p); return p;
    }
    return null;
  },
  remove(p: Ped) { disposeHuman(p.h); this.list.splice(this.list.indexOf(p), 1); },
  update(dt: number, tsim: number, cars: { x: number; z: number; v: number; h: number }[]) {
    this.time = tsim;
    let near = 0; for (const p of this.list) if (Math.hypot(p.x - this.player.x, p.z - this.player.z) < this.radius) near++;
    if (near < this.target) this.spawn(this.player, this.list.length < 4 ? 8 : 45);
    for (const p of [...this.list]) {
      const d = Math.hypot(p.x - this.player.x, p.z - this.player.z);
      if (d > this.radius + 40 && p.state !== 'ride') { this.remove(p); continue; }
      this.step(p, dt, cars);
      // дальних не анимируем каждый кадр
      if (d < 60 || Math.random() < .3) p.h.mixer.update(d < 60 ? dt : dt / .3);
      p.h.root.visible = d < 95 && p.state !== 'ride';
    }
  },
  step(p: Ped, dt: number, cars: { x: number; z: number; v: number; h: number }[]) {
    if (p.state === 'ride') return;
    // опасность: машина рядом на скорости
    for (const c of cars) {
      const dx = p.x - c.x, dz = p.z - c.z, dd = dx * dx + dz * dz;
      if (dd < 2.6 && c.v > 4 && p.state !== 'down') { this.knock(p, c); break; }
      if (dd < 60 && c.v > 9 && p.state === 'walk') { const fx = Math.sin(c.h), fz = Math.cos(c.h); if ((dx * fx + dz * fz) > 0) { p.state = 'flee'; p.timer = 2; p.heading = Math.atan2(dx, dz) + rand(-.6, .6); } }
    }
    let move = 0, anim = 'Walk_Loop';
    switch (p.state) {
      case 'down': p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; play(p.h, 'Walk_Loop', .6); } anim = ''; break;
      case 'flee': p.timer -= dt; move = 4.2; anim = 'Sprint_Loop'; if (p.timer <= 0) { p.state = 'walk'; this.snap(p); } break;
      case 'idle': case 'talk': p.timer -= dt; anim = p.state === 'talk' ? 'Idle_Talking_Loop' : 'Idle_Loop'; if (p.timer <= 0) { p.state = 'walk'; p.timer = rand(10, 40); } break;
      case 'wait': {
        anim = 'Idle_Loop'; const cr = p.cross!; if (lightState(cr.ni, cr.nj, cr.axis === 0 ? 1 : 0, this.time) === 2) { p.state = 'cross'; } break;
      }
      case 'cross': {
        const cr = p.cross!, L = Math.hypot(cr.x1 - cr.x0, cr.z1 - cr.z0); cr.t += p.speed * 1.15 * dt / L;
        const x = cr.x0 + (cr.x1 - cr.x0) * cr.t, z = cr.z0 + (cr.z1 - cr.z0) * cr.t; p.heading = Math.atan2(cr.x1 - cr.x0, cr.z1 - cr.z0); p.x = x; p.z = z;
        if (cr.t >= 1) { this.snap(p); p.cross = null; p.state = 'walk'; }
        anim = 'Walk_Loop'; break;
      }
      case 'walk': {
        p.timer -= dt; if (p.timer <= 0) { p.state = Math.random() < .3 ? 'talk' : 'idle'; p.timer = rand(3, 8); break; }
        const du = p.speed * dt / (PERIM_LEN / 4) * p.dir, before = p.u; p.u += du;
        // у угла квартала иногда переходим улицу
        const corner = Math.floor(before) !== Math.floor(p.u) || (p.u < 0 !== before < 0);
        if (corner && Math.random() < .5) { this.startCross(p); break; }
        const [tx, tz] = perim(p.bi, p.bj, p.u); p.heading = Math.atan2(tx - p.x, tz - p.z) || p.heading; p.x = tx; p.z = tz;
        break;
      }
    }
    if (move) { p.x += Math.sin(p.heading) * move * dt; p.z += Math.cos(p.heading) * move * dt; }
    if (anim) play(p.h, anim, .25, anim === 'Walk_Loop' ? p.speed / 1.3 : 1);
    const r = p.h.root; r.position.set(p.x, 0, p.z); r.rotation.y += angDiff(r.rotation.y, p.heading) * Math.min(1, dt * 8);
  },
  snap(p: Ped) {
    p.bi = clamp(Math.floor((p.x + HALF) / PITCH), 0, CITY.N - 1); p.bj = clamp(Math.floor((p.z + HALF) / PITCH), 0, CITY.N - 1);
    // ближайшая точка периметра
    let best = 0, bd = 1e9; for (let k = 0; k < 64; k++) { const u = k / 16, [x, z] = perim(p.bi, p.bj, u), d = (x - p.x) ** 2 + (z - p.z) ** 2; if (d < bd) { bd = d; best = u; } } p.u = best;
  },
  startCross(p: Ped) {
    // угол квартала → переход к соседнему кварталу по зебре
    const s = Math.round(((p.u % 4) + 4) % 4) % 4, horiz = Math.random() < .5;
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]], [cx, cz] = corners[s];
    const ni = p.bi + (horiz ? (cx ? 1 : -1) : 0), nj = p.bj + (horiz ? 0 : (cz ? 1 : -1));
    if (ni < 0 || nj < 0 || ni >= CITY.N || nj >= CITY.N) { p.dir *= -1; return; }
    const [x0, z0] = perim(p.bi, p.bj, s), x1 = horiz ? x0 + (cx ? 1 : -1) * 2 * SIDEW : x0, z1 = horiz ? z0 : z0 + (cz ? 1 : -1) * 2 * SIDEW;
    p.cross = { x0, z0, x1, z1, t: 0, axis: horiz ? 0 : 1, ni: p.bi + cx, nj: p.bj + cz }; p.x = x0; p.z = z0; p.state = 'wait';
  },
  knock(p: Ped, c: { x: number; z: number; v: number; h: number }) {
    p.state = 'down'; p.timer = 4; play(p.h, 'Death01', .1); p.hp -= c.v * 4;
    p.heading = c.h + Math.PI; p.x += Math.sin(c.h) * 1.5; p.z += Math.cos(c.h) * 1.5;
    this.onHit?.(p, c);
  },
};
