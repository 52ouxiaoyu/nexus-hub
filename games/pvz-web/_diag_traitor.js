// v4.0.121 诊断：守屋「内鬼不出门」
// 目标：看清内鬼反水后到底卡在哪一环——
//   ① 它在不在自己房间里？自己房间的门还活着吗？房间有没有跳板？
//   ② 它有没有往跳板走（走没到 44px 触发圈）？跳板传送有没有真的把它送出房？
//   ③ 出房后有没有往目标门寻路？path 空不空？有没有 stuck？离目标多远？
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.allPlayers && window.game.world1', { timeout: 20000 });
  await sleep(1500);

  const pre = await page.evaluate(() => {
    const g = window.game;
    g.traitorRevealAt = g.gameTime + 400;         // 立刻触发反水，省得等 160 秒
    const t = g.traitor;
    const rm = t && t.room;
    return {
      hasTraitor: !!t,
      name: t && t.roleDef && t.roleDef.name,
      x: t && Math.round(t.x), y: t && Math.round(t.y),
      room: rm ? { x: rm.x, y: rm.y, w: rm.w, h: rm.h, doorCol: rm.doorCol, doorRow: rm.doorRow, hasPad: !!rm.jumpPad } : null,
      aiCount: g.allPlayers.filter(p => p.isAi).length
    };
  });
  console.log('揭露前：', JSON.stringify(pre));

  await page.waitForFunction('window.game.traitorRevealed === true', { timeout: 20000 });
  console.log('✅ 内鬼已反水');

  const samples = [];
  for (let i = 0; i < 44; i++) {
    await sleep(250);
    const s = await page.evaluate(() => {
      const g = window.game, t = g.traitor;
      if (!t) return null;
      const gs = g.gridSize;
      const ownRoom = g._insideRoom(Math.floor(t.x / gs), Math.floor(t.y / gs));
      const pad = t.room && t.room.jumpPad;
      const door = t.room ? g.getPlantAt(t.room.doorCol * gs, t.room.doorRow * gs) : null;
      // 最近的非内鬼目标
      let best = null, bd = Infinity;
      for (const p of g.allPlayers) {
        if (p.dead || p === t || p.traitor) continue;
        const d = Math.hypot(p.x - t.x, p.y - t.y);
        if (d < bd) { bd = d; best = p; }
      }
      return {
        x: +t.x.toFixed(0), y: +t.y.toFixed(0),
        inOwn: !!(t.room && ownRoom === t.room),
        inAnyRoom: ownRoom ? `${ownRoom.x},${ownRoom.y}` : null,
        pad: pad ? { x: pad.c * gs + 40, y: pad.r * gs + 40, d: Math.round(Math.hypot(t.x - (pad.c * gs + 40), t.y - (pad.r * gs + 40))) } : null,
        doorHp: door && door.isDoor ? door.hp : (door ? 'notDoor' : 0),
        pathLen: t.path ? t.path.length : -1,
        stuck: +(t.stuck || 0).toFixed(2),
        dTarget: best ? Math.round(bd) : null,
        targetIsAi: best ? !!best.isAi : null,
        tgtInRoom: best ? !!g._insideRoom(Math.floor(best.x / gs), Math.floor(best.y / gs)) : null
      };
    });
    if (s) samples.push(s);
  }

  // 汇总：位移量、进出房、path 空比例
  let moved = 0, inOwnFrames = 0, pathNull = 0, stuckFrames = 0, minD = 1e9, maxD = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.inOwn) inOwnFrames++;
    if (s.pathLen <= 0) pathNull++;
    if (s.stuck > 0) stuckFrames++;
    if (s.dTarget !== null) { minD = Math.min(minD, s.dTarget); maxD = Math.max(maxD, s.dTarget); }
    if (i > 0) moved += Math.abs(s.x - samples[i - 1].x) + Math.abs(s.y - samples[i - 1].y);
  }
  console.log('\n帧采样（每 0.25s 一条，共 ' + samples.length + ' 条）：');
  samples.filter((_, i) => i % 4 === 0).forEach(s => console.log('  ' + JSON.stringify(s)));
  console.log('\n汇总：');
  console.log('  总位移像素        ：', moved);
  console.log('  仍在自己房间的帧  ：', inOwnFrames + '/' + samples.length);
  console.log('  path 为空的帧     ：', pathNull + '/' + samples.length);
  console.log('  stuck 累计帧      ：', stuckFrames);
  console.log('  离目标最近/最远   ：', minD, '/', maxD);
  console.log('  页面报错          ：', errors.length ? errors.slice(0, 3) : '无');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
