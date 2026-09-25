// ==== 7b. ART: объёмные процедурные фигуры ====
// Свет падает сверху-слева. Каждая фигура: объёмная заливка, обводка, 4 кадра анимации, двойное разрешение.
let SS = 2; // суперсэмплинг спрайтов: подбирается под масштаб экрана при загрузке
const FRAMES = 4;
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function tone(h, k) { const [r, g, b] = hexRgb(h), f = v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
// объёмный эллипс
function vol(g, x, y, rx, ry, col, rot = 0, hi = .38, lo = -.6) {
  const m = Math.max(rx, ry), gr = g.createRadialGradient(x - rx * .38, y - ry * .42, m * .08, x, y, m * 1.08);
  gr.addColorStop(0, tone(col, hi)); gr.addColorStop(.5, col); gr.addColorStop(1, tone(col, lo));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
}
// объёмная заливка произвольного контура
function volFill(g, cx, cy, R, col, hi = .3, lo = -.6) {
  const gr = g.createRadialGradient(cx - R * .4, cy - R * .45, R * .05, cx, cy, R * 1.15);
  gr.addColorStop(0, tone(col, hi)); gr.addColorStop(.55, col); gr.addColorStop(1, tone(col, lo)); g.fillStyle = gr; g.fill();
}
// сужающийся сегмент конечности с поперечным затенением
function limb(g, x1, y1, x2, y2, w1, w2, col) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  const gr = g.createLinearGradient(x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1);
  gr.addColorStop(0, tone(col, -.45)); gr.addColorStop(.4, col); gr.addColorStop(.75, tone(col, .25)); gr.addColorStop(1, tone(col, -.2));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x2 + nx * w2, y2 + ny * w2); g.lineTo(x2 - nx * w2, y2 - ny * w2); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.closePath(); g.fill();
  g.beginPath(); g.arc(x1, y1, w1, 0, TAU); g.arc(x2, y2, w2, 0, TAU); g.fill();
}
// двухсуставная конечность: плечо/бедро → локоть/колено → кисть/стопа
function limb2(g, x1, y1, x2, y2, x3, y3, w1, w2, w3, col) { limb(g, x1, y1, x2, y2, w1, w2, col); limb(g, x2, y2, x3, y3, w2, w3, col); }
function rim(g, x, y, rx, ry, a0 = 3.4, a1 = 4.9, col = 'rgba(255,230,190,.35)', w = 1.2) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a1); g.stroke(); }
function glowDot(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, col); gr.addColorStop(1, rgba(col.length === 7 ? col : '#ffffff', 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, TAU); g.fill(); }
function outlined(src, w = 1.6 * SS, col = 'rgba(6,4,4,.92)') {
  const c = mkCanvas(src.width, src.height), g = c.getContext('2d'), sil = mkCanvas(src.width, src.height), sg = sil.getContext('2d');
  sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, sil.width, sil.height);
  const d = w * .7; for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [-d, -d], [d, -d], [-d, d], [d, d]]) g.drawImage(sil, dx, dy);
  g.drawImage(src, 0, 0); return c;
}

// ---------- гуманоид ----------
// o: skin, cloth, cloth2, pants, head, hunch, bulk, robe, arms, weapon, float
function humanoid(g, r, f, o) {
  const ph = f / FRAMES * TAU, sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph)), bob = o.float ? Math.sin(ph) * r * .06 : -Math.abs(sw) * r * .04;
  const hunch = o.hunch || 0, bulk = o.bulk || 1, skin = o.skin || '#8a7a68', cloth = o.cloth || '#4a3a2a', pants = o.pants || tone(cloth, -.3);
  g.save(); g.translate(0, bob);
  const hipY = r * .3, shY = -r * .32 + hunch * r * .18, shX = hunch * r * .2, headX = shX + hunch * r * .22 + r * .04, headY = -r * .66 + hunch * r * .28;
  const armCol = o.sleeve || (o.bare ? skin : cloth);
  // дальняя рука
  if (o.arms !== 'none') { const hx = shX - r * .1 - sw * r * .22, hy = shY + r * .55; limb2(g, shX - r * .18 * bulk, shY + r * .05, shX - r * .22 - sw * r * .15, shY + r * .32, hx, hy, r * .1 * bulk, r * .085 * bulk, r * .075, tone(armCol, -.25)); }
  // дальняя нога
  if (!o.robe && !o.float) limb2(g, -r * .1, hipY, -r * .12 - sw * r * .15, r * .62, -r * .1 - sw * r * .3, r * .95 - lift * r * .08, r * .13 * bulk, r * .1, r * .085, tone(pants, -.3));
  // торс / роба
  if (o.robe || o.float) {
    const hem = r * (o.float ? 1.05 : .98), wv = Math.sin(ph * 2) * r * .05;
    g.beginPath(); g.moveTo(shX - r * .4 * bulk, shY); g.quadraticCurveTo(shX - r * .55 * bulk, r * .3, -r * .62 * bulk + wv, hem);
    for (let i = 0; i <= 6; i++) { const x = -r * .62 * bulk + i * r * 1.24 * bulk / 6 + wv; g.lineTo(x, hem - ((i + f) % 2) * r * (o.float ? .22 : .06)); }
    g.quadraticCurveTo(shX + r * .55 * bulk, r * .3, shX + r * .4 * bulk, shY); g.closePath();
    if (o.float) { const gr = g.createLinearGradient(0, shY, 0, hem); gr.addColorStop(0, cloth); gr.addColorStop(.7, rgba(cloth, .7)); gr.addColorStop(1, rgba(cloth, 0)); g.fillStyle = gr; g.fill(); }
    else volFill(g, shX, r * .2, r * .9 * bulk, cloth);
    g.strokeStyle = tone(cloth, -.45); g.lineWidth = r * .04; for (const fx of [-.22, .08, .3]) { g.beginPath(); g.moveTo(shX + fx * r, shY + r * .25); g.quadraticCurveTo(fx * r * 1.4 + wv, r * .5, fx * r * 1.6 + wv, hem - r * .05); g.stroke(); }
    if (o.cloth2) { g.fillStyle = o.cloth2; g.fillRect(shX - r * .42 * bulk, r * .05, r * .84 * bulk, r * .1); }
  } else {
    g.beginPath(); g.moveTo(shX - r * .42 * bulk, shY); g.quadraticCurveTo(shX - r * .5 * bulk, hipY * .5, -r * .3 * bulk, hipY + r * .08);
    g.lineTo(r * .3 * bulk, hipY + r * .08); g.quadraticCurveTo(shX + r * .5 * bulk, hipY * .5, shX + r * .42 * bulk, shY); g.quadraticCurveTo(shX, shY - r * .12, shX - r * .42 * bulk, shY); g.closePath();
    volFill(g, shX, r * .05, r * .6 * bulk, o.bare ? skin : cloth);
    if (o.ribs) { g.strokeStyle = tone(skin, -.4); g.lineWidth = r * .035; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(shX, shY + r * (.18 + i * .12), r * .25, .3, Math.PI - .3); g.stroke(); } }
    if (o.cloth2) { g.fillStyle = o.cloth2; g.fillRect(-r * .32 * bulk, hipY - r * .05, r * .64 * bulk, r * .1); }
  }
  // ближняя нога
  if (!o.robe && !o.float) limb2(g, r * .1, hipY, r * .12 + sw * r * .15, r * .62, r * .12 + sw * r * .3, r * .95 - (1 - lift) * r * .06, r * .14 * bulk, r * .11, r * .09, pants);
  // голова
  const hr = r * .27 * (o.headSize || 1);
  (HEADS[o.head || 'bald'])(g, headX, headY, hr, o, f);
  // ближняя рука + оружие
  if (o.arms !== 'none') {
    const ex = shX + r * .28 + sw * r * .1, ey = shY + r * .3, hx = shX + r * .42 + sw * r * .18, hy = shY + (o.arms === 'raise' ? -r * .05 : r * .5);
    limb2(g, shX + r * .2 * bulk, shY + r * .05, ex, ey, hx, hy, r * .11 * bulk, r * .09 * bulk, r * .08, armCol);
    if (o.bare || o.claws) { g.strokeStyle = tone(skin, -.5); g.lineWidth = r * .03; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + r * .12, hy + r * .06 + i * r * .05); g.stroke(); } }
    else vol(g, hx, hy, r * .075, r * .075, skin);
    if (o.weapon) o.weapon(g, hx, hy, r, f);
  }
  g.restore();
}

