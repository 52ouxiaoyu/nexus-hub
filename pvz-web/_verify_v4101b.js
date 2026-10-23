// v4.0.101 补充验证：托管真人在自己房内 → AI 会替他种植/升级（sun 下账 + owner=player2 植物增加）
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
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  // 铺垫：P2 塞进一个空房 + 给阳光 + 无敌；托管激活
  const setup = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    const rm = g.rooms.find(r => (!r.owners || r.owners.length === 0) && r !== g.player.room);
    if (rm) g._claimRoom(p2, rm);
    p2.sun = 150; p2.invincibleT = 99999;
    // 把 P2 放到房内床边（房内不寻路，AI 直接进入发育分支）
    p2.x = (rm.x + rm.tpl.beds[0].c) * 80 + 40;
    p2.y = (rm.y + rm.tpl.beds[0].r) * 80 + 40;
    p2._lastInputAt = performance.now() - 11000; // 立即满足 10s 挂机
    return { room: !!rm, host: !!p2._afkHost, owners: rm ? rm.owners.length : -1 };
  });
  ok(`铺垫：P2 认领空房=${setup.room} owners=${setup.owners}`, setup.room);
  await sleep(12000);
  const r = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    return {
      host: !!p2._afkHost, sun: p2.sun,
      myPlants: g.plants.filter(pl => pl.owner === p2).length,
      roomStill: p2.room ? true : false
    };
  });
  ok(`T-A 托管激活且保留房间（host=${r.host} room=${r.roomStill}）`, r.host && r.roomStill);
  ok(`T-B 托管者房内 AI 代种植物（owner=player2 共 ${r.myPlants} 株）`, r.myPlants >= 1);
  ok('T-C 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
