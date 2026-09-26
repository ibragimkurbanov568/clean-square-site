// Звук города на реальных записях (Freesound, CC0 — авторы в assets/snd/credits.json) + синтез для интерфейса.
// Фоновые слои смешиваются по месту и времени суток; машины рядом звучат в 3D; светофоры тикают на пешеходной фазе.
import { clamp, lerp } from './util';

const BASE = import.meta.env.BASE_URL + 'assets/snd/';
const FILES = ['amb_city', 'amb_street', 'amb_night_city', 'amb_yard', 'amb_kids', 'amb_crickets', 'amb_river', 'amb_birds', 'amb_crowd', 'rain', 'rain_heavy', 'rain_roof', 'wind', 'wind_trees',
  'thunder1', 'thunder2', 'eng_idle', 'eng_low', 'eng_motor', 'eng_bus', 'eng_interior', 'eng_start', 'horn1', 'horn2', 'horn3', 'siren_police', 'siren_amb', 'ped_tick', 'ped_beep',
  'steps', 'door_open', 'door_close', 'crash1', 'crash2', 'skid', 'bus_brake', 'bus_door', 'tram_bell', 'dog', 'pigeons', 'car_pass1', 'car_pass2'];
type Loop = { src: AudioBufferSourceNode; g: GainNode; p?: PannerNode };
export interface AmbEnv { city: number; yard: number; river: number; park: number; hour: number; rain: number; wind: number; inCar: boolean; night: number }