const HEADS = {
  bald(g, x, y, hr, o) { vol(g, x, y, hr, hr * 1.08, o.skin); g.fillStyle = tone(o.skin, -.55); ell(g, x + hr * .35, y - hr * .05, hr * .2, hr * .14); g.fill(); ell(g, x - hr * .12, y - hr * .05, hr * .17, hr * .12); g.fill();
    g.strokeStyle = tone(o.skin, -.5); g.lineWidth = hr * .08; g.beginPath(); g.moveTo(x + hr * .05, y + hr * .5); g.lineTo(x + hr * .5, y + hr * .45); g.stroke(); rim(g, x, y, hr, hr * 1.08); },
  skull(g, x, y, hr) { vol(g, x, y - hr * .1, hr, hr * .95, '#e2dac6'); vol(g, x + hr * .15, y + hr * .55, hr * .6, hr * .35, '#cfc5ad');
    g.fillStyle = '#1a1210'; ell(g, x + hr * .4, y - hr * .05, hr * .25, hr * .22); g.fill(); ell(g, x - hr * .12, y - hr * .05, hr * .22, hr * .2); g.fill(); poly(g, [x + hr * .12, y + hr * .2, x + hr * .22, y + hr * .38, x + hr * .02, y + hr * .38], '#2a1e18');
    g.strokeStyle = '#6a5e4e'; g.lineWidth = hr * .06; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - hr * .15 + i * hr * .18, y + hr * .45); g.lineTo(x - hr * .15 + i * hr * .18, y + hr * .7); g.stroke(); } },
  hood(g, x, y, hr, o) { const c = o.hoodCol || o.cloth; g.beginPath(); g.moveTo(x - hr * 1.1, y + hr * 1.1); g.quadraticCurveTo(x - hr * 1.25, y - hr * .8, x + hr * .1, y - hr * 1.35); g.quadraticCurveTo(x + hr * 1.3, y - hr * .7, x + hr * 1.05, y + hr * 1.1); g.closePath(); volFill(g, x, y, hr * 1.3, c);
    const gr = g.createRadialGradient(x + hr * .25, y + hr * .1, 0, x + hr * .25, y + hr * .1, hr * .8); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#0a0706'); g.fillStyle = gr; ell(g, x + hr * .25, y + hr * .15, hr * .62, hr * .72); g.fill();
    if (o.face) { g.fillStyle = o.face; ell(g, x + hr * .32, y + hr * .3, hr * .38, hr * .42); g.fill(); } rim(g, x, y - hr * .2, hr * 1.1, hr * 1.1, 3.5, 4.8); },
  helm(g, x, y, hr, o) { const c = o.metal || '#7a808a'; g.beginPath(); g.moveTo(x - hr, y + hr * .8); g.lineTo(x - hr * 1.05, y - hr * .3); g.quadraticCurveTo(x, y - hr * 1.5, x + hr * 1.05, y - hr * .3); g.lineTo(x + hr * 1.05, y + hr * .8); g.closePath(); volFill(g, x, y, hr * 1.2, c, .5, -.65);
    g.fillStyle = '#050505'; g.fillRect(x - hr * .3, y - hr * .05, hr * 1.35, hr * .16); g.fillRect(x + hr * .4, y - hr * .05, hr * .14, hr * .6);
    if (o.plume) { g.fillStyle = o.plume; g.beginPath(); g.moveTo(x - hr * .1, y - hr * 1.05); g.quadraticCurveTo(x - hr * 1.6, y - hr * 1.8, x - hr * 1.9, y - hr * .2); g.quadraticCurveTo(x - hr * .9, y - hr * 1, x - hr * .1, y - hr * .8); g.fill(); } },
  mask(g, x, y, hr, o) { HEADS.hood(g, x, y, hr, o); vol(g, x + hr * .3, y + hr * .2, hr * .45, hr * .55, o.maskCol || '#c9a44a', 0, .5); g.fillStyle = '#100808'; ell(g, x + hr * .45, y + hr * .1, hr * .1, hr * .06); g.fill(); ell(g, x + hr * .12, y + hr * .1, hr * .1, hr * .06); g.fill(); },
  beak(g, x, y, hr, o) { vol(g, x, y, hr, hr, '#2a2622'); g.beginPath(); g.moveTo(x + hr * .5, y - hr * .1); g.quadraticCurveTo(x + hr * 2.1, y + hr * .3, x + hr * 2.2, y + hr * 1); g.quadraticCurveTo(x + hr * 1.2, y + hr * .6, x + hr * .4, y + hr * .5); g.closePath(); volFill(g, x + hr, y + hr * .4, hr, '#d8cdb4');
    vol(g, x + hr * .45, y - hr * .05, hr * .2, hr * .2, '#9affc0', 0, .6); // стекло
    g.fillStyle = '#1a1614'; ell(g, x, y - hr * .75, hr * 1.7, hr * .28); g.fill(); g.beginPath(); g.moveTo(x - hr * .8, y - hr * .7); g.lineTo(x - hr * .6, y - hr * 1.6); g.lineTo(x + hr * .8, y - hr * 1.6); g.lineTo(x + hr * .9, y - hr * .7); g.fill(); },
  hair(g, x, y, hr, o, f) { vol(g, x, y, hr * .9, hr, o.skin); g.strokeStyle = o.hairCol || '#e8eef2'; g.lineWidth = hr * .16; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const a = -2.6 + i * .32; g.beginPath(); g.moveTo(x + Math.cos(a) * hr * .8, y + Math.sin(a) * hr * .9); g.quadraticCurveTo(x - hr * 1.2, y + hr * (.4 + i * .1), x - hr * (1.5 + i * .1) + Math.sin(f + i) * hr * .3, y + hr * (1.6 + i * .25)); g.stroke(); }
    g.fillStyle = '#0a0a10'; ell(g, x + hr * .4, y - hr * .05, hr * .14, hr * .18); g.fill(); ell(g, x + hr * .35, y + hr * .45, hr * .16, hr * .28); g.fill(); },
  none() {},
};
// оружие в руке
const HELD = {
  sword(g, x, y, r) { g.save(); g.translate(x, y); g.rotate(-.9); const gr = g.createLinearGradient(-r * .06, 0, r * .06, 0); gr.addColorStop(0, '#6a6e76'); gr.addColorStop(.5, '#e8ecf0'); gr.addColorStop(1, '#5a5e66');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-r * .06, 0); g.lineTo(-r * .05, -r * .95); g.lineTo(0, -r * 1.08); g.lineTo(r * .05, -r * .95); g.lineTo(r * .06, 0); g.fill(); g.fillStyle = '#8a6a2a'; g.fillRect(-r * .2, -r * .02, r * .4, r * .07); g.fillStyle = '#3a2a1a'; g.fillRect(-r * .04, 0, r * .08, r * .2); g.restore(); },
  greatsword(g, x, y, r) { g.save(); g.translate(x, y); g.rotate(-.5); g.scale(1.5, 1.5); HELD.sword(g, 0, 0, r); g.restore(); },
  orb(g, x, y, r) { glowDot(g, x + r * .05, y - r * .12, r * .1, '#d05bff'); },
  staff(g, x, y, r, f, top = '#9fd4ff') { g.strokeStyle = '#4a3420'; g.lineWidth = r * .07; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + r * .45); g.lineTo(x + r * .1, y - r * .9); g.stroke(); glowDot(g, x + r * .1, y - r * .95, r * .09, top); },
  book(g, x, y, r) { g.save(); g.translate(x + r * .05, y - r * .05); g.rotate(-.3); vol(g, 0, 0, r * .18, r * .13, '#4a2a1a'); g.fillStyle = '#e8dcc4'; g.fillRect(-r * .15, -r * .09, r * .3, r * .1); g.restore(); },
  lantern(g, x, y, r) { g.strokeStyle = '#3a3a3a'; g.lineWidth = r * .03; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + r * .18); g.stroke(); vol(g, x, y + r * .3, r * .1, r * .14, '#3a3a2a'); glowDot(g, x, y + r * .3, r * .06, '#8aff6a'); },
  scythe(g, x, y, r) { g.strokeStyle = '#3a2a1a'; g.lineWidth = r * .07; g.beginPath(); g.moveTo(x - r * .1, y + r * .5); g.lineTo(x + r * .15, y - r * 1); g.stroke(); g.fillStyle = '#b8c0c8'; g.beginPath(); g.moveTo(x + r * .15, y - r * 1); g.quadraticCurveTo(x - r * .6, y - r * 1.2, x - r * .8, y - r * .6); g.quadraticCurveTo(x - r * .5, y - r * .95, x + r * .12, y - r * .88); g.fill(); },
};

// ---------- четвероногие ----------
function quadruped(g, r, f, o) {
  const ph = f / FRAMES * TAU, s = Math.sin(ph), c = Math.cos(ph), col = o.col, dk = tone(col, -.35);
  const legs = [[-r * .5, s], [-r * .35, -s], [r * .35, -s], [r * .5, s]];
  for (let i = 0; i < 4; i++) { const [lx, p] = legs[i], near = i % 2; limb2(g, lx, r * .1, lx + p * r * .2, r * .5, lx + p * r * .35, r * .9 - Math.max(0, -p) * r * .1, r * .13, r * .09, r * .07, near ? col : dk); }
  // хвост
  g.strokeStyle = dk; g.lineWidth = r * .12; g.lineCap = 'round'; g.beginPath(); g.moveTo(-r * .75, -r * .05); g.quadraticCurveTo(-r * 1.1, -r * .3 + c * r * .15, -r * 1.2, r * .05 + c * r * .2); g.stroke();
  vol(g, 0, -r * .02 + c * r * .03, r * .82, r * .42, col);
  if (o.fur) { g.strokeStyle = tone(col, .35); g.lineWidth = r * .03; for (let i = 0; i < 9; i++) { const x = -r * .6 + i * r * .15; g.beginPath(); g.moveTo(x, -r * .35); g.lineTo(x - r * .08, -r * .48 - (i % 2) * r * .06); g.stroke(); } }
  // голова
  const hx = r * .85, hy = -r * .3 + c * r * .04;
  vol(g, hx, hy, r * .32, r * .28, col); g.beginPath(); g.moveTo(hx + r * .15, hy - r * .1); g.lineTo(hx + r * .72, hy + r * .06); g.lineTo(hx + r * .6, hy + r * .2); g.lineTo(hx + r * .1, hy + r * .2); g.closePath(); volFill(g, hx + r * .4, hy + r * .05, r * .35, tone(col, .1));
  poly(g, [hx - r * .1, hy - r * .2, hx - r * .02, hy - r * .55, hx + r * .12, hy - r * .22], dk); // ухо
  g.fillStyle = '#e8e0d0'; for (let i = 0; i < 3; i++) poly(g, [hx + r * (.3 + i * .12), hy + r * .18, hx + r * (.35 + i * .12), hy + r * .3, hx + r * (.4 + i * .12), hy + r * .18], '#e8e0d0');
}

