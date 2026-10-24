// 诊断 v2：逐 0.4s 采样每个人机的位置/房间/路径，检测「进房→立刻出房」「瞬移（跳板）」
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', (e.stack || String(e)).slice(0, 400)));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
    g.player.x = 40; g.player.y = 40; g.player.el1.style.left = '40px'; g.player.el1.style.top = '40px';
    g.player2.x = 40; g.player2.y = 80; g.player2.el1.style.left = '40px'; g.player2.el1.style.top = '80px';
    window._keep = setInterval(() => { g.player._lastInputAt = performance.now(); g.player2._lastInputAt = performance.now(); }, 300);
    // 记录每次进/出自己的房（物理）
    window._log = [];
    window._track = g.ais.map(() => ({ inRoom: false, lastX: 0, lastY: 0, tele: 0 }));
    window._origJump = g._updateJumpPads.bind(g);
    g._updateJumpPads = function (dt) {
      const before = g.ais.map(a => ({ x: a.x, y: a.y }));
      const r = window._origJump(dt);
      g.ais.forEach((a, k) => {
        if (Math.hypot(a.x - before[k].x, a.y - before[k].y) > 60) {
          window._log.push({ t: +(performance.now() / 1000).toFixed(1), ai: k, ev: 'JUMP_PAD_TELEPORT', from: [Math.round(before[k].x), Math.round(before[k].y)], to: [Math.round(a.x), Math.round(a.y)] });
        }
      });
      return r;
    };
  });
  for (let i = 0; i < 100; i++) {
    await sleep(400);
    await p.evaluate((tick) => {
      const g = window.game;
      g.ais.forEach((a, k) => {
        const tr = window._track[k];
        const rm = a.room;
        let insideOwn = false, insideAny = null;
        if (rm) {
          const c = Math.floor(a.x / 80), r = Math.floor(a.y / 80);
          insideOwn = c >= rm.x && c < rm.x + rm.w && r >= rm.y && r < rm.y + rm.h;
        }
        const inAny = g._insideRoom(Math.floor(a.x / 80), Math.floor(a.y / 80));
        if (rm && tr.inRoom !== insideOwn) {
          window._log.push({ t: tick, ai: k, ev: insideOwn ? 'ENTER_OWN_ROOM' : 'LEAVE_OWN_ROOM', x: Math.round(a.x), y: Math.round(a.y), path: a.path ? a.path.length : 0, speed: a.speed, fleeing: !!a.fleeing });
          tr.inRoom = insideOwn;
        }
      });
    }, +(i * 0.4).toFixed(1));
  }
  const log = await p.evaluate(() => window._log);
  console.log('===== 事件日志 =====');
  for (const e of log) console.log(JSON.stringify(e));
  const st = await p.evaluate(() => ({
    ais: window.game.ais.map(a => ({ dead: !!a.dead, room: a.room ? window.game.rooms.indexOf(a.room) : -1, t: a.targetRoom ? window.game.rooms.indexOf(a.targetRoom) : -1, x: Math.round(a.x), y: Math.round(a.y), inside: a.room ? (Math.floor(a.x / 80) >= a.room.x && Math.floor(a.x / 80) < a.room.x + a.room.w && Math.floor(a.y / 80) >= a.room.y && Math.floor(a.y / 80) < a.room.y + a.room.h) : null, path: a.path ? a.path.length : 0 })),
    players: [{ x: Math.round(window.game.player.x), y: Math.round(window.game.player.y), r: window.game.player.room ? window.game.rooms.indexOf(window.game.player.room) : -1 }, { x: Math.round(window.game.player2.x), y: Math.round(window.game.player2.y), r: window.game.player2.room ? window.game.rooms.indexOf(window.game.player2.room) : -1 }]
  }));
  console.log('\n===== 终态 =====');
  console.log(JSON.stringify(st, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
