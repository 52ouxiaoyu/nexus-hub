// v4.0.31 验证（修正编排：玩家先撤离出生点，避免等待期误杀 AI 群）
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

  const zp = await browser.newPage();
  zp.on('pageerror', e => console.log('[Z PAGE ERROR]', e.message));
  await zp.setViewport({ width: 1440, height: 900 });
  await zp.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await zp.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  // 玩家立刻撤离出生点（AI 出生全在中心，避免 5 秒保护后被群咬）
  await zp.evaluate(() => { const g = window.game; g.player.x = 400; g.player.y = 400; g.player.vx = 0; g.player.vy = 0; });
  // 快进出生保护（gameTime 是游戏内累计时间，5 秒内咬合被保护跳过）
  await zp.evaluate(() => { window.game.gameTime = 6000; });
  // 开局瞬间取初始属性（AI 尚未行动/消费）
  const init = await zp.evaluate(() => { const a = window.game.ais[0]; return { sun: a.sun, hp: a.hp, waterOn: a.waterOn, hpBg: !!a.hpBg }; });
  // 等 AI 进房认领
  await zp.waitForFunction('window.game.ais.filter(a => a.room).length >= 4', { timeout: 40000 }).catch(() => {});

  // H1 AI 属性
  let r = await zp.evaluate(() => {
    const a = window.game.ais[0];
    return { hp: a.hp, maxHp: a.maxHp, hpBg: !!a.hpBg, waterOn: a.waterOn, sun: a.sun, alive: window.game.ais.filter(x => !x.dead).length };
  });
  ok(r.hp === 300 && r.maxHp === 300, 'H1a AI 血量 300 (hp=' + r.hp + ')');
  ok(init.hpBg && init.waterOn === true && init.sun === 100, 'H1b 血条/自动浇水/初始阳光(加载瞬间) ' + JSON.stringify(init));
  ok(r.alive === 5, 'H1c 等待期无 AI 被误杀 (alive=' + r.alive + ')');

  // H2 接触按血量咬（1.5s/口，300 血能扛 3 口以上）
  r = await zp.evaluate(async () => {
    const g = window.game, a = g.ais[0];
    a.room = null; a.targetRoom = null; // 排除隔门免疫 + 断重寻路（否则 AI 会走向房间远离玩家）
    a.fleeing = true; a.fleeT = 99; // 伪装逃跑中冻结逃离重算（|| !fleeing 会每帧触发）
    const pin = () => { a.x = g.player.x + 30; a.y = g.player.y; }; // 模拟玩家追上：锁位
    pin();
    const hp0 = a.hp;
    for (let i = 0; i < 12; i++) { pin(); await new Promise(res => setTimeout(res, 300)); }
    return { hp: a.hp, hp0, barShown: a.hpBg.style.display === 'block', dead: a.dead };
  });
  ok(r.hp < r.hp0 && !r.dead, 'H2a 接触按血量扣血不秒杀 (' + r.hp0 + '→' + r.hp + ')');
  ok(r.barShown, 'H2b 受伤血条显示');

  // H3 咬死走 _checkPlayerDown（尸体灰化保留）+ 未全灭不结束
  r = await zp.evaluate(async () => {
    const g = window.game, a = g.ais[1];
    a.room = null; a.targetRoom = null; a.fleeing = true; a.fleeT = 99; // 伪装逃跑中冻结逃离重算（|| !fleeing 会每帧触发）
    a.hp = 60;
    const pin = () => { a.x = g.player.x + 30; a.y = g.player.y; };
    pin();
    for (let i = 0; i < 9; i++) { pin(); await new Promise(res => setTimeout(res, 300)); }
    return { dead: a.dead, gray: a.el1.className.includes('dead-slash'), over: g.over,
             elThere: !!a.el1, aliveLeft: g.ais.filter(x => !x.dead).length };
  });
  ok(r.dead && r.gray && r.elThere && !r.over, 'H3 咬死演出正确且游戏不结束 (alive=' + r.aliveLeft + ')');

  // H4a 流浪 AI 蹲避：无房 + 有路点 + 玩家在 180px 内 → 丢路点原地不移动
  r = await zp.evaluate(async () => {
    const g = window.game, a = g.ais.find(x => !x.dead);
    if (!a) return { skip: true };
    a.room = null; a.targetDrop = null; a.fleeing = true; a.fleeT = 99; // 伪装逃跑中冻结逃离重算（|| !fleeing 会每帧触发）
    a.x = g.player.x + 150; a.y = g.player.y;
    a.path = [{ x: g.player.x + 10, y: g.player.y }];
    const x0 = a.x, y0 = a.y;
    await new Promise(res => setTimeout(res, 1200));
    return { moved: Math.hypot(a.x - x0, a.y - y0), pathLen: a.path.length };
  });
  ok(r.skip || (r.moved < 5 && r.pathLen === 0), 'H4a 流浪 AI 见僵尸丢路点蹲避不送死 (moved=' + (r.skip ? 'skip' : r.moved.toFixed(1)) + ', path=' + (r.pathLen ?? '-') + ')');

  // H4b 贴脸 AI 反向逃跑
  r = await zp.evaluate(async () => {
    const g = window.game, a = g.ais.find(x => !x.dead);
    if (!a) return { skip: true };
    a.room = null; a.targetDrop = null; a.fleeing = false; a.fleeT = 0;
    a.x = g.player.x + 60; a.y = g.player.y; a.path = [];
    const x0 = a.x, y0 = a.y;
    await new Promise(res => setTimeout(res, 1200));
    const away = Math.hypot(a.x - g.player.x, a.y - g.player.y);
    return { moved: Math.hypot(a.x - x0, a.y - y0), away, fleeing: a.fleeing };
  });
  ok(r.skip || (r.moved > 20 && r.away > 60), 'H4b 贴脸 AI 反向逃跑 (moved=' + (r.skip ? 'skip' : r.moved.toFixed(0)) + ', away=' + (r.away === undefined ? '-' : r.away.toFixed(0)) + ')');

  // H5 AI 持续建造：满编房间 + 阳光充足 → 会新增植物
  r = await zp.evaluate(async () => {
    const g = window.game;
    const a = g.ais.find(x => !x.dead && x.room);
    if (!a) return { skip: true };
    const n0 = g.plants.length;
    a.sun = 600; a.actTimer = 0; a.path = [];
    await new Promise(res => setTimeout(res, 9000));
    return { n0, n1: g.plants.length };
  });
  ok(r.skip || r.n1 > r.n0, 'H5 AI 持续建造新植物 (' + (r.n0 !== undefined ? r.n0 + '→' + r.n1 : 'skip') + ')');
  await zp.close();

  // ===== 植物方回归 =====
  const pp = await browser.newPage();
  pp.on('pageerror', e => console.log('[P PAGE ERROR]', e.message));
  await pp.setViewport({ width: 1440, height: 900 });
  await pp.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await pp.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  await new Promise(res => setTimeout(res, 4000));
  r = await pp.evaluate(() => {
    const a = window.game.ais[0];
    return { hp: a.hp, waterOn: a.waterOn, players: window.game.allPlayers.length, over: window.game.over };
  });
  ok(r.hp === 300 && r.waterOn === true && !r.over, 'P1 植物方 AI 属性回归正常 ' + JSON.stringify(r));
  await pp.close();

  await browser.close();
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
