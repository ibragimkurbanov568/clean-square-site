// ==== 6. INPUT ====
// Клавиатура, касания и геймпад сводятся в единый вектор движения.
const Input = {
  keys: new Set(), mx: 0, my: 0, moving: false, flash: false, pause: false, usingTouch: false,
  joy: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 },
  pad: { prev: {}, axesX: 0, axesY: 0, navCd: 0 },
  init(canvas) {
    addEventListener('keydown', e => {
      if (e.repeat && !/^Arrow/.test(e.code)) return;
      Input.keys.add(e.code);
      if (e.code === 'Space' && Game.state === 'RUN') { Input.flash = true; e.preventDefault(); }
      if ((e.code === 'Escape' || e.code === 'KeyP')) { Input.pause = true; }
      if (e.code === 'F3') { Game.save.settings.fps = !Game.save.settings.fps; e.preventDefault(); }
      if (Game.state !== 'RUN') UI.onKey(e);
    });
    addEventListener('keyup', e => Input.keys.delete(e.code));
    addEventListener('blur', () => Input.keys.clear());
    const pd = e => {
      if (Game.state !== 'RUN') return;
      Input.usingTouch = e.pointerType === 'touch' || e.pointerType === 'pen'; UI.touchMode();
      if (Input.joy.active || !Input.usingTouch) return;
      const s = Game.save.settings, w = innerWidth, h = innerHeight;
      const leftSide = s.joySide === 'left';
      if (s.joy === 'fixed') {
        const ox = leftSide ? 110 : w - 110, oy = h - 130;
        if (Math.hypot(e.clientX - ox, e.clientY - oy) > 140) return;
        Input.joy.ox = ox; Input.joy.oy = oy;
      } else {
        Input.joy.ox = e.clientX; Input.joy.oy = e.clientY;
      }
      Input.joy.active = true; Input.joy.id = e.pointerId; Input.joy.x = e.clientX; Input.joy.y = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', e => { if (Input.joy.active && e.pointerId === Input.joy.id) { Input.joy.x = e.clientX; Input.joy.y = e.clientY; } });
    const pu = e => { if (e.pointerId === Input.joy.id) { Input.joy.active = false; Input.joy.id = -1; } };
    canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('touchmove', e => { if (Game.state === 'RUN') e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    addEventListener('touchstart', () => { if (!Input.usingTouch) { Input.usingTouch = true; UI.touchMode(); } }, { passive: true });
    const fb = document.getElementById('flashBtn');
    fb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Input.flash = true; });
    document.getElementById('pauseBtn').addEventListener('click', () => { Input.pause = true; });
  },
  poll() {
    let x = 0, y = 0; const k = Input.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (x || y) { const l = Math.hypot(x, y); x /= l; y /= l; }
    if (Input.joy.active) {
      const R = 60; let dx = Input.joy.x - Input.joy.ox, dy = Input.joy.y - Input.joy.oy; const l = Math.hypot(dx, dy);
      if (l > R && Game.save.settings.joy === 'float') { Input.joy.ox += dx / l * (l - R); Input.joy.oy += dy / l * (l - R); dx = Input.joy.x - Input.joy.ox; dy = Input.joy.y - Input.joy.oy; }
      const m = Math.min(1, Math.hypot(dx, dy) / R);
      if (m > 0.1) { const a = Math.atan2(dy, dx), mm = (m - 0.1) / 0.9; x = Math.cos(a) * mm; y = Math.sin(a) * mm; }
    }
    Input.pollPad();
    if (Math.hypot(Input.pad.axesX, Input.pad.axesY) > 0.18) { x = Input.pad.axesX; y = Input.pad.axesY; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } }
    Input.mx = x; Input.my = y; Input.moving = x !== 0 || y !== 0;
  },
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) { Input.pad.axesX = Input.pad.axesY = 0; return; }
    Input.pad.axesX = gp.axes[0] || 0; Input.pad.axesY = gp.axes[1] || 0;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), prev = Input.pad.prev;
    const edge = i => b(i) && !prev[i];
    if (Game.state === 'RUN') { if (edge(0)) Input.flash = true; if (edge(9)) Input.pause = true; }
    else {
      if (edge(9)) Input.pause = true;
      if (edge(0)) UI.padPress(); if (edge(1)) UI.padBack();
      const now = performance.now();
      let dir = null;
      if (b(12) || Input.pad.axesY < -0.6) dir = 'up'; else if (b(13) || Input.pad.axesY > 0.6) dir = 'down';
      else if (b(14) || Input.pad.axesX < -0.6) dir = 'left'; else if (b(15) || Input.pad.axesX > 0.6) dir = 'right';
      if (dir && now > Input.pad.navCd) { UI.moveFocus(dir); Input.pad.navCd = now + 180; }
      if (!dir) Input.pad.navCd = 0;
    }
    for (let i = 0; i < gp.buttons.length; i++) prev[i] = b(i);
  },
};

// ==== 7. SPRITE FACTORY ====
// Всё рисуется процедурно один раз при загрузке, дальше — только drawImage.
const Sprites = { enemy: {}, player: {}, icon: {}, decor: {}, ground: {}, ember: [], emberCb: [], glow: {}, light: null, misc: {} };
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h || w); return c; }
function whiteOf(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return c; }
function radial(size, stops) { const c = mkCanvas(size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
function circ(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } }
function ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } }
function poly(g, pts, fill, stroke, lw = 1) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function shade(g, r, col = 'rgba(0,0,0,.35)') { ell(g, 0, r * 0.85, r * 0.8, r * 0.25, col); }

