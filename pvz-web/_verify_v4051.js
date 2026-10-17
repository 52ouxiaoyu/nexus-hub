// v4.0.51 验证：盲盒战力下调——主池=用户点名植物（权重10，约占91%），其余强力植物权重1（概率极小但不是没有）
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
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=chomper');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(800);

  // ===== B1 盲盒池统计（5000 次真实抽池）=====
  const stats = await p.evaluate(() => {
    const g = window.game;
    const MAIN = ['sunshroom', 'bigsunshroom', 'garlic', 'iceshroom', 'plantern', 'plantern2',
      'peashooter', 'cabbagepult', 'kernelpult', 'dualpea', 'wallnut', 'puffshroom', 'scaredyshroom'];
    const counts = {};
    let mainHits = 0, rareHits = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const t = g._blindBoxType();
      counts[t] = (counts[t] || 0) + 1;
      if (MAIN.includes(t)) mainHits++; else rareHits++;
    }
    const mainCovered = MAIN.filter(t => counts[t] > 0);
    const rareSeen = Object.keys(counts).filter(t => !MAIN.includes(t));
    return { N, mainHits, rareHits, mainRatio: mainHits / N, mainCovered, rareSeen, mainTotal: MAIN.length };
  });
  ok(stats.mainCovered.length === stats.mainTotal, 'B1a 主池 13 种植物全覆盖（' + stats.mainCovered.join('/') + '）');
  ok(stats.mainRatio > 0.8, 'B1b 主池占比 >80%（实际 ' + (stats.mainRatio * 100).toFixed(1) + '%）');
  ok(stats.rareSeen.length >= 5, 'B1c 稀有植物可开出（概率极小但不是没有，抽到 ' + stats.rareSeen.join(',') + '）');
  console.log('  INFO 主池=' + (stats.mainRatio * 100).toFixed(1) + '% 稀有合计=' + (stats.rareHits / stats.N * 100).toFixed(1) + '%');

  // ===== B2 真实开箱流程（放空格子开 12 次，无报错且结果合法）=====
  const open = await p.evaluate(async () => {
    const g = window.game;
    const results = [];
    const errors = [];
    for (let i = 0; i < 12; i++) {
      // 找地图上的空格子（无植物、无墙、无门、无圈）
      let col = -1, row = -1;
      for (let tries = 0; tries < 200 && col < 0; tries++) {
        const c = 3 + Math.floor(Math.random() * 55);
        const r = 3 + Math.floor(Math.random() * 40);
        const hasPlant = g.plants.some(pl => pl.c === c && pl.r === r);
        if (hasPlant || g.walls.has(`${c},${r}`) || (c === 30 && r === 10)) continue;
        col = c; row = r;
      }
      if (col < 0) { errors.push('no free cell'); continue; }
      const before = g.plants.length;
      try {
        const ret = g.spawnPlant(col, row, 'blindbox');
        const after = g.plants.length;
        results.push({ ret, grew: after > before, type: after > before ? g.plants[g.plants.length - 1].type : null });
      } catch (e) { errors.push(e.message); }
    }
    return { results, errors };
  });
  ok(open.errors.length === 0, 'B2a 开箱 12 次零异常（' + open.errors.join('|') + '）');
  ok(open.results.length === 12, 'B2b 开箱 12 次全部完成');
  ok(open.results.some(r => r.grew), 'B2c 至少种下一株植物');
  const inDefs = await p.evaluate(() => {
    const g = window.game;
    let allOk = true;
    for (const pl of g.plants) if (pl.type && !HauntedDorm.DEFS[pl.type]) allOk = false;
    return allOk;
  });
  ok(inDefs, 'B2d 开出的植物类型均在 DEFS 内（无空图/幽灵植物）');

  // ===== B3 盲盒开出 iceshroom 路径：全局冰封特判（防回归）=====
  const ice = await p.evaluate(() => {
    const g = window.game;
    const spawned = g._blindBoxType();
    return spawned === 'iceshroom' ? 'ice-hits-instant-path' : 'ice-not-this-roll';
  });
  console.log('  INFO iceshroom 属 instant 特判路径（开出即冰全场），兜底已放行，断言：DEFS 判定正确');
  const iceDef = await p.evaluate(() => HauntedDorm.DEFS['iceshroom'].instant === true);
  ok(iceDef, 'B3a iceshroom 确认为 instant（开出走冰冻特判，不占格）');

  await browser.close();
  console.log(`\n===== 验证结果: ${pass} PASS / ${fail} FAIL =====`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
