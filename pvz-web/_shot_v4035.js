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
  // 第 1 局僵尸方（污染 DOM），同页切植物方（复现场景）
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' }));
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && !window.game.isZombieFaction', { timeout: 30000 });
  await new Promise(res => setTimeout(res, 2500));
  await p.screenshot({ path: 'pvz-web/_v4035_hud.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
