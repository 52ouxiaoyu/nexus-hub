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
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4030_freeze.png' });
  // 等 AI 领祝福布防推车（把 aiBlessAt 提前），截 AI 布防后的门口
  await page.evaluate(() => { window.game.aiBlessAt = 0; });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4030_aiblest.png' });
  await browser.close();
  console.log('shots saved');
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
