// v4.0.121 验证：① 阳光/孢子产出节奏整体放慢 20%（0.4s → 0.5s 一跳）
//                ② 内鬼反水后不再「站在自己种的植物上被永久卡死、不出门」
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

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

  // ---------- T1 倍率常量 ----------
  const t1 = await page.evaluate(() => ({
    mul: HauntedDorm.PROD_TICK_MUL,
    sunEvery: HauntedDorm.DEFS.sunflower.produce.every,
    sporeEvery: HauntedDorm.DEFS.puffshroom.spore.every,
    topSun: HauntedDorm.DEFS.stonestarfruit.produce.sun
  }));
  ok(t1.mul === 1.25, `T1a 产出节奏倍率 = ${t1.mul}（0.4s 一跳 → ${(0.4 * t1.mul).toFixed(2)}s）`);
  ok(t1.sunEvery === 0.4 && t1.sporeEvery === 0.4, `T1b DEFS 原始 every 保持 0.4（阳光 ${t1.sunEvery} / 孢子 ${t1.sporeEvery}，倍率只在产出循环里乘）`);

  // ---------- 开局 ----------
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.plants && window.game.world1', { timeout: 20000 });
  await sleep(1500);

  // ---------- T2 阳光产出实测（确定性步进：直接推 600 帧 _updateProduce） ----------
  // 用固定 dt 步进而不是等墙钟——headless 下 rAF 帧率抖动会让"间隔"看着忽长忽短，
  // 步进 600×1/60 = 10 秒游戏时间，0.5s 一跳应正好 ≈20 次（改前 0.4s 是 25 次）。
  const t2 = await page.evaluate(() => {
    const g = window.game;
    const pc = Math.floor(g.player.x / g.gridSize), pr = Math.floor(g.player.y / g.gridSize);
    let spot = null;
    for (let ring = 1; ring <= 3 && !spot; ring++) {
      for (let dr = -ring; dr <= ring && !spot; dr++) for (let dc = -ring; dc <= ring && !spot; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = pc + dc, r = pr + dr;
        if (g.checkCollision(c * g.gridSize + 40, r * g.gridSize + 40, 20, false)) continue;
        if (g.plants.some(p => p.c === c && p.r === r)) continue;
        spot = { c, r };
      }
    }
    g.spawnPlant(spot.c, spot.r, 'sunflower', false, g.player);
    const pl = g.plants.find(p => p.c === spot.c && p.r === spot.r);
    // 只留这一株产阳光的（其它同主人阳光系会干扰计数）——把它们临时记到别人名下
    const others = g.plants.filter(p => p !== pl && p.def.produce && p.owner === g.player);
    for (const o of others) o.owner = null;
    let ticks = 0;
    const orig = g.addSun.bind(g);
    g.addSun = function (n, p2) { if (p2 === g.player && n === 4) ticks++; return orig(n, p2); };
    g.isNight = false; g.dnNext = g.gameTime + 600000;   // 白天（阳光系上班）
    const sun0 = g.player.sun;
    for (let i = 0; i < 600; i++) g._updateProduce(1 / 60);
    g.addSun = orig;
    for (const o of others) o.owner = g.player;
    return { spot, ticks, gameSeconds: 10, sunGain: Math.round(g.player.sun - sun0), type: pl.type };
  });
  ok(t2.ticks >= 18 && t2.ticks <= 22, `T2a 10 秒游戏时间里向日葵跳了 ${t2.ticks} 次（0.5s 一跳应 ≈20，改前 0.4s 是 25）`);
  ok(t2.sunGain >= 72 && t2.sunGain <= 88, `T2b 10 秒实收 ${t2.sunGain}☀（4☀×20=80，改前 100）`);

  // ---------- T3 孢子产出实测（夜晚 · 一株小喷菇 1🦠/跳） ----------
  const t3 = await page.evaluate(() => {
    const g = window.game;
    const pc = Math.floor(g.player.x / g.gridSize), pr = Math.floor(g.player.y / g.gridSize);
    let spot = null;
    for (let ring = 1; ring <= 3 && !spot; ring++) {
      for (let dr = -ring; dr <= ring && !spot; dr++) for (let dc = -ring; dc <= ring && !spot; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = pc + dc, r = pr + dr;
        if (g.checkCollision(c * g.gridSize + 40, r * g.gridSize + 40, 20, false)) continue;
        if (g.plants.some(p => p.c === c && p.r === r)) continue;
        spot = { c, r };
      }
    }
    g.spawnPlant(spot.c, spot.r, 'puffshroom', false, g.player);
    const pl = g.plants.find(p => p.c === spot.c && p.r === spot.r);
    const others = g.plants.filter(p => p !== pl && p.def.spore && p.owner === g.player);
    for (const o of others) o.owner = null;
    let ticks = 0;
    const orig = g.addSpore.bind(g);
    g.addSpore = function (n, p2) { if (p2 === g.player && n === 1) ticks++; return orig(n, p2); };
    g.isNight = true; g.dnNext = g.gameTime + 600000;    // 夜晚（孢子系上班）
    const sp0 = g.player.spore;
    for (let i = 0; i < 600; i++) g._updateProduce(1 / 60);
    g.addSpore = orig;
    for (const o of others) o.owner = g.player;
    return { spot, ticks, sporeGain: Math.round((g.player.spore || 0) - (sp0 || 0)), awake: g._shroomAwake(), isNight: g.isNight };
  });
  ok(t3.isNight && t3.awake, `T3a 孢子测试环境=夜晚（isNight=${t3.isNight}，蘑菇醒着=${t3.awake}）`);
  ok(t3.ticks >= 18 && t3.ticks <= 22, `T3b 10 秒游戏时间里小喷菇跳了 ${t3.ticks} 次（0.5s 一跳应 ≈20，改前 25）`);
  ok(t3.sporeGain >= 18 && t3.sporeGain <= 22, `T3c 10 秒实收 ${t3.sporeGain}🦠（1🦠×20=20，改前 25）`);

  // ---------- T4 内鬼：被植物压住也能脱困出门 ----------
  await page.evaluate(() => { window.game.traitorRevealAt = window.game.gameTime + 300; });
  await page.waitForFunction('window.game.traitorRevealed === true', { timeout: 20000 });
  await sleep(800);

  const t4 = await page.evaluate(async () => {
    const g = window.game, t = g.traitor, gs = g.gridSize;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // 人为制造「站在自己植物上」的嵌入态（诊断里抓到的真实事故现场）
    const c = Math.floor(t.x / gs), r = Math.floor(t.y / gs);
    if (!g.getPlantAt(c * gs + 40, r * gs + 40)) g.spawnPlant(c, r, 'sunshroom', false, t);
    const before = {
      x: Math.round(t.x), y: Math.round(t.y),
      embedded: g.checkCollision(t.x, t.y, 15, true),
      canMove: {
        right: !g.checkCollision(t.x + 6, t.y, 14, true),
        left: !g.checkCollision(t.x - 6, t.y, 14, true),
        down: !g.checkCollision(t.x, t.y + 6, 14, true),
        up: !g.checkCollision(t.x, t.y - 6, 14, true)
      }
    };
    // 目标距离（内鬼要去咬的人）
    let bd0 = Infinity;
    for (const p of g.allPlayers) { if (p.dead || p === t || p.traitor) continue; bd0 = Math.min(bd0, Math.hypot(p.x - t.x, p.y - t.y)); }
    await wait(2500);
    const mid = { x: Math.round(t.x), y: Math.round(t.y), embedded: g.checkCollision(t.x, t.y, 15, true),
                  movedPx: Math.round(Math.hypot(t.x - before.x, t.y - before.y)) };
    // 再等 8 秒看它有没有真的出门/逼近目标
    let moved = 0, minD = Infinity, leftOwnFrames = 0, samples = 0, pathNull = 0;
    let lastX = t.x, lastY = t.y;
    for (let i = 0; i < 32; i++) {
      await wait(250);
      moved += Math.abs(t.x - lastX) + Math.abs(t.y - lastY); lastX = t.x; lastY = t.y;
      const inOwn = t.room && g._insideRoom(Math.floor(t.x / gs), Math.floor(t.y / gs)) === t.room;
      if (!inOwn) leftOwnFrames++;
      if (!t.path) pathNull++;
      samples++;
      for (const p of g.allPlayers) { if (p.dead || p === t || p.traitor) continue; minD = Math.min(minD, Math.hypot(p.x - t.x, p.y - t.y)); }
    }
    return { before, mid, moved: Math.round(moved), bd0: Math.round(bd0), minD: Math.round(minD), leftOwnFrames, samples, pathNull, room: !!t.room };
  });
  ok(t4.before.embedded === true, `T4a 已人为复现「内鬼正好站在自己植物格上」（嵌入=${t4.before.embedded}，四向可走=${JSON.stringify(t4.before.canMove)}）`);
  ok(t4.mid.movedPx > 100 || t4.mid.embedded === false, `T4b 0.35 秒脱困生效——2.5 秒内已离开原位 ${t4.mid.movedPx}px（现在 ${t4.mid.x},${t4.mid.y}，嵌入=${t4.mid.embedded}）`);
  // v4.0.122 修订：内鬼若已贴到幸存者身边就会停下啃咬（净位移不再增长），此时看"是否真的走到了人跟前"
  ok(t4.moved > 200 || t4.minD < 60, `T4c 脱困后真的走了起来（8 秒净位移 ${t4.moved}px，离最近幸存者 ${t4.minD}px）`);
  ok(t4.leftOwnFrames > 0 || t4.minD < t4.bd0 - 100, `T4d 出门有效果：在屋外 ${t4.leftOwnFrames}/${t4.samples} 帧，离最近目标 ${t4.bd0}px → ${t4.minD}px`);

  ok(errors.length === 0, `T5 全程 0 页面报错（${errors.slice(0, 3).join(' | ') || '无'}）`);

  console.log(`\n===== v4.0.121 结果：${pass} 通过 / ${fail} 失败 =====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(2); });