export const Snd = {
  ctx: null as AudioContext | null, master: null as GainNode | null, sfx: null as GainNode | null, amb: null as GainNode | null, noise: null as AudioBuffer | null,
  buf: {} as Record<string, AudioBuffer>, loops: {} as Record<string, Loop>, vol: .8, eng: null as any, cars: [] as (Loop & { id: number; rate: AudioParam })[],
  carFilter: null as BiquadFilterNode | null, loaded: false, tick: null as (Loop & { k: number }) | null, siren: null as Loop | null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    const c: AudioContext = this.ctx = new AC(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(comp);
    // «салон»: фильтр, через который идут звуки улицы, когда игрок в машине
    this.carFilter = c.createBiquadFilter(); this.carFilter.type = 'lowpass'; this.carFilter.frequency.value = 20000; this.carFilter.connect(this.master);
    this.sfx = c.createGain(); this.sfx.connect(this.carFilter); this.amb = c.createGain(); this.amb.connect(this.carFilter);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    this.load();
  },
  async load() {
    const c = this.ctx!;
    await Promise.all(FILES.map(async f => { try { const r = await fetch(BASE + f + '.mp3'); this.buf[f] = await c.decodeAudioData(await r.arrayBuffer()); } catch { /* нет файла — тихо */ } }));
    this.loaded = true;
    // фоновые петли (громкость 0, дальше управляет ambient())
    for (const k of ['amb_city', 'amb_street', 'amb_night_city', 'amb_yard', 'amb_kids', 'amb_crickets', 'amb_river', 'amb_birds', 'rain', 'rain_heavy', 'wind', 'wind_trees', 'pigeons']) this.loops[k] = this.loop(k, this.amb!);
    this.loops.rain_roof = this.loop('rain_roof', this.master!); this.loops.eng_interior = this.loop('eng_interior', this.master!);
    // двигатель игрока: холостой ход + нагрузка, высота по оборотам
    const idle = this.loop('eng_idle', this.master!), low = this.loop('eng_low', this.master!), bus = this.loop('eng_bus', this.master!);
    this.eng = { idle, low, bus };
  },
  loop(name: string, out: AudioNode, panner = false): Loop {
    const c = this.ctx!, src = c.createBufferSource(), g = c.createGain(); g.gain.value = 0;
    if (this.buf[name]) { src.buffer = this.buf[name]; src.loop = true; src.start(0, Math.random() * this.buf[name].duration); }
    let p: PannerNode | undefined;
    if (panner) { p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 6; p.rolloffFactor = 1.2; p.maxDistance = 200; src.connect(g); g.connect(p); p.connect(out); }
    else { src.connect(g); g.connect(out); }
    return { src, g, p };
  },
  setVol(v: number) { this.vol = v; if (this.master) this.master.gain.value = v; },
  set(l: Loop | undefined, v: number, t = .4) { if (l && this.ctx) l.g.gain.setTargetAtTime(v, this.ctx.currentTime, t); },
  // слушатель — камера
  listener(x: number, y: number, z: number, fx: number, fy: number, fz: number) {
    const L = this.ctx?.listener; if (!L) return; const t = this.ctx!.currentTime;
    if (L.positionX) { L.positionX.setTargetAtTime(x, t, .05); L.positionY.setTargetAtTime(y, t, .05); L.positionZ.setTargetAtTime(z, t, .05); L.forwardX.setTargetAtTime(fx, t, .05); L.forwardY.setTargetAtTime(fy, t, .05); L.forwardZ.setTargetAtTime(fz, t, .05); L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else (L as any).setPosition(x, y, z);
  },
  // фон: место (центр/двор/река/парк), время суток, погода; в салоне улица глушится
  ambient(e: AmbEnv | number, rain = 0) {
    if (!this.loaded || !this.ctx) return;
    if (typeof e === 'number') e = { city: e, yard: 0, river: 0, park: 0, hour: 12, rain, wind: 0, inCar: false, night: 0 };
    const day = 1 - e.night, morning = clamp(1 - Math.abs(e.hour - 7.5) / 3, 0, 1), eve = clamp(1 - Math.abs(e.hour - 19) / 3, 0, 1), dry = 1 - e.rain;
    const traffic = lerp(.35, 1, clamp(day + eve, 0, 1));
    this.set(this.loops.amb_city, e.city * traffic * .55); this.set(this.loops.amb_street, (1 - e.city) * .35 * traffic + e.yard * .1);
    this.set(this.loops.amb_night_city, e.night * .35 * (e.city + .3)); this.set(this.loops.amb_yard, e.yard * day * .45 * dry);
    this.set(this.loops.amb_kids, e.yard * day * clamp((e.hour - 9) / 2, 0, 1) * clamp((20 - e.hour) / 2, 0, 1) * .35 * dry);
    this.set(this.loops.amb_birds, (morning * .6 + day * .15) * (e.park * .8 + e.yard * .5 + .15) * dry);
    this.set(this.loops.amb_crickets, e.night * (e.park + e.yard * .6 + .2) * .45 * dry); this.set(this.loops.amb_river, e.river * .6);
    this.set(this.loops.pigeons, e.city > .5 && day > .5 ? .12 * dry : 0);
    this.set(this.loops.rain, clamp(e.rain * 1.4, 0, 1) * .6 * (e.inCar ? .3 : 1)); this.set(this.loops.rain_heavy, clamp(e.rain * 2 - 1, 0, 1) * .5 * (e.inCar ? .3 : 1));
    this.set(this.loops.rain_roof, e.inCar ? e.rain * .7 : 0); this.set(this.loops.wind, e.wind * .5 * (e.inCar ? .3 : 1)); this.set(this.loops.wind_trees, e.wind * (e.park + e.yard) * .4);
    this.carFilter!.frequency.setTargetAtTime(e.inCar ? 900 : 20000, this.ctx.currentTime, .15);
  },
  // двигатель игрока: rpm01 0..1, газ 0..1
  engine(on: boolean, rpm01: number, thr: number, cyl = 4) {
    if (!this.eng || !this.ctx) return; const t = this.ctx.currentTime, big = cyl > 4;
    if (!on) { for (const l of [this.eng.idle, this.eng.low, this.eng.bus]) this.set(l, 0, .15); this.set(this.loops.eng_interior, 0); return; }
    const r = .85 + rpm01 * 1.5;
    const car = big ? this.eng.bus : this.eng.idle; if (big) this.set(this.eng.idle, 0); else this.set(this.eng.bus, 0);
    car.src.playbackRate.setTargetAtTime(big ? .8 + rpm01 * .7 : r, t, .05); this.set(car, .35 + thr * .25, .05);
    this.eng.low.src.playbackRate.setTargetAtTime(.7 + rpm01 * 1.2, t, .05); this.set(this.eng.low, big ? 0 : thr * .35 * (.4 + rpm01), .05);
    this.set(this.loops.eng_interior, .08 + rpm01 * .15, .2);
  },
  tire(k: number) {
    if (!this.ctx) return; if (!this.loops.skid && this.buf.skid) this.loops.skid = this.loop('skid', this.master!);
    this.set(this.loops.skid, clamp(k, 0, 1) * .4, .06);
  },
  // машины трафика рядом: до 5 объёмных источников
  traffic(cars: { id: number; x: number; z: number; v: number; bus: boolean }[]) {
    if (!this.loaded || !this.ctx) return; const t = this.ctx.currentTime;
    while (this.cars.length < 5) { const l = this.loop(this.cars.length % 2 ? 'eng_motor' : 'eng_idle', this.sfx!, true) as any; l.id = -1; l.rate = l.src.playbackRate; this.cars.push(l); }
    this.cars.forEach((l, i) => {
      const c = cars[i];
      if (!c) { this.set(l, 0, .2); return; }
      l.p!.positionX.setTargetAtTime(c.x, t, .05); l.p!.positionY.setTargetAtTime(.6, t, .05); l.p!.positionZ.setTargetAtTime(c.z, t, .05);
      l.rate.setTargetAtTime((c.bus ? .6 : .9) + c.v / 20, t, .1); this.set(l, (c.bus ? .5 : .3) + Math.min(.3, c.v / 40), .15);
    });
  },
  // светофор: тиканье на пешеходной фазе у ближайшего перекрёстка
  pedSignal(x: number, z: number, walk: boolean, near: boolean) {
    if (!this.loaded || !this.ctx) return;
    if (!this.tick) { const l = this.loop('ped_tick', this.sfx!, true) as any; l.p.refDistance = 3; l.p.rolloffFactor = 2; this.tick = l; }
    const t = this.ctx.currentTime; this.tick!.p!.positionX.setTargetAtTime(x, t, .05); this.tick!.p!.positionY.setTargetAtTime(2, t, .05); this.tick!.p!.positionZ.setTargetAtTime(z, t, .05);
    this.tick!.src.playbackRate.setTargetAtTime(walk ? 1.25 : .55, t, .1); this.set(this.tick!, near ? (walk ? .5 : .25) : 0, .1);
  },
  sirenAt(x: number, z: number, k: number) {
    if (!this.loaded || !this.ctx) return; if (!this.siren) { this.siren = this.loop('siren_police', this.sfx!, true); this.siren.p!.refDistance = 15; }
    const t = this.ctx.currentTime; this.siren.p!.positionX.setTargetAtTime(x, t, .05); this.siren.p!.positionZ.setTargetAtTime(z, t, .05); this.siren.p!.positionY.value = 1.5; this.set(this.siren, k * .8, .1);
  },
  sirenLevel(k: number) { if (k <= 0 && this.siren) this.set(this.siren, 0, .2); },
  // одиночные звуки; x,z — положение в мире (объёмно), иначе «в голове»
  sample(name: string, v = 1, x?: number, z?: number, rate = 1, offset = 0, dur?: number) {
    if (!this.ctx || !this.buf[name]) return; const c = this.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = this.buf[name]; s.playbackRate.value = rate; g.gain.value = v;
    if (x !== undefined && z !== undefined) { const p = c.createPanner(); p.panningModel = 'HRTF'; p.refDistance = 5; p.rolloffFactor = 1.3; p.positionX.value = x; p.positionY.value = 1; p.positionZ.value = z; s.connect(g); g.connect(p); p.connect(this.sfx!); }
    else { s.connect(g); g.connect(this.sfx!); }
    s.start(0, offset, dur);
  },
  tone(f: number, d: number, type: OscillatorType = 'sine', v = .15, when = 0, slide = 1) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(this.master!); o.start(t); o.stop(t + d + .05);
  },
  burst(d: number, f: number, v = .3, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = c.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(this.sfx!); s.start(t, Math.random() * .5); s.stop(t + d);
  },
  play(n: string, v = 1, x?: number, z?: number) {
    const R = Math.random;
    switch (n) {
      case 'horn': this.sample(['horn1', 'horn2', 'horn3'][Math.floor(R() * 3)], .5 * v, x, z, .95 + R() * .1); break;
      case 'hit': this.sample(R() < .5 ? 'crash1' : 'crash2', .6 * v, x, z); break;
      case 'door': this.sample('door_close', .6, x, z); break;
      case 'door_open': this.sample('door_open', .5, x, z); break;
      case 'start': this.sample('eng_start', .5); break;
      case 'step': if (this.buf.steps) { const d = this.buf.steps.duration; this.sample('steps', .35 * v, x, z, .9 + R() * .2, R() * (d - .4), .35); } break;
      case 'thunder': this.sample(R() < .5 ? 'thunder1' : 'thunder2', .8 * v); break;
      case 'dog': this.sample('dog', .5 * v, x, z); break;
      case 'pass': this.sample(R() < .5 ? 'car_pass1' : 'car_pass2', .5 * v, x, z); break;
      case 'bus_brake': this.sample('bus_brake', .5 * v, x, z); break;
      case 'bus_door': this.sample('bus_door', .5 * v, x, z); break;
      case 'tram': this.sample('tram_bell', .6 * v, x, z); break;
      case 'money': [880, 1320].forEach((f, i) => this.tone(f, .18, 'triangle', .1, i * .07)); break;
      case 'click': this.tone(1000, .04, 'triangle', .05); break;
      case 'notify': this.tone(660, .12, 'sine', .1); this.tone(990, .16, 'sine', .08, .1); break;
      case 'bad': this.tone(220, .35, 'sawtooth', .07, 0, .6); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .3, 'triangle', .1, i * .09)); break;
    }
  },
};
