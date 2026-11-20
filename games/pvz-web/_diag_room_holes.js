// 诊断：把镜头拖到有"洞格"的两间房（E 中庭 / G L形），看地板铺到哪
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
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await page.evaluate(() => { const g = window.game; g.player.invincibleT = 999999; g.ghostSpawnAt = 9e9; });
  await sleep(7200);

  // 打印每间房的洞格 + 是否触及 footprint 边界
  const info = await page.evaluate(() => {
    const g = window.game;
    return g.rooms.map((rm, i) => {
      const holes = [];
      for (let r = 0; r < rm.h; r++) for (let c = 0; c < rm.w; c++) if (rm.tpl.grid[r][c] !== 1) holes.push({ r, c, edge: (r === 0 || r === rm.h - 1 || c === 0 || c === rm.w - 1) });
      return { i, x: rm.x, y: rm.y, w: rm.w, h: rm.h, door: rm.tpl.door, holes: holes.length, edgeHoles: holes.filter(h => h.edge).length };
    });
  });
  console.log(JSON.stringify(info, null, 1));

  // 镜头对准 E（中间庭院）与 G（L形）
  for (const [name, cx, cy] of [['lshape', 46, 20], ['courtyard', 18, 20]]) {
    await page.evaluate(([c, r]) => {
      const g = window.game;
      g.player.x = c * 80; g.player.y = r * 80;
      if (g.player.el1) { g.player.el1.style.left = g.player.x + 'px'; g.player.el1.style.top = g.player.y + 'px'; }
    }, [cx, cy]);
    await sleep(700);
    await page.screenshot({ path: `_v4109_${name}.png` });
    console.log('shot', name);
  }
  await browser.close();
})();
