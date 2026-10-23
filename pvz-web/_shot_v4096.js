const path = require('path');
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('file://' + path.join('/Users/clawbox/nexus-hub/pvz-web', 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-plant').click();
    await new Promise(r => setTimeout(r, 500));
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    for (const t of ['peashooter', 'sunflower', 'wallnut', 'repeater', 'snowpea', 'cherrybomb', 'potatomine', 'tallnut']) {
      const c = cards.find(cd => cd.dataset.type === t); if (c) c.click();
    }
    document.getElementById('btn-lets-rock').click();
    await new Promise(r => setTimeout(r, 1500));
    for (let row = 0; row < 4; row++) g.tryPlanting('sunflower', row, 0);
    for (const [row, col] of [[0,2],[0,3],[1,2],[2,2]]) g.tryPlanting('peashooter', row, col);
  });
  await new Promise(r => setTimeout(r, 11000)); // 越过保护期，AI 出兵
  await page.screenshot({ path: '_v4096_vs300.png' });
  await browser.close();
  console.log('shot done');
})();
