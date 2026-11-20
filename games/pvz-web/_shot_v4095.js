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
    await new Promise(r => setTimeout(r, 600));
    const vz = [...document.querySelectorAll('.vz-card')];
    for (const t of ['normal', 'conehead', 'imp', 'buckethead', 'newspaper', 'sunhead', 'football', 'gargantuar']) {
      const c = vz.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)'); if (c) c.click();
    }
    document.getElementById('vz-rock').click();
    await new Promise(r => setTimeout(r, 1200));
    // 布防：4 向日葵 + 8 豌豆
    for (let row = 0; row < 4; row++) g.tryPlanting('sunflower', row, 0);
    for (const [row, col] of [[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,2],[3,2]]) g.tryPlanting('peashooter', row, col);
  });
  await new Promise(r => setTimeout(r, 9000)); // 越过 10s 保护期让 AI 出兵
  await page.evaluate(() => { const g = window.game || window._pvzGame; for (let i = 0; i < 6 && g.playTime < 14; i++) {} });
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: '_v4095_vs.png' });
  await browser.close();
  console.log('shot done');
})();
