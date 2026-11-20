// v4.0.39 诊断4：D6 窗口内 gameTime vs stunT —— 全局停还是僵尸节停
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
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  const out = await p.evaluate(async () => {
    const g = window.game;
    g.gameTime = 8000; g.dnNext = 1e12;
    // 完整复刻 D1-D4 关键状态
    g.isNight = false;
    g.plants = g.plants.filter(pl => !(pl.def && pl.def.produce) && !(pl.def && pl.def.shoot));
    // D5
    g.zombies.length = 0; g.peas.length = 0;
    g._spawnMinion();
    const zbA = g.zombies[g.zombies.length - 1];
    const c = Math.floor(g.player.x / 80) + 2, r = Math.floor(g.player.y / 80);
    g.spawnPlant(c, r, 'peashooter', false, g.player);
    zbA.x = (c + 1) * 80 + 40; zbA.y = r * 80 + 40;
    await new Promise(res => setTimeout(res, 5000));
    // D6
    g.zombies.length = 0; g.peas.length = 0;
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    zb.maxHp = 1e9; zb.hp = 1e9;
    zb.x = (c + 3) * 80 + 40; zb.y = r * 80 + 40;
    g.spawnPlant(c + 3, r, 'iceshroom', false, g.player);
    const log = [];
    let lastGt = g.gameTime;
    for (let i = 0; i <= 10; i++) {
      log.push({ t: i * 500, stun: Math.round(zb.stunT * 100) / 100, gt: Math.round(g.gameTime),
                 gtFlow: Math.round(g.gameTime - lastGt), badge: !!zb._iceBadge });
      lastGt = g.gameTime;
      await new Promise(res => setTimeout(res, 500));
    }
    return log;
  });
  for (const l of out) console.log(JSON.stringify(l));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