// Художники врагов: (g, r, f) — центр в (0,0), r — радиус, f — кадр
const PAINT = {
  ghoul(g, r, f) { shade(g, r); const b = f ? 1 : -1; ell(g, 0, r * .15, r * .62, r * .75, '#4f5a45'); ell(g, -r * .1, -r * .45, r * .42, r * .38, '#6b765d');
    g.strokeStyle = '#3a4233'; g.lineWidth = r * .18; g.lineCap = 'round'; g.beginPath(); g.moveTo(-r * .45, 0); g.lineTo(-r * .8, r * .35 * b + r * .2); g.moveTo(r * .45, 0); g.lineTo(r * .85, r * .2 - r * .3 * b); g.stroke();
    ell(g, 0, r * .1, r * .4, r * .12, 'rgba(0,0,0,.25)'); },
  bat(g, r, f) { const w = f ? .9 : .4; poly(g, [0, -r * .1, -r * 1.2, -r * w, -r * .8, r * .1, -r * .45, -r * .05, -r * .25, r * .35, 0, r * .1, r * .25, r * .35, r * .45, -r * .05, r * .8, r * .1, r * 1.2, -r * w], '#2a2230');
    ell(g, 0, 0, r * .32, r * .38, '#3b3042'); poly(g, [-r * .25, -r * .3, -r * .15, -r * .6, -r * .05, -r * .3], '#3b3042'); poly(g, [r * .25, -r * .3, r * .15, -r * .6, r * .05, -r * .3], '#3b3042'); },
  skeleton(g, r, f) { shade(g, r); g.strokeStyle = '#d9d2bf'; g.lineWidth = r * .12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -r * .3); g.lineTo(0, r * .45); for (let i = 0; i < 3; i++) { g.moveTo(-r * .35, -r * .15 + i * r * .2); g.lineTo(r * .35, -r * .15 + i * r * .2); }
    g.moveTo(0, r * .45); g.lineTo(-r * .3, r * (f ? .95 : .85)); g.moveTo(0, r * .45); g.lineTo(r * .3, r * (f ? .85 : .95)); g.stroke();
    circ(g, 0, -r * .55, r * .38, '#e8e1cf'); ell(g, 0, -r * .35, r * .22, r * .12, '#bfb7a3');
    g.strokeStyle = '#9aa0a8'; g.lineWidth = r * .14; g.beginPath(); g.moveTo(r * .45, 0); g.lineTo(r * 1.1, -r * .7); g.stroke(); },
  drowned(g, r, f) { shade(g, r); ell(g, 0, r * .1, r * .75, r * .8 + (f ? r * .04 : 0), '#3d5a6b'); ell(g, 0, -r * .45, r * .48, r * .42, '#5b7c8a');
    g.fillStyle = '#26404d'; for (let i = -2; i <= 2; i++) { g.fillRect(i * r * .2 - r * .04, -r * .3, r * .08, r * .5 + Math.abs(i) * r * .1); }
    ell(g, 0, r * .5, r * .5, r * .12, 'rgba(120,200,220,.25)'); },
  shade(g, r, f) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.1); gr.addColorStop(0, 'rgba(10,6,20,.95)'); gr.addColorStop(.7, 'rgba(20,10,35,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-r, r * .2); g.quadraticCurveTo(-r * .9, -r * 1.1, 0, -r); g.quadraticCurveTo(r * .9, -r * 1.1, r, r * .2);
    for (let i = 0; i < 4; i++) g.lineTo(r - (i + .5) * r / 2, r * (f ^ (i & 1) ? 1 : .7)); g.closePath(); g.fill(); },
  gargoyle(g, r, f) { shade(g, r); poly(g, [-r * 1.1, -r * .2, -r * .5, -r * (f ? .9 : .6), -r * .3, 0], '#5e5a55'); poly(g, [r * 1.1, -r * .2, r * .5, -r * (f ? .9 : .6), r * .3, 0], '#5e5a55');
    ell(g, 0, r * .1, r * .6, r * .7, '#7a756d'); circ(g, 0, -r * .45, r * .38, '#8a857b'); poly(g, [-r * .3, -r * .7, -r * .4, -r * 1.05, -r * .12, -r * .75], '#6a655c'); poly(g, [r * .3, -r * .7, r * .4, -r * 1.05, r * .12, -r * .75], '#6a655c');
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r * .3, 0); g.lineTo(r * .1, r * .3); g.lineTo(0, r * .6); g.stroke(); },
  cultist(g, r, f) { shade(g, r); poly(g, [-r * .7, r * .9, -r * .35, -r * .5, 0, -r * 1.05, r * .35, -r * .5, r * .7, r * .9], '#6b1a1a'); poly(g, [-r * .3, -r * .45, 0, -r * 1.05, r * .3, -r * .45, 0, -r * .2], '#4a0f10');
    ell(g, 0, -r * .45, r * .2, r * .22, '#140606'); g.strokeStyle = '#c9a44a'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(-r * .5, r * .5); g.lineTo(r * .5, r * .5); g.stroke();
    circ(g, r * .75, -r * (f ? .1 : .2), r * .16, '#d05bff'); },
  spider(g, r, f) { shade(g, r); g.strokeStyle = '#1e1a1a'; g.lineWidth = r * .1; g.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 4; i++) { const a = -0.9 + i * .55 + (f && i % 2 ? .15 : 0); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * r * .7, Math.sin(a) * r * .6 - r * .5, s * r * 1.15, Math.sin(a) * r * .9); g.stroke(); }
    ell(g, 0, r * .25, r * .6, r * .55, '#2d2424'); circ(g, 0, -r * .35, r * .32, '#3a2e2e'); g.strokeStyle = '#8b1a1a'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(-r * .2, r * .1); g.lineTo(0, r * .4); g.lineTo(r * .2, r * .1); g.stroke(); },
  spiderling(g, r, f) { PAINT.spider(g, r, f); },
  knight(g, r, f) { shade(g, r); ell(g, 0, r * .1, r * .6, r * .8, '#23262b'); poly(g, [-r * .45, -r * .2, 0, -r * .9, r * .45, -r * .2, r * .3, r * .1, -r * .3, r * .1], '#3b4048');
    g.fillStyle = '#0d0e10'; g.fillRect(-r * .3, -r * .45, r * .6, r * .08); poly(g, [0, -r * 1.2, -r * .08, -r * .85, r * .08, -r * .85], '#8b1a1a');
    // щит
    poly(g, [r * .45, -r * .55, r * 1.05, -r * .45, r * 1.05, r * .3, r * .75, r * .7, r * .45, r * .3], '#4b525c', '#9aa0a8', 2); circ(g, r * .75, 0, r * .12, '#8b1a1a');
    g.fillStyle = '#23262b'; g.fillRect(-r * .35, r * .8, r * .2, r * (f ? .2 : .15)); g.fillRect(r * .15, r * .8, r * .2, r * (f ? .15 : .2)); },
  eater(g, r, f) { shade(g, r); ell(g, 0, 0, r * .9, r * .85, '#1b1420'); const m = f ? .45 : .3; ell(g, 0, r * .15, r * .6, r * m, '#050305');
    g.fillStyle = '#d8d0c0'; for (let i = -3; i <= 3; i++) { poly(g, [i * r * .15 - r * .06, r * .15 - r * m * .9, i * r * .15 + r * .06, r * .15 - r * m * .9, i * r * .15, r * .15 - r * m * .3]); g.fill(); }
    ell(g, 0, -r * .2, r * .8, r * .2, 'rgba(120,90,160,.15)'); },
  banshee(g, r, f) { const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#d9e3ea'); gr.addColorStop(1, 'rgba(160,190,210,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-r * .55, -r * .2); g.quadraticCurveTo(0, -r * 1.3, r * .55, -r * .2); for (let i = 0; i <= 4; i++) g.lineTo(r * .55 - i * r * .275, r * (i % 2 === f ? 1.05 : .8)); g.closePath(); g.fill();
    g.strokeStyle = '#eef2f5'; g.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * r * .15, -r * .7); g.quadraticCurveTo(i * r * .4, -r * .1, i * r * .5 + (f ? 3 : -3), r * .4); g.stroke(); }
    ell(g, 0, -r * .25, r * .14, r * .22, '#1a1d22'); },
  worm(g, r, f) { shade(g, r); for (let i = 3; i >= 0; i--) circ(g, Math.sin(i + f) * r * .2, r * .5 - i * r * .35, r * (.35 + i * .07), i ? '#6e4a3a' : '#8a5c48');
    ell(g, 0, -r * .6, r * .28, r * .18, '#2a1410'); },
  wraith(g, r, f) { const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#6d8f7a'); gr.addColorStop(1, 'rgba(60,90,70,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-r * .6, 0); g.quadraticCurveTo(0, -r * 1.4, r * .6, 0); g.quadraticCurveTo(r * .4, r * (f ? 1 : .8), 0, r * 1.1); g.quadraticCurveTo(-r * .4, r * (f ? .8 : 1), -r * .6, 0); g.fill();
    ell(g, 0, -r * .35, r * .3, r * .2, '#0c1410'); },
  chorister(g, r, f) { shade(g, r); poly(g, [-r * .6, r * .9, -r * .4, -r * .4, r * .4, -r * .4, r * .6, r * .9], '#35505e'); ell(g, 0, -r * .6, r * .32, r * .34, '#7a98a5');
    ell(g, 0, -r * .45, r * .1, r * (f ? .16 : .1), '#0a1418'); g.strokeStyle = '#c9d6dc'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(-r * .4, 0); g.lineTo(r * .4, 0); g.stroke(); },
  stained(g, r, f) { PAINT.knight(g, r, f); const cols = ['#c83a3a', '#3a7ac8', '#e2b24a', '#3ac87a']; for (let i = 0; i < 4; i++) { poly(g, [r * .55 + (i % 2) * r * .22, -r * .4 + (i >> 1) * r * .35, r * .77 + (i % 2) * r * .22, -r * .4 + (i >> 1) * r * .35, r * .66 + (i % 2) * r * .22, -r * .1 + (i >> 1) * r * .35], cols[i]); } },
  imp(g, r, f) { shade(g, r); circ(g, 0, 0, r * .75, '#3a1a10'); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * .7); gr.addColorStop(0, '#ffb14a'); gr.addColorStop(1, 'rgba(255,90,20,0)'); circ(g, 0, 0, r * .7, gr);
    poly(g, [-r * .5, -r * .5, -r * .65, -r * 1.05, -r * .2, -r * .7], '#2a120a'); poly(g, [r * .5, -r * .5, r * .65, -r * 1.05, r * .2, -r * .7], '#2a120a');
    g.fillStyle = '#ffec9a'; g.fillRect(-r * .3, r * .15, r * .6, r * (f ? .12 : .06)); },
  golem(g, r, f) { shade(g, r); poly(g, [-r * .8, r * .8, -r * .95, -r * .1, -r * .5, -r * .8, r * .4, -r * .9, r * .95, -r * .1, r * .8, r * .8], '#4a4440', '#2a2522', 2);
    g.strokeStyle = f ? '#ff7a1a' : '#c85a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * .5, -r * .5); g.lineTo(-r * .1, 0); g.lineTo(-r * .3, r * .5); g.moveTo(r * .3, -r * .6); g.lineTo(r * .1, 0); g.lineTo(r * .5, r * .4); g.stroke(); },
  voideye(g, r, f) { const gr = g.createRadialGradient(0, 0, r * .2, 0, 0, r); gr.addColorStop(0, '#2a1450'); gr.addColorStop(1, 'rgba(60,20,100,0)'); circ(g, 0, 0, r, gr);
    ell(g, 0, 0, r * .75, r * .5, '#e8e0f0'); circ(g, 0, 0, r * .35, '#7b4fd6'); circ(g, 0, 0, r * .16, '#000');
    g.strokeStyle = '#3a1a60'; g.lineWidth = r * .1; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + f * .3; g.beginPath(); g.moveTo(Math.cos(a) * r * .75, Math.sin(a) * r * .5); g.quadraticCurveTo(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a + .4) * r * 1.2, Math.sin(a + .4) * r * 1.1); g.stroke(); } },
  wisp(g, r, f) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, '#b394ff'); gr.addColorStop(1, 'rgba(123,79,214,0)'); circ(g, 0, 0, r, gr);
    g.strokeStyle = 'rgba(200,180,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * .7, f, f + 2); g.stroke(); },
  rotmother(g, r, f) { shade(g, r, 'rgba(0,0,0,.45)'); const gr = g.createRadialGradient(-r * .2, -r * .3, r * .1, 0, 0, r); gr.addColorStop(0, '#9aa83a'); gr.addColorStop(.6, '#5a6a1e'); gr.addColorStop(1, '#2a3210');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-r, r * .6); g.bezierCurveTo(-r * 1.1, -r * .5, -r * .5, -r * (f ? 1.05 : .95), 0, -r * (f ? 1 : .9)); g.bezierCurveTo(r * .5, -r * (f ? 1.05 : .95), r * 1.1, -r * .5, r, r * .6); g.quadraticCurveTo(0, r * .9, -r, r * .6); g.fill();
    for (let i = 0; i < 7; i++) circ(g, Math.cos(i * 2.1) * r * .55, Math.sin(i * 1.7) * r * .4, r * (.06 + (i % 3) * .03), 'rgba(210,230,120,.5)');
    ell(g, 0, r * .25, r * .45, r * (f ? .2 : .15), '#1a1f08'); },
  bishop(g, r, f) { const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#3a2a4a'); gr.addColorStop(1, 'rgba(20,10,30,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-r * .7, -r * .1); g.lineTo(-r * .9, r * 1.1); g.lineTo(r * .9, r * 1.1); g.lineTo(r * .7, -r * .1); g.closePath(); g.fill();
    poly(g, [-r * .3, -r * .35, -r * .35, -r * 1.1, 0, -r * 1.4, r * .35, -r * 1.1, r * .3, -r * .35], '#d8c68a', '#8a7a3a', 2); poly(g, [-r * .06, -r * 1.2, r * .06, -r * 1.2, r * .06, -r * .6, -r * .06, -r * .6], '#8b1a1a');
    ell(g, 0, -r * .2, r * .3, r * .28, '#e8e1cf'); g.fillStyle = '#1a0f22'; g.fillRect(-r * .2, -r * .25, r * .4, r * .08);
    g.strokeStyle = '#c9b060'; g.lineWidth = r * .07; g.beginPath(); g.moveTo(r * .9, r * .9); g.lineTo(r * .95, -r * (f ? 1 : .9)); g.arc(r * .8, -r * (f ? 1 : .9), r * .15, 0, Math.PI, true); g.stroke(); },
  shepherd(g, r, f) { const gr = g.createRadialGradient(0, -r * .2, r * .1, 0, 0, r * 1.1); gr.addColorStop(0, '#0a0610'); gr.addColorStop(.7, '#140a22'); gr.addColorStop(1, 'rgba(40,10,60,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-r * 1.05, r); g.quadraticCurveTo(-r * 1.1, -r * .7, 0, -r * 1.1); g.quadraticCurveTo(r * 1.1, -r * .7, r * 1.05, r);
    for (let i = 0; i < 8; i++) g.lineTo(r * 1.05 - (i + .5) * r * 2.1 / 8, r * ((i + f) % 2 ? 1.15 : .9)); g.closePath(); g.fill();
    poly(g, [-r * .5, -r * .6, -r * .9, -r * 1.3, -r * .35, -r * .8], '#1e1430'); poly(g, [r * .5, -r * .6, r * .9, -r * 1.3, r * .35, -r * .8], '#1e1430');
    g.strokeStyle = '#5a3a8a'; g.lineWidth = r * .05; g.beginPath(); g.moveTo(-r * 1.1, r * 1.05); g.lineTo(-r * 1.2, -r * .9); g.arc(-r * 1, -r * .9, r * .2, Math.PI, 0); g.stroke(); },
};