// ---------- все художники ----------
const PAINT = {
  ghoul(g, r, f) { humanoid(g, r, f, { skin: '#6f7a62', bare: true, claws: true, hunch: .9, pants: '#3a3428', cloth2: '#3a3428', ribs: true, head: 'bald' }); },
  skeleton(g, r, f) {
    const ph = f / FRAMES * TAU, sw = Math.sin(ph), bone = '#ddd4bf', dk = '#a89e86';
    limb2(g, -r * .1, r * .28, -r * .1 - sw * r * .14, r * .62, -r * .1 - sw * r * .28, r * .95, r * .06, r * .05, r * .05, dk);
    limb2(g, -r * .2, -r * .28, -r * .28 - sw * r * .12, r * .02, -r * .22 - sw * r * .2, r * .3, r * .055, r * .05, r * .045, dk);
    g.strokeStyle = bone; g.lineWidth = r * .09; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -r * .4); g.lineTo(0, r * .25); g.stroke();
    for (let i = 0; i < 4; i++) { g.strokeStyle = i % 2 ? dk : bone; g.lineWidth = r * .06; g.beginPath(); g.ellipse(0, -r * .22 + i * r * .11, r * .3 - i * r * .03, r * .07, 0, Math.PI * .05, Math.PI * .95); g.stroke(); }
    vol(g, 0, r * .28, r * .24, r * .1, bone);
    limb2(g, r * .1, r * .28, r * .1 + sw * r * .14, r * .62, r * .12 + sw * r * .28, r * .95, r * .065, r * .055, r * .05, bone);
    HEADS.skull(g, r * .05, -r * .62, r * .3);
    limb2(g, r * .22, -r * .3, r * .32 + sw * r * .1, -r * .02, r * .42, r * .2, r * .06, r * .05, r * .05, bone);
    HELD.sword(g, r * .42, r * .2, r * .9);
    // ржавый щит
    vol(g, -r * .38, r * .02, r * .26, r * .3, '#5a4630'); g.strokeStyle = '#8a6a3a'; g.lineWidth = r * .05; g.beginPath(); g.ellipse(-r * .38, r * .02, r * .26, r * .3, 0, 0, TAU); g.stroke(); vol(g, -r * .38, r * .02, r * .06, r * .06, '#9a8a6a');
  },
  drowned(g, r, f) {
    humanoid(g, r, f, { skin: '#5d7e8a', bare: true, claws: true, hunch: .35, bulk: 1.3, pants: '#2e3f44', cloth2: '#2e3f44', head: 'bald', headSize: 1.1 });
    g.strokeStyle = 'rgba(60,110,70,.85)'; g.lineWidth = r * .05; for (let i = 0; i < 5; i++) { const x = -r * .3 + i * r * .15; g.beginPath(); g.moveTo(x, -r * .35); g.quadraticCurveTo(x + r * .1, r * .1, x - r * .05 + Math.sin(f + i) * r * .05, r * .45); g.stroke(); }
    g.fillStyle = 'rgba(180,230,240,.5)'; for (let i = 0; i < 3; i++) circ(g, -r * .2 + i * r * .2, r * .6 + ((f + i) % 4) * r * .08, r * .03);
  },
  shade(g, r, f) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + f * .4, d = r * .35; const gr = g.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d * .7, 0, Math.cos(a) * d, Math.sin(a) * d * .7, r * .8); gr.addColorStop(0, 'rgba(8,4,16,.9)'); gr.addColorStop(1, 'rgba(8,4,16,0)'); g.fillStyle = gr; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d * .7, r * .8, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(40,20,70,.6)'; g.lineWidth = r * .08; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-r * .3 + i * r * .2, r * .3); g.quadraticCurveTo(-r * .4 + i * r * .25 + Math.sin(f * 1.5 + i) * r * .2, r * .8, -r * .3 + i * r * .2, r * 1.1); g.stroke(); }
    const gr = g.createRadialGradient(0, -r * .1, 0, 0, -r * .1, r * .7); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, -r * .1, r * .7, 0, TAU); g.fill();
  },
  bat(g, r, f) {
    const flap = [-.9, -.2, .5, -.2][f], fur = '#3a2e34';
    for (const s of [-1, 1]) { g.save(); g.scale(s, 1);
      const wy = flap * r; g.beginPath(); g.moveTo(r * .15, -r * .05); g.quadraticCurveTo(r * .6, wy - r * .3, r * 1.3, wy); g.lineTo(r * 1.05, wy * .3 + r * .15); g.lineTo(r * .85, wy * .2 + r * .35); g.lineTo(r * .55, r * .2); g.lineTo(r * .3, r * .3); g.closePath();
      const gr = g.createLinearGradient(0, wy, 0, r * .3); gr.addColorStop(0, '#4a3240'); gr.addColorStop(1, '#1e1418'); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#6a4a58'; g.lineWidth = r * .04; for (const [x, y] of [[1.05, wy / r * .3 + .15], [.85, wy / r * .2 + .35], [.55, .2]]) { g.beginPath(); g.moveTo(r * .2, 0); g.lineTo(r * x, r * y); g.stroke(); } g.restore(); }
    vol(g, 0, r * .05, r * .3, r * .38, fur); vol(g, 0, -r * .3, r * .24, r * .22, fur);
    poly(g, [-r * .2, -r * .38, -r * .14, -r * .7, -r * .04, -r * .42], fur); poly(g, [r * .2, -r * .38, r * .14, -r * .7, r * .04, -r * .42], fur);
    g.fillStyle = '#e8e0d0'; poly(g, [-r * .08, -r * .18, -r * .05, -r * .08, -r * .02, -r * .18], '#eee'); poly(g, [r * .08, -r * .18, r * .05, -r * .08, r * .02, -r * .18], '#eee');
  },
  gargoyle(g, r, f) {
    const flap = [0, -.25, -.4, -.2][f], stone = '#77726a';
    for (const s of [-1, 1]) { g.save(); g.scale(s, 1); g.beginPath(); g.moveTo(r * .2, -r * .2); g.lineTo(r * 1.1, -r * (.8 - flap)); g.lineTo(r * 1.15, -r * .1); g.lineTo(r * .85, -r * .25); g.lineTo(r * .8, r * .1); g.lineTo(r * .5, 0); g.closePath(); volFill(g, r * .7, -r * .3, r * .7, tone(stone, -.2)); g.restore(); }
    humanoid(g, r, f, { skin: stone, bare: true, claws: true, hunch: .5, bulk: 1.25, pants: tone(stone, -.2), head: 'bald' });
    poly(g, [r * .02, -r * .78, -r * .12, -r * 1.15, r * .15, -r * .82], '#5a564e'); poly(g, [r * .32, -r * .78, r * .4, -r * 1.15, r * .45, -r * .8], '#5a564e');
    g.fillStyle = 'rgba(30,28,24,.35)'; for (let i = 0; i < 14; i++) { g.fillRect(((i * 37) % 17 - 8) / 8 * r * .4, ((i * 53) % 19 - 9) / 9 * r * .6, r * .05, r * .05); }
  },
  cultist(g, r, f) { humanoid(g, r, f, { cloth: '#6e1a1c', cloth2: '#c9a44a', robe: true, head: 'mask', maskCol: '#c9a44a', arms: 'raise', weapon: HELD.orb }); },
  spider(g, r, f) {
    const ph = f / FRAMES * TAU, legC = '#1c1616';
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 4; i++) { const p = Math.sin(ph + i * 1.6 + (s > 0 ? Math.PI : 0)) * .15, a = -1 + i * .55 + p; const kx = s * r * (.55 + Math.cos(a) * .2), ky = -r * .45 + Math.sin(a) * r * .35, fx = s * r * (1 + Math.cos(a) * .15), fy = Math.sin(a) * r * .85 + r * .25;
      limb2(g, s * r * .15, -r * .05 + i * r * .06, kx, ky, fx, fy, r * .07, r * .055, r * .03, i % 2 ? legC : '#2a2020'); }
    vol(g, -r * .1, r * .35, r * .6, r * .5, '#2e2424'); g.fillStyle = '#8b1a1a'; g.beginPath(); g.moveTo(-r * .1, r * .1); g.lineTo(-r * .25, r * .35); g.lineTo(-r * .1, r * .6); g.lineTo(r * .05, r * .35); g.fill();
    vol(g, r * .1, -r * .2, r * .34, r * .3, '#3a2e2c'); g.fillStyle = '#0a0606'; for (let i = 0; i < 3; i++) circ(g, r * (.18 + i * .07), -r * .28 + (i % 2) * r * .05, r * .035);
  },
  spiderling(g, r, f) { PAINT.spider(g, r, f); },
  knight(g, r, f) {
    humanoid(g, r, f, { cloth: '#3a4048', sleeve: '#4a5058', pants: '#2a2e34', bulk: 1.25, head: 'helm', metal: '#5a6068', plume: '#8b1a1a', weapon: HELD.greatsword });
    g.save(); g.translate(r * .6, r * .05); vol(g, 0, 0, r * .36, r * .55, '#4b525c', 0, .5); g.strokeStyle = '#a8aeb8'; g.lineWidth = r * .06; g.beginPath(); g.ellipse(0, 0, r * .36, r * .55, 0, 0, TAU); g.stroke();
    g.fillStyle = '#8b1a1a'; g.fillRect(-r * .05, -r * .4, r * .1, r * .8); g.fillRect(-r * .25, -r * .1, r * .5, r * .1); g.restore();
  },
  stained(g, r, f) {
    humanoid(g, r, f, { cloth: '#3e4a52', sleeve: '#4a565e', pants: '#2a3238', bulk: 1.2, head: 'helm', metal: '#5a6a70', plume: '#3a7ac8', weapon: HELD.sword });
    g.save(); g.translate(r * .6, r * .05); const cols = ['#c83a3a', '#3a7ac8', '#e2b24a', '#3ac87a', '#9a4ac8', '#e2b24a']; g.beginPath(); g.moveTo(0, -r * .6); g.lineTo(r * .38, -r * .35); g.lineTo(r * .3, r * .35); g.lineTo(0, r * .6); g.lineTo(-r * .3, r * .35); g.lineTo(-r * .38, -r * .35); g.closePath(); g.save(); g.clip();
    for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect(-r * .4 + (i % 2) * r * .4, -r * .6 + Math.floor(i / 2) * r * .4, r * .4, r * .4); } g.restore();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = r * .05; g.stroke(); g.beginPath(); g.moveTo(0, -r * .6); g.lineTo(0, r * .6); g.moveTo(-r * .38, -r * .2); g.lineTo(r * .38, -r * .2); g.moveTo(-r * .32, r * .2); g.lineTo(r * .32, r * .2); g.stroke();
    const gl = g.createLinearGradient(-r * .3, -r * .5, r * .3, r * .5); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(.4, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.moveTo(0, -r * .6); g.lineTo(r * .38, -r * .35); g.lineTo(-r * .38, -r * .35); g.fill(); g.restore();
  },
  eater(g, r, f) {
    const open = [.3, .45, .55, .42][f];
    for (let i = 0; i < 4; i++) { const x = -r * .5 + i * r * .33; limb(g, x, r * .3, x + Math.sin(f + i) * r * .1, r * .9, r * .1, r * .07, '#241a2c'); }
    vol(g, 0, 0, r * .95, r * .82, '#2a1e34'); g.fillStyle = 'rgba(160,110,220,.25)'; for (let i = 0; i < 8; i++) circ(g, Math.cos(i * 2.3) * r * .55, Math.sin(i * 1.7) * r * .45 - r * .1, r * (.05 + (i % 3) * .03));
    g.fillStyle = '#060308'; g.beginPath(); g.ellipse(r * .15, r * .18, r * .62, r * open, 0, 0, TAU); g.fill();
    const tg = g.createRadialGradient(r * .15, r * .25, 0, r * .15, r * .25, r * .5); tg.addColorStop(0, '#6a1a3a'); tg.addColorStop(1, 'rgba(60,10,30,0)'); g.fillStyle = tg; g.fill();
    for (let i = -3; i <= 3; i++) { poly(g, [r * .15 + i * r * .15 - r * .06, r * .18 - r * open * .9, r * .15 + i * r * .15 + r * .06, r * .18 - r * open * .9, r * .15 + i * r * .15, r * .18 - r * open * .3], '#e6ddcc'); poly(g, [r * .15 + i * r * .15 - r * .05, r * .18 + r * open * .9, r * .15 + i * r * .15 + r * .05, r * .18 + r * open * .9, r * .15 + i * r * .15, r * .18 + r * open * .35], '#d6cdbc'); }
    rim(g, 0, 0, r * .95, r * .82);
  },
  banshee(g, r, f) { humanoid(g, r, f, { skin: '#cfdbe2', cloth: '#b8c8d4', float: true, head: 'hair', hairCol: '#eef4f8', arms: 'raise', bare: true }); },
  worm(g, r, f) {
    for (let i = 4; i >= 0; i--) { const x = Math.sin(i * .9 + f * 1.4) * r * .22, y = r * .65 - i * r * .32; vol(g, x, y, r * (.32 + i * .04), r * (.28 + i * .03), i ? '#7a4e3c' : '#946050');
      g.strokeStyle = 'rgba(40,20,14,.5)'; g.lineWidth = r * .04; g.beginPath(); g.ellipse(x, y, r * (.3 + i * .04), r * .06, 0, 0, Math.PI); g.stroke(); }
    const mx = Math.sin(f * 1.4) * r * .22; g.fillStyle = '#1a0a08'; ell(g, mx, -r * .62, r * .26, r * .18); g.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; poly(g, [mx + Math.cos(a) * r * .24, -r * .62 + Math.sin(a) * r * .16, mx + Math.cos(a + .2) * r * .1, -r * .62 + Math.sin(a + .2) * r * .07, mx + Math.cos(a - .2) * r * .1, -r * .62 + Math.sin(a - .2) * r * .07], '#e6dcc8'); }
  },
  wraith(g, r, f) { humanoid(g, r, f, { cloth: '#3e5a4a', float: true, head: 'hood', face: null, claws: true, bare: false, sleeve: '#2e4a3a', weapon: HELD.scythe }); glowDot(g, r * .12, -r * .6, r * .06, '#9affc0'); },
  chorister(g, r, f) { humanoid(g, r, f, { cloth: '#36505e', cloth2: '#c9d6dc', robe: true, head: 'hood', face: '#8aa4ae', hoodCol: '#2a404c', weapon: HELD.book }); g.fillStyle = '#0a1418'; ell(g, r * .2, -r * .5, r * .05, r * (.05 + (f % 2) * .04)); g.fill(); },
  imp(g, r, f) {
    const ph = f / FRAMES * TAU; g.strokeStyle = '#3a120a'; g.lineWidth = r * .08; g.lineCap = 'round'; g.beginPath(); g.moveTo(-r * .3, r * .3); g.quadraticCurveTo(-r * .9, r * .2 + Math.sin(ph) * r * .2, -r * .8, -r * .3); g.stroke(); poly(g, [-r * .8, -r * .3, -r * .95, -r * .45, -r * .68, -r * .42], '#3a120a');
    for (const s of [-1, 1]) { g.save(); g.scale(s, 1); poly(g, [r * .2, -r * .2, r * .8, -r * (.7 + Math.sin(ph) * .2), r * .7, -r * .1, r * .4, 0], '#4a1a10'); g.restore(); }
    humanoid(g, r, f, { skin: '#6a2012', bare: true, claws: true, hunch: .3, pants: '#3a0e08', head: 'bald', headSize: 1.2 });
    const gr = g.createRadialGradient(r * .05, 0, 0, r * .05, 0, r * .4); gr.addColorStop(0, 'rgba(255,220,120,.95)'); gr.addColorStop(.5, 'rgba(255,110,20,.6)'); gr.addColorStop(1, 'rgba(255,80,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(r * .05, 0, r * .4, 0, TAU); g.fill();
    poly(g, [r * .02, -r * .8, -r * .15, -r * 1.12, r * .12, -r * .88], '#2a0e06'); poly(g, [r * .3, -r * .8, r * .42, -r * 1.12, r * .42, -r * .82], '#2a0e06');
  },
  golem(g, r, f) {
    const ph = f / FRAMES * TAU, rock = '#4e4642';
    const parts = [[-r * .5, r * .65 + Math.sin(ph) * r * .05, .28], [r * .45, r * .65 - Math.sin(ph) * r * .05, .28], [0, r * .05, .62], [-r * .7, -r * .1 + Math.sin(ph) * r * .08, .3], [r * .72, -r * .05 - Math.sin(ph) * r * .08, .32], [r * .1, -r * .65, .33]];
    for (const [x, y, s] of parts) { g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, d = r * s * (.85 + ((i * 7 + s * 10) % 3) * .08); i ? g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.closePath(); volFill(g, x, y, r * s, rock, .3, -.7); }
    g.strokeStyle = '#ff7a1a'; g.lineWidth = r * .05; g.shadowColor = '#ff7a1a'; g.shadowBlur = r * .3; g.beginPath(); g.moveTo(-r * .35, -r * .2); g.lineTo(-r * .05, r * .1); g.lineTo(-r * .2, r * .45); g.moveTo(r * .3, -r * .25); g.lineTo(r * .08, r * .05); g.lineTo(r * .35, r * .35); g.stroke(); g.shadowBlur = 0;
  },
  voideye(g, r, f) {
    g.lineCap = 'round'; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + .3, w = Math.sin(f / FRAMES * TAU + i) * .35; g.strokeStyle = i % 2 ? '#3a1a60' : '#2a1048'; g.lineWidth = r * .12;
      g.beginPath(); g.moveTo(Math.cos(a) * r * .5, Math.sin(a) * r * .5); g.quadraticCurveTo(Math.cos(a + w) * r * 1, Math.sin(a + w) * r * 1, Math.cos(a + w * 2) * r * 1.3, Math.sin(a + w * 2) * r * 1.2); g.stroke(); }
    vol(g, 0, 0, r * .72, r * .72, '#e8e0ee', 0, .4, -.5); g.strokeStyle = 'rgba(160,30,40,.55)'; g.lineWidth = r * .025; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * .68, Math.sin(a) * r * .68); g.quadraticCurveTo(Math.cos(a + .2) * r * .5, Math.sin(a + .2) * r * .5, Math.cos(a) * r * .38, Math.sin(a) * r * .38); g.stroke(); }
    const ix = Math.sin(f / FRAMES * TAU) * r * .1; vol(g, r * .1 + ix, 0, r * .32, r * .32, '#7b4fd6', 0, .5); circ(g, r * .1 + ix, 0, r * .14, '#050208'); circ(g, r * .02 + ix, -r * .1, r * .06, 'rgba(255,255,255,.85)');
  },
  wisp(g, r, f) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, '#c8b0ff'); gr.addColorStop(1, 'rgba(123,79,214,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(220,200,255,.7)'; g.lineWidth = r * .08; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, r * (.5 + i * .15), f * .8 + i * 2, f * .8 + i * 2 + 1.6); g.stroke(); } },
  // ---- новые враги ----
  frostmonk(g, r, f) { humanoid(g, r, f, { cloth: '#6a8aa4', cloth2: '#dfeaf2', robe: true, head: 'hood', face: '#a8c4d6', hoodCol: '#4a6a84', weapon: (g2, x, y, rr, ff) => HELD.staff(g2, x, y, rr, ff, '#bfeaff') });
    g.fillStyle = 'rgba(230,245,255,.8)'; for (let i = 0; i < 5; i++) poly(g, [-r * .5 + i * r * .25, r * .95, -r * .45 + i * r * .25, r * 1.1, -r * .4 + i * r * .25, r * .95], 'rgba(220,240,255,.8)'); },
  icehound(g, r, f) { quadruped(g, r, f, { col: '#8aa8c0', fur: true }); g.fillStyle = 'rgba(220,245,255,.9)'; for (let i = 0; i < 5; i++) poly(g, [-r * .5 + i * r * .22, -r * .38, -r * .45 + i * r * .22, -r * .65, -r * .4 + i * r * .22, -r * .38]); g.fill(); },
  plaguedoc(g, r, f) { humanoid(g, r, f, { cloth: '#1e1c1a', cloth2: '#5a4a2a', robe: true, head: 'beak', skin: '#2a2622', weapon: HELD.lantern }); },
  leech(g, r, f) {
    const ph = f / FRAMES * TAU; for (let i = 5; i >= 0; i--) { const x = -r * .7 + i * r * .28, y = r * .3 + Math.sin(ph + i * .8) * r * .08; vol(g, x, y, r * (.26 + Math.sin(i / 5 * Math.PI) * .12), r * (.24 + Math.sin(i / 5 * Math.PI) * .1), i % 2 ? '#5a2a22' : '#6a3228'); }
    g.fillStyle = '#1a0806'; ell(g, r * .75, r * .3, r * .14, r * .18); g.fill(); g.strokeStyle = '#d8b8a8'; g.lineWidth = r * .04; g.beginPath(); g.arc(r * .75, r * .3, r * .15, 0, TAU); g.stroke(); },
  bonecolossus(g, r, f) { humanoid(g, r, f, { skin: '#d8ceb8', bare: true, claws: true, hunch: .6, bulk: 1.45, pants: '#bdb29a', ribs: true, head: 'skull', headSize: 1.2 });
    poly(g, [-r * .05, -r * .75, -r * .45, -r * 1.2, -r * .1, -r * .9], '#c8bea6'); poly(g, [r * .35, -r * .75, r * .6, -r * 1.2, r * .45, -r * .85], '#c8bea6');
    for (let i = 0; i < 5; i++) vol(g, -r * .5 + i * r * .25, -r * .38, r * .08, r * .08, '#e2dac6'); },
  crawler(g, r, f) {
    const ph = f / FRAMES * TAU, s = Math.sin(ph);
    vol(g, -r * .3, r * .4, r * .55, r * .25, '#4a4238'); g.fillStyle = '#3a2a22'; ell(g, -r * .7, r * .45, r * .35, r * .15); g.fill();
    limb2(g, r * .1, r * .3, r * .5, r * .15 + s * r * .1, r * .85, r * .6, r * .1, r * .08, r * .07, '#6e6a58'); limb2(g, r * .05, r * .35, r * .35, r * .5 - s * r * .1, r * .6, r * .85, r * .1, r * .08, r * .07, '#5e5a4a');
    HEADS.bald(g, r * .35, r * .05, r * .26, { skin: '#7a7462' }); g.strokeStyle = '#2a2420'; g.lineWidth = r * .05; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(r * .2 + i * r * .08, -r * .15); g.lineTo(r * .1 + i * r * .1, r * .2); g.stroke(); } },
  werewolf(g, r, f) { quadruped(g, r, f, { col: '#3a3028', fur: true }); g.strokeStyle = '#1a1410'; g.lineWidth = r * .04; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-r * .4 + i * r * .15, -r * .1); g.lineTo(-r * .45 + i * r * .15, r * .15); g.stroke(); } },
  dryad(g, r, f) {
    humanoid(g, r, f, { skin: '#5a4a32', cloth: '#4a3a24', bare: true, claws: true, robe: true, head: 'bald', arms: 'raise' });
    g.fillStyle = '#3a5a2a'; for (let i = 0; i < 9; i++) { const a = -2.8 + i * .3; ell(g, r * .1 + Math.cos(a) * r * .38, -r * .7 + Math.sin(a) * r * .35, r * .14, r * .08, '#3a6a2a', a); }
    for (let i = 0; i < 4; i++) ell(g, -r * .3 + i * r * .2, -r * .95 - (i % 2) * r * .08, r * .08, r * .05, '#a82a3a');
    g.strokeStyle = '#3a2a18'; g.lineWidth = r * .04; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-r * .3 + i * r * .2, -r * .2); g.lineTo(-r * .25 + i * r * .2, r * .6); g.stroke(); }
  },
  // ---- боссы ----
  rotmother(g, r, f) {
    const w = Math.sin(f / FRAMES * TAU) * .04;
    g.beginPath(); g.moveTo(-r, r * .6); g.bezierCurveTo(-r * 1.15, -r * .4, -r * .55, -r * (1 + w), 0, -r * (.95 + w)); g.bezierCurveTo(r * .55, -r * (1 - w), r * 1.15, -r * .4, r, r * .6); g.quadraticCurveTo(0, r * .95, -r, r * .6); volFill(g, 0, 0, r, '#657a24', .45, -.7);
    const gr = g.createRadialGradient(0, 0, r * .1, 0, 0, r * .8); gr.addColorStop(0, 'rgba(200,230,80,.25)'); gr.addColorStop(1, 'rgba(200,230,80,0)'); g.fillStyle = gr; g.fill();
    g.globalAlpha = .55; HEADS.skull(g, -r * .35, -r * .1, r * .14); HEADS.skull(g, r * .3, r * .15, r * .11); g.globalAlpha = 1;
    for (let i = 0; i < 10; i++) vol(g, Math.cos(i * 2.1) * r * .6, Math.sin(i * 1.7) * r * .45 - r * .1, r * (.04 + (i % 3) * .025), r * (.04 + (i % 3) * .025), '#c8e070', 0, .7);
    for (let i = 0; i < 6; i++) { const x = -r * .7 + i * r * .28, len = r * (.15 + ((i + f) % 3) * .08); g.fillStyle = '#4a5a18'; g.beginPath(); g.moveTo(x - r * .04, r * .7); g.quadraticCurveTo(x, r * .7 + len, x + r * .04, r * .7); g.fill(); }
    g.fillStyle = '#141806'; ell(g, r * .05, r * .28, r * .42, r * (.14 + (f % 2) * .05)); g.fill();
  },
  bishop(g, r, f) {
    humanoid(g, r, f, { cloth: '#3a2a4a', cloth2: '#d4b060', float: true, head: 'skull', arms: 'raise', sleeve: '#4a3a5a', weapon: (g2, x, y, rr) => { g2.strokeStyle = '#c9b060'; g2.lineWidth = rr * .06; g2.beginPath(); g2.moveTo(x, y + rr * .6); g2.lineTo(x, y - rr * .9); g2.arc(x - rr * .15, y - rr * .9, rr * .15, 0, Math.PI, true); g2.stroke(); } });
    const hx = r * .09, hy = -r * .66; g.beginPath(); g.moveTo(hx - r * .22, hy - r * .15); g.lineTo(hx - r * .25, hy - r * .7); g.lineTo(hx, hy - r * .95); g.lineTo(hx + r * .25, hy - r * .7); g.lineTo(hx + r * .22, hy - r * .15); g.closePath(); volFill(g, hx, hy - r * .5, r * .5, '#e0cc8a', .5);
    g.fillStyle = '#8b1a1a'; g.fillRect(hx - r * .03, hy - r * .85, r * .06, r * .65); g.fillRect(hx - r * .12, hy - r * .6, r * .24, r * .05);
    for (let i = 0; i < 3; i++) { const a = f / FRAMES * TAU + i * 2.1, cx = Math.cos(a) * r * .9, cy = -r * .2 + Math.sin(a) * r * .3; g.fillStyle = '#e8e0c8'; g.fillRect(cx - r * .03, cy, r * .06, r * .16); glowDot(g, cx, cy - r * .03, r * .03, '#ffb14a'); }
  },
  shepherd(g, r, f) {
    const ph = f / FRAMES * TAU;
    for (let i = 0; i < 5; i++) { const gr = g.createRadialGradient(Math.cos(i * 1.3 + ph * .3) * r * .5, r * .5, 0, Math.cos(i * 1.3) * r * .5, r * .5, r * .7); gr.addColorStop(0, 'rgba(30,10,50,.6)'); gr.addColorStop(1, 'rgba(30,10,50,0)'); g.fillStyle = gr; g.beginPath(); g.arc(Math.cos(i * 1.3 + ph * .3) * r * .5, r * .5, r * .7, 0, TAU); g.fill(); }
    humanoid(g, r, f, { cloth: '#140a22', float: true, head: 'hood', hoodCol: '#0e0618', arms: 'raise', claws: true, bare: true, skin: '#1a1024', bulk: 1.5,
      weapon: (g2, x, y, rr) => { g2.strokeStyle = '#5a3a8a'; g2.lineWidth = rr * .05; g2.beginPath(); g2.moveTo(x, y + rr * .9); g2.lineTo(x + rr * .05, y - rr * .8); g2.arc(x + rr * .25, y - rr * .8, rr * .2, Math.PI, 0); g2.stroke(); } });
    poly(g, [-r * .2, -r * .85, -r * .75, -r * 1.35, -r * .35, -r * .95], '#221436'); poly(g, [r * .3, -r * .85, r * .85, -r * 1.35, r * .5, -r * .9], '#221436');
    for (let i = 0; i < 6; i++) glowDot(g, r * (.0 + (i % 3) * .14), -r * (.72 - Math.floor(i / 3) * .12), r * .025, '#c080ff');
  },
};

