/* 雷霆之翼 Thunder Wing — 局内 Build（三选一词条）、经验球与超载 UI
 *
 * 设计要点：
 *  1. 不新增按键。三选一出现时世界进入「子弹时间」（玩家照常操作，
 *     敌人与弹幕降到 1/3 速），用左右移动高亮，射击键或大招键确认，
 *     不选则 3 秒后自动锁定当前项 —— 全程零打断、零学习成本。
 *  2. 词条必须改变「弹幕形态」而不只是数字，玩家能一眼看出自己变强了。
 *  3. 遵循 v1.2.0 配色契约：有利物一律冷色圆形 + 白环，绝不用暖色尖角。
 */
(function () {
  const TW = window.TW || (window.TW = {});

  /* ==================== 词条表 ==================== */
  /* rar: 1 常见 / 2 稀有 / 3 史诗（权重 10 / 5 / 2.5） */
  const PERKS = [
    { id: 'rapid', name: '高速装填', desc: '射速 +18%', max: 4, rar: 1, color: '#7fe8ff', glyph: '»' },
    { id: 'power', name: '弹头强化', desc: '伤害 +25%', max: 4, rar: 1, color: '#9ff0ff', glyph: '▲' },
    { id: 'magnet', name: '牵引力场', desc: '拾取范围 +70%', max: 2, rar: 1, color: '#cfeaff', glyph: '⊙' },
    { id: 'twin', name: '双联发射', desc: '每次多打 1 发', max: 3, rar: 2, color: '#5ce8b4', glyph: '‡' },
    { id: 'pierce', name: '穿甲弹芯', desc: '子弹多穿 1 个', max: 3, rar: 2, color: '#5fb0ff', glyph: '↠' },
    { id: 'crit', name: '临界打击', desc: '12% 概率 3 倍伤害', max: 3, rar: 2, color: '#8cf0ff', glyph: '✶' },
    { id: 'homing', name: '自动索敌', desc: '子弹自带追踪', max: 2, rar: 2, color: '#5ce8b4', glyph: '◉' },
    { id: 'graze', name: '近接增幅', desc: '擦弹充能 +60%', max: 3, rar: 2, color: '#ffe9a8', glyph: '◌' },
    { id: 'over', name: '超载延长', desc: '超载 +1.2 秒', max: 3, rar: 2, color: '#a8ffe0', glyph: '⚡' },
    { id: 'split', name: '爆裂弹头', desc: '命中炸出碎片', max: 3, rar: 3, color: '#7fe8ff', glyph: '✳' },
    { id: 'splash', name: '击破溅射', desc: '击破喷出弹片', max: 3, rar: 3, color: '#9ff0ff', glyph: '✺' },
    { id: 'sat', name: '环绕炮台', desc: '召唤自动炮台', max: 4, rar: 3, color: '#8cf0ff', glyph: '◎' },
    { id: 'wing', name: '僚机增编', desc: '僚机 +1 对', max: 2, rar: 3, color: '#8cf0ff', glyph: '⧉' },
    { id: 'shield', name: '力场护盾', desc: '每 18 秒免伤 1 次', max: 3, rar: 3, color: '#a8ffe0', glyph: '⬡' },
  ];
  const BY_ID = {};
  for (let i = 0; i < PERKS.length; i++) BY_ID[PERKS[i].id] = PERKS[i];
  TW.PERKS = PERKS;
  TW.PERK = BY_ID;

  const RAR_W = [0, 10, 5, 2.5];

  /* 抽 n 个「未封顶」词条，按稀有度加权，不重复 */
  TW.rollPerks = function (pl, n) {
    const pool = [];
    /* 每日挑战：只从当天固定的词条池里抽，保证所有玩家同一套随机 */
    const lim = (TW.G && TW.G.perkPool) || null;
    for (let i = 0; i < PERKS.length; i++) {
      if ((pl.perks[PERKS[i].id] || 0) >= PERKS[i].max) continue;
      if (lim && lim.indexOf(PERKS[i].id) < 0) continue;
      pool.push(PERKS[i]);
    }
    const out = [];
    while (out.length < n && out.length < pool.length) {
      let tot = 0;
      for (let i = 0; i < pool.length; i++) if (out.indexOf(pool[i]) < 0) tot += RAR_W[pool[i].rar];
      let r = Math.random() * tot, pick = null;
      for (let i = 0; i < pool.length && !pick; i++) {
        if (out.indexOf(pool[i]) >= 0) continue;
        r -= RAR_W[pool[i].rar];
        if (r <= 0) pick = pool[i];
      }
      out.push(pick || pool[0]);
      if (!pick) break;
    }
    return out;
  };

  TW.applyPerk = function (pl, id) {
    pl.perks[id] = (pl.perks[id] || 0) + 1;
    if (id === 'sat') pl.satN = (pl.satN || 0) + 1;
  };

  /* 升级所需经验：5 / 9 / 14 / 20 / 27 / 35 ...（递增 4） */
  function expNeed(lv) { return 5 + lv * 4 + Math.floor(lv * lv / 6); }
  TW.expNeed = expNeed;

  /* 升级发词条（v1.5.1 定稿）：**全自动随机发放，任何情况下不弹卡、不弹窗、
     不减速、不抢键** —— 用户铁律：坚决不能有弹窗类 UI。升级只飘一行
     强化提示，操作零打断。 */
  TW.gainExp = function (pl, v) {
    if (pl.out) return;
    pl.exp += v;
    let guard = 0;
    while (pl.exp >= pl.nextExp && guard++ < 12) {
      pl.exp -= pl.nextExp;
      pl.level++;
      pl.nextExp = expNeed(pl.level);
      const picks = TW.rollPerks(pl, 1);
      if (picks[0]) TW.autoPerk(pl, picks[0]);
    }
  };

  TW.autoPerk = function (pl, p) {
    TW.applyPerk(pl, p.id);
    if (TW.Audio && TW.Audio.levelup) TW.Audio.levelup();
    if (TW.FX && TW.FX.text) TW.FX.text(pl.x, pl.y - 52, p.name + '  Lv.' + pl.perks[p.id], p.color, 14);
  };

  /* confirmPick 已随弹卡机制移除（v1.5.1 铁律：坚决不能有弹窗） */

  /* ==================== 经验球 ==================== */
  TW.spawnExp = function (x, y, v) {
    const g = TW.G;
    if (g.exps.length > 220) return;
    g.exps.push({ x: x, y: y, v: v || 1, vx: (Math.random() - 0.5) * 1.6, vy: -1.2 - Math.random(), t: 0 });
  };

  TW.updateExp = function () {
    const g = TW.G;
    for (let i = g.exps.length - 1; i >= 0; i--) {
      const o = g.exps[i];
      o.t++;
      /* 阻尼 + 磁吸：范围内自动飞向最近的未出局玩家 */
      let best = null, bd = Infinity;
      for (let k = 0; k < g.players.length; k++) {
        const pl = g.players[k];
        if (!pl || pl.out) continue;
        const d = Math.hypot(pl.x - o.x, pl.y - o.y);
        if (d < bd) { bd = d; best = pl; }
      }
      const mr = best ? 34 + 70 * (best.perks.magnet || 0) : 0;
      if (best && (bd < mr || o.t > 40)) {
        const a = Math.atan2(best.y - o.y, best.x - o.x);
        const sp = 5.5 + (o.t - 40) * 0.08;
        o.vx += Math.cos(a) * sp * 0.22; o.vy += Math.sin(a) * sp * 0.22;
      } else {
        o.vy += 0.12;
      }
      o.vx *= 0.9; o.vy *= 0.9;
      o.x += o.vx; o.y += o.vy;
      if (best && bd < 18) {
        TW.gainExp(best, o.v);
        g.exps.splice(i, 1);
        continue;
      }
      if (o.y > 860 || o.t > 600) g.exps.splice(i, 1);
    }
  };

  /* ==================== 渲染 ==================== */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* 经验球：冷色实心小圆 + 白环，符合「有利 = 圆形白环」契约 */
  TW.drawExp = function (ctx) {
    const g = TW.G;
    for (let i = 0; i < g.exps.length; i++) {
      const o = g.exps[i];
      const r = 3.4 + Math.sin(o.t * 0.2) * 0.6;
      ctx.fillStyle = '#5ce8b4';
      ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(o.x, o.y, r + 1.6, 0, Math.PI * 2); ctx.stroke();
    }
  };

  /* 环绕炮台 */
  TW.drawSats = function (ctx, pl) {
    if (!pl.satN) return;
    for (let i = 0; i < pl.satN; i++) {
      const a = pl.satA + (Math.PI * 2 / pl.satN) * i;
      const x = pl.x + Math.cos(a) * 46, y = pl.y + Math.sin(a) * 46;
      ctx.fillStyle = '#0e2c3a';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8cf0ff'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#dff6ff';
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  };

  /* v1.5.1：弹卡 UI 全面禁用（用户铁律），此处永不渲染 */
  TW.drawPick = function (ctx, W, H) {
    return;
    const g = TW.G;
    if (!g || !g.players) return;
    const act = [];
    for (let i = 0; i < g.players.length; i++) {
      const pl = g.players[i];
      if (pl && pl.pick && !pl.out) act.push(pl);
    }
    if (!act.length) return;

    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.34)';
    ctx.fillRect(0, 0, W, H);

    const cw = 118, ch = 96, gap = 14;
    const PC = ['#8cf0ff', '#ffd45e'];
    for (let k = 0; k < act.length; k++) {
      const pl = act[k];
      const total = pl.pick.length * cw + (pl.pick.length - 1) * gap;
      const cx = g.players.length > 1 ? (pl.id === 0 ? W * 0.25 : W * 0.75) : W / 2;
      const ox = cx - total / 2, oy = H / 2 - 70;

      ctx.textAlign = 'center';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = PC[pl.id] || '#9ff0ff';
      ctx.fillText('LEVEL ' + pl.level + ' · ' + pl.tag + ' 选择强化', cx, oy - 10);

      for (let i = 0; i < pl.pick.length; i++) {
        const p = pl.pick[i], on = i === pl.pickIdx;
        const x = ox + i * (cw + gap);
        const lvl = pl.perks[p.id] || 0;

        ctx.fillStyle = on ? 'rgba(12,32,44,0.96)' : 'rgba(8,18,28,0.8)';
        rrect(ctx, x, oy, cw, ch, 10); ctx.fill();
        ctx.strokeStyle = on ? p.color : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = on ? 2.4 : 1;
        rrect(ctx, x, oy, cw, ch, 10); ctx.stroke();

        ctx.fillStyle = p.color;
        ctx.font = '600 20px system-ui, sans-serif';
        ctx.fillText(p.glyph, x + cw / 2, oy + 27);
        ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.75)';
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(p.name, x + cw / 2, oy + 46);
        ctx.fillStyle = 'rgba(255,255,255,0.58)';
        ctx.font = '400 10px system-ui, sans-serif';
        wrapText(ctx, p.desc, x + cw / 2, oy + 62, cw - 14, 12);
        ctx.fillStyle = p.color;
        ctx.font = '400 9px system-ui, sans-serif';
        ctx.fillText(lvl > 0 ? 'Lv.' + lvl + ' → ' + (lvl + 1) : ['', '常见', '稀有', '史诗'][p.rar], x + cw / 2, oy + ch - 12);
      }

      /* 倒计时条：不选自动随机锁定 */
      const prog = Math.max(0, 1 - pl.pickT / 140);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(ox, oy + ch + 8, total, 3);
      ctx.fillStyle = 'rgba(159,240,255,0.85)';
      ctx.fillRect(ox, oy + ch + 8, total * prog, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '400 10px system-ui, sans-serif';
      ctx.fillText('← → 选 · 射击键确认 · 不选自动随机', cx, oy + ch + 26);
    }
    ctx.restore();
  };

  function drawPickDead(ctx, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,18,0.55)';
    ctx.fillRect(0, 0, W, H);

    for (let k = 0; k < active.length; k++) {
      const pl = active[k];
      const two = g.players.length > 1;
      const cw = two ? Math.min(150, (W - 60) / 3) : 150;
      const gap = 10;
      const total = cw * 3 + gap * 2;
      const ox = two ? (pl.id === 0 ? (W / 4) - total / 2 : (W * 3 / 4) - total / 2) : (W - total) / 2;
      const cy = H / 2 - 20;

      ctx.textAlign = 'center';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = two ? (pl.id === 0 ? '#8cf0ff' : '#ffd45e') : '#9ff0ff';
      ctx.fillText('LEVEL ' + pl.level + '  ·  ' + pl.tag + ' 选择强化', ox + total / 2, cy - 58);

      for (let i = 0; i < pl.pick.length; i++) {
        const p = pl.pick[i];
        const on = i === pl.pickIdx;
        const x = ox + i * (cw + gap), y = cy - 40;
        const h = two ? 108 : 116;

        ctx.fillStyle = on ? 'rgba(12,32,44,0.96)' : 'rgba(8,18,28,0.78)';
        rrect(ctx, x, y, cw, h, 10); ctx.fill();
        ctx.strokeStyle = on ? p.color : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = on ? 2.2 : 1;
        rrect(ctx, x, y, cw, h, 10); ctx.stroke();

        const lvl = pl.perks[p.id] || 0;
        ctx.fillStyle = p.color;
        ctx.font = '600 22px system-ui, sans-serif';
        ctx.fillText(p.glyph, x + cw / 2, y + 32);

        ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.72)';
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(p.name, x + cw / 2, y + 56);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '400 11px system-ui, sans-serif';
        wrapText(ctx, p.desc, x + cw / 2, y + 74, cw - 16, 13);

        if (lvl > 0) {
          ctx.fillStyle = p.color;
          ctx.font = '400 10px system-ui, sans-serif';
          ctx.fillText('Lv.' + lvl + ' → Lv.' + (lvl + 1), x + cw / 2, y + h - 9);
        } else {
          ctx.fillStyle = ['', '#7fe8ff', '#5ce8b4', '#ffd45e'][p.rar];
          ctx.font = '400 10px system-ui, sans-serif';
          ctx.fillText(['', '常见', '稀有', '史诗'][p.rar], x + cw / 2, y + h - 9);
        }
      }

      /* 倒计时条：让玩家知道「不选也会自动锁定」 */
      const tw = total, prog = 1 - Math.min(1, pl.pickT / 180);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(ox, cy + (two ? 74 : 82), tw, 3);
      ctx.fillStyle = 'rgba(159,240,255,0.85)';
      ctx.fillRect(ox, cy + (two ? 74 : 82), tw * prog, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '400 10px system-ui, sans-serif';
      ctx.fillText('←  →  选择    ·    射击键 / 大招键 确认', ox + total / 2, cy + (two ? 92 : 100));
    }
    ctx.restore();
  };

  function wrapText(ctx, text, cx, y, maxW, lh) {
    const chars = String(text).split('');
    let line = '', ly = y;
    for (let i = 0; i < chars.length; i++) {
      const t = line + chars[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, cx, ly); line = chars[i]; ly += lh; }
      else line = t;
    }
    if (line) ctx.fillText(line, cx, ly);
  }
})();
