/* 雷霆之翼 Thunder Wing — 敌人、波次脚本与 Boss */
(function () {
  const TW = window.TW || (window.TW = {});
  const H = 800;
  /* 战场宽度自适应：宽屏/machines 上摊宽、手机保持竖屏手感。
     game.js 的 resize() 会通过 TW.setWidth 同步实际宽度。
     关卡脚本里的横向坐标按参考宽度 RW=480 等比映射，保证编队始终对称。 */
  const RW = 480;
  let W = RW;
  TW.setWidth = function (w) { if (w > 0) W = w; };
  function X(v) { return v / RW * W; }

  function G() { return TW.G; }
  function later(fr, fn) { if (fr <= 0) fn(); else G().pending.push({ t: G().frame + fr, fn: fn }); }
  TW.later = later;

  /* ==================== 敌人定义 ==================== */
  const ED = {
    drone: { spr: 'drone', hp: 4, r: 12, score: 100, fire: 'aimed', every: 110 },
    fighter: { spr: 'fighter', hp: 8, r: 13, score: 150, fire: 'spread3', every: 130 },
    gunship: { spr: 'gunship', hp: 26, r: 19, score: 400, fire: 'ring8', every: 150 },
    bomber: { spr: 'bomber', hp: 40, r: 24, score: 600, fire: 'bomb', every: 120 },
    tank: { spr: 'tank', hp: 14, r: 15, score: 200, fire: 'aimed', every: 95 },
    turret: { spr: 'turret', hp: 18, r: 15, score: 250, fire: 'spread3', every: 80 },
  };
  TW.ED = ED;

  /* ==================== 敌方弹幕 ==================== */
  TW.enemyShot = function (x, y, ang, sp, kind) {
    const g = G();
    if (g.ebullets.length > 420) return;
    const k = g.rankSpd();
    g.ebullets.push({
      x: x, y: y, vx: Math.cos(ang) * sp * k, vy: Math.sin(ang) * sp * k,
      r: kind === 'big' ? 8 : 4, kind: kind || 'red', t: 0, grazed: false, warn: 0,
    });
  };

  /* 取距离最近的存活玩家作为目标（单人即 1P） */
  function nearest(x, y) {
    const ps = G().players || [];
    let best = null, bd = Infinity;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p || p.out) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best || { x: W / 2, y: H - 120 };
  }

  function aimAt(x, y) {
    const p = nearest(x, y);
    return Math.atan2(p.y - y, p.x - x);
  }

  /* ==================== 生成 ==================== */
  TW.spawn = function (type, x, y, opt) {
    const d = ED[type]; opt = opt || {};
    const e = {
      type: type, spr: d.spr, x: x, y: y, x0: x, y0: y,
      vx: opt.vx || 0, vy: opt.vy === undefined ? 1.6 : opt.vy,
      hp: Math.round(d.hp * (opt.hpMul || 1)), maxhp: Math.round(d.hp * (opt.hpMul || 1)),
      r: d.r, score: d.score, t: 0, pat: opt.pat || 'straight',
      amp: opt.amp || 60, w: opt.w || 0.045, ty: opt.ty || 180,
      fire: opt.fire || d.fire, every: opt.every || d.every, fireT: opt.delay || (40 + Math.random() * 50),
      flash: 0, dead: false, item: opt.item || null, ground: opt.ground || false,
      boss: false,
    };
    G().enemies.push(e);
    return e;
  };

  /* --- 编队helper --- */
  const F = {
    /* 横排，从上方进入 */
    line(type, n, x0, dx, vy, opt) {
      for (let i = 0; i < n; i++) TW.spawn(type, x0 + i * dx, -30 - i * 4, Object.assign({ vy: vy }, opt));
    },
    /* V 字编队 */
    vee(type, n, cx, spreadX, vy, opt) {
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? 1 : -1, k = Math.ceil(i / 2);
        TW.spawn(type, cx + side * k * spreadX, -30 - k * 30, Object.assign({ vy: vy }, opt));
      }
    },
    /* 纵队，逐架延迟 */
    col(type, n, x, gap, opt) {
      for (let i = 0; i < n; i++) later(i * gap, () => TW.spawn(type, x, -30, Object.assign({ vy: opt && opt.vy || 2.1 }, opt)));
    },
    /* 侧翼俯冲 */
    dive(type, n, side, gap, opt) {
      for (let i = 0; i < n; i++) later(i * gap, () => {
        const x = side < 0 ? -20 : W + 20;
        TW.spawn(type, x, 90 + Math.random() * 120, Object.assign({ pat: 'dive', vx: (side < 0 ? 1 : -1) * 2.2, vy: 1.5 }, opt));
      });
    },
    /* 正弦摆动 */
    sine(type, n, x0, dx, vy, opt) {
      for (let i = 0; i < n; i++) TW.spawn(type, x0 + i * dx, -30 - i * 26, Object.assign({ pat: 'sine', vy: vy, amp: opt && opt.amp || 70 }, opt));
    },
    /* 悬停炮台机 */
    hover(type, n, xs, ty, opt) {
      for (let i = 0; i < n; i++) TW.spawn(type, xs[i], -40, Object.assign({ pat: 'hover', ty: ty, vy: 2.4 }, opt));
    },
    /* 地面单位（随地形向下滚动） */
    ground(type, n, gap, opt) {
      for (let i = 0; i < n; i++) later(i * gap, () => TW.spawn(type, 60 + Math.random() * (W - 120), -30,
        Object.assign({ pat: 'straight', vy: 1.9, ground: true }, opt)));
    },
    /* 固定炮台（停在指定位置射击） */
    turret(xs, ty, opt) {
      xs.forEach((x) => TW.spawn('turret', x, -30, Object.assign({ pat: 'hover', ty: ty, vy: 3.2, fire: 'spread3', every: 70 }, opt)));
    },
  };
  TW.F = F;

  /* ==================== 敌人更新 ==================== */
  TW.updateEnemy = function (e) {
    e.t++;
    if (e.flash > 0) e.flash--;
    const g = G();
    const tp = nearest(e.x, e.y);

    switch (e.pat) {
      case 'sine':
        e.y += e.vy; e.x = e.x0 + Math.sin(e.t * e.w) * e.amp; break;
      case 'dive':
        e.y += e.vy;
        e.vx += (tp.x - e.x) * 0.0022;
        e.vx = Math.max(-3.4, Math.min(3.4, e.vx));
        e.x += e.vx; break;
      case 'hover':
        if (e.y < e.ty) { e.y += e.vy; if (e.y >= e.ty) e.y = e.ty; }
        else { e.x = e.x0 + Math.sin(e.t * 0.028) * Math.min(96, 70 * W / RW); e.y += 0.12; }
        break;
      case 'arc':
        e.y += e.vy; e.x += e.vx; e.vx *= 0.995; break;
      default:
        e.y += e.vy; e.x += e.vx;
    }
    if (e.x < -60 || e.x > W + 60 || e.y > H + 70 || e.y < -140) { e.dead = true; e.escaped = true; return; }

    /* 开火 */
    if (e.y > 10 && e.y < H - 60) {
      e.fireT--;
      if (e.fireT <= 0) {
        e.fireT = e.every * (0.85 + Math.random() * 0.3) / g.rankRate();
        fire(e);
      }
    }
  };

  function fire(e) {
    const a0 = aimAt(e.x, e.y);
    switch (e.fire) {
      case 'aimed':
        TW.enemyShot(e.x, e.y + 10, a0, 2.6, e.type === 'tank' ? 'amber' : 'red'); break;
      case 'spread3':
        for (let i = -1; i <= 1; i++) TW.enemyShot(e.x, e.y + 10, a0 + i * 0.22, 2.5, 'amber'); break;
      case 'spread5':
        for (let i = -2; i <= 2; i++) TW.enemyShot(e.x, e.y + 10, a0 + i * 0.18, 2.4, 'magenta'); break;
      case 'ring8':
        for (let i = 0; i < 8; i++) TW.enemyShot(e.x, e.y, (Math.PI * 2 / 8) * i + e.t * 0.01, 2.2, 'purple'); break;
      case 'ring12':
        for (let i = 0; i < 12; i++) TW.enemyShot(e.x, e.y, (Math.PI * 2 / 12) * i, 1.9, 'magenta'); break;
      case 'bomb':
        TW.enemyShot(e.x - 12, e.y + 14, Math.PI / 2, 1.7, 'big');
        TW.enemyShot(e.x + 12, e.y + 14, Math.PI / 2, 1.7, 'big'); break;
      case 'none': break;
      default: break;
    }
    if (G().sfx) TW.Audio.tone(300, 0.04, 'square', 0.03, 200);
  }

  /* ==================== 关卡脚本 ==================== */
  function S(t, fn) { return { t: t, fn: fn }; }
  TW.STAGES = [
    {
      name: '边境星域', sub: 'Frontier Belt', tint: '#071428', star: '#9fd8ff',
      boss: 0,
      script: [
        S(40, () => F.vee('drone', 5, X(240), X(46), 1.9)),
        S(200, () => F.line('drone', 5, X(110), X(65), 1.7, { item: 'power' })),
        S(380, () => F.sine('fighter', 4, X(120), X(80), 2.0)),
        S(560, () => F.col('drone', 6, X(90), 22, { pat: 'sine', amp: 50 })),
        S(700, () => F.col('drone', 6, X(390), 22, { pat: 'sine', amp: 50 })),
        S(860, () => F.ground('tank', 3, 70, { item: 'power' })),
        S(1020, () => F.dive('fighter', 4, -1, 26)),
        S(1180, () => F.line('fighter', 5, X(90), X(70), 1.8, { item: 'weapon' })),
        S(1360, () => F.vee('drone', 7, X(240), X(40), 2.2)),
        S(1560, () => F.ground('tank', 4, 55, { item: 'bomb' })),
        S(1760, () => F.sine('fighter', 5, X(90), X(75), 2.2)),
        S(1960, () => { F.col('drone', 5, X(150), 20); F.col('drone', 5, X(330), 20); }),
        S(2180, () => F.hover('gunship', 2, [X(140), X(340)], 170, { item: 'power' })),
        S(2480, () => F.ground('tank', 4, 50)),
        S(2700, () => F.line('fighter', 6, X(70), X(68), 2.0, { item: 'medal' })),
      ],
      len: 2900,
    },
    {
      name: '云海要塞', sub: 'Cloud Fortress', tint: '#0a1a2e', star: '#bfe4ff',
      boss: 1,
      script: [
        S(40, () => F.line('drone', 6, X(70), X(68), 2.0)),
        S(220, () => F.sine('fighter', 5, X(80), X(80), 2.2)),
        S(420, () => F.turret([X(110), X(240), X(370)], 200, { item: 'power' })),
        S(700, () => F.ground('tank', 4, 60, { item: 'weapon' })),
        S(900, () => F.dive('fighter', 5, 1, 22)),
        S(1080, () => F.col('drone', 7, X(120), 18, { pat: 'sine', amp: 60 })),
        S(1240, () => F.col('drone', 7, X(360), 18, { pat: 'sine', amp: 60 })),
        S(1420, () => F.hover('gunship', 3, [X(90), X(240), X(390)], 160, { item: 'power' })),
        S(1720, () => F.vee('fighter', 7, X(240), X(52), 2.4)),
        S(1920, () => F.ground('tank', 5, 48, { item: 'bomb' })),
        S(2140, () => F.turret([X(80), X(180), X(300), X(400)], 230)),
        S(2440, () => F.line('bomber', 2, X(150), X(180), 1.3, { item: 'power', fire: 'bomb' })),
        S(2700, () => F.sine('fighter', 6, X(70), X(70), 2.5)),
        S(2900, () => { F.col('drone', 6, X(100), 16); F.col('drone', 6, X(380), 16); F.dive('fighter', 4, -1, 24); }),
      ],
      len: 3150,
    },
    {
      name: '赤色峡谷', sub: 'Crimson Canyon', tint: '#200a12', star: '#ffc9b0',
      boss: 2,
      script: [
        S(40, () => F.vee('fighter', 7, X(240), X(50), 2.4)),
        S(240, () => F.ground('tank', 5, 52, { item: 'power' })),
        S(460, () => F.turret([X(100), X(240), X(380)], 190, { fire: 'spread5' })),
        S(720, () => F.dive('fighter', 6, -1, 20)),
        S(900, () => F.dive('fighter', 6, 1, 20)),
        S(1100, () => F.line('bomber', 3, X(90), X(150), 1.4, { item: 'weapon' })),
        S(1400, () => F.hover('gunship', 3, [X(80), X(240), X(400)], 150, { item: 'power', fire: 'ring12' })),
        S(1720, () => F.sine('fighter', 7, X(70), X(62), 2.6)),
        S(1960, () => F.col('drone', 8, X(140), 14, { pat: 'sine', amp: 70 })),
        S(2140, () => F.col('drone', 8, X(340), 14, { pat: 'sine', amp: 70 })),
        S(2360, () => F.ground('tank', 6, 44, { item: 'bomb' })),
        S(2620, () => F.line('bomber', 3, X(110), X(130), 1.5, { item: 'medal' })),
        S(2880, () => F.turret([X(70), X(170), X(310), X(410)], 240, { fire: 'spread5' })),
        S(3150, () => F.vee('fighter', 9, X(240), X(44), 2.7)),
      ],
      len: 3400,
    },
    {
      name: '极地轨道', sub: 'Polar Orbit', tint: '#071c1e', star: '#b6fbff',
      boss: 3,
      script: [
        S(40, () => F.col('drone', 9, X(130), 13, { pat: 'sine', amp: 80 })),
        S(200, () => F.col('drone', 9, X(350), 13, { pat: 'sine', amp: 80 })),
        S(420, () => F.hover('gunship', 4, [X(70), X(180), X(300), X(410)], 150, { item: 'power', fire: 'ring12' })),
        S(760, () => F.dive('fighter', 7, -1, 18)),
        S(940, () => F.dive('fighter', 7, 1, 18)),
        S(1160, () => F.ground('tank', 6, 42, { item: 'weapon' })),
        S(1400, () => F.line('bomber', 3, X(100), X(140), 1.5, { item: 'power' })),
        S(1680, () => F.turret([X(60), X(160), X(320), X(420)], 210, { fire: 'spread5' })),
        S(1960, () => F.sine('fighter', 8, X(60), X(55), 2.8)),
        S(2200, () => F.vee('fighter', 9, X(240), X(46), 2.8, { item: 'medal' })),
        S(2460, () => F.ground('tank', 7, 40, { item: 'bomb' })),
        S(2740, () => F.hover('gunship', 4, [X(90), X(190), X(290), X(390)], 140, { fire: 'ring12' })),
        S(3060, () => F.line('bomber', 4, X(70), X(115), 1.6, { item: 'power' })),
      ],
      len: 3350,
    },
    {
      name: '敌旗舰队', sub: 'Flagship Fleet', tint: '#1a0e26', star: '#e0c9ff',
      boss: 4,
      script: [
        S(40, () => F.vee('fighter', 9, X(240), X(46), 2.8)),
        S(240, () => { F.col('drone', 8, X(110), 12, { pat: 'sine', amp: 80 }); F.col('drone', 8, X(370), 12, { pat: 'sine', amp: 80 }); }),
        S(520, () => F.hover('gunship', 4, [X(70), X(180), X(300), X(410)], 145, { item: 'power', fire: 'ring12' })),
        S(860, () => F.ground('tank', 7, 38, { item: 'weapon' })),
        S(1120, () => F.line('bomber', 4, X(80), X(110), 1.6, { item: 'power' })),
        S(1440, () => { F.dive('fighter', 7, -1, 16); F.dive('fighter', 7, 1, 16); }),
        S(1700, () => F.turret([X(60), X(160), X(320), X(420)], 200, { fire: 'spread5' })),
        S(1980, () => F.sine('fighter', 9, X(55), X(48), 3.0)),
        S(2260, () => F.line('bomber', 4, X(90), X(110), 1.7, { item: 'bomb' })),
        S(2540, () => F.hover('gunship', 5, [X(60), X(150), X(240), X(330), X(420)], 140, { fire: 'ring12', item: 'medal' })),
        S(2860, () => F.vee('fighter', 11, X(240), X(40), 3.0)),
        S(3120, () => F.ground('tank', 8, 34, { item: 'power' })),
      ],
      len: 3400,
    },
  ];

  /* ==================== Boss ==================== */
  const BOSS_DEF = [
    { name: '赤鲨级战舰', hp: 400, score: 20000, r: 62 },
    { name: '苍穹母舰', hp: 520, score: 26000, r: 66 },
    { name: '深渊要塞', hp: 650, score: 32000, r: 68 },
    { name: '钢蜈蚣', hp: 780, score: 38000, r: 64 },
    { name: '终焉旗舰', hp: 950, score: 50000, r: 72 },
  ];
  TW.BOSS_DEF = BOSS_DEF;

  /* Boss 攻击模式 */
  const ATK = {
    ring(b, n, sp, kind) {
      for (let i = 0; i < n; i++) TW.enemyShot(b.x, b.y, (Math.PI * 2 / n) * i + b.t * 0.01, sp, kind || 'purple');
    },
    fan(b, n, spread, sp, kind) {
      const a0 = aimAt(b.x, b.y);
      for (let i = 0; i < n; i++) TW.enemyShot(b.x, b.y + 20, a0 + (i - (n - 1) / 2) * spread, sp, kind || 'amber');
    },
    rain(b, n, sp, kind) {
      for (let i = 0; i < n; i++) TW.enemyShot(20 + Math.random() * (W - 40), b.y + 30, Math.PI / 2 + (Math.random() - 0.5) * 0.3, sp, kind || 'red');
    },
    wall(b, n, sp) {
      const gap = Math.floor(Math.random() * (n - 2)) + 1;
      for (let i = 0; i < n; i++) {
        if (i === gap || i === gap + 1) continue;
        TW.enemyShot((i + 0.5) * (W / n), b.y + 30, Math.PI / 2, sp, 'magenta');
      }
    },
    spiral(b, n, sp, kind) {
      const dir = b.t % 240 < 120 ? 1 : -1;
      for (let i = 0; i < n; i++) TW.enemyShot(b.x, b.y, b.t * 0.11 * dir + (Math.PI * 2 / n) * i, sp, kind || 'green');
    },
    homing(b, n) {
      for (let i = 0; i < n; i++) {
        const a = aimAt(b.x, b.y) + (i - (n - 1) / 2) * 0.3;
        TW.enemyShot(b.x, b.y + 20, a, 2.0, 'big');
      }
    },
    laser(b) {
      for (let k = -1; k <= 1; k += 2) {
        for (let i = 0; i < 9; i++) TW.enemyShot(b.x + k * 46, b.y + 10, Math.PI / 2, 4.2 + i * 0.18, 'amber');
      }
    },
  };

  TW.spawnBoss = function (stage) {
    const d = BOSS_DEF[stage];
    const b = {
      boss: true, spr: 'boss' + stage, stage: stage,
      x: W / 2, y: -120, r: d.r, name: d.name,
      hp: d.hp, maxhp: d.hp, score: d.score,
      phase: 0, phaseAt: [0.66, 0.33], invuln: 40, flash: 0, t: 0, dead: false,
      cx: W / 2, moving: true,
      parts: [
        { ox: -56, oy: 20, hp: 60, maxhp: 60, alive: true, r: 15, spr: 'part' },
        { ox: 56, oy: 20, hp: 60, maxhp: 60, alive: true, r: 15, spr: 'part' },
      ],
      plan: BOSS_PLANS[stage], pi: 0, rep: 0, wait: 60,
    };
    G().enemies.push(b);
    G().boss = b;
    TW.Audio.warn();
    return b;
  };

  /* 每关 Boss 的攻击编排：[攻击名, 参数数组, 重复次数, 间隔帧] */
  const BOSS_PLANS = [
    [ // 阶段 0/1/2
      [['fan', [5, 0.2, 2.6, 'amber'], 3, 70], ['ring', [14, 2.2, 'purple'], 3, 66], ['rain', [10, 2.4, 'red'], 2, 80]],
      [['fan', [7, 0.16, 2.8, 'amber'], 3, 60], ['spiral', [3, 2.0, 'green'], 6, 34], ['wall', [11, 2.6], 3, 74]],
      [['ring', [18, 2.5, 'purple'], 3, 58], ['spiral', [4, 2.2, 'magenta'], 6, 30], ['fan', [7, 0.14, 3.0, 'amber'], 4, 54], ['rain', [12, 2.6, 'red'], 2, 70]],
    ],
    [
      [['wall', [10, 2.4], 3, 76], ['fan', [5, 0.22, 2.7, 'amber'], 3, 66], ['homing', [3], 2, 90]],
      [['rain', [12, 2.6, 'red'], 3, 68], ['ring', [16, 2.4, 'purple'], 3, 60], ['spiral', [3, 2.1, 'green'], 6, 32]],
      [['wall', [12, 2.8], 4, 62], ['spiral', [4, 2.3, 'magenta'], 8, 28], ['fan', [9, 0.14, 3.0, 'amber'], 4, 52], ['homing', [4], 2, 80]],
    ],
    [
      [['ring', [16, 2.5, 'purple'], 3, 62], ['laser', [], 3, 78], ['rain', [12, 2.7, 'red'], 2, 70]],
      [['spiral', [4, 2.2, 'green'], 7, 30], ['wall', [12, 2.7], 3, 66], ['laser', [], 3, 70]],
      [['ring', [20, 2.7, 'magenta'], 4, 54], ['spiral', [5, 2.4, 'green'], 8, 26], ['laser', [], 4, 62], ['fan', [9, 0.13, 3.1, 'amber'], 4, 50]],
    ],
    [
      [['spiral', [3, 2.1, 'green'], 6, 32], ['fan', [7, 0.18, 2.8, 'amber'], 4, 58], ['rain', [14, 2.8, 'red'], 2, 66]],
      [['wall', [13, 2.8], 3, 60], ['ring', [18, 2.6, 'purple'], 3, 58], ['homing', [4], 3, 74]],
      [['spiral', [5, 2.4, 'magenta'], 9, 24], ['laser', [], 4, 64], ['ring', [20, 2.8, 'magenta'], 4, 52], ['wall', [13, 3.0], 3, 58]],
    ],
    [
      [['ring', [18, 2.6, 'purple'], 4, 56], ['laser', [], 3, 72], ['rain', [14, 2.8, 'red'], 3, 62]],
      [['wall', [13, 2.9], 4, 58], ['spiral', [5, 2.3, 'green'], 8, 26], ['fan', [9, 0.15, 3.0, 'amber'], 4, 52]],
      [['ring', [22, 2.9, 'magenta'], 4, 50], ['spiral', [6, 2.5, 'green'], 10, 22], ['laser', [], 5, 58], ['homing', [5], 3, 70], ['wall', [14, 3.1], 3, 56]],
    ],
  ];

  TW.updateBoss = function (b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    if (b.invuln > 0) b.invuln--;
    const g = G();

    /* 入场 */
    if (b.y < 130) { b.y += 1.6; }
    else {
      b.x = b.cx + Math.sin(b.t * 0.013) * Math.min(150, 105 * W / RW);
      b.cx = W / 2 + Math.sin(b.t * 0.005) * Math.min(42, 28 * W / RW);
    }

    /* 阶段切换 */
    if (b.phase < 2 && b.hp / b.maxhp <= b.phaseAt[b.phase]) {
      b.phase++;
      b.pi = 0; b.rep = 0; b.wait = 70;
      b.invuln = 50; b.flash = 20;
      g.clearBullets(true);
      TW.FX.quake(8, 24); TW.FX.stop(8);
      TW.FX.bigBoom(b.x, b.y, 2.4, '#ffd27a');
      TW.FX.text(W / 2, 340, '形态切换', '#ffd27a', 20);
      TW.Audio.bigExplode();
      g.addScore(3000);
    }

    /* 攻击编排 */
    if (b.y >= 120) {
      if (b.wait > 0) b.wait--;
      else {
        const plan = b.plan[b.phase];
        const cur = plan[b.pi];
        const fn = ATK[cur[0]];
        const args = cur[1] || [];
        fn(b, args[0], args[1], args[2], args[3]);
        b.rep++;
        if (b.rep >= cur[2]) { b.pi = (b.pi + 1) % plan.length; b.rep = 0; b.wait = cur[3] + 30; }
        else b.wait = cur[3];
      }
    }

    /* 部件同步 */
    for (let i = 0; i < b.parts.length; i++) {
      const p = b.parts[i];
      if (p.alive && p.hp <= 0) {
        p.alive = false;
        TW.FX.bigBoom(b.x + p.ox, b.y + p.oy, 1.6, '#ffa64d');
        TW.FX.quake(5, 14);
        TW.Audio.explode();
        g.addScore(1500, b.x + p.ox, b.y + p.oy);
        TW.dropItem(b.x + p.ox, b.y + p.oy, 'power');
      }
    }
  };
})();
