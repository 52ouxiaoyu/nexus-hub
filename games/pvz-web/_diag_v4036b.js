const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  const out = await p.evaluate(async () => {
    const g = window.game;
    const px = g.player.x, py = g.player.y;
    g.spawnPlant(Math.floor(px / 80) + 2, Math.floor(py / 80), 'peashooter');
    g.player.hp = g.player.maxHp;
    // 包一层探针：记录 peas 变化与玩家 hp 变化
    const log = [];
    const hold = setInterval(() => { g.player.x = px; g.player.y = py; }, 100);
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 250));
      const pea = g.peas[0];
      log.push({
        t: i * 0.25,
        n: g.peas.length,
        peaXY: pea ? [Math.round(pea.x), Math.round(pea.y)] : null,
        peaLife: pea ? +pea.life.toFixed(2) : null,
        dToPlayer: pea ? Math.round(Math.hypot(g.player.x - pea.x, g.player.y - pea.y)) : null,
        hp: Math.round(g.player.hp),
        playerXY: [Math.round(g.player.x), Math.round(g.player.y)]
      });
    }
    clearInterval(hold);
    return log;
  });
  console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
