const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await page.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  // AI 进房发育，玩家走到某 AI 房间门口；AI 受伤显示血条
  await page.evaluate(() => {
    const g = window.game;
    g.gameTime = 6000;
    const a = g.ais[0];
    a.x = g.player.x + 30; a.y = g.player.y;
    a.hp = 180; // 半血演示血条
    a.hpBg.style.display = 'block';
    a.hpFg.style.width = '60%';
  });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4031_hpbar.png' });
  await browser.close();
  console.log('shot saved');
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
