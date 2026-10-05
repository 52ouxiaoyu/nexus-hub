/* 雷霆之翼 Thunder Wing — 核心引擎
   竖版卷轴弹幕射击。固定步长 60Hz 逻辑 + rAF 渲染。 */
(function () {
  const TW = window.TW || (window.TW = {});
  const W = 480, H = 800;
  const VERSION = 'v1.0.1';

  /* ==================== 画布 ==================== */
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d', { alpha: false });
  let Q = 1;
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.min(vw / W, vh / H);
    Q = Math.min(2, Math.max(1, scale) * Math.min(window.devicePixelRatio || 1, 2));
    cv.width = Math.round(W * Q); cv.height = Math.round(H * Q);
    cv.style.width = Math.round(W * scale) + 'px'; cv.style.height = Math.round(H * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  /* ==================== 武器 ==================== */
  const WEAPONS = [
    { name: '火神炮', en: 'VULCAN', spr: 'vulcan', dmg: 1, interval: 7, color: '#7fe8ff' },
    { name: '激光炮', en: 'LASER', spr: 'laser', dmg: 4, interval: 11, color: '#5fb0ff', pierce: 2 },
    { name: '追踪导弹', en: 'MISSILE', spr: 'missile', dmg: 3, interval: 14, color: '#b98cff', homing: true },
  ];
  TW.WEAPONS = WEAPONS;

  /* ==================== 状态 ==================== */
  const G = {
    state: 'MENU',           // MENU / PLAYING / PAUSED / CLEAR / OVER / WIN
    mode: 'story',           // story / endless
    frame: 0, stage: 0, stageT: 0, scriptI: 0, pending: [],
    enemies: [], ebullets: [], pbullets: [], items: [],
    boss: null, player: null,
    score: 0, lives: 3, bombs: 3, power: 1, weapon: 0, spd: 3,
    combo: 0, comboT: 0, rank: 0, graze: 0, kills: 0,
    nextExtend: 80000, wave: 0, clearT: 0, flash: 0, deathT: 0,
    best: 0, sfx: true, waveMsg: 0, msgText: '',
    stars: [],

    reset() {
      this.enemies.length = 0; this.ebullets.length = 0; this.pbullets.length = 0;
      this.items.length = 0; this.pending.length = 0;
      this.frame = 0; this.stageT = 0; this.scriptI = 0; this.boss = null;
      this.score = 0; this.lives = 3; this.bombs = 3; this.power = 1; this.weapon = 0; this.spd = 3;
      this.combo = 0; this.comboT = 0; this.rank = 0; this.graze = 0; this.kills = 0;
      this.nextExtend = 80000; this.wave = 0; this.clearT = 0; this.flash = 0; this.deathT = 0;
      TW.FX.reset();
      this.player = {
        x: W / 2, y: H - 120, vx: 0, vy: 0, r: 3, grazeR: 22,
        fireT: 0, charge: 0, invuln: 0, dead: false, tilt: 0, alive: true,
      };
      this.best = +(localStorage.getItem('tw_best') || 0);
    },
    rankSpd() { return 1 + this.rank * 0.0025; },
    rankRate() { return 1 + this.rank * 0.004; },
    mult() { return 1 + Math.min(this.combo, 60) * 0.05; },
    addScore(v, x, y) {
      const s = Math.round(v * this.mult());
      this.score += s;
      if (x !== undefined) TW.FX.text(x, y, '+' + s, '#ffe9a8', 12);
      while (this.score >= this.nextExtend) {
        this.nextExtend += 120000; this.lives++;
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
  initStars();

  /* ==================== 输入 ==================== */
  const keys = {};
  let firing = false, touch = false, dragLast = null;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'j' || k === ' ' || k === 'z') firing = true;
    if (k === 'k' || k === 'x') useBomb();
    if (k === 'p' || k === 'escape') togglePause();
    if (k === 'enter') {
      if (G.state === 'MENU') startGame(document.body.dataset.mode || 'story');
      else if (G.state === 'OVER' || G.state === 'WIN') startGame(G.mode);
    }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (k === 'j' || k === ' ' || k === 'z') firing = false;
  });

  function toLogical(cx, cy) {
    const r = cv.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
  }
  cv.addEventListener('pointerdown', (e) => {
    touch = true; TW.Audio.init(); TW.Audio.resume();
    const p = toLogical(e.clientX, e.clientY);
    dragLast = p;
    if (!G.player) return;
    // 直接拖动：把飞机拉到手指位置（相对位移，手指不遮挡机体）
    G.player.x = p.x; G.player.y = p.y - 40;
    cv.setPointerCapture(e.pointerId);
    firing = true;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!dragLast || !G.player) return;
    const p = toLogical(e.clientX, e.clientY);
    G.player.x += (p.x - dragLast.x) * 1.55;
    G.player.y += (p.y - dragLast.y) * 1.55;
    dragLast = p;
  });
  const endDrag = () => { dragLast = null; if (touch) firing = true; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // 触屏炸弹按钮
  const bombBtn = document.getElementById('btn-bomb');
  if (bombBtn) bombBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); useBomb(); });
  if (bombBtn) bombBtn.style.display = ('ontouchstart' in window) ? 'flex' : 'none';

  /* ==================== 玩家 ==================== */
  function updatePlayer() {
    const p = G.player;
    if (!p) return;
    if (p.dead) {
      p.dead = false;
      p.x = W / 2; p.y = H - 120; p.invuln = 150;
    }
    if (p.invuln > 0) p.invuln--;

    let dx = 0, dy = 0;
    if (!touch) {
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (dx && dy) { const k = Math.SQRT1_2; dx *= k; dy *= k; }
      const slow = keys['shift'] ? 0.42 : 1;
      const sp = (3.6 + G.spd * 0.35) * slow;
      p.x += dx * sp; p.y += dy * sp;
      p.tilt += ((dx * 0.22) - p.tilt) * 0.18;
    }
    p.x = Math.max(16, Math.min(W - 16, p.x));
    p.y = Math.max(40, Math.min(H - 24, p.y));

    if (p.invuln > 0 && p.invuln % 8 < 4) { /* 闪烁 */ }

    /* 射击 */
    const wp = WEAPONS[G.weapon];
    const held = firing || touch;
    if (held && G.state === 'PLAYING') {
      p.fireT--;
      if (p.fireT <= 0) { shoot(wp); p.fireT = wp.interval; }
      p.charge++;
      if (p.charge >= 48) { p.charge = 0; fireCharge(wp); }
    } else if (p.charge > 0) {
      p.charge = Math.max(0, p.charge - 1.5);
    }
  }

  function shoot(wp) {
    const p = G.player, lv = G.power;
    const ang = -Math.PI / 2;
    if (G.weapon === 0) {
      const n = [1, 2, 3, 3, 5][lv - 1];
      const spread = [0, 0.07, 0.14, 0.16, 0.15][lv - 1];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread;
        addBullet(p.x, p.y - 14, ang + off, 11, wp.dmg, wp.spr, 0);
      }
    } else if (G.weapon === 1) {
      const n = [1, 1, 2, 2, 3][lv - 1];
      const offs = n === 1 ? [0] : n === 2 ? [-8, 8] : [-12, 0, 12];
      for (let i = 0; i < n; i++) addBullet(p.x + offs[i], p.y - 16, ang, 15, wp.dmg, wp.spr, 2);
    } else {
      const n = [1, 2, 2, 3, 3][lv - 1];
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i - (n - 1) / 2) * 0.5;
        addBullet(p.x, p.y - 12, ang + off * 0.25, 7.5, wp.dmg, wp.spr, 0, true);
      }
    }
    /* 僚机 */
    if (lv >= 3) {
      const wa = lv >= 5 ? 0.13 : 0;
      addBullet(p.x - 26, p.y + 2, ang - wa, 10, 1, 'wing', 0);
      addBullet(p.x + 26, p.y + 2, ang + wa, 10, 1, 'wing', 0);
    }
    if (G.sfx) (G.weapon === 1 ? TW.Audio.laser() : G.weapon === 2 ? TW.Audio.missile() : TW.Audio.shot());
  }

  function addBullet(x, y, ang, sp, dmg, kind, pierce, homing) {
    if (G.pbullets.length > 260) return;
    G.pbullets.push({
      x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      dmg: dmg, kind: kind, pierce: pierce || 0, homing: !!homing, hit: [], t: 0,
      w: kind === 'laser' ? 10 : (kind === 'charge' ? 16 : (kind === 'wing' ? 7 : 8)),
      h: kind === 'laser' ? 30 : (kind === 'charge' ? 28 : (kind === 'wing' ? 13 : 16)),
      r: kind === 'laser' ? 6 : 5,
    });
  }

  function fireCharge(wp) {
    const p = G.player;
    TW.Audio.chargeFire();
    TW.FX.ring(p.x, p.y - 10, 14, '#9ff0ff', 20);
    if (G.weapon === 0) {
      for (let i = -1; i <= 1; i++) addBullet(p.x, p.y - 18, -Math.PI / 2 + i * 0.13, 13, 3, 'charge', 1);
    } else if (G.weapon === 1) {
      for (let i = -1; i <= 1; i++) addBullet(p.x + i * 14, p.y - 18, -Math.PI / 2, 17, 9, 'charge', 6);
    } else {
      for (let i = 0; i < 5; i++) addBullet(p.x, p.y - 14, -Math.PI / 2 + (i - 2) * 0.3, 9, 4, 'charge', 0, true);
    }
    G.rank = Math.min(100, G.rank + 1);
  }

  /* ==================== 道具 ==================== */
  TW.dropItem = function (x, y, kind) {
    if (kind === 'weapon') {
      let w = G.weapon;
      while (w === G.weapon) w = Math.floor(Math.random() * 3);
      G.items.push({ x: x, y: y, vy: 1.5, vx: 0, kind: 'weapon', w: w, t: 0 });
      return;
    }
    G.items.push({ x: x, y: y, vy: 1.5, vx: 0, kind: kind, t: 0 });
  };

  function updateItems() {
    const p = G.player;
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      it.t++; it.y += it.vy; it.x += Math.sin(it.t * 0.06) * 0.7;
      if (it.y > H + 30) { G.items.splice(i, 1); continue; }
      if (!p) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < 26) {
        applyItem(it); G.items.splice(i, 1);
      }
    }
  }

  function applyItem(it) {
    switch (it.kind) {
      case 'power':
        if (G.power < 5) {
          G.power++; TW.FX.text(G.player.x, G.player.y - 30, '火力 ' + G.power, '#9ff0ff', 15);
          G.rank = Math.min(100, G.rank + 8);
        } else { G.addScore(2000, G.player.x, G.player.y - 30); }
        TW.Audio.powerup(); break;
      case 'weapon':
        G.weapon = it.w; G.power = Math.max(2, G.power);
        TW.FX.text(G.player.x, G.player.y - 30, WEAPONS[G.weapon].name, WEAPONS[G.weapon].color, 15);
        TW.Audio.powerup(); break;
      case 'bomb':
        G.bombs = Math.min(5, G.bombs + 1);
        TW.FX.text(G.player.x, G.player.y - 30, '炸弹 +1', '#ffd27a', 15);
        TW.Audio.pickup(); break;
      case 'speed':
        G.spd = Math.min(5, G.spd + 1);
        TW.FX.text(G.player.x, G.player.y - 30, '速度 +1', '#9ff0ff', 15);
        TW.Audio.pickup(); break;
      case 'life':
        G.lives++; TW.FX.text(G.player.x, G.player.y - 30, '残机 +1', '#ff9ad6', 17);
        TW.Audio.extend(); break;
      case 'medal':
        G.addScore(1500, G.player.x, G.player.y - 30); TW.Audio.pickup(); break;
    }
  }

  /* ==================== 炸弹 ==================== */
  function useBomb() {
    if (G.state !== 'PLAYING' || !G.player) return;
    if (G.bombs <= 0 || G.player.invuln > 90) return;
    G.bombs--;
    G.player.invuln = Math.max(G.player.invuln, 95);
    G.clearBullets(true);
    G.flash = 12;
    TW.FX.quake(10, 26); TW.FX.stop(6);
    TW.FX.bigBoom(G.player.x, G.player.y, 4, '#bff6ff');
    TW.Audio.bomb();
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (e.boss) { if (!e.dying) hurtEnemy(e, 40, e.x, e.y); }
      else hurtEnemy(e, 25, e.x, e.y);
    }
    G.rank = Math.max(0, G.rank - 6);
  }

  /* ==================== 伤害与击破 ==================== */
  function hurtEnemy(e, dmg, hx, hy) {
    if (e.boss) {
      if (e.invuln > 0 || e.dying) return;
      e.hp -= dmg; e.flash = 3;
      if (e.hp <= 0) { e.hp = 0; bossDown(e); }
      return;
    }
    e.hp -= dmg; e.flash = 3;
    TW.FX.hit(hx, hy, '#ffffff');
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    TW.FX.boom(e.x, e.y, e.type === 'bomber' || e.type === 'gunship' ? 1.7 : 1, '#ffb04a');
    TW.Audio.explode();
    G.kills++;
    G.combo++; G.comboT = 100;
    G.rank = Math.min(100, G.rank + 0.18);
    const s = G.addScore(e.score, e.x, e.y - 10);
    if (e.item) TW.dropItem(e.x, e.y, e.item);
    else if (Math.random() < 0.06) TW.dropItem(e.x, e.y, 'medal');
    return s;
  }

  function bossDown(b) {
    b.dying = true; b.dyT = 0; b.invuln = 99999;
    TW.FX.stop(12); TW.FX.quake(9, 30);
    TW.Audio.bigExplode();
    G.addScore(b.score, b.x, b.y + 90);
    for (let i = 0; i < b.parts.length; i++) {
      if (b.parts[i].alive) { b.parts[i].alive = false; TW.dropItem(b.x + b.parts[i].ox, b.y + b.parts[i].oy, 'power'); }
    }
  }

  function playerDie() {
    const p = G.player;
    if (p.invuln > 0 || G.state !== 'PLAYING') return;
    G.lives--;
    G.combo = 0; G.comboT = 0;
    G.rank = Math.max(0, G.rank - 28);
    G.power = Math.max(1, G.power - 2);
    G.clearBullets(false);
    TW.FX.bigBoom(p.x, p.y, 2.4, '#ff8a5c');
    TW.FX.quake(9, 24); TW.Audio.death();
    G.flash = 8;
    if (G.lives < 0) {
      G.state = 'OVER';
      if (G.score > G.best) { G.best = G.score; localStorage.setItem('tw_best', G.best); }
      showOverlay('result');
      return;
    }
    p.dead = true; p.invuln = 150;
    G.deathT = 40;
  }

  /* ==================== 碰撞 ==================== */
  function collide() {
    const p = G.player;
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
            hurtEnemy(e, b.dmg * 0.85, hx, hy);
          } else {
            hurtEnemy(e, b.dmg, hx, hy);
            consumed = true;
          }
          TW.FX.hit(hx, hy, '#ffffff');
          if (G.sfx && b.t % 2 === 0) TW.Audio.hit();
          break;
        }
      }
      if (consumed) G.pbullets.splice(i, 1);
    }

    if (!p) return;

    /* 敌弹 → 玩家 */
    const pr = p.r;
    for (let i = G.ebullets.length - 1; i >= 0; i--) {
      const b = G.ebullets[i];
      b.t++;
      b.x += b.vx; b.y += b.vy;
      if (b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) { G.ebullets.splice(i, 1); continue; }
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < pr + b.r * 0.62) {
        G.ebullets.splice(i, 1);
        playerDie();
        return;
      }
      if (!b.grazed && d < p.grazeR + b.r) {
        b.grazed = true; G.graze++;
        G.addScore(50);
        G.rank = Math.min(100, G.rank + 0.05);
        TW.FX.graze(p.x, p.y);
        if (G.sfx && G.graze % 3 === 0) TW.Audio.graze();
      }
    }

    /* 撞机 */
    for (let j = 0; j < G.enemies.length; j++) {
      const e = G.enemies[j];
      if (e.dead || e.dying) continue;
      if (e.boss) {
        const dx = (p.x - e.x) / (e.r * 0.9), dy = (p.y - e.y) / (e.r * 0.7);
        if (dx * dx + dy * dy < 1) { playerDie(); return; }
      } else if (Math.hypot(p.x - e.x, p.y - e.y) < e.r * 0.62 + pr) {
        if (e.ground) { hurtEnemy(e, 12, e.x, e.y); }
        playerDie(); return;
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
    if (G.scriptI >= st.script.length && G.stageT >= st.len && !G.boss &&
      G.enemies.length === 0 && G.pending.length === 0) {
      TW.spawnBoss(st.boss);
      G.msgText = 'WARNING';
      G.waveMsg = 110;
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
    if (G.comboT > 0) { G.comboT--; if (G.comboT === 0) G.combo = 0; }
    G.rank = Math.min(100, G.rank + 0.006);

    /* 延迟生成 */
    for (let i = G.pending.length - 1; i >= 0; i--) {
      if (G.pending[i].t <= G.frame) { G.pending[i].fn(); G.pending.splice(i, 1); }
    }

    runScript();
    updatePlayer();

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
    collide();
    TW.FX.update();

    /* 背景 */
    const spd = 1 + G.spd * 0.15;
    for (let i = 0; i < G.stars.length; i++) {
      const s = G.stars[i];
      s.y += s.s * spd;
      if (s.y > H) { s.y = -4; s.x = Math.random() * W; }
    }
  }

  function stageClear() {
    const bonus = 10000 + G.bombs * 1500 + (G.graze * 20);
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
      ctx.globalAlpha = 0.62;
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

    /* 道具 */
    for (let i = 0; i < G.items.length; i++) {
      const it = G.items[i];
      const c = it.kind === 'power' ? '#7fe8ff' : it.kind === 'weapon' ? WEAPONS[it.w].color
        : it.kind === 'bomb' ? '#ffd27a' : it.kind === 'speed' ? '#9ff0ff'
          : it.kind === 'life' ? '#ff9ad6' : '#ffe9a8';
      ctx.save(); ctx.translate(it.x, it.y);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = c; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(it.kind === 'weapon' ? 'W' : it.kind === 'power' ? 'P' : it.kind === 'bomb' ? 'B'
        : it.kind === 'speed' ? 'S' : it.kind === 'life' ? '♥' : '★', 0, 5);
      ctx.restore();
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

    /* 敌弹 */
    for (let i = 0; i < G.ebullets.length; i++) {
      const b = G.ebullets[i];
      const img = TW.BULLET[b.kind] || TW.BULLET.red;
      const s = b.r * 3.4;
      drawSpr(img, b.x, b.y, s, s, 0, false);
    }

    /* 玩家 */
    const p = G.player;
    if (p && G.state === 'PLAYING') {
      if (!(p.invuln > 0 && p.invuln % 8 < 4)) {
        drawSpr(TW.SPR.player, p.x, p.y, 40, 44, p.tilt, false);
        if (G.power >= 3) {
          drawSpr(TW.SPR.wing, p.x - 26, p.y + 4, 18, 20, 0, false);
          drawSpr(TW.SPR.wing, p.x + 26, p.y + 4, 18, 20, 0, false);
        }
      }
      /* 判定点 */
      const slowKey = keys['shift'];
      ctx.fillStyle = slowKey ? '#ffffff' : 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
      if (slowKey) {
        ctx.strokeStyle = 'rgba(159,240,255,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.grazeR, 0, Math.PI * 2); ctx.stroke();
      }
      /* 蓄力条 */
      if (p.charge > 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(p.x - 20, p.y + 26, 40, 4);
        ctx.fillStyle = p.charge >= 44 ? '#ffffff' : '#7fe8ff';
        ctx.fillRect(p.x - 20, p.y + 26, 40 * Math.min(1, p.charge / 48), 4);
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

    /* 残机 / 炸弹 */
    ctx.textAlign = 'right';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = '#9ff0ff';
    ctx.fillText('残机 ' + Math.max(0, G.lives), W - 12, 26);
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('炸弹 ' + G.bombs, W - 12, 44);

    /* 连击 */
    if (G.combo > 1) {
      ctx.textAlign = 'center';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('x' + G.mult().toFixed(2) + '  ' + G.combo + ' COMBO', W / 2, 26);
    }

    /* 武器 / 火力 */
    const wp = WEAPONS[G.weapon];
    ctx.textAlign = 'left';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = wp.color;
    ctx.fillText(wp.name, 12, H - 26);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < G.power ? wp.color : 'rgba(255,255,255,0.18)';
      ctx.fillRect(12 + i * 14, H - 18, 11, 6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 11px system-ui, sans-serif';
    ctx.fillText('擦弹 ' + G.graze, 12, H - 46);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('RANK ' + Math.round(G.rank), W - 12, H - 26);

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
    if (d) {
      d.innerHTML = (G.mode === 'story'
        ? (G.state === 'WIN' ? '全 5 关通关' : '到达 STAGE ' + (G.stage + 1))
        : '无尽模式 WAVE ' + G.wave)
        + ' · 击破 ' + G.kills + ' · 擦弹 ' + G.graze
        + '<br>最高分 ' + G.best;
    }
  }

  function startGame(mode) {
    TW.Audio.init(); TW.Audio.resume();
    G.mode = mode || 'story';
    G.reset();
    G.state = 'PLAYING';
    startStage(0);
    hideAll();
  }
  function togglePause() {
    if (G.state === 'PLAYING') { G.state = 'PAUSED'; showOverlay('pause'); }
    else if (G.state === 'PAUSED') { G.state = 'PLAYING'; hideAll(); }
  }

  document.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const a = el.dataset.act;
      if (a === 'start-story') startGame('story');
      else if (a === 'start-endless') startGame('endless');
      else if (a === 'resume') togglePause();
      else if (a === 'restart') startGame(G.mode);
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
    VERSION: VERSION, W: W, H: H,
    get G() { return G; },
    state: () => G.state,
    start: (m) => startGame(m || 'story'),
    pause: togglePause,
    frame: (n) => { for (let i = 0; i < (n || 1); i++) update(); },
    render: render,
    bomb: useBomb,
    key: (k, down) => { keys[k] = !!down; if ((k === 'j' || k === ' ') && down) firing = true; if ((k === 'j' || k === ' ') && !down) firing = false; },
    setWeapon: (w) => { G.weapon = w; },
    setPower: (p) => { G.power = p; },
    spawnBoss: (s) => TW.spawnBoss(s || 0),
    killAll: () => { G.enemies.length = 0; G.boss = null; },
    gotoStage: (n) => { startStage(n); },
    counts: () => ({ e: G.enemies.length, eb: G.ebullets.length, pb: G.pbullets.length, it: G.items.length, parts: TW.FX.parts.length }),
  };
})();
