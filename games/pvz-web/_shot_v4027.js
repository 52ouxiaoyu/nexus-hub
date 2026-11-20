// v4.0.27 截图：进入砸罐子对局后注入舞王 + 四角伴舞实拍
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-shot4027-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await sleep(2500);
  // 经典冒险 → 难度（若有弹窗则选简单），进真实对局
  await page.click('#btn-adventure');
  await sleep(800);
  await page.evaluate(() => {
    const easy = document.getElementById('adv-easy') || document.querySelector('.diff-easy');
    if (easy && easy.offsetParent !== null) easy.click();
  });
  await sleep(1500);
  // 选卡 → Let's Rock 进入对局
  await page.evaluate(() => {
    const btn = document.getElementById('btn-lets-rock');
    if (btn) { btn.disabled = false; btn.click(); }
  });
  await sleep(1500);
  await page.evaluate(() => {
    const g = window._pvzGame;
    const d = new Zombie(g, 2, 'dancing');
    d.x = 620; d.row = 2; d.summonTimer = 0.06;
    g.entities.push(d);
    for (let i = 0; i < 4; i++) {
      const zs = g.entities.filter(e => e instanceof Zombie && !e.isDead);
      for (const z of zs) { try { z.update(0.05); } catch (e) {} }
    }
    for (const z of g.entities.filter(e => e instanceof Zombie)) z.speed = 0; // 摆拍定格
  });
  await sleep(800);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4027_dancing.png' });
  await browser.close();
  console.log('SHOT_OK');
})();
