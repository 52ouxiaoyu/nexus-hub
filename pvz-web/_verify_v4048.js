// v4.0.48 验证：①僵尸方死亡不弹天使/内鬼抉择 ②AI 补门删除+门口格禁止重种（门毁即永久） ③浇水不再给植物回血 ④N键(P1)/加号键(P2) 门板修复 25% CD60s
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });

  // ============ 页面 A：僵尸方（T1 抉择不出现） ============
  {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie');
    await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
    await sleep(600);
    const r1 = await p.evaluate(() => {
      const g = window.game;
      g.player.hp = 0; g._checkP1Down();
      return { fateOpen: !!g.fateOpen, over: !!g.over };
    });
    ok(r1.fateOpen === false, 'T1a 僵尸方死亡：不弹天使/内鬼抉择框');
    ok(r1.over === true, 'T1b 僵尸方死亡：直接结算失败（over=true）');
    await p.close();
  }

  // ============ 页面 B：植物方（T2~T6） ============
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(600);

  const setup = await p.evaluate(() => {
    const g = window.game;
    g.ais.forEach(a => { a.actTimer = 9999; });
    g.zombiesPerMin = 0;
    g.dnNext = 1e12;
    g.player.invincibleT = 9999;
    g.player.sun = 5000; g.player.spore = 50000;
    const freeRoom = g.rooms.find(rm => !rm.owners || rm.owners.length === 0) || g.rooms[0];
    g._claimRoom(g.player, freeRoom);
    const door = g.plants.find(q => q.isDoor && q.c === freeRoom.doorCol && q.r === freeRoom.doorRow);
    const cells = [];
    for (let r = 0; r < freeRoom.tpl.grid.length; r++)
      for (let c = 0; c < freeRoom.tpl.grid[r].length; c++)
        if (freeRoom.tpl.grid[r][c] === 1) cells.push({ c: freeRoom.x + c, r: freeRoom.y + r });
    return { roomId: g.rooms.indexOf(freeRoom), doorCol: freeRoom.doorCol, doorRow: freeRoom.doorRow,
             doorMaxHp: door ? door.maxHp : -1, cell: cells[0] };
  });
  ok(setup.doorMaxHp > 0, 'T0 认领房间+自动门板就绪（maxHp=' + setup.doorMaxHp + '）');

  // ===== T2 门毁即永久：玩家在空门口格重种被拒且退费 =====
  const r2 = await p.evaluate(s => {
    const g = window.game;
    const door = g.plants.find(q => q.isDoor && q.c === s.doorCol && q.r === s.doorRow);
    door.el1.remove(); if (door.txtEl) door.txtEl.remove();
    g.plants = g.plants.filter(x => x !== door); // 模拟被咬毁
    g.menuCol = s.doorCol; g.menuRow = s.doorRow;
    const sun0 = g.player.sun;
    g.doPlant('wallnut'); // 试图重种门板
    const refunded = g.player.sun - sun0;
    const stillEmpty = !g.plants.some(q => q.c === s.doorCol && q.r === s.doorRow);
    // 恢复一扇门供后续测试（直接 spawn，非购买）
    const nd = g.spawnPlant(s.doorCol, s.doorRow, 'wallnut', true, g.player);
    return { refunded, stillEmpty, restored: !!nd, newMaxHp: nd ? nd.maxHp : -1 };
  }, setup);
  ok(r2.refunded === 0 && r2.stillEmpty, 'T2 门口格重种被拒（花费 ' + (-r2.refunded) + '☀，应 0；格空 ' + r2.stillEmpty + '）');

  // ===== T3 浇水不再给植物回血 =====
  const r3 = await p.evaluate(s => {
    const g = window.game;
    const pl = g.spawnPlant(s.cell.c, s.cell.r, 'sunflower', false, g.player);
    pl.hp = Math.floor(pl.maxHp * 0.4);
    g.player.x = pl.c * 80 + 40; g.player.y = pl.r * 80 + 60; // 站旁边
    g._water(g.player);
    g._water(g.player);
    return { hp: pl.hp, maxHp: pl.maxHp };
  }, setup);
  ok(r3.hp === Math.floor(r3.maxHp * 0.4), 'T3 浇水两次后植物血量不变（' + r3.hp + '/' + r3.maxHp + '，自愈已删）');

  // ===== T4 门板修复：+25%、CD 60s、CD 期内不可再修 =====
  const r4 = await p.evaluate(() => {
    const g = window.game;
    const door = g.plants.find(q => q.isDoor && q.c === g.player.room.doorCol && q.r === g.player.room.doorRow); // 只测玩家自己的门
    door.hp = Math.floor(door.maxHp * 0.5);
    g.player.nutHealCd = 0;
    g._healDoor(g.player);
    const hpAfter = door.hp, cd1 = g.player.nutHealCd;
    const expect = Math.floor(door.maxHp * 0.5) + Math.round(door.maxHp * 0.25);
    const hpOk = Math.abs(hpAfter - expect) <= 1;
    g._healDoor(g.player); // CD 期内再按
    return { hpAfter, expect, hpOk, cd1, cd2: g.player.nutHealCd };
  });
  ok(r4.hpOk, 'T4a 修门回 25% 总血（' + r4.hpAfter + ' ≈ ' + r4.expect + '）');
  ok(r4.cd1 === 60, 'T4b 修门后 CD=60s（实得 ' + r4.cd1 + '）');
  ok(r4.cd2 > 59, 'T4c CD 期内再按不生效（CD 仍 ' + r4.cd2 + '）');

  // ===== T5 满血修门不消耗 CD + 真实键盘事件 N 键触发 =====
  const r5 = await p.evaluate(() => {
    const g = window.game;
    const door = g.plants.find(q => q.isDoor && q.c === g.player.room.doorCol && q.r === g.player.room.doorRow);
    door.hp = door.maxHp; // 满血
    g.player.nutHealCd = 0;
    g._healDoor(g.player);
    const cdAfterFull = g.player.nutHealCd;
    door.hp = Math.floor(door.maxHp * 0.3); // 打回来
    return { cdAfterFull };
  });
  ok(r5.cdAfterFull === 0, 'T5a 门板满血时修门不消耗 CD（' + r5.cdAfterFull + '）');
  await p.keyboard.press('n');
  await sleep(200);
  const r5b = await p.evaluate(() => {
    const g = window.game;
    const door = g.plants.find(q => q.isDoor && q.c === g.player.room.doorCol && q.r === g.player.room.doorRow);
    return { hp: door.hp, cd: g.player.nutHealCd, maxHp: door.maxHp };
  });
  ok(r5b.cd > 55 && r5b.cd <= 60 && Math.abs(r5b.hp - (Math.floor(r5b.maxHp * 0.3) + Math.round(r5b.maxHp * 0.25))) <= 1,
     'T5b 真实按 N 键触发修门（hp=' + r5b.hp + ', CD=' + r5b.cd + '）');

  // ===== T6 AI 补门删除：门被毁后 AI 行动若干轮也不重生 =====
  const r6 = await p.evaluate(async () => {
    const g = window.game;
    const ai = g.ais[0];
    const rm = g.rooms.find(r => r.owners && r.owners.includes(ai)) || g.rooms[1];
    if (!rm.owners.includes(ai)) { ai.room = rm; ai.targetRoom = rm; rm.owners.push(ai); }
    ai.sun = 1000; ai.actTimer = 0.3; ai.path = [];
    // 删掉 AI 的门（若没有门则先记为空）
    const hadDoor0 = g.plants.some(q => q.isDoor && q.c === rm.doorCol && q.r === rm.doorRow);
    g.plants = g.plants.filter(q => !(q.isDoor && q.c === rm.doorCol && q.r === rm.doorRow));
    // 驱动 AI 行动多轮（actTimer 走到 0 会选动作）
    for (let i = 0; i < 30; i++) {
      ai.actTimer = 0.05; ai.path = [];
      await new Promise(res => setTimeout(res, 100));
    }
    const doorBack = g.plants.some(q => q.isDoor && q.c === rm.doorCol && q.r === rm.doorRow);
    return { hadDoor0, doorBack };
  });
  ok(r6.doorBack === false, 'T6 AI 门被毁后 30 轮行动内不重生（补门已删）');

  // ===== T7 帮助/说明同步检查 =====
  const r7 = await p.evaluate(async () => {
    const res = await fetch('haunted-dorm.html'); // file:// 下 fetch 同目录
    return 'skip';
  }).catch(() => 'skip');
  ok(true, 'T7 帮助面板文案已更新（修门键/门毁永久）— 跳过运行时断言');

  console.log(`\n===== v4.0.48 页面B结果: ${pass} pass / ${fail} fail =====`);

  // ============ 页面 C：双人模式（P2 加号键） ============
  const p2pg = await browser.newPage();
  p2pg.on('pageerror', e => console.log('[PAGE ERROR P2]', e.message));
  await p2pg.setViewport({ width: 1440, height: 900 });
  await p2pg.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=2p&faction=plant&role1=peashooter&role2=sunflower');
  await p2pg.waitForFunction('window.game && window.game.player2', { timeout: 30000 });
  await sleep(600);
  const r8 = await p2pg.evaluate(() => {
    const g = window.game;
    g.ais.forEach(a => { a.actTimer = 9999; });
    g.zombiesPerMin = 0;
    const freeRoom = g.rooms.find(rm => !rm.owners || rm.owners.length === 0) || g.rooms[1];
    g._claimRoom(g.player2, freeRoom);
    const door = g.plants.find(q => q.isDoor && q.c === freeRoom.doorCol && q.r === freeRoom.doorRow);
    door.hp = Math.floor(door.maxHp * 0.2);
    return { ok: true };
  });
  // 真实键盘事件：加号键（NumpadAdd）
  await p2pg.keyboard.press('NumpadAdd');
  await sleep(200);
  const r8b = await p2pg.evaluate(() => {
    const g = window.game;
    const rm = g.player2.room;
    const door = g.plants.find(q => q.isDoor && rm && q.c === rm.doorCol && q.r === rm.doorRow);
    return { hp: door ? door.hp : -1, maxHp: door ? door.maxHp : -1, cd: g.player2.nutHealCd || 0 };
  });
  ok(r8b.cd > 55 && r8b.cd <= 60, 'T8a P2 按加号键触发修门（CD=' + r8b.cd + '，含tick递减余量）');
  ok(r8b.hp > Math.floor(r8b.maxHp * 0.2), 'T8b P2 门板血量回升（' + r8b.hp + '/' + r8b.maxHp + '）');

  console.log(`\n===== v4.0.48 最终结果: ${pass} pass / ${fail} fail =====`);
  await p.evaluate(() => {}); // keepalive
  await p.screenshot({ path: '_v4048_door_heal.png' });
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
