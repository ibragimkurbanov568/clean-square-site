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
const Sprites = { enemy: {}, player: {}, icon: {}, decor: {}, ground: {}, fog: {}, ember: [], emberCb: [], glow: {}, light: null, misc: {} };
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h || w); return c; }
function whiteOf(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return c; }
function radial(size, stops) { const c = mkCanvas(size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
function circ(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } }
function ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } }
function poly(g, pts, fill, stroke, lw = 1) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function shade(g, r, col = 'rgba(0,0,0,.35)') { ell(g, 0, r * 0.85, r * 0.8, r * 0.25, col); }

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

function buildDecor() {
  for (const b in BIOME_DECOR) for (const [id, , size] of BIOME_DECOR[b]) for (let v = 0; v < 3; v++) {
    const key = id + v; if (Sprites.decor[key]) continue;
    const s = size, c = mkCanvas(s * 1.4 * SS, s * 1.4 * SS), g = c.getContext('2d'); g.scale(SS, SS); g.translate(s * .7, s * .7); DECOR[id](g, s, v); Sprites.decor[key] = c;
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
  for (const b of BIOMES) { buildGround(b.id); buildFog(b.id); }
  Sprites.misc.shadow = radial(64, [[0, 'rgba(0,0,0,.55)'], [.6, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]);
}