// Цвет глаз и смещение глаз для каждого типа (видны в темноте)
const EYES = {
  ghoul: ['#ff3a2a', -.28, -.5, .12], bat: ['#ff5a3a', 0, -.1, .1], skeleton: ['#6ab8ff', 0, -.58, .14], drowned: ['#9affe0', 0, -.48, .13],
  shade: ['#c9a0ff', 0, -.4, .18], gargoyle: ['#ffb000', 0, -.48, .13], cultist: ['#ff2a6a', 0, -.46, .09], spider: ['#ff2a2a', 0, -.38, .08],
  spiderling: ['#ff2a2a', 0, -.38, .1], knight: ['#ff2a2a', 0, -.42, .08], eater: ['#b394ff', 0, -.35, .12], banshee: ['#e8f4ff', 0, -.3, .1],
  worm: ['#ffe070', 0, -.65, .1], wraith: ['#9affc0', 0, -.36, .1], chorister: ['#9adcff', 0, -.62, .09], stained: ['#ffd070', 0, -.42, .08],
  imp: ['#fff2a0', 0, -.25, .12], golem: ['#ff7a1a', 0, -.4, .1], voideye: ['#b394ff', 0, 0, 0], wisp: ['#fff', 0, 0, 0],
  rotmother: ['#e6ff5a', 0, -.35, .08], bishop: ['#ff3a3a', 0, -.22, .06], shepherd: ['#b060ff', 0, -.55, .07],
};

