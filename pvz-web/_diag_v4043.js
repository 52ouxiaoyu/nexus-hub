// 诊断：内鬼揭露后逐秒采样位置/目标/路径
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
  await new Promise(r => setTimeout(r, 1000));
  await p.evaluate(() => {
    const g = window.game;
    g.traitor = g.ais[0];
    g.traitorRevealAt = 0;
    g.traitorRevealed = false;
    window._samples = [];
  });
  const s = await p.evaluate(async () => {
    const g = window.game, t = g.traitor;
    const nearest = () => {
      let best = null, bd = Infinity;
      for (const pl of g.allPlayers) {
        if (pl.dead || pl === t) continue;
        const d = Math.hypot(pl.x - t.x, pl.y - t.y);
        if (d < bd) { bd = d; best = pl; }
      }
      return best;
    };
    for (let i = 0; i < 15; i++) {
      await new Promise(res => setTimeout(res, 1000));
      if (t.dead) { window._samples.push({ i, DEAD: true }); break; }
      const b = nearest();
      const bRm = b ? (g._insideRoom(Math.floor(b.x / 80), Math.floor(b.y / 80))
        || g.rooms.find(r => b.x >= r.x * 80 && b.x < (r.x + r.w) * 80 && b.y >= r.y * 80 && b.y < (r.y + r.h) * 80)) : null;
      const tRm = g._insideRoom(Math.floor(t.x / 80), Math.floor(t.y / 80));
      window._samples.push({
        i, x: Math.round(t.x), y: Math.round(t.y), inRoom: !!tRm,
        pathLen: t.path ? t.path.length : null,
        tgt: b ? (b === g.player ? 'P1' : 'AI') : 'none',
        tgtX: b ? Math.round(b.x) : null, tgtY: b ? Math.round(b.y) : null,
        tgtRoomDoor: bRm ? [bRm.doorCol, bRm.doorRow] : null,
        distTgt: b ? Math.round(Math.hypot(b.x - t.x, b.y - t.y)) : null
      });
    }
    return window._samples;
  });
  s.forEach(x => console.log(JSON.stringify(x)));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
