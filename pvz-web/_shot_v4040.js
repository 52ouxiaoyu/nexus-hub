// v4.0.40 截图：Lv 徽标 + +1 ☀ 飘字
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  // 进房认领，等一段飘字出现的时机再截
  await p.evaluate(() => {
    const g = window.game;
    g.player.x = 6 * 80 + 160; g.player.y = 10 * 80 + 120;
  });
  // 等 ~5.6s（第 14 跳附近有飘字）
  await new Promise(r => setTimeout(r, 5600));
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4040_badge.png' });
  await browser.close();
  console.log('SHOT OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
