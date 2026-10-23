const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', (e.stack || String(e)).slice(0, 600)));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999;
    g.player2.invincibleT = 999999;
    // T6 场景：P2 无房 + 传送到走廊 + 立即触发托管
    const p2 = g.player2;
    if (p2.room) { p2.room.owners = (p2.room.owners || []).filter(o => o !== p2); p2.room = null; }
    p2.x = 1120; p2.y = 520;
    p2._lastInputAt = performance.now() - 10500;
    // P1 保持活跃
    window._keepP1 = setInterval(() => { g.player._lastInputAt = performance.now(); }, 500);
  });
  for (let i = 0; i < 14; i++) {
    await sleep(1000);
    const r = await p.evaluate(() => {
      const g = window.game, p2 = g.player2;
      return { s: 0, hosted: !!p2._afkHost, claimed: !!p2.room, target: !!p2.targetRoom,
               path: p2.path ? p2.path.length : 0, x: Math.round(p2.x), y: Math.round(p2.y),
               dead: p2.dead === undefined ? 'undef' : p2.dead };
    });
    console.log(JSON.stringify(r));
    if (r.claimed) break;
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
