// v4.0.39 诊断3：复现 verify 原条件（僵尸留出生点）+ 监视导演刷僵
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
    // ===== 完全复刻 verify 的 D5（不清弹、挪僵尸）后再 D6 =====
    g.zombies.length = 0;
    g._spawnMinion();
    const zb1 = g.zombies[g.zombies.length - 1];
    const initHp = zb1.hp;
    const c = Math.floor(zb1.x / 80) - 3, r = Math.floor(zb1.y / 80);
    g.spawnPlant(c, r, 'peashooter', false, g.player);
    await new Promise(res => setTimeout(res, 5000));
    const afterD5 = { hp1: Math.round(zb1.hp), dead1: !!zb1.dead, peas: g.peas.length };

    // ===== D6 复刻 =====
    g.zombies.length = 0;
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    g.spawnPlant(Math.floor(zb.x / 80), Math.floor(zb.y / 80), 'iceshroom', false, g.player);
    const log = [];
    for (let i = 0; i <= 12; i++) {
      log.push({ t: i * 500, stun: Math.round(zb.stunT * 100) / 100, badge: !!zb._iceBadge, dead: !!zb.dead,
                 n: g.zombies.length, hp: Math.round(zb.hp), filter: zb.imgEl ? (zb.imgEl.style.filter || '').slice(0, 30) : 'NO-IMGEL' });
      await new Promise(res => setTimeout(res, 500));
    }
    return { afterD5, log, ghostLevel: g.ghostLevel, spawnPos: { x: Math.round(zb.x), y: Math.round(zb.y) } };
  });
  console.log('D5后:', JSON.stringify(out.afterD5), '出生点:', JSON.stringify(out.spawnPos), 'ghostLv:', out.ghostLevel);
  for (const l of out.log) console.log(JSON.stringify(l));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