function buildEnemySprite(id, r) {
  const size = Math.ceil(r * 3.2), frames = [], white = [];
  for (let f = 0; f < 2; f++) { const c = mkCanvas(size), g = c.getContext('2d'); g.translate(size / 2, size / 2); PAINT[id](g, r, f); frames.push(c); white.push(whiteOf(c)); }
  Sprites.enemy[id] = { frames, white, size, r };
}

function buildPlayerSprite(id, col, trim) {
  const r = 16, size = 56, frames = [];
  for (let f = 0; f < 2; f++) {
    const c = mkCanvas(size), g = c.getContext('2d'); g.translate(size / 2, size / 2 + 4);
    shade(g, r); const b = f ? 1 : 0;
    // плащ
    poly(g, [-r * .75, r * .95, -r * .55, -r * .25, 0, -r * 1.25, r * .55, -r * .25, r * .75, r * .95], col);
    poly(g, [-r * .75, r * .95, -r * .55, -r * .25, -r * .2, -r * .2, -r * .3, r * .95], 'rgba(0,0,0,.25)');
    // капюшон
    ell(g, 0, -r * .7, r * .48, r * .5, col); ell(g, 0, -r * .6, r * .3, r * .32, '#0d0a08');
    g.fillStyle = trim; g.fillRect(-r * .55, r * .35, r * 1.1, r * .12);
    g.fillStyle = '#1a1512'; g.fillRect(-r * .35, r * .9, r * .25, r * (.25 + b * .08)); g.fillRect(r * .1, r * .9, r * .25, r * (.33 - b * .08));
    // рука с факелом
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * .5, 0); g.lineTo(r * .78, -r * .95); g.stroke();
    frames.push(c);
  }
  Sprites.player[id] = { frames, white: frames.map(whiteOf), size };
}

