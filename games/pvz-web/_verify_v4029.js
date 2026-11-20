// v4.0.29 小推车道具化验证
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await page.setViewport({ width: 1440, height: 900 });
  const url = 'file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter';
  await page.goto(url);
  await page.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.mowerItems && window.game.mowerItems.length>0', { timeout: 30000 });
  const tick = () => page.evaluate(() => new Promise(r => setTimeout(r, 350)));

  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  // T1 不再自动摆放 + 走廊散落 8 台道具
  let r = await page.evaluate(() => ({
    mowers: window.game.mowers.length,
    items: window.game.mowerItems.length,
    inRoom: window.game.mowerItems.filter(it => window.game._insideRoom(it.c, it.r)).length,
    onWall: window.game.mowerItems.filter(it => window.game.walls.has(it.c + ',' + it.r)).length
  }));
  ok(r.mowers === 0, 'T1a 开局无自动摆放推车 (mowers=' + r.mowers + ')');
  ok(r.items === 8, 'T1b 地图散落 8 台道具 (items=' + r.items + ')');
  ok(r.inRoom === 0, 'T1c 道具不刷在房间内部');
  ok(r.onWall === 0, 'T1d 道具不刷在墙上');

  // T2 僵尸玩家不拾取
  await page.evaluate(() => {
    const g = window.game, it = g.mowerItems[0];
    g.player.isZombie = true;
    g.player.x = it.x; g.player.y = it.y;
  });
  await tick();
  r = await page.evaluate(() => ({ n: window.game.mowerItems.length, carry: window.game.player.mowerCarry || 0 }));
  ok(r.n === 8 && r.carry === 0, 'T2 僵尸玩家靠近不拾取 (n=' + r.n + ', carry=' + r.carry + ')');

  // T3 植物玩家拾取 + 头顶徽章
  await page.evaluate(() => {
    const g = window.game, it = g.mowerItems[0];
    g.player.isZombie = false;
    g.player.x = it.x; g.player.y = it.y;
  });
  await tick();
  r = await page.evaluate(() => ({
    carry: window.game.player.mowerCarry,
    items: window.game.mowerItems.length,
    badge: window.game.player.mowerBadge ? getComputedStyle(window.game.player.mowerBadge).display : 'none'
  }));
  ok(r.carry === 1 && r.items === 7, 'T3a 拾取成功 (carry=' + r.carry + ', items=' + r.items + ')');
  ok(r.badge === 'block', 'T3b 头顶徽章显示 (' + r.badge + ')');

  // T4 未认领房间不放置
  await page.evaluate(() => {
    const g = window.game;
    const rm = g.rooms[0];
    g.player.x = rm.doorCol * 80 + 40; g.player.y = rm.doorRow * 80 + 40;
  });
  await tick();
  r = await page.evaluate(() => ({ mowers: window.game.mowers.length, carry: window.game.player.mowerCarry }));
  ok(r.mowers === 0 && r.carry === 1, 'T4 未认领房间门口不放置 (mowers=' + r.mowers + ', carry=' + r.carry + ')');

  // T5 认领后走到门口自动放置
  await page.evaluate(() => {
    const g = window.game, p = g.player, rm = g.rooms[0];
    p.room = rm; rm.owners.push(p);
    p.x = rm.doorCol * 80 + 40; p.y = rm.doorRow * 80 + 40;
  });
  await tick();
  r = await page.evaluate(() => {
    const g = window.game, mw = g.mowers[0];
    return { mowers: g.mowers.length, carry: g.player.mowerCarry,
             badge: g.player.mowerBadge ? getComputedStyle(g.player.mowerBadge).display : 'none',
             atDoor: mw ? (mw.room === g.player.room && !mw.used) : false,
             elThere: mw ? !!mw.el1.isConnected : false };
  });
  ok(r.mowers === 1 && r.carry === 0, 'T5a 自家门口自动放置 (mowers=' + r.mowers + ', carry=' + r.carry + ')');
  ok(r.badge === 'none' && r.atDoor && r.elThere, 'T5b 徽章隐藏+推车归属正确+DOM在场 (' + r.badge + ',' + r.atDoor + ',' + r.elThere + ')');

  // T6 门口已有推车：再捡一台不重复放置
  await page.evaluate(() => { const g = window.game; g.player.mowerCarry = 1; g._updateMowerBadge(g.player); });
  await tick();
  r = await page.evaluate(() => ({ mowers: window.game.mowers.length, carry: window.game.player.mowerCarry }));
  ok(r.mowers === 1 && r.carry === 1, 'T6 门口已有推车不重复放置 (mowers=' + r.mowers + ', carry=' + r.carry + ')');

  // T7 放置后推车触发冲撞：敌对单位靠近被撞 800 伤
  r = await page.evaluate(async () => {
    const g = window.game, mw = g.mowers[0];
    const zb = { x: mw.x + 40, y: mw.y, hp: 5000, maxHp: 5000, dead: false, stunT: 0, hitFlashT: 0, el1: null };
    g.zombies.push(zb);
    await new Promise(res => setTimeout(res, 300));
    return { active: mw.active, gone: mw.gone, hp: zb.hp, alive: g.zombies.includes(zb) };
  });
  ok(r.active === true, 'T7a 敌对靠近触发冲撞 (active=' + r.active + ')');
  ok(r.hp === 4200, 'T7b 撞击伤害 800 (hp=' + r.hp + ')');

  // T8 后备推车祝福：无已用推车时随身送一台
  r = await page.evaluate(() => {
    const g = window.game, p = g.player;
    p.mowerCarry = 0;
    const bless = window.HauntedDorm.BLESSINGS.find(b => b.id === 'mower');
    bless.apply(g, p);
    return { carry: p.mowerCarry };
  });
  ok(r.carry === 1, 'T8 祝福兜底随身送推车 (carry=' + r.carry + ')');

  await browser.close();
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
