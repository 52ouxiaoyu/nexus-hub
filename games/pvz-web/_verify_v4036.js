// v4.0.36 验证：僵尸玩家血池 ×3（真人玩家承压缓解，AI 小怪/植物方不变）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  let pass = 0, fail = 0;
  const ok = (c, n) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n); } };

  // ===== V1 僵尸局：玩家初始血量 1500（500×3）=====
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  const v1 = await p.evaluate(() => ({
    hp: window.game.player.hp, maxHp: window.game.player.maxHp
  }));
  ok(v1.hp === 1500 && v1.maxHp === 1500, 'V1 僵尸玩家初始血池 500×3=1500 (hp=' + v1.hp + ')');

  // ===== V2 真实火力测试：在远离中心回血圈处造 4 株豌豆射手，6 秒集火后玩家仍应存活且伤害照常结算 =====
  const v2 = await p.evaluate(async () => {
    const g = window.game;
    // 站位远离中心回血圈（半径 120px），否则 25%/s 回血会淹没测试伤害
    const px = g.worldWidth / 2 + 1600, py = g.worldHeight / 2;
    g.player.x = px; g.player.y = py;
    // 在玩家右侧空地造 4 株豌豆（无门板阻挡，真实 homing 弹道）
    let planted = 0;
    for (let i = 0; i < 4; i++) {
      const c = Math.floor(px / 80) + 2, r = Math.floor(py / 80) + i - 1;
      try { g.spawnPlant(c, r, 'peashooter'); planted++; } catch (e) {}
    }
    g.player.hp = g.player.maxHp; // 满血开测（消除开局已受伤害干扰）
    // 玩家钉在原地吃伤害
    const hold = setInterval(() => { g.player.x = px; g.player.y = py; }, 100);
    await new Promise(res => setTimeout(res, 6000));
    clearInterval(hold);
    const peasHit = g.player.maxHp - g.player.hp; // 总承伤
    // 等效旧版血量换算：同样伤害打在 500 血上的存活率
    return { planted, hpLeft: Math.round(g.player.hp), dmgTaken: Math.round(peasHit),
             alive: g.player.hp > 0, oldHpEquiv: Math.max(0, 500 - peasHit) };
  });
  ok(v2.planted >= 3 && v2.dmgTaken > 100, 'V2a 4 株豌豆 6s 真实集火已产生伤害 (planted=' + v2.planted + ' 承伤=' + v2.dmgTaken + ')');
  ok(v2.alive, 'V2b 集火 6 秒后玩家存活 (剩余血量 ' + v2.hpLeft + '，旧版 500 血等效只剩 ' + v2.oldHpEquiv + ')');

  // ===== V3 升级同步：杀 1 人升 Lv.2 → maxHp 应为 1200×3=3600 =====
  const v3 = await p.evaluate(async () => {
    const g = window.game;
    g.kills = 1;
    // 升级逻辑在主循环里按 gameTime 判定，直接驱动一次 update 等价场景——用真实等待
    await new Promise(res => setTimeout(res, 1200));
    return { lv: g.player.level, maxHp: g.player.maxHp, hp: Math.round(g.player.hp) };
  });
  ok(v3.lv >= 2 && v3.maxHp === 3600, 'V3 升级后血池同步 ×3 (Lv.' + v3.lv + ' maxHp=' + v3.maxHp + ')');

  // ===== V4 植物方不受影响：玩家 hp 仍为角色原始 100 =====
  await p.evaluate(() => window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' }));
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && !window.game.isZombieFaction', { timeout: 30000 });
  const v4 = await p.evaluate(() => ({ hp: window.game.player.hp, maxHp: window.game.player.maxHp }));
  ok(v4.hp === 100 && v4.maxHp === 100, 'V4 植物方玩家血量不受影响 (hp=' + v4.hp + ')');

  await browser.close();
  console.log('RESULT ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