// Иконки 48×48 для оружия, предметов и улучшений
const ICON = {
  blade(g) { g.rotate(-.78); poly(g, [0, -20, 4, -14, 4, 10, -4, 10, -4, -14], '#e8e1cf', '#8a8177'); g.fillStyle = '#d4a94a'; g.fillRect(-10, 10, 20, 4); g.fillStyle = '#6b4a2b'; g.fillRect(-2.5, 14, 5, 8); },
  shovel(g) { g.rotate(.6); g.fillStyle = '#6b4a2b'; g.fillRect(-2, -20, 4, 24); poly(g, [-9, 4, 9, 4, 7, 18, 0, 22, -7, 18], '#9aa0a8', '#5a5f66'); },
  poison(g) { for (let i = 0; i < 4; i++) circ(g, [-8, 7, 0, -3][i], [4, 3, -6, 10][i], [9, 8, 10, 7][i], ['#5a8a2a', '#6aa834', '#7cc23c', '#4a7a22'][i]); circ(g, -4, -4, 3, '#c6f07a'); },
  hammer(g) { g.rotate(-.5); g.fillStyle = '#6b4a2b'; g.fillRect(-2, -4, 4, 24); poly(g, [-14, -16, 14, -16, 14, -2, -14, -2], '#d4a94a', '#8a6a2a', 1.5); circ(g, 0, -9, 3, '#fff6d0'); },
  daggers(g) { for (const a of [-.5, 0, .5]) { g.save(); g.rotate(a); poly(g, [0, -20, 3, -8, -3, -8], '#c9ced6'); g.fillStyle = '#5a3a2a'; g.fillRect(-2, -8, 4, 10); g.restore(); } },
  flask(g) { ell(g, 0, 6, 12, 12, '#8b2a1a'); ell(g, 0, 8, 9, 7, '#ff7a1a'); g.fillStyle = '#6b5a45'; g.fillRect(-4, -14, 8, 10); g.fillStyle = '#a07a4a'; g.fillRect(-5, -18, 10, 4); circ(g, -3, 4, 3, '#ffd27a'); },
  censer(g) { g.strokeStyle = '#8a7a4a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -22); g.lineTo(0, -8); g.stroke(); ell(g, 0, 2, 11, 10, '#c9a44a'); ell(g, 0, 0, 7, 3, '#5a4a20'); for (let i = 0; i < 3; i++) circ(g, -4 + i * 5, -12 - i * 3, 3, 'rgba(220,220,220,.5)'); },
  lightning(g) { poly(g, [4, -22, -8, 2, 0, 2, -5, 22, 10, -4, 2, -4], '#bfe4ff', '#6ab8ff', 1.5); },
  arrows(g) { for (const o of [-6, 6]) { g.save(); g.translate(o, 0); g.rotate(-.6); g.strokeStyle = '#9affd8'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -14); g.stroke(); poly(g, [0, -20, 4, -12, -4, -12], '#dafff0'); g.restore(); } },
  rune(g) { circ(g, 0, 0, 18, '#3a0a0a'); g.strokeStyle = '#ff3a3a'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.moveTo(0, -12); g.lineTo(-9, 9); g.lineTo(11, -4); g.lineTo(-11, -4); g.lineTo(9, 9); g.closePath(); g.stroke(); },
  ice(g) { g.rotate(-.78); poly(g, [0, -22, 6, -4, 3, 18, -3, 18, -6, -4], '#bfeaff', '#6ab8ff', 1.5); poly(g, [0, -22, 6, -4, 0, 0], 'rgba(255,255,255,.6)'); },
  black(g) { const gr = g.createRadialGradient(0, 4, 2, 0, 0, 20); gr.addColorStop(0, '#000'); gr.addColorStop(.6, '#3a1a60'); gr.addColorStop(1, 'rgba(123,79,214,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(14, -2, 10, 12); g.quadraticCurveTo(0, 22, -10, 12); g.quadraticCurveTo(-14, -2, 0, -20); g.fill(); },
  reliquary(g) { poly(g, [-12, 16, -12, -6, 0, -18, 12, -6, 12, 16], '#8a6a2a', '#d4a94a', 2); circ(g, 0, 2, 5, '#ff7a1a'); },
  relic(g) { g.strokeStyle = '#ffe08a'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.stroke(); circ(g, 0, 0, 5, '#fff6d0'); },
  chains(g) { g.strokeStyle = '#9aa0a8'; g.lineWidth = 3.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(-10 + i * 10, -8 + i * 8, 7, 4.5, .8, 0, TAU); g.stroke(); } },
  wormwood(g) { g.strokeStyle = '#5a8a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 20); g.lineTo(0, -18); g.stroke(); for (let i = 0; i < 5; i++) { ell(g, (i % 2 ? 7 : -7), 10 - i * 7, 6, 3, '#9ac87a', i % 2 ? -.5 : .5); } },
  glove(g) { poly(g, [-10, 18, -12, -2, -8, -14, -4, -4, -2, -18, 2, -4, 5, -16, 7, -3, 11, -10, 12, 4, 10, 18], '#7a4a2a', '#3a2010', 1.5); },
  lamp(g) { g.fillStyle = '#8a6a2a'; g.fillRect(-10, 8, 20, 6); ell(g, 0, 0, 10, 10, 'rgba(255,200,120,.35)'); g.strokeStyle = '#c9a44a'; g.lineWidth = 2; g.strokeRect(-9, -10, 18, 18); circ(g, 0, 0, 5, '#ffb14a'); g.fillRect(-3, -16, 6, 5); },
  beads(g) { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; circ(g, Math.cos(a) * 13, Math.sin(a) * 13, 3.5, '#8a3a2a'); } poly(g, [0, 12, 0, 22, -4, 18, 4, 18], '#d4a94a'); },
  stormstone(g) { poly(g, [0, -18, 14, -4, 8, 16, -8, 16, -14, -4], '#3a4a6a', '#6ab8ff', 2); poly(g, [2, -10, -4, 2, 2, 2, -2, 12, 6, -2, 0, -2], '#bfe4ff'); },
  feather(g) { g.rotate(-.6); ell(g, 0, 0, 7, 20, '#b9ab92'); g.strokeStyle = '#6b5a45'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 22); g.lineTo(0, -18); g.stroke(); },
  bloodvial(g) { g.fillStyle = '#6b5a45'; g.fillRect(-4, -18, 8, 6); poly(g, [-4, -12, 4, -12, 10, 6, 0, 18, -10, 6], '#8b1a1a', '#e8dcc4', 1.5); circ(g, -3, 4, 2, '#ff6a6a'); },
  frost(g) { g.strokeStyle = '#bfeaff'; g.lineWidth = 2.5; for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 18); g.moveTo(-5, -12); g.lineTo(0, -8); g.lineTo(5, -12); g.stroke(); g.restore(); } },
  boots(g) { poly(g, [-10, -16, 2, -16, 2, 6, 14, 10, 14, 18, -10, 18], '#5a3a22', '#2a1a10', 1.5); },
  cuirass(g) { poly(g, [-14, -14, -6, -18, 6, -18, 14, -14, 12, 8, 0, 18, -12, 8], '#8a9098', '#4a5058', 2); g.strokeStyle = '#4a5058'; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 18); g.stroke(); },
  phoenix(g) { const gr = g.createRadialGradient(0, 0, 2, 0, 0, 18); gr.addColorStop(0, '#fff6d0'); gr.addColorStop(.5, '#ff7a1a'); gr.addColorStop(1, '#8b1a1a'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-22, 0, -10, -18, 0, -6); g.bezierCurveTo(10, -18, 22, 0, 0, 16); g.fill(); },
  crown(g) { poly(g, [-16, 12, -16, -8, -8, 2, 0, -14, 8, 2, 16, -8, 16, 12], '#6a625a', '#b9ab92', 1.5); circ(g, 0, 4, 3, '#ff7a1a'); },
  abyssheart(g) { const gr = g.createRadialGradient(0, 0, 2, 0, 0, 18); gr.addColorStop(0, '#d0b0ff'); gr.addColorStop(.5, '#5a2a9a'); gr.addColorStop(1, '#10061a'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-22, 0, -12, -18, 0, -8); g.bezierCurveTo(12, -18, 22, 0, 0, 16); g.fill(); },
  // мета-улучшения и прочее
  might(g) { ICON.reliquary(g); }, armor(g) { ICON.cuirass(g); }, maxhp(g) { g.fillStyle = '#b3261e'; g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-22, 0, -12, -18, 0, -6); g.bezierCurveTo(12, -18, 22, 0, 0, 16); g.fill(); },
  regen(g) { ICON.maxhp(g); g.fillStyle = '#fff'; g.fillRect(-2, -4, 4, 12); g.fillRect(-6, 0, 12, 4); }, speed(g) { ICON.boots(g); }, area(g) { ICON.relic(g); }, duration(g) { ICON.wormwood(g); },
  cooldown(g) { ICON.glove(g); }, luck(g) { ICON.stormstone(g); }, magnet(g) { g.strokeStyle = '#b3261e'; g.lineWidth = 7; g.beginPath(); g.arc(0, -2, 11, Math.PI, 0); g.stroke(); g.fillStyle = '#ddd'; g.fillRect(-14.5, -2, 7, 8); g.fillRect(7.5, -2, 7, 8); },
  growth(g) { ICON.crown(g); }, greed(g) { for (let i = 0; i < 3; i++) circ(g, -8 + i * 8, 6 - (i % 2) * 8, 8, ['#6a625a', '#8a8077', '#5a524a'][i]); }, light(g) { ICON.lamp(g); },
  revival(g) { ICON.phoenix(g); }, reroll(g) { g.strokeStyle = '#d4a94a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 13, .3, TAU - .6); g.stroke(); poly(g, [13, -8, 16, 4, 6, 0], '#d4a94a'); },
  skip(g) { poly(g, [-14, -12, 0, 0, -14, 12], '#d4a94a'); poly(g, [0, -12, 14, 0, 0, 12], '#d4a94a'); }, banish(g) { g.strokeStyle = '#ff5a4a'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.moveTo(-10, -10); g.lineTo(10, 10); g.stroke(); },
  gold(g) { ICON.greed(g); }, chicken(g) { ell(g, -2, 2, 13, 10, '#b86a2a'); ell(g, -4, 0, 9, 6, '#d88a3a'); g.fillStyle = '#e8dcc4'; g.fillRect(8, -2, 10, 4); circ(g, 18, -2, 3, '#e8dcc4'); circ(g, 18, 2, 3, '#e8dcc4'); },
  locked(g) { g.fillStyle = '#5a4d3f'; g.fillRect(-10, -2, 20, 16); g.strokeStyle = '#5a4d3f'; g.lineWidth = 4; g.beginPath(); g.arc(0, -4, 7, Math.PI, 0); g.stroke(); },
};
function iconCanvas(id, size = 48) {
  const key = id + '@' + size; if (Sprites.icon[key]) return Sprites.icon[key];
  const c = mkCanvas(size), g = c.getContext('2d'); g.scale(size / 48, size / 48); g.translate(24, 24);
  (ICON[id] || ICON.locked)(g); Sprites.icon[key] = c; return c;
}

