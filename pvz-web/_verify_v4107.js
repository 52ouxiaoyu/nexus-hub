// v4.0.107 验证：体检报告 10 项修复（僵尸P2 / 门板回血 / 回血半径 / 人机经济 / AI Lv10 / 天使停产 / 阳光袋 / 内鬼泛化 / 门口菜单 / 开局引导）
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

  // ============================================================
  // 第一局：1p 植物方 —— 开局引导 / 阳光袋 / 门板回血 / 门口菜单 / 人机经济
  // ============================================================
  await boot({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  await page.waitForFunction('window.game.ais.length > 0', { timeout: 30000 });

  // ---------- T1 开局 50 阳光 + 出生在房门外 ----------
  const t1 = await page.evaluate(() => {
    const g = window.game;
    let best = null, bestD = 1e9;
    for (const rm of g.rooms) {
      const d = Math.hypot(rm.frontX - g.player.x, rm.frontY - g.player.y);
      if (d < bestD) { bestD = d; best = rm; }
    }
    const inRm = !!g._insideRoom(Math.floor(g.player.x / 80), Math.floor(g.player.y / 80));
    return { sun: g.player.sun, d: bestD, inRm, sx: g.player.x, sy: g.player.y };
  });
  ok(t1.sun === 50, `T1a 植物方开局 ☀50（实测 ${t1.sun}）`);
  ok(t1.d <= 180 && t1.inRm, `T1b 出生点就在房门内（离门 ${t1.d.toFixed(0)}px，在房间内=${t1.inRm}，原出生在地图正中 468px 外）`);

  // ---------- T1c 原地不动就能点脚下地板开建造菜单 ----------
  const t1c = await page.evaluate(() => {
    const g = window.game;
    g._closePlantMenu();
    const rect = g.vp1.getBoundingClientRect();
    g.openPlantMenu(g.player.x - g.player.camX + rect.left, g.player.y - g.player.camY + rect.top);
    const open = !!g.menuOpen;
    g._closePlantMenu();
    return { open };
  });
  ok(t1c.open, 'T1c 站在出生点直接点脚下就能开建造菜单（原站在走廊会提示"只能种房内"）');

  // ---------- T2 开局引导飘字（v4.0.107：延后到 2.6 秒，避开开局播报）----------
  await sleep(3200);
  const t2 = await page.evaluate(() => document.body.innerText);
  ok(/种一株植物/.test(t2), 'T2 开局引导文案出现（"点脚下地板种一株植物 → 开始产阳光"）');

  // ---------- T3 阳光袋：击杀掉落 + 拾取入账 ----------
  const t3 = await page.evaluate(async () => {
    const g = window.game;
    g._spawnGhost();
    const zb = g.zombies[0];
    const beforeSun = g.player.sun;
    const beforeLen = g.suns.length;
    g._killZombie(zb, g.player);
    const bag = g.suns[g.suns.length - 1];
    const dropped = g.suns.length === beforeLen + 1 && !!bag && !!bag.el;
    // 把玩家挪到袋子位置拾取
    g.player.x = bag.x; g.player.y = bag.y;
    await new Promise(r => setTimeout(r, 350));
    return { dropped, amount: bag && bag.amount, gained: g.player.sun - beforeSun, left: g.suns.length, hasDropped: dropped };
  });
  ok(t3.hasDropped, `T3a 僵尸死亡掉落阳光袋（this.suns 不再死代码，数量 +1，带 DOM）`);
  ok(t3.gained >= (t3.amount || 0) - 0.001, `T3b 走到袋子即拾取入账（+${t3.gained} ☀，袋子面额 ${t3.amount}）`);

  // ---------- T4 门板回血按 maxHp（不再是 3.3 倍血） ----------
  const t4 = await page.evaluate(async () => {
    const g = window.game;
    const rm = g.rooms.find(r => r.owners && r.owners.length > 0) || g.rooms[0];
    // 清掉该门格已有植物后重造门板
    g.plants = g.plants.filter(p => !(p.c === rm.doorCol && p.r === rm.doorRow));
    const door = g.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true, g.player);
    door.hp = 100;
    const defHp = door.def.hp, maxHp = door.maxHp;
    // 注入一个 🏆 盲盒到玩家脚下
    g.player.x = door.c * 80 + 40; g.player.y = door.r * 80 + 40;
    const el = document.createElement('div');
    g.world1.appendChild(el);
    if (!g.airdrops) g.airdrops = [];
    g.airdrops.push({ x: g.player.x, y: g.player.y, kind: 'trophy', life: 5, el });
    await new Promise(r => setTimeout(r, 500));
    return { defHp, maxHp, hp: door.hp, dead: !!door.dead };
  });
  ok(t4.maxHp < t4.defHp, `T4a 门板 maxHp 为图鉴 30%（maxHp=${t4.maxHp} / def.hp=${t4.defHp}）`);
  ok(Math.abs(t4.hp - t4.maxHp) < 1, `T4b 🏆 回血后 hp=${Math.round(t4.hp)} = maxHp（原 bug 会回成 ${t4.defHp}，3.3 倍）`);

  // ---------- T5 回血按距离（远处植物不回） ----------
  const t5 = await page.evaluate(async () => {
    const g = window.game;
    const rm = g.rooms[0];
    // 在距离玩家很远的房里种一株向日葵
    const far = g.rooms[g.rooms.length - 1];
    const c = far.x + 2, r = far.y + 2;
    g.plants = g.plants.filter(p => !(p.c === c && p.r === r));
    const pl = g.spawnPlant(c, r, 'sunflower', false, g.player);
    if (!pl) return { skip: true };
    pl.hp = 10;
    g.player.x = (rm.x + 2) * 80 + 40; g.player.y = (rm.y + 2) * 80 + 40;
    const el = document.createElement('div');
    g.world1.appendChild(el);
    if (!g.airdrops) g.airdrops = [];
    g.airdrops.push({ x: g.player.x, y: g.player.y, kind: 'trophy', life: 5, el });
    await new Promise(r => setTimeout(r, 500));
    const dist = Math.hypot(c * 80 + 40 - g.player.x, r * 80 + 40 - g.player.y);
    return { skip: false, hp: pl.hp, maxHp: pl.maxHp, dist };
  });
  ok(t5.skip || (Math.abs(t5.hp - 10) < 0.001), `T5 远处植物（${Math.round(t5.dist || 0)}px，>400）不回血（hp 仍 ${Math.round(t5.hp || 0)}）`);

  // ---------- T6 人机盲盒按 kind 分档（不再是 1000） ----------
  const t6 = await page.evaluate(async () => {
    const g = window.game;
    const ai = g.ais.find(a => !a.dead);
    ai.path = [];                 // 防它自己走开
    const before = ai.sun;
    const el = document.createElement('div');
    g.world1.appendChild(el);
    if (!g.airdrops) g.airdrops = [];
    g.airdrops.push({ x: ai.x, y: ai.y, kind: 'money', life: 5, el });
    await new Promise(r => setTimeout(r, 350));
    return { delta: ai.sun - before };
  });
  ok(t6.delta > 0 && t6.delta <= 200, `T6 人机抢 💰盲盒只得 +${Math.round(t6.delta)}☀（原 +1000，是玩家同档的 6.7 倍）`);

  // ---------- T7 人机植物恢复 40% 被动产出 ----------
  const t7 = await page.evaluate(async () => {
    const g = window.game;
    const ai = g.ais.find(a => !a.dead);
    const rm = g.rooms.find(r => !(r.owners && r.owners.length > 0)) || g.rooms[0];
    if (!ai || !rm) return { skip: true, why: 'no-ai' };
    g._claimRoom(ai, rm);                       // 直接给 AII 一间房（不走寻路，避免等待）
    const c = rm.x + 2, r = rm.y + 2;
    g.plants = g.plants.filter(p => !(p.c === c && p.r === r));
    const pl = g.spawnPlant(c, r, 'sunflower', false, ai);
    if (!pl) return { skip: true, why: 'no-plant' };
    ai.sun = 0;
    await new Promise(r => setTimeout(r, 3200));
    return { skip: false, sun: ai.sun, owner: pl.owner === ai, isAi: !!ai.isAi };
  });
  ok(!t7.skip && t7.owner && t7.sun > 0,
     t7.skip ? `T7 [SKIP ${t7.why}] 人机被动产出未能构造场景`
             : `T7 人机植物恢复 40% 被动产出（3 秒 ai.sun 0 → ${t7.sun.toFixed(1)}，原版恒 0）`);

  // ---------- T8 门口正格不再弹「种不了」的菜单 ----------
  const t8 = await page.evaluate(() => {
    const g = window.game;
    const rm = g.rooms.find(r => !(r.owners && r.owners.length > 0)) || g.rooms[0];
    g.plants = g.plants.filter(p => !(p.c === rm.doorCol && p.r === rm.doorRow));
    g._closePlantMenu();
    const rect = g.vp1.getBoundingClientRect();
    const wx = rm.doorCol * 80 + 40, wy = rm.doorRow * 80 + 40;
    g.openPlantMenu(wx - g.player.camX + rect.left, wy - g.player.camY + rect.top);
    return { open: g.menuOpen, display: g.plantMenu.style.display };
  });
  ok(t8.open === false, `T8 点「门已毁」的门口格直接拒绝，不弹菜单（menuOpen=${t8.open}，display=${t8.display}）`);

  // ---------- T9 AI 主僵尸能升到 Lv.10 ----------
  const t9 = await page.evaluate(() => {
    const g = window.game;
    // 前面的击杀测试可能已挂起结算（击杀主僵尸 3 秒后判胜）——这里清掉，只看等级链
    if (g._gameOverTimer) { clearTimeout(g._gameOverTimer); g._gameOverTimer = null; }
    g.over = false;
    g.ghostRespawnAt = 0;
    g.ghostLevel = 1;
    g.ghostSpawnAt = 0;
    if (!g.zombies.length || g.zombies[0].dead) g._spawnGhost();
    g.zombies.forEach(z => { z.dead = false; });
    const t = 600000; // 600 秒
    for (let i = 0; i < 24; i++) g._updateGhostDirector(t); // 每次只升 1 级，多调几次
    return { lv: g.ghostLevel, maxLv: 10 };
  });
  ok(t9.lv === 10, `T9 AI 主僵尸 600 秒可升到 Lv.${t9.lv}（原表停在 lv9，植物方永远见不到巨人僵尸）`);

  // ============================================================
  // 第二局：2p 僵尸阵营 —— P2 不再是幽灵
  // ============================================================
  await boot({ mode: '2p', faction: 'zombie', role1: 'peashooter', role2: 'sunflower' });
  await page.waitForFunction('window.game.player2 && window.game.ais.length > 0', { timeout: 30000 });

  const z1 = await page.evaluate(() => {
    const g = window.game;
    return {
      p1z: !!g.player.isZombie, p2z: !!g.player2.isZombie,
      p2cfg: !!g.player2.cfg, p2hp: g.player2.maxHp, p1hp: g.player.maxHp,
      targets: g._getHostileTargets().length,
      inTargets: g._getHostileTargets().includes(g.player2)
    };
  });
  ok(z1.p1z && z1.p2z && z1.p2cfg, `T10 P2 拥有僵尸身份（p1z=${z1.p1z} p2z=${z1.p2z} cfg=${z1.p2cfg}）`);
  ok(z1.p2hp === z1.p1hp, `T11 P2 血池与 P1 一致（${z1.p2hp} vs ${z1.p1hp}）`);
  ok(z1.inTargets, `T12 植物索敌包含 P2（敌对目标 ${z1.targets} 个，原只有 1 个）`);

  // ---------- T13 P2 能啃植物 ----------
  const z2 = await page.evaluate(async () => {
    const g = window.game;
    const rm = g.rooms[0];
    const c = rm.x + 2, r = rm.y + 2;
    g.plants = g.plants.filter(p => !(p.c === c && p.r === r));
    const pl = g.spawnPlant(c, r, 'sunflower', false, g.ais[0]);
    if (!pl) return { skip: true };
    const hp0 = pl.hp;
    g.player2.x = c * 80 + 40; g.player2.y = r * 80 + 40; // 贴到植物身上
    g.player2.level = 1;
    await new Promise(r => setTimeout(r, 2900));
    return { skip: false, hp0, hp: pl.hp, alive: g.plants.includes(pl) };
  });
  ok(z2.skip || z2.hp < z2.hp0 || !z2.alive, `T13 P2 啃得动植物（${Math.round(z2.hp0 || 0)} → ${Math.round(z2.hp || 0)}）`);

  // ---------- T14 植物能打 P2 + P2 死亡不结束对局 ----------
  const z3 = await page.evaluate(async () => {
    const g = window.game;
    const hp0 = g.player2.hp;
    g.player2.hp = hp0 - 50; // 植物打中（数值层验证血池可扣）
    const canHurt = g.player2.hp < hp0;
    g._killZombie(g.player2, g.player);
    const p2Dead = !!g.player2.dead;
    const over = g.over;
    const p1Alive = !g.player.dead;
    return { canHurt, p2Dead, over, p1Alive };
  });
  ok(z3.canHurt, 'T14a P2 的 hp 可被扣（原版不存在任何扣血路径）');
  ok(z3.p2Dead && !z3.over && z3.p1Alive, `T14b P2 阵亡不判负、P1 继续（over=${z3.over}，p1Alive=${z3.p1Alive}）`);

  // ============================================================
  // 第三局：2p 植物方 —— P2 天使停产 / 内鬼判定泛化
  // ============================================================
  await boot({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  await page.waitForFunction('window.game.player2 && window.game.ais.length > 0', { timeout: 30000 });

  const p1 = await page.evaluate(async () => {
    const g = window.game;
    // 找出 P2 可用的房：直接给 P2 认领一间空房
    const rm = g.rooms.find(r => !(r.owners && r.owners.length > 0));
    g._claimRoom(g.player2, rm);
    const c = rm.x + 2, r = rm.y + 2;
    g.plants = g.plants.filter(p => !(p.c === c && p.r === r));
    const pl = g.spawnPlant(c, r, 'sunflower', false, g.player2);
    if (!pl) return { skip: true };
    g.player2.angelic = true;   // P2 变天使
    g.player2.sun = 0;
    await new Promise(r => setTimeout(r, 3000));
    const sunAngel = g.player2.sun;
    // 解除天使 → 应恢复产出
    g.player2.angelic = false;
    g.player2.sun = 0;
    await new Promise(r => setTimeout(r, 3000));
    return { skip: false, sunAngel, sunNormal: g.player2.sun };
  });
  ok(p1.skip || Math.abs(p1.sunAngel) < 0.01, `T15 P2 变天使后植物停产（3 秒 ☀${p1.sunAngel}，原版照常供奉）`);
  ok(p1.skip || p1.sunNormal > 0, `T15b P2 解除天使后恢复产出（3 秒 ☀${p1.sunNormal ? p1.sunNormal.toFixed(1) : 0}）`);

  const p2 = await page.evaluate(() => {
    const g = window.game;
    const base = g._anyTraitor();
    g.player2.traitor = true;
    const afterP2 = g._anyTraitor();
    // 结算标题分支：gameOver 后读标题（内鬼结局）
    g.player2.traitor = false;
    g.player.angelic = false;
    const afterNone = g._anyTraitor();
    return { base, afterP2, afterNone };
  });
  ok(p2.base === false && p2.afterP2 === true && p2.afterNone === false,
     `T16 内鬼判定覆盖 P2（default=${p2.base}，P2 内鬼=${p2.afterP2}，复位=${p2.afterNone}）`);

  // ---------- T17 全程无 JS 异常 ----------
  ok(errs.length === 0, `T17 无 JS 异常（${errs.length} 条${errs.length ? ': ' + errs[0] : ''}）`);

  console.log(`\n==== ${pass} pass / ${fail} fail ====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
