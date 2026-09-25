// ==== 12. UI / SCREENS ====
const UI = {
  root: null, back: null, cardChoices: null, banishMode: false, lastFlash: -1,
  init() {
    UI.root = document.getElementById('ui');
    UI.root.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      Audio.play('click'); UI.act(b.dataset.act, b.dataset, b);
    });
    UI.root.addEventListener('input', e => { const t = e.target; if (t.dataset.set) UI.setSetting(t.dataset.set, t.type === 'range' ? parseFloat(t.value) : t.type === 'checkbox' ? t.checked : t.value, false); });
    UI.root.addEventListener('change', e => { const t = e.target; if (t.dataset.set && t.tagName === 'SELECT') UI.setSetting(t.dataset.set, t.value, true); });
  },
  show(html, cls = 'center dim', back = null) {
    UI.back = back;
    UI.root.innerHTML = `<div class="screen ${cls}">${html}</div>`;
    UI.paint();
    const first = UI.root.querySelector('[autofocus]') || UI.root.querySelector('.btn.primary, .card, [data-act]');
    if (first && !Input.usingTouch) first.focus({ preventScroll: true });
  },
  clear() { UI.root.innerHTML = ''; UI.back = null; },
  paint() {
    UI.root.querySelectorAll('canvas[data-icon]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(iconCanvas(c.dataset.icon, 48), 0, 0, c.width, c.height); });
    UI.root.querySelectorAll('canvas[data-char]').forEach(c => { const g = c.getContext('2d'), sp = Sprites.player[c.dataset.char]; g.clearRect(0, 0, c.width, c.height); g.drawImage(sp.frames[0], 0, 0, c.width, c.height); });
    UI.root.querySelectorAll('canvas[data-enemy]').forEach(c => { const g = c.getContext('2d'), sp = Sprites.enemy[c.dataset.enemy]; if (sp) g.drawImage(sp.frames[0], 0, 0, c.width, c.height); });
  },
  ic(id, s = 40, sil = false) { return `<canvas data-icon="${id}" width="${s}" height="${s}" ${sil ? 'style="filter:brightness(0) opacity(.5)"' : ''}></canvas>`; },
  touchMode() {
    const run = Game.state === 'RUN' && Input.usingTouch;
    document.getElementById('touch').classList.toggle('on', run);
    document.getElementById('flashBtn').classList.toggle('left', Game.save.settings.joySide === 'right');
    document.getElementById('pauseBtn').classList.toggle('on', !!UI.hudOn && Input.usingTouch);
  },
  runHud(on) { UI.hudOn = on; document.getElementById('pauseBtn').classList.toggle('on', on && Input.usingTouch); UI.touchMode(); },
  flashBtn(cd) {
    const v = cd > 0 ? Math.ceil(cd) : 0; if (v === UI.lastFlash) return; UI.lastFlash = v;
    const b = document.getElementById('flashBtn'); b.classList.toggle('cd', v > 0); b.textContent = v > 0 ? v : '✦';
  },
  toast(msg) { const t = document.getElementById('toast'), d = document.createElement('div'); d.textContent = msg; t.appendChild(d); setTimeout(() => d.remove(), 3700); while (t.children.length > 4) t.firstChild.remove(); },
  hint(msg) { document.querySelectorAll('.hint').forEach(h => h.remove()); const d = document.createElement('div'); d.className = 'hint'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 5500); },
  vibrate(p) { if (Game.save.settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* нет поддержки */ } },
  // навигация клавиатурой и геймпадом
  focusables() { return [...UI.root.querySelectorAll('[data-act]:not([disabled]), input, select, textarea')].filter(el => el.offsetParent !== null); },
  moveFocus(dir) {
    const list = UI.focusables(); if (!list.length) return;
    const cur = document.activeElement; if (!list.includes(cur)) { list[0].focus(); return; }
    const r0 = cur.getBoundingClientRect(), c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === cur) continue; const r = el.getBoundingClientRect(), c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }, dx = c.x - c0.x, dy = c.y - c0.y;
      const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4; if (!ok) continue;
      const main = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx), side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
      const sc = main + side * 2.2; if (sc < bs) { bs = sc; best = el; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); }
  },
  padPress() { const el = document.activeElement; if (el && UI.root.contains(el)) { if (el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('input', { bubbles: true })); } else el.click(); } else UI.moveFocus('down'); },
  padBack() { const b = UI.root.querySelector('[data-back]'); if (b) b.click(); },
  onKey(e) {
    if (/^Arrow/.test(e.code) && !(e.target && e.target.type === 'range')) { e.preventDefault(); UI.moveFocus({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.code]); }
    if (e.code === 'Escape' && Game.state !== 'PAUSE') UI.padBack();
    if (Game.state === 'LEVELUP' && /^Digit[1-4]$/.test(e.code)) { const b = UI.root.querySelector(`.card[data-i="${+e.code.slice(5) - 1}"]`); if (b) b.click(); }
    if (Game.state === 'BOOT' && (e.code === 'Enter' || e.code === 'Space')) UI.act('begin');
  },

  act(a, d) {
    const s = Game.save;
    switch (a) {
      case 'begin': Audio.init(); UI.afterBoot(); break;
      case 'camp': Game.state = 'CAMP'; UI.camp(); break;
      case 'play': Game.state = 'SELECT'; UI.select(); break;
      case 'altar': UI.altar(); break; case 'heroes': UI.heroes(); break; case 'codex': UI.codex(d.tab || 'w'); break;
      case 'chronicle': UI.chronicle(); break; case 'trials': UI.trials(); break; case 'daily': UI.daily(); break;
      case 'settings': UI.settings(d.from); break;
      case 'selChar': if (s.unlocked.chars.includes(d.id)) { Game.sel.char = d.id; Game.menuChar = d.id; s.lastChar = d.id; UI.select(); } break;
      case 'selBiome': if (s.unlocked.biomes.includes(d.id)) { Game.sel.biome = d.id; UI.select(); } break;
      case 'selDiff': if (d.id !== 'nightmare' || s.unlocked.nightmare) { Game.sel.diff = d.id; UI.select(); } break;
      case 'curse': { const c = Game.sel.curses, i = c.indexOf(d.id); if (i >= 0) c.splice(i, 1); else c.push(d.id); UI.select(); break; }
      case 'start': Game.startRun({ char: Game.sel.char, biome: Game.sel.biome, diff: Game.sel.diff, curses: [...Game.sel.curses] }); break;
      case 'buy': { const m = META.find(x => x.id === d.id), l = s.meta[m.id] || 0, cost = CONFIG.META_COSTS[l]; if (l < m.max && s.ash >= cost) { s.ash -= cost; s.spent += cost; s.meta[m.id] = l + 1; Save.write(); Audio.play('levelup'); } UI.altar(); break; }
      case 'refund': s.ash += s.spent; s.spent = 0; s.meta = {}; Save.write(); UI.toast(L('refundDone')); UI.altar(); break;
      case 'pick': UI.pickCard(+d.i); break;
      case 'reroll': if (Game.run.rerolls > 0) { Game.run.rerolls--; UI.levelUp(true); } break;
      case 'skip': if (Game.run.skips > 0) { Game.run.skips--; UI.resume(); } break;
      case 'banish': UI.banishMode = !UI.banishMode; UI.levelUp(false, true); break;
      case 'takeChest': UI.resume(); break;
      case 'resume': UI.resume(); break;
      case 'giveUp': if (confirm(L('giveUpSure'))) { Game.endRun(false); } break;
      case 'endless': { const run = Game.run; run.endless = true; run.endlessStart = run.t; run.nextElite = run.t + 60; Game.state = 'RUN'; UI.clear(); UI.runHud(true); Music.set('run', run.biome); break; }
      case 'finishDawn': Game.endRun(true); break;
      case 'again': { const o = Game.lastOpts; if (o && !o.daily) Game.startRun(o); else { Game.state = 'CAMP'; UI.camp(); } break; }
      case 'share': UI.share(); break;
      case 'dailyPlay': Game.startRun(Game.dailyOpts()); break;
      case 'continueRun': { const snap = Save.loadRun(); Save.clearRun(); if (snap) Game.startRun({ char: snap.char, biome: snap.biome, diff: snap.diff, curses: snap.curses, seed: snap.seed, restore: snap }); else UI.camp(); break; }
      case 'discardRun': Save.clearRun(); Game.state = 'CAMP'; UI.camp(); break;
      case 'export': { const ta = UI.root.querySelector('#saveStr'); ta.value = Save.exportStr(); ta.select(); try { navigator.clipboard.writeText(ta.value); UI.toast(L('copied')); } catch (e) { /* ok */ } break; }
      case 'import': { const ta = UI.root.querySelector('#saveStr'); if (Save.importStr(ta.value)) { UI.toast(L('importOk')); UI.applySettings(); UI.settings(); } else UI.toast(L('importBad')); break; }
      case 'reset': if (confirm(L('resetSure'))) { Game.save = Save.defaults(); Save.write(); UI.applySettings(); UI.camp(); } break;
      case 'lang': UI.setSetting('lang', d.id, true); break;
      case 'backPause': UI.pause(); break;
    }
  },
  setSetting(k, v, rerender) {
    const s = Game.save.settings; s[k] = v; Save.write(); UI.applySettings();
    if (rerender) { if (Game.state === 'PAUSE') UI.settings('pause'); else UI.settings(); }
  },
  applySettings() {
    const s = Game.save.settings;
    Game.lang = s.lang || ((navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en');
    document.documentElement.lang = Game.lang; document.title = L('title');
    document.documentElement.style.setProperty('--ui-scale', s.uiScale);
    document.body.classList.toggle('cb', !!s.colorblind);
    Audio.applyVolumes(); Render.setQuality(s.quality === 'auto' ? Render.q : s.quality);
    UI.touchMode();
  },

  // ---------- экраны ----------
  boot() {
    UI.show(`<div class="row" style="flex-direction:column;gap:18px;max-width:640px;text-align:center">
      <svg class="title-flame" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6c7 11 16 15 16 29a16 16 0 0 1-32 0c0-9 6-13 8-19 2 6 5 8 8 8-3-7-1-12 0-18z" fill="#ff7a1a"><animate attributeName="d" dur="1.6s" repeatCount="indefinite" values="M32 6c7 11 16 15 16 29a16 16 0 0 1-32 0c0-9 6-13 8-19 2 6 5 8 8 8-3-7-1-12 0-18z;M33 5c6 12 15 16 15 30a16 16 0 0 1-32 0c0-8 5-12 9-18 1 6 4 8 7 8-2-7-1-13 1-20z;M32 6c7 11 16 15 16 29a16 16 0 0 1-32 0c0-9 6-13 8-19 2 6 5 8 8 8-3-7-1-12 0-18z"/></path><path d="M32 30c4 5 7 7 7 13a7 7 0 0 1-14 0c0-5 4-7 7-13z" fill="#ffe08a"/></svg>
      <h1>${esc(L('title'))}</h1><p class="lore">${esc(L('loreIntro'))}</p>
      <button class="btn primary pulse" data-act="begin" autofocus>${esc(L('tapToStart'))}</button>
      <div class="row small muted"><button class="btn small ghost" data-act="lang" data-id="ru">RU</button><button class="btn small ghost" data-act="lang" data-id="en">EN</button></div></div>`, 'center');
    UI.root.querySelector('.screen').addEventListener('pointerdown', e => { if (!e.target.closest('[data-act]')) UI.act('begin'); });
  },
  afterBoot() {
    if (!Save.ok) UI.toast(L('noStorage'));
    const snap = Save.loadRun();
    if (snap) {
      Game.state = 'CAMP'; Music.set('camp');
      UI.show(`<div class="panel" style="max-width:480px;text-align:center"><h2>${esc(L('continueRun'))}</h2>
        <p>${esc(S().c[snap.char][0])} · ${esc(S().bio[snap.biome][0])} · ${fmtTime(snap.t)} · ${esc(L('level'))} ${snap.level}</p><br>
        <div class="row"><button class="btn primary" data-act="continueRun">${esc(L('continueYes'))}</button><button class="btn" data-act="discardRun">${esc(L('continueNo'))}</button></div></div>`);
      return;
    }
    Game.state = 'CAMP'; Music.set('camp'); UI.camp();
  },
  header(title, backAct = 'camp') {
    return `<div class="row wrap" style="justify-content:space-between;margin-bottom:8px"><button class="btn small" data-act="${backAct}" data-back>← ${esc(L('back'))}</button>
      <h2 style="margin:0">${esc(title)}</h2><span class="ashcount">◈ ${fmtNum(Game.save.ash)}</span></div>`;
  },
  camp() {
    Game.state = 'CAMP'; UI.runHud(false); Music.set('camp');
    const s = Game.save, dailyDone = s.daily.day === dayNumber();
    const b = (act, label, icon, extra = '') => `<button class="tile" data-act="${act}">${UI.ic(icon, 36)}<span class="t"><b>${esc(label)}</b>${extra}</span></button>`;
    UI.show(`<div class="wrap" style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <h1 style="font-size:calc(var(--fs)*2)">${esc(L('title'))}</h1><p class="muted serif small">${esc(L('camp'))} · <span class="ashcount">◈ ${fmtNum(s.ash)} ${esc(L('ash'))}</span></p>
      <button class="btn primary" style="min-width:min(320px,90%);font-size:1.2em" data-act="play" autofocus>🔥 ${esc(L('play'))}</button>
      <div class="grid" style="max-width:720px">
        ${b('daily', L('daily'), 'relic', `<span class="small muted">${dailyDone ? '✓ ' : ''}${esc(L('dailyTitle'))} #${dayNumber()}</span>`)}
        ${b('altar', L('altar'), 'reliquary', `<span class="small muted">${META.reduce((a, m) => a + (s.meta[m.id] || 0), 0)}/${META.reduce((a, m) => a + m.max, 0)}</span>`)}
        ${b('heroes', L('heroes'), 'cuirass', `<span class="small muted">${s.unlocked.chars.length}/${CHARS.length}</span>`)}
        ${b('codex', L('codex'), 'feather', `<span class="small muted">${Codex.percent(s)}%</span>`)}
        ${b('trials', L('trials'), 'crown', `<span class="small muted">${Object.keys(s.ach).length}/${ACHIEVEMENTS.length}</span>`)}
        ${b('chronicle', L('chronicle'), 'wormwood', `<span class="small muted">${esc(L('bestTime'))}: ${fmtTime(s.stats.bestTime)}</span>`)}
        ${b('settings', L('settings'), 'glove', '')}
      </div></div>`, 'solid', null);
    UI.root.querySelector('.screen').style.background = 'linear-gradient(180deg,rgba(10,9,8,.55),rgba(10,9,8,.2) 40%,rgba(10,9,8,.75))';
  },
  select() {
    const s = Game.save, sel = Game.sel;
    const chars = CHARS.filter(c => !c.secret || s.unlocked.chars.includes(c.id)).map(c => {
      const un = s.unlocked.chars.includes(c.id), t = S().c[c.id];
      return `<button class="tile ${sel.char === c.id ? 'sel' : ''} ${un ? '' : 'locked'}" data-act="selChar" data-id="${c.id}" ${un ? '' : 'aria-disabled="true"'}>
        <canvas data-char="${c.id}" width="44" height="44" ${un ? '' : 'style="filter:brightness(0) opacity(.6)"'}></canvas>
        <span class="t"><b>${esc(un ? t[0] : L('unknown'))}</b><span class="small ${un ? '' : 'muted'}">${esc(un ? t[1] : L('unlockHow') + ': ' + t[3])}</span></span>${un ? UI.ic(c.weapon, 28) : ''}</button>`;
    }).join('');
    const biomes = BIOMES.map(b => { const un = s.unlocked.biomes.includes(b.id), t = S().bio[b.id];
      return `<button class="tile ${sel.biome === b.id ? 'sel' : ''} ${un ? '' : 'locked'}" data-act="selBiome" data-id="${b.id}"><span class="t"><b>${esc(t[0])}</b><span class="small ${un ? '' : 'muted'}">${esc(un ? t[1] : L('unlockHow') + ': ' + t[2])}</span></span></button>`; }).join('');
    const diffs = ['dusk', 'midnight', 'nightmare'].map(d => { const un = d !== 'nightmare' || s.unlocked.nightmare;
      return `<button class="tile ${sel.diff === d ? 'sel' : ''} ${un ? '' : 'locked'}" data-act="selDiff" data-id="${d}"><span class="t"><b>${esc(L('difficulty')[d])}</b><span class="small muted">${esc(un ? L('diffDesc')[d] : L('unlockHow') + ': ' + S().a.win1[1])}</span></span></button>`; }).join('');
    const curses = s.unlocked.curses ? `<h3>${esc(L('curses'))}</h3><div class="grid">${CURSES.map(c => `<button class="tile ${sel.curses.includes(c) ? 'sel' : ''}" data-act="curse" data-id="${c}"><span class="t"><b>${esc(S().cu[c][0])}</b><span class="small muted">${esc(S().cu[c][1])} · +10%</span></span></button>`).join('')}</div>` : '';
    const mul = CONFIG.DIFFICULTY[sel.diff].ash * (1 + .1 * sel.curses.length);
    UI.show(`<div class="wrap">${UI.header(L('play'))}
      <h3>${esc(L('chooseHero'))}</h3><div class="grid">${chars}</div>
      <h3>${esc(L('chooseBiome'))}</h3><div class="grid">${biomes}</div>
      <h3>${esc(L('chooseDiff'))}</h3><div class="grid">${diffs}</div>${curses}
      <div class="row" style="margin:18px 0 30px"><span class="gold serif">${esc(L('rewardMul'))}: ×${mul.toFixed(1)}</span><button class="btn primary" data-act="start" autofocus>🔥 ${esc(L('start'))}</button></div></div>`, 'dim');
  },
  altar() {
    const s = Game.save;
    const tiles = META.map(m => { const l = s.meta[m.id] || 0, cost = CONFIG.META_COSTS[l], t = S().m[m.id];
      return `<div class="tile" style="cursor:default">${UI.ic(m.id, 36)}<span class="t"><b>${esc(t[0])}</b><span class="small muted">${esc(t[1])}</span>
        <span class="pips" style="margin-top:4px">${Array.from({ length: m.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span></span>
        ${l < m.max ? `<button class="btn small" data-act="buy" data-id="${m.id}" ${s.ash >= cost ? '' : 'disabled'}>◈ ${cost}</button>` : `<span class="gold small">${esc(L('max'))}</span>`}</div>`; }).join('');
    UI.show(`<div class="wrap">${UI.header(L('altar'))}<div class="grid">${tiles}</div>
      <div class="row" style="margin:16px 0 30px"><button class="btn small ghost" data-act="refund">${esc(L('refund'))} (◈ ${fmtNum(s.spent)})</button></div></div>`, 'dim');
  },
  heroes() {
    const s = Game.save;
    const tiles = CHARS.filter(c => !c.secret || s.unlocked.chars.includes(c.id)).map(c => { const un = s.unlocked.chars.includes(c.id), t = S().c[c.id];
      return `<button class="tile ${Game.menuChar === c.id ? 'sel' : ''}" data-act="selChar" data-id="${c.id}"><canvas data-char="${c.id}" width="56" height="56" ${un ? '' : 'style="filter:brightness(0) opacity(.6)"'}></canvas>
        <span class="t"><b>${esc(un ? t[0] : L('unknown'))}</b><span class="small">${esc(un ? t[1] : L('unlockHow') + ': ' + t[3])}</span>${un ? `<br><span class="lore">${esc(t[2])}</span>` : ''}</span>${un ? UI.ic(c.weapon, 30) : UI.ic('locked', 30)}</button>`; }).join('');
    UI.show(`<div class="wrap">${UI.header(L('heroes'))}<div class="grid">${tiles}</div></div>`, 'dim');
    UI.root.querySelectorAll('[data-act="selChar"]').forEach(b => b.dataset.act = 'heroPick');
    UI.root.querySelectorAll('[data-act="heroPick"]').forEach(b => b.addEventListener('click', () => { if (s.unlocked.chars.includes(b.dataset.id)) { Game.menuChar = Game.sel.char = s.lastChar = b.dataset.id; Save.write(); UI.heroes(); } }));
  },
  codex(tab) {
    const s = Game.save, T = S();
    const tabs = [['w', L('weapons')], ['evo', L('evolution').replace('!', '')], ['p', L('passives')], ['e', S() === STRINGS.ru ? 'Бестиарий' : 'Bestiary']];
    let body = '';
    if (tab === 'w') body = WEAPONS.map(w => { const k = s.codex.w[w.id]; return `<div class="tile">${UI.ic(w.id, 40, !k)}<span class="t"><b>${esc(k ? T.w[w.id][0] : L('unknown'))}</b><span class="small">${esc(k ? T.w[w.id][1] : '')}</span>${k ? `<br><span class="lore">${esc(T.w[w.id][2])}</span>` : ''}</span></div>`; }).join('');
    if (tab === 'evo') body = WEAPONS.map(w => { const k = s.codex.evo[w.id]; return `<div class="tile">${UI.ic(w.id, 40, !k)}<span class="t"><b class="${k ? 'gold' : ''}">${esc(k ? T.w[w.id][3] : L('unknown'))}</b><span class="small">${esc(k ? T.w[w.id][4] : '')}</span><br><span class="small muted">${esc(L('recipe'))}: ${k ? esc(T.w[w.id][0] + ' ' + L('level') + '8 + ' + T.p[w.evoP][0]) : '???'}</span></span></div>`; }).join('');
    if (tab === 'p') body = PASSIVES.map(p => { const k = s.codex.p[p.id]; return `<div class="tile">${UI.ic(p.id, 40, !k)}<span class="t"><b>${esc(k ? T.p[p.id][0] : L('unknown'))}</b><span class="small">${esc(k ? T.p[p.id][1] : '')}</span>${k ? `<br><span class="lore">${esc(T.p[p.id][2])}</span>` : ''}</span></div>`; }).join('');
    if (tab === 'e') body = [...ENEMIES.map(e => e.id), ...Object.keys(BOSSES)].map(id => { const k = s.codex.e[id]; return `<div class="tile"><canvas data-enemy="${id}" width="44" height="44" ${k ? '' : 'style="filter:brightness(0) opacity(.5)"'}></canvas><span class="t"><b>${esc(k ? T.e[id] : L('unknown'))}</b><span class="small muted">${esc(k ? T.ed[id] : '')}</span></span></div>`; }).join('');
    UI.show(`<div class="wrap">${UI.header(L('codex') + ' · ' + Codex.percent(s) + '%')}
      <div class="tabs">${tabs.map(([k, n]) => `<button class="btn small ${k === tab ? 'on' : ''}" data-act="codex" data-tab="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="grid" style="margin-bottom:30px">${body}</div></div>`, 'dim');
  },
  chronicle() {
    const s = Game.save.stats, fav = Object.entries(s.weaponUse).sort((a, b) => b[1] - a[1])[0];
    const kv = [[L('bestTime'), fmtTime(s.bestTime)], [L('totalRuns'), fmtNum(s.runs)], [L('totalWins'), fmtNum(s.wins)], [L('totalKills'), fmtNum(s.kills)],
      [L('totalEmbers'), fmtNum(s.embers)], [L('totalAsh'), fmtNum(s.ashTotal)], [L('bossesKilled'), Object.keys(s.bosses).length + '/3'],
      [L('evolutionsFound'), Object.keys(Game.save.codex.evo).length + '/12'], [L('favWeapon'), fav ? S().w[fav[0]][0] : L('none')],
      [L('totalTime'), Math.floor(s.time / 60) + ' ' + L('minutes')]];
    UI.show(`<div class="wrap" style="max-width:560px">${UI.header(L('chronicle'))}<div class="panel"><div class="kv">${kv.map(([k, v]) => `<span>${esc(k)}</span><span class="gold">${esc(v)}</span>`).join('')}</div></div></div>`, 'dim');
  },
  trials() {
    const s = Game.save, T = S().a;
    const list = ACHIEVEMENTS.map(a => { const d = s.ach[a.id]; return `<div class="tile" style="${d ? 'border-color:#6b5a2a' : ''}">${UI.ic(d ? 'crown' : 'locked', 32)}<span class="t"><b class="${d ? 'gold' : ''}">${esc(T[a.id][0])}</b><span class="small muted">${esc(T[a.id][1])}</span></span><span class="small ${d ? 'green' : 'muted'}">${d ? '✓' : '◈ ' + a.reward}</span></div>`; }).join('');
    UI.show(`<div class="wrap">${UI.header(L('trials') + ' · ' + Object.keys(s.ach).length + '/' + ACHIEVEMENTS.length)}<div class="grid" style="margin-bottom:30px">${list}</div></div>`, 'dim');
  },
  daily() {
    const s = Game.save, o = Game.dailyOpts(), done = s.daily.day === dayNumber() && s.daily.result;
    UI.show(`<div class="wrap" style="max-width:600px">${UI.header(L('daily') + ' #' + dayNumber())}
      <div class="panel" style="text-align:center"><p class="lore">${esc(L('dailyDesc'))}</p><br>
      <div class="row"><canvas data-char="${o.char}" width="56" height="56"></canvas><div style="text-align:left"><b class="serif">${esc(S().c[o.char][0])}</b><br><span class="small">${esc(S().bio[o.biome][0])}</span><br>
      <span class="small red">${o.curses.map(c => esc(S().cu[c][0])).join(' · ')}</span></div></div><br>
      ${done ? `<p>${esc(L('dailyDone'))}</p><pre class="serif" style="white-space:pre-wrap;margin:10px 0;color:var(--gold)">${esc(UI.shareText(s.daily.result))}</pre><button class="btn primary" data-act="share">${esc(L('share'))}</button>`
        : `<button class="btn primary" data-act="dailyPlay" autofocus>🔥 ${esc(L('dailyPlay'))}</button>`}</div></div>`, 'dim');
  },
  settings(from) {
    const s = Game.save.settings, back = from === 'pause' || Game.state === 'PAUSE' ? 'backPause' : 'camp';
    const rng = (k, label, min, max, step) => `<div class="toggle"><label for="s_${k}">${esc(label)}</label><input id="s_${k}" type="range" min="${min}" max="${max}" step="${step}" value="${s[k]}" data-set="${k}"></div>`;
    const chk = (k, label) => `<div class="toggle"><label for="s_${k}">${esc(label)}</label><input id="s_${k}" type="checkbox" ${s[k] ? 'checked' : ''} data-set="${k}" style="width:24px;height:24px;accent-color:#ff7a1a"></div>`;
    const sel = (k, label, opts) => `<div class="toggle"><label for="s_${k}">${esc(label)}</label><select id="s_${k}" data-set="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(s[k]) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    UI.show(`<div class="wrap" style="max-width:620px">${UI.header(L('settings'), back)}<div class="panel">
      ${rng('master', L('volMaster'), 0, 1, .05)}${rng('music', L('volMusic'), 0, 1, .05)}${rng('sfx', L('volSfx'), 0, 1, .05)}
      ${sel('lang', L('language'), [['ru', 'Русский'], ['en', 'English']])}
      ${sel('quality', L('quality'), [['auto', L('qAuto')], ['low', L('qLow')], ['mid', L('qMid')], ['high', L('qHigh')]])}
      ${chk('shake', L('shake'))}${chk('dmgNums', L('dmgNums'))}${chk('vibrate', L('vibration'))}
      ${sel('joy', L('joyMode'), [['float', L('joyFloat')], ['fixed', L('joyFixed')]])}${sel('joySide', L('joySide'), [['left', L('left')], ['right', L('right')]])}
      ${chk('fps', L('showFps'))}${chk('colorblind', L('colorblind'))}${chk('reduceFlash', L('reduceFlash'))}${chk('noInvert', L('noInvert'))}
      ${rng('uiScale', L('uiScale'), .9, 1.3, .05)}
      <h3 style="margin-top:14px">${esc(L('exportSave'))} / ${esc(L('importSave'))}</h3><p class="small muted">${esc(L('exportHint'))}</p>
      <textarea id="saveStr" placeholder="${esc(L('importHint'))}"></textarea>
      <div class="row" style="margin-top:8px"><button class="btn small" data-act="export">${esc(L('exportSave'))}</button><button class="btn small" data-act="import">${esc(L('importSave'))}</button>${back === 'camp' ? `<button class="btn small ghost" data-act="reset">${esc(L('resetSave'))}</button>` : ''}</div>
      <p class="small muted" style="margin-top:12px">${esc(L('pwaHint'))}</p></div><br></div>`, 'dim');
  },

  // ---------- внутри забега ----------
  cardDesc(c) {
    const T = S();
    if (c.t === 'gold') return [L('gold'), L('goldDesc'), ''];
    if (c.t === 'chicken') return [L('chicken'), L('chickenDesc'), ''];
    if (c.t === 'w') {
      const d = WEAPON[c.id], name = T.w[c.id][0];
      if (c.lv === 1) return [name, T.w[c.id][1], T.w[c.id][2]];
      return [name, UI.deltaText(d.lv[c.lv - 2]), ''];
    }
    return [T.p[c.id][0], T.p[c.id][1], c.lv === 1 ? T.p[c.id][2] : ''];
  },
  deltaText(dl) {
    const parts = [];
    for (const k in dl) { const v = dl[k];
      if (k === 'dmg') parts.push(`+${v} ${L('lvDmg')}`); else if (k === 'amount') parts.push(`+${v} ${L('lvAmount')}`); else if (k === 'area') parts.push(`+${Math.round(v * 100)}% ${L('lvArea')}`);
      else if (k === 'cd') parts.push(`${Math.round(v * 100)}% ${L('lvCd')}`); else if (k === 'speed') parts.push(`+${Math.round(v * 100)}% ${L('lvSpeed')}`); else if (k === 'dur') parts.push(`+${v}s ${L('lvDur')}`);
      else if (k === 'pierce') parts.push(`+${v} ${L('lvPierce')}`); else if (k === 'chain') parts.push(`+${v} ${L('lvChain')}`); else if (k === 'freeze') parts.push(`+${Math.round(v * 100)}% ${L('lvFreeze')}`); else if (k === 'burn') parts.push(L('lvBurn')); }
    return parts.join(', ');
  },
  levelUp(reroll, keep) {
    Game.state = 'LEVELUP'; UI.runHud(false);
    const run = Game.run; if (!keep || !UI.cardChoices) UI.cardChoices = Sys.makeChoices();
    if (!keep) UI.banishMode = false;
    const cards = UI.cardChoices.map((c, i) => {
      const [nm, ds, lore] = UI.cardDesc(c), lvTxt = c.t === 'w' || c.t === 'p' ? (c.lv === 1 ? L('new') : `${L('level')} ${c.lv - 1} → ${c.lv}`) : '';
      const evoHint = c.t === 'p' && WEAPONS.find(w => w.evoP === c.id && run.weapons.some(x => x.id === w.id) && Game.save.codex.evo[w.id]) ? `<span class="small gold">★ ${esc(L('evolution').replace('!', ''))}</span>` : '';
      return `<button class="card ${c.rar === 'rare' ? 'rare' : c.rar === 'epic' ? 'epic' : ''}" data-act="pick" data-i="${i}" style="animation-delay:${i * .08}s${UI.banishMode ? ';border-color:#ff5a4a' : ''}">
        <span class="key">${i + 1}</span>${UI.ic(c.id === 'gold' ? 'gold' : c.id, 56)}<span class="txt"><span class="lv">${esc(lvTxt)}</span><br><span class="nm">${esc(nm)}</span><br><span class="ds">${esc(ds)}</span>${lore ? `<br><span class="lore">${esc(lore)}</span>` : ''}${evoHint}</span></button>`;
    }).join('');
    UI.show(`<h2>${esc(UI.banishMode ? L('banishMode') : L('levelUp'))} · ${run.level}</h2><div class="cards">${cards}</div>
      <div class="row" style="margin-top:16px">
      <button class="btn small" data-act="reroll" ${run.rerolls > 0 ? '' : 'disabled'}>↻ ${esc(L('reroll'))} (${run.rerolls})</button>
      <button class="btn small" data-act="skip" ${run.skips > 0 ? '' : 'disabled'}>» ${esc(L('skip'))} (${run.skips})</button>
      <button class="btn small ${UI.banishMode ? 'primary' : ''}" data-act="banish" ${run.banishes > 0 ? '' : 'disabled'}>✕ ${esc(L('banish'))} (${run.banishes})</button></div>`, 'center dim');
  },
  pickCard(i) {
    const run = Game.run, c = UI.cardChoices[i]; if (!c) return;
    if (UI.banishMode) { if (c.t === 'w' || c.t === 'p') { run.banished.add(c.id); run.banishes--; } UI.banishMode = false; UI.levelUp(true); return; }
    Sys.applyChoice(c); UI.cardChoices = null; UI.resume();
  },
  chest() {
    Game.state = 'CHEST'; UI.runHud(false);
    const run = Game.run, from = run.chestFrom; run.chestFrom = null;
    const res = Sys.openChest(from); Audio.play('chest');
    const ids = [...WEAPONS.map(w => w.id), ...PASSIVES.filter(p => !p.secret).map(p => p.id)];
    UI.show(`<div class="panel" style="text-align:center;max-width:560px;width:100%"><h2>${esc(L('chest'))}</h2>
      <div class="chest-reel" id="reel">${res.map(() => `<canvas width="72" height="72"></canvas>`).join('')}</div><div id="chestRes" style="min-height:80px"></div>
      <button class="btn primary" data-act="takeChest" id="takeBtn" style="margin-top:12px;visibility:hidden">${esc(L('take'))}</button></div>`, 'center dim');
    const cvs = [...UI.root.querySelectorAll('#reel canvas')]; let t = 0;
    const iv = setInterval(() => {
      t++;
      cvs.forEach((c, i) => { const g = c.getContext('2d'); g.clearRect(0, 0, 72, 72); const id = t < 14 + i * 4 ? pick(ids) : (res[i].t === 'gold' ? 'gold' : res[i].id); g.drawImage(iconCanvas(id, 48), 8, 8, 56, 56); if (t < 14 + i * 4) Audio.play('ember', t); });
      if (t >= 14 + (res.length - 1) * 4) {
        clearInterval(iv); const T = S();
        UI.root.querySelector('#chestRes').innerHTML = res.map(r => r.t === 'evo' ? `<p class="gold serif" style="font-size:1.2em">★ ${esc(L('evolution'))} ${esc(T.w[r.id][3])}</p><p class="small">${esc(T.w[r.id][4])}</p>`
          : `<p>${esc(UI.cardDesc(r)[0])} ${r.lv ? `<span class="small fire">${esc(L('level'))} ${r.lv}</span>` : ''}</p>`).join('');
        const tb = UI.root.querySelector('#takeBtn'); tb.style.visibility = 'visible'; if (!Input.usingTouch) tb.focus();
      }
    }, 70);
  },
  pause() {
    if (!Game.run) return;
    Game.state = 'PAUSE'; UI.runHud(false); Audio.setWhisper(0);
    const run = Game.run, T = S();
    const w = run.weapons.map(x => `<div class="tile" style="min-height:44px">${UI.ic(x.id, 30)}<span class="t"><b>${esc(x.evo ? T.w[x.id][3] : T.w[x.id][0])}</b><span class="small">${x.evo ? '★' : L('level') + ' ' + x.lv}</span></span></div>`).join('');
    const p = run.passives.map(x => `<div class="tile" style="min-height:44px">${UI.ic(x.id, 30)}<span class="t"><b>${esc(T.p[x.id][0])}</b><span class="small">${L('level')} ${x.lv}</span></span></div>`).join('');
    UI.show(`<div class="wrap" style="max-width:720px"><h2>${esc(L('paused'))}</h2>
      <div class="row" style="margin-bottom:12px"><button class="btn primary" data-act="resume" data-back autofocus>▶ ${esc(L('resume'))}</button><button class="btn" data-act="settings" data-from="pause">${esc(L('settings'))}</button><button class="btn ghost" data-act="giveUp">${esc(L('giveUp'))}</button></div>
      <div class="panel"><h3>${esc(L('build'))}</h3><p class="small muted">${esc(T.c[run.char][0])} · ${esc(T.bio[run.biome][0])} · ${esc(L('difficulty')[run.diff])} · ${fmtTime(run.t)}</p>
      <h3>${esc(L('weapons'))}</h3><div class="grid">${w}</div><h3>${esc(L('passives'))}</h3><div class="grid">${p || `<span class="muted">${esc(L('none'))}</span>`}</div></div><br></div>`, 'center dim');
  },
  togglePause() {
    if (Game.state === 'RUN') UI.pause();
    else if (Game.state === 'PAUSE') UI.resume();
  },
  resume() { Game.state = 'RUN'; UI.clear(); UI.runHud(true); Input.flash = false; },
  dawnChoice() {
    Game.state = 'DAWN'; UI.runHud(false);
    UI.show(`<div class="panel" style="text-align:center;max-width:520px"><h1 style="color:#ffe6b0">☀ ${esc(L('dawn'))}</h1><p class="lore" style="margin:12px 0">${esc(L('endlessQ'))}</p>
      <div class="row"><button class="btn primary" data-act="finishDawn" autofocus>${esc(L('toCamp'))}</button><button class="btn" data-act="endless">🌑 ${esc(L('endless'))}</button></div></div>`, 'center dim');
  },
  results(r) {
    Game.state = 'RESULTS'; UI.runHud(false); Music.set(r.win ? 'dawn' : 'camp');
    const T = S();
    const rows = r.dmg.map(w => `<tr><td>${UI.ic(w.id, 20)} ${esc(w.evo ? T.w[w.id][3] : T.w[w.id][0])}</td><td>${fmtNum(w.dmg)}</td><td>${fmtNum(w.dps)}</td><td>${fmtNum(w.kills)}</td></tr>`).join('');
    UI.show(`<div class="wrap" style="max-width:640px"><h1 style="${r.win ? 'color:#ffe6b0' : 'color:#ff6a4a'}">${r.win ? '☀ ' + esc(L('dawn')) : esc(L('died'))}</h1>
      <div class="panel" style="margin-top:12px"><div class="kv">
        <span>${esc(L('time'))}</span><span class="gold">${fmtTime(r.time)}</span><span>${esc(L('levelL'))}</span><span class="gold">${r.level}</span>
        <span>${esc(L('kills'))}</span><span class="gold">${fmtNum(r.kills)}</span><span>${esc(L('ashEarned'))}</span><span class="ashcount" id="ashCount">◈ 0</span></div>
      <h3 style="margin-top:12px">${esc(L('dmgTable'))}</h3><table class="dmg"><tr><th></th><th>${esc(L('dmg'))}</th><th>${esc(L('dps'))}</th><th>☠</th></tr>${rows}</table>
      ${r.unlocks.length ? `<h3 style="margin-top:12px">${esc(L('unlocked'))}</h3>${r.unlocks.map(u => `<p class="gold">★ ${esc(u)}</p>`).join('')}` : ''}</div>
      <div class="row" style="margin:16px 0 30px"><button class="btn primary" data-act="again" autofocus>↻ ${esc(L('again'))}</button><button class="btn" data-act="camp" data-back>${esc(L('toCamp'))}</button><button class="btn" data-act="share">${esc(L('share'))}</button></div></div>`, 'dim');
    UI.paint();
    const el = UI.root.querySelector('#ashCount'); let v = 0; const step = Math.max(1, Math.ceil(r.ash / 40));
    const iv = setInterval(() => { v = Math.min(r.ash, v + step); if (el) el.textContent = '◈ ' + fmtNum(v); if (v % (step * 3) === 0) Audio.play('ember', v / step); if (v >= r.ash) clearInterval(iv); }, 30);
  },
  shareText(r) {
    const segs = []; for (let i = 0; i < 5; i++) { const a = i * 180, b = a + 180; segs.push(r.time >= b ? '🟧' : r.time > a ? '🟥' : '⬛'); }
    segs.push(r.win ? '☀️' : '⬛');
    const weps = (r.weps || []).slice(0, 2).join(' · ');
    return `🔥 ${L('share1')}${r.daily ? ` — ${L('shareNight')} #${r.day}` : ''}\n⏱ ${fmtTime(r.time)}${r.win ? ' ☀️ ' + L('shareDawn') : ''}\n💀 ${fmtNum(r.kills)} ${L('shareKilled')}${weps ? '\n⚔️ ' + weps : ''}\n${segs.join('')}`;
  },
  share() {
    const r = Game.lastResult && (Game.state === 'RESULTS' || !Game.save.daily.result) ? Game.lastResult : Game.save.daily.result || Game.lastResult; if (!r) return;
    const text = UI.shareText(r) + '\n' + location.href.split('#')[0];
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else { try { navigator.clipboard.writeText(text).then(() => UI.toast(L('copied'))); } catch (e) { UI.toast(text); } }
  },
};

// ==== 13. META (camp, unlocks, achievements, daily) ====
Game.sel = { char: 'iren', biome: 'cemetery', diff: 'midnight', curses: [] };
Game.dailyOpts = function () {
  const day = dayNumber(), rng = mulberry32(day * 7919 + 13);
  const chars = CHARS.filter(c => !c.secret), char = chars[Math.floor(rng() * chars.length)].id;
  const biome = ['cemetery', 'cathedral'][Math.floor(rng() * 2)];
  const pool = CURSES.filter(c => c !== 'fewchoice'), curses = [];
  while (curses.length < 2) { const c = pool[Math.floor(rng() * pool.length)]; if (!curses.includes(c)) curses.push(c); }
  return { char, biome, diff: 'midnight', curses, seed: day * 104729, daily: true, day };
};
Game.startRun = function (opts) {
  Game.lastOpts = opts; Game.queue = null;
  Sys.newRun(opts); Game.state = 'RUN'; UI.clear(); UI.runHud(true); Save.clearRun();
  Game.run.camX = Game.run.player.x; Game.run.camY = Game.run.player.y; Game.run.day = opts.day;
};
Game.endRun = function (win) {
  const run = Game.run; if (!run || run.over) return; run.over = true;
  const s = Game.save, st = s.stats; win = !!(win || run.won);
  const greed = run.player.stats.greed, diff = CONFIG.DIFFICULTY[run.diff];
  const endlessMin = run.endless ? (run.t - CONFIG.DAWN) / 60 : 0;
  const ash = Math.round((run.t * CONFIG.ASH_PER_SEC + run.kills * CONFIG.ASH_PER_KILL + run.ash + (win ? CONFIG.ASH_WIN : 0) + endlessMin * CONFIG.ASH_ENDLESS_MIN)
    * greed * diff.ash * (1 + .1 * run.curses.length) * (run.daily ? 1.5 : 1));
  s.ash += ash; st.ashTotal += ash; st.kills += run.kills; st.runs++; st.embers += run.st.embers; st.time += run.t; st.flashes += run.st.flashes; st.lamps += run.st.lamps;
  st.bestTime = Math.max(st.bestTime, run.t);
  if (win) { st.wins++; st.winsByChar[run.char] = 1; st.winsByBiome[run.biome] = 1; if (run.diff === 'nightmare') st.winNightmare = 1; }
  const r = { win, time: run.t, level: run.level, kills: run.kills, ash, daily: run.daily, day: run.day,
    passives: run.passives.length, weapons: run.weapons.length, curses: run.curses.length, minLightAfter1: CHAR[run.char].noLight ? 0 : run.st.minLightAfter1,
    stillTime: run.st.moved ? 0 : run.t, whisperTime: run.st.whisperTime, bestNoHit: Math.max(run.st.bestNoHit, run.t - run.st.lastHit), ghost: run.st.ghost, totalDmg: run.st.totalDmg,
    dmg: run.weapons.map(w => ({ id: w.id, evo: w.evo, dmg: w.dmg, kills: w.kills, dps: w.dmg / Math.max(1, run.t) })).sort((a, b) => b.dmg - a.dmg),
    weps: run.weapons.slice().sort((a, b) => (b.evo - a.evo) || (b.dmg - a.dmg)).map(w => w.evo ? S().w[w.id][3] : S().w[w.id][0]), unlocks: [] };
  if (run.daily) { st.dailies++; s.daily = { day: run.day, result: { time: r.time, kills: r.kills, win: r.win, weps: r.weps, daily: true, day: run.day } }; }
  // разблокировки
  for (const c of CHARS) if (!s.unlocked.chars.includes(c.id) && c.unlock(s)) { s.unlocked.chars.push(c.id); r.unlocks.push(L('unlockedChar') + ': ' + S().c[c.id][0]); }
  for (const b of BIOMES) if (!s.unlocked.biomes.includes(b.id) && b.unlock(s)) { s.unlocked.biomes.push(b.id); r.unlocks.push(L('unlockedBiome') + ': ' + S().bio[b.id][0]); }
  if (!s.unlocked.nightmare && st.wins >= 1) { s.unlocked.nightmare = true; r.unlocks.push(L('unlockedDiff')); }
  if (!s.unlocked.curses && st.winNightmare) { s.unlocked.curses = true; r.unlocks.push(L('curses')); }
  // испытания
  for (const a of ACHIEVEMENTS) if (!s.ach[a.id] && a.check(s, r)) { s.ach[a.id] = 1; s.ash += a.reward; r.unlocks.push(L('achievement') + ': ' + S().a[a.id][0] + ' (◈ ' + a.reward + ')'); }
  Save.write(); Save.clearRun();
  Game.lastResult = r; Audio.setWhisper(0);
  ALL_POOLS.forEach(p => p.clear()); clearParts();
  Game.run = null; UI.results(r);
};

// ==== 14. MAIN LOOP & BOOT ====
// доступ для отладки и автотестов
Game.dev = { Sys, UI, Render, Input, Enemies, Embers, Projs, Items, Director, Weapons, CONFIG, Save, Audio };
function boot() {
  Save.load();
  const s = Game.save;
  Game.menuChar = s.lastChar && s.unlocked.chars.includes(s.lastChar) ? s.lastChar : 'iren'; Game.sel.char = Game.menuChar;
  Render.init(); UI.init(); UI.applySettings(); Input.init(Render.cv);
  buildAllSprites();
  for (const e of ENEMIES) buildEnemySprite(e.id, e.r);
  for (const id in BOSSES) buildEnemySprite(id, BOSSES[id].r);
  for (const c of CHARS) buildPlayerSprite(c.id, c.col, c.trim);
  Game.state = 'BOOT'; UI.boot();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (Game.state === 'RUN') UI.pause();
      const snap = Game.run && Sys.snapshot(); if (snap) Save.saveRun(snap);
      Save.write();
      if (Audio.ctx) Audio.ctx.suspend();
    } else if (Audio.ctx && Game.state !== 'BOOT') Audio.ctx.resume();
  });
  addEventListener('pagehide', () => { const snap = Game.run && Sys.snapshot(); if (snap) Save.saveRun(snap); Save.write(); });
  let last = performance.now(), acc = 0;
  const loop = now => {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now; if (dt > .25) dt = .25; if (dt < 0) dt = 0;
    Input.poll();
    if (Input.pause) { Input.pause = false; UI.togglePause(); }
    if (Game.state === 'RUN' && Game.run) {
      acc += dt; let n = 0;
      while (acc >= CONFIG.STEP && n < CONFIG.MAX_STEPS && Game.run && Game.state === 'RUN') { Sys.step(CONFIG.STEP); acc -= CONFIG.STEP; n++; }
      if (n >= CONFIG.MAX_STEPS) acc = 0;
      Render.alpha = clamp(acc / CONFIG.STEP, 0, 1);
      if (Game.queue && Game.run) { Game.queueT -= dt; if (Game.queueT <= 0) { const q = Game.queue; Game.queue = null; if (q === 'levelup') UI.levelUp(); else if (q === 'chest') UI.chest(); } }
    } else { acc = 0; Render.alpha = 1; }
    Render.frame(dt);
  };
  requestAnimationFrame(loop);
}
boot();
})();
</script>
</body>
</html>
