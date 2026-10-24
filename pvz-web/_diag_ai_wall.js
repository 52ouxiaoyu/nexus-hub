// 诊断：守屋人机（AI）行走时是否穿墙 / 是否离开自家房间跑到屋外
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
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(600);

  // 装探针：每帧记录 AI 位置轨迹
  await page.evaluate(() => {
    const g = window.game;
    window.__probe = { wallHits: [], outOfRoom: [], spawned: [], samples: 0 };
    const P = window.__probe;
    P.spawned = g.ais.map(a => {
      const c = Math.floor(a.x / g.gridSize), r = Math.floor(a.y / g.gridSize);
      return { idx: g.ais.indexOf(a), x: Math.round(a.x), y: Math.round(a.y), col: c, row: r,
               inRoom: !!g._insideRoom(c, r), inWall: g.walls.has(c + ',' + r) };
    });
    const orig = g._tick.bind(g);
    let last = new Map();
    g._tick = function (dt, time) {
      orig(dt, time);
      P.samples++;
      for (let i = 0; i < g.ais.length; i++) {
        const a = g.ais[i];
        if (a.dead) continue;
        const c = Math.floor(a.x / g.gridSize), r = Math.floor(a.y / g.gridSize);
        const key = c + ',' + r;
        if (g.walls.has(key)) {
          if (P.wallHits.length < 40) P.wallHits.push({ i, x: Math.round(a.x), y: Math.round(a.y), col: c, row: r,
            pathLen: a.path ? a.path.length : 0, speed: a.speed, pinned: !!a.pinned, fleeing: !!a.fleeing });
        }
        // 已认领房间的 AI 物理位置在房间外（且不在门口通道）时，记录「跑出屋」
        if (a.room && !a.fleeing) {
          const inRm = g._insideRoom(c, r);
          if (inRm !== a.room) {
            if (P.outOfRoom.length < 40) P.outOfRoom.push({ i, x: Math.round(a.x), y: Math.round(a.y), col: c, row: r,
              inRoom: inRm ? (inRm === a.room) : null, pathLen: a.path ? a.path.length : 0, pinned: !!a.pinned, t: Math.round(time) });
          }
        }
      }
    };
  });

  for (let k = 0; k < 40; k++) {
    await sleep(700);
    const st = await page.evaluate(() => {
      const g = window.game;
      return {
        t: Math.round(g.gameTime), samples: window.__probe.samples,
        ais: g.ais.map(a => ({ room: !!a.room, pin: !!a.pinned, path: a.path ? a.path.length : 0,
          x: Math.round(a.x), y: Math.round(a.y), dead: !!a.dead })),
        wallHits: window.__probe.wallHits.length, out: window.__probe.outOfRoom.length
      };
    });
    if (k % 4 === 0) console.log(`t=${st.t}s samples=${st.samples} 穿墙=${st.wallHits} 出屋=${st.out} ais=` +
      st.ais.map(a => `[房${a.room ? 'Y' : 'N'} 钉${a.pin ? 'Y' : 'N'} 路${a.path}]`).join(' '));
    if (st.wallHits > 5) break;
  }

  const res = await page.evaluate(() => ({ ...window.__probe, rooms: window.game.rooms.length, ais: window.game.ais.length }));
  console.log('\n=== AI 出生点 ===');
  console.log(JSON.stringify(res.spawned, null, 1));
  console.log('\n=== 穿墙采样 (最多40) 命中', res.wallHits.length, '===');
  console.log(JSON.stringify(res.wallHits.slice(0, 15), null, 1));
  console.log('\n=== 已认领房间却跑到屋外 (最多40) 命中', res.outOfRoom.length, '===');
  console.log(JSON.stringify(res.outOfRoom.slice(0, 15), null, 1));
  console.log('\nerrors:', errors.slice(0, 5));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_diag_ai_wall.png' });
  await browser.close();
})();
