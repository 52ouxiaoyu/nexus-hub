// v4.0.102 截图：P1 死亡变天使在场上 + 变身播报
const path = require('path');
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);
  await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-plant').click();
    await new Promise(r => setTimeout(r, 500));
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    for (const t of ['peashooter', 'sunflower', 'wallnut']) {
      const c = cards.find(cd => cd.dataset.type === t); if (c) c.click();
    }
    document.getElementById('btn-lets-rock').click();
  });
  await sleep(1500);
  // 僵尸进房 → P1 死亡 → 按 N 变天使
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const z = new Zombie(g, 2, 'normal');
    z.x = 70; z.y = g.board.offsetY + 2 * g.board.cellHeight + g.board.cellHeight / 2 - 20;
    z.speed = 60;
    g.entities.push(z);
    window._pvzGame.showAnnouncement;
  });
  await sleep(2200);
  await page.keyboard.press('KeyN');
  await sleep(1200);
  await page.screenshot({ path: BASE + '/_v4102_angel.png' });
  const st = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { p1: g.vsFate.p1.state, hp: g.vsFate.p1.ent ? g.vsFate.p1.ent.hp : -1, badge: (document.getElementById('start-version') || {}).innerText };
  });
  console.log(JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
