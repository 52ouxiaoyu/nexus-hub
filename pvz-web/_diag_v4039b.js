// v4.0.39 诊断2：寒冰菇冰冻时序逐帧探针
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
    g.zombies.length = 0;
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    zb.x = g.player.x + 160; zb.y = g.player.y; // 挪到玩家旁边
    const planted = g.spawnPlant(Math.floor(zb.x / 80), Math.floor(zb.y / 80), 'iceshroom', false, g.player);
    const log = [{ t: 0, stun: zb.stunT, badge: !!zb._iceBadge, dead: !!zb.dead, n: g.zombies.length, el1: !!zb.el1 }];
    for (let i = 1; i <= 12; i++) {
      await new Promise(res => setTimeout(res, 100));
      log.push({ t: i * 100, stun: Math.round(zb.stunT * 100) / 100, badge: !!zb._iceBadge, dead: !!zb.dead, n: g.zombies.length });
    }
    return { planted: planted === null ? 'null(instant)' : 'placed', log, spawnT: zb.stunT };
  });
  console.log('planted=' + out.planted, 'spawn时 stun=' + out.spawnT);
  for (const l of out.log) console.log(JSON.stringify(l));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
