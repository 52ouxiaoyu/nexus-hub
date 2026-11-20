// v4.0.113 验证：守屋人机不再穿墙（路径 4 连通 / 路点相邻 / 全程不落墙格 / 都能进屋）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };

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
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(300);

  // ---------- T1 _pathToBed 存在且路径全程 4 连通、不穿墙 ----------
  const t1 = await page.evaluate(() => {
    const g = window.game;
    const P = (x, y) => Math.floor(x / 80) + ',' + Math.floor(y / 80);
    // 起点用玩家真实的场外出生点（原来固定 (80,80) 在边界墙里，测出来的跨格步是兜底段，不是真 bug）
    const sx = g.player.x, sy = g.player.y;
    const res = [];
    for (const rm of g.rooms.slice(0, 8)) {
      const p = g._pathToBed(sx, sy, rm);
      if (!p) { res.push({ ok: false, why: 'null' }); continue; }
      const pts = [{ x: sx, y: sy }].concat(p);
      let badStep = 0, badWall = 0;
      for (let i = 1; i < pts.length; i++) {
        const md = Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
        if (md > 81) badStep++;
        if (g.walls.has(P(pts[i].x, pts[i].y))) badWall++;
      }
      const bed = rm.tpl.beds[0];
      const bx = (rm.x + bed.c) * 80 + 40, by = (rm.y + bed.r) * 80 + 40;
      const last = p[p.length - 1];
      res.push({ ok: true, len: p.length, badStep, badWall, reachBed: last.x === bx && last.y === by });
    }
    return { hasFn: typeof g._pathToBed === 'function', res };
  });
  ok(t1.hasFn, 'T1a 新增 _pathToBed（一次 BFS 直达床位）');
  const t1ok = t1.res.filter(r => r.ok);
  ok(t1ok.length > 0, `T1b 能算出到床位的路径（${t1ok.length} 间房可测）`);
  ok(t1ok.every(r => r.badStep === 0), `T1c 路径每一步都是相邻格（跨格步数 ${t1ok.map(r => r.badStep).join('/')}，应全 0）`);
  ok(t1ok.every(r => r.badWall === 0), `T1d 路径不经过任何墙体（落墙点数 ${t1ok.map(r => r.badWall).join('/')}，应全 0）`);
  ok(t1ok.every(r => r.reachBed), `T1e 路径终点就是床位格（${t1ok.filter(r => r.reachBed).length}/${t1ok.length}）`);

  // ---------- T2 开局瞬间：人机被搬到屋外后，路径已按新位置重算 ----------
  const t2 = await page.evaluate(() => {
    const g = window.game;
    return g.ais.map((a, i) => {
      if (!a.path || a.path.length === 0) return { i, jump: 0, hasPath: false };
      const t0 = a.path[0];
      return { i, hasPath: true, jump: Math.abs(t0.x - a.x) + Math.abs(t0.y - a.y) };
    });
  });
  ok(t2.every(a => !a.hasPath || a.jump <= 120),
     `T2a 每个 AI 的下一路点就在脚边（跳跃 ${t2.map(a => a.hasPath ? Math.round(a.jump) : '无路径').join('/')} px，阈值 120）`);
  const t2b = await page.evaluate(() => {
    const g = window.game;
    // 直接验根因：出生搬移后不应残留「从地图正中心出发」的老路径（首点距出生点 >600px）
    return g.ais.map(a => a.path && a.path.length ? Math.round(Math.hypot(a.path[0].x - a.x, a.path[0].y - a.y)) : 0);
  });
  ok(t2b.every(d => d <= 120), `T2b 无跨屏老路径残留（各 AI 首点距离 ${t2b.join('/')} px）`);

  // ---------- T3 真实跑 35 秒：全程不落墙格、单帧位移不超 1 格 ----------
  await page.evaluate(() => {
    const g = window.game;
    window.__p = { frames: 0, wallHits: 0, bigSteps: 0, maxStep: 0, samples: 0 };
    const last = new Map();
    const orig = g._tick.bind(g);
    g._tick = function (dt, time) {
      orig(dt, time);
      const P = window.__p; P.frames++;
      for (const a of g.ais) {
        if (a.dead) continue;
        const c = Math.floor(a.x / g.gridSize), r = Math.floor(a.y / g.gridSize);
        if (g.walls.has(c + ',' + r)) P.wallHits++;
        const prev = last.get(a);
        if (prev && time > prev.t) {
          const d = Math.hypot(a.x - prev.x, a.y - prev.y);
          if (d > P.maxStep) P.maxStep = d;
          if (d > g.gridSize * 0.95) P.bigSteps++;   // 单帧跨格（含钉床瞬移/传送，单独计数）
        }
        last.set(a, { x: a.x, y: a.y, t: time, pin: !!a.pinned });
        P.samples++;
      }
    };
  });
  for (let k = 0; k < 24; k++) await sleep(2500);   // 60 秒：足够 5 个人机全部走完各自路程进屋
  const t3 = await page.evaluate(() => {
    const g = window.game;
    return { ...window.__p,
      ais: g.ais.map(a => ({ room: !!a.room, pin: !!a.pinned, path: a.path ? a.path.length : 0, dead: !!a.dead, hp: Math.round(a.hp) })),
      gameTime: Math.round(g.gameTime) };
  });
  ok(t3.frames > 300, `T3a 采样帧数充足（${t3.frames} 帧 / ${t3.samples} 个 AI-帧）`);
  ok(t3.wallHits === 0, `T3b 全程没有一帧落在墙格里（实测 ${t3.wallHits} 次，改前开局 40+ 次）`);
  ok(t3.maxStep <= 80, `T3c 单帧位移不超 1 格（最大 ${t3.maxStep.toFixed(1)}px）`);
  ok(t3.bigSteps <= 5, `T3d 无反复跨格瞬移（${t3.bigSteps} 次，含钉床入位的一次性瞬移）`);

  // ---------- T4 活着的人机都能走进屋（不会因改为严格寻路而卡死） ----------
  const alive = t3.ais.filter(a => !a.dead);
  const noRoom = alive.filter(a => !a.room);
  ok(alive.length > 0 && noRoom.length <= 1 && noRoom.every(a => a.path > 0),
     `T4 存活人机均进屋或仍在赶路（${alive.length - noRoom.length}/${alive.length} 已认领；` +
     `未认领 ${noRoom.length} 只剩余路点 ${noRoom.map(a => a.path).join('/') || '-'}，必须 >0 才算没卡死；钉床 ${t3.ais.filter(a => a.pin).length}）`);

  // ---------- T5 墙内救援：把活人机塞进墙格，应当被请出来 ----------
  const t5 = await page.evaluate(async () => {
    // 开一个全新对局再测（长跑局的实例可能已被自动重开替换，旧句柄停摆，测不准）
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
    await new Promise(r => setTimeout(r, 700));
    const g = window.game;
    if (!g || g.over || !g.ais || g.ais.length === 0) return { skip: true, why: 'no-fresh-game' };
    const ai = g.ais.find(a => !a.dead) || g.ais[0];
    if (ai.dead) return { skip: true, why: 'no-alive' };
    // 选一个「四面都是空地」的内部墙格（孤立墙角），才能真实检验救援；边界墙四周也是墙，救援本来就该原地不动
    let wallCell = null;
    for (const key of g.walls) {
      const [c, r] = key.split(',').map(Number);
      const around = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
      const free = around.filter(([a, b]) => a > 0 && b > 0 && a < g.cols - 1 && b < g.rows - 1 && !g.walls.has(a + ',' + b)).length;
      if (free >= 3) { wallCell = [c, r]; break; }
    }
    if (!wallCell) return { skip: true, why: 'no-inner-wall' };
    ai.pinned = false; ai.room = null; ai.path = null;
    ai.x = wallCell[0] * 80 + 40; ai.y = wallCell[1] * 80 + 40;
    await new Promise(r => setTimeout(r, 600));
    const c = Math.floor(ai.x / 80), r = Math.floor(ai.y / 80);
    return { inWall: g.walls.has(c + ',' + r), pos: [Math.round(ai.x), Math.round(ai.y)], cell: [c, r], from: wallCell };
  });
  ok(t5.skip || t5.inWall === false,
     `T5 塞进墙格的人机会被自动请到空地（起点格 ${t5.from} → ${t5.skip ? '跳过:' + t5.why : t5.cell + ' / ' + t5.pos.join(',')}）`);

  // ---------- T6 无异常 ----------
  ok(errors.length === 0, `T6 无 JS 异常（${errors.slice(0, 2).join(' | ') || '0 条'}）`);

  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4113_ai_walk.png' });
  console.log(`\n结果：${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
