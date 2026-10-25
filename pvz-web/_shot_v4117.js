// v4.0.117 截图：① 观察期「技能锁定」 ② 观察期结束后「号令尸潮 0/2 未解锁」
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(2500);
  await page.screenshot({ path: '_v4117_frozen.png' });
  const a = await page.evaluate(() => ({
    fz: +window.game.zombieFreezeT.toFixed(1),
    hud: (document.getElementById('skill-hud') || {}).innerText.replace(/\s+/g, ' ')
  }));
  console.log('观察期截图：剩余', a.fz, 's ｜ HUD:', a.hud);

  await sleep(8500);
  await page.evaluate(() => window.game._refreshHud());
  await sleep(300);
  await page.screenshot({ path: '_v4117_locked.png' });
  const b = await page.evaluate(() => ({
    fz: +window.game.zombieFreezeT.toFixed(1), kills: window.game.survivorKills,
    hud: (document.getElementById('skill-hud') || {}).innerText.replace(/\s+/g, ' ')
  }));
  console.log('解锁进度截图：冻结', b.fz, '| 击杀', b.kills, '｜ HUD:', b.hud);

  // 第三张：解锁后（直接补 2 个人头，验证 HUD 变化）
  await page.evaluate(() => { window.game.survivorKills = 2; window.game._refreshHud(); });
  await sleep(300);
  await page.screenshot({ path: '_v4117_unlocked.png' });
  const c = await page.evaluate(() => (document.getElementById('skill-hud') || {}).innerText.replace(/\s+/g, ' '));
  console.log('解锁后 HUD:', c);
  await browser.close();
})();
