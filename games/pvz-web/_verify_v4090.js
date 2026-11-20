/* v4.0.90 难度均衡验证（我是僵尸降难 + 砸罐子加难，三档差距拉近） */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log((c ? '  PASS ' : '  FAIL ') + n); };
const src = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

(async () => {
  const gls = src('js/GameLoop.js');
  try { execSync('node --check ' + path.join(__dirname, 'js/GameLoop.js')); ok('GameLoop.js 语法通过', true); }
  catch (e) { ok('GameLoop.js 语法通过', false); }

  // ---- 我是僵尸静态断言 ----
  ok('I,Z 初始阳光 easy 660', /easy: \{ key: 'easy', label: '简单', sun: 660, plantTier: 0,/.test(gls));
  ok('I,Z 初始阳光 hard 540', /hard: \{ key: 'hard', label: '困难', sun: 540, plantTier: 1,/.test(gls));
  ok('I,Z 初始阳光 hell 430', /hell: \{ key: 'hell', label: '地狱', sun: 430, plantTier: 2,/.test(gls));
  ok('I,Z 地狱每行射手 ≤3', /const maxShootersPerRow = \{ 0: 1, 1: 2, 2: 3 \}/.test(gls));
  ok('I,Z 地狱精英封顶 4（与困难持平）', /const eliteCap = \{ 0: 1, 1: 4, 2: 4 \}/.test(gls));
  ok('I,Z 地狱阳光植物 5~7', /const sunRange = \{ 0: \[9, 11\], 1: \[7, 9\], 2: \[5, 7\] \}/.test(gls));
  ok('I,Z 地狱池凶植物权重下调', /gatlingpea: 1, spikerock: 1, tallnut: 1, hypnoshroom: 1/.test(gls) && /cattail: 2, wintermelon: 1, gloomshroom: 3/.test(gls));

  // ---- 砸罐子静态断言 ----
  // v4.0.158：配比重做（问号罐为主 / 绿罐压到 1~6），数值断言同步；
  // 文案注释不再参与匹配 —— 断言只认数值，避免改注释就红
  ok('Vase 简单 罐 18~22 / 植物 4~6', /easy: \{[\s\S]*?totalMin: 18, totalMax: 22,[\s\S]*?plantMin: 4, plantMax: 6,/.test(gls));
  ok('Vase 简单 qZombie 0.30 / hpMul 1.20', /qZombie: 0\.30,/.test(gls) && /hpMul: 1\.20\b/.test(gls));
  ok('Vase 困难 植物 3~5 / qZombie 0.44 / hpMul 1.30',
     /plantMin: 3, plantMax: 5,/.test(gls) && /qZombie: 0\.44,/.test(gls) && /hpMul: 1\.30\b/.test(gls));
  ok('Vase 地狱 植物 1~3 / qZombie 0.52 / hpMul 1.50',
     /plantMin: 1, plantMax: 3,/.test(gls) && /qZombie: 0\.52,/.test(gls) && /hpMul: 1\.50\b/.test(gls));

  // ---- 页面实测 ----
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));
    const r = await page.evaluate(() => {
      const g = window.game || window._pvzGame;
      if (!g) return { noGame: true };
      const out = {};
      // 我是僵尸三档 cfg.sun
      const suns = {};
      for (const d of ['easy', 'hard', 'hell']) {
        g.zombieDifficulty = d; g._zDiffCfgCache = null;
        suns[d] = g._zombieDiffCfg().sun;
      }
      out.suns = suns;
      // 砸罐子三档 cfg
      const vc = {};
      for (const d of ['easy', 'hard', 'hell']) {
        g.vaseDifficulty = d;
        const c = g._vaseDiffCfg();
        vc[d] = { totalMin: c.totalMin, totalMax: c.totalMax, plantMin: c.plantMin, plantMax: c.plantMax, qZombie: c.qZombie, hpMul: c.hpMul };
      }
      out.vase = vc;
      // 地狱档敌阵实测：开局后统计每行射手/精英/阳光
      try {
        g.zombieDifficulty = 'hell'; g._zDiffCfgCache = null;
        g._beginZombieGame();
        // 等一小段时间让敌阵落地（同步生成，立即读）
        const isShooter = t => ['peashooter', 'snowpea', 'threepeater', 'repeater', 'splitpea', 'gatlingpea',
          'melonpult', 'wintermelon', 'starfruit', 'gloomshroom', 'fumeshroom', 'cattail',
          'cabbagepult', 'kernelpult'].includes(t);
        const elite = ['gatlingpea', 'wintermelon', 'cattail', 'gloomshroom', 'melonpult', 'spikerock'];
        const enemies = g.entities.filter(e => e._zombieEnemy);
        const rows = {};
        let nSh = 0, nEl = 0, nSun = 0, maxShRow = 0;
        for (const e of enemies) {
          const t = e.type || (e.def && e.def.name);
          const rr = (e.r !== undefined) ? e.r : Math.floor((e.y || 0) / 80);
          if (!rows[rr]) rows[rr] = { sh: 0, el: 0, sun: 0 };
          if (isShooter(t)) { rows[rr].sh++; nSh++; }
          if (elite.includes(t)) { rows[rr].el++; nEl++; }
          if (['sunflower', 'sunshroom', 'twinsunflower'].includes(t)) { rows[rr].sun++; nSun++; }
        }
        for (const k in rows) maxShRow = Math.max(maxShRow, rows[k].sh);
        out.hellGrid = { total: enemies.length, nSh, nEl, nSun, maxShRow, rows };
      } catch (e) { out.hellErr = String(e); }
      return out;
    });
    if (r.noGame) { ok('经典页加载', false); }
    else {
      ok('实测 I,Z 三档阳光 660/540/430', r.suns.easy === 660 && r.suns.hard === 540 && r.suns.hell === 430);
      ok('实测 Vase 三档配置', JSON.stringify(r.vase) === JSON.stringify({
        easy: { totalMin: 18, totalMax: 22, plantMin: 4, plantMax: 6, qZombie: 0.3, hpMul: 1.2 },
        hard: { totalMin: 22, totalMax: 26, plantMin: 3, plantMax: 5, qZombie: 0.44, hpMul: 1.3 },
        hell: { totalMin: 26, totalMax: 28, plantMin: 1, plantMax: 3, qZombie: 0.52, hpMul: 1.5 }
      }), JSON.stringify(r.vase));
      if (r.hellGrid && !r.hellErr) {
        ok('实测地狱敌阵每行射手 ≤3', r.hellGrid.maxShRow <= 3);
        ok('实测地狱敌阵精英 ≤4', r.hellGrid.nEl <= 4);
        ok('实测地狱敌阵阳光 5~7', r.hellGrid.nSun >= 5 && r.hellGrid.nSun <= 7);
        console.log('    [地狱敌阵] 植物=' + r.hellGrid.total + ' 射手=' + r.hellGrid.nSh + ' 精英=' + r.hellGrid.nEl + ' 阳光=' + r.hellGrid.nSun + ' 单行射手峰值=' + r.hellGrid.maxShRow);
      } else {
        ok('实测地狱敌阵统计', false);
        console.log('    [err] ' + r.hellErr);
      }
    }
    ok('经典页无 JS 崩溃', errs.length === 0 ? true : (console.log('  页面错误:', errs.slice(0, 3)), false));
  } finally {
    await browser.close();
  }

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})();
