/* 雷霆之翼 Thunder Wing — 自动驾驶 AI（v1.4.0）
 *
 * 为什么用「势场」而不是「脚本走位」：
 *   弹幕游戏的威胁是连续变化的高维信息，写死的闪避套路一旦遇到没见过的弹型就崩。
 *   势场把每一颗敌弹、每一架敌机、每一个掉落物都折算成一个推力向量，
 *   AI 只要顺着合力走就能自然涌现出「压迫式闪避 + 主动擦弹 + 顺手捡漏」的行为。
 *
 * 强在哪里（可在测试里量化）：
 *   1. 预测步进：对每颗子弹按 3 / 9 / 17 帧预测未来位置，而不是只看当前位置
 *      —— 快弹不会被「看着还远」骗到。
 *   2. 擦弹诱导：超载未就绪时，对最近的那颗弹施加「维持在擦弹圈边缘」的软吸引，
 *      让它变成一个会主动贴着弹幕跳舞、把充能刷满的副驾驶。
 *   3. 取舍：威胁高时放弃一切拾取，专心活命；威胁低时才去收道具和经验。
 *   4. 大招决策：近身威胁密集立刻保命，Boss 战把库存砸出去换输出。
 */
(function () {
  const TW = window.TW || (window.TW = {});

  const SAMPLE = [3, 9, 17];      /* 预测步长（帧） */
  const R_DANGER = 132;           /* 威胁感知半径 */
  const HOME_Y = 610;             /* 期望站位：下半屏但留出闪避余量 */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  const AI = {
    /* 返回归一化的移动意图 + 是否开火 + 是否放技能 */
    think(pl) {
      const g = TW.G;
      const W = TW.W ? TW.W() : 480;
      const H = 800;
      const cx = pl.x, cy = pl.y;
      let fx = 0, fy = 0;
      let threat = 0;

      /* ---- 1. 敌弹威胁场（含未来位置预测） ---- */
      const eb = g.ebullets;
      let nearD = Infinity, nearX = 0, nearY = 0;
      for (let i = 0; i < eb.length; i++) {
        const b = eb[i];
        if (!b) continue;
        for (let s = 0; s < SAMPLE.length; s++) {
          const k = SAMPLE[s];
          const bx = b.x + b.vx * k, by = b.y + b.vy * k;
          const dx = cx - bx, dy = cy - by;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (d > R_DANGER) continue;
          /* 只惧怕「正在接近我」的子弹；已经飞过去的不再产生排斥，否则会被背后推着走 */
          const app = (b.vx * dx + b.vy * dy) / d;
          if (app < -0.4) continue;
          const w = Math.pow(1 - Math.min(1, d / R_DANGER), 2)
            * (0.55 + Math.min(1, app / 4) * 0.6) * (1 - s * 0.22);
          fx += (dx / d) * w; fy += (dy / d) * w;
          threat += w;
          if (s === 0 && d < nearD) { nearD = d; nearX = dx / d; nearY = dy / d; }
        }
      }

      /* ---- 2. 擦弹诱导：超载未就绪时贴到擦弹圈边缘蹭充能 ----
         不是「追着子弹跑」，而是维持一个目标距离，因此不会反过来撞上去。 */
      if (pl.od <= 0 && nearD < 160) {
        const want = pl.grazeR * 1.55;
        const k = clamp((nearD - want) / 110, -1, 1) * 0.5;
        fx -= nearX * k; fy -= nearY * k;   /* nearX/Y 是「远离子弹」方向，取负号即靠近 */
      }

      /* ---- 3. 敌机本体：撞机等于掉残机，权重要高于普通排斥 ---- */
      for (let i = 0; i < g.enemies.length; i++) {
        const e = g.enemies[i];
        if (e.dead || e.dying) continue;
        const dx = cx - e.x, dy = cy - e.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const R = (e.boss ? e.r * 1.35 : e.r * 0.95) + 62;
        if (d < R) {
          const w = (1 - d / R) * (e.boss ? 1.7 : 1.15);
          fx += (dx / d) * w; fy += (dy / d) * w;
        }
      }

      /* ---- 4. 关卡机关：陨石排斥 / 激光栅栏钻缺口 ---- */
      for (let i = 0; i < g.rocks.length; i++) {
        const rk = g.rocks[i];
        const dx = cx - rk.x, dy = cy - rk.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d < 110) { const w = (1 - d / 110) * 2.2; fx += (dx / d) * w; fy += (dy / d) * w; }
      }
      for (let i = 0; i < g.beams.length; i++) {
        const bm = g.beams[i];
        if (bm.t < bm.warn) continue;
        const dy = cy - bm.y;
        if (Math.abs(dy) < 95) fy += (dy >= 0 ? 1 : -1) * 2.4;
        fx += clamp((bm.gapX - cx) / 90, -1, 1) * 2.2;
      }

      /* ---- 5. 拾取：威胁低才去拿，命比资源重要 ---- */
      if (threat < 1.4) {
        let tx = 0, ty = 0, tw = 0;
        for (let i = 0; i < g.items.length; i++) {
          const it = g.items[i];
          const dx = it.x - cx, dy = it.y - cy;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (d > 280) continue;
          const w = (1 - d / 280) * 0.62;
          if (w > tw) { tw = w; tx = dx / d; ty = dy / d; }
        }
        for (let i = 0; i < g.exps.length; i++) {
          const o = g.exps[i];
          const dx = o.x - cx, dy = o.y - cy;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (d > 240) continue;
          const w = (1 - d / 240) * 0.3;
          if (w > tw) { tw = w; tx = dx / d; ty = dy / d; }
        }
        fx += tx * tw; fy += ty * tw;
      }

      /* ---- 6. 咬住目标：横向对齐保证输出不断 ---- */
      let tg = null, td = Infinity;
      for (let i = 0; i < g.enemies.length; i++) {
        const e = g.enemies[i];
        if (e.dead || e.dying) continue;
        const d = Math.abs(e.x - cx) + Math.abs(e.y - cy) * 0.35;
        if (d < td) { td = d; tg = e; }
      }
      if (tg) fx += clamp((tg.x - cx) / 150, -1, 1) * 0.5;

      /* ---- 7. 站位偏好与边界回收 ---- */
      fy += clamp((HOME_Y - cy) / 220, -1, 1) * 0.42;
      if (cx < 52) fx += (52 - cx) / 52 * 1.4;
      if (cx > W - 52) fx -= (cx - (W - 52)) / 52 * 1.4;
      if (cy < 100) fy += (100 - cy) / 100 * 1.3;
      if (cy > H - 64) fy -= (cy - (H - 64)) / 64 * 1.3;

      /* ---- 合成：方向取合力，速度按紧急程度给（近身 urgency 高 → 全速闪避） ---- */
      const m = Math.sqrt(fx * fx + fy * fy);
      let dx = 0, dy = 0;
      if (m > 0.001) {
        const k = Math.min(1, m / 0.95);
        dx = (fx / m) * k; dy = (fy / m) * k;
      }

      /* ---- 8. 大招决策 ---- */
      let ult = false;
      if (pl.bombs > 0 && pl.invuln <= 90) {
        if (threat > 2.4) ult = true;                                  /* 弹幕糊脸：立刻保命 */
        else if (pl.lives <= 1 && threat > 1.0) ult = true;            /* 残命：宁可浪费也不能掉 */
        else if (g.boss && !g.boss.dying && pl.bombs >= 2 &&
          g.boss.hp > g.boss.maxhp * 0.35) ult = Math.random() < 0.02;  /* Boss 战：把库存换成输出 */
      }

      return { dx: dx, dy: dy, fire: true, ult: ult };
    },
  };

  TW.AI = AI;
})();
