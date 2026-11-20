// v4.0.113 截图：人机从场外沿合法路径进屋
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(2500);
  // 把镜头对准第一个还在赶路的人机所在区域（world1 位移），让行走画面进框
  await page.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => !a.room) || g.ais[0];
    const w = document.getElementById('dorm-world') || g.world1;
    // 镜头由主循环根据玩家位置更新，这里只把玩家瞬移过去陪跑（不改 AI 状态）
    g.player.x = Math.max(120, Math.min(g.worldWidth - 120, ai.x + 60));
    g.player.y = Math.max(120, Math.min(g.worldHeight - 120, ai.y));
    g.spawnPoint = { x: g.player.x, y: g.player.y };
  });
  await sleep(1200);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4113_walk1.png' });
  await sleep(9000);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4113_walk2.png' });
  const st = await page.evaluate(() => {
    const g = window.game;
    return g.ais.map(a => ({ x: Math.round(a.x), y: Math.round(a.y), room: !!a.room,
      inWall: g.walls.has(Math.floor(a.x / 80) + ',' + Math.floor(a.y / 80)) }));
  });
  console.log(JSON.stringify(st));
  await browser.close();
})();
