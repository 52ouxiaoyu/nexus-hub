// v4.0.39 截图：开局夜幕 + 向日葵自动产阳光
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
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await new Promise(res => setTimeout(res, 6000)); // 等产出飘字积累
  const info = await p.evaluate(() => ({
    isNight: window.game.isNight, sun: Math.round(window.game.player.sun),
    tint: document.getElementById('dn-tint') && document.getElementById('dn-tint').style.background
  }));
  console.log(JSON.stringify(info));
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4039_night.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
