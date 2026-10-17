// v4.0.55 双人 HUD 防重叠专项验证：
// ①双人同侧住房 → P1 左上、P2 右上（不重叠）
// ②双人上下住房 → P1 左上、P2 右上
// ③双人一左一右 → 各自归位（P1 左 / P2 右，以及 P1 右 / P2 左）
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
  const p = await browser.newPage();
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=2p&faction=plant&role1=sunflower&role2=peashooter');
  await p.waitForFunction('window.game && window.game.player2 && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(600);

  const run = (p1L, p2L, p1Top, p2Top) => p.evaluate((p1L, p2L, p1Top, p2Top) => {
    const g = window.game;
    // 找房间：按世界左右与上下取两个房间
    const hw = g.worldWidth / 2;
    const rooms = g.rooms.slice();
    const leftRms = rooms.filter(r => (r.x + r.w / 2) * g.gridSize < hw);
    const rightRms = rooms.filter(r => (r.x + r.w / 2) * g.gridSize >= hw);
    const pick = (side, top) => {
      const pool = side === 'L' ? leftRms : rightRms;
      if (!pool.length) return null;
      // top=true 取最靠上的
      pool.sort((a, b) => a.y - b.y);
      return top ? pool[0] : pool[pool.length - 1];
    };
    const r1 = pick(p1L, p1Top), r2 = pick(p2L, p2Top);
    if (!r1 || !r2) return 'NO_ROOM';
    g.player.room = r1; g.player2.room = r2;
    g._positionPlayerHud(g.player);
    g._positionPlayerHud(g.player2);
    const p1 = document.getElementById('hud-p1');
    const p2 = document.getElementById('p2-hud');
    return JSON.stringify({ p1L: p1.style.left, p1R: p1.style.right, p2L: p2.style.left, p2R: p2.style.right });
  }, p1L, p2L, p1Top, p2Top);

  // 场景①：同侧（都左）→ P1 left / P2 right
  let r = await run('L', 'L', false, true);
  r = JSON.parse(r);
  ok(r.p1L === '20px' && r.p1R === 'auto', 'T1a 双人都选左侧房间 → P1 HUD 在左（left=20px）(' + JSON.stringify(r) + ')');
  ok(r.p2R === '20px' && r.p2L === 'auto', 'T1b 双人都选左侧房间 → P2 HUD 在右（right=20px），不与 P1 重叠');

  // 场景②：同侧（都右）→ P1 left / P2 right
  r = await run('R', 'R', false, true);
  r = JSON.parse(r);
  ok(r.p1L === '20px' && r.p1R === 'auto', 'T2a 双人都选右侧房间 → P1 HUD 强制在左 (' + JSON.stringify(r) + ')');
  ok(r.p2R === '20px' && r.p2L === 'auto', 'T2b 双人都选右侧房间 → P2 HUD 强制在右，不重叠');

  // 场景③：一左一右 → 各自归位（P1 左 P2 右）
  r = await run('L', 'R', false, true);
  r = JSON.parse(r);
  ok(r.p1L === '20px' && r.p1R === 'auto' && r.p2R === '20px' && r.p2L === 'auto', 'T3 一左一右 → P1 左 P2 右各自归位 (' + JSON.stringify(r) + ')');

  // 场景④：同排一右一左 → 各自归位（P1 右 P2 左，v4.0.49 用户要求）
  // 为构造“同排”，P1 取右侧任一房间，P2 取左侧中心行与 P1 最接近的房间（保证行差 <4）
  const t4 = await p.evaluate(() => {
    const g = window.game;
    const hw = g.worldWidth / 2;
    const rooms = g.rooms.slice();
    const rightRms = rooms.filter(r => (r.x + r.w / 2) * g.gridSize >= hw);
    rightRms.sort((a, b) => a.y - b.y);
    const r1 = rightRms[Math.floor(rightRms.length / 2)];
    const leftRms = rooms.filter(r => (r.x + r.w / 2) * g.gridSize < hw);
    // 找中心行差 <4 的左区房间
    const c1 = r1.y + r1.h / 2;
    let best = null, bestD = Infinity;
    for (const r of leftRms) {
      const d = Math.abs((r.y + r.h / 2) - c1);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (!best || bestD >= 4) return 'NO_PAIR:' + bestD;
    g.player.room = r1; g.player2.room = best;
    g._positionPlayerHud(g.player);
    g._positionPlayerHud(g.player2);
    const p1 = document.getElementById('hud-p1');
    const p2 = document.getElementById('p2-hud');
    return JSON.stringify({ p1L: p1.style.left, p1R: p1.style.right, p2L: p2.style.left, p2R: p2.style.right });
  });
  if (typeof t4 === 'string' && t4.startsWith('NO_PAIR')) {
    ok(false, 'T4 无同排一右一左房间组合可测（' + t4 + '）——跳过视为通过');
  } else {
    const r4 = JSON.parse(t4);
    ok(r4.p1R === '20px' && r4.p1L === 'auto' && r4.p2L === '20px' && r4.p2R === 'auto', 'T4 P1 在右 P2 在左（同排）→ 各自归位 (' + JSON.stringify(r4) + ')');
  }

  // 场景⑤：上下住房（中心行差≥4）→ P1 左 P2 右
  r = await run('L', 'L', true, false);
  r = JSON.parse(r);
  // 上下判定依赖房间行中心差；若恰好同排则回退到同侧逻辑，两种都该 P1左P2右
  ok(r.p1L === '20px' && r.p1R === 'auto' && r.p2R === '20px' && r.p2L === 'auto', 'T5 上下/同侧 → P1 左 P2 右 (' + JSON.stringify(r) + ')');

  await sleep(300);
  ok(pageErrors.length === 0, 'T6 无 JS 运行错误（' + (pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'clean') + '）');

  await browser.close();
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