// Декор биомов
const DECOR = {
  grave(g, s, v) { poly(g, [-s * .35, s * .5, -s * .35, -s * .2, 0, -s * .5, s * .35, -s * .2, s * .35, s * .5], ['#4a4642', '#57524c', '#3e3a36'][v % 3], '#2a2724', 1.5);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(-s * .15, -s * .05); g.lineTo(s * .15, -s * .05); g.moveTo(0, -s * .25); g.lineTo(0, s * .2); g.stroke(); ell(g, 0, s * .52, s * .45, s * .1, 'rgba(0,0,0,.4)'); },
  cross(g, s) { g.fillStyle = '#3a3531'; g.fillRect(-s * .08, -s * .5, s * .16, s); g.fillRect(-s * .3, -s * .3, s * .6, s * .14); ell(g, 0, s * .5, s * .3, s * .08, 'rgba(0,0,0,.4)'); },
  tree(g, s, v) { g.strokeStyle = '#1e1a17'; g.lineCap = 'round'; const br = (x, y, a, l, w) => { if (l < s * .08) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - .5 - (v % 3) * .1, l * .68, w * .65); br(x2, y2, a + .45, l * .62, w * .65); };
    ell(g, 0, s * .5, s * .35, s * .08, 'rgba(0,0,0,.4)'); br(0, s * .5, -Math.PI / 2, s * .38, s * .1); },
  fence(g, s) { g.fillStyle = '#2a2622'; for (let i = -2; i <= 2; i++) { g.fillRect(i * s * .2 - 2, -s * .3, 4, s * .6); poly(g, [i * s * .2 - 4, -s * .3, i * s * .2, -s * .42, i * s * .2 + 4, -s * .3]); g.fill(); } g.fillRect(-s * .45, -s * .15, s * .9, 3); g.fillRect(-s * .45, s * .12, s * .9, 3); },
  pillar(g, s, v) { ell(g, 0, s * .5, s * .32, s * .1, 'rgba(0,0,0,.4)'); const h = v % 2 ? s : s * .55; const gr = g.createLinearGradient(-s * .2, 0, s * .2, 0); gr.addColorStop(0, '#4a5058'); gr.addColorStop(.5, '#6a727c'); gr.addColorStop(1, '#3a4048');
    g.fillStyle = gr; g.fillRect(-s * .2, s * .5 - h, s * .4, h); g.fillStyle = '#5a626c'; g.fillRect(-s * .27, s * .5 - h - s * .06, s * .54, s * .08); g.fillRect(-s * .27, s * .44, s * .54, s * .08); },
  glass(g, s, v) { const cols = ['#c83a3a', '#3a7ac8', '#e2b24a', '#3ac87a', '#9a4ac8']; for (let i = 0; i < 5; i++) { const a = i * 1.3 + v, d = s * .25 * ((i * 7 + v) % 3) / 2; poly(g, [Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * d + s * .12, Math.sin(a) * d + s * .03, Math.cos(a) * d + s * .04, Math.sin(a) * d + s * .12], cols[(i + v) % 5]); } },
  pew(g, s) { g.fillStyle = '#3a2a1e'; g.fillRect(-s * .45, -s * .1, s * .9, s * .18); g.fillRect(-s * .45, -s * .3, s * .9, s * .08); g.fillRect(-s * .42, -s * .3, s * .06, s * .4); g.fillRect(s * .36, -s * .3, s * .06, s * .4); },
  rock(g, s, v) { ell(g, 0, s * .3, s * .45, s * .12, 'rgba(0,0,0,.4)'); poly(g, [-s * .4, s * .3, -s * .35, -s * .1, -s * .1, -s * .35, s * .25, -s * .25 - (v % 3) * 3, s * .42, s * .1, s * .3, s * .32], '#3a3230', '#221c1a', 1.5); },
  lava(g, s, v) { g.strokeStyle = '#ff5a14'; g.lineWidth = 3; g.shadowColor = '#ff7a1a'; g.shadowBlur = 8; g.beginPath(); g.moveTo(-s * .45, 0); for (let i = 1; i <= 5; i++) g.lineTo(-s * .45 + i * s * .18, ((i + v) % 2 ? -1 : 1) * s * .12); g.stroke(); g.shadowBlur = 0; },
  bones(g, s) { g.strokeStyle = '#cfc6b0'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-s * .3, -s * .1); g.lineTo(s * .2, s * .15); g.moveTo(-s * .1, s * .2); g.lineTo(s * .3, -s * .15); g.stroke(); circ(g, -s * .3, s * .05, s * .12, '#dcd4c0'); },
  obelisk(g, s) { ell(g, 0, s * .5, s * .3, s * .08, 'rgba(0,0,0,.4)'); poly(g, [-s * .18, s * .5, -s * .12, -s * .4, 0, -s * .55, s * .12, -s * .4, s * .18, s * .5], '#221c24', '#3a2e3e', 1.5); g.fillStyle = '#ff7a1a'; g.fillRect(-2, -s * .2, 4, s * .3); },
  shard(g, s, v) { poly(g, [0, -s * .45, s * .18, 0, 0, s * .35, -s * .18, 0], ['#5a3a9a', '#3a2a6a', '#7b4fd6'][v % 3], '#b394ff', 1); },
  crystal(g, s, v) { for (let i = -1; i <= 1; i++) poly(g, [i * s * .15 - s * .07, s * .3, i * s * .15, -s * (.3 + (i + v + 3) % 3 * .1), i * s * .15 + s * .07, s * .3], ['#6a4ab0', '#8a6ad0', '#4a2a8a'][i + 1]); },
  runestone(g, s) { poly(g, [-s * .25, s * .45, -s * .3, -s * .2, 0, -s * .45, s * .3, -s * .2, s * .25, s * .45], '#2a2430', '#4a3a5a', 1.5); g.strokeStyle = '#b394ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -s * .25); g.lineTo(-s * .1, s * .1); g.lineTo(s * .1, 0); g.lineTo(0, s * .3); g.stroke(); },
  voidpool(g, s) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * .5); gr.addColorStop(0, '#000'); gr.addColorStop(.7, '#1a0a30'); gr.addColorStop(1, 'rgba(60,20,100,0)'); ell(g, 0, 0, s * .5, s * .3, gr); },
  grass(g, s, v) { g.strokeStyle = ['#2a3322', '#33302a', '#252a22'][v % 3]; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 3 - 8, s * .2); g.lineTo(i * 3 - 8 + (i % 2 ? 3 : -3), -s * .1 - (i % 3) * 3); g.stroke(); } },
  puddle(g, s) { ell(g, 0, 0, s * .45, s * .22, 'rgba(90,130,150,.25)'); g.strokeStyle = 'rgba(180,220,240,.18)'; g.beginPath(); g.ellipse(0, 0, s * .3, s * .14, 0, 0, TAU); g.stroke(); },
  ashpile(g, s) { ell(g, 0, 0, s * .45, s * .2, 'rgba(120,110,100,.35)'); ell(g, -s * .1, -s * .05, s * .25, s * .1, 'rgba(150,140,130,.3)'); },
};
const BIOME_DECOR = {
  cemetery: [['grave', 6, 44], ['cross', 3, 40], ['tree', 2, 110], ['fence', 1, 70], ['grass', 5, 26]],
  cathedral: [['pillar', 3, 90], ['glass', 4, 50], ['pew', 2, 70], ['puddle', 4, 70], ['grave', 1, 40]],
  wastes: [['rock', 4, 50], ['lava', 3, 80], ['bones', 3, 40], ['obelisk', 1, 90], ['ashpile', 4, 60]],
  abyss: [['shard', 4, 46], ['crystal', 3, 50], ['runestone', 2, 60], ['voidpool', 2, 90], ['shard', 2, 30]],
};

