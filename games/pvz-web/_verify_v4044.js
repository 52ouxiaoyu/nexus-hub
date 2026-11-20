// v4.0.44 验证：AI 2强3弱 / 单人死亡抉择（天使/内鬼）/ 天使双技能与一条命 / 内鬼挠门与胜负
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });

  // ================= Page A：AI 分配 + 抉弹窗 + 天使 =================
  {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
    await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // T1 AI 2强3弱
    const t1 = await p.evaluate(() => {
      const g = window.game;
      const strong = g.ais.filter(a => a.isStrong);
      const weak = g.ais.filter(a => !a.isStrong);
      const strongOk = strong.every(a => a.sun === 150 && a.actTimer >= 1.2 && a.actTimer <= 2.7);
      const weakOk = weak.every(a => a.sun === 60 && a.actTimer >= 3.5 && a.actTimer <= 7);
      return { total: g.ais.length, ns: strong.length, nw: weak.length, strongOk, weakOk };
    });
    ok(t1.total === 5, 'T1a 共 5 名人机');
    ok(t1.ns === 2 && t1.nw === 3, 'T1b 2 强 3 弱 (强=' + t1.ns + ' 弱=' + t1.nw + ')');
    ok(t1.strongOk, 'T1c 强者 sun=150 行动 1.2~2.7s');
    ok(t1.weakOk, 'T1d 弱者 sun=60 行动 3.5~7s');

    // T2 单人死亡 → 抉择弹窗 + 全场冻结
    await p.evaluate(() => { const g = window.game; g.player.hp = 0; g._checkP1Down(); });
    await new Promise(r => setTimeout(r, 300));
    const t2a = await p.evaluate(() => {
      const g = window.game;
      const ov = document.getElementById('fate-choice');
      return { fateOpen: g.fateOpen, modal: !!ov, visible: !!ov && ov.style.display !== 'none', angelBtn: !!document.getElementById('fate-angel'), traitorBtn: !!document.getElementById('fate-traitor') };
    });
    ok(t2a.fateOpen && t2a.modal && t2a.visible, 'T2a 死亡弹出抉择框且可见');
    ok(t2a.angelBtn && t2a.traitorBtn, 'T2b 两个选项按钮齐全');
    const t2b = await p.evaluate(async () => {
      const g = window.game;
      const t0 = g.gameTime;
      await new Promise(res => setTimeout(res, 700));
      return { frozen: g.gameTime === t0, t0, t1: g.gameTime };
    });
    ok(t2b.frozen, 'T2c 弹窗期间 gameTime 冻结 (' + t2b.t0 + '→' + t2b.t1 + ')');

    // T3 选择天使：光环 / HUD / N捕获 / M加速 / 不可建造
    await p.evaluate(() => document.getElementById('fate-angel').click());
    await new Promise(r => setTimeout(r, 300));
    const t3a = await p.evaluate(() => {
      const g = window.game;
      return {
        angelic: g.playerAngelic, alive: !g.player.dead, hp: g.player.hp,
        halo: !!g.player.el1.querySelector('.angel-halo'),
        sun1Gone: !document.getElementById('sun1'),
        statsTxt: (document.querySelector('#hud-p1 > div:nth-child(2)') || {}).innerText || ''
      };
    });
    ok(t3a.angelic && t3a.alive && t3a.hp === 100, 'T3a 复活为天使 (hp=100)');
    ok(t3a.halo, 'T3b 头顶光环 .angel-halo 已挂载');
    ok(t3a.sun1Gone && t3a.statsTxt.includes('天使'), 'T3c HUD 阳光/孢子/伤害已替换为天使状态');
    await p.screenshot({ path: '_v4044_angel.png' });

    // 出僵尸 → N 捕获
    await p.evaluate(() => { const g = window.game; g.ghostSpawned = true; g._spawnGhost(); });
    await new Promise(r => setTimeout(r, 200));
    await p.keyboard.press('n');
    await new Promise(r => setTimeout(r, 150));
    const t3b = await p.evaluate(() => {
      const g = window.game, zb = g.zombies[0];
      return { stun: zb ? zb.stunT : -1, cap: zb ? zb.capturedT : -1, capCd: g.player.capCd, ice: zb && !!zb._iceBadge };
    });
    ok(t3b.stun > 2.5 && t3b.stun <= 3 && t3b.cap > 2.5, 'T3d N捕获：僵尸被定身3秒 (stun=' + t3b.stun.toFixed(2) + ' capturedT=' + t3b.cap.toFixed(2) + ')');
    ok(t3b.capCd > 29 && t3b.capCd <= 30, 'T3e 捕获 CD=30s (' + t3b.capCd.toFixed(1) + ')');
    ok(t3b.ice, 'T3f 捕获带冰冻外观标识');

    // M 加速
    await p.keyboard.press('m');
    await new Promise(r => setTimeout(r, 120));
    const t3c = await p.evaluate(() => {
      const g = window.game;
      return { spd: g.player.speedBuffT, spdCd: g.player.spdCd };
    });
    ok(t3c.spd > 5.5 && t3c.spd <= 6, 'T3g M加速：6秒疾跑生效 (' + t3c.spd.toFixed(2) + ')');
    ok(t3c.spdCd > 29 && t3c.spdCd <= 30, 'T3h 加速 CD=30s (' + t3c.spdCd.toFixed(1) + ')');

    // 不可建造（F 键不开建造菜单）
    await p.keyboard.press('f');
    await new Promise(r => setTimeout(r, 300));
    const t3d = await p.evaluate(() => window.game.kmenus[1].active);
    ok(!t3d, 'T3i 天使不可打开建造菜单');

    // T4 天使只有一条命：被僵尸接触 → 直接 Game Over
    await p.evaluate(() => {
      const g = window.game;
      g.player.invincibleT = 0;
      g.player.hp = 1;
      const zb = g.zombies[0];
      zb.stunT = 0; zb.capturedT = 0;
      zb.x = g.player.x; zb.y = g.player.y;
    });
    let t4 = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      t4 = await p.evaluate(() => ({ over: window.game.over, hp: window.game.player.hp }));
      if (t4.over) break;
      // 僵尸可能走散，重新贴脸
      await p.evaluate(() => { const g = window.game; if (!g.over && g.zombies[0]) { g.zombies[0].x = g.player.x; g.zombies[0].y = g.player.y; } });
    }
    ok(t4 && t4.over, 'T4 天使被抓住直接 Game Over (hp=' + (t4 ? Math.round(t4.hp) : '?') + ')');
    await p.close();
  }

  // ================= Page B：内鬼 =================
  {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
    await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // 死亡 → 选内鬼
    await p.evaluate(() => { const g = window.game; g.player.hp = 0; g._checkP1Down(); });
    await new Promise(r => setTimeout(r, 300));
    await p.evaluate(() => document.getElementById('fate-traitor').click());
    await new Promise(r => setTimeout(r, 300));
    const t5a = await p.evaluate(() => {
      const g = window.game;
      const expectHp = (window.HauntedDorm || g.constructor).GHOST_LEVELS[g.ghostLevel - 1].hp;
      const badge = [...g.player.el1.querySelectorAll('.lv-badge')].map(b => b.innerText).join('|');
      return { traitor: g.playerTraitor, alive: !g.player.dead, hp: g.player.hp, expectHp, badge, isZb: g.player.isZombie };
    });
    ok(t5a.traitor && t5a.alive, 'T5a 复活为内鬼');
    ok(t5a.hp === t5a.expectHp, 'T5b 血量=当前僵尸血量 (' + t5a.hp + ' vs ' + t5a.expectHp + ')');
    ok(t5a.badge.includes('内鬼'), 'T5c 头顶「😈 内鬼」标签 (' + t5a.badge + ')');
    ok(t5a.isZb, 'T5d 碰撞按僵尸处理 (isZombie)');

    // 挠门：给人机一间房+门，玩家站门口 → 门血下降
    const t5b = await p.evaluate(async () => {
      const g = window.game;
      const ai = g.ais[0];
      const rm = g.rooms[0];
      ai.room = rm; ai.targetRoom = rm;
      if (!rm.owners.includes(ai)) rm.owners.push(ai);
      ai.x = (rm.x + 1) * 80; ai.y = (rm.y + 1) * 80; ai.path = []; ai.actTimer = 99;
      g.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true, ai);
      const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
      g.player.x = rm.doorCol * 80 + 40;
      g.player.y = rm.doorRow * 80 + 100; // 距门中心 60px（咬合范围 80px 内）
      const hp0 = door.hp;
      await new Promise(res => setTimeout(res, 4500));
      const door2 = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
      return { scratched: !door2 || door2.hp < hp0, hp0: hp0, hp1: door2 ? door2.hp : 0 };
    });
    ok(t5b.scratched, 'T5e 内鬼挠门：门血量下降 (' + t5b.hp0 + '→' + t5b.hp1 + ')');

    // 咬幸存者：人机钉在身边 → 掉血
    const t5c = await p.evaluate(async () => {
      const g = window.game;
      const ai = g.ais[1];
      ai.path = []; ai.actTimer = 99;
      window._pin = setInterval(() => { ai.x = g.player.x + 30; ai.y = g.player.y; }, 50);
      const hp0 = ai.hp;
      await new Promise(res => setTimeout(res, 2600));
      clearInterval(window._pin);
      return { bitten: ai.hp < hp0, hp0, hp1: Math.round(ai.hp) };
    });
    ok(t5c.bitten, 'T5f 内鬼贴身咬幸存者掉血 (' + t5c.hp0 + '→' + t5c.hp1 + ')');

    // 主僵尸不锁定玩家内鬼
    await p.evaluate(() => { const g = window.game; g.ghostSpawned = true; g._spawnGhost(); const zb = g.zombies[0]; zb.targetEvalT = 99; zb.x = 100; zb.y = 100; });
    await new Promise(r => setTimeout(r, 1500));
    const t5d = await p.evaluate(() => {
      const g = window.game, zb = g.zombies[0];
      return { locked: zb.lockedTarget ? (zb.lockedTarget === g.player ? 'player' : 'other') : 'none' };
    });
    ok(t5d.locked !== 'player', 'T5g 主僵尸不把玩家内鬼当目标 (' + t5d.locked + ')');

    // T6 主僵尸被消灭 → 内鬼失败结算
    await p.evaluate(() => { const g = window.game; g._killZombie(g.zombies[0]); });
    await new Promise(r => setTimeout(r, 4200));
    const t6 = await p.evaluate(() => {
      const g = window.game;
      return { over: g.over, title: (document.getElementById('ov-title') || {}).innerText || '' };
    });
    ok(t6.over, 'T6a 主僵尸被消灭 → 内鬼计划失败结算');
    ok(t6.title.includes('植物们守住了家园'), 'T6b 失败标题正确 ("' + t6.title + '")');
    await p.close();
  }

  await browser.close();
  console.log('\n==== RESULT: ' + pass + ' pass / ' + fail + ' fail ====');
  process.exit(fail > 0 ? 1 : 0);
})();
