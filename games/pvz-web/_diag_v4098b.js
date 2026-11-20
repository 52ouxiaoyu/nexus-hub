/* 诊断：揭露播报实际文本 + 内鬼目标选择与门距离 */
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
  page.on('pageerror', e => console.log('[PAGE ERROR]', String(e).slice(0, 200)));
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
  });
  // 抓播报：hook _announce 记录所有播报
  await page.evaluate(() => {
    const g = window.game;
    window._annLog = [];
    const orig = g._announce.bind(g);
    g._announce = (txt, sfx, big) => { window._annLog.push(txt); return orig(txt, sfx, big); };
  });
  await new Promise(r => setTimeout(r, 4000));
  const s1 = await page.evaluate(() => {
    const g = window.game, t = g.traitor;
    // 复算目标选择
    let best = null, bd = Infinity;
    for (const p of g.allPlayers) {
      if (p.dead || p === t) continue;
      if (g.playerTraitor && p === g.player) continue;
      const d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < bd) { bd = d; best = p; }
    }
    const bcol = Math.floor(best.x / g.gridSize), brow = Math.floor(best.y / g.gridSize);
    const brm = g._insideRoom(bcol, brow) || g.rooms.find(r => best.x >= r.x * 80 && best.x < (r.x + r.w) * 80 && best.y >= r.y * 80 && best.y < (r.y + r.h) * 80);
    const door = brm ? g.getPlantAt(brm.doorCol * 80, brm.doorRow * 80) : null;
    return {
      anns: window._annLog,
      bestIsPlayer: best === g.player, bd: Math.round(bd),
      brmIsFree: brm && brm.owners.includes(g.player),
      doorAlive: !!(door && door.hp > 0), doorHp: door ? door.hp : -1,
      tPos: [Math.round(t.x), Math.round(t.y)],
      tPathLen: t.path ? t.path.length : 'null',
      doorXY: brm ? [brm.doorCol, brm.doorRow] : null
    };
  });
  console.log(JSON.stringify(s1, null, 1));
  // 再采样 15 秒看门血与内鬼到门口距离
  for (let i = 0; i < 15; i++) {
    const s = await page.evaluate(() => {
      const g = window.game, t = g.traitor;
      const free = g.rooms.find(r => r.owners.includes(g.player));
      const door = g.plants.find(q => q.isDoor && q.c === free.doorCol && q.r === free.doorRow);
      const dpx = free.doorCol * 80 + 40, dpy = free.doorRow * 80 + 40;
      return { d: Math.round(Math.hypot(t.x - dpx, t.y - dpy)), doorHp: door ? Math.round(door.hp) : -1, x: Math.round(t.x), y: Math.round(t.y) };
    });
    console.log(`${i}s dist=${s.d} doorHp=${s.doorHp} pos=${s.x},${s.y}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  await browser.close();
})();
