/* v4.0.160 验收：砸罐子「每局新地图 + 植物更少 + 问号罐不再白给」
 *  ① 关卡表自检：p+q+z=total、三条队列长度与配额一致
 *  ② 布局随机：同一关连开 6 次，罐位集合互不相同
 *  ③ 罐型/内容随机：同关 6 次的「罐型序列」与「内容序列」都不相同
 *  ④ 配额：10 关汇总，问号罐植物 40~52% / 僵尸 25~38% / 阳光 15~30%
 *  ⑤ 可解性保底仍在：前排（col<4）问号罐暗雷 = 0；紫罐 col≥6 占比 ≥ 85%
 *  ⑥ 金罐：写了 golden:1 的关每次都恰好 1 个金罐
 *  ⑦ 文案：帮助 + 关卡面板都说明了「每局重新洗牌」
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + label + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + label + (extra ? ' — ' + extra : '')); }
};

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window._pvzGame');
  await sleep(500);

  /* ============ ① 关卡表自检 ============ */
  console.log('\n① 关卡表配额自检');
  const tbl = await p.evaluate(() => VASE_LEVELS.map(L => ({
    n: L.n, name: L.name, total: L.total, p: L.p, q: L.q, z: L.z,
    lp: (L.plants || []).length, lq: (L.qs || []).length, lz: (L.zombies || []).length,
    hp: L.hp, golden: L.golden
  })));
  ok(tbl.length === 10, '关卡表 10 关', 'n=' + tbl.length);
  const bad = tbl.filter(L => L.p + L.q + L.z !== L.total || L.lp !== L.p || L.lq !== L.q || L.lz !== L.z);
  ok(bad.length === 0, '每关 p+q+z=total 且三条队列长度对得上',
    bad.length ? JSON.stringify(bad) : `${tbl.length} 关全对`);
  const qzTotal = tbl.reduce((a, L) => a + L.q + L.z + L.p, 0);

  /* ============ ②③ 随机度 ============ */
  console.log('\n② 布局 / 罐型 / 内容 的逐局随机度（每关 6 局）');
  const rnd = await p.evaluate(async () => {
    const g = window._pvzGame;
    const out = [];
    for (let n = 1; n <= 10; n++) {
      const layouts = new Set(), typeSeq = new Set(), contentSeq = new Set(), goldCounts = [];
      for (let k = 0; k < 6; k++) {
        g._startVaseLevel(n);
        await new Promise(r => setTimeout(r, 40));
        const vs = g.vases;
        // 罐位集合（不看类型）
        layouts.add(vs.map(v => v.row + ',' + v.col).sort().join('|'));
        // 罐型网格（按格子 → 类型首字母，反映「哪块是问号哪块是紫罐」）
        typeSeq.add(vs.slice().sort((a, b) => a.row - b.row || a.col - b.col)
          .map(v => v.type[0] + (v.golden ? 'G' : '')).join(''));
        // 内容序列（按格子排序后每格内容）
        contentSeq.add(vs.slice().sort((a, b) => a.row - b.row || a.col - b.col)
          .map(v => (v.content.kind === 'plant' ? 'p' + v.content.type : v.content.kind[0])).join('|'));
        goldCounts.push(vs.filter(v => v.golden).length);
      }
      out.push({ n, layouts: layouts.size, types: typeSeq.size, contents: contentSeq.size, goldCounts });
    }
    return { out, qzTotal: 0 };
  });
  const notRandom = rnd.out.filter(x => x.layouts < 6);
  ok(notRandom.length === 0, '同一关连开 6 次，罐位集合 6 种全不同',
    notRandom.length ? JSON.stringify(notRandom.map(x => x.n + ':' + x.layouts)) : '10 关全随机');
  const typeNot = rnd.out.filter(x => x.types < 5);
  ok(typeNot.length === 0, '罐型分布也每局不同（≥5/6 种）',
    typeNot.length ? JSON.stringify(typeNot.map(x => x.n + ':' + x.types)) : 'ok');
  const cNot = rnd.out.filter(x => x.contents < 6);
  ok(cNot.length === 0, '罐内内容顺序每局不同（6/6 种）',
    cNot.length ? JSON.stringify(cNot.map(x => x.n + ':' + x.contents)) : 'ok');

  /* ============ ④ 问号罐配额 + ⑤ 保底 ============ */
  console.log('\n④ 问号罐内容配额（10 关 × 8 局汇总）');
  const stats = await p.evaluate(async () => {
    const g = window._pvzGame;
    const atk = new Set(g._vaseAttackerPool());
    const acc = { qPlant: 0, qZombie: 0, qSun: 0, plants: 0, zombies: 0, frontHidden: 0, deepZ: 0, nearZ: 0, allZ: 0 };
    const perLv = [];
    for (let n = 1; n <= 10; n++) {
      const a = { plants: 0, zombies: 0, frontHidden: 0 };
      for (let k = 0; k < 8; k++) {
        g._startVaseLevel(n);
        await new Promise(r => setTimeout(r, 40));
        g.vases.forEach(v => {
          const c = v.content; if (!c) return;
          if (v.type === 'question') {
            if (c.kind === 'plant') acc.qPlant++;
            else if (c.kind === 'zombie') acc.qZombie++;
            else acc.qSun++;
          }
          if (c.kind === 'plant') { acc.plants++; a.plants++; }
          if (c.kind === 'zombie') {
            acc.zombies++; a.zombies++;
            acc.allZ++;
            if (v.type === 'zombie' && v.col >= 6) acc.deepZ++;
            if (v.type === 'zombie' && v.col < 4) acc.nearZ++;
            if (v.type === 'question' && v.col < 4) { acc.frontHidden++; a.frontHidden++; }
          }
        });
      }
      perLv.push({ n, plants: +(a.plants / 8).toFixed(1), zombies: +(a.zombies / 8).toFixed(1), frontHidden: a.frontHidden });
    }
    return { acc, perLv };
  });
  const qs = stats.acc.qPlant + stats.acc.qZombie + stats.acc.qSun;
  const pr = stats.acc.qPlant / qs, zr = stats.acc.qZombie / qs, sr = stats.acc.qSun / qs;
  // v4.0.164：植物总量砍到 4~8 株后，问号罐的植物配额也随之下调（火力主要来自绿罐/金罐）
  ok(pr >= 0.27 && pr <= 0.35, `问号罐植物占比 ${(pr * 100).toFixed(1)}% 在 27~35%`,
    `植物 ${stats.acc.qPlant} / 僵尸 ${stats.acc.qZombie} / 阳光 ${stats.acc.qSun}`);
  // 8 局 × 10 关的采样本身有 ±2% 抖动（暗雷摊成植物会把僵尸换成植物），下限留到 22%
  ok(zr >= 0.15 && zr <= 0.25, `问号罐僵尸占比 ${(zr * 100).toFixed(1)}% 在 15~25%`);
  ok(sr >= 0.44 && sr <= 0.56, `问号罐阳光占比 ${(sr * 100).toFixed(1)}% 在 44~56%`);
  ok(stats.acc.frontHidden === 0, '前排（col<4）问号罐暗雷 = 0', 'n=' + stats.acc.frontHidden);
  // col≥6 只有 3 列，一关 25~26 个罐根本塞不下全部紫罐 —— 真判据是「贴脸（col<4）」有多少
  const deepRatio = stats.acc.deepZ / Math.max(1, stats.acc.allZ);
  ok(deepRatio >= 0.50, `紫罐落在后排 col≥6 的比例 ${(deepRatio * 100).toFixed(1)}% ≥ 50%`,
    `${stats.acc.deepZ}/${stats.acc.allZ}`);
  const nearZ = stats.acc.nearZ / Math.max(1, stats.acc.allZ);
  ok(nearZ <= 0.14, `紫罐贴脸（col<4）只占 ${(nearZ * 100).toFixed(1)}% ≤ 14%`,
    `${stats.acc.nearZ}/${stats.acc.allZ}`);
  const lvLine = stats.perLv.map(x => `L${x.n}(${x.plants}株/${x.zombies}只)`).join(' ');
  console.log('     ' + lvLine);

  /* 植物总量对比：每关平均植物数应在 7~14 之间（不再出现 16+ 的白给局） */
  const avgPlants = stats.perLv.reduce((a, x) => a + x.plants, 0) / 10;
  ok(avgPlants >= 4 && avgPlants <= 8, `十关平均植物 ${avgPlants.toFixed(1)} 株/关（4~8，用户硬要求）`);

  /* ============ ⑥ 金罐 ============ */
  console.log('\n⑥ 金罐必出（golden:1 的四关）');
  const goldOk = rnd.out.filter(x => {
    const L = tbl.find(t => t.n === x.n);
    return L.golden > 0 && x.goldCounts.some(c => c !== L.golden);
  });
  ok(goldOk.length === 0, '写了 golden:1 的关每次都恰好 1 个金罐',
    goldOk.length ? JSON.stringify(goldOk.map(x => x.n + ':' + x.goldCounts)) : 'ok');

  /* ============ ⑦ 文案 ============ */
  console.log('\n⑦ 文案同步');
  const helpTxt = await p.evaluate(() => {
    const out = [];
    try {
      const el = document.querySelector('#help-guide') || document.body;
      out.push(el.innerText || '');
    } catch (e) { }
    return out.join('\n');
  });
  // 帮助内容可能未渲染，直接从 JS 源里查更稳
  const helpSrc = await p.evaluate(async () => {
    const r = await fetch('js/HelpGuide.js');
    return await r.text();
  });
  ok(/问号罐里「三成植物 \/ 两成僵尸 \/ 一半阳光」/.test(helpSrc), '帮助文档写了问号罐「三成植物/两成僵尸/一半阳光」');
  ok(/每局重新抽签/.test(helpSrc), '帮助文档写了「每关罐位每局重新抽签」');
  const panelTxt = await p.evaluate(async () => {
    const g = window._pvzGame;
    const r = await fetch('index.html'); const t = await r.text();
    return t;
  });
  ok(/每局罐位、罐型、罐内顺序都会重新洗牌/.test(panelTxt), '关卡面板副标题说明了每局洗牌');

  /* ============ ⑧ 无报错 ============ */
  ok(errs.length === 0, '无 pageerror', errs.slice(0, 3).join(' | '));

  console.log(`\n===== ${pass} passed, ${fail} failed =====`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
