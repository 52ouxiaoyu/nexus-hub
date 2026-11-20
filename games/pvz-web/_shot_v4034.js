const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => {
    const g = window.game;
    g.player.x = g.worldWidth / 2; g.player.y = g.worldHeight / 2;
    window._camp = setInterval(() => { g.player.x = g.worldWidth / 2; g.player.y = g.worldHeight / 2; }, 200);
  });
  await new Promise(res => setTimeout(res, 20000));
  const stat = await p.evaluate(() => {
    const g = window.game;
    clearInterval(window._camp);
    return g.ais.map(a => ({ room: !!a.room, dead: a.dead, x: Math.round(a.x), y: Math.round(a.y) }));
  });
  console.log(JSON.stringify(stat));
  await p.screenshot({ path: 'pvz-web/_v4034_inroom.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
