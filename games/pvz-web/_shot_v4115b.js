// 截图 B：把镜头挪到"尸潮正在啃门/啃坚果"的那间房门口——玩家本体就站在旁边，僵尸们视而不见
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
  await sleep(9000);
  await page.evaluate(() => { const g = window.game; g.waveOrderCd = 0; g._orderHorde(); g.waveOrderCd = 0; g._orderHorde(); });
  await sleep(13000);

  // 找一只"正在啃东西"的僵尸，把玩家挪到它旁边 110px 处看戏
  const put = await page.evaluate(() => {
    const g = window.game;
    const zs = g.zombies.filter(z => !z.dead);
    const biting = zs.filter(z => (z.biteT || 0) > 0.05);
    const pick = (biting.length ? biting : zs).sort((a, b) =>
      Math.hypot(a.x - g.player.x, a.y - g.player.y) - Math.hypot(b.x - g.player.x, b.y - g.player.y))[0];
    if (!pick) return { skip: true };
    g.player.x = pick.x + 105; g.player.y = pick.y + 55;
    return { anchor: { x: Math.round(pick.x), y: Math.round(pick.y) }, biting: biting.length, hp: Math.round(g.player.hp), zombies: zs.length };
  });
  console.log('镜头锚点', JSON.stringify(put));
  await sleep(2500);

  const after = await page.evaluate(() => {
    const g = window.game;
    const zs = g.zombies.filter(z => !z.dead);
    return {
      hp: Math.round(g.player.hp),
      zombies: zs.length,
      lockPlayer: zs.filter(z => z.lockedTarget === g.player).length,
      biting: zs.filter(z => (z.biteT || 0) > 0.05).length,
      nearPlayer: zs.filter(z => Math.hypot(z.x - g.player.x, z.y - g.player.y) < 140).length
    };
  });
  console.log('玩家站到僵尸旁边 2.5 秒后', JSON.stringify(after));
  await page.screenshot({ path: '_v4115_watch.png' });
  await browser.close();
})();
