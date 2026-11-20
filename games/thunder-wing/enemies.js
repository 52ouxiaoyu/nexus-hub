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
  /* 每日挑战的强度系数（1.0 - 1.35），每天固定 */
  function dpow() { const g = TW.G; return (g && g.dailyPow) || 1; }
  function later(fr, fn) { if (fr <= 0) fn(); else G().pending.push({ t: G().frame + fr, fn: fn }); }
  TW.later = later;

  /* ==================== 敌人定义 ==================== */
  const ED = {
    drone: { spr: 'drone', hp: 4, r: 12, score: 100, fire: 'aimed', every: 200 },
    fighter: { spr: 'fighter', hp: 8, r: 13, score: 150, fire: 'spread3', every: 240 },
    gunship: { spr: 'gunship', hp: 22, r: 19, score: 400, fire: 'ring6', every: 280 },
    bomber: { spr: 'bomber', hp: 32, r: 24, score: 600, fire: 'bomb', every: 200 },
    tank: { spr: 'tank', hp: 14, r: 15, score: 200, fire: 'aimed', every: 200 },
    turret: { spr: 'turret', hp: 15, r: 15, score: 250, fire: 'spread3', every: 180 },
    elite: { spr: 'elite', hp: 95, r: 27, score: 2500, fire: 'ring6', every: 160 },
    /* v1.4.4 新敌机：更聪明、更有想象力的外星 / 高科技单位 */
    ufo: { spr: 'ufo', hp: 10, r: 15, score: 350, fire: 'ring5', every: 200 },        // 折跃飞碟：瞬移到玩家头上
    sniper: { spr: 'sniper', hp: 12, r: 14, score: 400, fire: 'none', every: 170 },   // 激光狙击机：锁定→预警→光束
    launcher: { spr: 'launcher', hp: 16, r: 15, score: 380, fire: 'missile2', every: 240 }, // 挂弹机：追踪导弹
    splitter: { spr: 'splitter', hp: 9, r: 14, score: 300, fire: 'aimed', every: 220 },     // 外星分裂体：死亡一分为二
    mini: { spr: 'splitter', hp: 2, r: 8, score: 80, fire: 'none', every: 999 },            // 分裂体子细胞（高速冲撞）
  };
  TW.ED = ED;

  /* ==================== 敌方弹幕 ==================== */
  TW.enemyShot = function (x, y, ang, sp, kind) {
    const g = G();
    if (g.ebullets.length > 120) return;   // 密集恐惧症保险丝：同屏敌弹硬上限
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
      hp: Math.round(d.hp * (opt.hpMul || 1) * dpow()), maxhp: Math.round(d.hp * (opt.hpMul || 1) * dpow()),
      r: d.r, score: d.score, t: 0, pat: opt.pat || 'straight',
      amp: opt.amp || 60, w: opt.w || 0.045, ty: opt.ty || 180,
      fire: opt.fire || d.fire, every: opt.every || d.every, fireT: opt.delay || (40 + Math.random() * 50),
      flash: 0, dead: false, item: opt.item || null, ground: opt.ground || false,
      boss: false, alpha: 1, fade: 0, warpCd: 130, snip: null, snipCd: 55,
      isMini: !!opt.isMini,
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
      xs.forEach((x) => TW.spawn('turret', x, -30, Object.assign({ pat: 'hover', ty: ty, vy: 3.2, fire: 'spread3', every: 160 }, opt)));
    },
  };
  TW.F = F;

  /* ==================== 敌人更新 ==================== */
  TW.updateEnemy = function (e) {
    const g = G();
    const slow = TW.worldSlow ? TW.worldSlow() : (g.enemySlow > 0 ? (1 / 3) : 1);   // 凝滞：大招 1/3 · 升级二选一 1/10
    e.t += slow;
    if (e.flash > 0) e.flash--;
    const tp = nearest(e.x, e.y);

    switch (e.pat) {
      case 'sine':
        e.y += e.vy * slow; e.x = e.x0 + Math.sin(e.t * e.w) * e.amp; break;
      case 'dive':
        e.y += e.vy * slow;
        e.vx += (tp.x - e.x) * 0.0022 * slow;
        e.vx = Math.max(-3.4, Math.min(3.4, e.vx));
        e.x += e.vx * slow; break;
      case 'hover':
        if (e.y < e.ty) { e.y += e.vy * slow; if (e.y >= e.ty) e.y = e.ty; }
        else { e.x = e.x0 + Math.sin(e.t * 0.028) * Math.min(96, 70 * W / RW); e.y += 0.12 * slow; }
        break;
      case 'ufo':
        /* 折跃飞碟：到位后周期性瞬移到玩家侧翼上空（淡出→挪位→淡入） */
        if (e.y < e.ty) { e.y += e.vy * slow; }
        else {
          e.x = e.x0 + Math.sin(e.t * 0.03) * 34;
          if (e.fade === -1) {
            e.alpha -= 0.09 * slow;
            if (e.alpha <= 0) {
              e.alpha = 0;
              e.x0 = Math.max(40, Math.min(W - 40, tp.x + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 50)));
              e.x = e.x0; e.y = e.ty + (Math.random() * 40 - 20);
              if (G().sfx) TW.Audio.tone(880, 0.08, 'sine', 0.04, 1400);
              e.fade = 1;
            }
          } else if (e.fade === 1) {
            e.alpha += 0.09 * slow;
            if (e.alpha >= 1) { e.alpha = 1; e.fade = 0; e.warpCd = 130; }
          } else {
            e.warpCd -= slow;
            if (e.warpCd <= 0) e.fade = -1;
          }
        }
        break;
      case 'arc':
        e.y += e.vy * slow; e.x += e.vx * slow; e.vx *= 0.995; break;
      case 'dread':
        /* v1.5.0 旗舰：从右侧横穿战场，带轻微起伏 —— 标志性瞬间 */
        e.x += e.vx * slow; e.y = e.y0 + Math.sin(e.t * 0.02) * 16; break;
      default:
        e.y += e.vy * slow; e.x += e.vx * slow;
    }

    /* 激光狙击机状态机：锁定（预警线跟随玩家）→ 冻结角度射出光束 → 冷却 */
    if (e.type === 'sniper') {
      if (!e.snip && e.y >= e.ty - 2) {
        e.snipCd -= slow;
        if (e.snipCd <= 0) { e.snip = { ph: 'lock', t: 0, ang: aimAt(e.x, e.y) }; if (G().sfx) TW.Audio.tone(520, 0.1, 'sawtooth', 0.035, 760); }
      } else if (e.snip) {
        e.snip.t += slow;
        if (e.snip.ph === 'lock') {
          e.snip.ang = aimAt(e.x, e.y);           // 锁定期预警线持续追踪玩家
          if (e.snip.t >= 46) { e.snip.ph = 'fire'; e.snip.t = 0; if (G().sfx) TW.Audio.laser(); }
        } else if (e.snip.t >= 15) {
          e.snip = null; e.snipCd = e.every;
        }
      }
    }

    if (e.x < (e.dread ? -230 : -60) || e.x > W + 230 || e.y > H + 70 || e.y < -140) { e.dead = true; e.escaped = true; return; }

    /* v1.5.0 旗舰：炮塔独立开火 / 部件摧毁结算 / 溜走前放一轮告别弹幕 */
    if (e.dread) {
      for (let i = 0; i < e.parts.length; i++) {
        const pt = e.parts[i];
        if (!pt.alive) continue;
        if (pt.hp <= 0) {
          pt.alive = false;
          TW.FX.bigBoom(e.x + pt.ox, e.y + pt.oy, 1.6, '#ffa64d');
          TW.FX.quake(5, 14); TW.Audio.explode();
          g.addScore(1500, e.x + pt.ox, e.y + pt.oy);
          TW.dropItem(e.x + pt.ox, e.y + pt.oy, 'power');
          continue;
        }
        pt.fireT -= slow;
        if (pt.fireT <= 0) {
          pt.fireT = pt.every * (0.85 + Math.random() * 0.3) / g.rankRate();
          const a0 = aimAt(e.x + pt.ox, e.y + pt.oy);
          for (let k = -1; k <= 1; k++) TW.enemyShot(e.x + pt.ox, e.y + pt.oy, a0 + k * 0.24, 2.0, 'amber');
        }
      }
      if (!e.parted && e.x < -110) {
        e.parted = true;
        for (let k = 0; k < 8; k++) TW.enemyShot(e.x, e.y, Math.PI / 2 + (k - 3.5) * 0.16, 1.9, 'magenta');
      }
    }

    /* 开火 */
    if (e.y > 10 && e.y < H - 60) {
      e.fireT -= slow;
      if (e.fireT <= 0) {
        e.fireT = e.every * (0.85 + Math.random() * 0.3) / g.rankRate();
        fire(e);
      }
    }
  };

  /* 敌方追踪导弹：曲线逼近玩家，飞行约 5 秒后燃料耗尽改直线 */
  TW.enemyMissile = function (x, y, ang, sp) {
    const g = G();
    if (g.ebullets.length > 120) return;   // 密集恐惧症保险丝：同屏敌弹硬上限
    g.ebullets.push({
      x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      r: 5, kind: 'missileH', t: 0, grazed: false, warn: 0,
      home: true, turn: 0.032, fuel: 300,
    });
  };

  function fire(e) {
    const a0 = aimAt(e.x, e.y);
    switch (e.fire) {
      case 'aimed':
        TW.enemyShot(e.x, e.y + 10, a0, 2.2, e.type === 'tank' ? 'amber' : 'red'); break;
      case 'spread3':
        for (let i = -1; i <= 1; i += 2) TW.enemyShot(e.x, e.y + 10, a0 + i * 0.26, 2.0, 'amber'); break;
      case 'spread5':
        for (let i = -1; i <= 1; i++) TW.enemyShot(e.x, e.y + 10, a0 + i * 0.3, 2.0, 'magenta'); break;
      case 'ring5':
        for (let i = 0; i < 5; i++) TW.enemyShot(e.x, e.y, (Math.PI * 2 / 5) * i + e.t * 0.02, 1.8, 'purple'); break;
      case 'ring6':
        for (let i = 0; i < 6; i++) TW.enemyShot(e.x, e.y, (Math.PI * 2 / 6) * i + e.t * 0.012, 1.7, 'purple'); break;
      case 'bomb':
        TW.enemyShot(e.x, e.y + 14, Math.PI / 2, 1.4, 'big'); break;
      case 'missile2':
        TW.enemyMissile(e.x - 9, e.y + 12, a0 - 0.5, 1.4);
        TW.enemyMissile(e.x + 9, e.y + 12, a0 + 0.5, 1.4); break;
      case 'none': break;
      default: break;
    }
    if (G().sfx) TW.Audio.tone(300, 0.04, 'square', 0.03, 200);
  }

  /* 狙击机预警线 / 激光束的绘制（game.js render 在敌机层之后调用） */
  TW.drawEnemyFx = function (ctx) {
    const g = G();
    const en = (g && g.enemies) || [];
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      if (!e || e.dead || !e.snip) continue;
      const s = e.snip, len = 950;
      const ex = e.x + Math.cos(s.ang) * len, ey = e.y + Math.sin(s.ang) * len;
      ctx.save();
      if (s.ph === 'lock') {
        /* 锁定期：闪烁红色虚线预警 */
        ctx.globalAlpha = (s.t % 10 < 5) ? 0.55 : 0.22;
        ctx.strokeStyle = '#ff5e6e'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ex, ey); ctx.stroke();
      } else {
        /* 发射期：橙红宽光束 + 白热芯，随时间收窄 */
        const k = s.t / 15;
        ctx.globalAlpha = 1 - k * 0.3;
        ctx.strokeStyle = '#ff8a5c';
        ctx.lineWidth = 3 + 9 * (1 - Math.abs(k - 0.5) * 2);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#fff6ee'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.restore();
    }
  };

  /* ==================== 关卡脚本 ==================== */
  function S(t, fn) { return { t: t, fn: fn }; }
  TW.STAGES = [
    {
      name: '边境星域', sub: 'Frontier Belt', tint: '#071428', star: '#9fd8ff',
      elites: [1100, 2200, 3120],
      movements: [{ t: 560, name: '巡逻遭遇' }, { t: 1300, name: '游击拦截' }, { t: 2360, name: '前哨总攻' }],
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
        S(1500, () => TW.spawnDread(0)),
        S(1560, () => F.ground('tank', 4, 55, { item: 'bomb' })),
        S(1760, () => F.sine('fighter', 5, X(90), X(75), 2.2)),
        S(1960, () => { F.col('drone', 5, X(150), 20); F.col('drone', 5, X(330), 20); }),
        S(2140, () => F.vee('splitter', 3, X(240), X(70), 1.4)),                       // 首见：分裂体
        S(2180, () => F.hover('gunship', 2, [X(140), X(340)], 170, { item: 'power' })),
        S(2400, () => F.hover('ufo', 1, [X(240)], 150, {})),                            // 首见：折跃飞碟
        S(2480, () => F.ground('tank', 4, 50)),
        S(2700, () => F.line('fighter', 6, X(70), X(68), 2.0, { item: 'medal' })),
      ],
      len: 2900,
    },
    {
      name: '云海要塞', sub: 'Cloud Fortress', tint: '#0a1a2e', star: '#bfe4ff',
      elites: [1100, 2200, 3120],
      movements: [{ t: 560, name: '云层追击' }, { t: 1300, name: '要塞外围' }, { t: 2360, name: '火力网' }],
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
        S(1650, () => TW.spawnDread(1)),
        S(1720, () => F.vee('fighter', 7, X(240), X(52), 2.4)),
        S(1920, () => F.ground('tank', 5, 48, { item: 'bomb' })),
        S(2040, () => F.hover('sniper', 2, [X(120), X(360)], 210, {})),                 // 首见：激光狙击机
        S(2140, () => F.turret([X(80), X(180), X(300), X(400)], 230)),
        S(2320, () => F.col('launcher', 3, X(240), 30, { pat: 'hover', ty: 150 })),     // 首见：导弹挂弹机
        S(2440, () => F.line('bomber', 2, X(150), X(180), 1.3, { item: 'power', fire: 'bomb' })),
        S(2700, () => F.sine('fighter', 6, X(70), X(70), 2.5)),
        S(2900, () => { F.col('drone', 6, X(100), 16); F.col('drone', 6, X(380), 16); F.dive('fighter', 4, -1, 24); }),
      ],
      len: 3150,
    },
    {
      name: '赤色峡谷', sub: 'Crimson Canyon', tint: '#200a12', star: '#ffc9b0',
      elites: [1100, 2200, 3120],
      movements: [{ t: 560, name: '峡谷伏击' }, { t: 1300, name: '陨石风暴' }, { t: 2360, name: '赤色黎明' }],
      gimmick: 'meteor',
      boss: 2,
      script: [
        S(40, () => F.vee('fighter', 7, X(240), X(50), 2.4)),
        S(240, () => F.ground('tank', 5, 52, { item: 'power' })),
        S(460, () => F.turret([X(100), X(240), X(380)], 190, { fire: 'spread5' })),
        S(720, () => F.dive('fighter', 6, -1, 20)),
        S(900, () => F.dive('fighter', 6, 1, 20)),
        S(1100, () => F.line('bomber', 3, X(90), X(150), 1.4, { item: 'weapon' })),
        S(1400, () => F.hover('gunship', 3, [X(80), X(240), X(400)], 150, { item: 'power', fire: 'ring6' })),
        S(1720, () => F.sine('fighter', 7, X(70), X(62), 2.6)),
        S(1780, () => TW.spawnDread(2)),
        S(1960, () => F.col('drone', 8, X(140), 14, { pat: 'sine', amp: 70 })),
        S(2140, () => F.col('drone', 8, X(340), 14, { pat: 'sine', amp: 70 })),
        S(2360, () => F.ground('tank', 6, 44, { item: 'bomb' })),
        S(2480, () => { F.hover('ufo', 2, [X(130), X(350)], 140, {}); F.hover('sniper', 1, [X(240)], 190, {}); }),
        S(2620, () => F.line('bomber', 3, X(110), X(130), 1.5, { item: 'medal' })),
        S(2880, () => F.turret([X(70), X(170), X(310), X(410)], 240, { fire: 'spread5' })),
        S(3150, () => F.vee('fighter', 9, X(240), X(44), 2.7)),
      ],
      len: 3400,
    },
    {
      name: '极地轨道', sub: 'Polar Orbit', tint: '#071c1e', star: '#b6fbff',
      elites: [1100, 2200, 3120],
      movements: [{ t: 560, name: '轨道扫荡' }, { t: 1300, name: '极光屏障' }, { t: 2360, name: '破冰突袭' }],
      gimmick: 'beam',
      boss: 3,
      script: [
        S(40, () => F.col('drone', 9, X(130), 13, { pat: 'sine', amp: 80 })),
        S(200, () => F.col('drone', 9, X(350), 13, { pat: 'sine', amp: 80 })),
        S(420, () => F.hover('gunship', 4, [X(70), X(180), X(300), X(410)], 150, { item: 'power', fire: 'ring6' })),
        S(760, () => F.dive('fighter', 7, -1, 18)),
        S(940, () => F.dive('fighter', 7, 1, 18)),
        S(1160, () => F.ground('tank', 6, 42, { item: 'weapon' })),
        S(1400, () => F.line('bomber', 3, X(100), X(140), 1.5, { item: 'power' })),
        S(1680, () => F.turret([X(60), X(160), X(320), X(420)], 210, { fire: 'spread5' })),
        S(1860, () => TW.spawnDread(3)),
        S(1960, () => F.sine('fighter', 8, X(60), X(55), 2.8)),
        S(2200, () => F.vee('fighter', 9, X(240), X(46), 2.8, { item: 'medal' })),
        S(2460, () => F.ground('tank', 7, 40, { item: 'bomb' })),
        S(2560, () => { F.hover('launcher', 2, [X(150), X(330)], 140, {}); F.hover('ufo', 1, [X(240)], 110, {}); }),
        S(2740, () => F.hover('gunship', 4, [X(90), X(190), X(290), X(390)], 140, { fire: 'ring6' })),
        S(3060, () => F.line('bomber', 4, X(70), X(115), 1.6, { item: 'power' })),
      ],
      len: 3350,
    },
    {
      name: '敌旗舰队', sub: 'Flagship Fleet', tint: '#1a0e26', star: '#e0c9ff',
      elites: [1100, 2200, 3120],
      movements: [{ t: 560, name: '舰队前锋' }, { t: 1300, name: '旗舰护卫' }, { t: 2360, name: '决战时刻' }],
      gimmick: 'meteor',
      boss: 4,
      script: [
        S(40, () => F.vee('fighter', 9, X(240), X(46), 2.8)),
        S(240, () => { F.col('drone', 8, X(110), 12, { pat: 'sine', amp: 80 }); F.col('drone', 8, X(370), 12, { pat: 'sine', amp: 80 }); }),
        S(520, () => F.hover('gunship', 4, [X(70), X(180), X(300), X(410)], 145, { item: 'power', fire: 'ring6' })),
        S(860, () => F.ground('tank', 7, 38, { item: 'weapon' })),
        S(1120, () => F.line('bomber', 4, X(80), X(110), 1.6, { item: 'power' })),
        S(1440, () => { F.dive('fighter', 7, -1, 16); F.dive('fighter', 7, 1, 16); }),
        S(1700, () => F.turret([X(60), X(160), X(320), X(420)], 200, { fire: 'spread5' })),
        S(1980, () => F.sine('fighter', 9, X(55), X(48), 3.0)),
        S(2260, () => F.line('bomber', 4, X(90), X(110), 1.7, { item: 'bomb' })),
        S(2380, () => TW.spawnDread(4)),
        S(2540, () => F.hover('gunship', 5, [X(60), X(150), X(240), X(330), X(420)], 140, { fire: 'ring6', item: 'medal' })),
        S(2700, () => { F.hover('sniper', 2, [X(110), X(370)], 170, {}); F.hover('launcher', 2, [X(200), X(280)], 120, {}); }),
        S(2860, () => F.vee('splitter', 5, X(240), X(60), 1.6)),
        S(3120, () => F.ground('tank', 8, 34, { item: 'power' })),
      ],
      len: 3400,
    },
  ];

  /* ==================== 精英机（段末小高潮） ====================
     血厚、环形弹幕、必掉火力与大量经验 —— 给每关切出三个节奏高点。 */
  TW.spawnElite = function () {
    const e = TW.spawn('elite', X(240), -44, {
      pat: 'hover', ty: 185, vy: 1.7, item: 'power', fire: 'ring6', every: 160,
    });
    e.elite = true;
    return e;
  };

  /* ==================== v1.5.0 旗舰中 Boss（每关的标志性瞬间） ====================
     从右向左横穿战场，两侧炮塔是弱点：炮塔健在时舰体只受 15% 伤害 —— 逼玩家
     先拆件再打主体。击破 = 高分 + 武器/炸弹掉落；放走 = 挨一轮告别弹幕。 */
  TW.spawnDread = function (stage) {
    const g = G();
    if (g.enemies.some((e) => e.dread && !e.dead)) return null;
    const hp = Math.round((430 + stage * 150) * dpow());
    const ph = Math.round(80 * dpow());
    const e = {
      type: 'dread', spr: null, dread: true, boss: false,
      x: W + 150, y0: 138 + (stage % 2) * 30, y: 0, vx: -0.52, vy: 0,
      hp: hp, maxhp: hp, r: 56, score: 9000 + stage * 2500, t: 0,
      pat: 'dread', fire: 'aimed', every: 210, fireT: 90,
      flash: 0, dead: false, alpha: 1, item: null, ground: false, isMini: false,
      snip: null,
      parts: [
        { ox: -72, oy: 4, hp: ph, maxhp: ph, alive: true, r: 16, every: 155, fireT: 60 },
        { ox: 72, oy: 4, hp: ph, maxhp: ph, alive: true, r: 16, every: 155, fireT: 120 },
      ],
    };
    e.y = e.y0;
    g.enemies.push(e);
    g.msgText = 'WARNING · 旗舰接近';
    g.waveMsg = 110;
    TW.Audio.warn();
    if (TW.Audio.bossRoar) TW.Audio.bossRoar();
    return e;
  };

  /* 旗舰外观：程序化舰体（暗色装甲 + 暖色描边，符合敌人=暖色契约） */
  TW.drawDread = function (ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    /* 引擎尾焰（船头朝左，尾在右） */
    ctx.fillStyle = 'rgba(255,138,92,0.5)';
    ctx.beginPath();
    ctx.moveTo(96, -12); ctx.lineTo(126 + Math.random() * 18, 0); ctx.lineTo(96, 12);
    ctx.closePath(); ctx.fill();
    /* 舰体 */
    ctx.fillStyle = e.flash > 0 ? '#7a4050' : '#381d29';
    ctx.beginPath();
    ctx.moveTo(-98, 0); ctx.lineTo(-56, -27); ctx.lineTo(72, -31); ctx.lineTo(98, -12);
    ctx.lineTo(98, 12); ctx.lineTo(72, 31); ctx.lineTo(-56, 27);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff8a5c'; ctx.lineWidth = 2; ctx.stroke();
    /* 甲板与舰桥 */
    ctx.fillStyle = '#22101a';
    ctx.fillRect(-42, -13, 96, 26);
    ctx.fillStyle = '#ff8a5c';
    ctx.fillRect(-14, -7, 30, 14);
    ctx.fillRect(82, -4, 10, 8);
    /* 炮塔（弱点部件） */
    for (let i = 0; i < e.parts.length; i++) {
      const pt = e.parts[i];
      if (!pt.alive) continue;
      ctx.fillStyle = '#241018';
      ctx.beginPath(); ctx.arc(pt.ox, pt.oy, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffa64d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pt.ox, pt.oy, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffa64d';
      ctx.fillRect(pt.ox - 2.4, pt.oy - 20, 4.8, 9);
      ctx.fillStyle = 'rgba(255,120,80,0.8)';
      ctx.fillRect(pt.ox - 12, pt.oy - 24, 24 * (pt.hp / pt.maxhp), 2.6);
    }
    /* 舰体血条 */
    if (e.hp < e.maxhp) {
      ctx.fillStyle = 'rgba(255,90,110,0.85)';
      ctx.fillRect(-40, -44, 80 * Math.max(0, e.hp / e.maxhp), 3.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      ctx.strokeRect(-40, -44, 80, 3.2);
    }
    ctx.restore();
  };

  /* ==================== 关卡机制：陨石带 ====================
     可击碎的障碍。走「暖色 + 尖角 + 暗描边」，玩家一眼知道要躲或打掉。 */
  TW.spawnRock = function (x) {
    const g = G();
    if (g.rocks.length > 24) return;
    g.rocks.push({
      x: x === undefined ? 30 + Math.random() * (W - 60) : x, y: -38,
      vx: (Math.random() - 0.5) * 0.9, vy: 1.5 + Math.random() * 1.1,
      r: 17, hp: 26, maxhp: 26, t: 0, flash: 0,
      rot: Math.random() * 6.28, rs: (Math.random() - 0.5) * 0.05,
    });
  };

  TW.updateRocks = function () {
    const g = G();
    for (let i = g.rocks.length - 1; i >= 0; i--) {
      const r = g.rocks[i];
      r.t++; r.rot += r.rs; r.x += r.vx; r.y += r.vy;
      if (r.flash > 0) r.flash--;
      if (r.y > 880 || r.x < -70 || r.x > W + 70) g.rocks.splice(i, 1);
    }
  };

  /* ==================== 关卡机制：激光栅栏 ====================
     横贯全屏的激光带，留一个缺口逼玩家走位穿过；有 46 帧预警。 */
  TW.spawnBeam = function (y, life) {
    const g = G();
    const gapW = 78;
    g.beams.push({
      y: y === undefined ? 300 + Math.random() * 260 : y,
      gapX: 44 + Math.random() * Math.max(1, W - 88), gapW: gapW,
      t: 0, life: life || 210, warn: 46,
    });
  };

  TW.updateBeams = function () {
    const g = G();
    for (let i = g.beams.length - 1; i >= 0; i--) {
      g.beams[i].t++;
      if (g.beams[i].t > g.beams[i].life) g.beams.splice(i, 1);
    }
  };

  /* ==================== Boss ==================== */
  const BOSS_DEF = [
    { name: '赤鲨级战舰', hp: 620, score: 20000, r: 62 },
    { name: '苍穹母舰', hp: 820, score: 26000, r: 66 },
    { name: '深渊要塞', hp: 1020, score: 32000, r: 68 },
    { name: '钢蜈蚣', hp: 1240, score: 38000, r: 64 },
    { name: '终焉旗舰', hp: 1500, score: 50000, r: 72 },
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
      /* Boss 版追踪导弹：真正的曲线导弹（v1.4.4 与杂兵挂弹机同款武器） */
      for (let i = 0; i < n; i++) {
        const a = aimAt(b.x, b.y) + (i - (n - 1) / 2) * 0.5;
        TW.enemyMissile(b.x + (i - (n - 1) / 2) * 22, b.y + 20, a, 1.5);
      }
    },
    laser(b) {
      for (let k = -1; k <= 1; k += 2) {
        for (let i = 0; i < 5; i++) TW.enemyShot(b.x + k * 46, b.y + 10, Math.PI / 2, 2.6 + i * 0.3, 'amber');
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
    if (TW.Audio.bossRoar) TW.Audio.bossRoar();
    return b;
  };

  /* 每关 Boss 的攻击编排：[攻击名, 参数数组, 重复次数, 间隔帧] */
  const BOSS_PLANS = [
    [ // 阶段 0/1/2（v1.4.5 减量版：弹少而慢，每发都可读）
      [['fan', [3, 0.26, 1.9, 'amber'], 2, 130], ['ring', [7, 1.7, 'purple'], 2, 140], ['rain', [4, 1.6, 'red'], 2, 160]],
      [['fan', [4, 0.22, 2.0, 'amber'], 2, 120], ['spiral', [2, 1.5, 'green'], 3, 85], ['wall', [7, 1.7], 2, 150]],
      [['ring', [9, 1.8, 'purple'], 3, 120], ['spiral', [2, 1.6, 'magenta'], 3, 80], ['fan', [4, 0.2, 2.1, 'amber'], 3, 110], ['rain', [5, 1.7, 'red'], 2, 140]],
    ],
    [
      [['wall', [7, 1.7], 2, 150], ['fan', [3, 0.28, 1.9, 'amber'], 2, 130], ['homing', [2], 2, 160]],
      [['rain', [5, 1.7, 'red'], 2, 140], ['ring', [8, 1.7, 'purple'], 2, 130], ['spiral', [2, 1.5, 'green'], 3, 85]],
      [['wall', [8, 1.8], 3, 130], ['spiral', [2, 1.7, 'magenta'], 3, 75], ['fan', [4, 0.2, 2.1, 'amber'], 3, 105], ['homing', [3], 2, 140]],
    ],
    [
      [['ring', [8, 1.8, 'purple'], 2, 130], ['laser', [], 2, 150], ['rain', [5, 1.8, 'red'], 2, 140]],
      [['spiral', [2, 1.6, 'green'], 3, 80], ['wall', [8, 1.8], 2, 135], ['laser', [], 2, 140]],
      [['ring', [10, 1.9, 'magenta'], 3, 115], ['spiral', [2, 1.7, 'green'], 3, 75], ['laser', [], 3, 125], ['fan', [4, 0.19, 2.1, 'amber'], 3, 105]],
    ],
    [
      [['spiral', [2, 1.5, 'green'], 3, 85], ['fan', [4, 0.24, 2.0, 'amber'], 3, 115], ['rain', [6, 1.8, 'red'], 2, 130]],
      [['wall', [9, 1.8], 2, 125], ['ring', [9, 1.8, 'purple'], 2, 120], ['homing', [3], 2, 140]],
      [['spiral', [2, 1.7, 'magenta'], 3, 70], ['laser', [], 3, 125], ['ring', [10, 1.9, 'magenta'], 3, 110], ['wall', [9, 1.9], 2, 120]],
    ],
    [
      [['ring', [9, 1.8, 'purple'], 3, 115], ['laser', [], 2, 140], ['rain', [6, 1.8, 'red'], 2, 125]],
      [['wall', [9, 1.9], 3, 120], ['spiral', [2, 1.6, 'green'], 3, 75], ['fan', [4, 0.21, 2.1, 'amber'], 3, 105]],
      [['ring', [11, 2.0, 'magenta'], 3, 105], ['spiral', [2, 1.8, 'green'], 4, 68], ['laser', [], 3, 115], ['homing', [3], 2, 135], ['wall', [10, 2.0], 2, 115]],
    ],
  ];

  TW.updateBoss = function (b) {
    const g = G();
    const slow = TW.worldSlow ? TW.worldSlow() : (g.enemySlow > 0 ? (1 / 3) : 1);   // 凝滞：大招 1/3 · 升级二选一 1/10
    b.t += slow;
    if (b.flash > 0) b.flash--;
    if (b.invuln > 0) b.invuln--;

    /* 入场 */
    if (b.y < 130) { b.y += 1.6 * slow; }
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
      if (b.wait > 0) b.wait -= slow;
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