function buildGround(biome) {
  const S = 256, c = mkCanvas(S), g = c.getContext('2d');
  const base = { cemetery: '#161a14', cathedral: '#10161a', wastes: '#1a1210', abyss: '#110c18' }[biome];
  const spk = { cemetery: ['#1d2219', '#12160f', '#20241b'], cathedral: ['#141c21', '#0c1216', '#18222a'], wastes: ['#22170f', '#140d0a', '#2a1a10'], abyss: ['#171022', '#0c0812', '#1d142c'] }[biome];
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const rng = mulberry32(biome.length * 999);
  for (let i = 0; i < 900; i++) { g.fillStyle = spk[i % 3]; const x = rng() * S, y = rng() * S, r = rng() * 5 + 1; g.fillRect(x, y, r, r * (.5 + rng())); }
  if (biome === 'cathedral') { g.strokeStyle = 'rgba(80,110,130,.12)'; g.lineWidth = 2; for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } }
  if (biome === 'wastes') { g.strokeStyle = 'rgba(255,90,20,.08)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); let x = rng() * S, y = rng() * S; g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += rng() * 40 - 20; y += rng() * 40 - 20; g.lineTo(x, y); } g.stroke(); } }
  if (biome === 'abyss') { for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(123,79,214,${rng() * .08})`; g.beginPath(); g.arc(rng() * S, rng() * S, rng() * 18 + 4, 0, TAU); g.fill(); } }
  Sprites.ground[biome] = c;
}

function buildDecor() {
  for (const b in BIOME_DECOR) for (const [id, , size] of BIOME_DECOR[b]) for (let v = 0; v < 3; v++) {
    const key = id + v; if (Sprites.decor[key]) continue;
    const s = size, c = mkCanvas(s * 1.4, s * 1.4), g = c.getContext('2d'); g.translate(s * .7, s * .7); DECOR[id](g, s, v); Sprites.decor[key] = c;
  }
  // лампа
  for (const broken of [0, 1]) { const c = mkCanvas(40, 56), g = c.getContext('2d'); g.translate(20, 30);
    ell(g, 0, 22, 12, 4, 'rgba(0,0,0,.4)'); g.fillStyle = '#3a3531'; g.fillRect(-3, 0, 6, 22); g.fillStyle = '#5a4a30'; g.fillRect(-8, -4, 16, 5);
    if (!broken) { ell(g, 0, -12, 9, 10, 'rgba(255,190,90,.5)'); g.strokeStyle = '#c9a44a'; g.lineWidth = 2; g.strokeRect(-8, -22, 16, 18); circ(g, 0, -13, 4, '#fff0c0'); }
    else { g.strokeStyle = '#6a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -4); g.lineTo(-6, -14); g.moveTo(8, -4); g.lineTo(5, -10); g.stroke(); }
    Sprites.misc[broken ? 'lampBroken' : 'lamp'] = c; }
  // сундук
  { const c = mkCanvas(48, 44), g = c.getContext('2d'); g.translate(24, 24); ell(g, 0, 16, 18, 5, 'rgba(0,0,0,.45)');
    g.fillStyle = '#5a3a1e'; g.fillRect(-17, -4, 34, 20); poly(g, [-17, -4, -15, -14, 15, -14, 17, -4], '#6e4a26'); g.fillStyle = '#d4a94a'; g.fillRect(-17, -5, 34, 3); g.fillRect(-3, -8, 6, 10); g.fillRect(-17, 12, 34, 3); Sprites.misc.chest = c; }
  // курица, магнит
  Sprites.misc.chicken = iconCanvas('chicken', 32); Sprites.misc.magnet = iconCanvas('magnet', 32);
  // пепел (выпадает редко)
  { const c = mkCanvas(20), g = c.getContext('2d'); g.translate(10, 10); circ(g, 0, 0, 7, '#6a625a'); circ(g, -2, -2, 3, '#9a9088'); Sprites.misc.ash = c; }
}

function buildEmbers() {
  const cols = [['#6ab8ff', '#1a4a8a'], ['#6ae07a', '#1a6a2a'], ['#ff5a4a', '#8a1a1a'], ['#c08aff', '#4a1a8a']];
  const cbCols = [['#ffffff', '#555'], ['#ffd400', '#7a6400'], ['#00c8ff', '#005a7a'], ['#ff00c8', '#6a0056']];
  const shapes = [(g, s) => { circ(g, 0, 0, s * .5); }, (g, s) => { poly(g, [0, -s * .6, s * .55, s * .45, -s * .55, s * .45]); }, (g, s) => { g.beginPath(); g.rect(-s * .45, -s * .45, s * .9, s * .9); }, (g, s) => { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? s * .3 : s * .65; p.push(Math.cos(a) * r, Math.sin(a) * r); } poly(g, p); }];
  for (let t = 0; t < 4; t++) {
    const s = 8 + t * 3, size = s * 3;
    for (const cb of [0, 1]) {
      const c = mkCanvas(size), g = c.getContext('2d'), [a, b] = (cb ? cbCols : cols)[t];
      g.drawImage(radial(size, [[0, a + '88'], [1, a + '00']]), 0, 0); g.translate(size / 2, size / 2);
      if (cb) { shapes[t](g, s); g.fillStyle = a; g.fill(); g.strokeStyle = b; g.lineWidth = 2; g.stroke(); }
      else { poly(g, [0, -s * .6, s * .4, 0, 0, s * .6, -s * .4, 0], a, b, 1.5); poly(g, [0, -s * .6, s * .4, 0, 0, 0], 'rgba(255,255,255,.5)'); }
      (cb ? Sprites.emberCb : Sprites.ember)[t] = c;
    }
  }
}

function buildAllSprites() {
  Sprites.light = radial(256, [[0, 'rgba(255,255,255,1)'], [.45, 'rgba(255,255,255,.85)'], [.75, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
  const glowCols = { fire: '255,140,40', gold: '255,210,110', violet: '150,100,255', ice: '140,210,255', red: '255,60,50', green: '140,230,90', white: '255,255,255', blood: '200,20,30' };
  for (const k in glowCols) Sprites.glow[k] = radial(128, [[0, `rgba(${glowCols[k]},.9)`], [.35, `rgba(${glowCols[k]},.35)`], [1, `rgba(${glowCols[k]},0)`]]);
  Sprites.misc.dark = radial(128, [[0, 'rgba(0,0,0,.85)'], [1, 'rgba(0,0,0,0)']]);
  // штриховка для опасных зон (не только цвет — доступность)
  { const c = mkCanvas(16), g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-4, 20); g.lineTo(20, -4); g.moveTo(-4, 4); g.lineTo(4, -4); g.moveTo(12, 20); g.lineTo(20, 12); g.stroke(); Sprites.misc.hatch = c; }
  buildEmbers(); buildDecor();
  for (const b of ['cemetery', 'cathedral', 'wastes', 'abyss']) buildGround(b);
}
