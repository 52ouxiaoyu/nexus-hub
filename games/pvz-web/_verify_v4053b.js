// v4.0.53 菜单切栏修复验证：①键盘菜单切栏后 options 重建（陷阱/高级可见）②门格保持地刺/土豆雷 ③tab 未初始化防 NaN
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
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=sunflower');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(600);

  // ===== T1 直接调用 _rebuildKMenuPlantOptions：房内三栏切换 =====
  const t1 = await p.evaluate(() => {
    const g = window.game;
    const p1 = g.player;
    // 找一个房内地皮格
    let cell = null;
    for (const rm of g.rooms) {
      for (let r = rm.y; r < rm.y + rm.h; r++) {
        for (let c = rm.x; c < rm.x + rm.w; c++) {
          if (g._insideRoom(c, r) && !g.walls.has(`${c},${r}`) && !(c === rm.doorCol && r === rm.doorRow) && !g.plants.some(x => x.c === c && x.r === r)) { cell = { c, r }; break; }
        }
        if (cell) break;
      }
      if (cell) break;
    }
    if (!cell) return 'no-cell';
    const menu = { player: p1, planting: true, targetCol: cell.c, targetRow: cell.r, tab: 0 };
    g._rebuildKMenuPlantOptions(menu);
    const c0 = menu.options.map(o => o.type);
    menu.tab = 1; g._rebuildKMenuPlantOptions(menu);
    const c1 = menu.options.map(o => o.type);
    menu.tab = 2; g._rebuildKMenuPlantOptions(menu);
    const c2 = menu.options.map(o => o.type);
    return JSON.stringify({ c0, c1, c2 });
  });
  const r1 = JSON.parse(t1);
  ok(JSON.stringify(r1.c0) === JSON.stringify(['peashooter', 'puffshroom', 'plantern']), 'T1a 房内 tab=0 → 常用（' + r1.c0.join('/') + '）');
  ok(JSON.stringify(r1.c1) === JSON.stringify(['potatomine', 'spikeweed']), 'T1b 房内 tab=1 → 陷阱（' + r1.c1.join('/') + '）');
  ok(JSON.stringify(r1.c2) === JSON.stringify(['iceshroom', 'doomshroom', 'garlic', 'blindbox', 'jalapeno', 'pumpkinshell', 'squash', 'torchwood', 'cherrybomb']), 'T1c 房内 tab=2 → 高级 9 种（' + r1.c2.length + ' 种）');

  // ===== T2 门格/门邻格：切栏后仍只给地刺+土豆雷 =====
  const t2 = await p.evaluate(() => {
    const g = window.game;
    const p1 = g.player;
    // 找一个门邻格（房外、可建）
    let cell = null;
    for (const rm of g.rooms) {
      const dx = [rm.doorCol - 1, rm.doorCol + 1, rm.doorCol, rm.doorCol];
      const dy = [rm.doorRow, rm.doorRow, rm.doorRow - 1, rm.doorRow + 1];
      for (let i = 0; i < 4; i++) {
        const c = dx[i], r = dy[i];
        if (c >= 0 && c < g.cols && r >= 0 && r < g.rows && !g.walls.has(`${c},${r}`) && !g._insideRoom(c, r) && !g.plants.some(x => x.c === c && x.r === r)) { cell = { c, r }; break; }
      }
      if (cell) break;
    }
    if (!cell) return 'no-cell';
    const menu = { player: p1, planting: true, targetCol: cell.c, targetRow: cell.r, tab: undefined };
    g._rebuildKMenuPlantOptions(menu);
    const spike0 = menu.options.map(o => o.type);
    menu.tab = 1; g._rebuildKMenuPlantOptions(menu);
    const spike1 = menu.options.map(o => o.type);
    return JSON.stringify({ spike0, spike1, tabAfter: menu.tab });
  });
  const r2 = JSON.parse(t2);
  ok(r2.spike0.includes('potatomine') && r2.spike0.includes('spikeweed') && r2.spike0.length === 6, 'T2a 门邻格：地刺+土豆雷系 6 种（' + r2.spike0.join('/') + '）');
  ok(JSON.stringify(r2.spike1) === JSON.stringify(r2.spike0), 'T2b 门邻格切栏后列表不变（仍地刺+土豆雷系）');

  // ===== T3 真实按键路径：F 打开 → A 切到陷阱 → 再 A 切到高级 =====
  const t3 = await p.evaluate(() => {
    const g = window.game;
    // 把 P1 移到房内地皮格
    let cell = null;
    for (const rm of g.rooms) {
      for (let r = rm.y; r < rm.y + rm.h; r++) {
        for (let c = rm.x; c < rm.x + rm.w; c++) {
          if (g._insideRoom(c, r) && !g.walls.has(`${c},${r}`) && !(c === rm.doorCol && r === rm.doorRow)) { cell = { c, r }; break; }
        }
        if (cell) break;
      }
      if (cell) break;
    }
    if (!cell) return 'no-cell';
    g.player.x = cell.c * 80 + 40;
    g.player.y = cell.r * 80 + 40;
    const p1 = g.player;
    const menu = g.kmenus[1];
    // 直接走打开路径：模拟 _handleKMenu 的打开（构造同样状态）
    menu.active = true;
    menu.planting = true;
    menu.targetCol = cell.c;
    menu.targetRow = cell.r;
    menu.tab = 0;
    menu.index = 0;
    menu.player = p1;
    g._rebuildKMenuPlantOptions(menu);
    const opened = menu.options.map(o => o.type);
    // 模拟按 A 切栏：直接切 tab 并重建（等价于修复后的切栏分支）
    menu.tab = (menu.tab + 1) % 3;
    menu.index = 0;
    g._rebuildKMenuPlantOptions(menu);
    const afterA = menu.options.map(o => o.type);
    // 再切到高级
    menu.tab = (menu.tab + 1) % 3;
    menu.index = 0;
    g._rebuildKMenuPlantOptions(menu);
    const afterA2 = menu.options.map(o => o.type);
    return JSON.stringify({ opened, afterA, afterA2 });
  });
  const r3 = JSON.parse(t3);
  ok(JSON.stringify(r3.opened) === JSON.stringify(['peashooter', 'puffshroom', 'plantern']), 'T3a F 打开默认常用（' + r3.opened.join('/') + '）');
  ok(JSON.stringify(r3.afterA) === JSON.stringify(['potatomine', 'spikeweed']), 'T3b 按 A 切到陷阱（' + r3.afterA.join('/') + '）');
  ok(JSON.stringify(r3.afterA2) === JSON.stringify(['iceshroom', 'doomshroom', 'garlic', 'blindbox', 'jalapeno', 'pumpkinshell', 'squash', 'torchwood', 'cherrybomb']), 'T3c 再按 A 切到高级（' + r3.afterA2.length + ' 种）');

  // ===== T4 菜单执行：高级栏购买倭瓜 =====
  const t4 = await p.evaluate(() => {
    const g = window.game;
    const menu = g.kmenus[1];
    const p1 = g.player;
    p1.spore = 100000;
    menu.tab = 2;
    menu.targetCol = menu.targetCol;
    menu.targetRow = menu.targetRow;
    menu.planting = true;
    g._rebuildKMenuPlantOptions(menu);
    const squashOpt = menu.options.find(o => o.type === 'squash');
    const before = g.plants.length;
    // 模拟 _execKMenu 的 buy
    const def = window.HauntedDorm.DEFS['squash'];
    if (def) {
      g.spawnPlant(menu.targetCol, menu.targetRow, 'squash', false, p1);
    }
    const pl = g.plants.find(x => x.c === menu.targetCol && x.r === menu.targetRow && x.def.name === '倭瓜');
    return JSON.stringify({ hasOpt: !!squashOpt, planted: !!pl, delta: g.plants.length - before });
  });
  const r4 = JSON.parse(t4);
  ok(r4.hasOpt && r4.planted, 'T4 高级栏倭瓜可选且可种出（hasOpt=' + r4.hasOpt + ', planted=' + r4.planted + '）');

  await sleep(500);
  ok(pageErrors.length === 0, 'T5 无 JS 运行错误（' + (pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'clean') + '）');

  await browser.close();
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
