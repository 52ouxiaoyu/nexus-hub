/* ============================================================
 * v4.0.163 验收：泡泡牧场「按色权重抽签」（豌豆 30%）
 * 用户原话：豌豆在牧场里有两个盆，所以豌豆射手爆率有点低，调到 30%；
 *          剩下寒冰 / 喷菇 / 玉米基本各 20% 左右。
 * 一条规则一条断言：
 *   A 权重表接线      B 抽签分布（randCol 1.2 万次）
 *   C 三条真实投放路径 D 不污染其它玩法
 *   E 牧场功能回归
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
    userDataDir: '/tmp/pptr-v4163-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'), { waitUntil: 'networkidle2' });
  await sleep(1000);

  /* ---------- A. 权重表接线 ---------- */
  console.log('\n【A】权重表');
  await page.evaluate(() => window.MiniGames.openGame('farm'));
  await sleep(450);
  const w = await page.evaluate(() => {
    const l = window.MiniGames.active.lane;
    return { w: l.colW, n: l.nColors, sum: l.colW ? l.colW.reduce((a, b) => a + b, 0) : null };
  });
  ok(Array.isArray(w.w) && w.w.length === 4, '牧场 lane.colW 是 4 色权重表', JSON.stringify(w.w));
  ok(w.n === 4, '仍是 4 种颜色（没加第 5 色稀释同色概率）', w.n);
  ok(Math.abs(w.sum - 1) < 1e-6, '四色权重和为 1（不会出现"空抽"）', w.sum);
  ok(Math.abs(w.w[0] - 0.30) < 1e-9, '豌豆 = 30%', w.w[0]);
  ok(w.w.slice(1).every(v => Math.abs(v - 0.70 / 3) < 1e-9), '其余三色平分 70%（各约 23.3%）', JSON.stringify(w.w.slice(1)));

  /* ---------- B. 抽签分布 ---------- */
  console.log('\n【B】randCol 抽样 12000 次');
  const dist = await page.evaluate(() => {
    const l = window.MiniGames.active.lane;
    const c = [0, 0, 0, 0], N = 12000;
    for (let i = 0; i < N; i++) c[l.randCol()]++;
    return c.map(v => v / N);
  });
  // 二项分布 se：p=0.3 → 0.42%，p=0.233 → 0.39%；留 2 个 se 余量
  ok(dist[0] > 0.288 && dist[0] < 0.312, '豌豆实测 ≈30%', (dist[0] * 100).toFixed(2) + '%');
  ok(dist[1] > 0.218 && dist[1] < 0.248, '寒冰实测 ≈23.3%', (dist[1] * 100).toFixed(2) + '%');
  ok(dist[2] > 0.218 && dist[2] < 0.248, '喷菇实测 ≈23.3%', (dist[2] * 100).toFixed(2) + '%');
  ok(dist[3] > 0.218 && dist[3] < 0.248, '玉米实测 ≈23.3%', (dist[3] * 100).toFixed(2) + '%');
  ok(dist[0] > dist[1] * 1.15, '豌豆明显高于其它三色（这才是用户要的"提爆率"）',
    (dist[0] / dist[1]).toFixed(2) + 'x');

  /* ---------- C. 三条真实投放路径 ---------- */
  console.log('\n【C】开局盘面 / 待发队列 / 顶部压行');
  const board = await page.evaluate(() => {
    const l = window.MiniGames.active.lane;
    const c = [0, 0, 0, 0];
    let n = 0;
    for (let k = 0; k < 40; k++) {
      l.reset(3, 3);
      for (let r = 0; r < l.rows; r++) for (let x = 0; x < l.colsIn(r); x++) {
        const v = l.g[r][x];
        if (v >= 0) { c[v]++; n++; }
      }
    }
    return { rate: c.map(v => v / n), n };
  });
  ok(board.n > 1500, '开局盘面样本足够', board.n + ' 颗');
  ok(board.rate[0] > 0.275 && board.rate[0] < 0.325, '开局盘面豌豆 ≈30%', (board.rate[0] * 100).toFixed(2) + '%');

  const queue = await page.evaluate(() => {
    const g = window.MiniGames.active, l = g.lane;
    l.pickNext = null;
    const c = [0, 0, 0, 0], N = 4000;
    for (let i = 0; i < N; i++) { l.advance(); c[l.next]++; }
    l.cur = 0; l.curSp = null; l.next = 0; l.nextSp = null;
    return c.map(v => v / N);
  });
  ok(queue[0] > 0.275 && queue[0] < 0.325, '待发队列（cur→next）豌豆 ≈30%', (queue[0] * 100).toFixed(2) + '%');

  const push = await page.evaluate(() => {
    const l = window.MiniGames.active.lane;
    const c = [0, 0, 0, 0];
    let n = 0;
    for (let k = 0; k < 90; k++) {
      // 每轮先清空盘面，避免 30 轮压行直接把人压死（dead 后 pushCeil 不再抽签）
      for (let r = 0; r < l.rows; r++) l.g[r] = new Array(l.COLS).fill(-1);
      l.dead = false; l.cleared = false;
      l.pushCeil(19, null);
      for (let x = 0; x < l.colsIn(0); x++) { const v = l.g[0][x]; if (v >= 0) { c[v]++; n++; } }
    }
    return { rate: c.map(v => v / n), n };
  });
  ok(push.n >= 1500, '压行样本足够', push.n + ' 颗');
  // 570 颗时 se≈1.9%，留 3σ：会偶发假红，所以样本拉到 1700+（se≈1.1%）
  ok(push.rate[0] > 0.267 && push.rate[0] < 0.333, '顶部压行（pushCeil）豌豆 ≈30%', (push.rate[0] * 100).toFixed(2) + '%');

  /* ---------- D. 不污染其它玩法 ---------- */
  console.log('\n【D】机械龙攻城不受影响');
  await page.evaluate(() => window.MiniGames.openGame('dragon'));
  await sleep(450);
  const dr = await page.evaluate(() => {
    const l = window.MiniGames.active.lane;
    const c = [0, 0, 0, 0], N = 8000;
    for (let i = 0; i < N; i++) c[l.randCol()]++;
    return { colW: l.colW, rate: c.map(v => v / N) };
  });
  ok(dr.colW == null, '机械龙没有权重表（走旧的均分分支）', String(dr.colW));
  ok(dr.rate.every(v => v > 0.21 && v < 0.29), '机械龙四色仍各 ≈25%', JSON.stringify(dr.rate.map(v => (v * 100).toFixed(1) + '%')));

  /* ---------- E. 牧场功能回归 ---------- */
  console.log('\n【E】牧场回归');
  await page.evaluate(() => window.MiniGames.openGame('farm'));
  await sleep(450);
  const pots = await page.evaluate(() => {
    const g = window.MiniGames.active;
    const byCol = {};
    for (const p of g.pots) byCol[p.col] = (byCol[p.col] || 0) + 1;
    return { byCol, n: g.pots.length, win: g.pots.length };
  });
  ok(pots.n === 5 && pots.byCol[0] === 2, '豌豆仍是两个盆（这就是爆率要补的原因）', JSON.stringify(pots.byCol));

  // 跑 3 秒真实循环，确认改动没有运行时错误
  await sleep(3000);
  ok(errs.length === 0, '牧场跑 3 秒零报错', errs.slice(0, 3).join(' | '));

  const feedChain = await page.evaluate(() => {
    const g = window.MiniGames.active;
    const realPush = g.lane.pushCeil;
    g.lane.pushCeil = () => {};               // 别让 6 次升级把盘面顶穿、直接判负
    for (const p of g.pots) { p.lv = 0; p.seed = 0; }
    g.over = false; g.win = false;
    for (let i = 0; i < 6; i++) g.feed(0, 3);  // 第一盆喂满 6 级
    const first = { lv: g.pots[0].lv, seed: g.pots[0].seed };
    g.feed(0, 1);                              // 第一盆满级后，同色该流向第二个豌豆盆（pots[4]）
    const second = { lv: g.pots[4].lv, seed: g.pots[4].seed };
    g.lane.pushCeil = realPush;
    return { first, second };
  });
  ok(feedChain.first.lv === 6 && feedChain.first.seed === 0, '同色喂满第一盆（6 级）', JSON.stringify(feedChain.first));
  ok(feedChain.second.seed === 1 && feedChain.second.lv === 0, '满级后同色自动流向第二个豌豆盆', JSON.stringify(feedChain.second));

  const win = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.pots[0].lv = 6; g.pots[1].lv = 6; g.over = false; g.win = false;
    g.checkWin();
    return { over: g.over, win: g.win };
  });
  ok(win.over && win.win, '2 盆满级仍然直接通关（胜利条件没被改动波及）', JSON.stringify(win));

  console.log('\n===== ' + pass + ' / ' + (pass + fail) + ' 项通过 =====');
  if (fail) console.log('失败：\n - ' + fails.join('\n - '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
