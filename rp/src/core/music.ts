// Радио без аудиофайлов: музыка сочиняется на лету (Web Audio) — аккорды, бас, мелодия, ударные.
// Три станции с разным характером. Играет в машине (📻) и в наушниках.
import { Snd } from './audio';

interface Station { name: string; bpm: number; wave: OscillatorType; lead: OscillatorType; prog: number[][]; drums: string; swing: number }
// ступени аккордов в полутонах от тоники
const MIN = [0, 3, 7], MAJ = [0, 4, 7];
export const STATIONS: Station[] = [
  { name: 'Край FM — лоу-фай', bpm: 78, wave: 'triangle', lead: 'sine', prog: [[-3, ...MIN], [5, ...MAJ], [0, ...MAJ], [7, ...MAJ]], drums: 'x...o...x.x.o...', swing: .12 },
  { name: 'Дорожное радио — диско', bpm: 118, wave: 'sawtooth', lead: 'square', prog: [[0, ...MIN], [-4, ...MAJ], [-2, ...MAJ], [-5, ...MIN]], drums: 'x.h.o.h.x.h.o.hh', swing: 0 },
  { name: 'Ночной город — синтвейв', bpm: 96, wave: 'sawtooth', lead: 'triangle', prog: [[0, ...MIN], [-4, ...MAJ], [3, ...MAJ], [-2, ...MAJ]], drums: 'x...o..xx...o...', swing: .05 },
];
const SCALE = [0, 2, 3, 5, 7, 8, 10];
const hz = (semi: number, base = 220) => base * Math.pow(2, semi / 12);

export const Music = {
  on: false, st: 0, out: null as GainNode | null, filt: null as BiquadFilterNode | null, next: 0, step: 0, seed: 1, timer: 0 as any,
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; },
  start(st?: number) {
    if (st === undefined) st = this.st; Snd.init(); const c = Snd.ctx; if (!c) return;
    this.st = st; if (!this.out) { this.filt = c.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 5000; this.out = c.createGain(); this.out.gain.value = .16; this.out.connect(this.filt); this.filt.connect(Snd.master!); }
    if (this.on) return; this.on = true; this.next = c.currentTime + .1; this.step = 0; this.seed = 1 + st * 777 + Math.floor(Math.random() * 999);
    this.timer = setInterval(() => this.schedule(), 100);
  },
  stop() { this.on = false; clearInterval(this.timer); },
  cycle() { if (!this.on) { this.start(0); return STATIONS[0].name; } if (this.st < STATIONS.length - 1) { this.stop(); this.start(this.st + 1); return STATIONS[this.st].name; } this.stop(); return 'Радио выключено'; },
  // в машине звук глуше; в наушниках — чище
  muffle(inCar: boolean) { if (this.filt && Snd.ctx) this.filt.frequency.setTargetAtTime(inCar ? 2600 : 6000, Snd.ctx.currentTime, .3); },
  schedule() {
    const c = Snd.ctx; if (!c || !this.on || !this.out) return;
    const S = STATIONS[this.st], sixteenth = 60 / S.bpm / 4;
    while (this.next < c.currentTime + .25) {
      const k = this.step % 16, bar = Math.floor(this.step / 16) % S.prog.length, [root, ...ch] = S.prog[bar], t = this.next + (k % 2 ? S.swing * sixteenth : 0);
      if (k === 0) for (const n of ch) this.note(S.wave, hz(root + n, 220), t, sixteenth * 15, .05, .6);            // аккорд на такт
      if (k % 4 === 0) this.note('sine', hz(root - 12, 110), t, sixteenth * 3, .22, .2);                           // бас по долям
      if (k % 2 === 0 && this.rnd() < .45) { const deg = SCALE[Math.floor(this.rnd() * SCALE.length)]; this.note(S.lead, hz(deg + root + 12, 220), t, sixteenth * (this.rnd() < .3 ? 3 : 1.5), .06, .3); } // мелодия
      const d = S.drums[k]; if (d === 'x') this.kick(t); if (d === 'o') this.snare(t); if (d === 'h') this.hat(t);
      this.next += sixteenth; this.step++;
    }
  },
  note(type: OscillatorType, f: number, t: number, dur: number, vol: number, rel: number) {
    const c = Snd.ctx!, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.setTargetAtTime(0, t + dur, rel * .3);
    o.connect(g); g.connect(this.out!); o.start(t); o.stop(t + dur + rel * 2);
  },
  kick(t: number) { const c = Snd.ctx!, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(this.out!); o.start(t); o.stop(t + .22); },
  noiseHit(t: number, dur: number, vol: number, hp: number) {
    const c = Snd.ctx!; if (!Snd.noise) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = Snd.noise; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(this.out!); s.start(t, Math.random()); s.stop(t + dur + .02);
  },
  snare(t: number) { this.noiseHit(t, .16, .25, 1500); },
  hat(t: number) { this.noiseHit(t, .04, .12, 7000); },
};
