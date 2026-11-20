const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await page.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.mowerItems && window.game.mowerItems.length>0', { timeout: 30000 });
  // 玩家传送到道具旁并拾取，镜头跟随
  await page.evaluate(() => {
    const g = window.game, it = g.mowerItems[0];
    g.player.x = it.x - 30; g.player.y = it.y;
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4029_item.png' });
  // 认领最近房间并放置推车到门口
  await page.evaluate(() => {
    const g = window.game, p = g.player;
    const rm = g.rooms[0];
    p.room = rm; rm.owners.push(p);
    p.x = rm.doorCol * 80 + 40; p.y = rm.doorRow * 80 + 40;
    p.mowerCarry = 1; g._updateMowerBadge(p);
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4029_placed.png' });
  await browser.close();
  console.log('shots saved');
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
