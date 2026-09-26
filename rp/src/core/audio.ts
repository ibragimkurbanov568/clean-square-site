// Звук синтезом Web Audio: двигатель по оборотам, шины, клаксон, сирена, городской фон, интерфейс
import { clamp } from './util';

export const Snd = {
  ctx: null as AudioContext | null, master: null as GainNode | null, sfx: null as GainNode | null, noise: null as AudioBuffer | null,
  eng: null as any, amb: null as any, siren: null as any, tires: null as any, vol: .8,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    const c: AudioContext = this.ctx = new AC(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(comp); this.sfx = c.createGain(); this.sfx.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; d[i] = w * .6 + b * 3; } this.noise = nb;
    // двигатель: пила + квадрат через перегруз и фильтр
    const e: any = { o1: c.createOscillator(), o2: c.createOscillator(), ws: c.createWaveShaper(), f: c.createBiquadFilter(), g: c.createGain() };
    e.o1.type = 'sawtooth'; e.o2.type = 'square'; const cv = new Float32Array(512); for (let i = 0; i < 512; i++) cv[i] = Math.tanh((i / 256 - 1) * 2.5); e.ws.curve = cv;
    const g2 = c.createGain(); g2.gain.value = .5; e.o1.connect(e.ws); e.o2.connect(g2); g2.connect(e.ws); e.ws.connect(e.f); e.f.type = 'lowpass'; e.f.Q.value = 3; e.f.connect(e.g); e.g.gain.value = 0; e.g.connect(this.master);
    e.o1.start(); e.o2.start(); this.eng = e;
    // шины
    const ts = c.createBufferSource(); ts.buffer = nb; ts.loop = true; const tf = c.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 1700; tf.Q.value = 4; const tg = c.createGain(); tg.gain.value = 0; ts.connect(tf); tf.connect(tg); tg.connect(this.master); ts.start(); this.tires = { g: tg };
    // город: низкий гул + шелест
    const as = c.createBufferSource(); as.buffer = nb; as.loop = true; const af = c.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 420; const ag = c.createGain(); ag.gain.value = 0; as.connect(af); af.connect(ag); ag.connect(this.master); as.start();
    const rs = c.createBufferSource(); rs.buffer = nb; rs.loop = true; const rf = c.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2500; const rg = c.createGain(); rg.gain.value = 0; rs.connect(rf); rf.connect(rg); rg.connect(this.master); rs.start();
    this.amb = { g: ag, rain: rg };
    // сирена
    const so = c.createOscillator(), sl = c.createOscillator(), slg = c.createGain(), sg = c.createGain(); so.type = 'square'; so.frequency.value = 900; sl.frequency.value = .5; slg.gain.value = 350; sl.connect(slg); slg.connect(so.frequency);
    const sf = c.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 2200; so.connect(sf); sf.connect(sg); sg.gain.value = 0; sg.connect(this.master); so.start(); sl.start(); this.siren = { g: sg };
  },
  setVol(v: number) { this.vol = v; if (this.master) this.master.gain.value = v; },
  engine(on: boolean, rpm01: number, thr: number, cyl = 4) {
    if (!this.eng || !this.ctx) return; const t = this.ctx.currentTime, e = this.eng;
    if (!on) { e.g.gain.setTargetAtTime(0, t, .1); return; }
    const rpm = 800 + rpm01 * 5600, f = rpm / 60 * cyl / 2;
    e.o1.frequency.setTargetAtTime(f, t, .03); e.o2.frequency.setTargetAtTime(f * .5, t, .03);
    e.f.frequency.setTargetAtTime(300 + rpm01 * 1800 * (.5 + thr * .5), t, .05); e.g.gain.setTargetAtTime(.035 + thr * .05 + rpm01 * .03, t, .05);
  },
  tire(k: number) { if (this.tires && this.ctx) this.tires.g.gain.setTargetAtTime(clamp(k, 0, 1) * .12, this.ctx.currentTime, .06); },
  ambient(city: number, rain: number) { if (!this.amb || !this.ctx) return; const t = this.ctx.currentTime; this.amb.g.gain.setTargetAtTime(city * .06, t, .5); this.amb.rain.gain.setTargetAtTime(rain * .07, t, .5); },
  sirenLevel(k: number) { if (this.siren && this.ctx) this.siren.g.gain.setTargetAtTime(clamp(k, 0, 1) * .045, this.ctx.currentTime, .1); },
  tone(f: number, d: number, type: OscillatorType = 'sine', v = .15, when = 0, slide = 1) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(this.sfx!); o.start(t); o.stop(t + d + .05);
  },
  burst(d: number, f: number, v = .3, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = c.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(this.sfx!); s.start(t, Math.random()); s.stop(t + d);
  },
  play(n: string, v = 1) {
    switch (n) {
      case 'horn': this.tone(420, .45, 'sawtooth', .07 * v); this.tone(525, .45, 'sawtooth', .06 * v); break;
      case 'hit': this.burst(.35, 500, .4 * v); this.tone(60, .3, 'sine', .3 * v, 0, .5); break;
      case 'door': this.burst(.12, 900, .25); this.tone(120, .1, 'square', .08); break;
      case 'money': [880, 1320].forEach((f, i) => this.tone(f, .18, 'triangle', .1, i * .07)); break;
      case 'click': this.tone(1000, .04, 'triangle', .05); break;
      case 'notify': this.tone(660, .12, 'sine', .1); this.tone(990, .16, 'sine', .08, .1); break;
      case 'step': this.burst(.05, 500, .04); break;
      case 'bad': this.tone(220, .35, 'sawtooth', .07, 0, .6); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .3, 'triangle', .1, i * .09)); break;
    }
  },
};