// Глаза в темноте: [цвет, смещение x, смещение y, разнос] в долях радиуса
const EYES = {
  ghoul: ['#ff3a2a', .22, -.6, .1], bat: ['#ff5a3a', 0, -.32, .08], skeleton: ['#6ab8ff', .15, -.66, .09], drowned: ['#9affe0', .15, -.6, .09],
  shade: ['#c9a0ff', 0, -.15, .16], gargoyle: ['#ffb000', .2, -.55, .09], cultist: ['#ff2a6a', .2, -.55, .06], spider: ['#ff2a2a', .22, -.28, .06],
  spiderling: ['#ff2a2a', .22, -.28, .07], knight: ['#ff2a2a', .25, -.62, .06], eater: ['#b394ff', 0, -.4, .2], banshee: ['#e8f4ff', .22, -.62, .06],
  worm: ['#ffe070', 0, -.8, .1], wraith: ['#9affc0', .18, -.55, .06], chorister: ['#9adcff', .2, -.6, .06], stained: ['#ffd070', .25, -.62, .06],
  imp: ['#fff2a0', .18, -.52, .08], golem: ['#ff7a1a', .1, -.65, .08], voideye: ['#b394ff', 0, 0, 0], wisp: ['#fff', 0, 0, 0],
  frostmonk: ['#bfeaff', .2, -.55, .06], icehound: ['#bfeaff', .95, -.35, .05], plaguedoc: ['#9affc0', .2, -.62, .05], leech: ['#ff5a4a', .7, .2, .05],
  bonecolossus: ['#ff5a2a', .15, -.68, .1], crawler: ['#ffd070', .38, .02, .06], werewolf: ['#ff2a2a', .95, -.35, .05], dryad: ['#9aff6a', .2, -.62, .06],
  rotmother: ['#e6ff5a', .05, -.2, .1], bishop: ['#ff3a3a', .12, -.66, .06], shepherd: ['#b060ff', .1, -.62, .06],
};

