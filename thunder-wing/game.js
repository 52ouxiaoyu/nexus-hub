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
  const PSEP_MIN = 52;     /* v1.4.8：两机最小间距（px），低于即互相推开 */
  /* 自动驾驶接管阈值（帧）：某个席位连续 5 秒没有收到自己的按键，就交给 AI 代班；
     该玩家任意一键按下立即夺回 —— AI 是代班，不是抢机。 */
  const AI_IDLE = 5 * 60;
  let W = MIN_W;
  /* 战场越宽，自机速度等比补偿，避免横向机动变迟钝 */
  function fieldSpd() { return Math.min(1.25, Math.max(1, W / MIN_W)); }
  const VERSION = 'v1.4.10';

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
    { name: '火神炮', en: 'VULCAN', spr: 'vulcan', dmg: 14, interval: 22, color: '#7fe8ff' },
    { name: '激光炮', en: 'LASER', spr: 'laser', dmg: 26, interval: 26, color: '#5fb0ff', pierce: 2 },
    { name: '追踪导弹', en: 'MISSILE', spr: 'missile', dmg: 19, interval: 28, color: '#5ce8b4', homing: true },
    { name: '磁轨炮', en: 'RAIL', spr: 'rail', dmg: 24, interval: 26, color: '#b8c8ff', pierce: 4 },
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
  /* v1.4.0：没有「单人」这个概念了 —— 永远是两个席位，没人上的席位由 AI 代班。
     因此出生点恒为左右分列，两个座位的逻辑完全一致，不再有单人/双人两套分支。 */
  function homeX(id) { return id === 0 ? W / 2 - 64 : W / 2 + 64; }
  function makePlayer(id) {
    return {
      id: id, tag: PCFG[id].tag, out: false,
      x: homeX(id), y: H - 120, vx: 0, vy: 0,
      r: 3, grazeR: 22, tilt: 0, dead: false,
      fireT: 0, charge: 0, invuln: 0, firing: false,
      lives: 3, bombs: 3, power: 1, weapon: 0, spd: 3,
      combo: 0, comboT: 0, graze: 0, kills: 0,
      /* 自动驾驶（v1.4.0）：idle 是「多久没收到这个席位的按键」 */
      ai: false, idle: 0,
      /* 大招（v1.4.0）：每次释放后随机换成下一种，nextUlt 是预告 */
      ult: null, nextUlt: null, lastUlt: null,
      /* Build（v1.3.0）：局内成长 */
      perks: {}, exp: 0, level: 0, nextExp: 5,
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
    enemies: [], ebullets: [], pbullets: [], items: [], exps: [], rocks: [], beams: [],
    pods: [],               /* 救援信标（v1.4.7）：队友待救援 */
    boss: null,
    players: [],             // 玩家对象数组（1 或 2 个）
    score: 0, rank: 0, kills: 0,
    nextExtend: 80000, wave: 0, clearT: 0, flash: 0, deathT: 0,
    best: 0, sfx: true, waveMsg: 0, msgText: '',
    daily: false, perkPool: null, dailyPow: 1,
    enemySlow: 0,           /* >0 时敌人与敌弹降到 1/3 速（时空凝滞） */
    stats: { maxCombo: 0, deaths: 0, odTriggers: 0 },
    stars: [],

    reset() {
      this.enemies.length = 0; this.ebullets.length = 0; this.pbullets.length = 0;
      this.items.length = 0; this.pending.length = 0; this.exps.length = 0;
      this.rocks.length = 0; this.beams.length = 0; this.pods.length = 0;
      this.frame = 0; this.stageT = 0; this.scriptI = 0; this.boss = null;
      this.score = 0; this.rank = 0; this.kills = 0;
      this.enemySlow = 0;
      this.nextExtend = 80000; this.wave = 0; this.clearT = 0; this.flash = 0; this.deathT = 0;
      this.stats.maxCombo = 0; this.stats.deaths = 0; this.stats.odTriggers = 0;
      TW.FX.reset();
      this.two = true;      /* v1.4.0：恒为双席位，单人 = 另一个席位交给 AI */
      this.players.length = 0;
      for (let i = 0; i < 2; i++) {
        const pl = makePlayer(i);
        pl.nextUlt = TW.pickUlt ? TW.pickUlt(pl) : null;
        this.players.push(pl);
      }
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
  /* 给大招 / AI 模块用的引擎接口（函数声明已提升，此处赋值安全） */
  TW.W = function () { return W; };
  TW.addBullet = function (pl, x, y, ang, sp, dmg, kind, pierce, homing) {
    addBullet(pl, x, y, ang, sp, dmg, kind, pierce, homing);
  };
  TW.hurtEnemy = function (e, dmg, hx, hy, pl) { hurtEnemy(e, dmg, hx, hy, pl); };

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
    /* 1P：WASD 移动 · 空格射击 · M 大招 */
    { lf: ['a'], rt: ['d'], up: ['w'], dn: ['s'], fire: [' '], bomb: ['m'] },
    /* 2P：方向键移动 · 小键盘回车射击 · 小键盘加号大招（全在空格/M 右侧，互不串台） */
    { lf: ['arrowleft'], rt: ['arrowright'], up: ['arrowup'], dn: ['arrowdown'],
      fire: ['numpadenter'], bomb: ['numpadadd'] },
  ];
  function held(list) {
    for (let i = 0; i < list.length; i++) if (keys[list[i]]) return true;
    return false;
  }
  function moveKeys(i) { return KEYMAP[i]; }
  function bombKeys(i) { return KEYMAP[i].bomb; }
  function isFire(i, k, code) { const l = KEYMAP[i].fire; return l.indexOf(k) >= 0 || (code && l.indexOf(code) >= 0); }
  function isBomb(i, k, code) { const l = KEYMAP[i].bomb; return l.indexOf(k) >= 0 || (code && l.indexOf(code) >= 0); }

  function pressKey(k, code, down) {
    keys[k] = !!down;
    if (code) keys[code] = !!down;
    for (let i = 0; i < G.players.length; i++) {
      if (isFire(i, k, code)) G.players[i].firing = !!down;
    }
  }

  /* 席位归属：某个玩家按下属于自己座位的任意一键，立刻夺回控制权并清零空闲计时 */
  function noteActivity(k, code) {
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      if (!pl) continue;
      const m = KEYMAP[i];
      const inMove = m.lf.indexOf(k) >= 0 || m.rt.indexOf(k) >= 0 || m.up.indexOf(k) >= 0 || m.dn.indexOf(k) >= 0 ||
        (!!code && (m.lf.indexOf(code) >= 0 || m.rt.indexOf(code) >= 0 || m.up.indexOf(code) >= 0 || m.dn.indexOf(code) >= 0));
      if (inMove || isFire(i, k, code) || isBomb(i, k, code)) {
        pl.idle = 0;
        if (pl.ai) {
          pl.ai = false;
          TW.FX.text(pl.x, pl.y - 46, pl.tag + ' 接管', PCFG[i].color, 14);
        }
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = (e.code || '').toLowerCase();
    pressKey(k, code, true);
    noteActivity(k, code);
    if (k === 'p' || k === 'escape') togglePause();
    if (k === 'enter' && (G.state === 'MENU' || G.state === 'OVER' || G.state === 'WIN')) {
      startGame(G.state === 'MENU' ? (document.body.dataset.mode || 'story') : G.mode);
    }
    if (G.state === 'PLAYING') {
      for (let i = 0; i < G.players.length; i++) {
        if (e.repeat) continue;
        const pl = G.players[i];
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
    /* v1.4.10 修复：鼠标点击不再劫持 1P。此前任何 pointerdown（含鼠标）都会把
       touch 锁存为 true，永久禁用 1P 的键盘方向 —— 「AI 接管后按键夺回却推不动飞机」
       的元凶。只有真实触摸 / 手写笔才启用拖动控制。 */
    if (e.pointerType === 'mouse') return;
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
    if (TW.updateUlt) TW.updateUlt(pl);   /* v1.4.0：推进当前大招（僚机 / 轨道炮 / 要塞…） */

    /* v1.4.0：空闲超时交给 AI 代班。人类只用「物理按键」算控制，AI 自己设的
       firing 不算，否则 AI 会把自己判成「在控制」而立刻退出代班。 */
    const m0 = moveKeys(pl.id);
    const hmv = held(m0.lf) || held(m0.rt) || held(m0.up) || held(m0.dn);
    const controlling = hmv || (pl.firing && !pl.ai);
    if (controlling) {
      pl.idle = 0;
      if (pl.ai) { pl.ai = false; TW.FX.text(pl.x, pl.y - 46, pl.tag + ' 接管', PCFG[pl.id].color, 14); }
    } else if (!pl.ai) {
      pl.idle++;
      if (pl.idle >= AI_IDLE && !pl.out) {
        pl.ai = true;
        TW.FX.text(pl.x, pl.y - 46, pl.tag + ' AI 代班', PCFG[pl.id].color, 14);
      }
    }

    let dx = 0, dy = 0, aiDrive = false;
    if (pl.ai && G.state === 'PLAYING') {
      const cmd = TW.AI.think(pl);
      dx = cmd.dx; dy = cmd.dy; aiDrive = true;
      pl.firing = cmd.fire;
      if (cmd.ult && pl.bombs > 0 && pl.invuln <= 90) {
        const u = TW.castUlt(pl);
        if (u) TW.FX.text(pl.x, pl.y - 54, 'AI · ' + u.name, PCFG[pl.id].color, 13);
      }
    }
    if (!aiDrive && !(dragLast && pl.id === 0)) {   /* 仅触摸拖动进行中才让位给拖动 */
      if (held(m0.lf)) dx -= 1;
      if (held(m0.rt)) dx += 1;
      if (held(m0.up)) dy -= 1;
      if (held(m0.dn)) dy += 1;
    }
    if (dx && dy) { const k = Math.SQRT1_2; dx *= k; dy *= k; }
    const sp = (3.6 + pl.spd * 0.35) * fieldSpd();
    pl.x += dx * sp; pl.y += dy * sp;
    pl.tilt += ((dx * 0.22) - pl.tilt) * 0.18;
    pl.x = Math.max(16, Math.min(W - 16, pl.x));
    pl.y = Math.max(40, Math.min(H - 24, pl.y));

    if (pl.invuln > 0 && pl.invuln % 8 < 4) { /* 闪烁 */ }

    /* 升级自动发词条，不再有「三选一」抢占方向键或射击键 */
    if (pl.shieldT > 0) pl.shieldT--;
    if (pl.od > 0) pl.od--;

    /* 射击 */
    const wp = WEAPONS[pl.weapon];
    const shooting = pl.firing || (dragLast && pl.id === 0);
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

  /* 超载 OVERDRIVE：擦弹充能满格自动触发，火力翻倍 + 擦弹范围扩大 */
  function tryOverdrive(pl) {
    if (pl.od > 0 || pl.out) return;
    pl.odCharge = 0;
    pl.od = 180 + Math.round(72 * pl.pk('over'));
    TW.FX.ring(pl.x, pl.y, 20, '#ffe9a8', 36);
    TW.FX.text(pl.x, pl.y - 42, 'OVERDRIVE', '#ffe9a8', 17);
    TW.FX.quake(4, 12);
    TW.Audio.chargeFire();
    G.stats.odTriggers++;
    G.rank = Math.min(100, G.rank + 2);
  }
  TW.tryOverdrive = tryOverdrive;

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
    const od = pl.od > 0;
    /* 词条 / 超载在这里落到实际弹幕上：伤害、弹数、穿透、追踪 */
    const dmg = wp.dmg * (1 + 0.25 * pl.pk('power')) * (od ? 2 : 1);
    const twin = pl.pk('twin') + (od ? 1 : 0);
    const pc = pl.pk('pierce');
    const hom = !!wp.homing || pl.pk('homing') > 0;

    if (pl.weapon === 0) {
      const n = [2, 2, 2, 3, 3][lv - 1] + twin;
      const spread = [0.06, 0.10, 0.14, 0.16, 0.18][lv - 1];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread;
        addBullet(pl, pl.x, pl.y - 14, ang + off, 6.5, dmg, wp.spr, pc, hom);
      }
    } else if (pl.weapon === 1) {
      const n = [1, 1, 2, 2, 2][lv - 1] + twin;
      const sep = n > 1 ? Math.min(14, 54 / n) : 0;
      for (let i = 0; i < n; i++) {
        addBullet(pl, pl.x + (i - (n - 1) / 2) * sep, pl.y - 16, ang, 7, dmg, wp.spr, 2 + pc, hom);
      }
    } else if (pl.weapon === 2) {
      const n = [1, 2, 2, 2, 3][lv - 1] + twin;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.34;
        addBullet(pl, pl.x, pl.y - 12, ang + off, 5, dmg, wp.spr, pc, true);
      }
    } else {
      /* 磁轨炮：低速高伤贯穿，弹道笔直穿透整列敌人 */
      const n = [1, 1, 1, 2, 2][lv - 1] + twin;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.1;
        addBullet(pl, pl.x, pl.y - 14, ang + off, 7, dmg, wp.spr, 4 + pc, hom);
      }
    }
    /* 僚机：火力 3 级起 1 对，词条可增编到 3 对 */
    if (lv >= 3) {
      const pairs = 1 + pl.pk('wing');
      const wa = lv >= 5 ? 0.13 : 0;
      for (let k = 0; k < pairs; k++) {
        const sp2 = 26 + k * 13;
        addBullet(pl, pl.x - sp2, pl.y + 2, ang - wa, 6, 4, 'wing', pc);
        addBullet(pl, pl.x + sp2, pl.y + 2, ang + wa, 6, 4, 'wing', pc);
      }
    }
    if (G.sfx) ((pl.weapon === 1 || pl.weapon === 3) ? TW.Audio.laser() : pl.weapon === 2 ? TW.Audio.missile() : TW.Audio.shot());
  }

  function addBullet(pl, x, y, ang, sp, dmg, kind, pierce, homing) {
    if (G.pbullets.length > 80) return;    // 密集恐惧症保险丝：我方弹硬上限
    G.pbullets.push({
      x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      dmg: dmg, kind: kind, pierce: pierce || 0, homing: !!homing, hit: [], t: 0,
      owner: pl ? pl.id : 0,
      w: kind === 'laser' ? 10 : (kind === 'charge' ? 16 : (kind === 'wing' ? 7 : (kind === 'rail' ? 9 : 8))),
      h: kind === 'laser' ? 30 : (kind === 'charge' ? 28 : (kind === 'wing' ? 13 : (kind === 'rail' ? 34 : 16))),
      r: (kind === 'laser' || kind === 'rail') ? 6 : 5,
    });
  }

  function fireCharge(pl, wp) {
    TW.Audio.chargeFire();
    TW.FX.ring(pl.x, pl.y - 10, 14, '#9ff0ff', 20);
    if (pl.weapon === 0) {
      for (let i = -1; i <= 1; i++) addBullet(pl, pl.x, pl.y - 18, -Math.PI / 2 + i * 0.13, 7, 9, 'charge', 1);
    } else if (pl.weapon === 1) {
      for (let i = -1; i <= 1; i++) addBullet(pl, pl.x + i * 14, pl.y - 18, -Math.PI / 2, 8, 30, 'charge', 6);
    } else if (pl.weapon === 3) {
      /* 磁轨炮蓄力：一发全功率贯穿轨道 */
      addBullet(pl, pl.x, pl.y - 18, -Math.PI / 2, 9, 40, 'charge', 9);
      addBullet(pl, pl.x, pl.y - 18, -Math.PI / 2, 8, 20, 'rail', 6);
    } else {
      for (let i = 0; i < 5; i++) addBullet(pl, pl.x, pl.y - 14, -Math.PI / 2 + (i - 2) * 0.3, 5.5, 10, 'charge', 0, true);
    }
    G.rank = Math.min(100, G.rank + 1);
  }

  /* ==================== 道具 ==================== */
  TW.dropItem = function (x, y, kind) {
    if (kind === 'weapon') {
      if (G.two) {
        // 双人：从 4 种武器里随机连掉 3 种（磁轨炮加入轮换池）
        const base = Math.floor(Math.random() * 4);
        for (let i = 0; i < 3; i++) {
          G.items.push({ x: x + (i - 1) * 22, y: y, vy: 1.5, vx: 0, kind: 'weapon', w: (base + i) % 4, t: 0 });
        }
        return;
      }
      const cur = G.players[0] ? G.players[0].weapon : 0;
      let w = cur;
      while (w === cur) w = Math.floor(Math.random() * 4);
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
  /* v1.4.0：大招键即「释放随机大招」。释放后立刻抽下一发，玩家永远在期待下一发。 */
  function useBomb(pl) {
    if (!pl) pl = G.players[0];
    return TW.castUlt(pl);
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
    /* 外星分裂体：死亡一分为二，子细胞高速冲撞（v1.4.4） */
    if (e.type === 'splitter' && !e.isMini) {
      for (let k = -1; k <= 1; k += 2) {
        TW.spawn('mini', e.x + k * 14, e.y, { vy: 2.8, vx: k * 1.2, fire: 'none', isMini: true });
      }
    }
    TW.FX.boom(e.x, e.y, e.type === 'bomber' || e.type === 'gunship' ? 1.7 : 1, '#ffb04a');
    TW.Audio.explode();
    G.kills++;
    if (pl) { pl.kills++; pl.combo++; pl.comboT = COMBO_WIN;
      if (pl.combo > G.stats.maxCombo) G.stats.maxCombo = pl.combo; }
    G.rank = Math.min(100, G.rank + 0.18);
    G.addScore(e.score, e.x, e.y - 10, pl);
    TW.spawnExp(e.x, e.y, (e.type === 'gunship' || e.type === 'bomber') ? 3 : 1);
    if (e.elite) {
      TW.spawnExp(e.x, e.y, 10);
      TW.dropItem(e.x - 24, e.y, 'weapon');
      TW.FX.text(e.x, e.y - 34, 'ELITE DOWN', '#ffd27a', 16);
      TW.FX.quake(5, 16);
    }
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
    if (TW.ultEatDeath && TW.ultEatDeath(pl)) return;   // 要塞模式：免伤一次
    G.stats.deaths++;
    /* 力场护盾：冷却就绪时吃掉这次致命伤 */
    if (pl.pk('shield') > 0 && pl.shieldT <= 0) {
      pl.shieldT = 1080;
      pl.invuln = Math.max(pl.invuln, 70);
      TW.FX.ring(pl.x, pl.y, 16, '#a8ffe0', 30);
      TW.FX.text(pl.x, pl.y - 34, '护盾抵挡', '#a8ffe0', 14);
      TW.Audio.pickup();
      return;
    }
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
        finishRun(false);
        showOverlay('result');
      } else {
        /* v1.4.7 双人互助：残机耗尽不掉出场，留下救援信标等队友来救 */
        G.pods.push({
          x0: Math.max(50, Math.min(W - 50, pl.x)), x: pl.x, y: pl.y,
          vy: 0.85, owner: pl.id, t: 0, wait: 0,
        });
        TW.FX.text(W / 2, H / 2, pl.tag + ' 已坠机 · 去接触信标营救！', PCFG[pl.id].color, 22);
      }
      return;
    }
    pl.dead = true; pl.invuln = 150;
    G.deathT = 40;
  }

  /* ==================== 救援信标（v1.4.7 双人互助） ==================== */
  /* 残机耗尽不掉出场：留下信标缓缓下落，队友冒险接触即可把人拉回战场。
     信标漏出屏底会从顶部重新入场 —— 救援永远有机会，但要去弹幕里拿。 */
  function updatePods() {
    for (let i = G.pods.length - 1; i >= 0; i--) {
      const pod = G.pods[i];
      pod.t++;
      if (pod.wait > 0) {
        pod.wait--;
        if (pod.wait === 0) { pod.y = -36; pod.x0 = 60 + Math.random() * Math.max(1, W - 120); }
        continue;
      }
      pod.y += pod.vy;
      pod.x = pod.x0 + Math.sin(pod.t * 0.02) * 22;
      if (pod.y > H + 40) { pod.wait = 180; continue; }
      for (let k = 0; k < G.players.length; k++) {
        const pl = G.players[k];
        if (pl.out || pl.dead) continue;
        if (Math.hypot(pl.x - pod.x, pl.y - pod.y) < 46) { rescue(pl, pod, i); break; }
      }
    }
  }

  function rescue(pl, pod, idx) {
    const owner = G.players[pod.owner];
    if (!owner) { G.pods.splice(idx, 1); return; }
    owner.out = false; owner.dead = false; owner.firing = false;
    owner.lives = 2; owner.invuln = 210; owner.idle = 0; owner.ai = false;
    owner.combo = 0; owner.comboT = 0;
    owner.x = Math.max(40, Math.min(W - 40, pod.x));
    owner.y = Math.max(120, Math.min(H - 130, pod.y + 50));
    G.pods.splice(idx, 1);
    G.clearBullets(false);
    G.addScore(5000, owner.x, owner.y - 46, pl);
    TW.FX.ring(owner.x, owner.y, 20, PCFG[owner.id].color, 40);
    TW.FX.ring(owner.x, owner.y, 44, '#ffffff', 26);
    TW.FX.text(W / 2, H / 2 - 60, owner.tag + ' 归队！', PCFG[owner.id].color, 24);
    TW.Audio.extend(); TW.Audio.pickup();
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
          /* 临界打击：12%/级 概率 3 倍伤害，命中反馈明确 */
          let dmg = b.dmg;
          const clv = pl ? pl.pk('crit') : 0;
          if (clv && Math.random() < 0.12 * clv) {
            dmg *= 3;
            TW.FX.quake(3, 8);
            TW.FX.text(hx, hy - 10, 'CRIT', '#ffe9a8', 13);
          }
          if (b.pierce > 0) {
            if (b.hit.indexOf(e) >= 0) continue;
            b.hit.push(e); b.pierce--;
            hurtEnemy(e, dmg * 0.85, hx, hy, pl);
          } else {
            hurtEnemy(e, dmg, hx, hy, pl);
            consumed = true;
          }
          TW.FX.hit(hx, hy, '#ffffff');
          if (G.sfx && b.t % 2 === 0) TW.Audio.hit();
          /* 爆裂弹头：子弹消失时炸出碎片（穿透弹不炸，避免弹幕失控） */
          if (consumed && pl) {
            const slv = pl.pk('split');
            if (slv && b.kind !== 'wing') {
              const n = 1 + slv;
              const base = Math.atan2(b.vy, b.vx);
              for (let k = 0; k < n; k++) {
                addBullet(pl, b.x, b.y, base + (k - (n - 1) / 2) * 0.6, 6.5, 1.4, 'wing', 0);
              }
            }
          }
          break;
        }
      }
      /* 我方子弹 → 陨石（可击碎，掉经验） */
      if (!consumed && G.rocks.length) {
        for (let m = 0; m < G.rocks.length; m++) {
          const rk = G.rocks[m];
          if (Math.hypot(b.x - rk.x, b.y - rk.y) < rk.r + b.r) {
            rk.hp -= b.dmg; rk.flash = 3;
            TW.FX.hit(b.x, b.y, '#ffd08a');
            consumed = true;
            if (rk.hp <= 0) {
              TW.FX.boom(rk.x, rk.y, 1.2, '#e07a44');
              TW.Audio.explode();
              TW.spawnExp(rk.x, rk.y, 2);
              G.rocks.splice(m, 1);
            }
            break;
          }
        }
      }
      if (consumed) G.pbullets.splice(i, 1);
    }

    if (G.players.length === 0) return;

    /* 陨石 / 激光栅栏 → 玩家 */
    for (let i = G.rocks.length - 1; i >= 0; i--) {
      const rk = G.rocks[i];
      for (let k = 0; k < G.players.length; k++) {
        const pl = G.players[k];
        if (pl.out || pl.dead) continue;
        if (Math.hypot(pl.x - rk.x, pl.y - rk.y) < rk.r * 0.8 + pl.r) {
          TW.FX.boom(rk.x, rk.y, 1.2, '#e07a44');
          G.rocks.splice(i, 1);
          playerDie(pl);
          break;
        }
      }
    }
    for (let i = 0; i < G.beams.length; i++) {
      const bm = G.beams[i];
      if (bm.t < bm.warn) continue;
      for (let k = 0; k < G.players.length; k++) {
        const pl = G.players[k];
        if (pl.out || pl.dead || pl.invuln > 0) continue;
        const inGap = pl.x > bm.gapX - bm.gapW / 2 && pl.x < bm.gapX + bm.gapW / 2;
        if (!inGap && Math.abs(pl.y - bm.y) < 12) playerDie(pl);
      }
    }

    /* 狙击机激光束 → 玩家（发射期 15 帧内沿线判定） */
    for (let m = 0; m < G.enemies.length; m++) {
      const en = G.enemies[m];
      if (!en.snip || en.snip.ph !== 'fire') continue;
      const ca = Math.cos(en.snip.ang), sa = Math.sin(en.snip.ang);
      for (let k = 0; k < G.players.length; k++) {
        const pl = G.players[k];
        if (pl.out || pl.dead || pl.invuln > 0) continue;
        const dx = pl.x - en.x, dy = pl.y - en.y;
        const proj = dx * ca + dy * sa;
        if (proj > 0 && Math.abs(dx * sa - dy * ca) < pl.r * 0.7 + 5) { playerDie(pl); break; }
      }
    }

    /* 敌弹 → 玩家（逐在多玩家身上独立判定） */
    const es = G.enemySlow > 0 ? (1 / 3) : 1;   // 时空凝滞：敌弹降到 1/3 速
    for (let i = G.ebullets.length - 1; i >= 0; i--) {
      const b = G.ebullets[i];
      if (!b) break;   // 玩家阵亡会清屏，后续索引已失效
      b.t++;
      b.x += b.vx * es; b.y += b.vy * es;
      if (b.kind === 'magenta') b.x += Math.sin(b.t * 0.11) * 1.1;   // 品红蛇行弹：左右摆动
      /* 敌方追踪导弹：限速转向逼近最近玩家，燃料烧尽改直线（v1.4.4） */
      if (b.home) {
        if (b.fuel > 0) {
          b.fuel -= es;
          let tp2 = null, bd2 = Infinity;
          for (let j = 0; j < G.players.length; j++) {
            const p2 = G.players[j];
            if (p2.out || p2.dead) continue;
            const dd = Math.hypot(p2.x - b.x, p2.y - b.y);
            if (dd < bd2) { bd2 = dd; tp2 = p2; }
          }
          if (tp2) {
            const cur = Math.atan2(b.vy, b.vx);
            let diff = Math.atan2(tp2.y - b.y, tp2.x - b.x) - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.max(-b.turn * es, Math.min(b.turn * es, diff));
            const sp2 = Math.min(3.4, Math.hypot(b.vx, b.vy) + 0.018 * es);
            b.vx = Math.cos(cur + turn) * sp2; b.vy = Math.sin(cur + turn) * sp2;
          }
        } else b.home = false;
      }
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
        const gzR = pl.grazeR * (pl.od > 0 ? 1.6 : 1);
        if (!b.gz[j] && d < gzR + b.r) {
          b.gz[j] = true; pl.graze++;
          G.addScore(50, undefined, undefined, pl);
          G.rank = Math.min(100, G.rank + 0.05);
          TW.FX.graze(pl.x, pl.y);
          if (G.sfx && pl.graze % 3 === 0) TW.Audio.graze();
          /* 擦弹从「加 50 分」升级为「充能换即时战力」—— 贴着弹幕飞有实际回报 */
          if (pl.od <= 0) {
            pl.odCharge += 7 * (1 + 0.6 * pl.pk('graze'));
            if (pl.odCharge >= 100) tryOverdrive(pl);
          }
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
    G.rocks.length = 0; G.beams.length = 0;
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
    /* 段末精英机：把每关切成三个节奏高点 */
    if (st.elites) {
      for (let i = 0; i < st.elites.length; i++) {
        if (G.stageT === st.elites[i]) {
          TW.spawnElite();
          G.msgText = 'ELITE';
          G.waveMsg = 80;
        }
      }
    }
    /* 关卡独有机制：陨石带 / 激光栅栏 */
    if (st.gimmick === 'meteor' && G.stageT % 210 === 0 &&
      G.stageT > 420 && G.stageT < st.len - 260) TW.spawnRock();
    if (st.gimmick === 'beam' && G.stageT % 640 === 0 &&
      G.stageT > 520 && G.stageT < st.len - 260) TW.spawnBeam();

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
    if (G.enemySlow > 0) G.enemySlow--;
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

    /* v1.4.8 双机不重叠：两机靠得太近时沿连线互相推开（位置级硬校正）。
       完全重合（同帧传送/复活）时按左右家方向分开。 */
    for (let a = 0; a < G.players.length; a++) {
      for (let b = a + 1; b < G.players.length; b++) {
        const p1 = G.players[a], p2 = G.players[b];
        if (!p1 || !p2 || p1.out || p2.out || p1.dead || p2.dead) continue;
        let dx = p2.x - p1.x, dy = p2.y - p1.y;
        let d = Math.hypot(dx, dy);
        if (d >= PSEP_MIN) continue;
        if (d < 0.001) { dx = p1.id === 0 ? 1 : -1; dy = 0; d = 1; }   /* 1P 往左、2P 往右，与出生位一致 */
        const push = (PSEP_MIN - d) / 2 + 0.5;
        const ux = dx / d, uy = dy / d;
        p1.x -= ux * push; p1.y -= uy * push;
        p2.x += ux * push; p2.y += uy * push;
        p1.x = Math.max(16, Math.min(W - 16, p1.x)); p1.y = Math.max(40, Math.min(H - 24, p1.y));
        p2.x = Math.max(16, Math.min(W - 16, p2.x)); p2.y = Math.max(40, Math.min(H - 24, p2.y));
      }
    }

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

    updateItems();
    updatePods();
    collide();
    TW.updateExp();
    TW.updateRocks();
    TW.updateBeams();
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
      finishRun(true);
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
        if (e.alpha !== undefined && e.alpha < 1) ctx.globalAlpha = e.alpha;   // 折跃飞碟淡入淡出
        drawSpr(sprImg(e.spr), e.x, e.y, e.r * 2.6, e.r * 2.6, 0, e.flash > 0, sprWhite(e.spr));
        if (e.alpha !== undefined && e.alpha < 1) ctx.globalAlpha = 1;
        if (e.hp < e.maxhp && e.maxhp > 10) {
          ctx.fillStyle = 'rgba(255,90,110,0.8)';
          ctx.fillRect(e.x - 14, e.y - e.r - 8, 28 * (e.hp / e.maxhp), 2.5);
        }
      }
    }

    /* 狙击机预警线 / 激光束（叠在敌机层之上） */
    if (TW.drawEnemyFx) TW.drawEnemyFx(ctx);

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

    /* 关卡机制实体 */
    for (let i = 0; i < G.rocks.length; i++) {
      const rk = G.rocks[i];
      drawSpr(TW.SPR.rock, rk.x, rk.y, 38, 38, rk.rot, rk.flash > 0);
    }
    for (let i = 0; i < G.beams.length; i++) {
      const bm = G.beams[i];
      if (bm.t < bm.warn) {
        ctx.strokeStyle = 'rgba(255,72,100,' + (0.35 + 0.35 * Math.sin(bm.t * 0.5)).toFixed(2) + ')';
        ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(0, bm.y); ctx.lineTo(W, bm.y); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const a = Math.min(1, (bm.life - bm.t) / 30);
        const gl = bm.gapX - bm.gapW / 2, gr = bm.gapX + bm.gapW / 2;
        ctx.fillStyle = 'rgba(255,72,100,' + (0.2 * a).toFixed(2) + ')';
        ctx.fillRect(0, bm.y - 15, W, 30);
        ctx.fillStyle = 'rgba(255,72,100,' + (0.9 * a).toFixed(2) + ')';
        ctx.fillRect(0, bm.y - 8, gl, 16);
        ctx.fillRect(gr, bm.y - 8, W - gr, 16);
        ctx.strokeStyle = 'rgba(255,200,215,' + (0.85 * a).toFixed(2) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, bm.y); ctx.lineTo(gl, bm.y);
        ctx.moveTo(gr, bm.y); ctx.lineTo(W, bm.y);
        ctx.stroke();
        /* 缺口用冷色标出：这是「安全通道」，与有害的暖色带区分 */
        ctx.strokeStyle = 'rgba(140,240,255,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gl, bm.y - 15); ctx.lineTo(gl, bm.y + 15);
        ctx.moveTo(gr, bm.y - 15); ctx.lineTo(gr, bm.y + 15);
        ctx.stroke();
      }
    }

    TW.drawExp(ctx);

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
        TW.drawSats(ctx, p);
        /* 超载：暖金色呼吸环，让「我现在很强」一眼可见 */
        if (p.od > 0) {
          const pulse = 0.55 + 0.3 * Math.sin(G.frame * 0.28);
          ctx.strokeStyle = 'rgba(255,233,168,' + pulse.toFixed(2) + ')';
          ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(p.x, p.y, 30 + Math.sin(G.frame * 0.2) * 3, 0, Math.PI * 2); ctx.stroke();
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
    if (TW.drawUlt) TW.drawUlt(ctx);   // v1.4.0：大招特效（僚机 / 轨道炮 / 要塞…）盖在玩家之上

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

    /* 救援信标（v1.4.7） */
    for (let i = 0; i < G.pods.length; i++) {
      const pod = G.pods[i];
      const col = PCFG[pod.owner].color;
      const pulse = 1 + Math.sin(pod.t * 0.12) * 0.18;
      ctx.save();
      ctx.translate(pod.x, pod.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 20 * pulse, 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(0, 0, 30 * pulse, 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', 0, 6);
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillText('RESCUE', 0, -26);
      ctx.restore();
      ctx.textAlign = 'left';
    }
    if (G.state === 'PLAYING' && G.pods.length) {
      const pod = G.pods[0];
      ctx.textAlign = 'center';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillStyle = PCFG[pod.owner].color;
      ctx.fillText((pod.owner === 0 ? '1P' : '2P') + ' 已坠机 — 接触信标营救！', W / 2, H - 84);
      ctx.textAlign = 'left';
    }

    drawHUD();
  }

  /* ==================== HUD（v1.4.9：全部顶部、左右完全镜像） ==================== */
  /* 顶部中央 = 共享信息（SCORE/HI/擦弹·RANK/连击/Boss 血条）；
     左列 = 1P（左对齐），右列 = 2P（右对齐），逐行镜像：
     残机+大招 → 武器+火力格 → LV+经验/超载条 → 下一发大招 */
  function drawHUD() {
    /* ---- 顶部中央：共享信息 ---- */
    ctx.textAlign = 'center';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SCORE ' + G.score, W / 2, 24);
    ctx.font = '400 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('HI ' + Math.max(G.best, G.score) + ' · 擦弹 ' + G.grazeTotal() + ' · RANK ' + Math.round(G.rank), W / 2, 42);

    /* ---- 连击（双人取连击更高者） ---- */
    let cl = null;
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      if (pl.out) continue;
      if (pl.combo > 1 && (!cl || pl.combo > cl.combo)) cl = pl;
    }
    if (cl) {
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('x' + G.mult(cl).toFixed(2) + '  ' + cl.combo + ' ' + cl.tag + ' COMBO', W / 2, 64);
    }

    /* ---- 左右两列：逐玩家完全镜像 ---- */
    const bw = 104;
    for (let i = 0; i < G.players.length; i++) {
      const pl = G.players[i];
      const right = i === 1;                      /* 右列 = 2P */
      const ax = right ? W - 12 : 12;             /* 列锚点 */
      const align = right ? 'right' : 'left';
      const sgn = right ? -1 : 1;                 /* 横向增量方向 */

      /* 行 1：称号 + 残机 + 大招（出局/待救援也显示在这行） */
      ctx.textAlign = align;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = PCFG[i].color;
      ctx.fillText(pl.tag + (pl.out ? (G.pods.some(p => p.owner === pl.id) ? ' 待救援' : ' OUT') : ' 残机 ' + Math.max(0, pl.lives) + '  大招 ' + pl.bombs), ax, 26);

      if (pl.out) continue;

      /* 行 2：武器名 + 火力格（格子从锚点向屏内延伸） */
      const wp = WEAPONS[pl.weapon];
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = wp.color;
      ctx.fillText((right ? '2P ' : '1P ') + wp.name, ax, 44);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k < pl.power ? wp.color : 'rgba(255,255,255,0.18)';
        ctx.fillRect(ax + sgn * k * 14 - (right ? 11 : 0), 48, 11, 5);
      }

      /* 行 3：LV + 经验条（上行），超载条（下行）——右列条从锚点向左生长 */
      ctx.textAlign = align;
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = PCFG[i].color;
      ctx.fillText('LV ' + pl.level, ax, 64);
      const ex0 = right ? ax - bw : ax + 34;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(ex0, 59, bw - 34, 5);
      ctx.fillStyle = '#5ce8b4';
      ctx.fillRect(ex0, 59, (bw - 34) * Math.min(1, pl.exp / Math.max(1, pl.nextExp)), 5);
      const odMax = 180 + 72 * pl.pk('over');
      const od0 = right ? ax - bw : ax;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(od0, 67, bw, 5);
      ctx.fillStyle = pl.od > 0 ? '#ffe9a8' : '#ffb84d';
      ctx.fillRect(od0, 67, bw * (pl.od > 0 ? pl.od / odMax : Math.min(1, pl.odCharge / 100)), 5);
      if (pl.od > 0) {
        ctx.font = '600 9px system-ui, sans-serif';
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText('OVERDRIVE', right ? ax : ax + 2, 81);
      }

      /* 行 4：下一发大招预告 */
      const nu = pl.nextUlt && TW.ULT_BY_ID ? TW.ULT_BY_ID[pl.nextUlt] : null;
      if (nu) {
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,233,168,0.9)';
        ctx.fillText('下一发 ' + nu.glyph + ' ' + nu.name, ax, pl.od > 0 ? 96 : 86);
      }
    }
    ctx.textAlign = 'left';

    /* ---- Boss 血条（顶部中央，玩家列下方） ---- */
    const b = G.boss;
    if (b && !b.dying) {
      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = '#ff9aa6';
      ctx.fillText(b.name, W / 2, 104);
      const bw2 = W - 80;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(40, 112, bw2, 8);
      ctx.fillStyle = '#ff5a6e';
      ctx.fillRect(40, 112, bw2 * Math.max(0, b.hp / b.maxhp), 8);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(40 + bw2 * 0.66, 110, 1.5, 12);
      ctx.fillRect(40 + bw2 * 0.33, 110, 1.5, 12);
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
    ach: document.getElementById('ov-ach'),
  };
  function hideAll() { for (const k in ov) if (ov[k]) ov[k].classList.add('hidden'); }
  function showOverlay(name) {
    hideAll();
    const el = ov[name];
    if (el) el.classList.remove('hidden');
    if (name === 'menu') {
      const b = document.getElementById('menu-best');
      if (b) b.textContent = '最高分 ' + (localStorage.getItem('tw_best') || 0);
      refreshMenuMeta();
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
        ? (G.state === 'WIN' ? '通关全 5 关' : '到达 STAGE ' + (G.stage + 1))
        : '无尽 WAVE ' + G.wave)
        + '<br>' + lines.join('<br>')
        + '<br>最高分 ' + G.best
        + (G.lastRun && G.lastRun.st ? '<br>等级 ' + G.lastRun.st.level + ' · 最高连击 ' + G.lastRun.st.maxCombo
            + ' · 超载 ' + G.lastRun.st.odTriggers + ' 次' : '')
        + (G.daily && TW.Meta ? '<br>今日最佳 ' + TW.Meta.dailyRecord().best
            + (G.lastRun && G.lastRun.newRec ? ' <b style="color:#ffe9a8">新纪录</b>' : '') : '')
        + (G.lastRun && G.lastRun.fresh && G.lastRun.fresh.length
            ? '<br><b style="color:#ffe9a8">新成就：' + G.lastRun.fresh.map((a) => a.name).join(' · ') + '</b>' : '');
    }
  }

  /* 一局结束：结算成就与每日挑战记录 */
  function finishRun(win) {
    let lv = 0;
    for (let i = 0; i < G.players.length; i++) lv = Math.max(lv, G.players[i].level || 0);
    const st = {
      win: !!win, score: G.score, wave: G.wave, level: lv,
      maxCombo: G.stats.maxCombo, deaths: G.stats.deaths,
      odTriggers: G.stats.odTriggers, graze: G.grazeTotal(),
    };
    const fresh = TW.Meta ? TW.Meta.check(st) : [];
    let newRec = false;
    if (G.daily && TW.Meta) newRec = TW.Meta.submitDaily(G.score, G.wave);
    if (G.score > G.best) { G.best = G.score; localStorage.setItem('tw_best', G.best); }
    G.lastRun = { st: st, fresh: fresh, newRec: newRec };
  }

  function showAchievements() {
    const list = document.getElementById('ach-list');
    if (list && TW.Meta) {
      const u = TW.Meta.unlocked();
      list.innerHTML = TW.Meta.ACH.map((a) => {
        const on = !!u[a.id];
        return '<div class="ach-item' + (on ? ' on' : '') + '">' +
          '<i class="ach-dot"></i><div><b>' + a.name + '</b><span>' + a.desc + '</span></div></div>';
      }).join('');
    }
    showOverlay('ach');
  }

  /* 菜单上的成就进度与每日挑战副标题 */
  function refreshMenuMeta() {
    const as = document.getElementById('ach-sub');
    const ds = document.getElementById('daily-sub');
    if (as && TW.Meta) {
      const u = TW.Meta.unlocked();
      as.textContent = TW.Meta.ACH.filter((a) => u[a.id]).length + ' / ' + TW.Meta.ACH.length;
    }
    if (ds && TW.Meta) {
      const r = TW.Meta.dailyRecord();
      ds.textContent = r.best > 0 ? ('今日最佳 ' + r.best) : '今天固定词条池';
    }
  }

  function startGame(mode, two) {
    TW.Audio.init(); TW.Audio.resume();
    G.daily = (mode === 'daily');
    G.mode = G.daily ? 'endless' : (mode || 'story');
    G.perkPool = G.daily && TW.Meta ? TW.Meta.dailyPool() : null;
    G.dailyPow = G.daily && TW.Meta ? TW.Meta.dailyPower() : 1;
    G.reset(true);   // v1.4.0：永远双席位，单人 = 另一个席位交给 AI 代班
    if (G.daily) G.rank = 22;          /* 每日挑战：起步就更硬 */
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
      if (a === 'start-solo') startGame('story');
      else if (a === 'start-coop') startGame('story');
      else if (a === 'start-endless') startGame('endless');
      else if (a === 'start-endless2') startGame('endless');
      else if (a === 'start-daily') startGame('daily');
      else if (a === 'show-ach') showAchievements();
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
    counts: () => ({ e: G.enemies.length, eb: G.ebullets.length, pb: G.pbullets.length,
      it: G.items.length, ex: G.exps.length, rk: G.rocks.length, bm: G.beams.length,
      parts: TW.FX.parts.length }),
    gainExp: (v, i) => { const pl = G.players[i || 0]; if (pl) TW.gainExp(pl, v); },
    overdrive: (i) => TW.tryOverdrive(G.players[i || 0]),
    perks: (i) => { const pl = G.players[i || 0]; return pl ? pl.perks : {}; },
    spawnElite: () => TW.spawnElite(),
    spawnRock: () => TW.spawnRock(),
    spawnBeam: () => TW.spawnBeam(),
    castUlt: (i) => TW.castUlt(G.players[i || 0]),
    setAI: (on, i) => { const pl = G.players[i || 0]; if (pl) { pl.ai = !!on; if (on) pl.idle = AI_IDLE; } },
    idle: (i) => (G.players[i || 0] || {}).idle,
    nextUlt: (i) => (G.players[i || 0] || {}).nextUlt,
    enemySlow: () => G.enemySlow,
  };
})();
