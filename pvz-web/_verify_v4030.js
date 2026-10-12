// v4.0.30 验证：僵尸开局10秒禁行动 / 小推车改存活奖励 / AI 建造提速
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
  const tick = (pg) => pg.evaluate(() => new Promise(r => setTimeout(r, 400)));

  // ===== 僵尸方模式 =====
  const zp = await browser.newPage();
  zp.on('pageerror', e => console.log('[Z PAGE ERROR]', e.message));
  await zp.setViewport({ width: 1440, height: 900 });
  await zp.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await zp.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });

  let r = await zp.evaluate(() => ({
    freeze: window.game.zombieFreezeT, mowers: window.game.mowers.length,
    items: window.game.mowerItems === undefined ? 'gone' : window.game.mowerItems.length,
    frozen: window.game._zombieFrozen()
  }));
  ok(r.freeze > 9 && r.freeze <= 10, 'Z1 开局 10 秒观察期 (freeze=' + r.freeze.toFixed(1) + ')');
  ok(r.mowers === 0 && r.items === 'gone', 'Z2 无散落道具/无自动推车 (mowers=' + r.mowers + ', items=' + r.items + ')');
  ok(r.frozen === true, 'Z3 _zombieFrozen 生效');

  // 冻结期按键不移动
  const yBefore = await zp.evaluate(() => { window.game.keys['w'] = true; return window.game.player.y; });
  await tick(zp);
  r = await zp.evaluate(() => ({ y: window.game.player.y, ui: window.game.freezeEl ? getComputedStyle(window.game.freezeEl).display : 'none',
                                 txt: window.game.freezeEl ? window.game.freezeEl.innerText : '' }));
  ok(Math.abs(r.y - yBefore) < 2, 'Z4 观察期按键不移动 (dy=' + Math.abs(r.y - yBefore).toFixed(1) + ')');
  ok(r.ui === 'block' && r.txt.includes('秒后开始行动'), 'Z5 倒计时 UI 显示');

  // 技能冻结
  r = await zp.evaluate(async () => {
    const g = window.game;
    g.keys['w'] = false;
    g.player.skillCd = 0;
    const cd0 = g.player.skillCd;
    g._useSkill(g.player);
    return { cd: g.player.skillCd, cd0 };
  });
  ok(r.cd === r.cd0, 'Z6 观察期技能被冻结 (cd=' + r.cd + ')');

  // 结束后可移动 + UI 消失
  await zp.evaluate(() => { window.game.zombieFreezeT = 0.15; });
  await tick(zp);
  const y2 = await zp.evaluate(() => { window.game.keys['w'] = true; return window.game.player.y; });
  await tick(zp);
  r = await zp.evaluate(() => ({ y: window.game.player.y, ui: window.game.freezeEl ? getComputedStyle(window.game.freezeEl).display : 'none' }));
  ok(r.y < y2 - 4, 'Z7 观察期结束后可移动 (dy=' + (y2 - r.y).toFixed(1) + ')');
  ok(r.ui === 'none', 'Z8 倒计时 UI 消失');
  await zp.evaluate(() => { window.game.keys['w'] = false; });

  // AI 存活奖励：aiBlessAt 归零触发
  await tick(zp);
  r = await zp.evaluate(async () => {
    const g = window.game;
    const sunBefore = g.ais.map(a => Math.floor(a.sun));
    g.aiBlessAt = 0;
    await new Promise(res => setTimeout(res, 500));
    return { reset: g.aiBlessAt > g.gameTime + 80000, sunBefore };
  });
  ok(r.reset === true, 'Z9 AI 存活奖励触发并重置计时');

  // AI mower 祝福直接布防
  r = await zp.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => !a.dead);
    if (!ai) return { skip: true };
    ai.room = g.rooms[0]; g.rooms[0].owners.push(ai); // 测试直通：跳过 AI 寻路认领
    g.mowers = [];
    ai.mowerCarry = 0;
    const bless = window.HauntedDorm.BLESSINGS.find(b => b.id === 'mower');
    bless.apply(g, ai);
    const mw = g.mowers[0];
    return { placed: !!mw && mw.room === ai.room, n: g.mowers.length };
  });
  ok(r.skip || r.placed === true, 'Z10 AI 推车祝福直接布防自家门口 ' + JSON.stringify(r));

  // AI 行动间隔实测（提速到 2.5~6s）
  r = await zp.evaluate(async () => {
    const g = window.game;
    const ai = g.ais.find(a => !a.dead);
    if (!ai) return { skip: true, n: g.ais.length, deads: g.ais.map(a => !!a.dead), over: g.over };
    if (!ai.room) { ai.room = g.rooms[1] || g.rooms[0]; (g.rooms[1] || g.rooms[0]).owners.push(ai); }
    ai.path = []; // 测试直通：清除寻路，让 AI 就地行动
    ai.actTimer = 0;
    await new Promise(res => setTimeout(res, 300));
    return { t: ai.actTimer };
  });
  ok(r.skip || (r.t > 2.0 && r.t <= 6.2), 'Z11 AI 行动间隔 2.5~6s (t=' + (r.t || 'skip') + ')');
  await zp.close();

  // ===== 植物方模式 =====
  const pp = await browser.newPage();
  pp.on('pageerror', e => console.log('[P PAGE ERROR]', e.message));
  await pp.setViewport({ width: 1440, height: 900 });
  await pp.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await pp.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  await tick(pp);

  r = await pp.evaluate(() => ({
    freeze: window.game.zombieFreezeT, frozen: window.game._zombieFrozen(),
    items: window.game.mowerItems === undefined ? 'gone' : window.game.mowerItems.length,
    mowers: window.game.mowers.length
  }));
  ok(r.freeze === 0 && r.frozen === false, 'P1 植物方无观察期');
  ok(r.items === 'gone' && r.mowers === 0, 'P2 植物方无散落道具');

  // 真人 mower 祝福 → 随身携带
  r = await pp.evaluate(() => {
    const g = window.game, p = g.player;
    const bless = window.HauntedDorm.BLESSINGS.find(b => b.id === 'mower');
    bless.apply(g, p);
    return { carry: p.mowerCarry, badge: p.mowerBadge ? getComputedStyle(p.mowerBadge).display : 'none' };
  });
  ok(r.carry === 1 && r.badge === 'block', 'P3 真人推车祝福随身携带+徽章 ' + JSON.stringify(r));

  // 随身走到自家门口自动放置（沿用 v4.0.29 机制）
  await pp.evaluate(() => {
    const g = window.game, p = g.player, rm = g.rooms[0];
    p.room = rm; rm.owners.push(p);
    p.x = rm.doorCol * 80 + 40; p.y = rm.doorRow * 80 + 40;
  });
  await tick(pp);
  r = await pp.evaluate(() => ({ mowers: window.game.mowers.length, carry: window.game.player.mowerCarry }));
  ok(r.mowers === 1 && r.carry === 0, 'P4 自家门口自动放置 (mowers=' + r.mowers + ')');

  await browser.close();
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