function buildEnemySprite(id, r) {
  const W = r * 3.4, px = Math.ceil(W * SS), frames = [], white = [];
  for (let f = 0; f < FRAMES; f++) {
    const c = mkCanvas(px), g = c.getContext('2d'); g.scale(SS, SS); g.translate(W / 2, W / 2); PAINT[id](g, r, f);
    const o = outlined(c); frames.push(o); white.push(whiteOf(o));
  }
  Sprites.enemy[id] = { frames, white, size: W, r };
}

// ---------- Хранитель и скины ----------
const ACCESSORY = {
  halo(g, x, y, hr) { g.strokeStyle = '#ffe08a'; g.lineWidth = hr * .18; g.shadowColor = '#ffd27a'; g.shadowBlur = hr; g.beginPath(); g.ellipse(x, y - hr * 1.6, hr * .8, hr * .25, 0, 0, TAU); g.stroke(); g.shadowBlur = 0; },
  horns(g, x, y, hr) { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * hr * .5, y - hr * .9); g.quadraticCurveTo(x + s * hr * 1.5, y - hr * 1.3, x + s * hr * 1.2, y - hr * 2.2); g.quadraticCurveTo(x + s * hr * 1.1, y - hr * 1.4, x + s * hr * .2, y - hr * 1.1); g.closePath(); volFill(g, x + s * hr, y - hr * 1.5, hr, '#3a2a22'); } },
  crown(g, x, y, hr) { g.beginPath(); g.moveTo(x - hr * .8, y - hr * 1.05); for (let i = 0; i <= 4; i++) { g.lineTo(x - hr * .8 + i * hr * .4, y - hr * (i % 2 ? 1.35 : 1.75)); } g.lineTo(x + hr * .8, y - hr * 1.05); g.closePath(); volFill(g, x, y - hr * 1.3, hr, '#d4a94a', .6); glowDot(g, x, y - hr * 1.3, hr * .1, '#ff3a3a'); },
  antlers(g, x, y, hr) { g.strokeStyle = '#6a5438'; g.lineWidth = hr * .16; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * hr * .4, y - hr * 1); g.lineTo(x + s * hr * 1.2, y - hr * 2.2); g.moveTo(x + s * hr * .8, y - hr * 1.6); g.lineTo(x + s * hr * 1.5, y - hr * 1.5); g.moveTo(x + s * hr * 1, y - hr * 1.9); g.lineTo(x + s * hr * .6, y - hr * 2.5); g.stroke(); } },
  skull(g, x, y, hr) { HEADS.skull(g, x + hr * .2, y - hr * .2, hr * .75); },
  mask(g, x, y, hr) { vol(g, x + hr * .35, y + hr * .1, hr * .5, hr * .6, '#e8e0cc', 0, .5); g.fillStyle = '#1a0a0a'; ell(g, x + hr * .5, y, hr * .12, hr * .08); g.fill(); ell(g, x + hr * .15, y, hr * .12, hr * .08); g.fill(); g.strokeStyle = '#8b1a1a'; g.lineWidth = hr * .08; g.beginPath(); g.moveTo(x + hr * .35, y - hr * .45); g.lineTo(x + hr * .35, y + hr * .6); g.stroke(); },
  feathers(g, x, y, hr) { for (let i = 0; i < 5; i++) { const a = -2.2 + i * .25; g.save(); g.translate(x + Math.cos(a) * hr * .9, y + Math.sin(a) * hr * .9); g.rotate(a + 1.57); vol(g, 0, -hr * .6, hr * .14, hr * .6, i % 2 ? '#1a1a1a' : '#8b1a1a'); g.restore(); } },
  veil(g, x, y, hr) { g.fillStyle = 'rgba(20,10,20,.75)'; g.beginPath(); g.moveTo(x - hr * .9, y - hr * .6); g.quadraticCurveTo(x + hr * .4, y - hr * .9, x + hr * 1.1, y - hr * .4); g.lineTo(x + hr * 1.2, y + hr * 1.4); g.quadraticCurveTo(x, y + hr * 1.7, x - hr * 1.1, y + hr * 1.3); g.fill(); },
};
const FLAMES = { fire: ['#b3261e', '#ff7a1a', '#ffe8a0', 'fire'], blue: ['#1a3a8a', '#4fa8ff', '#e0f4ff', 'ice'], green: ['#1a5a1a', '#5fdf4a', '#eaffd0', 'green'],
  violet: ['#1a0a2a', '#7b4fd6', '#e0ccff', 'violet'], white: ['#8a6a2a', '#ffe08a', '#ffffff', 'gold'], blood: ['#3a0000', '#c21a1a', '#ff9a8a', 'red'] };

