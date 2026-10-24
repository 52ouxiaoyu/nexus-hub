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
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(3000);
  await page.screenshot({ path: '_v4107_spawn.png' });

  // 造一只僵尸 + 击杀，展示阳光袋
  await page.evaluate(() => {
    const g = window.game;
    g._spawnGhost();
    const zb = g.zombies[0];
    zb.x = g.player.x + 120; zb.y = g.player.y + 40;
    if (zb.el1) { zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px'; }
    g._killZombie(zb, g.player);
    if (g._gameOverTimer) { clearTimeout(g._gameOverTimer); g._gameOverTimer = null; }
    g.over = false; g.ghostRespawnAt = 0;
  });
  await sleep(700);
  await page.screenshot({ path: '_v4107_sunbag.png' });

  await browser.close();
})();
