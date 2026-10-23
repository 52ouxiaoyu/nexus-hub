/* v4.0.98 诊断：内鬼揭露后是否移动——逐秒采样位置/path/分支状态 */
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
  // 快进：揭露时刻设为 2 秒后，玩家站房间不挡道
  await page.evaluate(() => {
    const g = window.game;
    g.traitorRevealAt = g.gameTime + 2000;
    g.zombiesPerMin = 0;           // 关普通僵尸干扰
    g.ais.forEach(a => { a.actTimer = 9999; }); // 冻结其他 AI 行动（避免干扰采样）
    g.player.x = (g.spawnPoint || { x: g.worldWidth / 2 }).x;
    g.player.y = (g.spawnPoint || { y: g.worldHeight / 2 }).y;
  });
  // 采样 20 秒
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const s = await page.evaluate(() => {
      const g = window.game;
      const t = g.traitor;
      if (!t) return { noTraitor: true };
      const bcol = Math.floor(t.x / g.gridSize), brow = Math.floor(t.y / g.gridSize);
      const inRm = g._insideRoom(bcol, brow);
      const rm = t.room;
      const door = rm ? g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80) : null;
      return {
        rev: g.traitorRevealed, x: Math.round(t.x), y: Math.round(t.y),
        pathLen: t.path ? t.path.length : 'null', fleeing: !!t.fleeing,
        room: !!t.room, doorAlive: !!(door && door.isDoor && door.hp > 0),
        hasPad: !!(rm && rm.jumpPad), padCd: rm && rm.jumpPad ? Math.max(0, rm.jumpPad.cd).toFixed(1) : '-',
        jumpFly: !!t._jumpFly, stuck: (t.stuck || 0).toFixed(2),
        hp: t.hp, inRoomNow: !!inRm, gt: Math.round(g.gameTime / 1000)
      };
    });
    samples.push(s);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('sec | rev x,y pathLen flee room doorAlive pad padCd fly stuck hp inRoom');
  samples.forEach((s, i) => {
    if (s.noTraitor) { console.log(i, 'noTraitor'); return; }
    console.log(`${i}s rev=${s.rev} x=${s.x},y=${s.y} path=${s.pathLen} flee=${s.fleeing} room=${s.room} door=${s.doorAlive} pad=${s.hasPad}/${s.padCd} fly=${s.jumpFly} stuck=${s.stuck} hp=${s.hp} in=${s.inRoomNow}`);
  });
  await browser.close();
})();