function playerSprite(charId, skinIdx = 0) {
  const key = charId + ':' + skinIdx; if (Sprites.player[key]) return Sprites.player[key];
  const ch = CHAR[charId], sk = (SKINS[charId] || [])[skinIdx] || {}, col = sk.col || ch.col, trim = sk.trim || ch.trim;
  const r = 16, W = 64, px = W * SS, frames = [];
  for (let f = 0; f < FRAMES; f++) {
    const c = mkCanvas(px), g = c.getContext('2d'); g.scale(SS, SS); g.translate(W / 2, W / 2 + 4);
    const ph = f / FRAMES * TAU, sw = Math.sin(ph);
    // плащ за спиной
    g.beginPath(); g.moveTo(-r * .35, -r * .35); g.quadraticCurveTo(-r * .95 - sw * r * .1, r * .3, -r * .8 - sw * r * .15, r * .95); for (let i = 0; i < 4; i++) g.lineTo(-r * .8 + i * r * .3 - sw * r * .1, r * (i % 2 ? .82 : .98)); g.lineTo(r * .3, -r * .2); g.closePath(); volFill(g, -r * .3, r * .3, r, tone(col, -.35));
    humanoid(g, r, f, { cloth: col, cloth2: trim, pants: tone(col, -.5), sleeve: tone(col, -.1), head: 'hood', hoodCol: col, skin: '#c8a888', arms: 'none' });
    // рука с факелом (кисть вверху)
    limb2(g, r * .15, -r * .25, r * .45, -r * .05, r * .6, -r * .38, r * .11, r * .09, r * .08, tone(col, -.1));
    g.strokeStyle = '#5a3a1e'; g.lineWidth = r * .12; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * .55, -r * .2); g.lineTo(r * .8, -r * 1.12); g.stroke();
    g.fillStyle = '#3a2a1a'; g.fillRect(r * .72, -r * 1.2, r * .18, r * .12);
    // глаза под капюшоном
    const hx = r * .04 + r * .04, hy = -r * .66; circ(g, hx + r * .16, hy + r * .06, r * .035, ch.noLight ? '#b394ff' : '#ffd27a'); circ(g, hx + r * .02, hy + r * .06, r * .03, ch.noLight ? '#b394ff' : '#ffd27a');
    if (ch.noLight) { g.strokeStyle = 'rgba(150,100,255,.7)'; g.lineWidth = r * .04; g.beginPath(); g.moveTo(-r * .2, -r * .1); g.lineTo(0, r * .2); g.lineTo(-r * .1, r * .5); g.stroke(); }
    if (sk.acc) ACCESSORY[sk.acc](g, hx + r * .02, hy, r * .27);
    frames.push(outlined(c));
  }
  return (Sprites.player[key] = { frames, white: frames.map(whiteOf), size: W, flame: FLAMES[sk.flame || (ch.noLight ? 'violet' : 'fire')] });
}

