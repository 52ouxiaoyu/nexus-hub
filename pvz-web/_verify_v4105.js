// v4.0.105 验证：人机「钉床」——进屋认领后固定在自家阳光菇格，不再进屋→碰床→出门乒乓
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const errs = [];
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

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
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await page.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  await page.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
    g.player.x = 40; g.player.y = 40; g.player.el1.style.left = '40px'; g.player.el1.style.top = '40px';
    g.player2.x = 40; g.player2.y = 80; g.player2.el1.style.left = '40px'; g.player2.el1.style.top = '80px';
    window._keep = setInterval(() => { g.player._lastInputAt = performance.now(); g.player2._lastInputAt = performance.now(); }, 300);
  });

  // 等所有人机住进房间（含僵尸出笼 20s）
  await page.waitForFunction(`(() => { const g = window.game; return g.ais.every(a => a.dead || !!a.room); })()`, { timeout: 60000 });
  await sleep(1500);

  // ---------- T1 核心：回自家床上不换房（旧版：到床边 owners 含自己 → 1<1 失败 → 立刻换房跑路） ----------
  const t1 = await page.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => a.room && !a.dead);
    const rm = ai.room;
    const bed = { x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 };
    // 把人机挪到房外（模拟抢完盲盒回家），让它重新走回自家床
    ai.pinned = false; ai.pinX = undefined; ai.pinY = undefined;
    ai.x = rm.frontX; ai.y = rm.frontY + 120;
    ai.path = [{ x: rm.frontX, y: rm.frontY }, { x: bed.x, y: bed.y }];
    ai.targetRoom = rm;
    window._t1ai = ai; window._t1rm = rm; window._t1bed = bed;
    return { aiIdx: g.ais.indexOf(ai), rmIdx: g.rooms.indexOf(rm), bed };
  });
  // 走回床位需要时间（约 480px / 200px·s⁻¹ ≈ 2.5s），轮询到达最多 9s
  for (let i = 0; i < 18; i++) {
    const done = await page.evaluate(() => {
      const ai = window._t1ai, bed = window._t1bed;
      return Math.hypot(ai.x - bed.x, ai.y - bed.y) <= 3 || !!ai.path && ai.path.length > 0 ? Math.hypot(ai.x - bed.x, ai.y - bed.y) <= 3 : false;
    });
    if (done) break;
    await sleep(500);
  }
  await sleep(400);
  const t1r = await page.evaluate(() => {
    const g = window.game, ai = window._t1ai, rm = window._t1rm, bed = window._t1bed;
    return {
      roomSame: ai.room === rm, roomIdx: g.rooms.indexOf(ai.room), targetIdx: g.rooms.indexOf(ai.targetRoom),
      pinned: !!ai.pinned, dist: Math.round(Math.hypot(ai.x - bed.x, ai.y - bed.y)),
      stillOwner: (rm.owners || []).includes(ai), path: ai.path ? ai.path.length : 0
    };
  });
  ok(`T1 回自家床边不换房（room 仍是 ${t1r.roomIdx}，target=${t1r.targetIdx}，原房=${t1.rmIdx}）`, t1r.roomSame && t1r.targetIdx === t1.rmIdx);
  ok(`T1b 到床即钉床且站在床位（dist=${t1r.dist}px，pinned=${t1r.pinned}）`, t1r.pinned === true && t1r.dist <= 3);
  ok(`T1c 仍是房主（owners 包含自己）`, t1r.stillOwner === true);

  // ---------- T2 进空房：认领 + 钉床在床位 ----------
  const t2 = await page.evaluate(() => {
    const g = window.game;
    const free = g.rooms.filter(r => (r.owners || []).length === 0 && r !== g.player.room && r !== g.player2.room);
    if (!free.length) return { skip: true };
    // 先释放一个人机（模拟「还没房子的新人机」）
    const ai = g.ais.find(a => a.room && !a.dead && a !== window._t1ai);
    if (!ai) return { skip: true };
    (ai.room.owners || []).forEach(() => {});
    ai.room.owners = (ai.room.owners || []).filter(o => o !== ai);
    const rm = free[0];
    ai.pinned = false; ai.room = null; ai.room2 = null;
    ai.x = rm.frontX; ai.y = rm.frontY + 120;
    ai.targetRoom = rm;
    ai.path = [{ x: rm.frontX, y: rm.frontY }, { x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 }];
    if (rm.owners) rm.owners = rm.owners.filter(o => o !== ai);
    window._t2ai = ai; window._t2rm = rm;
    return { rmIdx: g.rooms.indexOf(rm) };
  });
  if (t2.skip) { console.log('  SKIP T2（无空闲人机或空房）'); }
  else {
    for (let i = 0; i < 18; i++) {
      const done = await page.evaluate(() => { const ai = window._t2ai; return !!ai.pinned && ai.room === window._t2rm; });
      if (done) break;
      await sleep(500);
    }
    await sleep(300);
    const t2r = await page.evaluate(() => {
      const g = window.game, ai = window._t2ai, rm = window._t2rm;
      const bed = { x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 };
      return { own: ai.room === rm, pinned: !!ai.pinned, dist: Math.round(Math.hypot(ai.x - bed.x, ai.y - bed.y)), inOwners: (rm.owners || []).includes(ai) };
    });
    ok(`T2 进空房认领成功并入住（room 对、owners 含自己）`, t2r.own && t2r.inOwners);
    ok(`T2b 入住即钉在床位（dist=${t2r.dist}px，pinned=${t2r.pinned}）`, t2r.pinned === true && t2r.dist <= 3);
  }

  // ---------- T3 钉床后不再乱走，但持续在房里发育 ----------
  const t3a = await page.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => a.room && a.pinned && !a.dead);
    const rm = ai.room;
    const cnt = () => g.plants.filter(p => p.c >= rm.x && p.c < rm.x + rm.w && p.r >= rm.y && p.r < rm.y + rm.h).length;
    const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    window._t3ai = ai; window._t3rm = rm;
    return { x: Math.round(ai.x), y: Math.round(ai.y), plants: cnt(), doorHp: door ? door.hp : 0, doorTier: door ? (door.def.name || '') : '' };
  });
  let maxDrift = 0, departed = false;
  for (let i = 0; i < 24; i++) {
    await sleep(500);
    const s = await page.evaluate(() => {
      const ai = window._t3ai;
      return { x: Math.round(ai.x), y: Math.round(ai.y), dead: !!ai.dead, inRoom: ai.room === window._t3rm };
    });
    const d = Math.hypot(s.x - t3a.x, s.y - t3a.y);
    if (d > maxDrift) maxDrift = d;
    if (!s.inRoom) departed = true;
  }
  const t3b = await page.evaluate(() => {
    const g = window.game, rm = window._t3rm, ai = window._t3ai;
    const cnt = g.plants.filter(p => p.c >= rm.x && p.c < rm.x + rm.w && p.r >= rm.y && p.r < rm.y + rm.h).length;
    const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    return { plants: cnt, doorHp: door ? door.hp : 0, doorTier: door ? (door.def.name || '') : '', sun: Math.floor(ai.sun) };
  });
  ok(`T3 钉床 12 秒零位移（最大偏移 ${maxDrift}px）`, maxDrift <= 3 && !departed);
  ok(`T3b 原地持续发育（植物 ${t3a.plants}→${t3b.plants}，门血 ${t3a.doorHp}→${t3b.doorHp} "${t3a.doorTier}"→"${t3b.doorTier}"）`,
    t3b.plants > t3a.plants || t3b.doorHp > t3a.doorHp || t3b.doorTier !== t3a.doorTier);

  // ---------- T4 门破逃亡：每 0.8s 评估一次（旧版 5%/帧 = 瞬间弃房） ----------
  const t4 = await page.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => a.room && !a.dead);
    const rm = ai.room;
    // 拆掉门板
    const idx = g.plants.findIndex(p => p.isDoor && p.c === rm.doorCol && p.r === rm.doorRow);
    if (idx >= 0) { const d = g.plants[idx]; if (d.el && d.el.parentNode) d.el.remove(); g.plants.splice(idx, 1); }
    window._t4ai = ai; window._t4rm = rm;
    window._origRandom = Math.random;
    Math.random = () => 0; // 强制命中 5% 逃跑分支
    return { doorGone: !g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80), pinned: !!ai.pinned };
  });
  await sleep(350);
  const t4a = await page.evaluate(() => ({ room: !!window._t4ai.room, pinned: !!window._t4ai.pinned }));
  await sleep(2200);
  const t4b = await page.evaluate(() => {
    Math.random = window._origRandom;
    const ai = window._t4ai;
    return { room: !!ai.room, pinned: !!ai.pinned, sameRoom: ai.room === window._t4rm };
  });
  ok(`T4 门板已拆（等待评估窗口）`, t4.doorGone === true);
  ok('T4b 0.35s 内未瞬移弃房（0.8s 评估门闸生效）', t4a.room === true && t4a.pinned === true);
  ok('T4c 超时后按概率弃房逃亡（解除钉床）', t4b.room === false && t4b.pinned === false);

  // ---------- T5 托管真人：人在房里→钉床；按键归还→解除 ----------
  await page.evaluate(() => {
    const g = window.game;
    g.player2.invincibleT = 999999;
    // 把 P2 直接放进一间空房的床上（走进空房自动认领）——避免测试等它横穿整张地图
    const free = g.rooms.filter(r => (r.owners || []).length < (r.capacity || 1));
    if (free.length) {
      const rm = free[0];
      g.player2.x = (rm.x + rm.tpl.beds[0].c) * 80 + 40;
      g.player2.y = (rm.y + rm.tpl.beds[0].r) * 80 + 40;
      g.player2.el1.style.left = g.player2.x + 'px';
      g.player2.el1.style.top = g.player2.y + 'px';
    }
    clearInterval(window._keep);
    window._keep = setInterval(() => { g.player._lastInputAt = performance.now(); }, 300); // 只保 P1 活跃
  });
  await sleep(1200); // 等「走进空房自动认领」
  await page.waitForFunction(`(() => { const p2 = window.game.player2; return !!p2._afkHost; })()`, { timeout: 20000 });
  // 托管激活后会先寻路进房，等它真正钉到自家床上（最多 12s）
  for (let i = 0; i < 24; i++) {
    const done = await page.evaluate(() => { const p2 = window.game.player2; return !!p2.pinned && !!p2.room; });
    if (done) break;
    await sleep(500);
  }
  const t5a = await page.evaluate(() => {
    const p2 = window.game.player2;
    return { host: !!p2._afkHost, pinned: !!p2.pinned, hasRoom: !!p2.room, x: Math.round(p2.x), y: Math.round(p2.y) };
  });
  ok(`T5 P2 挂机被托管后钉在自家床上（pinned=${t5a.pinned}，有房=${t5a.hasRoom}，坐标 ${t5a.x},${t5a.y}）`, t5a.host && t5a.pinned && t5a.hasRoom);
  await page.keyboard.press('ArrowUp');
  await sleep(600);
  const t5b = await page.evaluate(() => { const p2 = window.game.player2; return { host: !!p2._afkHost, pinned: !!p2.pinned }; });
  ok('T5b 一按 P2 键 → 归还控制权并解除钉床', t5b.host === false && t5b.pinned === false);

  // ---------- T6 无 JS 错误 ----------
  ok('T6 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);

  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
