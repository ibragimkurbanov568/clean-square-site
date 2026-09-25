// ==== 11. RENDERER ====
const Render = {
  cv: null, g: null, dc: null, dg: null, W: 0, H: 0, dpr: 1, scale: 1, alpha: 1, partMul: 1, lightScale: .5, glow: true, q: 'high',
  flashCol: '#fff', flashA: 0, flashDur: 1, pulses: [], patterns: {}, safe: { t: 0, b: 0, l: 0, r: 0 }, fps: 60, frames: 0, fpsT: 0, lowT: 0,
  init() {
    Render.cv = document.getElementById('cv'); Render.g = Render.cv.getContext('2d', { alpha: false });
    Render.dc = mkCanvas(4, 4); Render.dg = Render.dc.getContext('2d');
    const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe); Render.probe = probe;
    addEventListener('resize', Render.resize); addEventListener('orientationchange', () => setTimeout(Render.resize, 200));
    Render.resize(); Render.setQuality();
  },
  resize() {
    const dpr = Render.dpr = Math.min(CONFIG.DPR_MAX, devicePixelRatio || 1);
    const w = innerWidth, h = innerHeight; Render.W = Render.cv.width = Math.round(w * dpr); Render.H = Render.cv.height = Math.round(h * dpr);
    Render.scale = Math.min(Render.W, Render.H) / CONFIG.VIEW_UNITS;
    Game.vw = Render.W / Render.scale; Game.vh = Render.H / Render.scale;
    const cs = getComputedStyle(Render.probe); Render.safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    Render.resizeDark();
  },
  resizeDark() { Render.dc.width = Math.max(4, Math.round(Render.W * Render.lightScale)); Render.dc.height = Math.max(4, Math.round(Render.H * Render.lightScale)); },
  setQuality(q) {
    const s = Game.save ? Game.save.settings.quality : 'auto'; q = q || (s === 'auto' ? (Render.q || 'high') : s);
    Render.q = q; const Q = CONFIG.QUALITY[q]; Render.partMul = Q.parts; Render.lightScale = Q.lightScale; Render.glow = Q.glow; Render.resizeDark();
  },
  autoQuality(dt) {
    Render.frames++; Render.fpsT += dt;
    if (Render.fpsT >= .5) { Render.fps = Render.frames / Render.fpsT; Render.frames = 0; Render.fpsT = 0;
      if (Game.save.settings.quality === 'auto' && Game.state === 'RUN') {
        if (Render.fps < 50) Render.lowT += .5; else Render.lowT = 0;
        if (Render.lowT >= 2) { Render.lowT = 0; if (Render.q === 'high') Render.setQuality('mid'); else if (Render.q === 'mid') Render.setQuality('low'); }
      } }
  },
  flashScreen(col, dur) { Render.flashCol = col; Render.flashA = Game.save.settings.reduceFlash ? .25 : .75; Render.flashDur = dur; },
  lightPulse(x, y) { Render.pulses.push({ x, y, t: .6 }); },
  lightRadius() {
    const run = Game.run, p = run.player, ch = CHAR[run.char];
    if (run.blackoutT > 0) return 70;
    if (ch.noLight) return 100;
    const r = p.light / p.lightMax;
    return (CONFIG.LIGHT_R_MIN + (CONFIG.LIGHT_R_MAX - CONFIG.LIGHT_R_MIN) * r) * p.stats.lightR * (1 - run.eclipseFx * .35);
  },
  pattern(b) { if (!Render.patterns[b]) Render.patterns[b] = Render.g.createPattern(Sprites.ground[b], 'repeat'); return Render.patterns[b]; },

  frame(dt) {
    Render.autoQuality(dt);
    if (Render.flashA > 0) Render.flashA = Math.max(0, Render.flashA - dt / Render.flashDur);
    for (let i = Render.pulses.length - 1; i >= 0; i--) { Render.pulses[i].t -= dt; if (Render.pulses[i].t <= 0) Render.pulses.splice(i, 1); }
    if (Game.run && ['RUN', 'LEVELUP', 'CHEST', 'PAUSE', 'DAWN'].includes(Game.state)) Render.world(dt);
    else Render.camp();
    const g = Render.g;
    if (Render.flashA > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = Render.flashA; g.fillStyle = Render.flashCol; g.fillRect(0, 0, Render.W, Render.H); g.globalAlpha = 1; }
    if (Game.save.settings.fps) { g.setTransform(1, 0, 0, 1, 0, 0); g.font = `${12 * Render.dpr}px monospace`; g.fillStyle = '#9f9'; g.textAlign = 'left';
      const objs = Enemies.n + Projs.n + Embers.n + Parts.alive; g.fillText(`${L('fpsLabel')} ${Render.fps.toFixed(0)} · ${objs} ${L('objLabel')} · ${Render.q}`, 8 * Render.dpr, Render.H - (10 + Render.safe.b) * Render.dpr); }
  },

  world(dt) {
    const g = Render.g, run = Game.run, p = run.player, a = Render.alpha, S = Render.scale, W = Render.W, H = Render.H;
    const ppx = lerp(p.px, p.x, a), ppy = lerp(p.py, p.y, a);
    run.camX = lerp(run.camX, ppx, .2); run.camY = lerp(run.camY, ppy, .2);
    if (Math.abs(run.camX - ppx) > 300) { run.camX = ppx; run.camY = ppy; }
    let sx = 0, sy = 0; if (run.shake > 0 && Game.save.settings.shake) { sx = rand(-run.shake, run.shake); sy = rand(-run.shake, run.shake); }
    const cx = run.camX + sx, cy = run.camY + sy, hw = Game.vw / 2 + 60, hh = Game.vh / 2 + 60;
    const inView = (x, y, m = 0) => x > cx - hw - m && x < cx + hw + m && y > cy - hh - m && y < cy + hh + m;
    g.setTransform(S, 0, 0, S, W / 2 - cx * S, H / 2 - cy * S);
    // земля
    g.fillStyle = Render.pattern(run.biome); g.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
    // декор и лампы
    const now = performance.now() / 1000;
    World.forNear(cx, cy, c => {
      for (const d of c.decor) if (inView(d.x, d.y, 80)) g.drawImage(d.sp, d.x - d.sp.width / 2, d.y - d.sp.height / 2);
      for (const l of c.lamps) if (inView(l.x, l.y, 40)) { const br = run.lampsBroken.has(l.key); g.drawImage(br ? Sprites.misc.lampBroken : Sprites.misc.lamp, l.x - 20, l.y - 44); }
    });
    // зоны
    for (const z of Zones.items) {
      if (!z.active || !inView(z.x, z.y, z.r)) continue;
      if (z.delay > 0) {
        const k = z.kind === 'rune' ? 1 - z.delay / 2 : 1 - z.delay / .5;
        if (z.kind === 'rune') { g.save(); g.translate(z.x, z.y); g.rotate(now * 2); g.strokeStyle = `rgba(255,50,50,${.4 + k * .5})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, z.r * .35, 0, TAU);
          for (let i = 0; i < 5; i++) { const aa = i / 5 * TAU * 2; g.lineTo(Math.cos(aa) * z.r * .35, Math.sin(aa) * z.r * .35); } g.stroke(); g.globalAlpha = .15 + k * .2; g.fillStyle = '#b3261e'; g.beginPath(); g.arc(0, 0, z.r * k, 0, TAU); g.fill(); g.restore(); g.globalAlpha = 1; }
        else if (z.kind === 'strike') { g.strokeStyle = `rgba(255,230,150,${.3 + clamp(k, 0, 1) * .6})`; g.lineWidth = 2; g.beginPath(); g.arc(z.x, z.y, z.r * clamp(k, .1, 1), 0, TAU); g.stroke(); }
        continue;
      }
      const f = Math.min(1, z.life / .4);
      if (z.kind === 'poison') { g.globalAlpha = .55 * f; g.drawImage(Sprites.glow.green, z.x - z.r * 1.3, z.y - z.r * 1.3, z.r * 2.6, z.r * 2.6); }
      else if (z.kind === 'fire') { g.globalAlpha = .7 * f * (.85 + Math.sin(now * 20 + z.x) * .15); g.drawImage(Sprites.glow.fire, z.x - z.r * 1.3, z.y - z.r * 1.3, z.r * 2.6, z.r * 2.6); }
      else if (z.kind === 'frostaura') { g.globalAlpha = .18; g.strokeStyle = '#bfeaff'; g.lineWidth = 3; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke(); g.globalAlpha = .06; g.fillStyle = '#9fd4ff'; g.fill(); }
      g.globalAlpha = 1;
    }
    // опасные зоны врагов
    const hatch = Render.hatch || (Render.hatch = g.createPattern(Sprites.misc.hatch, 'repeat'));
    for (const h of Hazards.items) {
      if (!h.active || !inView(h.x, h.y, h.r)) continue;
      if (h.kind === 'slow') { g.globalAlpha = Math.min(1, h.life) * .6; g.fillStyle = '#2a5a6a'; g.beginPath(); g.ellipse(h.x, h.y, h.r, h.r * .6, 0, 0, TAU); g.fill(); g.globalAlpha = 1; continue; }
      if (!h.fired) {
        const k = 1 - h.tele / h.tmax, col = Game.save.settings.colorblind ? '255,200,0' : '255,40,30';
        g.fillStyle = `rgba(${col},${.12 + k * .25})`; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill();
        g.fillStyle = `rgba(${col},${.25 + k * .35})`; g.beginPath(); g.arc(h.x, h.y, h.r * k, 0, TAU); g.fill();
        g.globalAlpha = .35; g.fillStyle = hatch; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = `rgba(${col},.9)`; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke();
      } else {
        const k = h.life / .25; g.globalAlpha = k;
        if (h.kind === 'hand') { g.fillStyle = '#0a0610'; for (let i = 0; i < 5; i++) { const aa = -Math.PI / 2 + (i - 2) * .35; g.beginPath(); g.moveTo(h.x + Math.cos(aa) * h.r * .2, h.y); g.lineTo(h.x + Math.cos(aa) * h.r * .9, h.y + Math.sin(aa) * h.r * 1.1); g.lineTo(h.x + Math.cos(aa + .12) * h.r * .3, h.y); g.fill(); } }
        g.drawImage(h.kind === 'hand' ? Sprites.glow.violet : Sprites.glow.red, h.x - h.r * 1.2, h.y - h.r * 1.2, h.r * 2.4, h.r * 2.4); g.globalAlpha = 1;
      }
    }
    // угли и предметы
    const emb = Game.save.settings.colorblind ? Sprites.emberCb : Sprites.ember;
    for (const m of Embers.items) { if (!m.active || !inView(m.x, m.y)) continue; const sp = emb[m.tier]; g.drawImage(sp, m.x - sp.width / 2, m.y - sp.height / 2 + Math.sin(now * 4 + m.x) * 2); }
    for (const it of Items.items) {
      if (!it.active || !inView(it.x, it.y)) continue; const bob = Math.sin(now * 3 + it.x) * 3;
      if (it.kind === 'chest') { if (Render.glow) g.drawImage(Sprites.glow.gold, it.x - 50, it.y - 50, 100, 100); g.drawImage(Sprites.misc.chest, it.x - 24, it.y - 26 + bob); }
      else if (it.kind === 'lampItem') g.drawImage(Sprites.misc.lamp, it.x - 20, it.y - 44);
      else { const sp = Sprites.misc[it.kind]; g.drawImage(sp, it.x - sp.width / 2, it.y - sp.height / 2 + bob); }
    }
    // враги
    const lr = Render.lightRadius(), lr2 = (lr * .95) ** 2;
    for (const e of Enemies.items) {
      if (!e.active || e.under) { if (e.active && e.under && inView(e.x, e.y)) { g.fillStyle = 'rgba(80,60,40,.5)'; g.beginPath(); g.ellipse(e.x, e.y, 14, 5, 0, 0, TAU); g.fill(); } continue; }
      const ex = lerp(e.px, e.x, a), ey = lerp(e.py, e.y, a); if (!inView(ex, ey, e.r * 2)) continue;
      const d2 = dist2(ex, ey, ppx, ppy);
      if (e.id === 'shade' && d2 > lr2) continue;
      const spr = Sprites.enemy[e.id]; if (!spr) continue;
      const fr = ((e.anim * (e.def.spd > 90 ? 8 : 4)) | 0) % 2, img = e.flashT > 0 && (!e.big || ((now * 24) | 0) % 2) ? spr.white[fr] : spr.frames[fr];
      const sc = e.scale * (spr.r ? e.r / e.scale / spr.r : 1), size = spr.size * sc;
      if (e.elite && Render.glow) g.drawImage(Sprites.glow.gold, ex - e.r * 2, ey - e.r * 2, e.r * 4, e.r * 4);
      if (e.boss && Render.glow) g.drawImage(e.id === 'rotmother' ? Sprites.glow.green : Sprites.glow.violet, ex - e.r * 2.2, ey - e.r * 2.2, e.r * 4.4, e.r * 4.4);
      const flip = e.boss ? ppx < ex : (e.vx || (ppx - ex)) < 0;
      if (e.id === 'shade') g.globalAlpha = clamp(1 - Math.sqrt(d2) / lr, .2, 1);
      if (flip) { g.save(); g.translate(ex, ey); g.scale(-1, 1); g.drawImage(img, -size / 2, -size / 2, size, size); g.restore(); }
      else g.drawImage(img, ex - size / 2, ey - size / 2, size, size);
      g.globalAlpha = 1;
      if (e.frozenT > 0) { g.globalAlpha = .6; g.drawImage(Sprites.glow.ice, ex - e.r * 1.4, ey - e.r * 1.4, e.r * 2.8, e.r * 2.8); g.globalAlpha = 1; }
      if (e.burnT > 0 && Math.random() < .3) emit(ex + rand(-e.r, e.r) * .5, ey - e.r * .3, 1, 0, 20, .4, 3, -60);
      if (e.def.beh === 'dash' && e.st === 1) { g.strokeStyle = 'rgba(255,60,40,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey, e.r * 1.3, 0, TAU); g.stroke(); }
      if (e.elite && !e.boss) { const w = e.r * 2; g.fillStyle = '#300'; g.fillRect(ex - w / 2, ey - e.r - 10, w, 4); g.fillStyle = '#e2b24a'; g.fillRect(ex - w / 2, ey - e.r - 10, w * clamp(e.hp / e.maxHp, 0, 1), 4); }
    }
    // игрок
    Render.player(g, ppx, ppy, now);
    // снаряды
    for (const o of Projs.items) if (o.active && inView(o.x, o.y, 60)) Render.proj(g, o, now);
    for (const b of Bullets.items) {
      if (!b.active || !inView(b.x, b.y)) continue;
      const gl = b.kind === 'acid' ? Sprites.glow.green : b.kind === 'skull' ? Sprites.glow.white : b.kind === 'note' ? Sprites.glow.ice : Sprites.glow.violet;
      g.drawImage(gl, b.x - b.r * 2.5, b.y - b.r * 2.5, b.r * 5, b.r * 5);
      if (b.kind === 'skull') { circ(g, b.x, b.y - 1, b.r * .8, '#e8e1cf'); g.fillStyle = '#1a0f22'; g.fillRect(b.x - b.r * .45, b.y - b.r * .3, b.r * .3, b.r * .3); g.fillRect(b.x + b.r * .15, b.y - b.r * .3, b.r * .3, b.r * .3); }
      else circ(g, b.x, b.y, b.r * .6, b.kind === 'acid' ? '#c6f07a' : '#fff');
    }
    // частицы
    for (let i = 0; i < Parts.n; i++) {
      if (Parts.life[i] <= 0) continue; const x = Parts.x[i], y = Parts.y[i]; if (x < cx - hw || x > cx + hw || y < cy - hh || y > cy + hh) continue;
      const k = Parts.life[i] / Parts.max[i], s = Parts.size[i] * (.4 + k * .6); g.globalAlpha = k; g.fillStyle = PCOL[Parts.col[i]]; g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = 1;
    // эффекты
    g.globalCompositeOperation = 'lighter';
    for (const f of FX.items) if (f.active) Render.fx(g, f);
    g.globalCompositeOperation = 'source-over';
    // ---------- тьма ----------
    Render.darkness(cx, cy, ppx, ppy, lr, now);
    // тёплый отсвет факела
    g.setTransform(S, 0, 0, S, W / 2 - cx * S, H / 2 - cy * S);
    if (!CHAR[run.char].noLight && Render.glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .12 + .04 * noise1(now * 6); g.drawImage(Sprites.glow.fire, ppx - lr * .8, ppy - lr * .8, lr * 1.6, lr * 1.6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    // глаза во тьме
    for (const e of Enemies.items) {
      if (!e.active || e.under) continue; const ex = lerp(e.px, e.x, a), ey = lerp(e.py, e.y, a); if (!inView(ex, ey)) continue;
      const E = EYES[e.id]; if (!E || !E[3]) continue; if (e.id === 'shade' && dist2(ex, ey, ppx, ppy) > lr2) continue;
      const flip = (e.vx || (ppx - ex)) < 0 ? -1 : 1, s = Math.max(1.6, e.r * .12), ox = ex + E[1] * e.r * flip, oy = ey + E[2] * e.r, sp = E[3] * e.r;
      g.fillStyle = e.blindT > 0 ? '#888' : E[0]; g.globalAlpha = e.frozenT > 0 ? .3 : .95;
      g.fillRect(ox - sp - s / 2, oy - s / 2, s, s); g.fillRect(ox + sp - s / 2, oy - s / 2, s, s);
    }
    g.globalAlpha = 1;
    // полоска здоровья под игроком
    if (run.dyingT <= 0) { const w = 34; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(ppx - w / 2 - 1, ppy + 22, w + 2, 5); g.fillStyle = p.hp < p.stats.maxHp * .3 ? '#ff3a2a' : '#c62f22'; g.fillRect(ppx - w / 2, ppy + 23, w * clamp(p.hp / p.stats.maxHp, 0, 1), 3); }
    // всплывающие цифры
    g.textAlign = 'center'; g.lineJoin = 'round';
    for (const t of Texts.items) {
      if (!t.active) continue; g.globalAlpha = Math.min(1, t.life * 3); g.font = `bold ${t.size}px ${'Georgia,serif'}`;
      g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText(t.text, t.x, t.y); g.fillStyle = t.col; g.fillText(t.text, t.x, t.y);
    }
    g.globalAlpha = 1;
    // экранные эффекты
    g.setTransform(1, 0, 0, 1, 0, 0);
    Render.overlays(g, now);
    Render.hud(g, now);
  },

  player(g, x, y, now) {
    const run = Game.run, p = run.player, ch = CHAR[run.char], spr = Sprites.player[run.char];
    if (run.dyingT > 0) { g.globalAlpha = clamp(run.dyingT / 1.6, 0, 1); }
    if (p.iframes > 0 && run.dyingT <= 0 && ((now * 20) | 0) % 2) g.globalAlpha = .45;
    const fr = Input.moving ? ((p.anim | 0) % 2) : 0, img = p.hurtT > 0 ? spr.white[fr] : spr.frames[fr], flip = p.fx < 0;
    g.save(); g.translate(x, y - 4); if (flip) g.scale(-1, 1); g.drawImage(img, -28, -32);
    // пламя факела
    const tx = 12.5, ty = -23 - 15, fl = noise1(now * 9) * .5 + .5, noL = ch.noLight;
    const cols = noL ? ['#1a0a2a', '#5a2a9a', '#b394ff'] : ['#b3261e', '#ff7a1a', '#ffe8a0'];
    const hgt = noL ? 12 : 8 + (p.light / p.lightMax) * 8;
    for (let i = 0; i < 3; i++) { const h = hgt * (1 - i * .28) * (.85 + fl * .3), w = 5.5 - i * 1.5; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(tx - w, ty); g.quadraticCurveTo(tx - w, ty - h * .5, tx + (fl - .5) * 3, ty - h); g.quadraticCurveTo(tx + w, ty - h * .5, tx + w, ty); g.closePath(); g.fill(); }
    g.restore(); g.globalAlpha = 1;
    if (Math.random() < .35 && run.dyingT <= 0) emit(x + (flip ? -tx : tx), y - 44, 1, noL ? 5 : 1, 20, .6, 2, -80);
  },

  proj(g, o, now) {
    switch (o.kind) {
      case 'boomer': { g.save(); g.translate(o.x, o.y); g.rotate(o.a); const ic = iconCanvas('shovel', 34); g.drawImage(ic, -17, -17); g.restore(); break; }
      case 'scythe': { g.save(); g.translate(o.x, o.y); g.rotate(o.a * 3); g.globalCompositeOperation = 'lighter'; g.drawImage(Sprites.glow.white, -o.r * 1.5, -o.r * 1.5, o.r * 3, o.r * 3);
        g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#e8e1cf'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, o.r, -.4, 2.2); g.stroke(); g.strokeStyle = '#6b4a2b'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(o.r * .9, o.r * .5); g.stroke(); g.restore(); break; }
      case 'orbit': { if (Render.glow) g.drawImage(Sprites.glow.gold, o.x - 28, o.y - 28, 56, 56); g.drawImage(iconCanvas('censer', 30), o.x - 15, o.y - 15); break; }
      case 'wolf': { g.save(); g.translate(o.x, o.y); g.rotate(o.ang); g.globalAlpha = .8; g.drawImage(Sprites.glow.green, -26, -26, 52, 52);
        ell(g, 0, 0, 16, 8, '#bfffe0'); ell(g, 14, 0, 8, 6, '#dafff0'); poly(g, [16, -5, 20, -12, 21, -4], '#dafff0'); poly(g, [-14, 0, -26, -4 + Math.sin(now * 20) * 3, -24, 3], '#9affd8'); circ(g, 18, -2, 1.5, '#0a3a2a'); g.restore(); g.globalAlpha = 1; break; }
      case 'arrow': { g.save(); g.translate(o.x, o.y); g.rotate(o.ang); g.strokeStyle = '#9affd8'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-14, 0); g.lineTo(6, 0); g.stroke(); poly(g, [10, 0, 3, -4, 3, 4], '#e0fff4'); g.restore(); break; }
      case 'dagger': { g.save(); g.translate(o.x, o.y); g.rotate(o.ang); poly(g, [12, 0, 0, -3, -4, 0, 0, 3], '#dfe4ea'); g.fillStyle = '#5a3a2a'; g.fillRect(-10, -1.5, 7, 3); g.restore(); break; }
      case 'ice': { g.save(); g.translate(o.x, o.y); g.rotate(o.ang); if (Render.glow) g.drawImage(Sprites.glow.ice, -18, -18, 36, 36); poly(g, [14, 0, 0, -5, -10, 0, 0, 5], '#dff6ff', '#6ab8ff', 1); g.restore(); break; }
      case 'flask': { g.save(); g.translate(o.x, o.y); g.rotate(o.a); g.drawImage(iconCanvas('flask', 22), -11, -11); g.restore(); break; }
      case 'wave': { if (o.n < 0) break; const k = o.life / o.max; g.strokeStyle = `rgba(60,20,110,${.8 * k})`; g.lineWidth = 26; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.stroke();
        g.strokeStyle = `rgba(180,140,255,${.7 * k})`; g.lineWidth = 3; g.beginPath(); g.arc(o.x, o.y, o.r + 10, 0, TAU); g.stroke(); break; }
    }
  },

  fx(g, f) {
    const k = f.life / f.max;
    switch (f.kind) {
      case 'slash': { g.strokeStyle = f.col; g.globalAlpha = k; g.lineWidth = 16 * k + 2; g.beginPath(); g.arc(f.x, f.y, f.r * (1.05 - k * .2), f.a - 1.1, f.a + 1.1); g.stroke();
        g.lineWidth = 3; g.globalAlpha = k * .6; g.beginPath(); g.arc(f.x, f.y, f.r * .7, f.a - .9, f.a + .9); g.stroke(); break; }
      case 'ring': { g.strokeStyle = f.col; g.globalAlpha = k; g.lineWidth = 6 * k + 1; g.beginPath(); g.arc(f.x, f.y, f.r * (1 - k * .85), 0, TAU); g.stroke(); break; }
      case 'dust': { g.strokeStyle = f.col; g.globalAlpha = k; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, f.r * (1.5 - k), 0, TAU); g.stroke(); break; }
      case 'bolt': { if (!f.pts) break; g.strokeStyle = f.col; g.globalAlpha = k; g.lineWidth = 3; g.beginPath(); g.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) { const mx = (f.pts[i - 2] + f.pts[i]) / 2 + rand(-12, 12), my = (f.pts[i - 1] + f.pts[i + 1]) / 2 + rand(-12, 12); g.lineTo(mx, my); g.lineTo(f.pts[i], f.pts[i + 1]); } g.stroke();
        g.lineWidth = 8; g.globalAlpha = k * .25; g.stroke(); break; }
      case 'pillar': { g.globalAlpha = k; const w = f.r * .5; const gr = g.createLinearGradient(f.x - w, 0, f.x + w, 0); gr.addColorStop(0, 'rgba(255,240,180,0)'); gr.addColorStop(.5, f.col); gr.addColorStop(1, 'rgba(255,240,180,0)');
        g.fillStyle = gr; g.fillRect(f.x - w, f.y - 500, w * 2, 500); g.drawImage(Sprites.glow.gold, f.x - f.r * 1.3, f.y - f.r * 1.3, f.r * 2.6, f.r * 2.6); break; }
    }
    g.globalAlpha = 1;
  },

  darkness(cx, cy, ppx, ppy, lr, now) {
    const run = Game.run, dg = Render.dg, dc = Render.dc, ls = Render.lightScale, S = Render.scale * ls, bio = BIOME[run.biome];
    dg.globalCompositeOperation = 'source-over'; dg.setTransform(1, 0, 0, 1, 0, 0);
    const dk = bio.dark, base = run.blackoutT > 0 ? .99 : .955;
    dg.fillStyle = `rgba(${dk[0]},${dk[1]},${dk[2]},${base})`; dg.fillRect(0, 0, dc.width, dc.height);
    dg.globalCompositeOperation = 'destination-out';
    dg.setTransform(S, 0, 0, S, dc.width / 2 - cx * S, dc.height / 2 - cy * S);
    const L = (x, y, r, a = 1) => { dg.globalAlpha = a; dg.drawImage(Sprites.light, x - r, y - r, r * 2, r * 2); };
    const fl = 1 + (noise1(now * 7) - .5) * .06;
    L(ppx, ppy, lr * fl * 1.15, 1);
    if (run.eclipseT > 0) { dg.globalAlpha = 1; } // затмение гасит всё кроме факела
    World.forNear(cx, cy, c => { for (const l of c.lamps) if (!run.lampsBroken.has(l.key)) L(l.x, l.y - 30, 130 + Math.sin(now * 3 + l.x) * 6, .9); });
    for (const it of Items.items) if (it.active) L(it.x, it.y, it.kind === 'chest' ? 120 : it.kind === 'lampItem' ? 140 : 50, .8);
    for (const z of Zones.items) if (z.active && z.delay <= 0 && (z.kind === 'fire' || z.kind === 'poison')) L(z.x, z.y, z.r * 1.6, z.kind === 'fire' ? .8 : .45);
    for (const f of FX.items) if (f.active && (f.kind === 'pillar' || f.kind === 'ring' || f.kind === 'bolt')) { const k = f.life / f.max; if (f.kind === 'bolt' && f.pts) L(f.pts[f.pts.length - 2], f.pts[f.pts.length - 1], 120, k); else L(f.x, f.y, f.r * 1.4, k * .8); }
    for (const o of Projs.items) if (o.active) { if (o.kind === 'orbit' || o.kind === 'ice' || o.kind === 'flask' || o.kind === 'wolf' || o.kind === 'arrow') L(o.x, o.y, 55, .6); else if (o.kind === 'wave' && o.n >= 0) L(o.x, o.y, o.r, .35); }
    for (const e of run.bigs) if (e.active) L(e.x, e.y, e.r * 3, .7);
    for (const e of Enemies.items) if (e.active && e.def.glow && !e.big) L(e.x, e.y, e.r * 3.5, .6);
    for (const b of Bullets.items) if (b.active) L(b.x, b.y, 40, .7);
    for (const p of Render.pulses) L(p.x, p.y, 500 * (1 - p.t / .6) + 100, p.t / .6);
    dg.globalAlpha = 1;
    const g = Render.g; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(dc, 0, 0, Render.W, Render.H);
  },

  overlays(g, now) {
    const run = Game.run, p = run.player, W = Render.W, H = Render.H;
    const vg = Render.vign || (Render.vign = (() => { const c = mkCanvas(256), x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 60, 128, 128, 182); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return c; })());
    g.drawImage(vg, 0, 0, W, H);
    const lowHp = p.hp < p.stats.maxHp * .3 && run.dyingT <= 0;
    const ratio = p.light / p.lightMax, whisper = !CHAR[run.char].noLight && ratio < CONFIG.WHISPER_AT && !CHAR[run.char].whisperImmune;
    if (lowHp || whisper) {
      const rv = Render.redV || (Render.redV = (() => { const c = mkCanvas(256), x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 80, 128, 128, 181); gr.addColorStop(0, 'rgba(120,0,0,0)'); gr.addColorStop(1, 'rgba(160,10,10,.8)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return c; })());
      g.globalAlpha = lowHp ? .35 + .3 * Math.sin(now * 6) : 0; if (lowHp) g.drawImage(rv, 0, 0, W, H);
      if (whisper) { g.globalAlpha = .55 + .2 * Math.sin(now * 3); g.drawImage(Sprites.misc.dark, -W * .15, -H * .15, W * 1.3, H * 1.3); }
      g.globalAlpha = 1;
    }
    if (run.bloodMoonT > 0) { g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,120,110,1)'; g.globalAlpha = .35; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
    if (run.eclipseT > 0) { g.globalAlpha = clamp(Math.sin((1 - run.eclipseT / 1.6) * Math.PI), 0, 1) * .85; g.fillStyle = '#05020a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (run.eclipseFx > 0) { g.globalAlpha = run.eclipseFx * .35; g.fillStyle = '#10061a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (run.dawnT > 0) { const k = 1 - run.dawnT / 3.2; const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, `rgba(255,190,110,${k * .8})`); gr.addColorStop(1, `rgba(255,240,210,${k * .5})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  },

  hud(g, now) {
    const run = Game.run, p = run.player, W = Render.W, H = Render.H, d = Render.dpr, us = Game.save.settings.uiScale;
    const hs = d * us * clamp(Math.min(innerWidth, innerHeight) / 620, .8, 1.25), sf = Render.safe;
    const top = (sf.t + 4) * d, lft = (sf.l + 8) * d, rgt = W - (sf.r + 8) * d;
    // опыт
    g.fillStyle = '#120e0c'; g.fillRect(0, top, W, 12 * hs); g.fillStyle = '#2b2622'; g.fillRect(0, top + 12 * hs, W, 1 * d);
    const xg = g.createLinearGradient(0, 0, W, 0); xg.addColorStop(0, '#1a4a8a'); xg.addColorStop(1, '#6ab8ff'); g.fillStyle = xg; g.fillRect(0, top + 1, W * clamp(run.xp / run.xpNeed, 0, 1), 12 * hs - 2);
    g.font = `bold ${11 * hs}px Georgia,serif`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(`${L('level')} ${run.level}`, rgt, top + 6.5 * hs);
    // таймер
    const y1 = top + 34 * hs; g.textAlign = 'center';
    g.font = `${26 * hs}px Georgia,serif`; g.lineWidth = 4 * d; g.strokeStyle = '#000'; const tt = fmtTime(run.t);
    g.strokeText(tt, W / 2, y1); g.fillStyle = run.t >= 840 && !run.endless ? '#ffd27a' : '#e8dcc4'; g.fillText(tt, W / 2, y1);
    if (run.endless) { g.font = `${10 * hs}px Georgia,serif`; g.fillStyle = '#b394ff'; g.fillText(L('endless').toUpperCase(), W / 2, y1 + 20 * hs); }
    // убийства и пепел
    g.textAlign = 'right'; g.font = `${14 * hs}px Georgia,serif`;
    g.fillStyle = '#e8dcc4'; g.strokeText('☠ ' + fmtNum(run.kills), rgt, y1 - 6 * hs); g.fillText('☠ ' + fmtNum(run.kills), rgt, y1 - 6 * hs);
    g.fillStyle = '#d4a94a'; g.strokeText('◈ ' + fmtNum(run.ash), rgt, y1 + 14 * hs); g.fillText('◈ ' + fmtNum(run.ash), rgt, y1 + 14 * hs);
    // пламя-шкала света
    const fx = lft, fy = top + 18 * hs, fw = 26 * hs, fh = 38 * hs, ratio = CHAR[run.char].noLight ? 0 : p.light / p.lightMax;
    g.save(); g.beginPath(); g.moveTo(fx + fw / 2, fy); g.quadraticCurveTo(fx + fw * 1.05, fy + fh * .55, fx + fw * .85, fy + fh * .85); g.quadraticCurveTo(fx + fw / 2, fy + fh * 1.05, fx + fw * .15, fy + fh * .85); g.quadraticCurveTo(fx - fw * .05, fy + fh * .55, fx + fw / 2, fy); g.closePath();
    g.fillStyle = '#1a1210'; g.fill(); g.clip();
    const lh = fh * ratio, lg = g.createLinearGradient(0, fy + fh, 0, fy); lg.addColorStop(0, '#b3261e'); lg.addColorStop(.6, '#ff7a1a'); lg.addColorStop(1, '#ffe8a0');
    g.fillStyle = ratio < CONFIG.WHISPER_AT ? (((now * 4) | 0) % 2 ? '#5a1a10' : '#b3261e') : lg; g.fillRect(fx, fy + fh - lh - Math.sin(now * 8) * 1.5 * d, fw, lh + 4 * d); g.restore();
    g.strokeStyle = '#6b5a45'; g.lineWidth = 1.5 * d; g.stroke();
    // здоровье
    const hbx = fx, hby = fy + fh + 6 * hs, hbw = 90 * hs, hbh = 7 * hs;
    g.fillStyle = '#1a0a08'; g.fillRect(hbx, hby, hbw, hbh); g.fillStyle = '#c62f22'; g.fillRect(hbx, hby, hbw * clamp(p.hp / p.stats.maxHp, 0, 1), hbh);
    g.strokeStyle = '#5a4d3f'; g.lineWidth = d; g.strokeRect(hbx, hby, hbw, hbh);
    // иконки оружия и предметов
    const is = 20 * hs, ix0 = fx + fw + 8 * hs;
    const drawRow = (list, y, isW) => { list.forEach((it, i) => { const x = ix0 + i * (is + 3 * hs); g.fillStyle = 'rgba(10,9,8,.7)'; g.fillRect(x, y, is, is); g.drawImage(iconCanvas(it.id, 48), x + 1, y + 1, is - 2, is - 2);
      g.strokeStyle = isW && it.evo ? '#e2b24a' : '#4a3f33'; g.lineWidth = d; g.strokeRect(x, y, is, is);
      g.font = `bold ${8 * hs}px sans-serif`; g.textAlign = 'right'; g.fillStyle = it.evo ? '#ffd27a' : '#fff'; g.fillText(it.evo ? '★' : it.lv, x + is - 1, y + is - 4 * hs); }); };
    drawRow(run.weapons, fy, true); drawRow(run.passives, fy + is + 3 * hs, false);
    // вспышка (для клавиатуры)
    if (!Input.usingTouch) {
      const bx = fx, by = hby + hbh + 12 * hs, ready = p.flashCd <= 0;
      g.font = `${10 * hs}px Georgia,serif`; g.textAlign = 'left'; g.fillStyle = ready ? '#ffd27a' : '#8a7d69';
      g.fillText(`✦ ${L('flashReady')} ${ready ? '[Space]' : Math.ceil(p.flashCd) + 's'}`, bx, by + 6 * hs);
    }
    // полоса босса
    const boss = run.bigs.filter(e => e.active && e.boss);
    if (boss.length) {
      const hp = boss.reduce((a, e) => a + Math.max(0, e.hp), 0), max = boss.reduce((a, e) => a + e.maxHp, 0) / (boss[0].split ? 1 : 1);
      const bw = Math.min(W * .6, 520 * hs), bx = W / 2 - bw / 2, by = top + 62 * hs;
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(bx - 2, by - 2, bw + 4, 12 * hs + 4); g.fillStyle = '#6a1a8a'; g.fillRect(bx, by, bw * clamp(hp / max, 0, 1), 12 * hs);
      g.strokeStyle = '#b394ff'; g.strokeRect(bx - 2, by - 2, bw + 4, 12 * hs + 4);
      g.font = `${12 * hs}px Georgia,serif`; g.textAlign = 'center'; g.fillStyle = '#e8dcc4'; g.fillText(S().e[boss[0].id].toUpperCase(), W / 2, by + 24 * hs);
    }
    // стрелки за краем экрана
    const S2 = Render.scale, cx = run.camX, cy = run.camY;
    const arrow = (x, y, col) => {
      const sx = (x - cx) * S2 + W / 2, sy = (y - cy) * S2 + H / 2; const m = 30 * d;
      if (sx > m && sx < W - m && sy > m && sy < H - m) return;
      const a = Math.atan2(sy - H / 2, sx - W / 2), ex = clamp(sx, m + 20 * d, W - m), ey = clamp(sy, m + 90 * d, H - m);
      g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = col; g.beginPath(); g.moveTo(12 * d, 0); g.lineTo(-6 * d, -8 * d); g.lineTo(-6 * d, 8 * d); g.fill(); g.restore();
    };
    for (const it of Items.items) if (it.active && (it.kind === 'chest' || it.kind === 'lampItem')) arrow(it.x, it.y, it.kind === 'chest' ? '#e2b24a' : '#ffb14a');
    for (const e of boss) arrow(e.x, e.y, '#b394ff');
    { let best = null, bd = 900 * 900; World.forNear(p.x, p.y, c => { for (const l of c.lamps) if (!run.lampsBroken.has(l.key)) { const dd = dist2(l.x, l.y, p.x, p.y); if (dd < bd) { bd = dd; best = l; } } });
      if (best && ratio < .5) arrow(best.x, best.y, '#ffd27a'); }
    // джойстик
    if (Input.joy.active) { const j = Input.joy; g.globalAlpha = .35; g.strokeStyle = '#e8dcc4'; g.lineWidth = 3 * d; g.beginPath(); g.arc(j.ox * d, j.oy * d, 60 * d, 0, TAU); g.stroke();
      const dx = j.x - j.ox, dy = j.y - j.oy, l = Math.min(60, Math.hypot(dx, dy)), an = Math.atan2(dy, dx);
      g.globalAlpha = .6; g.fillStyle = '#ff9a4a'; g.beginPath(); g.arc((j.ox + Math.cos(an) * l) * d, (j.oy + Math.sin(an) * l) * d, 26 * d, 0, TAU); g.fill(); g.globalAlpha = 1; }
    else if (Input.usingTouch && Game.save.settings.joy === 'fixed') { const left = Game.save.settings.joySide === 'left'; g.globalAlpha = .2; g.strokeStyle = '#e8dcc4'; g.lineWidth = 3 * d; g.beginPath(); g.arc((left ? 110 : innerWidth - 110) * d, (innerHeight - 130) * d, 60 * d, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    // кнопка вспышки (DOM) — перезарядка
    UI.flashBtn(p.flashCd);
  },

  // сцена лагеря для меню
  camp() {
    const g = Render.g, W = Render.W, H = Render.H, now = performance.now() / 1000, d = Render.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#07060a'); sky.addColorStop(.6, '#120e0c'); sky.addColorStop(1, '#0a0908'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const rng = mulberry32(7); g.fillStyle = '#e8dcc4';
    for (let i = 0; i < 90; i++) { const x = rng() * W, y = rng() * H * .55, tw = .3 + .7 * Math.abs(Math.sin(now * (.5 + rng()) + i)); g.globalAlpha = tw * .7; g.fillRect(x, y, d * (rng() < .1 ? 2 : 1), d * (rng() < .1 ? 2 : 1)); }
    g.globalAlpha = 1;
    // холмы и кладбище на горизонте
    g.fillStyle = '#0d0b0a'; g.beginPath(); g.moveTo(0, H * .72); for (let x = 0; x <= W; x += W / 12) g.lineTo(x, H * .68 - Math.sin(x / W * 7) * H * .03); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    for (let i = 0; i < 9; i++) { const x = (i + .5) / 9 * W + Math.sin(i) * 20 * d, y = H * .69 - Math.sin(x / W * 7) * H * .03; g.fillStyle = '#0a0808'; g.fillRect(x - 5 * d, y - 18 * d, 10 * d, 20 * d); g.fillRect(x - 9 * d, y - 12 * d, 18 * d, 4 * d); }
    // костёр
    const fx = W / 2, fy = H * .8, s = Math.min(W, H) / 700;
    const gl = g.createRadialGradient(fx, fy, 0, fx, fy, 420 * s * d / d * (1 + .05 * noise1(now * 5)));
    gl.addColorStop(0, 'rgba(255,140,40,.35)'); gl.addColorStop(.4, 'rgba(255,90,20,.12)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    // шатры
    for (const [ox, sc] of [[-260, 1], [250, .9], [-420, .7], [410, .75]]) { const x = fx + ox * s, y = fy - 10 * s, w = 90 * s * sc, h = 80 * s * sc;
      g.fillStyle = '#1a1411'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - h); g.lineTo(x + w, y); g.fill(); g.fillStyle = '#2a1e16'; g.beginPath(); g.moveTo(x - w * .2, y); g.lineTo(x, y - h * .6); g.lineTo(x + w * .2, y); g.fill(); }
    g.fillStyle = '#2a1a10'; for (let i = -1; i <= 1; i += 2) { g.save(); g.translate(fx, fy + 6 * s); g.rotate(i * .5); g.fillRect(-40 * s, -5 * s, 80 * s, 10 * s); g.restore(); }
    for (let i = 0; i < 3; i++) { const h = (70 - i * 18) * s * (.85 + noise1(now * 8 + i) * .3), w = (26 - i * 6) * s; g.fillStyle = ['#b3261e', '#ff7a1a', '#ffe8a0'][i];
      g.beginPath(); g.moveTo(fx - w, fy); g.quadraticCurveTo(fx - w, fy - h * .5, fx + (noise1(now * 6 + i * 3) - .5) * 14 * s, fy - h); g.quadraticCurveTo(fx + w, fy - h * .5, fx + w, fy); g.fill(); }
    // искры
    Render.sparks = Render.sparks || [];
    if (Render.sparks.length < 40 && Math.random() < .5) Render.sparks.push({ x: fx + rand(-15, 15) * s, y: fy - 30 * s, vx: rand(-15, 15), vy: rand(-80, -40), l: rand(1.5, 3) });
    for (let i = Render.sparks.length - 1; i >= 0; i--) { const sp = Render.sparks[i]; sp.l -= 1 / 60; sp.x += sp.vx / 60 * d; sp.y += sp.vy / 60 * d; sp.vx += Math.sin(now * 3 + i) * .5;
      if (sp.l <= 0) { Render.sparks.splice(i, 1); continue; } g.globalAlpha = Math.min(1, sp.l); g.fillStyle = '#ffb14a'; g.fillRect(sp.x, sp.y, 2 * d, 2 * d); }
    g.globalAlpha = 1;
    // силуэт Хранителя у огня
    const pl = Sprites.player[Game.menuChar || 'iren']; if (pl) g.drawImage(pl.frames[0], fx + 70 * s, fy - 50 * s, 56 * s * 1.3, 56 * s * 1.3);
  },
};