// ---------- декор биомов ----------
const DECOR = {
  grave(g, s, v) { const c = ['#56524c', '#625d56', '#4a4640'][v % 3]; g.beginPath(); g.moveTo(-s * .32, s * .45); g.lineTo(-s * .32, -s * .15); g.quadraticCurveTo(-s * .32, -s * .48, 0, -s * .48); g.quadraticCurveTo(s * .32, -s * .48, s * .32, -s * .15); g.lineTo(s * .32, s * .45); g.closePath(); volFill(g, 0, 0, s * .5, c, .35, -.6);
    g.fillStyle = tone(c, .35); g.fillRect(s * .26, -s * .2, s * .06, s * .62); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = s * .04; g.beginPath(); g.moveTo(-s * .12, -s * .05); g.lineTo(s * .12, -s * .05); g.moveTo(0, -s * .25); g.lineTo(0, s * .18); g.moveTo(-s * .25, s * .2); g.lineTo(-s * .05, s * .35); g.stroke();
    g.fillStyle = 'rgba(70,100,50,.7)'; ell(g, -s * .2, s * .4, s * .15, s * .07); g.fill(); ell(g, s * .15, -s * .38, s * .1, s * .05); g.fill(); },
  cross(g, s) { const c = '#46403a'; g.fillStyle = c; g.beginPath(); g.rect(-s * .07, -s * .5, s * .14, s * .95); g.rect(-s * .28, -s * .3, s * .56, s * .13); volFill(g, 0, -s * .1, s * .5, c); g.fillStyle = 'rgba(80,110,60,.6)'; ell(g, 0, s * .42, s * .2, s * .06); g.fill(); },
  tree(g, s, v) { const br = (x, y, a, l, w, d) => { if (d > 6 || l < s * .06) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; limb(g, x, y, x2, y2, w, w * .65, '#2a221c'); br(x2, y2, a - .45 - (v % 3) * .08, l * .7, w * .65, d + 1); br(x2, y2, a + .4, l * .64, w * .65, d + 1); }; br(0, s * .5, -Math.PI / 2, s * .36, s * .07, 0); },
  fence(g, s) { g.fillStyle = '#2e2a26'; for (let i = -2; i <= 2; i++) { g.fillRect(i * s * .2 - 2, -s * .3, 4, s * .6); poly(g, [i * s * .2 - 4, -s * .3, i * s * .2, -s * .44, i * s * .2 + 4, -s * .3], '#3a3530'); } g.fillStyle = '#3a3530'; g.fillRect(-s * .45, -s * .15, s * .9, 3); g.fillRect(-s * .45, s * .12, s * .9, 3); },
  pillar(g, s, v) { const h = v % 2 ? s : s * .55, gr = g.createLinearGradient(-s * .2, 0, s * .2, 0); gr.addColorStop(0, '#3a4048'); gr.addColorStop(.35, '#7a828c'); gr.addColorStop(1, '#2a3038');
    g.fillStyle = gr; g.fillRect(-s * .2, s * .5 - h, s * .4, h); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * s * .1, s * .5 - h); g.lineTo(i * s * .1, s * .45); g.stroke(); }
    g.fillStyle = '#5a626c'; g.fillRect(-s * .27, s * .5 - h - s * .06, s * .54, s * .08); g.fillRect(-s * .27, s * .44, s * .54, s * .08); if (v % 2 === 0) { g.fillStyle = '#4a525c'; poly(g, [-s * .2, s * .5 - h, -s * .05, s * .5 - h - s * .1, s * .08, s * .5 - h + s * .03, s * .2, s * .5 - h - s * .05, s * .2, s * .5 - h], '#4a525c'); } },
  glass(g, s, v) { const cols = ['#c83a3a', '#3a7ac8', '#e2b24a', '#3ac87a', '#9a4ac8']; for (let i = 0; i < 6; i++) { const a = i * 1.3 + v, d = s * .25 * ((i * 7 + v) % 3) / 2; poly(g, [Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * d + s * .12, Math.sin(a) * d + s * .03, Math.cos(a) * d + s * .04, Math.sin(a) * d + s * .12], cols[(i + v) % 5], 'rgba(255,255,255,.3)', 1); } },
  pew(g, s) { g.beginPath(); g.rect(-s * .45, -s * .1, s * .9, s * .18); g.rect(-s * .45, -s * .3, s * .9, s * .08); volFill(g, 0, -s * .1, s * .5, '#4a3424'); g.fillStyle = '#2a1a10'; g.fillRect(-s * .42, -s * .3, s * .06, s * .4); g.fillRect(s * .36, -s * .3, s * .06, s * .4); },
  rock(g, s, v) { g.beginPath(); g.moveTo(-s * .4, s * .3); g.lineTo(-s * .35, -s * .1); g.lineTo(-s * .1, -s * .35); g.lineTo(s * .25, -s * .25 - (v % 3) * 3); g.lineTo(s * .42, s * .1); g.lineTo(s * .3, s * .32); g.closePath(); volFill(g, 0, 0, s * .45, '#4a403c'); },
  lava(g, s, v) { g.strokeStyle = '#ff5a14'; g.lineWidth = 3; g.shadowColor = '#ff7a1a'; g.shadowBlur = 10; g.beginPath(); g.moveTo(-s * .45, 0); for (let i = 1; i <= 5; i++) g.lineTo(-s * .45 + i * s * .18, ((i + v) % 2 ? -1 : 1) * s * .12); g.stroke(); g.strokeStyle = '#ffd27a'; g.lineWidth = 1; g.stroke(); g.shadowBlur = 0; },
  bones(g, s) { limb(g, -s * .3, -s * .1, s * .2, s * .15, 2.5, 2.5, '#d8d0bc'); limb(g, -s * .1, s * .2, s * .3, -s * .15, 2.5, 2.5, '#cfc6b0'); HEADS.skull(g, -s * .32, s * .02, s * .12); },
  obelisk(g, s) { g.beginPath(); g.moveTo(-s * .18, s * .5); g.lineTo(-s * .12, -s * .4); g.lineTo(0, -s * .55); g.lineTo(s * .12, -s * .4); g.lineTo(s * .18, s * .5); g.closePath(); volFill(g, 0, 0, s * .5, '#2a2230'); g.fillStyle = '#ff7a1a'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 8; g.fillRect(-2, -s * .2, 4, s * .3); g.shadowBlur = 0; },
  shard(g, s, v) { g.beginPath(); g.moveTo(0, -s * .45); g.lineTo(s * .18, 0); g.lineTo(0, s * .35); g.lineTo(-s * .18, 0); g.closePath(); volFill(g, 0, 0, s * .4, ['#5a3a9a', '#3a2a6a', '#7b4fd6'][v % 3], .5); g.strokeStyle = 'rgba(200,170,255,.6)'; g.lineWidth = 1; g.stroke(); },
  crystal(g, s, v) { for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * s * .15 - s * .07, s * .3); g.lineTo(i * s * .15, -s * (.3 + (i + v + 3) % 3 * .1)); g.lineTo(i * s * .15 + s * .07, s * .3); g.closePath(); volFill(g, i * s * .15, 0, s * .3, ['#6a4ab0', '#8a6ad0', '#4a2a8a'][i + 1], .6); } },
  runestone(g, s) { g.beginPath(); g.moveTo(-s * .25, s * .45); g.lineTo(-s * .3, -s * .2); g.lineTo(0, -s * .45); g.lineTo(s * .3, -s * .2); g.lineTo(s * .25, s * .45); g.closePath(); volFill(g, 0, 0, s * .45, '#302838'); g.strokeStyle = '#b394ff'; g.lineWidth = 2; g.shadowColor = '#b394ff'; g.shadowBlur = 6; g.beginPath(); g.moveTo(0, -s * .25); g.lineTo(-s * .1, s * .1); g.lineTo(s * .1, 0); g.lineTo(0, s * .3); g.stroke(); g.shadowBlur = 0; },
  voidpool(g, s) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * .5); gr.addColorStop(0, '#000'); gr.addColorStop(.7, '#1a0a30'); gr.addColorStop(1, 'rgba(60,20,100,0)'); ell(g, 0, 0, s * .5, s * .3, gr); },
  grass(g, s, v) { g.lineWidth = 1.5; for (let i = 0; i < 8; i++) { g.strokeStyle = ['#2e3a26', '#3a3a2a', '#26301f'][(v + i) % 3]; g.beginPath(); g.moveTo(i * 2.5 - 9, s * .2); g.quadraticCurveTo(i * 2.5 - 9, -s * .05, i * 2.5 - 9 + (i % 2 ? 4 : -4), -s * .15 - (i % 3) * 3); g.stroke(); } },
  puddle(g, s) { ell(g, 0, 0, s * .45, s * .22, 'rgba(90,130,150,.28)'); g.strokeStyle = 'rgba(180,220,240,.2)'; g.beginPath(); g.ellipse(0, 0, s * .3, s * .14, 0, 0, TAU); g.stroke(); g.fillStyle = 'rgba(220,240,255,.25)'; ell(g, -s * .15, -s * .05, s * .1, s * .03); g.fill(); },
  ashpile(g, s) { ell(g, 0, 0, s * .45, s * .2, 'rgba(120,110,100,.35)'); ell(g, -s * .1, -s * .05, s * .25, s * .1, 'rgba(150,140,130,.3)'); },
  // новые земли
  snowdrift(g, s, v) { g.beginPath(); g.moveTo(-s * .5, s * .2); g.quadraticCurveTo(-s * .2, -s * .25 - v * 2, s * .1, -s * .05); g.quadraticCurveTo(s * .35, -s * .2, s * .5, s * .2); g.closePath(); volFill(g, 0, 0, s * .5, '#c8d6e0', .6, -.35); },
  icecrystal(g, s, v) { for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * s * .1 - s * .05, s * .3); g.lineTo(i * s * .12 + (i * s * .05), -s * (.2 + ((i + v + 5) % 3) * .12)); g.lineTo(i * s * .1 + s * .05, s * .3); g.closePath(); volFill(g, 0, 0, s * .35, '#9fd4ff', .7, -.3); } },
  monkstatue(g, s) { humanoid(g, s * .45, 0, { cloth: '#7a8088', cloth2: '#9aa0a8', robe: true, head: 'hood', hoodCol: '#6a7078', arms: 'none' }); g.fillStyle = 'rgba(230,245,255,.8)'; ell(g, -s * .05, -s * .5, s * .18, s * .05); g.fill(); ell(g, 0, -s * .1, s * .22, s * .05); g.fill(); },
  frozentree(g, s, v) { DECOR.tree(g, s, v); g.strokeStyle = 'rgba(230,245,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-s * .05, s * .1); g.lineTo(-s * .05, -s * .2); g.stroke(); },
  reeds(g, s, v) { for (let i = 0; i < 9; i++) { const x = -s * .3 + i * s * .07; g.strokeStyle = ['#3a4a2a', '#4a5a30', '#2a3a20'][(i + v) % 3]; g.lineWidth = 2; g.beginPath(); g.moveTo(x, s * .3); g.quadraticCurveTo(x + (i % 2 ? 3 : -3), 0, x + (i % 3 - 1) * 5, -s * .35 - (i % 3) * 3); g.stroke(); if (i % 3 === 0) { ell(g, x + (i % 3 - 1) * 5, -s * .3, 2.5, 6, '#5a3a20'); } } },
  bog(g, s) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * .5); gr.addColorStop(0, 'rgba(60,90,30,.75)'); gr.addColorStop(1, 'rgba(40,60,20,0)'); ell(g, 0, 0, s * .5, s * .3, gr); for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(160,200,90,.35)'; g.beginPath(); g.arc(-s * .2 + i * s * .13, (i % 2) * s * .05, 2 + i, 0, TAU); g.stroke(); } },
  deadlog(g, s) { limb(g, -s * .45, s * .05, s * .45, -s * .05, s * .1, s * .09, '#3a2a1e'); g.fillStyle = '#6a5a3a'; ell(g, s * .45, -s * .05, s * .06, s * .09); g.fill(); ell(g, -s * .1, -s * .12, s * .08, s * .04, '#8a7a4a'); },
  mushrooms(g, s, v) { for (let i = 0; i < 4; i++) { const x = -s * .25 + i * s * .16, h = s * (.15 + ((i + v) % 3) * .06); g.fillStyle = '#d8ccb0'; g.fillRect(x - 1.5, -h, 3, h + s * .1); vol(g, x, -h, s * .09, s * .05, ['#8b2a1a', '#6a8a3a', '#c8a04a'][(i + v) % 3], 0, .5); } },
  gibbet(g, s) { g.fillStyle = '#2a2018'; g.fillRect(-s * .3, -s * .55, s * .06, s * 1.05); g.fillRect(-s * .3, -s * .55, s * .5, s * .05); g.strokeStyle = '#4a4a44'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(s * .15, -s * .5); g.lineTo(s * .15, -s * .35); g.stroke(); g.strokeRect(s * .03, -s * .35, s * .24, s * .4); HEADS.skull(g, s * .15, -s * .2, s * .07); },
  skullpile(g, s) { for (let i = 0; i < 6; i++) HEADS.skull(g, -s * .25 + (i % 3) * s * .22 + (i > 2 ? s * .1 : 0), s * .15 - (i > 2 ? s * .18 : 0), s * .1); },
  candles(g, s, v) { for (let i = 0; i < 5; i++) { const x = -s * .3 + i * s * .15, h = s * (.15 + ((i + v) % 3) * .08); g.fillStyle = '#e8dcc0'; g.fillRect(x - 2.5, -h, 5, h); glowDot(g, x, -h - 3, 1.5, '#ffb14a'); } },
  sarcophagus(g, s) { g.beginPath(); g.moveTo(-s * .45, -s * .2); g.lineTo(s * .45, -s * .25); g.lineTo(s * .5, s * .15); g.lineTo(-s * .45, s * .2); g.closePath(); volFill(g, 0, 0, s * .5, '#5a524a'); HEADS.skull(g, -s * .3, -s * .02, s * .09); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-s * .2, -s * .05); g.lineTo(s * .4, -s * .08); g.stroke(); },
  bonepillar(g, s, v) { DECOR.pillar(g, s, v); for (let i = 0; i < 4; i++) HEADS.skull(g, -s * .1 + (i % 2) * s * .2, s * .3 - i * s * .15 - (v % 2 ? s * .2 : 0), s * .08); },
  cobweb(g, s) { g.strokeStyle = 'rgba(220,220,220,.35)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s * .45, -Math.sin(a) * s * .45); g.stroke(); } for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(0, 0, s * .15 * k, Math.PI, TAU); g.stroke(); } },
  pine(g, s, v) { g.fillStyle = '#2a1e16'; g.fillRect(-s * .04, s * .1, s * .08, s * .4); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-s * (.38 - i * .07), s * (.2 - i * .18)); g.lineTo(0, -s * (.25 + i * .14)); g.lineTo(s * (.38 - i * .07), s * (.2 - i * .18)); g.closePath(); volFill(g, 0, -s * i * .1, s * .45, ['#1e2a1c', '#243222', '#1a2418'][(v + i) % 3], .3); } },
  stump(g, s) { g.beginPath(); g.rect(-s * .2, -s * .15, s * .4, s * .4); volFill(g, 0, 0, s * .3, '#3a2a1e'); vol(g, 0, -s * .15, s * .2, s * .07, '#6a5438'); g.strokeStyle = '#4a3a22'; g.beginPath(); g.ellipse(0, -s * .15, s * .1, s * .035, 0, 0, TAU); g.stroke(); },
  bloodflowers(g, s, v) { for (let i = 0; i < 6; i++) { const x = -s * .3 + i * s * .12, y = ((i + v) % 3) * s * .06 - s * .05; g.strokeStyle = '#2a3a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + s * .2); g.lineTo(x, y); g.stroke(); for (let k = 0; k < 5; k++) ell(g, x + Math.cos(k * 1.26) * 3, y + Math.sin(k * 1.26) * 3, 2.5, 1.6, '#a81a2a', k * 1.26); circ(g, x, y, 1.5, '#1a0a0a'); } },
  totem(g, s) { for (let i = 0; i < 3; i++) { g.beginPath(); g.rect(-s * .14, -s * .45 + i * s * .3, s * .28, s * .3); volFill(g, 0, -s * .3 + i * s * .3, s * .25, ['#4a3a2a', '#5a3a2a', '#3a2a1e'][i]); g.fillStyle = '#c21a1a'; g.fillRect(-s * .08, -s * .38 + i * s * .3, s * .05, s * .05); g.fillRect(s * .03, -s * .38 + i * s * .3, s * .05, s * .05); } },
  boulder(g, s, v) { vol(g, 0, 0, s * .4, s * .3, ['#44403a', '#3a3632', '#4a4640'][v % 3]); g.fillStyle = 'rgba(60,90,40,.5)'; ell(g, -s * .1, -s * .22, s * .2, s * .07); g.fill(); },
};
const BIOME_DECOR = {
  cemetery: [['grave', 6, 44], ['cross', 3, 40], ['tree', 2, 110], ['fence', 1, 70], ['grass', 5, 26]],
  cathedral: [['pillar', 3, 90], ['glass', 4, 50], ['pew', 2, 70], ['puddle', 4, 70], ['grave', 1, 40]],
  wastes: [['rock', 4, 50], ['lava', 3, 80], ['bones', 3, 40], ['obelisk', 1, 90], ['ashpile', 4, 60]],
  abyss: [['shard', 4, 46], ['crystal', 3, 50], ['runestone', 2, 60], ['voidpool', 2, 90], ['shard', 2, 30]],
  frost: [['snowdrift', 5, 60], ['icecrystal', 3, 50], ['monkstatue', 1, 70], ['frozentree', 2, 110], ['grave', 2, 44]],
  swamp: [['reeds', 5, 50], ['bog', 3, 90], ['deadlog', 2, 80], ['mushrooms', 4, 36], ['gibbet', 1, 80]],
  catacombs: [['skullpile', 3, 50], ['candles', 3, 40], ['sarcophagus', 2, 80], ['bonepillar', 2, 90], ['cobweb', 3, 50]],
  forest: [['pine', 5, 110], ['stump', 3, 40], ['bloodflowers', 4, 40], ['totem', 1, 80], ['boulder', 2, 60]],
};
const GROUND = {
  cemetery: ['#161a14', ['#1e2419', '#12160f', '#222a1c', '#191d15']],
  cathedral: ['#10161a', ['#162028', '#0c1216', '#1a262e', '#121a20']],
  wastes: ['#1a1210', ['#261810', '#140d0a', '#2e1c10', '#1c120c']],
  abyss: ['#110c18', ['#1a1226', '#0c0812', '#221830', '#140e1e']],
  frost: ['#2a323a', ['#3a444e', '#222a32', '#46525c', '#2e3842']],
  swamp: ['#141a10', ['#1c2614', '#0e140a', '#243018', '#161e10']],
  catacombs: ['#16120e', ['#201a14', '#0e0b08', '#2a221a', '#18140f']],
  forest: ['#12100e', ['#1c1812', '#0c0a08', '#221c14', '#18140e']],
};
function buildGround(biome) {
  const S = 512, c = mkCanvas(S), g = c.getContext('2d'), [base, spk] = GROUND[biome], rng = mulberry32(biome.length * 999 + biome.charCodeAt(0));
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  // крупные пятна (с переносом через край, чтобы тайл был бесшовным)
  const blot = (x, y, r, col) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, col); gr.addColorStop(1, rgba(base, 0)); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } };
  for (let i = 0; i < 26; i++) blot(rng() * S, rng() * S, 40 + rng() * 110, rgba(spk[i % 4].startsWith('#') ? spk[i % 4] : base, .55));
  for (let i = 0; i < 2600; i++) { g.fillStyle = spk[i % 4]; const x = rng() * S, y = rng() * S, r = rng() * 3 + .6; g.globalAlpha = .5 + rng() * .5; g.fillRect(x, y, r, r * (.5 + rng())); }
  g.globalAlpha = 1;
  if (biome === 'cathedral' || biome === 'catacombs') { g.strokeStyle = biome === 'cathedral' ? 'rgba(90,120,140,.14)' : 'rgba(120,100,80,.14)'; g.lineWidth = 2; for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); } for (let j = 0; j < S; j += 32) { g.beginPath(); g.moveTo(0, j); g.lineTo(S, j); g.stroke(); } }
  if (biome === 'wastes') { g.strokeStyle = 'rgba(255,90,20,.1)'; g.lineWidth = 1.2; for (let i = 0; i < 10; i++) { g.beginPath(); let x = rng() * S, y = rng() * S; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += rng() * 50 - 25; y += rng() * 50 - 25; g.lineTo(x, y); } g.stroke(); } }
  if (biome === 'abyss') for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(123,79,214,${rng() * .08})`; g.beginPath(); g.arc(rng() * S, rng() * S, rng() * 22 + 4, 0, TAU); g.fill(); }
  if (biome === 'frost') for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${rng() * .35})`; g.fillRect(rng() * S, rng() * S, 1.2, 1.2); }
  if (biome === 'swamp') for (let i = 0; i < 18; i++) { const x = rng() * S, y = rng() * S; g.fillStyle = 'rgba(50,80,30,.35)'; g.beginPath(); g.ellipse(x, y, 20 + rng() * 40, 10 + rng() * 16, 0, 0, TAU); g.fill(); }
  if (biome === 'forest' || biome === 'cemetery') for (let i = 0; i < 160; i++) { g.strokeStyle = biome === 'forest' ? 'rgba(90,40,30,.25)' : 'rgba(60,80,40,.25)'; g.lineWidth = 1; const x = rng() * S, y = rng() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng() * 4 - 2, y - 4 - rng() * 4); g.stroke(); }
  Sprites.ground[biome] = c;
}
// туман: мягкие светлые клубы на прозрачном фоне
function buildFog(biome) {
  const S = 512, c = mkCanvas(S), g = c.getContext('2d'), rng = mulberry32(biome.length * 131), col = BIOME[biome].fogCol || '#aab0a0';
  for (let i = 0; i < 22; i++) { const x = rng() * S, y = rng() * S, r = 60 + rng() * 120; for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, rgba(col, .22)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } }
  Sprites.fog[biome] = c;
}

