// ==== 10. UI ====
const UI = {
  root: null, tab: 'cars', orbit: { a: .7, e: .28, dist: 7.6, drag: null, auto: true }, sel: { track: 'port', mode: 'free' },
  init() {
    UI.root = document.getElementById('ui');
    UI.root.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; Snd.play('click'); UI.act(b.dataset.act, b.dataset); });
    UI.root.addEventListener('input', e => { const t = e.target; if (t.dataset.cfg) UI.setCfg(t.dataset.cfg, t.type === 'range' ? +t.value : t.value, true); if (t.dataset.set) UI.setSetting(t.dataset.set, t.type === 'range' ? +t.value : t.value); });
    UI.root.addEventListener('change', e => { const t = e.target; if (t.dataset.set && t.tagName === 'SELECT') UI.setSetting(t.dataset.set, t.value, true); });
    // вращение машины в гараже
    const cv = document.getElementById('gl');
    cv.addEventListener('pointerdown', e => { if (H.state === 'DRIVE') return; UI.orbit.drag = [e.clientX, e.clientY]; UI.orbit.auto = false; });
    addEventListener('pointermove', e => { const o = UI.orbit; if (!o.drag) return; o.a -= (e.clientX - o.drag[0]) * .008; o.e = clamp(o.e + (e.clientY - o.drag[1]) * .004, .05, .9); o.drag = [e.clientX, e.clientY]; });
    addEventListener('pointerup', () => { UI.orbit.drag = null; });
    cv.addEventListener('wheel', e => { if (H.state !== 'DRIVE') UI.orbit.dist = clamp(UI.orbit.dist + e.deltaY * .004, 4.5, 12); }, { passive: true });
  },
  show(html, cls = '') { UI.root.innerHTML = `<div class="screen ${cls}">${html}</div>`; },
  toast(m) { const t = document.getElementById('toast'), d = document.createElement('div'); d.textContent = m; t.appendChild(d); setTimeout(() => d.remove(), 3100); },
  touchHud() { document.getElementById('touch').classList.toggle('on', H.state === 'DRIVE' && Inp.usingTouch); },
  hud(on) { document.getElementById('hud').classList.toggle('on', on); UI.touchHud(); },
  money() { return `<span class="money">$ ${fmt(H.save.money)}</span>`; },
  top(title, back) { return `<div class="topbar">${back ? `<button class="btn ghost" data-act="${back}"><span>← ${esc(T('back'))}</span></button>` : '<span></span>'}<h2>${esc(title)}</h2>${UI.money()}</div>`; },

  act(a, d) {
    const s = H.save, id = s.car;
    switch (a) {
      case 'begin': Snd.init(); UI.hubMenu(); break;
      case 'hub': UI.hubMenu(); break;
      case 'drift': UI.garage(); break;
      case 'torch': if (/\/hub\/(index\.html)?$/.test(location.pathname)) location.href = location.pathname.replace(/hub\/(index\.html)?$/, 'game/index.html'); else UI.toast(T('mTorchD')); break;
      case 'tab': UI.tab = d.id; UI.garage(); break;
      case 'buyCar': { const c = CARS[d.id]; if (s.owned[d.id]) { s.car = d.id; } else if (s.money >= c.price) { s.money -= c.price; s.owned[d.id] = true; s.car = d.id; Snd.play('buy'); UI.toast(T('bought')); } else { UI.toast(T('notEnough')); break; }
        Save.write(); UI.rebuildGarageCar(); UI.garage(); break; }
      case 'part': UI.buyPart(d.key, +d.v); break;
      case 'paint': UI.setCfg('paint', d.v, true); UI.garage(); break;
      case 'up': { const cfg = carConfig(id), lv = cfg.up[d.key], price = PRICES[d.key][lv]; if (price === undefined) break; if (s.money < price) { UI.toast(T('notEnough')); break; }
        s.money -= price; cfg.up[d.key]++; Save.write(); Snd.play('buy'); UI.garage(); break; }
      case 'race': if (!s.owned[id]) { UI.toast(T('lockedCar')); break; } UI.trackSel(); break;
      case 'track': UI.sel.track = d.id; UI.trackSel(); break;
      case 'mode': UI.sel.mode = d.id; UI.trackSel(); break;
      case 'start': UI.clear(); Game.toDrive(UI.sel.track, UI.sel.mode); break;
      case 'resume': UI.clear(); H.state = 'DRIVE'; UI.hud(true); break;
      case 'restart': Game.leaveDrive(); UI.clear(); Game.toDrive(UI.sel.track, UI.sel.mode); break;
      case 'toGarage': Game.leaveDrive(); UI.garage(); break;
      case 'toHub': Game.leaveDrive(); UI.hubMenu(); break;
      case 'settings': UI.settings(d.from); break;
      case 'backSettings': if (d.from === 'pause') UI.pause(); else UI.hubMenu(); break;
      case 'lang': H.save.settings.lang = d.id; Save.write(); UI.apply(); UI.boot(); break;
    }
  },
  clear() { UI.root.innerHTML = ''; },
  setSetting(k, v, rerender) { const st = H.save.settings; st[k] = k === 'cam' ? +v : v; Save.write(); UI.apply(); if (k === 'quality') resize(); if (rerender) UI.settings(UI.settingsFrom); },
  apply() { const st = H.save.settings; H.lang = st.lang || ((navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en'); document.documentElement.lang = H.lang; document.title = T('hub'); Snd.vol(); },
  setCfg(k, v, rebuild) { const cfg = carConfig(H.save.car); cfg[k] = v; Save.write(); if (rebuild) UI.rebuildGarageCar(); },
  buyPart(key, v) {
    const s = H.save, id = s.car, price = (PRICES[key] || [])[v] || 0;
    if (!owns(id, key, v) && price > 0) { if (s.money < price) { UI.toast(T('notEnough')); return; } s.money -= price; s.parts[`${id}:${key}:${v}`] = 1; Snd.play('buy'); }
    UI.setCfg(key, v, true); UI.garage();
  },
  rebuildGarageCar() {
    const g = W.garage; if (!g) return; if (g.userData.car) { g.remove(g.userData.car); disposeTree(g.userData.car); }
    const car = buildCar(H.save.car, carConfig(H.save.car), { noLights: false }); g.add(car); g.userData.car = car;
  },

  // ---------- хаб ----------
  boot() {
    UI.show(`<div class="center"><div class="head muted" style="letter-spacing:.3em">${esc(T('hubTag'))}</div><h1>${H.lang === 'ru' ? 'ПОЛН<span class="a">О</span>ЧЬ' : 'MIDN<span class="a">I</span>GHT'}</h1>
      <button class="btn primary" data-act="begin" autofocus><span>${esc(T('tapStart'))}</span></button>
      <div class="row"><button class="btn ghost" data-act="lang" data-id="ru"><span>RU</span></button><button class="btn ghost" data-act="lang" data-id="en"><span>EN</span></button></div></div>`);
  },
  hubMenu() {
    H.state = 'HUB'; UI.hud(false); UI.orbit.auto = true;
    const m = (act, tag, name, desc, glyph, soon) => `<button class="mode ${soon ? 'soon' : ''}" ${soon ? 'disabled' : `data-act="${act}"`}><span class="tag">${esc(tag)}</span><b>${esc(name)}</b><span class="muted small">${esc(desc)}</span><span class="glyph">${glyph}</span></button>`;
    UI.show(`<div class="topbar"><h1 style="font-size:clamp(34px,6vw,64px)">${H.lang === 'ru' ? 'ПОЛН<span class="a">О</span>ЧЬ' : 'MIDN<span class="a">I</span>GHT'}</h1><div class="row">${UI.money()}<button class="btn ghost" data-act="settings" data-from="hub"><span>⚙</span></button></div></div>
      <div class="modes">
        ${m('drift', T('ready'), T('mDrift'), T('mDriftD'), '🏁')}
        ${m('torch', T('ready'), T('mTorch'), T('mTorchD'), '🔥')}
        ${m('', T('soon'), T('mArena'), T('mArenaD'), '⚔', true)}
        ${m('', T('soon'), T('mParkour'), T('mParkourD'), '🏃', true)}
        ${m('', T('soon'), T('mTag'), T('mTagD'), '👟', true)}
      </div>`, 'clear');
  },

  // ---------- гараж ----------
  garage() {
    H.state = 'GARAGE'; UI.hud(false); const s = H.save, id = s.car, cfg = carConfig(id), st = carStats(id, cfg);
    const tabs = [['cars', T('tCars')], ['paint', T('tPaint')], ['wheels', T('tWheels')], ['stance', T('tStance')], ['body', T('tBody')], ['glass', T('tGlass')], ['engine', T('tEngine')]];
    const opt = (key, v, label) => { const own = owns(id, key, v), price = PRICES[key][v], on = cfg[key] === v;
      return `<button class="opt ${on ? 'on' : ''}" data-act="part" data-key="${key}" data-v="${v}"><span>${esc(label)}</span><span class="p ${own || !price ? 'owned' : ''}">${on ? '✓' : own || !price ? T('owned') : '$ ' + fmt(price)}</span></button>`; };
    const sw = (key, list, cur, act = 'part') => `<div class="swatches">${list.map((c, i) => `<button class="sw ${cur === (act === 'paint' ? c : i) ? 'on' : ''}" style="background:${c || 'repeating-linear-gradient(45deg,#333 0 4px,#222 4px 8px)'}" data-act="${act}" data-key="${key}" data-v="${act === 'paint' ? c : i}" aria-label="${c || T('none')}"></button>`).join('')}</div>`;
    const bar = (label, v, txt) => `<div class="stat"><span class="muted">${esc(label)}</span><div class="bar"><i style="width:${clamp(v, 0, 1) * 100}%"></i></div><span class="num small">${txt}</span></div>`;
    let body = '';
    if (UI.tab === 'cars') body = Object.entries(CARS).map(([cid, c]) => { const cs = carStats(cid, carConfig(cid)), own = s.owned[cid];
      return `<div class="panel" style="padding:12px"><div class="row" style="justify-content:space-between"><b class="head" style="font-size:1.3em;font-style:italic">${esc(c.name)}</b>
        ${own ? (s.car === cid ? `<span class="muted small">${esc(T('selected'))}</span>` : `<button class="btn" data-act="buyCar" data-id="${cid}"><span>${esc(T('select'))}</span></button>`) : `<button class="btn primary" data-act="buyCar" data-id="${cid}"><span>$ ${fmt(c.price)}</span></button>`}</div>
        ${bar(T('sPower'), cs.power / 26000, Math.round(cs.power / 45) + ' ' + T('hp'))}${bar(T('sGrip'), cs.grip / 1.5, cs.grip.toFixed(2))}${bar(T('sTop'), cs.top / 100, Math.round(cs.top * 3.6))}</div>`; }).join('');
    if (UI.tab === 'paint') body = `<h3>${esc(T('paint'))}</h3>${sw('paint', PAINTS, cfg.paint, 'paint')}
      <div class="row"><label for="cPick">${esc(T('custom'))}</label><input id="cPick" type="color" value="${cfg.paint}" data-cfg="paint"></div>
      <h3>${esc(T('finish'))}</h3><div class="opts">${['fGloss', 'fMetallic', 'fMatte', 'fPearl', 'fChrome'].map((k, i) => opt('finish', i, T(k))).join('')}</div>
      <h3>${esc(T('neon'))}</h3><div class="opts">${NEONS.map((c, i) => opt('neon', i, i ? '●' : T('none')).replace('<span>●</span>', `<span style="color:${c}">●●●</span>`)).join('')}</div>`;
    if (UI.tab === 'wheels') body = `<h3>${esc(T('wheelStyle'))}</h3><div class="opts">${['5-Spoke', 'Mesh', 'Deep Dish', 'Turbine', 'Multi'].map((n, i) => opt('wheel', i, n)).join('')}</div>
      <h3>${esc(T('wheelColor'))}</h3>${sw('wcol', WHEEL_COLORS, cfg.wcol)}<h3>${esc(T('wheelSize'))}</h3><div class="opts">${['17"', '18"', '19"'].map((n, i) => opt('wsize', i, n)).join('')}</div>
      <h3>${esc(T('caliper'))}</h3>${sw('caliper', CALIPERS, cfg.caliper)}`;
    if (UI.tab === 'stance') body = `<div class="slider"><label for="sH"><span>${esc(T('height'))}</span><span class="num">${cfg.height > 0 ? '−' : cfg.height < 0 ? '+' : ''}${Math.abs(cfg.height * 35)} ${T('mm')}</span></label><input id="sH" type="range" min="-2" max="4" step="1" value="${cfg.height}" data-cfg="height"></div>
      <div class="slider"><label for="sC"><span>${esc(T('camber'))}</span><span class="num">${(cfg.camber * 1.7).toFixed(1)}°</span></label><input id="sC" type="range" min="0" max="6" step="1" value="${cfg.camber}" data-cfg="camber"></div>`;
    if (UI.tab === 'body') body = [['front', T('front'), [T('stock'), 'Lip', 'Aero']], ['rear', T('rear'), [T('stock'), 'Diffuser', 'Race']], ['hood', T('hood'), [T('stock'), 'Vented', 'Carbon']], ['spoiler', T('spoiler'), [T('none'), 'Ducktail', 'GT', 'Wing']], ['skirts', T('skirts'), [T('none'), 'Aero']]]
      .map(([k, n, names]) => `<h3>${esc(n)}</h3><div class="opts">${names.map((nm, i) => opt(k, i, nm)).join('')}</div>`).join('');
    if (UI.tab === 'glass') body = `<h3>${esc(T('tint'))}</h3><div class="opts">${['0%', '35%', '70%', 'Limo'].map((n, i) => opt('tint', i, n)).join('')}</div>`;
    if (UI.tab === 'engine') body = UPGRADES.map(k => { const lv = cfg.up[k], max = PRICES[k].length, price = PRICES[k][lv];
      return `<div class="panel" style="padding:12px;display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between"><b class="head">${esc(T('up' + k[0].toUpperCase() + k.slice(1)))}</b>
        ${lv < max ? `<button class="btn" data-act="up" data-key="${k}"><span>$ ${fmt(price)}</span></button>` : '<span class="muted small">MAX</span>'}</div><div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>`; }).join('')
      + `<div class="panel" style="padding:12px;display:flex;flex-direction:column;gap:6px">${bar(T('sPower'), st.power / 26000, Math.round(st.power / 45) + ' ' + T('hp'))}${bar(T('sGrip'), st.grip / 1.5, st.grip.toFixed(2))}${bar(T('sHandling'), st.steer / .9, st.steer.toFixed(2))}${bar(T('sWeight'), 1 - st.mass / 2000, Math.round(st.mass) + ' ' + T('kg'))}${bar(T('sTop'), st.top / 100, Math.round(st.top * 3.6))}</div>`;
    UI.show(`<div class="topbar"><button class="btn ghost" data-act="hub"><span>← ${esc(T('back'))}</span></button><h2>${esc(T('garage'))} · ${esc(CARS[id].name)}</h2><div class="row">${UI.money()}<button class="btn primary" data-act="race"><span>${esc(T('race'))} ▶</span></button></div></div>
      <div class="garage"><div class="tabs">${tabs.map(([k, n]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${esc(n)}</button>`).join('')}</div><div class="gbody">${body}</div></div>`, 'clear');
  },
  trackSel() {
    H.state = 'TRACKSEL'; const s = H.save;
    const wIcon = { rain: '🌧', clear: '🌅', snow: '❄', dust: '🌪' }, wName = { rain: 'wRain', clear: 'wClear', snow: 'wSnow', dust: 'wDust' };
    const tracks = Object.entries(TRACKS).map(([k, t]) => `<button class="card ${UI.sel.track === k ? 'on' : ''}" data-act="track" data-id="${k}"><b>${esc(t.name[H.lang] || t.name.ru)}</b>
      <span class="muted small">${wIcon[t.weather]} ${esc(T(wName[t.weather]))} · ${esc(T('grip'))} ${Math.round(t.grip * 100)}%</span><span class="small">${esc(T('best'))}: <span class="num">${fmt(s.best[k + ':chal'] || 0)}</span> · ${s.best[k + ':time'] ? fmtT(s.best[k + ':time']) : '—'}</span></button>`).join('');
    const modes = [['free', 'modeFree', 'modeFreeD'], ['chal', 'modeChal', 'modeChalD'], ['time', 'modeTime', 'modeTimeD']].map(([k, n, dd]) => `<button class="card ${UI.sel.mode === k ? 'on' : ''}" data-act="mode" data-id="${k}"><b>${esc(T(n))}</b><span class="muted small">${esc(T(dd))}</span></button>`).join('');
    UI.show(`${UI.top(T('chooseTrack'), 'drift')}<div class="cards">${tracks}</div><h3 style="margin:16px 0 8px">${esc(T('chooseMode'))}</h3><div class="cards">${modes}</div>
      <p class="muted small" style="margin:14px 0">${esc(Inp.usingTouch ? T('helpTouch') : T('help'))}</p><button class="btn primary" data-act="start" autofocus><span>${esc(T('start'))} ▶</span></button>`, '');
    UI.root.querySelector('.screen').style.background = 'linear-gradient(180deg,rgba(7,8,11,.85),rgba(7,8,11,.6))';
  },
  settings(from) {
    UI.settingsFrom = from; const st = H.save.settings;
    const sel = (k, label, opts) => `<div class="stat" style="grid-template-columns:1fr auto"><label for="st_${k}">${esc(label)}</label><select id="st_${k}" data-set="${k}" style="background:#161a22;color:#fff;border:1px solid #3a4252;border-radius:4px;padding:8px">${opts.map(([v, n]) => `<option value="${v}" ${String(st[k]) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    UI.show(`<div style="max-width:560px;margin:0 auto">${UI.top(T('settings'), '')}<div class="panel" style="display:flex;flex-direction:column;gap:14px">
      <div class="slider"><label for="st_vol"><span>${esc(T('volume'))}</span></label><input id="st_vol" type="range" min="0" max="1" step=".05" value="${st.vol}" data-set="vol"></div>
      <div class="slider"><label for="st_music"><span>${esc(T('music'))}</span></label><input id="st_music" type="range" min="0" max="1" step=".05" value="${st.music}" data-set="music"></div>
      ${sel('quality', T('quality'), [['auto', 'Auto'], ['low', T('qLow')], ['mid', T('qMid')], ['high', T('qHigh')]])}
      ${sel('cam', T('camera'), [[0, T('camChase')], [1, T('camFar')], [2, T('camHood')]])}
      ${sel('units', T('units'), [['kmh', T('kmh')], ['mph', T('mph')]])}
      ${sel('lang', T('lang'), [['ru', 'Русский'], ['en', 'English']])}
      <p class="muted small">${esc(T('help'))}</p>
      <button class="btn" data-act="backSettings" data-from="${from || ''}"><span>${esc(T('back'))}</span></button></div></div>`, '');
    UI.root.querySelector('.screen').style.background = 'rgba(7,8,11,.85)';
  },
  pause() {
    H.state = 'PAUSE'; UI.hud(false); Snd.engine(0, 0, false, 0); Snd.tires(0);
    UI.show(`<div class="center"><h2>${esc(T('paused'))}</h2><div class="row" style="justify-content:center">
      <button class="btn primary" data-act="resume" autofocus><span>${esc(T('resume'))}</span></button><button class="btn" data-act="restart"><span>${esc(T('restart'))}</span></button>
      <button class="btn" data-act="settings" data-from="pause"><span>⚙ ${esc(T('settings'))}</span></button><button class="btn ghost" data-act="toGarage"><span>${esc(T('toGarage'))}</span></button></div></div>`, '');
    UI.root.querySelector('.screen').style.background = 'rgba(7,8,11,.7)';
  },
  results() {
    const s = H.save, key = D.trackId + ':' + D.mode, tr = TRACKS[D.trackId]; H.state = 'RESULT'; UI.hud(false); Snd.engine(0, 0, false, 0); Snd.tires(0);
    let medal = -1, earn = Math.floor(D.score * CFG.MONEY_PER_POINT), rec = false;
    if (D.mode === 'chal') { tr.medals.forEach((m, i) => { if (D.score >= m) medal = i; }); earn += [0, 500, 1200, 2500][medal + 1]; if (D.score > (s.best[key] || 0)) { s.best[key] = D.score; rec = true; } }
    if (D.mode === 'time' && D.bestLap) { earn += Math.round(12000 / Math.max(20, D.bestLap)) * 10; if (!s.best[key] || D.bestLap < s.best[key]) { s.best[key] = D.bestLap; rec = true; } }
    if (D.mode === 'free' && D.score > (s.best[key] || 0)) { s.best[key] = D.score; rec = true; }
    s.money += earn; s.stats.drift += D.score; s.stats.runs++; Save.write(); if (medal >= 0) Snd.play('medal');
    const mName = [T('bronze'), T('silver'), T('gold')][medal] || T('noMedal'), mCol = ['#cd7f32', '#c0c0c0', '#ffd700'][medal] || '#8b95a7';
    UI.show(`<div class="center"><h2>${esc(T('results'))}</h2>${rec ? `<div class="head" style="color:var(--accent2);letter-spacing:.2em">★ ${esc(T('newRecord'))}</div>` : ''}
      ${D.mode === 'chal' ? `<div class="medal" style="color:${mCol};font-size:1.6em">● ${esc(mName)}</div>` : ''}
      <div class="panel kv" style="min-width:min(360px,92vw)"><span>${esc(T('score'))}</span><span>${fmt(D.score)}</span>
        ${D.mode === 'time' ? `<span>${esc(T('bestLap'))}</span><span>${D.bestLap ? fmtT(D.bestLap) : '—'}</span>` : ''}
        <span>×${esc('max')}</span><span>×${D.maxMul}</span><span>${esc(T('drift'))} max</span><span>${D.longest.toFixed(1)} s</span><span>${esc(T('earned'))}</span><span style="color:var(--accent2)">$ ${fmt(earn)}</span></div>
      <div class="row" style="justify-content:center"><button class="btn primary" data-act="restart" autofocus><span>${esc(T('restart'))}</span></button><button class="btn" data-act="toGarage"><span>${esc(T('toGarage'))}</span></button><button class="btn ghost" data-act="toHub"><span>${esc(T('toHub'))}</span></button></div></div>`, '');
    UI.root.querySelector('.screen').style.background = 'rgba(7,8,11,.75)';
  },
  // ---------- HUD ----------
  driftMsg(m, good) { const el = document.getElementById('hMsg'); el.textContent = m; el.style.color = good ? 'var(--good)' : 'var(--bad)'; D.msgT = 1.6; },
  drawMini() {
    const c = document.getElementById('mini'), g = c.getContext('2d'), t = D.tr; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const p of t.P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const sc = 160 / Math.max(x1 - x0, z1 - z0); UI.mini = { x0, z0, sc, ox: (180 - (x1 - x0) * sc) / 2, oz: (180 - (z1 - z0) * sc) / 2 };
    const bg = document.createElement('canvas'); bg.width = bg.height = 180; const b = bg.getContext('2d');
    b.fillStyle = 'rgba(8,10,14,.6)'; b.beginPath(); b.arc(90, 90, 89, 0, TAU); b.fill(); b.strokeStyle = 'rgba(255,255,255,.35)'; b.lineWidth = 6; b.lineJoin = 'round'; b.beginPath();
    t.P.forEach((p, i) => { const x = UI.mini.ox + (p.x - x0) * sc, y = UI.mini.oz + (p.z - z0) * sc; i ? b.lineTo(x, y) : b.moveTo(x, y); }); b.closePath(); b.stroke();
    UI.miniBg = bg; g.clearRect(0, 0, 180, 180); g.drawImage(bg, 0, 0);
  },
  hudUpdate(dt) {
    D.hudT -= dt; if (D.msgT > 0) { D.msgT -= dt; if (D.msgT <= 0) document.getElementById('hMsg').textContent = ''; }
    const mph = H.save.settings.units === 'mph', spd = D.speed * (mph ? 2.237 : 3.6);
    document.getElementById('hRpm').style.width = (D.rpm * 100).toFixed(1) + '%'; document.getElementById('hNos').style.width = (D.nitro * 100).toFixed(1) + '%';
    const dr = document.getElementById('hDrift'); dr.style.opacity = D.dPts > 0 || D.msgT > 0 ? 1 : 0;
    if (D.hudT > 0) return; D.hudT = 1 / 15;
    document.getElementById('hSpd').textContent = Math.round(spd); document.getElementById('hUnit').textContent = T(mph ? 'mph' : 'kmh');
    document.getElementById('hGear').textContent = D.vf < -.5 ? 'R' : D.speed < .5 ? 'N' : D.gear;
    document.getElementById('hPts').textContent = fmt(D.dPts); document.getElementById('hMul').textContent = '×' + D.dMul; document.getElementById('hAng').textContent = D.dPts > 0 ? Math.round(D.angle * 57.3) + '° ' + T('angle') : '';
    document.getElementById('hScoreL').textContent = T('score'); document.getElementById('hScore').textContent = fmt(D.score);
    const key = D.trackId + ':' + D.mode, best = H.save.best[key];
    document.getElementById('hBest').textContent = best ? T('best') + ': ' + (D.mode === 'time' ? fmtT(best) : fmt(best)) : '';
    document.getElementById('hTimer').textContent = D.count > 0 ? Math.ceil(D.count) : D.mode === 'chal' ? fmtT(D.left) : D.mode === 'time' ? `${T('lap')} ${Math.min(D.lap, CFG.LAPS)}/${CFG.LAPS} · ${fmtT(D.lapT)}` : fmtT(D.t);
    const c = document.getElementById('mini'), g = c.getContext('2d'), m = UI.mini; g.clearRect(0, 0, 180, 180); g.drawImage(UI.miniBg, 0, 0);
    const x = m.ox + (D.x - m.x0) * m.sc, y = m.oz + (D.z - m.z0) * m.sc; g.save(); g.translate(x, y); g.rotate(-D.h + Math.PI); g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(-6, 6); g.fill(); g.restore();
  },
};

// ==== 11. GAME LOOP & BOOT ====
const Game = {
  toDrive(track, mode) { startDrive(track, mode); },
  leaveDrive() { if (D.on) stopDrive(); UI.hud(false); },
};
function renderGarage(dt) {
  const g = W.garage, o = UI.orbit, car = g.userData.car; if (o.auto) o.a += dt * .18;
  const portrait = innerWidth < innerHeight, panel = H.state === 'GARAGE', focus = UI.tab === 'wheels' ? .8 : 1, d = o.dist * (UI.tab === 'wheels' ? .72 : 1) * (portrait ? 1.8 : 1);
  W.cam.position.set(Math.sin(o.a) * d, .6 + Math.sin(o.e) * d * .6 * focus, Math.cos(o.a) * d);
  W.cam.lookAt(0, (UI.tab === 'wheels' ? .35 : .65) - (portrait && panel ? 1.9 : 0), 0);
  W.cam.fov = damp(W.cam.fov, portrait ? 60 : 45, 4, dt); W.cam.updateProjectionMatrix();
  if (car) car.userData.wheels.forEach(w => { if (w.front) w.pivot.rotation.y = Math.sin(performance.now() / 1500) * .25; });
  W.renderer.toneMappingExposure = 1.1; W.renderer.render(g, W.cam);
}
function boot() {
  Save.load(); UI.init(); UI.apply(); Inp.init(); initRenderer(); initMaterials();
  W.garage = buildGarageScene(); UI.rebuildGarageCar();
  H.state = 'BOOT'; UI.boot();
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (H.state === 'DRIVE') UI.pause(); Save.write(); if (Snd.ctx) Snd.ctx.suspend(); } else if (Snd.ctx && H.state !== 'BOOT') Snd.ctx.resume(); });
  let last = performance.now(), acc = 0;
  const loop = now => {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now; if (dt > .1) dt = .1;
    Inp.poll(dt);
    if (Inp.pause) { Inp.pause = false; if (H.state === 'DRIVE') UI.pause(); else if (H.state === 'PAUSE') UI.act('resume', {}); }
    if (Inp.cam) { Inp.cam = false; if (H.state === 'DRIVE') { H.save.settings.cam = (H.save.settings.cam + 1) % 3; Save.write(); } }
    if (D.on && W.track) {
      if (H.state === 'DRIVE') { acc += dt; let n = 0; while (acc >= CFG.STEP && n < CFG.MAX_STEPS) { driveStep(CFG.STEP); acc -= CFG.STEP; n++; } if (n >= CFG.MAX_STEPS) acc = 0; driveVisual(dt); UI.hudUpdate(dt); }
      W.renderer.render(W.track.sc, W.cam);
    } else renderGarage(dt);
  };
  requestAnimationFrame(loop);
  H.dev = { D, W, UI, Save, CARS, startDrive, stopDrive, driveStep, Inp };
}
boot();
})();
