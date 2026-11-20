// v4.0.119 融合植物 / 融合配方全量巡检（v2：适配「经 典」分区 + 卡面背景图 + getPlantName）
//  A 分区与条目数  B 立绘可加载  C 配方表完整性  D 配方能合成出自己
//  E 融合植物可实例化  F 配方产物都有中文名/实体  G 图鉴 ↔ 配方 双向覆盖
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0' });
  await sleep(1200);

  let pass = 0, fail = 0;
  const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

  await p.evaluate(() => {
    document.getElementById('btn-help-guide').click();
    document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click();
  });
  await sleep(500);

  const guide = await p.evaluate(async () => {
    const groups = [];
    for (const g of document.querySelectorAll('#help-body .hg-group')) {
      const grid = g.nextElementSibling;
      const tiles = [...grid.querySelectorAll('.hg-tile')].map(t => {
        const img = t.querySelector('img');
        const card = t.querySelector('.hg-card');
        let src = '';
        if (img) src = img.getAttribute('src') || '';
        else if (card) {
          const bg = getComputedStyle(card).backgroundImage || '';
          const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (m) src = m[1];
        }
        return { name: t.querySelector('.hg-tname').textContent.trim(), src };
      });
      groups.push({ tag: g.querySelector('.hg-group-tag').textContent.trim().replace(/\s+/g, ''), tiles });
    }
    // 逐张加载验证
    const checks = await Promise.all(groups.flatMap(g => g.tiles).map(t => new Promise(res => {
      if (!t.src) return res({ ...t, loaded: false, why: 'no-src' });
      const im = new Image();
      im.onload = () => res({ ...t, loaded: im.naturalWidth > 0, nat: im.naturalWidth + 'x' + im.naturalHeight });
      im.onerror = () => res({ ...t, loaded: false, why: '404' });
      im.src = t.src;
    })));
    const tab = document.querySelector('#help-modal .hg-tab[data-tab="plants"]').textContent.trim();
    return { groups, checks, tab };
  });
  await p.evaluate(() => { document.getElementById('help-modal').style.display = 'none'; });

  const classic = guide.groups.find(g => /经典/.test(g.tag));
  const fusion = guide.groups.find(g => /融合/.test(g.tag));
  ok(!!classic && classic.tiles.length === 36, `A1 经典区 36 条（实测 ${classic ? classic.tiles.length : 'missing'}）`);
  ok(!!fusion && fusion.tiles.length === 56, `A2 融合区 56 条（实测 ${fusion ? fusion.tiles.length : 'missing'}）`);
  ok(/92/.test(guide.tab), `A3 页签总数 92（${guide.tab}）`);

  const bad = guide.checks.filter(t => !t.loaded);
  ok(bad.length === 0, `B1 图鉴 92 条立绘全部可加载（坏图 ${bad.length}${bad.length ? '：' + bad.slice(0, 8).map(t => t.name + '(' + (t.why || '?') + ')').join(', ') : ''}）`);

  const nameCount = {};
  guide.checks.forEach(t => { nameCount[t.name] = (nameCount[t.name] || 0) + 1; });
  const dupNames = Object.keys(nameCount).filter(n => nameCount[n] > 1);
  ok(dupNames.length === 0, `B2 图鉴无重名（重复：${dupNames.join(',') || '无'}）`);

  const fusionNames = new Set(fusion.tiles.map(t => t.name));
  const classicNames = new Set(classic.tiles.map(t => t.name));

  // ---------- 配方表 ----------
  const rec = await p.evaluate(() => {
    const g = window._pvzGame;
    const EXTRA = window.PVZ_FUSION_EXTRA || [];
    const seedTypes = new Set(g.seeds.map(s => s.type));
    const resultsFromSeeds = new Set(['repeater', 'threepeater', 'gatlingpea', 'twinsunflower', 'fumeshroom',
      'snowpea', 'splitpea', 'wintermelon', 'cattail', 'sunshroom', 'gloomshroom', 'spikerock',
      'scaredyshroom', 'torchwood', 'starfruit', 'hypnoshroom', 'pumpkinhead']);
    EXTRA.forEach(f => resultsFromSeeds.add(f.type));
    const validIds = new Set([...seedTypes, ...resultsFromSeeds]);

    const tc = {};
    EXTRA.forEach(f => { tc[f.type] = (tc[f.type] || 0) + 1; });

    // 全种子矩阵 → 所有可合成产物
    const seeds = g.seeds.map(s => s.type);
    const produced = {};   // type -> [{a,b}]
    for (const a of seeds) {
      for (const bb of seeds) {
        const r = g.getFusionResult(a, bb);
        if (!r) continue;
        (produced[r] = produced[r] || []).push([a, bb]);
      }
    }

    const rows = EXTRA.map(f => {
      let got = null, err = null;
      try { got = g.getFusionResult(f.a, f.b); } catch (e) { err = e.message; }
      return { type: f.type, name: f.name, a: f.a, b: f.b, aOk: validIds.has(f.a), bOk: validIds.has(f.b),
               got, match: got === f.type, err };
    });

    // 产物中文名 + 实例化
    const prodRows = Object.keys(produced).map(type => {
      let zh = null, hp = null, src = '', err = null;
      try { zh = g.getPlantName(type); } catch (e) { err = e.message; }
      try {
        const host = document.createElement('div');
        const pl = new Plant({ entityLayer: host, board: g.board, audioManager: g.audioManager, container: host }, type);
        hp = pl.hp; src = pl.element.getAttribute('src') || '';
        if (pl.element && pl.element.parentNode) pl.element.remove();
      } catch (e) { err = err || e.message; }
      return { type, zh, hp, src, err, named: !!zh && zh !== type };
    });

    return { extraCount: EXTRA.length, dupTypes: Object.keys(tc).filter(t => tc[t] > 1), rows,
             prodRows, seedCount: seeds.length, seedTypes: [...seedTypes] };
  });

  ok(rec.dupTypes.length === 0, `C1 融合配方 type 唯一（重复：${rec.dupTypes.join(',') || '无'}，共 ${rec.extraCount} 条）`);
  const badAb = rec.rows.filter(r => !r.aOk || !r.bOk);
  ok(badAb.length === 0, `C2 配方材料都是场上可种植物（越界 ${badAb.length}${badAb.length ? '：' + badAb.map(r => `${r.name}(${r.a}+${r.b})`).join(',') : ''}）`);
  const mismatch = rec.rows.filter(r => !r.match);
  ok(mismatch.length === 0, `D1 每条配方都合得出自己（${mismatch.length}${mismatch.length ? '：' + mismatch.map(r => `${r.name}→${r.got}`).join(',') : ''}）`);

  // ---------- 产物 ----------
  const noName = rec.prodRows.filter(r => !r.named);
  ok(noName.length === 0, `E1 所有可合成产物都有中文名（无名 ${noName.length}：${noName.map(r => r.type).join(',') || '无'}）`);
  const instErr = rec.prodRows.filter(r => r.err);
  ok(instErr.length === 0, `E2 所有可合成产物都能实例化（失败 ${instErr.length}：${instErr.map(r => r.type + ':' + r.err).join('; ') || '无'}）`);
  const noHp = rec.prodRows.filter(r => !r.err && (!r.hp || r.hp <= 0));
  ok(noHp.length === 0, `E3 所有产物血量正常（hp<=0：${noHp.map(r => r.type).join(',') || '无'}）`);
  const noArt = rec.prodRows.filter(r => !r.err && !r.src);
  ok(noArt.length === 0, `E4 所有产物都有立绘（缺：${noArt.map(r => r.type).join(',') || '无'}）`);

  // ---------- 图鉴 ↔ 配方 双向 ----------
  const prodZh = new Set(rec.prodRows.map(r => r.zh).filter(Boolean));
  // 配方产物里有一部分本身就是「经典植物」（双发豌豆/冰西瓜投手/猫尾草……），它们登记在经典区，
  // 不算"融合区漏登"。只检查既不在经典区、也不在融合区的。
  const missingInGuide = [...prodZh].filter(n => !fusionNames.has(n) && !classicNames.has(n));
  ok(missingInGuide.length === 0,
    `F1 所有配方产物都在图鉴里（既不在融合区也不在经典区的：${missingInGuide.length}：${missingInGuide.join(',') || '无'}）`);

  const extraNames = rec.rows.map(r => r.name);
  const extraNotInGuide = extraNames.filter(n => !fusionNames.has(n));
  ok(extraNotInGuide.length === 0,
    `F2 PVZ_FUSION_EXTRA 的 ${extraNames.length} 条融合全在图鉴里（缺 ${extraNotInGuide.length}：${extraNotInGuide.join(',') || '无'}）`);

  const unreachable = [...fusionNames].filter(n => !prodZh.has(n) && n !== '玉米加农炮');
  ok(unreachable.length === 0,
    `F3 图鉴里的每条融合都能被某个配方合成（合不出的 ${unreachable.length}：${unreachable.join(',') || '无'}）`);

  console.log(`\n合计 ${pass} PASS / ${fail} FAIL`);
  console.log('种子池', rec.seedCount, '| 可合成产物', rec.prodRows.length, '| 页面报错', errs.length ? errs : '无');
  await b.close();
})();