// иконки нового оружия и предметов
Object.assign(ICON, {
  crossbow(g) { g.rotate(-.6); g.strokeStyle = '#6b4a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 20); g.stroke(); g.strokeStyle = '#8a8f98'; g.lineWidth = 3; g.beginPath(); g.arc(0, 4, 16, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.strokeStyle = '#ddd'; g.lineWidth = 1; g.beginPath(); g.moveTo(-13, -5); g.lineTo(0, 8); g.lineTo(13, -5); g.stroke(); poly(g, [0, -22, 3, -14, -3, -14], '#dfe4ea'); },
  bell(g) { g.beginPath(); g.moveTo(-14, 12); g.quadraticCurveTo(-12, -16, 0, -16); g.quadraticCurveTo(12, -16, 14, 12); g.closePath(); volFill(g, 0, -2, 16, '#c9a44a', .5); g.fillStyle = '#6a5020'; g.fillRect(-16, 10, 32, 4); vol(g, 0, 17, 4, 4, '#8a6a2a'); g.fillStyle = '#6a5020'; g.fillRect(-2, -21, 4, 6); },
  sickles(g) { for (const s of [-1, 1]) { g.save(); g.scale(s, 1); g.translate(5, 0); g.strokeStyle = '#dfe4ea'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, -4, 12, -1.2, 1.8); g.stroke(); g.strokeStyle = '#5a3a1e'; g.lineWidth = 3; g.beginPath(); g.moveTo(-3, 8); g.lineTo(-6, 18); g.stroke(); g.restore(); } },
  wisps(g) { for (const [x, y, r] of [[-8, 6, 7], [8, 2, 6], [0, -10, 8]]) { g.drawImage(Sprites.glow.green || mkCanvas(1), x - r * 2, y - r * 2, r * 4, r * 4); circ(g, x, y, r * .45, '#f0fff0'); } },
  meteor(g) { g.strokeStyle = 'rgba(255,150,50,.8)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-18, -18); g.lineTo(2, 2); g.stroke(); vol(g, 6, 6, 10, 10, '#7a4022'); g.fillStyle = '#ffb14a'; g.fillRect(3, 3, 3, 3); },
  whip(g) { g.strokeStyle = '#6b3a1e'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, 16); g.bezierCurveTo(-4, -20, 10, 20, 18, -14); g.stroke(); g.fillStyle = '#3a2210'; g.save(); g.translate(-16, 16); g.rotate(-.9); g.fillRect(-3, -2, 12, 5); g.restore(); },
  quiver(g) { g.rotate(.4); g.beginPath(); g.rect(-7, -10, 14, 28); volFill(g, 0, 4, 14, '#6a3a1e'); for (let i = -1; i <= 1; i++) { g.strokeStyle = '#c8b08a'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 4, -10); g.lineTo(i * 4, -20); g.stroke(); poly(g, [i * 4, -22, i * 4 - 3, -17, i * 4 + 3, -17], '#8b1a1a'); } },
  hourglass(g) { g.fillStyle = '#6a4a2a'; g.fillRect(-12, -18, 24, 4); g.fillRect(-12, 14, 24, 4); g.beginPath(); g.moveTo(-9, -14); g.lineTo(9, -14); g.lineTo(1, 0); g.lineTo(9, 14); g.lineTo(-9, 14); g.lineTo(-1, 0); g.closePath(); g.fillStyle = 'rgba(200,230,255,.3)'; g.fill(); poly(g, [-6, 14, 6, 14, 0, 6], '#1a1a1a'); poly(g, [-5, -10, 5, -10, 0, -3], '#1a1a1a'); },
  whetstone(g) { g.rotate(-.3); g.beginPath(); g.rect(-16, -6, 32, 12); volFill(g, 0, 0, 16, '#6a6e76', .5); g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(-12, -2); g.lineTo(12, -2); g.stroke(); },
  candle(g) { g.fillStyle = '#e8dcc0'; g.fillRect(-5, -6, 10, 22); g.fillStyle = '#c8b898'; g.fillRect(-5, -6, 3, 22); glowDot(g, 0, -12, 3, '#ffb14a'); },
  starmap(g) { g.beginPath(); g.rect(-16, -14, 32, 28); volFill(g, 0, 0, 18, '#c8b890', .3); g.strokeStyle = '#3a2a4a'; g.lineWidth = 1; g.beginPath(); g.moveTo(-10, 6); g.lineTo(-2, -6); g.lineTo(6, 2); g.lineTo(11, -8); g.stroke(); for (const [x, y] of [[-10, 6], [-2, -6], [6, 2], [11, -8]]) circ(g, x, y, 2, '#3a2a4a'); },
  brand(g) { g.strokeStyle = '#5a5a5a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-14, 18); g.lineTo(0, 0); g.stroke(); g.strokeStyle = '#ff5a14'; g.lineWidth = 3.5; g.shadowColor = '#ff7a1a'; g.shadowBlur = 8; g.beginPath(); g.moveTo(0, -16); g.lineTo(0, 8); g.moveTo(-9, -6); g.lineTo(9, -6); g.stroke(); g.shadowBlur = 0; },
});
