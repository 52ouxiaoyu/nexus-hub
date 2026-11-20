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
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  const out = await p.evaluate(async () => {
    const g = window.game;
    const px = g.player.x, py = g.player.y;
    const res = { player: { x: Math.round(px), y: Math.round(py), isZombie: g.player.isZombie, invincibleT: g.player.invincibleT } };
    const planted = [];
    for (let i = 0; i < 4; i++) {
      const c = Math.floor(px / 80) + 2, r = Math.floor(py / 80) + i - 1;
      try { g.spawnPlant(c, r, 'peashooter'); planted.push(c + ',' + r); } catch (e) { res.err = e.message; }
    }
    res.planted = planted;
    res.plantsTotal = g.plants.length;
    g.player.hp = g.player.maxHp;
    const hold = setInterval(() => { g.player.x = px; g.player.y = py; }, 100);
    await new Promise(r => setTimeout(r, 3000));
    clearInterval(hold);
    res.after = {
      plants: g.plants.slice(-4).map(pl => ({ def: pl.def && pl.def.name, c: pl.c, r: pl.r, shootCd: pl.shootCd, hp: pl.hp })),
      peas: g.peas.length,
      hp: Math.round(g.player.hp),
      allPlayersZombie: g.allPlayers.filter(x => x.isZombie).length
    };
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
