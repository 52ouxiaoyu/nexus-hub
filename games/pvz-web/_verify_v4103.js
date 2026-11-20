// v4.0.103 验证：托管=宅家发育（用户：托管者待一会儿就走出房间被僵尸抓 → 战力跟普通人机一样待房里升床/门/种植）
// 重点断言：托管期间绝不走出自己房（除了门破保命逃亡）、无房时进最近房认领、抢盲盒禁用、归还后照常
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.evaluate(() => {
    window._errStacks = [];
    window.addEventListener('error', e => window._errStacks.push((e.error && e.error.stack) || e.message));
  });
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });

  // 场景准备：P2 无敌（防测中途被咬死干扰断言）+ P1 活跃按键定时器由 Node 侧驱动
  await p.evaluate(() => { window.game.player2.invincibleT = 999999; });

  // T1 给 P2 一个已认领房（模拟「玩家先玩了一阵、房里已有产线后挂机」）
  const setup = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    // P2 开局自动分到的房：直接用 its room；若没有则认领一个空房
    let rm = p2.room;
    if (!rm) {
      rm = g.rooms.find(r => (r.owners || []).length === 0) || g.rooms[0];
      g._claimRoom(p2, rm);
    }
    // 把 P2 传送到房内床边
    p2.x = (rm.x + rm.tpl.beds[0].c) * 80 + 40;
    p2.y = (rm.y + rm.tpl.beds[0].r) * 80 + 40;
    p2.el1.style.left = p2.x + 'px'; p2.el1.style.top = p2.y + 'px';
    // 保证门板存在且健康（避免门破逃亡干扰「不出门」断言）
    if (!g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80)) g.spawnPlant(rm.doorCol, rm.doorRow, 'door', false, p2);
    const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    if (door) door.hp = door.maxHp;
    return { room: { x: rm.x, y: rm.y, w: rm.w, h: rm.h }, hasDoor: !!door };
  });
  ok('T1 P2 已认领房且在房内（门板存在）', !!setup.room && setup.hasDoor);

  // T2 P2 静默 11s → 托管激活
  await sleep(11000);
  let r = await p.evaluate(() => !!window.game.player2._afkHost);
  ok('T2 P2 静默 10s+ → 托管激活', r === true);

  // T3 关键断言：托管 25 秒，P2 每秒采样——除激活瞬间的寻路外，位置必须始终在房 bbox 内（宅家发育）
  // 同时记录发育行为（阳光账/房内植物数变化）
  const samples = [];
  const roomBox = setup.room;
  const t0 = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    return { sun: p2.sun, plants: g.plants.filter(pl => pl.owner === g.player2 && !pl.isDoor).length,
             doorHp: (g.getPlantAt(g.player2.room.doorCol * 80, g.player2.room.doorRow * 80) || {}).hp || 0 };
  });
  for (let i = 0; i < 25; i++) {
    await p.evaluate(() => { window.game.player1 && (window.game.player._lastInputAt = performance.now()); });
    await p.keyboard.press('KeyW').catch(() => {}); // P1 活跃（防 P1 被托管）
    const s = await p.evaluate(() => {
      const g = window.game, p2 = g.player2;
      const rm = p2.room;
      return { x: p2.x, y: p2.y, fleeing: !!p2.fleeing, path: !!(p2.path && p2.path.length),
               roomOk: !!rm, dead: p2.dead };
    });
    samples.push(s);
    await sleep(1000);
  }
  // 位置判定：允许激活初期寻路回家（前 5 秒），之后必须一直在房 bbox 内（±40px 缓冲）
  const bbox = { x0: roomBox.x * 80 - 40, x1: (roomBox.x + roomBox.w) * 80 + 40, y0: roomBox.y * 80 - 40, y1: (roomBox.y + roomBox.h) * 80 + 40 };
  const outside = samples.slice(5).filter(s => s.x < bbox.x0 || s.x > bbox.x1 || s.y < bbox.y0 || s.y > bbox.y1);
  ok(`T3a 托管 25s 内 P2 不走出房（后 20s 采样越界 ${outside.length} 次${outside[0] ? '，首次 x=' + outside[0].x.toFixed(0) + ' y=' + outside[0].y.toFixed(0) : ''}）`, outside.length === 0 && !samples[24].dead);

  // T3b 发育行为：阳光账或房内植物数或门血有正向变化（升级/种植会花钱→sun 变动也算）
  const t1 = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    return { sun: p2.sun, plants: g.plants.filter(pl => pl.owner === g.player2 && !pl.isDoor).length,
             doorHp: (g.getPlantAt(g.player2.room.doorCol * 80, g.player2.room.doorRow * 80) || {}).hp || 0 };
  });
  const grew = t1.sun !== t0.sun || t1.plants > t0.plants || t1.doorHp > t0.doorHp;
  ok(`T3b 托管期间有发育行为（sun ${t0.sun}→${t1.sun}，植物 ${t0.plants}→${t1.plants}，门血 ${t0.doorHp}→${t1.doorHp}）`, grew);

  // T4 抢盲盒禁用：生成盲盒，托管 8s，P2 不得外出追盲盒
  const drop = await p.evaluate(() => {
    const g = window.game;
    g.airdrops = g.airdrops || [];
    const el = document.createElement('div'); // v4.0.103 教训：盲盒必须带真 DOM（_tick 会 a.el.style.opacity，假盲盒缺 el 会崩主循环）
    el.className = 'entity'; el.style.cssText = 'width:70px;height:70px;left:60px;top:60px;';
    g.world1.appendChild(el);
    const d = { x: 60, y: 60, el: el, life: 999, kind: 'diamond' };
    g.airdrops.push(d);
    g.ghostSpawned = true;
    return { p2x: g.player2.x, p2y: g.player2.y, drop: { x: d.x, y: d.y } };
  });
  await sleep(8000);
  r = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    const dist = Math.hypot(p2.x - 60, p2.y - 60);
    return { dist, chasing: !!p2.targetDrop };
  });
  ok(`T4 盲盒存在时托管者不追（距盲盒 ${r.dist.toFixed(0)}px，未锁定 targetDrop）`, r.dist > 300 && !r.chasing);

  // T5 按键归还
  await p.keyboard.press('ArrowUp');
  await sleep(300);
  r = await p.evaluate(() => ({ host2: !!window.game.player2._afkHost, targetRoom: window.game.player2.targetRoom }));
  ok('T5 P2 按键 → 立即归还且清寻路目标', r.host2 === false && r.targetRoom === null);

  // T6 无房托管 → 进最近可认领房（把 P2 房间释放、传送到走廊、再挂机）
  await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    if (p2.room) { p2.room.owners = (p2.room.owners || []).filter(o => o !== p2); p2.room = null; }
    p2.x = 1120; p2.y = 520; // 走廊中部
    p2.el1.style.left = p2.x + 'px'; p2.el1.style.top = p2.y + 'px';
    p2._lastInputAt = performance.now() - 10500; // 直接触发托管
  });
  await sleep(12000);
  r = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    const inside = g._insideRoom(Math.floor(p2.x / 80), Math.floor(p2.y / 80));
    return { hosted: !!p2._afkHost, claimed: !!p2.room, inside: !!inside, dead: p2.dead };
  });
  ok(`T6 无房托管 → AI 带其进房认领（hosted=${r.hosted} claimed=${r.claimed} inside=${r.inside} dead=${r.dead}）`, r.hosted && (r.claimed || r.inside));

  const stacks = await p.evaluate(() => window._errStacks || []);
  ok('T7 无 JS 错误' + (stacks.length ? '\n---\n' + stacks[0] : ''), stacks.length === 0 && errs.length === 0);
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
