const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));
  // 抉择弹窗
  await p.evaluate(() => { const g = window.game; g.player.hp = 0; g._checkP1Down(); });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: '_v4044_fate.png' });
  // 内鬼形态（徽标+血条）
  await p.evaluate(() => {
    const g = window.game;
    document.getElementById('fate-traitor').click();
    const ai = g.ais[0], rm = g.rooms[0];
    ai.room = rm; ai.targetRoom = rm;
    if (!rm.owners.includes(ai)) rm.owners.push(ai);
    g.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true, ai);
    g.player.x = rm.doorCol * 80 + 40; g.player.y = rm.doorRow * 80 + 130;
    g.zombiesPerMin = 0;
  });
  await new Promise(r => setTimeout(r, 1200));
  await p.screenshot({ path: '_v4044_traitor.png' });
  await browser.close();
  console.log('shots done');
})();
