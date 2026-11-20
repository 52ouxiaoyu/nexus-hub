// v4.0.108 验证：出生点必须落在「场外」（房间外空地），且能走回房门
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push((e.stack || String(e)).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.setViewport({ width: 1280, height: 800 });

  const boot = async (opts) => {
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
    await page.evaluate((o) => {
      localStorage.clear();
      document.getElementById('start-menu').style.display = 'block';
      document.getElementById('dorm-screen').style.display = 'block';
      window.startHauntedDorm(o);
    }, opts);
    await page.waitForFunction('window.game && window.game.player && window.game.player.el1', { timeout: 30000 });
    await page.evaluate(() => {
      const g = window.game;
      g.player.invincibleT = 999999;
      if (g.player2) g.player2.invincibleT = 999999;
    });
  };

  // 探测某玩家的落点属性
  const probe = () => page.evaluate(() => {
    const g = window.game;
    const info = (p) => {
      if (!p) return null;
      const c = Math.floor(p.x / 80), r = Math.floor(p.y / 80);
      const rm = g._insideRoom(c, r);
      let bestD = 1e9, bestRm = null;
      for (const q of g.rooms) {
        const d = Math.hypot(q.frontX - p.x, q.frontY - p.y);
        if (d < bestD) { bestD = d; bestRm = q; }
      }
      const path = g._findPath(p.x, p.y, bestRm.frontX, bestRm.frontY);
      return {
        x: p.x, y: p.y, c, r,
        inRoom: !!rm,
        inRoomOf: rm ? g.rooms.indexOf(rm) : -1,
        doorD: bestD,
        collides: g.checkCollision(p.x, p.y, 14),
        onWall: g.walls.has(c + ',' + r),
        reachDoor: path ? path.length : -1,
        roomIdx: bestRm ? g.rooms.indexOf(bestRm) : -1,
        homeRoom: p._homeRoom ? g.rooms.indexOf(p._homeRoom) : -1
      };
    };
    return { p1: info(g.player), p2: info(g.player2), tip: document.getElementById('dorm-start-tip') ? document.getElementById('dorm-start-tip').innerText : '' };
  });

  // ============================================================
  // 第一局：1p 植物方
  // ============================================================
  await boot({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  await page.waitForFunction('window.game.ais.length > 0', { timeout: 30000 });
  const a = await probe();

  ok(a.p1.inRoom === false, `T1 出生点在「场外」——所在格不属于任何房间（格 (${a.p1.c},${a.p1.r})，inRoom=${a.p1.inRoom}）`);
  ok(a.p1.onWall === false && a.p1.collides === false, `T2 出生点不在墙里/不碰撞（wall=${a.p1.onWall}, collides=${a.p1.collides}）`);
  ok(a.p1.doorD >= 160 && a.p1.doorD <= 360, `T3 出生点距最近房门 ${a.p1.doorD.toFixed(0)}px（目标门外第 3 格≈240px，上一版为门内 80px）`);
  ok(a.p1.reachDoor > 0 && a.p1.reachDoor <= 12, `T4 从出生点能走到房门（路点 ${a.p1.reachDoor} 个，不是孤岛/被墙夹死）`);
  ok(a.p1.homeRoom === a.p1.roomIdx, `T5 引导用的 _homeRoom 与最近房门同属一间（${a.p1.homeRoom} vs ${a.p1.roomIdx}）`);

  // ---------- T6 走进房间立刻能种 ----------
  const t6 = await page.evaluate(() => {
    const g = window.game;
    const rm = g.player._homeRoom;
    // 走到门内第一格（门朝哪边，房内一格就在相反方向）
    const dr = rm.tpl.door;
    let ox = 0, oy = 0;
    if (dr.r === -1) oy = 1; else if (dr.r >= rm.h) oy = -1;
    else if (dr.c === -1) ox = 1; else if (dr.c >= rm.w) ox = -1;
    const tc = rm.doorCol + ox, tr = rm.doorRow + oy;
    g.player.x = tc * 80 + 40; g.player.y = tr * 80 + 40;
    const inside = !!g._insideRoom(tc, tr);
    const rect = g.vp1.getBoundingClientRect();
    g._closePlantMenu();
    g.openPlantMenu(g.player.x - g.player.camX + rect.left, g.player.y - g.player.camY + rect.top);
    const open = !!g.menuOpen;
    g._closePlantMenu();
    return { inside, open };
  });
  ok(t6.inside && t6.open, `T6 走进门内第一格就能开建造菜单（在房内=${t6.inside}，菜单=${t6.open}）`);

  // ---------- T7 场外原地不动不能种（菜单拒绝，符合"先走进屋"的设计）----------
  const t7 = await page.evaluate(() => {
    const g = window.game;
    g.player.x = g.player._homeDoor.x;  // 门前格（场外）
    g.player.y = g.player._homeDoor.y;
    g._closePlantMenu();
    const rect = g.vp1.getBoundingClientRect();
    g.openPlantMenu(g.player.x - g.player.camX + rect.left, g.player.y - g.player.camY + rect.top);
    const open = !!g.menuOpen;
    g._closePlantMenu();
    return { open };
  });
  ok(t7.open === false, 'T7 站在场外（门前格）点地板不会弹建造菜单（提示先走进房间）');

  // ---------- T8 开局引导文案 ----------
  await sleep(3400);
  const b = await probe();
  ok(/走进/.test(b.tip) && /空房|房间/.test(b.tip), `T8 开局提示指向"走进房间"（实测："${b.tip}"）`);

  // ---------- T17 开局 45 秒内 AI 不得抢玩家落点那间房 ----------
  // 必须用「全新一局且玩家还没挪进屋」的场景：前面的 T6/T7 把玩家挪进房会触发自动认领，预约随之解除
  await boot({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  const t17 = await page.evaluate(() => {
    const g = window.game;
    const rm = g.player._homeRoom;
    const ai = g.ais[0];
    g.gameTime = 1000;
    const reserved = g._roomReservedForHuman(rm, ai);
    const r1 = g._claimRoom(ai, rm);
    const ownersAfter = (rm.owners || []).length;
    g.gameTime = 50000;                       // 越过预约期
    const expired = g._roomReservedForHuman(rm, ai);
    g.gameTime = 1000;
    if (ai.room === rm) ai.room = null;
    rm.owners = (rm.owners || []).filter(o => o !== ai);
    return { reserved, r1, ownersAfter, expired };
  });
  ok(t17.reserved === true && t17.r1 === false && t17.ownersAfter === 0 && t17.expired === false,
     `T17 开局预约期 AI 抢不到玩家落点的房（预约=${t17.reserved}，认领返回=${t17.r1}，owners=${t17.ownersAfter}，45s 后解除=${t17.expired === false}）`);

  // ---------- T18 玩家自己走进屋能正常认领（预约不影响真人）----------
  const t18 = await page.evaluate(() => {
    const g = window.game;
    const rm = g.player._homeRoom;
    g.player.room = null; g.player.room2 = null;
    const saved = (rm.owners || []).filter(o => o !== g.player);
    rm.owners = saved;
    const r = g._claimRoom(g.player, rm);
    return { r, mine: !!g.player.room || !!g.player.room2, owners: (rm.owners || []).length };
  });
  ok(t18.r === true && t18.mine === true, `T18 玩家进屋认领不受预约影响（认领=${t18.r}，已绑定=${t18.mine}）`);

  // ============================================================
  // 第二局：2p 植物方 —— 两人各占一处场外空地、互不重叠
  // ============================================================
  await boot({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  await page.waitForFunction('window.game.ais.length > 0', { timeout: 30000 });
  const c2 = await probe();
  ok(c2.p1.inRoom === false && c2.p2.inRoom === false,
     `T9 2p 两人都出生在场外（P1 inRoom=${c2.p1.inRoom}，P2 inRoom=${c2.p2.inRoom}）`);
  ok(c2.p1.homeRoom !== c2.p2.homeRoom, `T10 两人分配到两间不同的房（P1 房${c2.p1.homeRoom} / P2 房${c2.p2.homeRoom}）`);
  ok(Math.hypot(c2.p1.x - c2.p2.x, c2.p1.y - c2.p2.y) > 120, `T11 两人不重叠（间距 ${Math.hypot(c2.p1.x - c2.p2.x, c2.p1.y - c2.p2.y).toFixed(0)}px）`);
  ok(c2.p2.doorD >= 160 && c2.p2.doorD <= 360, `T12 P2 同样在门外第 3 格（距门 ${c2.p2.doorD.toFixed(0)}px）`);

  // ============================================================
  // 第三局：僵尸阵营 —— 出生点保持地图中心（不受本改动影响）
  // ============================================================
  await boot({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  const z = await page.evaluate(() => {
    const g = window.game;
    return { x: g.player.x, y: g.player.y, cx: g.worldWidth / 2, cy: g.worldHeight / 2, isZ: !!g.player.isZombie };
  });
  ok(z.isZ && Math.hypot(z.x - z.cx, z.y - z.cy) < 400, `T13 僵尸阵营出生点仍在场中（(${z.x.toFixed(0)},${z.y.toFixed(0)})，中心 ${z.cx},${z.cy}）`);

  // ============================================================
  // 第四局~第六局：随机重开 3 次，确认任何一次都不落进房内（用户"有机会在家里"）
  // ============================================================
  let allOutside = true, minD = 1e9, maxD = 0, detail = [];
  for (let i = 0; i < 3; i++) {
    await boot({ mode: '1p', faction: 'plant', role1: 'peashooter' });
    await page.waitForFunction('window.game.ais.length > 0', { timeout: 30000 });
    const s = await probe();
    if (s.p1.inRoom) allOutside = false;
    minD = Math.min(minD, s.p1.doorD); maxD = Math.max(maxD, s.p1.doorD);
    detail.push(`(${s.p1.c},${s.p1.r})${s.p1.inRoom ? '屋内!' : '屋外'}/${s.p1.doorD.toFixed(0)}px`);
  }
  ok(allOutside, `T14 重开 3 次出生点始终在屋外：${detail.join('  ')}`);
  ok(minD >= 140 && maxD <= 380, `T15 三次的门口距离都落在门外区段（${minD.toFixed(0)}~${maxD.toFixed(0)}px）`);

  ok(errs.length === 0, `T16 全程 0 条 JS 异常${errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''}`);

  console.log(`\n结果：${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
