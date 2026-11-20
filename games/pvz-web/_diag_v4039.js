// v4.0.39 诊断：D5-D7 失败根因（僵尸 tick 近乎冻结 / 豌豆不开火 / 毁灭菇不发射）
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
  p.on('console', m => console.log('[CONSOLE]', m.text()));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => { const g = window.game; g.gameTime = 8000; g.dnNext = 1e12; });

  const diag = await p.evaluate(async () => {
    const g = window.game;
    const log = [];
    g.zombies.length = 0;
    g._spawnMinion();
    const zb = g.zombies[0];
    // 僵尸挪到玩家旁边，豌豆种旁边
    zb.x = g.player.x + 160; zb.y = g.player.y;
    const c = Math.floor(zb.x / 80) - 2, r = Math.floor(zb.y / 80);
    const peaOk = !!g.spawnPlant(c, r, 'peashooter', false, g.player);
    const t0 = performance.now();
    let lastGameTime = g.gameTime;
    for (let s = 0; s < 6; s++) {
      await new Promise(res => setTimeout(res, 1000));
      log.push({
        s,
        realMs: Math.round(performance.now() - t0),
        gameTime: Math.round(g.gameTime),
        dtFlow: Math.round((g.gameTime - lastGameTime) * 100) / 100,
        over: g.over, state: g.state || null, paused: !!g.paused, timeScale: g.timeScale || null,
        zbHp: Math.round(zb.hp), zbDead: !!zb.dead, zbX: Math.round(zb.x), zbY: Math.round(zb.y),
        peas: g.peas.length, plants: g.plants.length,
        dist: Math.round(Math.hypot(zb.x - (c * 80 + 40), zb.y - (r * 80 + 40)))
      });
      lastGameTime = g.gameTime;
    }
    return { peaOk, log, shootCd0: g.plants.find(x => x.def.shoot)?.shootCd };
  });
  console.log('peaOk=' + diag.peaOk + ' shootCdSample=' + diag.shootCd0);
  for (const l of diag.log) console.log(JSON.stringify(l));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
