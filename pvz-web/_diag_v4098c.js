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
    window._free = g.rooms.indexOf(free);
  });
  await new Promise(r => setTimeout(r, 5000));
  for (let i = 0; i < 18; i++) {
    const s = await page.evaluate(() => {
      const g = window.game, t = g.traitor;
      const free = g.rooms[window._free];
      const dpx = free.doorCol * 80 + 40, dpy = free.doorRow * 80 + 40;
      const door = g.plants.find(q => q.isDoor && q.c === free.doorCol && q.r === free.doorRow);
      const here = g._insideRoom(Math.floor(t.x / 80), Math.floor(t.y / 80));
      // 复算目标（真人优先）
      let human = null;
      for (const p of g.allPlayers) { if (p.dead || p === t) continue; if (g.playerTraitor && p === g.player) continue; if (!p.isAi) { human = p; break; } }
      return {
        d2door: Math.round(Math.hypot(t.x - dpx, t.y - dpy)),
        doorHp: door ? Math.round(door.hp) : -1, doorExists: !!door,
        pathLen: t.path ? t.path.length : 'null', fleeing: !!t.fleeing,
        stuck: (t.stuck || 0).toFixed(1), hereIsFree: here === free,
        humanIsPlayer: human === g.player, playerPos: [Math.round(g.player.x), Math.round(g.player.y)],
        tPos: [Math.round(t.x), Math.round(t.y)], playerDead: g.player.dead
      };
    });
    console.log(`${i}s d2door=${s.d2door} door=${s.doorExists}/${s.doorHp} path=${s.pathLen} flee=${s.fleeing} stuck=${s.stuck} hereFree=${s.hereIsFree} tgtPlayer=${s.humanIsPlayer} pPos=${s.playerPos} tPos=${s.tPos} pDead=${s.playerDead}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  await browser.close();
})();
