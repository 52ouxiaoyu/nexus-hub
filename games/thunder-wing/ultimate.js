/* 雷霆之翼 Thunder Wing — 大招系统（v1.4.0）
 *
 * 设计要点：
 *  1. 大招不再是「一键清屏」这一个重复动作 —— 每次释放后会随机换成另一种，
 *     共 8 种，含僚机风暴 / 引力井 / 轨道炮 / 时空凝滞 / 要塞模式 / 混沌轮盘。
 *  2. 玩家能在 HUD 上预览「下一发是什么」，把随机性变成期待感而不是失控感。
 *  3. 混沌轮盘负责纯粹的意外：可能是金雨、可能是白送一个词条，
 *     也可能把满屏弹幕直接变成经验球 —— 释放前你永远不知道会发生什么。
 *  4. 遵循配色契约：我方效果一律冷色（蓝 / 青 / 白 / 淡金），暖色留给有害物。
 *
 *  依赖延迟绑定：本文件在 game.js 之前加载，所有对引擎内部函数
 *  （TW.addBullet / TW.hurtEnemy / TW.W 等）的调用都发生在运行时。
 */
(function () {
  const TW = window.TW || (window.TW = {});
  function G() { return TW.G; }
  function rw() { return TW.W ? TW.W() : 480; }

  const ULT = [
    /* ── 1. 经典清屏（保留原版手感，追加三段冲击波，避免沦为最弱选项） ── */
    {
      id: 'nova', name: '新星爆破', en: 'NOVA BURST', glyph: '✷', color: '#ffe9a8',
      w: 13, dur: 34, grace: 95,
      desc: '清空敌弹 · 三段冲击波横扫',
      cast(pl, u) {
        const g = G();
        g.clearBullets(true);
        g.flash = 14;
        TW.FX.quake(11, 28); TW.FX.stop(7);
        TW.FX.bigBoom(pl.x, pl.y, 4.2, '#bff6ff');
        u.d.step = 0;
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          TW.hurtEnemy(e, e.boss ? 46 : 28, e.x, e.y, pl);
        }
        TW.Audio.bomb();
      },
      tick(pl, u) {
        if (u.t % 11 !== 0 || u.d.step >= 3) return;
        u.d.step++;
        const R = 60 + u.d.step * 72;
        TW.FX.ring(pl.x, pl.y, 22, '#bff6ff', 24);
        const g = G();
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          if (Math.hypot(e.x - pl.x, e.y - pl.y) < R) TW.hurtEnemy(e, e.boss ? 20 : 12, e.x, e.y, pl);
        }
      },
      draw(ctx, pl, u) {
        const k = 1 - u.t / 34;
        ctx.strokeStyle = 'rgba(191,246,255,' + (0.55 * k).toFixed(2) + ')';
        ctx.lineWidth = 3 * k + 0.5;
        ctx.beginPath(); ctx.arc(pl.x, pl.y, 40 + k * 230, 0, Math.PI * 2); ctx.stroke();
      },
    },

    /* ── 2. 僚机风暴：真·僚机模式，4 架独立咬住敌人打 ── */
    {
      id: 'wing', name: '僚机风暴', en: 'WING STORM', glyph: '⧉', color: '#8cf0ff',
      w: 12, dur: 330, grace: 40,
      desc: '4 架僚机环绕自动索敌开火',
      cast(pl, u) {
        u.d.n = 4; u.d.a = 0;
        TW.FX.text(pl.x, pl.y - 50, '僚机出击', '#8cf0ff', 16);
        TW.Audio.powerup();
      },
      tick(pl, u) {
        u.d.a += 0.055;
        if (u.t % 14 !== 0) return;
        const g = G();
        let best = null, bd = Infinity;
        for (let i = 0; i < g.enemies.length; i++) {
          const e = g.enemies[i];
          if (e.dead || e.dying) continue;
          const d = Math.hypot(e.x - pl.x, e.y - pl.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) return;
        for (let k = 0; k < u.d.n; k++) {
          const a = u.d.a + (Math.PI * 2 / u.d.n) * k;
          const sx = pl.x + Math.cos(a) * 52, sy = pl.y + Math.sin(a) * 52;
          TW.addBullet(pl, sx, sy, Math.atan2(best.y - sy, best.x - sx), 11, 4, 'wing', 1);
        }
      },
      draw(ctx, pl, u) {
        for (let k = 0; k < u.d.n; k++) {
          const a = u.d.a + (Math.PI * 2 / u.d.n) * k;
          const x = pl.x + Math.cos(a) * 52, y = pl.y + Math.sin(a) * 52;
          const img = pl.id === 0 ? TW.SPR.wing : TW.SPR.wing2;
          ctx.save();
          ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
          ctx.globalAlpha = 0.92;
          ctx.drawImage(img, -11, -12, 22, 24);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(140,240,255,0.28)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(pl.x, pl.y, 52, 0, Math.PI * 2); ctx.stroke();
      },
    },

    /* ── 3. 引力井：把敌弹吸走，最后塌缩成一次范围爆发（保命 + 反打） ── */
    {
      id: 'well', name: '引力井', en: 'GRAVITY WELL', glyph: '◍', color: '#8fbcff',
      w: 11, dur: 250, grace: 40,
      desc: '吸收敌弹 · 塌缩时范围爆发',
      cast(pl, u) {
        u.d.x = pl.x; u.d.y = pl.y - 170; u.d.r = 6;
        TW.FX.text(u.d.x, u.d.y - 20, '引力井展开', '#8fbcff', 15);
        TW.Audio.charge();
      },
      tick(pl, u) {
        const g = G(), wx = u.d.x, wy = u.d.y;
        u.d.r = Math.min(52, u.d.r + 2);
        u.d.spin = (u.d.spin || 0) + 0.14;
        for (let i = g.ebullets.length - 1; i >= 0; i--) {
          const b = g.ebullets[i];
          if (!b) break;
          const dx = wx - b.x, dy = wy - b.y, d = Math.hypot(dx, dy);
          if (d > 240) continue;
          const a = Math.atan2(dy, dx), s = Math.min(7, 140 / (d + 26));
          b.x += Math.cos(a) * s; b.y += Math.sin(a) * s;
          if (d < 22) {
            g.ebullets.splice(i, 1);
            g.addScore(30);
            TW.FX.hit(b.x, b.y, '#cfe4ff');
          }
        }
        if (u.t <= 1) {
          TW.FX.bigBoom(wx, wy, 3.8, '#cfe4ff'); TW.FX.quake(9, 24); TW.Audio.bigExplode();
          g.flash = 10;
          for (let i = g.enemies.length - 1; i >= 0; i--) {
            const e = g.enemies[i];
            if (Math.hypot(e.x - wx, e.y - wy) < 215) TW.hurtEnemy(e, e.boss ? 130 : 70, e.x, e.y, pl);
          }
        }
      },
      draw(ctx, pl, u) {
        const wx = u.d.x, wy = u.d.y;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(u.d.spin || 0);
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = 'rgba(143,188,255,' + (0.5 - k * 0.13).toFixed(2) + ')';
          ctx.lineWidth = 2.4 - k * 0.6;
          ctx.beginPath();
          ctx.arc(0, 0, u.d.r * (1 - k * 0.26), k * 1.9, k * 1.9 + Math.PI * 1.35);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(20,26,52,0.92)';
        ctx.beginPath(); ctx.arc(0, 0, u.d.r * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,224,255,0.8)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, u.d.r * 0.42, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      },
    },

    /* ── 4. 轨道炮：跟随自机的贯穿光束，持续高伤 ── */
    {
      id: 'orbital', name: '轨道炮', en: 'ORBITAL RAIL', glyph: '⌁', color: '#bfe9ff',
      w: 11, dur: 96, grace: 40,
      desc: '贯穿全屏的光束持续灼烧',
      cast(pl, u) {
        u.d.x = pl.x; u.d.t = 0;
        TW.FX.text(pl.x, 210, '轨道炮锁定', '#bfe9ff', 17);
        TW.Audio.warn();
      },
      tick(pl, u) {
        const g = G();
        u.d.t++;
        u.d.x += (pl.x - u.d.x) * (u.d.t < 26 ? 0.28 : 0.07);
        if (u.d.t < 26) return;
        const bx = u.d.x;
        if (u.d.t === 26) { TW.FX.quake(6, 20); TW.Audio.chargeFire(); }
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          if (e.dead || e.dying) continue;
          if (Math.abs(e.x - bx) < e.r * 0.85 + 17 && e.y < pl.y) {
            TW.hurtEnemy(e, e.boss ? 5.2 : 3.4, e.x, e.y - 6, pl);
          }
        }
      },
      draw(ctx, pl, u) {
        const bx = u.d.x;
        if (u.d.t < 26) {
          /* 预警：细虚线，让「光束要落到这条线上」在开火前就可读 */
          ctx.strokeStyle = 'rgba(191,233,255,' + (0.35 + 0.3 * Math.sin(u.d.t * 0.6)).toFixed(2) + ')';
          ctx.lineWidth = 1.6; ctx.setLineDash([12, 8]);
          ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, 800); ctx.stroke();
          ctx.setLineDash([]);
          return;
        }
        const k = Math.min(1, u.t / 14);
        const grd = ctx.createLinearGradient(bx, 0, bx, pl.y);
        grd.addColorStop(0, 'rgba(255,255,255,' + (0.9 * k) + ')');
        grd.addColorStop(1, 'rgba(150,225,255,' + (0.45 * k) + ')');
        ctx.fillStyle = grd;
        ctx.fillRect(bx - 15 * k, 0, 30 * k, pl.y);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * k) + ')';
        ctx.fillRect(bx - 4 * k, 0, 8 * k, pl.y);
      },
    },

    /* ── 5. 时空凝滞：敌人与敌弹降到 1/3 速，玩家照常 ── */
    {
      id: 'freeze', name: '时空凝滞', en: 'TIME LOCK', glyph: '❄', color: '#9fd9ff',
      w: 10, dur: 270, grace: 40,
      desc: '敌人与敌弹减速至 1/3',
      cast(pl, u) {
        TW.G.enemySlow = 270;
        TW.FX.stop(4);
        TW.FX.ring(pl.x, pl.y, 20, '#9fd9ff', 46);
        TW.FX.text(pl.x, pl.y - 50, '时空凝滞', '#9fd9ff', 16);
        TW.Audio.charge();
      },
      tick(pl, u) { if (TW.G.enemySlow < u.t) TW.G.enemySlow = u.t; },
      draw(ctx, pl, u) {
        const a = Math.min(1, u.t / 30) * 0.5;
        const W2 = rw(), cx = W2 / 2;
        const g2 = ctx.createRadialGradient(cx, 400, 180, cx, 400, 520);
        g2.addColorStop(0, 'rgba(159,217,255,0)');
        g2.addColorStop(1, 'rgba(159,217,255,' + (a * 0.55).toFixed(2) + ')');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, W2, 800);
      },
    },

    /* ── 6. 坠星弹幕：反向弹幕，从天上往下砸 ── */
    {
      id: 'rain', name: '坠星弹幕', en: 'METEOR RAIN', glyph: '☄', color: '#cfeaff',
      w: 10, dur: 190, grace: 40,
      desc: '天降坠星，自上而下砸穿敌阵',
      cast(pl, u) {
        u.d.n = 0;
        TW.FX.text(pl.x, pl.y - 50, '坠星降临', '#cfeaff', 16);
        TW.Audio.chargeFire();
      },
      tick(pl, u) {
        if (u.t % 9 !== 0 || u.d.n >= 22) return;
        u.d.n++;
        const x = 22 + Math.random() * (rw() - 44);
        TW.addBullet(pl, x, -18, Math.PI / 2, 8.5, 9, 'charge', 2, false);
        TW.FX.ring(x, 12, 8, '#cfeaff', 14);
      },
    },

    /* ── 7. 要塞模式：体型护盾 + 免伤一次 + 额外散射 ── */
    {
      id: 'fortress', name: '要塞护盾', en: 'FORTRESS', glyph: '⬢', color: '#a8ffe0',
      w: 10, dur: 300, grace: 40,
      desc: '展开护盾 · 免伤一次 · 额外散射',
      cast(pl, u) {
        u.d.free = true; u.d.a = 0;
        TW.FX.text(pl.x, pl.y - 50, '要塞展开', '#a8ffe0', 16);
        TW.Audio.extend();
      },
      tick(pl, u) {
        u.d.a += 0.05;
        if (u.t % 10 !== 0) return;
        for (let i = -1; i <= 1; i++) {
          TW.addBullet(pl, pl.x + i * 15, pl.y - 8, -Math.PI / 2 + i * 0.34, 9.5, 3, 'wing', 1);
        }
      },
      draw(ctx, pl, u) {
        const R = 34 + Math.sin(u.t * 0.1) * 2;
        ctx.save();
        ctx.translate(pl.x, pl.y);
        ctx.rotate(u.d.a);
        ctx.strokeStyle = u.d.free ? 'rgba(168,255,224,0.85)' : 'rgba(168,255,224,0.34)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i;
          const x = Math.cos(a) * R, y = Math.sin(a) * R;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      },
    },

    /* ── 8. 混沌轮盘：纯粹的意外，四选一 ── */
    {
      id: 'chaos', name: '混沌轮盘', en: 'CHAOS ROULETTE', glyph: '✹', color: '#ffe9a8',
      w: 9, dur: 46, grace: 60,
      desc: '随机事件：谁也不知道会开出什么',
      cast(pl, u) {
        const g = G();
        const names = ['能量倾泻', '黄金雨', '强化涌流', '弹幕转化'];
        const roll = Math.floor(Math.random() * 4);
        u.d.roll = roll;
        if (roll === 0) {
          for (let i = g.enemies.length - 1; i >= 0; i--) {
            const e = g.enemies[i];
            TW.hurtEnemy(e, e.boss ? 140 : 999, e.x, e.y, pl);
          }
          g.flash = 12; TW.FX.quake(10, 22);
        } else if (roll === 1) {
          for (let i = 0; i < 18; i++) {
            TW.dropItem(40 + Math.random() * (rw() - 80), 90 + Math.random() * 170, 'medal');
          }
        } else if (roll === 2) {
          const pool = TW.rollPerks(pl, 3);
          let best = pool[0];
          for (let i = 1; i < pool.length; i++) if (pool[i].rar > best.rar) best = pool[i];
          if (best) {
            TW.applyPerk(pl, best.id);
            TW.FX.text(pl.x, pl.y - 52, best.name, best.color, 16);
          }
          pl.od = Math.max(pl.od, 240);
        } else {
          for (let i = 0; i < g.ebullets.length; i++) TW.spawnExp(g.ebullets[i].x, g.ebullets[i].y, 1);
          g.ebullets.length = 0;
        }
        TW.FX.text(pl.x, pl.y - 80, names[roll], '#ffe9a8', 19);
        TW.FX.quake(8, 20);
        TW.Audio.extend();
      },
      draw(ctx, pl, u) {
        const a = Math.min(1, u.t / 46);
        ctx.save();
        ctx.translate(pl.x, pl.y);
        ctx.rotate((46 - u.t) * 0.22);
        ctx.strokeStyle = 'rgba(255,233,168,' + (0.8 * a).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 / 8) * i;
          const rr = 30 + (i % 2 ? 8 : 20) * a;
          const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      },
    },
  ];

  const BY_ID = {};
  for (let i = 0; i < ULT.length; i++) BY_ID[ULT[i].id] = ULT[i];
  TW.ULT = ULT;
  TW.ULT_BY_ID = BY_ID;

  /* 抽取下一发：上一发权重降到 15%，避免连续重复同一个 */
  TW.pickUlt = function (pl) {
    let tot = 0;
    const w = [];
    for (let i = 0; i < ULT.length; i++) {
      const k = (pl && pl.lastUlt === ULT[i].id) ? ULT[i].w * 0.15 : ULT[i].w;
      w.push(k); tot += k;
    }
    let r = Math.random() * tot;
    for (let i = 0; i < ULT.length; i++) { r -= w[i]; if (r <= 0) return ULT[i].id; }
    return ULT[0].id;
  };

  /* 释放当前大招，执行完毕后立刻抽下一发 —— 玩家永远在期待「下一发是什么」 */
  TW.castUlt = function (pl) {
    const g = TW.G;
    if (!pl || pl.out || pl.dead) return null;
    if (g.state !== 'PLAYING' || pl.bombs <= 0) return null;
    const def = BY_ID[pl.nextUlt] || ULT[0];
    pl.bombs--;
    pl.invuln = Math.max(pl.invuln, def.grace || 60);
    pl.ult = { id: def.id, t: def.dur || 1, d: {} };
    if (def.cast) def.cast(pl, pl.ult);
    pl.lastUlt = def.id;
    pl.nextUlt = TW.pickUlt(pl);
    g.rank = Math.max(0, g.rank - 6);
    return def;
  };

  TW.updateUlt = function (pl) {
    const u = pl.ult;
    if (!u) return;
    const def = BY_ID[u.id];
    if (!def) { pl.ult = null; return; }
    if (def.tick) def.tick(pl, u);
    u.t--;
    if (u.t <= 0) pl.ult = null;
  };

  TW.drawUlt = function (ctx) {
    const g = TW.G;
    for (let i = 0; i < g.players.length; i++) {
      const pl = g.players[i];
      if (!pl || !pl.ult || pl.out) continue;
      const def = BY_ID[pl.ult.id];
      if (def && def.draw) def.draw(ctx, pl, pl.ult);
    }
  };

  /* 要塞模式的免伤：由 playerDie 调用（返回 true 表示这一击被吃掉） */
  TW.ultEatDeath = function (pl) {
    if (!pl.ult || pl.ult.id !== 'fortress' || !pl.ult.d.free) return false;
    pl.ult.d.free = false;
    pl.invuln = Math.max(pl.invuln, 70);
    TW.FX.ring(pl.x, pl.y, 18, '#a8ffe0', 32);
    TW.FX.text(pl.x, pl.y - 34, '要塞抵挡', '#a8ffe0', 15);
    TW.Audio.pickup();
    return true;
  };
})();
