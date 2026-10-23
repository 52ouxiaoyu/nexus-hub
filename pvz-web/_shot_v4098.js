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
  await page.goto('file://' + path.join('/Users/clawbox/nexus-hub/pvz-web', 'haunted-dorm.html?mode=1p&faction=plant&role1=peashooter'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const g = window.game;
    const t = g.traitor;
    const free = g.rooms.find(rm => (!rm.owners || rm.owners.length === 0) && rm !== t.room);
    const bedCell = { c: free.x + 1, r: free.y + 1 };
    g.player.x = bedCell.c * 80 + 40; g.player.y = bedCell.r * 80 + 40;
    if (!free.owners.includes(g.player)) free.owners.push(g.player);
    g.player.room = free;
    g.spawnPlant(free.doorCol, free.doorRow, 'wallnut', true, g.player);
    g.zombiesPerMin = 0;
    g.ais.forEach(a => { if (a !== t) a.actTimer = 9999; });
    g.traitorRevealAt = g.gameTime + 2000;
    window._free = g.rooms.indexOf(free);
  });
  // 等内鬼贴门挠门（门血 < 80%）
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const s = await page.evaluate(() => {
      const g = window.game;
      const free = g.rooms[window._free];
      const door = g.plants.find(q => q.isDoor && q.c === free.doorCol && q.r === free.doorRow);
      return { pct: door ? door.hp / door.maxHp * 100 : 0 }; // 只返回可序列化纯数据
    });
    if (s && s.pct < 80) {
      // 镜头对准门口
      await page.evaluate(() => {
        const g = window.game;
        const free = g.rooms[window._free];
        g.camX = free.doorCol * 80 - 600; g.camY = free.doorRow * 80 - 400;
      });
      await new Promise(r => setTimeout(r, 600));
      break;
    }
    await new Promise(r => setTimeout(r, 1200));
  }
  await page.screenshot({ path: '_v4098_traitor.png' });
  await browser.close();
  console.log('shot done');
})();
