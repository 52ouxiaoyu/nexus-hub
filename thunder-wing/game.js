/* 雷霆之翼 Thunder Wing — 核心引擎
   竖版卷轴弹幕射击。固定步长 60Hz 逻辑 + rAF 渲染。 */
(function () {
  const TW = window.TW || (window.TW = {});

  /* ==================== 画布尺寸 ====================
     纵向高度恒定 800，横向宽度按屏幕比例自适应：
     宽屏摊宽到 MAX_W（视野更大、闪避空间更足），手机保持 480 竖屏手感不缩水。 */
  const H = 800, MIN_W = 420, MAX_W = 720;

  /* ---- 节奏常量（v1.3.0 实测调优）----
     COMBO_WIN：连击窗口。原 100 帧(1.67s) 短于击破间隔，连击必然断、倍率形同虚设。
     COMBO_CAP：倍率封顶所需连击数，x4.00 上限不变。
     BOSS_GRACE：脚本跑完后等待清场的宽限帧，超时强制 Boss 登场（防炮台卡关）。 */
  const COMBO_WIN = 210, COMBO_CAP = 30, BOSS_GRACE = 240;
  const PICK_LIFE = 180;   /* 三选一自动锁定前的思考帧数（3 秒） */
  let W = MIN_W;
  /* 战场越宽，自机速度等比补偿，避免横向机动变迟钝 */
  function fieldSpd() { return Math.min(1.25, Math.max(1, W / MIN_W)); }
  const VERSION = 'v1.2.0';

  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d', { alpha: false });
  let Q = 1;
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vh > 0) W = Math.round(Math.max(MIN_W, Math.min(MAX_W, (vw / vh) * H)));
    const scale = Math.min(vw / W, vh / H);
    Q = Math.min(2, Math.max(1, scale) * Math.min(window.devicePixelRatio || 1, 2));
    cv.width = Math.round(W * Q); cv.height = Math.round(H * Q);
    cv.style.width = Math.round(W * scale) + 'px'; cv.style.height = Math.round(H * scale) + 'px';
    if (TW.setWidth) TW.setWidth(W);
    initStars();
    if (G) G.players.forEach((pl) => { if (pl) pl.x = Math.min(pl.x, W - 16); });
  }
  window.addEventListener('resize', resize);

  /* ==================== 武器 ==================== */
  const WEAPONS = [
    { name: '火神炮', en: 'VULCAN', spr: 'vulcan', dmg: 2, interval: 6, color: '#7fe8ff' },
    { name: '激光炮', en: 'LASER', spr: 'laser', dmg: 7, interval: 10, color: '#5fb0ff', pierce: 2 },
    { name: '追踪导弹', en: 'MISSILE', spr: 'missile', dmg: 5, interval: 12, color: '#5ce8b4', homing: true },
  ];
  TW.WEAPONS = WEAPONS;

  /* ==================== 道具外观 ====================
     硬规则：有利 = 白色圆环徽章 + 呼吸光环 + 中心符号（圆形 = 安全）
             有害 = 暖色尖锐星芒 + 暗描边（尖角 = 危险）
     两套语言在颜色、形状、描边三个维度上都相反，余光也能分辨。 */
  const ITEM_LOOK = {
    power: { ring: '#7fe8ff', glyph: 'P', core: '#0b3242' },   // 火力
    bomb: { ring: '#ffe9a8', glyph: 'B', core: '#433208' },    // 大招
    speed: { ring: '#a8ffe0', glyph: 'S', core: '#08382b' },   // 速度
    life: { ring: '#ffc6e0', glyph: '♥', core: '#401028' },    // 残机
    medal: { ring: '#cfeaff', glyph: '★', core: '#10303f' },   // 加分
  };

  /* ==================== 玩家配色 / 构造 ==================== */
  const PCFG = [
    { tag: '1P', color: '#8cf0ff', ring: 'rgba(140,240,255,0.55)' },
    { tag: '2P', color: '#ffd45e', ring: 'rgba(255,212,94,0.6)' },
  ];
  function homeX(id, two) { return two ? (id === 0 ? W / 2 - 64 : W / 2 + 64) : W / 2; }
  function makePlayer(id, two) {
    return {
      id: id, tag: PCFG[id].tag, out: false,
      x: homeX(id, two), y: H - 120, vx: 0, vy: 0,
      r: 3, grazeR: 22, tilt: 0, dead: false,
      fireT: 0, charge: 0, invuln: 0, firing: false,
      lives: 3, bombs: 3, power: 1, weapon: 0, spd: 3,
      combo: 0, comboT: 0, graze: 0, kills: 0,
      /* Build（v1.3.0）：局内成长 */
      perks: {}, exp: 0, level: 0, nextExp: 5, queue: [],
      pick: null, pickIdx: 1, pickT: 0, pickMove: 0,
      satN: 0, satA: 0, satT: 0,
      /* 超载 OVERDRIVE（v1.3.0）：擦弹充能换即时战力 */
      od: 0, odCharge: 0, shieldT: 0,
      pk(n) { return this.perks[n] || 0; },
    };
  }

  /* ==================== 状态 ==================== */
  const G = {
    state: 'MENU',           // MENU / PLAYING / PAUSED / CLEAR / OVER / WIN
    mode: 'story',           // story / endless
    two: false,              // 是否双人同屏
    frame: 0, stage: 0, stageT: 0, scriptI: 0, pending: [],
    enemies: [], ebullets: [], pbullets: [], items: [], exps: [],
    boss: null,
    players: [],             // 玩家对象数组（1 或 2 个）
    score: 0, rank: 0, kills: 0,
    nextExtend: 80000, wave: 0, clearT: 0, flash: 0, deathT: 0,
    best: 0, sfx: true, waveMsg: 0, msgText: '',
    stars: [],

    reset(two) {
      this.enemies.length = 0; this.ebullets.length = 0; this.pbullets.length = 0;
      this.items.length = 0; this.pending.length = 0; this.exps.length = 0;
      this.frame = 0; this.stageT = 0; this.scriptI = 0; this.boss = null;
      this.score = 0; this.rank = 0; this.kills = 0;
      this.nextExtend = 80000; this.wave = 0; this.clearT = 0; this.flash = 0; this.deathT = 0;
      TW.FX.reset();
      this.two = !!two;
      this.players.length = 0;
      for (let i = 0; i < (this.two ? 2 : 1); i++) this.players.push(makePlayer(i, this.two));
      this.best = +(localStorage.getItem('tw_best') || 0);
    },
    rankSpd() { return 1 + this.rank * 0.0025; },
    rankRate() { return 1 + this.rank * 0.004; },
    mult(pl) { const p = pl || this.players[0]; return p ? 1 + Math.min(p.combo, COMBO_CAP) * (3 / COMBO_CAP) : 1; },
    alive() { const a = []; for (let i = 0; i < this.players.length; i++) if (!this.players[i].out) a.push(this.players[i]); return a; },
    grazeTotal() { let n = 0; for (let i = 0; i < this.players.length; i++) n += this.players[i].graze; return n; },
    bombTotal() { let n = 0; for (let i = 0; i < this.players.length; i++) n += Math.max(0, this.players[i].bombs); return n; },
    addScore(v, x, y, pl) {
      const s = Math.round(v * this.mult(pl));
      this.score += s;
      if (x !== undefined) TW.FX.text(x, y, '+' + s, '#ffe9a8', 12);
      while (this.score >= this.nextExtend) {
        this.nextExtend += 120000;
        for (let i = 0; i < this.players.length; i++) if (!this.players[i].out) this.players[i].lives++;
        TW.FX.text(W / 2, H / 2, '残机 +1', '#9ff0ff', 22);
        TW.Audio.extend();
      }
      return s;
    },
    clearBullets(score) {
      if (score) for (let i = 0; i < this.ebullets.length; i++) this.score += 30;
      this.ebullets.length = 0;
    },
  };
  TW.G = G;

  /* 单人场景的便捷代理：G.xxx / G.player 等价于 1P（仅用于读写的快捷方式，战斗逻辑一律走 p.xxx） */
  Object.defineProperty(G, 'player', {
    configurable: true, get() { return this.players[0] || null; },
  });
  ['lives', 'bombs', 'power', 'weapon', 'spd', 'combo', 'comboT', 'graze'].forEach((name) => {
    Object.defineProperty(G, name, {
      configurable: true,
      get() { const p = this.players[0]; return p ? p[name] : undefined; },
      set(v) { const p = this.players[0]; if (p) p[name] = v; },
    });
  });

  /* ==================== 星空背景 ==================== */
  function initStars() {
    G.stars = [];
    for (let l = 0; l < 3; l++) {
      const n = [38, 26, 14][l];
      for (let i = 0; i < n; i++) {
        G.stars.push({ x: Math.random() * W, y: Math.random() * H, l: l, s: 0.3 + l * 0.55, r: 0.6 + l * 0.5 });
      }
    }
  }
  resize();   /* 依赖 initStars / G，必须在二者都定义之后调用 */

  /* ==================== 输入 ====================
     每人只要三个键：方向 + 射击 + 大招；暂停全局共用。
     1P = WASD / 空格(J) / K(左Shift)
     2P = ↑↓←→ / 回车 / 右Shift(/)
     单人模式下方向键同样控制 1P。 */
  const keys = {};
  let touch = false, dragLast = null;
  const KEYMAP = [
    { lf: ['a'], rt: ['d'], up: ['w'], dn: ['s'], fire: [' ', 'j', 'z'], bomb: ['k', 'x', 'q', 'shiftleft'] },
    { lf: ['arrowleft'], rt: ['arrowright'], up: ['arrowup'], dn: ['arrowdown'],
      fire: ['enter', 'numpadenter'], bomb: ['slash', 'period', 'numpad0', 'shiftright'] },
  ];
  function held(list) {
    for (let i = 0; i < list.length; i++) if (keys[list[i]]) return true;
    return false;
  }
  function moveKeys(i) {
    const m = KEYMAP[i];
    if (i === 0 && !G.two) {
      return { lf: m.lf.concat(['arrowleft']), rt: m.rt.concat(['arrowright']),
        up: m.up.concat(['arrowup']), dn: m.dn.concat(['arrowdown']) };
    }
    return m;
  }
  function bombKeys(i) { return i === 0 && !G.two ? KEYMAP[0].bomb.concat(['shiftright']) : KEYMAP[i].bomb; }
  function isFire(i, k, code) { const l = KEYMAP[i].fire; return l.indexOf(k) >= 0 || (code && l.indexOf(code) >= 0); }
  function isBomb(i, k, code) { const l = bombKeys(i); return l.indexOf(k) >= 0 || (code && l.indexOf(code) >= 0); }

  function pressKey(k, code, down) {
    keys[k] = !!down;
    if (code) keys[code] = !!down;
    for (let i = 0; i < G.players.length; i++) {
      if (isFire(i, k, code)) G.players[i].firing = !!down;
    }
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = (e.code || '').toLowerCase();
    pressKey(k, code, true);
    if (k === 'p' || k === 'escape') togglePause();
    if (k === 'enter' && (G.state === 'MENU' || G.state === 'OVER' || G.state === 'WIN')) {
      startGame(G.state === 'MENU' ? (document.body.dataset.mode || 'story') : G.mode,
        document.body.dataset.two === '1');
    }
    if (G.state === 'PLAYING') {
      for (let i = 0; i < G.players.length; i++) {
        if (e.repeat) continue;
        const pl = G.players[i];
        if (pl && pl.pick && (isBomb(i, k, code) || isFire(i, k, code))) { TW.confirmPick(pl); continue; }
        if (isBomb(i, k, code)) useBomb(pl);
      }
    }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    pressKey(k, (e.code || '').toLowerCase(), false);
  });

  function toLogical(cx, cy) {
    const r = cv.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
  }
  cv.addEventListener('pointerdown', (e) => {
    touch = true; TW.Audio.init(); TW.Audio.resume();
    const p = toLogical(e.clientX, e.clientY);
    dragLast = p;
    const p1 = G.players[0];
    if (!p1) return;
    // 直接拖动：把飞机拉到手指位置（相对位移，手指不遮挡机体）
    p1.x = p.x; p1.y = p.y - 40;
    cv.setPointerCapture(e.pointerId);
    p1.firing = true;
  });
  cv.addEventListener('pointermove', (e) => {
    const p1 = G.players[0];
    if (!dragLast || !p1) return;
    const p = toLogical(e.clientX, e.clientY);
    p1.x += (p.x - dragLast.x) * 1.55;
    p1.y += (p.y - dragLast.y) * 1.55;
    dragLast = p;
  });
  const endDrag = () => { dragLast = null; if (touch && G.players[0]) G.players[0].firing = true; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // 触屏炸弹按钮
  const bombBtn = document.getElementById('btn-bomb');
  if (bombBtn) bombBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); useBomb(); });
  if (bombBtn) bombBtn.style.display = ('ontouchstart' in window) ? 'flex' : 'none';

  /* ==================== 玩家 ==================== */
  function updatePlayer(pl) {
    if (pl.out) return;
    if (pl.dead) {
      pl.dead = false;
      pl.x = homeX(pl.id, G.two); pl.y = H - 120; pl.invuln = 150;
    }
    if (pl.invuln > 0) pl.invuln--;

    let dx = 0, dy = 0;
    if (!(touch && pl.id === 0)) {
      const m = moveKeys(pl.id);
      if (held(m.lf)) dx -= 1;
      if (held(m.rt)) dx += 1;
      if (held(m.up)) dy -= 1;
      if (held(m.dn)) dy += 1;
      if (dx && dy) { const k = Math.SQRT1_2; dx *= k; dy *= k; }
      const sp = (3.6 + pl.spd * 0.35) * fieldSpd();
      pl.x += dx * sp; pl.y += dy * sp;
      pl.tilt += ((dx * 0.22) - pl.tilt) * 0.18;
    }
    pl.x = Math.max(16, Math.min(W - 16, pl.x));
    pl.y = Math.max(40, Math.min(H - 24, pl.y));

    if (pl.invuln > 0 && pl.invuln % 8 < 4) { /* 闪烁 */ }

    /* 三选一：左右移动改高亮，超时自动锁定（不新增按键、不打断节奏） */
    if (TW.updatePick(pl, dx)) {
      if (pl.pickT >= PICK_LIFE) TW.confirmPick(pl);
      updateSats(pl);
      return;
    }
    if (pl.shieldT > 0) pl.shieldT--;
    if (pl.od > 0) pl.od--;

    /* 射击 */
    const wp = WEAPONS[pl.weapon];
    const shooting = pl.firing || (touch && pl.id === 0);
    if (shooting && G.state === 'PLAYING') {
      pl.fireT--;
      if (pl.fireT <= 0) {
        shoot(pl, wp);
        /* 射速：词条 +18%/级，超载时再 ×1.35 */
        const k = (1 + 0.18 * pl.pk('rapid')) * (pl.od > 0 ? 1.35 : 1);
        pl.fireT = Math.max(3, Math.round(wp.interval / k));
      }
      pl.charge++;
      if (pl.charge >= 48) { pl.charge = 0; fireCharge(pl, wp); }
    } else if (pl.charge > 0) {
      pl.charge = Math.max(0, pl.charge - 1.5);
    }
    updateSats(pl);
  }

  function pickActive() {
    for (let i = 0; i < G.players.length; i++) if (G.players[i] && G.players[i].pick) return true;
    return false;
  }

  /* 环绕炮台：自动锁定最近敌人开火 */
  function updateSats(pl) {
    if (!pl.satN) return;
    pl.satA += 0.05;
    if (pl.satT > 0) { pl.satT--; return; }
    let best = null, bd = Infinity;
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (e.dead || e.dying) continue;
      const d = Math.hypot(e.x - pl.x, e.y - pl.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    pl.satT = 26;
    for (let i = 0; i < pl.satN; i++) {
      const a = pl.satA + (Math.PI * 2 / pl.satN) * i;
      const sx = pl.x + Math.cos(a) * 46, sy = pl.y + Math.sin(a) * 46;
      addBullet(pl, sx, sy, Math.atan2(best.y - sy, best.x - sx), 9, 2, 'wing', 0);
    }
  }

  /* 击破溅射：向四周喷弹片，制造连锁清屏的爽点 */
  function splashOnKill(e, pl) {
    const lv = pl ? pl.pk('splash') : 0;
    if (!lv) return;
    const n = 4 + lv * 2;
    for (let i = 0; i < n; i++) {
      addBullet(pl, e.x, e.y, (Math.PI * 2 / n) * i, 7, 2, 'wing', 0);
    }
  }

  function shoot(pl, wp) {
    const lv = pl.power;
    const ang = -Math.PI / 2;
    if (pl.weapon === 0) {
      const n = [2, 3, 4, 5, 7][lv - 1];
      const spread = [0.05, 0.09, 0.14, 0.17, 0.16][lv - 1];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread;
        addBullet(pl, pl.x, pl.y - 14, ang + off, 11, wp.dmg, wp.spr, 0);
      }
    } else if (pl.weapon === 1) {
      const n = [1, 2, 2, 3, 4][lv - 1];
      const offs = n === 1 ? [0] : n === 2 ? [-8, 8] : n === 3 ? [-12, 0, 12] : [-18, -6, 6, 18];
      for (let i = 0; i < n; i++) addBullet(pl, pl.x + offs[i], pl.y - 16, ang, 15, wp.dmg, wp.spr, 2);
    } else {
      const n = [2, 2, 3, 4, 5][lv - 1];
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i - (n - 1) / 2) * 0.5;
        addBullet(pl, pl.x, pl.y - 12, ang + off * 0.25, 7.5, wp.dmg, wp.spr, 0, true);
      }
    }
    /* 僚机 */
    if (lv >= 3) {
      const wa = lv >= 5 ? 0.13 : 0;
      addBullet(pl, pl.x - 26, pl.y + 2, ang - wa, 10, 1, 'wing', 0);
      addBullet(pl, pl.x + 26, pl.y + 2, ang + wa, 10, 1, 'wing', 0);
    }
    if (G.sfx) (pl.weapon === 1 ? TW.Audio.laser() : pl.weapon === 2 ? TW.Audio.missile() : TW.Audio.shot());
  }

  function addBullet(pl, x, y, ang, sp, dmg, kind, pierce, homing) {
    if (G.pbullets.length > 260) return;
    G.pbullets.push({
      x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      dmg: dmg, kind: kind, pierce: pierce || 0, homing: !!homing, hit: [], t: 0,
      owner: pl ? pl.id : 0,
      w: kind === 'laser' ? 10 : (kind === 'charge' ? 16 : (kind === 'wing' ? 7 : 8)),
      h: kind === 'laser' ? 30 : (kind === 'charge' ? 28 : (kind === 'wing' ? 13 : 16)),
      r: kind === 'laser' ? 6 : 5,
    });
  }

  function fireCharge(pl, wp) {
    TW.Audio.chargeFire();
    TW.FX.ring(pl.x, pl.y - 10, 14, '#9ff0ff', 20);
    if (pl.weapon === 0) {
      for (let i = -1; i <= 1; i++) addBullet(pl, pl.x, pl.y - 18, -Math.PI / 2 + i * 0.13, 13, 3, 'charge', 1);
    } else if (pl.weapon === 1) {
      for (let i = -1; i <= 1; i++) addBullet(pl, pl.x + i * 14, pl.y - 18, -Math.PI / 2, 17, 9, 'charge', 6);
    } else {
      for (let i = 0; i < 5; i++) addBullet(pl, pl.x, pl.y - 14, -Math.PI / 2 + (i - 2) * 0.3, 9, 4, 'charge', 0, true);
    }
    G.rank = Math.min(100, G.rank + 1);
  }

  /* ==================== 道具 ==================== */
  TW.dropItem = function (x, y, kind) {
    if (kind === 'weapon') {
      if (G.two) {
        // 双人：三种武器各掉一个，两人各取所需
        const base = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
          G.items.push({ x: x + (i - 1) * 22, y: y, vy: 1.5, vx: 0, kind: 'weapon', w: (base + i) % 3, t: 0 });
        }
        return;
      }
      const cur = G.players[0] ? G.players[0].weapon : 0;
      let w = cur;
      while (w === cur) w = Math.floor(Math.random() * 3);
      G.items.push({ x: x, y: y, vy: 1.5, vx: 0, kind: 'weapon', w: w, t: 0 });
      return;
    }
    G.items.push({ x: x, y: y, vy: 1.5, vx: 0, kind: kind, t: 0 });
    // 双人模式火力道具成对掉落，避免抢资源
    if (G.two && kind === 'power') {
      G.items.push({ x: Math.min(W - 16, x + 26), y: y, vy: 1.5, vx: 0, kind: kind, t: 0 });
    }
  };

  function updateItems() {
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      it.t++; it.y += it.vy; it.x += Math.sin(it.t * 0.06) * 0.7;
      if (it.y > H + 30) { G.items.splice(i, 1); continue; }
      for (let j = 0; j < G.players.length; j++) {
        const pl = G.players[j];
        if (pl.out || pl.dead) continue;
        if (Math.hypot(it.x - pl.x, it.y - pl.y) < 30) {
          applyItem(it, pl); G.items.splice(i, 1); break;
        }
      }
    }
  }

  function applyItem(it, pl) {
    const px = pl.x, py = pl.y - 30;
    switch (it.kind) {
      case 'power':
        if (pl.power < 5) {
          pl.power++; TW.FX.text(px, py, pl.tag + ' 火力 ' + pl.power, '#9ff0ff', 15);
          G.rank = Math.min(100, G.rank + 8);
        } else { G.addScore(2000, px, py, pl); }
        TW.Audio.powerup(); break;
      case 'weapon':
        if (it.w === pl.weapon && pl.weapon !== undefined) { G.addScore(800, px, py, pl); break; }
        pl.weapon = it.w; pl.power = Math.max(2, pl.power);
        TW.FX.text(px, py, pl.tag + ' ' + WEAPONS[pl.weapon].name, WEAPONS[pl.weapon].color, 15);
        TW.Audio.powerup(); break;
      case 'bomb':
        pl.bombs = Math.min(5, pl.bombs + 1);
        TW.FX.text(px, py, pl.tag + ' 大招 +1', '#ffd27a', 15);
        TW.Audio.pickup(); break;
      case 'speed':
        pl.spd = Math.min(5, pl.spd + 1);
        TW.FX.text(px, py, pl.tag + ' 速度 +1', '#9ff0ff', 15);
        TW.Audio.pickup(); break;
      case 'life':
        pl.lives++; TW.FX.text(px, py, pl.tag + ' 残机 +1', '#ff9ad6', 17);
        TW.Audio.extend(); break;
      case 'medal':
        G.addScore(1500, px, py, pl); TW.Audio.pickup(); break;
    }
  }

  /* ==================== 炸弹 / 大招 ==================== */
  function useBomb(pl) {
    if (!pl) pl = G.players[0];
    if (G.state !== 'PLAYING' || !pl || pl.out || pl.dead) return;
    if (pl.bombs <= 0 || pl.invuln > 90) return;
    pl.bombs--;
    pl.invuln = Math.max(pl.invuln, 95);
    G.clearBullets(true);
    G.flash = 12;
    TW.FX.quake(10, 26); TW.FX.stop(6);
    TW.FX.bigBoom(pl.x, pl.y, 4, pl.id === 0 ? '#bff6ff' : '#ffe6a8');
    TW.Audio.bomb();
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (e.boss) { if (!e.dying) hurtEnemy(e, 40, e.x, e.y, pl); }
      else hurtEnemy(e, 25, e.x, e.y, pl);
    }
    G.rank = Math.max(0, G.rank - 6);
  }

  /* ==================== 伤害与击破 ==================== */
  function hurtEnemy(e, dmg, hx, hy, pl) {
    if (e.boss) {
      if (e.invuln > 0 || e.dying) return;
      e.hp -= dmg; e.flash = 3;
      if (e.hp <= 0) { e.hp = 0; bossDown(e, pl); }
      return;
    }
    e.hp -= dmg; e.flash = 3;
    TW.FX.hit(hx, hy, '#ffffff');
    if (e.hp <= 0) killEnemy(e, pl);
  }

  function killEnemy(e, pl) {
    if (e.dead) return;
    e.dead = true;
    TW.FX.boom(e.x, e.y, e.type === 'bomber' || e.type === 'gunship' ? 1.7 : 1, '#ffb04a');
    TW.Audio.explode();
    G.kills++;
    if (pl) { pl.kills++; pl.combo++; pl.comboT = COMBO_WIN; }
    G.rank = Math.min(100, G.rank + 0.18);
    G.addScore(e.score, e.x, e.y - 10, pl);
    TW.spawnExp(e.x, e.y, (e.type === 'gunship' || e.type === 'bomber') ? 3 : 1);
    splashOnKill(e, pl);
    if (e.item) TW.dropItem(e.x, e.y, e.item);
    else if (Math.random() < (G.two ? 0.18 : 0.14)) TW.dropItem(e.x, e.y, 'medal');
  }

  function bossDown(b, pl) {
    b.dying = true; b.dyT = 0; b.invuln = 99999;
    TW.FX.stop(12); TW.FX.quake(9, 30);
    TW.Audio.bigExplode();
    G.addScore(b.score, b.x, b.y + 90, pl);
    const drops = G.two ? 2 : 1;
    for (let i = 0; i < b.parts.length; i++) {
      if (!b.parts[i].alive) continue;
      b.parts[i].alive = false;
      for (let k = 0; k < drops; k++) {
        TW.dropItem(b.x + b.parts[i].ox + (drops > 1 ? (k ? 18 : -18) : 0), b.y + b.parts[i].oy, 'power');
      }
    }
  }

  function playerDie(pl) {
    if (pl.invuln > 0 || G.state !== 'PLAYING' || pl.out) return;
    pl.lives--;
    pl.combo = 0; pl.comboT = 0;
    G.rank = Math.max(0, G.rank - 28);
    pl.power = Math.max(1, pl.power - 2);
    G.clearBullets(false);
    TW.FX.bigBoom(pl.x, pl.y, 2.4, '#ff8a5c');
    TW.FX.quake(9, 24); TW.Audio.death();
    G.flash = 8;
    if (pl.lives < 0) {
      pl.out = true; pl.firing = false; pl.dead = false;
      if (G.alive().length === 0) {
        G.state = 'OVER';
        if (G.score > G.best) { G.best = G.score; localStorage.setItem('tw_best', G.best); }
        showOverlay('result');
      } else {
        TW.FX.text(W / 2, H / 2, pl.tag + ' 已出局', PCFG[pl.id].color, 22);
      }
      return;
    }
    pl.dead = true; pl.invuln = 150;
    G.deathT = 40;
  }

  /* ==================== 碰撞 ==================== */
  function collide() {
    /* 我方子弹 → 敌人 */
    for (let i = G.pbullets.length - 1; i >= 0; i--) {
      const b = G.pbullets[i];
      b.t++;
      if (b.homing) steer(b);
      b.x += b.vx; b.y += b.vy;
      if (b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) { G.pbullets.splice(i, 1); continue; }
      let consumed = false;
      for (let j = 0; j < G.enemies.length; j++) {
        const e = G.enemies[j];
        if (e.dead || e.dying) continue;
        const pl = G.players[b.owner] || G.players[0] || null;
        let hit = false, hx = b.x, hy = b.y;
        if (e.boss) {
          for (let k = 0; k < e.parts.length; k++) {
            const pt = e.parts[k];
            if (!pt.alive) continue;
            if (Math.hypot(b.x - (e.x + pt.ox), b.y - (e.y + pt.oy)) < pt.r + b.r) {
              pt.hp -= b.dmg; hit = true; hx = e.x + pt.ox; hy = e.y + pt.oy;
              TW.FX.hit(hx, hy, '#ffd08a');
              if (pt.hp <= 0) { /* 由 updateBoss 处理爆炸 */ }
              break;
            }
          }
          if (!hit) {
            const dx = (b.x - e.x) / e.r, dy = (b.y - e.y) / (e.r * 0.85);
            if (dx * dx + dy * dy < 1) { hit = true; }
          }
        } else {
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r * 0.8 + b.r) hit = true;
        }
        if (hit) {
          if (b.pierce > 0) {
            if (b.hit.indexOf(e) >= 0) continue;
            b.hit.push(e); b.pierce--;
            hurtEnemy(e, b.dmg * 0.85, hx, hy, pl);
          } else {
            hurtEnemy(e, b.dmg, hx, hy, pl);
            consumed = true;
          }
          TW.FX.hit(hx, hy, '#ffffff');
          if (G.sfx && b.t % 2 === 0) TW.Audio.hit();
          break;
        }
      }
      if (consumed) G.pbullets.splice(i, 1);
    }

    if (G.players.length === 0) return;

    /* 敌弹 → 玩家（逐在多玩家身上独立判定） */
    for (let i = G.ebullets.length - 1; i >= 0; i--) {
      const b = G.ebullets[i];
      if (!b) break;   // 玩家阵亡会清屏，后续索引已失效
      b.t++;
      b.x += b.vx; b.y += b.vy;
      if (b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) { G.ebullets.splice(i, 1); continue; }
      if (!b.gz) b.gz = [false, false];
      let gone = false;
      for (let j = 0; j < G.players.length; j++) {
        const pl = G.players[j];
        if (pl.out || pl.dead) continue;
        const d = Math.hypot(b.x - pl.x, b.y - pl.y);
        if (d < pl.r + b.r * 0.62) {
          G.ebullets.splice(i, 1);
          playerDie(pl);
          gone = true; break;
        }
        if (!b.gz[j] && d < pl.grazeR + b.r) {
          b.gz[j] = true; pl.graze++;
          G.addScore(50, undefined, undefined, pl);
          G.rank = Math.min(100, G.rank + 0.05);
          TW.FX.graze(pl.x, pl.y);
          if (G.sfx && pl.graze % 3 === 0) TW.Audio.graze();
        }
      }
      if (gone) continue;
    }

    /* 撞机 */
    for (let j = 0; j < G.enemies.length; j++) {
      const e = G.enemies[j];
      if (e.dead || e.dying) continue;
      for (let k = 0; k < G.players.length; k++) {
        const pl = G.players[k];
        if (pl.out || pl.dead) continue;
        if (e.boss) {
          const dx = (pl.x - e.x) / (e.r * 0.9), dy = (pl.y - e.y) / (e.r * 0.7);
          if (dx * dx + dy * dy < 1) { playerDie(pl); break; }
        } else if (Math.hypot(pl.x - e.x, pl.y - e.y) < e.r * 0.62 + pl.r) {
          if (e.ground) { hurtEnemy(e, 12, e.x, e.y, pl); }
          playerDie(pl); break;
        }
      }
    }
  }

  function steer(b) {
    let best = null, bd = 1e9;
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (e.dead || e.dying) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best || bd > 300) return;
    const want = Math.atan2(best.y - b.y, best.x - b.x);
    const cur = Math.atan2(b.vy, b.vx);
    let da = want - cur;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const na = cur + Math.max(-0.16, Math.min(0.16, da));
    const sp = Math.hypot(b.vx, b.vy);
    b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
  }

  /* ==================== 关卡流程 ==================== */
  function startStage(n) {
    G.stage = n;
    G.stageT = 0; G.scriptI = 0;
    G.pending.length = 0;
    G.enemies.length = 0; G.ebullets.length = 0; G.items.length = 0;
    G.boss = null;
    if (n < TW.STAGES.length) {
      G.msgText = 'STAGE ' + (n + 1) + '  ' + TW.STAGES[n].name;
    } else {
      G.msgText = '无尽 ' + (n + 1);
    }
    G.waveMsg = 130;
  }

  function runScript() {
    if (G.mode === 'endless') { runEndless(); return; }
    const st = TW.STAGES[G.stage];
    if (!st) return;
    while (G.scriptI < st.script.length && st.script[G.scriptI].t <= G.stageT) {
      st.script[G.scriptI].fn();
      G.scriptI++;
    }
    if (G.scriptI >= st.script.length && G.stageT >= st.len && !G.boss && G.pending.length === 0) {
      /* 原逻辑要求场上敌人全部清零才出 Boss；turret / hover 不会自己离场，
         漏掉一个角落炮台就会无限拖住关卡。改为：清场即触发，超时 4 秒强制触发并让残敌撤离。 */
      const forced = G.stageT >= st.len + BOSS_GRACE && G.enemies.length > 0;
      if (G.enemies.length === 0 || forced) {
        if (forced) {
          for (let i = 0; i < G.enemies.length; i++) {
            const e = G.enemies[i];
            if (e.boss) continue;
            e.vy = 3.2; e.fireT = 99999; e.leaving = true;
          }
          G.enemies.length = 0;
        }
        TW.spawnBoss(st.boss);
        G.msgText = 'WARNING';
        G.waveMsg = 110;
      }
    }
  }

  function runEndless() {
    if (G.boss) return;
    if (G.stageT % 300 === 0 && G.enemies.length < 24) {
      G.wave++;
      const k = 1 + G.wave * 0.1;
      const F = TW.F;
      const roll = Math.floor(Math.random() * 6);
      if (G.wave % 5 === 0) {
        const bs = Math.min(4, Math.floor(G.wave / 5) - 1);
        TW.spawnBoss(bs);
        G.boss.hp = G.boss.maxhp = Math.round(G.boss.maxhp * (1 + G.wave * 0.06));
        G.msgText = 'WARNING';
        G.waveMsg = 110;
        return;
      }
      if (roll === 0) F.vee('drone', 7, 240, 44, 2.0 * k);
      else if (roll === 1) F.sine('fighter', 6, 70, 70, 2.2 * k);
      else if (roll === 2) F.ground('tank', 5, 50, { item: Math.random() < 0.4 ? 'power' : null, hpMul: k });
      else if (roll === 3) F.dive('fighter', 6, Math.random() < 0.5 ? -1 : 1, 20);
      else if (roll === 4) F.hover('gunship', 3, [90, 240, 390], 160, { item: Math.random() < 0.5 ? 'power' : null, hpMul: k });
      else F.line('bomber', 2, 140, 170, 1.4, { hpMul: k, item: Math.random() < 0.4 ? 'bomb' : null });
      G.msgText = 'WAVE ' + G.wave;
      G.waveMsg = 90;
    }
  }

  /* ==================== 主更新 ==================== */
  function update() {
    if (G.state === 'CLEAR') {
      G.clearT--;
      TW.FX.update();
      if (G.clearT <= 0) { G.state = 'PLAYING'; startStage(G.stage + 1); }
      return;
    }
    if (G.state !== 'PLAYING') { TW.FX.update(); return; }
    G.frame++;
    if (TW.FX.hitstop > 0) { TW.FX.hitstop--; return; }
    G.stageT++;
    if (G.waveMsg > 0) G.waveMsg--;
    if (G.flash > 0) G.flash--;
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      if (pl.comboT > 0) { pl.comboT--; if (pl.comboT === 0) pl.combo = 0; }
    }
    G.rank = Math.min(100, G.rank + 0.006);

    /* 延迟生成 */
    for (let i = G.pending.length - 1; i >= 0; i--) {
      if (G.pending[i].t <= G.frame) { G.pending[i].fn(); G.pending.splice(i, 1); }
    }

    runScript();
    for (let i = 0; i < G.players.length; i++) updatePlayer(G.players[i]);

    for (let i = G.enemies.length - 1; i >= 0; i--) {
      const e = G.enemies[i];
      if (e.boss) {
        if (e.dying) {
          e.dyT++;
          if (e.dyT % 7 === 0) TW.FX.bigBoom(e.x + (Math.random() - 0.5) * 110, e.y + (Math.random() - 0.5) * 70, 2, '#ffd27a');
          if (e.dyT > 66) {
            G.enemies.splice(i, 1); G.boss = null;
            if (G.mode === 'endless') { G.stageT = 0; }
            else stageClear();
          }
          continue;
        }
        TW.updateBoss(e);
      } else {
        TW.updateEnemy(e);
      }
      if (e.dead && !e.boss) G.enemies.splice(i, 1);
    }

    /* 三选一期间世界降速到 1/3（玩家照常操作），既保留紧张感又不打断节奏 */
    const slow = pickActive();
    if (!slow || (G.frame % 3 === 0)) {
      updateItems();
      collide();
    }
    TW.updateExp();
    TW.FX.update();

    /* 背景 */
    const spd = 1 + (G.players[0] ? G.players[0].spd : 3) * 0.15;
    for (let i = 0; i < G.stars.length; i++) {
      const s = G.stars[i];
      s.y += s.s * spd;
      if (s.y > H) { s.y = -4; s.x = Math.random() * W; }
    }
  }

  function stageClear() {
    const bonus = 10000 + G.bombTotal() * 1500 + G.grazeTotal() * 20;
    G.score += bonus;
    if (G.stage + 1 >= TW.STAGES.length) {
      G.state = 'WIN';
      if (G.score > G.best) { G.best = G.score; localStorage.setItem('tw_best', G.best); }
      showOverlay('result');
    } else {
      G.state = 'CLEAR';
      G.clearT = 200;
      G.msgText = 'STAGE CLEAR  +' + bonus;
      G.waveMsg = 190;
    }
  }

  /* ==================== 渲染 ==================== */
  function sprImg(name) {
    if (name.indexOf('boss') === 0) return TW.SPR.boss[+name.slice(4)];
    return TW.SPR[name];
  }
  function sprWhite(name) {
    if (name.indexOf('boss') === 0) return TW.SPRW.boss[+name.slice(4)];
    return TW.SPRW[name];
  }
  function drawSpr(img, x, y, sw, sh, rot, flash, wimg) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    if (flash && wimg) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;   // 受击白闪：过强会把暖色涂装刷成灰白，丢掉敌我色号
      ctx.drawImage(wimg, -sw / 2, -sh / 2, sw, sh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(Q, 0, 0, Q, 0, 0);
    const st = TW.STAGES[Math.min(G.stage, TW.STAGES.length - 1)];
    ctx.fillStyle = st.tint;
    ctx.fillRect(0, 0, W, H);

    /* 星云层（滚动） */
    const ny = (G.stageT * 0.42) % 1200;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(TW.SPR.nebula, 0, ny - 1200, W, 1200);
    ctx.drawImage(TW.SPR.nebula, 0, ny, W, 1200);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const sh = TW.FX.shake;
    if (sh > 0.2) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    /* 星空 */
    ctx.fillStyle = st.star;
    for (let i = 0; i < G.stars.length; i++) {
      const s = G.stars[i];
      ctx.globalAlpha = 0.25 + s.l * 0.3;
      ctx.fillRect(s.x, s.y, s.r, s.r * 2.2);
    }
    ctx.globalAlpha = 1;

    /* 道具：白色圆环徽章 + 呼吸光环（敌弹是暖色尖芒，二者不会混） */
    for (let i = 0; i < G.items.length; i++) {
      const it = G.items[i];
      const L = it.kind === 'weapon'
        ? { ring: WEAPONS[it.w].color, glyph: 'W', core: '#111a2c' }
        : (ITEM_LOOK[it.kind] || ITEM_LOOK.medal);
      const R = 13;
      ctx.save();
      ctx.translate(it.x, it.y);
      /* 呼吸光环：白色，和敌弹的暖色形成互补 */
      const pw = 0.32 + Math.sin(it.t * 0.12) * 0.16;
      const pr = R * (1.5 + Math.sin(it.t * 0.09) * 0.16);
      ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0.08, pw) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.stroke();
      /* 柔和冷光 */
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
      grd.addColorStop(0, 'rgba(180,235,255,0.42)');
      grd.addColorStop(1, 'rgba(180,235,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();
      /* 徽章本体：实心圆 + 白色粗环 + 内部彩色细环 */
      ctx.fillStyle = L.core;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = L.ring; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, R - 3.4, 0, Math.PI * 2); ctx.stroke();
      /* 中心符号 */
      ctx.fillStyle = L.ring;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(L.glyph, 0, L.glyph === '♥' || L.glyph === '★' ? 5 : 4.5);
      ctx.restore();
      ctx.textAlign = 'left';
    }

    /* 敌人 */
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (e.boss) {
        drawSpr(sprImg(e.spr), e.x, e.y, e.r * 2.6, e.r * 1.9, 0, e.flash > 0, sprWhite(e.spr));
        for (let k = 0; k < e.parts.length; k++) {
          const pt = e.parts[k];
          if (!pt.alive) continue;
          drawSpr(TW.SPR.part, e.x + pt.ox, e.y + pt.oy, 30, 30, 0, pt.hp < pt.maxhp * 0.4 && e.t % 6 < 3, TW.SPRW.part);
          ctx.fillStyle = 'rgba(255,120,80,0.75)';
          ctx.fillRect(e.x + pt.ox - 14, e.y + pt.oy - 20, 28 * (pt.hp / pt.maxhp), 3);
        }
      } else {
        drawSpr(sprImg(e.spr), e.x, e.y, e.r * 2.6, e.r * 2.6, 0, e.flash > 0, sprWhite(e.spr));
        if (e.hp < e.maxhp && e.maxhp > 10) {
          ctx.fillStyle = 'rgba(255,90,110,0.8)';
          ctx.fillRect(e.x - 14, e.y - e.r - 8, 28 * (e.hp / e.maxhp), 2.5);
        }
      }
    }

    /* 我方子弹 */
    for (let i = 0; i < G.pbullets.length; i++) {
      const b = G.pbullets[i];
      const img = TW.BULLET[b.kind];
      drawSpr(img, b.x, b.y, b.w, b.h, Math.atan2(b.vy, b.vx) + Math.PI / 2, false);
    }

    /* 敌弹：暖色尖芒。刚出膛的几帧套一圈收缩白环，给密集弹幕一个「入屏预警」 */
    for (let i = 0; i < G.ebullets.length; i++) {
      const b = G.ebullets[i];
      const img = TW.BULLET[b.kind] || TW.BULLET.red;
      const s = b.r * 4.2;
      drawSpr(img, b.x, b.y, s, s, 0, false);
      if (b.t < 7) {
        ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - b.t / 7) * 0.75) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(b.x, b.y, s * 0.6 + (7 - b.t) * 1.8, 0, Math.PI * 2); ctx.stroke();
      }
    }

    /* 玩家 */
    if (G.state === 'PLAYING') {
      for (let i = G.players.length - 1; i >= 0; i--) {
        const p = G.players[i];
        if (!p || p.out) continue;
        const body = p.id === 0 ? TW.SPR.player : TW.SPR.player2;
        const wing = p.id === 0 ? TW.SPR.wing : TW.SPR.wing2;
        if (!(p.invuln > 0 && p.invuln % 8 < 4)) {
          drawSpr(body, p.x, p.y, 40, 44, p.tilt, false);
          if (p.power >= 3) {
            drawSpr(wing, p.x - 26, p.y + 4, 18, 20, 0, false);
            drawSpr(wing, p.x + 26, p.y + 4, 18, 20, 0, false);
          }
        }
        /* 队友识别环 + 编号（仅双人） */
        if (G.two) {
          ctx.strokeStyle = PCFG[p.id].ring;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 2, 24, 27, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '700 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = PCFG[p.id].color;
          ctx.globalAlpha = 0.85;
          ctx.fillText(p.tag, p.x, p.y + 40);
          ctx.globalAlpha = 1;
        }
        /* 判定点（擦弹判定圈常态淡显） */
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.grazeR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
        /* 蓄力条 */
        if (p.charge > 4) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(p.x - 20, p.y + 26, 40, 4);
          ctx.fillStyle = p.charge >= 44 ? '#ffffff' : '#7fe8ff';
          ctx.fillRect(p.x - 20, p.y + 26, 40 * Math.min(1, p.charge / 48), 4);
        }
      }
    }

    TW.FX.draw(ctx);

    /* 屏幕闪光 */
    if (G.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (G.flash / 26) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    /* 波次提示 */
    if (G.waveMsg > 0) {
      const a = Math.min(1, G.waveMsg / 30);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillStyle = G.msgText === 'WARNING' ? '#ff6b7d' : '#9ff0ff';
      ctx.fillText(G.msgText, W / 2, 300);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    drawHUD();
  }

  function drawHUD() {
    ctx.textAlign = 'left';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SCORE ' + G.score, 12, 26);
    ctx.font = '400 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('HI ' + Math.max(G.best, G.score), 12, 42);

    /* 残机 / 炸弹（逐玩家分行） */
    ctx.textAlign = 'right';
    ctx.font = '600 13px system-ui, sans-serif';
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      if (G.two) {
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillStyle = PCFG[i].color;
        ctx.fillText(pl.tag + (pl.out ? ' OUT' : ' 残机 ' + Math.max(0, pl.lives) + '  大招 ' + pl.bombs),
          W - 12, 26 + i * 20);
      } else {
        ctx.fillStyle = '#9ff0ff';
        ctx.fillText('残机 ' + Math.max(0, pl.out ? 0 : pl.lives), W - 12, 26);
        ctx.fillStyle = '#ffd27a';
        ctx.fillText('大招 ' + pl.bombs, W - 12, 44);
      }
    }

    /* 连击（单人取 1P，双人取连击更高者） */
    let cl = null;
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      if (pl.out) continue;
      if (pl.combo > 1 && (!cl || pl.combo > cl.combo)) cl = pl;
    }
    if (cl) {
      ctx.textAlign = 'center';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('x' + G.mult(cl).toFixed(2) + '  ' + cl.combo + (G.two ? ' ' + cl.tag : '') + ' COMBO', W / 2, 26);
    }

    /* 武器 / 火力（逐玩家） */
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      if (pl.out) continue;
      const wp = WEAPONS[pl.weapon];
      if (i === 0) {
        ctx.textAlign = 'left';
        ctx.font = '600 14px system-ui, sans-serif';
        ctx.fillStyle = wp.color;
        ctx.fillText((G.two ? '1P ' : '') + wp.name, 12, H - 26);
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = k < pl.power ? wp.color : 'rgba(255,255,255,0.18)';
          ctx.fillRect(12 + k * 14, H - 18, 11, 6);
        }
      } else {
        ctx.textAlign = 'right';
        ctx.font = '600 14px system-ui, sans-serif';
        ctx.fillStyle = wp.color;
        ctx.fillText('2P ' + wp.name, W - 12, H - 26);
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = k < pl.power ? wp.color : 'rgba(255,255,255,0.18)';
          ctx.fillRect(W - 23 - k * 14, H - 18, 11, 6);
        }
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 11px system-ui, sans-serif';
    if (G.two) {
      ctx.textAlign = 'right';
      ctx.fillText('擦弹 ' + G.grazeTotal() + '   RANK ' + Math.round(G.rank), W - 12, H - 46);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText('擦弹 ' + G.grazeTotal(), 12, H - 46);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('RANK ' + Math.round(G.rank), W - 12, H - 26);
    }
    ctx.textAlign = 'left';

    /* Boss 血条 */
    const b = G.boss;
    if (b && !b.dying) {
      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = '#ff9aa6';
      ctx.fillText(b.name, W / 2, 62);
      const bw = W - 80;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(40, 70, bw, 8);
      ctx.fillStyle = '#ff5a6e';
      ctx.fillRect(40, 70, bw * Math.max(0, b.hp / b.maxhp), 8);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(40 + bw * 0.66, 68, 1.5, 12);
      ctx.fillRect(40 + bw * 0.33, 68, 1.5, 12);
      ctx.textAlign = 'left';
    }
  }

  /* ==================== 主循环 ==================== */
  const STEP = 1000 / 60;
  let acc = 0, last = performance.now();
  function loop(now) {
    let dt = now - last; last = now;
    if (dt > 200) dt = 200;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ==================== UI 流程 ==================== */
  const ov = {
    menu: document.getElementById('ov-menu'),
    pause: document.getElementById('ov-pause'),
    result: document.getElementById('ov-result'),
  };
  function hideAll() { for (const k in ov) if (ov[k]) ov[k].classList.add('hidden'); }
  function showOverlay(name) {
    hideAll();
    const el = ov[name];
    if (el) el.classList.remove('hidden');
    if (name === 'menu') {
      const b = document.getElementById('menu-best');
      if (b) b.textContent = '最高分 ' + (localStorage.getItem('tw_best') || 0);
    }
    if (name === 'result') fillResult();
  }
  function fillResult() {
    const t = document.getElementById('res-title');
    const s = document.getElementById('res-score');
    const d = document.getElementById('res-detail');
    if (t) t.textContent = G.state === 'WIN' ? '任务完成' : '任务失败';
    if (s) s.textContent = G.score;
    const lines = [];
    if (G.two) {
      for (let i = 0; i < G.players.length; i++) {
        const pl = G.players[i];
        lines.push('<span style="color:' + PCFG[i].color + '">' + pl.tag +
          ' 击破 ' + pl.kills + ' · 擦弹 ' + pl.graze + ' · 残机 ' + Math.max(0, pl.lives) + '</span>');
      }
    } else {
      lines.push('击破 ' + G.kills + ' · 擦弹 ' + G.grazeTotal());
    }
    if (d) {
      d.innerHTML = (G.mode === 'story'
        ? (G.state === 'WIN' ? '双人合作通关全 5 关' : '到达 STAGE ' + (G.stage + 1))
        : '无尽模式 WAVE ' + G.wave)
        + '<br>' + lines.join('<br>')
        + '<br>最高分 ' + G.best;
    }
  }

  function startGame(mode, two) {
    TW.Audio.init(); TW.Audio.resume();
    G.mode = mode || 'story';
    G.reset(two === undefined ? G.two : !!two);
    G.state = 'PLAYING';
    startStage(0);
    document.body.dataset.mode = G.mode;
    document.body.dataset.two = G.two ? '1' : '0';
    hideAll();
  }
  function togglePause() {
    if (G.state === 'PLAYING') { G.state = 'PAUSED'; showOverlay('pause'); }
    else if (G.state === 'PAUSED') { G.state = 'PLAYING'; hideAll(); }
  }

  document.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const a = el.dataset.act;
      if (a === 'start-solo') startGame('story', false);
      else if (a === 'start-coop') startGame('story', true);
      else if (a === 'start-endless') startGame('endless', false);
      else if (a === 'start-endless2') startGame('endless', true);
      else if (a === 'resume') togglePause();
      else if (a === 'restart') startGame(G.mode, G.two);
      else if (a === 'menu') { G.state = 'MENU'; showOverlay('menu'); }
      else if (a === 'mute') {
        TW.Audio.init(); TW.Audio.setMuted(!TW.Audio.muted);
        el.textContent = TW.Audio.muted ? '♪ 关闭' : '♪ 开启';
      }
    });
  });

  const vb = document.getElementById('ver');
  if (vb) vb.textContent = VERSION;
  const mb = document.getElementById('menu-ver');
  if (mb) mb.textContent = VERSION;
  showOverlay('menu');

  /* ==================== 测试句柄 ==================== */
  window.__twGame = {
    VERSION: VERSION, H: H,
    get W() { return W; },
    get G() { return G; },
    state: () => G.state,
    start: (m, two) => startGame(m || 'story', !!two),
    pause: togglePause,
    frame: (n) => { for (let i = 0; i < (n || 1); i++) update(); },
    render: render,
    bomb: (i) => useBomb(G.players[i || 0]),
    key: (k, down) => pressKey(String(k).toLowerCase(), '', !!down),
    press: (k, down, code) => pressKey(String(k).toLowerCase(), (code || '').toLowerCase(), !!down),
    setWeapon: (w, i) => { const pl = G.players[i || 0]; if (pl) pl.weapon = w; },
    setPower: (p, i) => { const pl = G.players[i || 0]; if (pl) pl.power = p; },
    playerInfo: () => G.players.map((p) => ({
      id: p.id, out: p.out, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
      lives: p.lives, bombs: p.bombs, power: p.power, weapon: p.weapon,
      combo: p.combo, graze: p.graze, kills: p.kills, charge: p.charge, invuln: p.invuln,
    })),
    spawnBoss: (s) => TW.spawnBoss(s || 0),
    killAll: () => { G.enemies.length = 0; G.boss = null; },
    gotoStage: (n) => { startStage(n); },
    counts: () => ({ e: G.enemies.length, eb: G.ebullets.length, pb: G.pbullets.length, it: G.items.length, parts: TW.FX.parts.length }),
  };
})();
