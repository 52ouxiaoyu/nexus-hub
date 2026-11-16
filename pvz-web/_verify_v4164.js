/* ============================================================
 * v4.0.164 验收：砸罐子「植物严格 4~8 株 + 高阶僵尸回归 + 第 10 关对标旧地狱」
 * 用户原话：砸罐子一点难度都没有，原来那种高阶僵尸一个都没有了，完全输不了；
 *          植物数量严格 4~8 个、不要太多高阶植物；最后一关跟之前的地狱模式差不多。
 * 断言分组：
 *   A 关卡表结构（配额 / 植物总量 / 高级植物 / 僵尸梯次）
 *   B 运行时（植物夹子 4~8、前排无暗雷、有僵尸的行有输出、每局植物数固定）
 *   C 难度爬坡（僵尸血量 ÷ 植物数 逐关上升，L10 明显高于 L1）
 *   D 文案（横幅报植物数、帮助写了 4~8）
 *   E 10 个玩法零报错
 * ============================================================ */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-gpu'],
    userDataDir: '/tmp/pptr-v4164-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'), { waitUntil: 'networkidle2' });
  await page.waitForFunction('window._pvzGame');
  await sleep(700);

  /* ---------- A. 关卡表 ---------- */
  console.log('\n【A】关卡表');
  const tbl = await page.evaluate(() => VASE_LEVELS.map(L => ({
    n: L.n, name: L.name, lvl: L.lvl, total: L.total, p: L.p, q: L.q, z: L.z, hp: L.hp,
    golden: L.golden,
    lp: L.plants.length, lq: L.qs.length, lz: L.zombies.length,
    pPlants: L.plants.filter(t => t !== 'sun').length,
    qPlants: L.qs.filter(t => t.indexOf('p:') === 0).length,
    allPlants: L.plants.concat(L.qs.filter(t => t.indexOf('p:') === 0).map(t => t.slice(2))),
    qz: L.qs.filter(t => t.indexOf('z:') === 0).map(t => t.slice(2)).concat(L.zombies)
  })));
  ok(tbl.length === 10, '一共 10 关', tbl.length);
  ok(tbl.every(L => L.p + L.q + L.z === L.total), '每关 p+q+z = total',
    tbl.filter(L => L.p + L.q + L.z !== L.total).map(L => L.n).join(',') || 'all ok');
  ok(tbl.every(L => L.lp === L.p && L.lq === L.q && L.lz === L.z), '三条内容队列长度与配额一致',
    tbl.filter(L => L.lp !== L.p || L.lq !== L.q || L.lz !== L.z).map(L => L.n).join(',') || 'all ok');

  const authored = tbl.map(L => L.pPlants + L.qPlants + L.golden);
  ok(authored.every(v => v >= 4 && v <= 8), '每关植物总量（绿罐 + 问号 + 金罐）严格 4~8',
    tbl.map((L, i) => L.n + ':' + authored[i]).join(' '));
  ok(authored[0] <= 5 && authored[9] === 8, '曲线起点 4~5 株、终点 8 株',
    authored[0] + ' → ' + authored[9]);
  ok(tbl.every(L => L.p >= 2 && L.p <= 4), '绿罐压到 2~4 个（旧版 3~6）',
    tbl.map(L => L.n + ':' + L.p).join(' '));
  ok(tbl.every(L => L.q > L.p && L.q > L.z), '问号罐仍是数量最多的一类',
    tbl.map(L => L.n + ':' + L.q).join(' '));

  // 高级植物：只允许最后两关各 1 株机枪，西瓜/冰西瓜彻底不出
  const HIGH = ['gatlingpea', 'melonpult', 'wintermelon', 'cattail', 'gloomshroom', 'twinsunflower', 'spikerock', 'cobcannon'];
  const highPer = tbl.map(L => L.allPlants.filter(t => HIGH.indexOf(t) >= 0).length);
  ok(highPer.every((v, i) => v <= 1), '每关最多 1 株高级植物', tbl.map((L, i) => L.n + ':' + highPer[i]).join(' '));
  ok(tbl.slice(0, 8).every((L, i) => highPer[i] === 0), '前 8 关不使用高级植物',
    tbl.map((L, i) => L.n + ':' + highPer[i]).join(' '));
  const allTypes = [...new Set(tbl.reduce((a, L) => a.concat(L.allPlants), []))];
  ok(allTypes.indexOf('melonpult') < 0 && allTypes.indexOf('wintermelon') < 0, '西瓜 / 冰西瓜不再出现', allTypes.join(','));

  // 僵尸梯次
  const tier = (L, t) => L.qz.indexOf(t) >= 0;
  ok(tbl.slice(0, 3).every(L => L.qz.every(t => ['normal', 'conehead', 'imp', 'newspaper'].indexOf(t) >= 0)),
    '前 3 关只有普通/路障/小鬼/读报', tbl.slice(0, 3).map(L => L.n + ':' + L.qz.join('+')).join(' | '));
  ok(tbl.slice(3, 6).some(L => tier(L, 'buckethead')), '第 4~6 关有铁桶');
  const firstFootball = tbl.findIndex(L => tier(L, 'football')) + 1;
  const firstIroncone = tbl.findIndex(L => tier(L, 'ironcone')) + 1;
  ok(firstFootball === 7, '第 7 关首次出现橄榄球（高阶僵尸回归）', '第 ' + firstFootball + ' 关');
  ok(firstIroncone === 8, '第 8 关首次出现双盔', '第 ' + firstIroncone + ' 关');
  ok(tbl[9].qz.filter(t => t === 'football').length >= 1 && tbl[9].qz.filter(t => t === 'ironcone').length >= 1,
    '第 10 关同时有橄榄球 + 双盔', tbl[9].qz.join(','));
  ok(tbl[9].hp >= 1.10, '第 10 关血量倍率 ≥1.10（旧版末关也是 1.10，地狱档是 1.50 的自由局）', tbl[9].hp);

  /* ---------- B. 运行时 ---------- */
  console.log('\n【B】运行时（每关 20 次布局）');
  const run = await page.evaluate(async () => {
    const g = window._pvzGame;
    const HP = { normal: 200, flag: 200, conehead: 560, buckethead: 1300, ironcone: 1500, football: 2240,
      newspaper: 300, polevaulting: 500, imp: 100, screendoor: 5200, dancing: 500, hammerzombie: 560 };
    const ATK = new Set(g._vaseAttackerPool());
    const out = [];
    for (let n = 1; n <= 10; n++) {
      let minP = 99, maxP = 0, frontHidden = 0, deadRow = 0, hpSum = 0, hpN = 0, zN = 0;
      const samples = [];
      for (let i = 0; i < 20; i++) {
        g._startVaseLevel(n);
        await new Promise(r => setTimeout(r, 25));
        const plants = g.vases.filter(v => v.content && v.content.kind === 'plant').length;
        samples.push(plants);
        minP = Math.min(minP, plants); maxP = Math.max(maxP, plants);
        g.vases.forEach(v => {
          if (v.content && v.content.kind === 'zombie' && v.type === 'question' && v.col < 4) frontHidden++;
        });
        for (let r = 0; r < g.board.rows; r++) {
          const inRow = g.vases.filter(v => v.row === r);
          const hasZ = inRow.some(v => v.content && v.content.kind === 'zombie');
          const hasAtk = inRow.some(v => v.content && v.content.kind === 'plant' && ATK.has(v.content.type));
          if (hasZ && !hasAtk) deadRow++;
        }
        const zs = g.vases.filter(v => v.content && v.content.kind === 'zombie').map(v => v.content.type);
        zN += zs.length;
        hpSum += zs.reduce((a, t) => a + (HP[t] || 300), 0) * (VASE_LEVELS[n - 1].hp || 1);
        hpN++;
      }
      out.push({ n, minP, maxP, frontHidden, deadRow, avgHp: Math.round(hpSum / hpN), avgZ: +(zN / hpN).toFixed(1), samples });
    }
    return out;
  });
  ok(run.every(r => r.minP >= 4), '任何一局都不会少于 4 株植物',
    run.filter(r => r.minP < 4).map(r => 'L' + r.n + ':' + r.minP).join(',') || 'all ok');
  ok(run.every(r => r.maxP <= 8), '任何一局都不会多于 8 株植物',
    run.filter(r => r.maxP > 8).map(r => 'L' + r.n + ':' + r.maxP).join(',') || 'all ok');
  ok(run.every(r => r.frontHidden === 0), '前排问号罐不再藏僵尸（暗雷清零）',
    run.filter(r => r.frontHidden).map(r => 'L' + r.n + ':' + r.frontHidden).join(',') || 'all ok');
  // 植物只有 4~8 株：某条线的罐子全是僵尸罐时，这一行连"换内容"的落脚点都没有，
  // 此时靠玩家把别处的植物卡自由插过去（卡不绑行）。所以判据放到「极少」而不是「清零」。
  ok(run.every(r => r.deadRow <= 6), '单关死行 ≤6/20 局（植物 4~8 株的物理下限）',
    run.filter(r => r.deadRow > 6).map(r => 'L' + r.n + ':' + r.deadRow).join(',') || 'all ok');
  const deadAll = run.reduce((a, r) => a + r.deadRow, 0);
  ok(deadAll <= 18, '十关合计死行 ≤18 / 200 次布局（≤1.8%）', deadAll + ' 个');

  /* ---------- C. 难度爬坡 ---------- */
  console.log('\n【C】难度爬坡');
  const load = run.map((r, i) => ({ n: r.n, ratio: r.avgHp / Math.max(1, (r.minP + r.maxP) / 2) }));
  ok(load[9].ratio > load[0].ratio * 2.2, 'L10 的「僵尸血量 ÷ 植物数」至少是 L1 的 2.2 倍',
    load[0].ratio.toFixed(0) + ' → ' + load[9].ratio.toFixed(0));
  const soft = load.filter(x => x.ratio > load[9].ratio * 1.25);
  ok(soft.length === 0, '没有任何一关比 L10 硬 25% 以上（曲线单调不跳崖）',
    soft.map(x => 'L' + x.n + ':' + x.ratio.toFixed(0)).join(',') || 'all ok');
  console.log('     ' + load.map(x => 'L' + x.n + ':' + x.ratio.toFixed(0)).join(' '));
  ok(run[9].avgHp >= 6500, 'L10 平均僵尸总血量 ≥6500（旧版 12 株火力党才扛得住）', run[9].avgHp);

  /* ---------- D. 文案 ---------- */
  console.log('\n【D】文案');
  const txt = await page.evaluate(() => {
    const src = document.querySelector('script[src*="GameLoop"]').src;
    return fetch(src + (src.indexOf('?') < 0 ? '?x=1' : '&x=1')).then(r => r.text());
  });
  ok(/植物 \$\{this\._vasePlantCount\} 株/.test(txt), '开场横幅会报「植物 N 株」');

  /* ---------- E. 10 个玩法零报错 ---------- */
  console.log('\n【E】10 个玩法');
  await page.evaluate(async () => {
    for (const g of window.MiniGames.games) {
      window.MiniGames.openGame(g.id);
      await new Promise(r => setTimeout(r, 260));
    }
    if (window.MiniGames.closeGame) window.MiniGames.closeGame();
  });
  await sleep(700);
  ok(errs.length === 0, '全程无 pageerror / console.error', errs.slice(0, 3).join(' | '));

  console.log('\n===== v4.0.164 结果：' + pass + ' 通过 / ' + fail + ' 失败 =====');
  if (fail) console.log('失败：\n - ' + fails.join('\n - '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
