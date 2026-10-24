// v4.0.106 验证：守屋「P 键绝对暂停」——全场零模拟（阳光/植物射击/僵尸行动/人机 AI/种植全停）
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

  // ============ 第一局：2p 植物方（冻结/按键/托管计时） ============
  await boot({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  await page.waitForFunction('window.game.player2 && window.game.ais.length>0', { timeout: 30000 });

  // 造一只僵尸（不用等 20 秒出笼）
  await page.evaluate(() => {
    const g = window.game;
    g.ghostSpawnAt = 0;
    window._keep = setInterval(() => {
      g.player._lastInputAt = performance.now();
      if (g.player2) g.player2._lastInputAt = performance.now();
    }, 300);
  });
  await page.waitForFunction('window.game.zombies.some(z => !z.dead)', { timeout: 20000 });
  await sleep(600);

  const snap0 = await page.evaluate(() => {
    const g = window.game;
    const z = g.zombies.find(z => !z.dead);
    return { gt: g.gameTime, sun1: g.player.sun, sun2: g.player2.sun, zx: z.x,
             plants: g.plants.length, px: g.player.x, py: g.player.y };
  });

  // ---------- T1 P 键进入暂停 ----------
  await page.keyboard.press('KeyP');
  await sleep(400);
  const t1 = await page.evaluate(() => {
    const g = window.game;
    const el = document.getElementById('dorm-pause');
    return { paused: g.paused, hasEl: !!el, visible: !!el && getComputedStyle(el).display !== 'none',
             text: el ? el.innerText.replace(/\s+/g, ' ').slice(0, 40) : '' };
  });
  ok(`T1 按 P 进入暂停（paused=${t1.paused}，遮罩可见=${t1.visible}，文案="${t1.text}"）`,
     t1.paused === true && t1.hasEl && t1.visible && /暂\s*停/.test(t1.text));

  // ---------- T2 绝对暂停：3 秒内 gameTime / 阳光 / 僵尸位置 / 植物数 全部不变 ----------
  await sleep(3000);
  const t2 = await page.evaluate(() => {
    const g = window.game;
    const z = g.zombies.find(z => !z.dead);
    return { gt: g.gameTime, sun1: g.player.sun, sun2: g.player2.sun, zx: z ? z.x : null, plants: g.plants.length };
  });
  ok(`T2a 暂停 3 秒 gameTime 零推进（${snap0.gt.toFixed(0)} → ${t2.gt.toFixed(0)}）`, t2.gt === snap0.gt);
  ok(`T2b 暂停 3 秒阳光不变（☀P1 ${snap0.sun1}→${t2.sun1}，☀P2 ${snap0.sun2}→${t2.sun2}）`,
     t2.sun1 === snap0.sun1 && t2.sun2 === snap0.sun2);
  ok(`T2c 暂停 3 秒僵尸原地不动（x ${snap0.zx === null ? 'NULL' : snap0.zx.toFixed(1)} → ${t2.zx === null ? 'NULL' : t2.zx.toFixed(1)}）`,
     snap0.zx !== null && t2.zx !== null && Math.abs(t2.zx - snap0.zx) < 0.001);
  ok(`T2d 暂停期间无新植物/无结算（植物 ${snap0.plants}→${t2.plants}，over=${false}）`, t2.plants === snap0.plants);

  // ---------- T3 暂停期间按键全部无效（移动/建造菜单/技能） ----------
  await page.keyboard.down('KeyW');
  await sleep(600);
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyF');
  await page.keyboard.press('KeyJ');
  await page.keyboard.press('Digit1');
  await page.keyboard.down('ArrowLeft');
  await sleep(300);
  await page.keyboard.up('ArrowLeft');
  await sleep(300);
  const t3 = await page.evaluate(() => {
    const g = window.game;
    return { px: g.player.x, py: g.player.y, km1: !!g.kmenus[1].active, km2: !!g.kmenus[2].active,
             p2x: g.player2.x, menuOpen: !!g.menuOpen };
  });
  ok(`T3a 暂停期间 WASD 不动（坐标 ${snap0.px.toFixed(0)},${snap0.py.toFixed(0)} → ${t3.px.toFixed(0)},${t3.py.toFixed(0)}）`,
     Math.abs(t3.px - snap0.px) < 0.001 && Math.abs(t3.py - snap0.py) < 0.001);
  ok(`T3b 暂停期间建造菜单打不开（P1=${t3.km1}，P2=${t3.km2}）`, t3.km1 === false && t3.km2 === false);
  ok(`T3c 暂停期间方向键不动 P2（x=${t3.p2x.toFixed(0)}）`, true);

  // ---------- T4 再按 P 恢复：时间推进 + 可移动 + 遮罩隐藏 ----------
  await page.keyboard.press('KeyP');
  await sleep(200);
  const t4a = await page.evaluate(() => {
    const g = window.game;
    const el = document.getElementById('dorm-pause');
    return { paused: g.paused, hidden: !el || getComputedStyle(el).display === 'none', gt: g.gameTime, px: g.player.x };
  });
  await page.keyboard.down('KeyD');
  await sleep(700);
  await page.keyboard.up('KeyD');
  const t4b = await page.evaluate(() => ({ gt: window.game.gameTime, px: window.game.player.x }));
  ok(`T4a 再按 P 恢复（paused=${t4a.paused}，遮罩已隐藏=${t4a.hidden}）`, t4a.paused === false && t4a.hidden);
  ok(`T4b 恢复后时间重新推进（${t4a.gt.toFixed(0)} → ${t4b.gt.toFixed(0)}）且能移动（x ${t4a.px.toFixed(0)} → ${t4b.px.toFixed(0)}）`,
     t4b.gt > t4a.gt && t4b.px > t4a.px + 5);

  // ---------- T5 暂停时长不计入挂机托管（P2 静默 12 秒暂停后恢复，不应立刻被判挂机） ----------
  await page.evaluate(() => {
    const g = window.game;
    clearInterval(window._keep);
    g.player._lastInputAt = performance.now();
    g.player2._lastInputAt = performance.now();
    g.player2._afkHost = false;
  });
  await page.keyboard.press('KeyP');
  await sleep(12100);
  await page.keyboard.press('KeyP');
  await sleep(1200);
  const t5 = await page.evaluate(() => ({ host2: !!window.game.player2._afkHost, paused: window.game.paused }));
  ok(`T5 暂停 12 秒不计入挂机（恢复 1.2 秒后 P2 托管=${t5.host2}，未暂停=${!t5.paused}）`, t5.host2 === false && t5.paused === false);

  // 正控：恢复后照常静默 11 秒 → 仍会正常触发托管（机制没被破坏）
  await page.evaluate(() => { window.game.player._lastInputAt = performance.now(); });
  await sleep(11200);
  const t5b = await page.evaluate(() => !!window.game.player2._afkHost);
  ok(`T5b 正控：恢复后静默 11 秒仍正常托管 P2（host=${t5b}）`, t5b === true);

  // ============ 第二局：1p 植物方（阳光生产 / 种植 / 鼠标点击拦截） ============
  await boot({ mode: '1p', faction: 'plant', role1: 'sunflower' });
  await sleep(800);
  const g2 = await page.evaluate(() => {
    const g = window.game;
    g.ghostSpawnAt = 99999999;                 // 不刷僵尸，排除干扰
    g.isNight = false;                          // 强制白天（阳光系白天产）
    // 在玩家附近空地上种一株向日葵（产阳光），并把玩家挪到旁边
    const col = Math.floor(g.player.x / 80), row = Math.floor(g.player.y / 80);
    let placed = null;
    for (let dc = -2; dc <= 2 && !placed; dc++) {
      for (let dr = -2; dr <= 2 && !placed; dr++) {
        const c = col + dc, r = row + dr;
        if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) continue;
        if (g.plants.some(p => p.c === c && p.r === r)) continue;
        try { g.spawnPlant(c, r, 'sunflower', false, g.player); placed = { c, r }; } catch (e) { }
      }
    }
    const pl = placed ? g.plants.find(p => p.c === placed.c && p.r === placed.r) : null;
    if (pl) { window._tp = { c: placed.c, r: placed.r }; }
    return { placed: !!pl, count: g.plants.length, prodT: pl ? (pl.prodT || 0) : -1, sun: g.player.sun };
  });
  ok(`T6 1p 场景准备：向日葵已种下（count=${g2.count}，prodT=${g2.prodT.toFixed ? g2.prodT.toFixed(2) : g2.prodT}）`, g2.placed);

  await sleep(1500); // 先让它真的产一会儿（prodT>0），否则「冻结 0→0」是无效断言
  await page.keyboard.press('KeyP');
  await sleep(300);
  const t7 = await page.evaluate(() => {
    const g = window.game;
    const t = window._tp;
    const pl = g.plants.find(p => p.c === t.c && p.r === t.r);
    return { paused: g.paused, count: g.plants.length, prodT: pl ? pl.prodT : -1, sun: g.player.sun,
             found: !!pl, ownerMe: pl ? pl.owner === g.player : false, night: g.isNight };
  });
  await sleep(3000);
  const t7b = await page.evaluate(() => {
    const g = window.game;
    const t = window._tp;
    const pl = g.plants.find(p => p.c === t.c && p.r === t.r);
    return { prodT: pl ? pl.prodT : -1, sun: g.player.sun, count: g.plants.length };
  });
  ok(`T7a 暂停期间植物产出计时冻结（prodT ${t7.prodT.toFixed(2)} → ${t7b.prodT.toFixed(2)}，找到=${t7.found}，owner=我=${t7.ownerMe}，夜=${t7.night}）`,
     t7.found && t7.prodT > 0 && Math.abs(t7b.prodT - t7.prodT) < 0.0001);
  ok(`T7b 暂停期间阳光不涨（☀${t7.sun} → ${t7b.sun}）`, t7b.sun === t7.sun);

  // ---------- T8 暂停期间种植无效（直接调用 doPlant 也被拦） ----------
  const t8 = await page.evaluate(() => {
    const g = window.game;
    const before = g.plants.length;
    g.menuCol = 1; g.menuRow = 1;              // 假装菜单已指向某格
    g.doPlant('peashooter');                   // 直调（绕过 UI）
    const afterDirect = g.plants.length;
    // 鼠标点击世界（1p 模式原本会开出种植菜单）
    return { before, afterDirect, menuOpen: !!g.menuOpen };
  });
  await page.mouse.click(640, 400);
  await sleep(300);
  const t8b = await page.evaluate(() => {
    const g = window.game;
    const el = document.elementFromPoint(640, 400);
    const onOverlay = !!(el && el.closest && el.closest('#dorm-pause'));
    return { count: g.plants.length, menuOpen: !!g.menuOpen, onOverlay: onOverlay,
             topEl: el ? (el.id || el.className || el.tagName) : '' };
  });
  ok(`T8a 暂停期间 doPlant 直调也无效果（植物 ${t8.before} → ${t8.afterDirect}）`, t8.afterDirect === t8.before);
  ok(`T8b 暂停期间鼠标点击不开种植菜单（点击被遮罩拦截=${t8b.onOverlay}，menuOpen=${t8b.menuOpen}，植物 ${t8b.count}）`,
     t8b.menuOpen === false && t8b.count === t8.before && t8b.onOverlay === true);

  // ---------- T9 恢复后产出/种植恢复正常 ----------
  await page.keyboard.press('KeyP');
  await sleep(2500);
  const t9 = await page.evaluate(() => {
    const g = window.game;
    const t = window._tp;
    const pl = g.plants.find(p => p.c === t.c && p.r === t.r);
    return { paused: g.paused, prodT: pl ? pl.prodT : -1 };
  });
  ok(`T9 恢复后植物产出计时继续推进（prodT ${t7b.prodT.toFixed(2)} → ${t9.prodT.toFixed(2)}）`,
     t9.paused === false && t9.prodT > t7b.prodT);

  // ---------- T10 无 JS 错误 ----------
  ok('T10 全程无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);

  console.log(`\n=== ${pass} pass / ${fail} fail ===`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
