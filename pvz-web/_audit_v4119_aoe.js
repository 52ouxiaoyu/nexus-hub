// v4.0.119 多方位巡检：其余「范围/爆炸类」植物有没有同样被削坏（只炸一只 / 范围丢失）
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
  await p.setViewport({ width: 1280, height: 820 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await p.evaluate(() => { document.getElementById('btn-fusion').click(); });
  await sleep(400);
  await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    const picked = [];
    for (const c of cards) { if (picked.length >= 8) break; c.click(); picked.push(c.dataset.type); }
    document.getElementById('btn-lets-rock').click();
  });
  await sleep(1500);

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

  // 通用：清场 → 在 (row2,col4) 摆 explosive → 周围摆一圈 normal → 等爆炸 → 统计
  const run = (type, spots, waitMs) => p.evaluate(async ({ type, spots, waitMs }) => {
    const g = window._pvzGame, bd = g.board;
    for (const e of [...g.entities]) { if (e.element && e.element.parentNode) e.element.remove(); }
    g.entities.length = 0;
    for (let r = 0; r < bd.rows; r++) for (let c = 0; c < bd.cols; c++) bd.grid[r][c] = null;
    const plant = new Plant(g, type);
    plant.row = 2; plant.col = 4;
    plant.x = bd.offsetX + 4 * bd.cellWidth + 40;
    plant.y = bd.offsetY + 2 * bd.cellHeight + bd.cellHeight / 2;
    bd.grid[2][4] = plant;
    g.entities.push(plant);
    const zs = spots.map(([row, col]) => {
      const z = new Zombie(g, row, 'normal');
      z.x = bd.offsetX + col * bd.cellWidth + 40;
      z.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2 - 20;
      z.speed = 0;
      g.entities.push(z);
      return z;
    });
    await new Promise(r => setTimeout(r, waitMs));
    return {
      type, dead: zs.map(z => z.state === 'DYING' || z.isDead || z.hp <= 0),
      hp: zs.map(z => Math.round(z.hp)),
      plantState: plant.state, plantHp: Math.round(plant.hp)
    };
  }, { type, spots, waitMs });

  // ① 樱桃炸弹：3×3（中心 ±1 行 / ±1 列）
  const cherry = await run('cherrybomb',
    [[1, 4], [2, 4], [3, 4], [2, 3], [2, 5], [0, 4], [2, 7]], 1800);
  ok(cherry.dead.slice(0, 5).every(Boolean),
     `① 樱桃炸弹 3×3 全灭（5/5，hp=${cherry.hp.slice(0, 5)}）`);
  ok(!cherry.dead[6], `①b 隔 3 列的僵尸没事（hp=${cherry.hp[6]}）`);

  // ② 火爆辣椒：整行（row 2 上的全部）
  const jal = await run('jalapeno',
    [[2, 1], [2, 4], [2, 8], [1, 4]], 1800);
  ok(jal.dead[0] && jal.dead[1] && jal.dead[2],
     `② 火爆辣椒烧穿整行（同排 3 只全灭：${jal.hp.slice(0, 3)}）`);
  ok(!jal.dead[3], `②b 相邻行的僵尸不受影响（hp=${jal.hp[3]}）`);

  // ③ 毁灭菇：大范围（行 ±1、列 ±2 以上）
  const doom = await run('doomshroom',
    [[1, 2], [2, 4], [3, 6], [0, 4], [2, 8]], 2200);
  ok(doom.dead.filter(Boolean).length >= 4,
     `③ 毁灭菇大范围清场（${doom.dead.filter(Boolean).length}/5 死亡，hp=${doom.hp}）`);

  // ④ 寒冰菇：全场冻结（不死但全部减速）
  const ice = await run('iceshroom',
    [[0, 1], [2, 4], [4, 8]], 1800);
  const slowed = await p.evaluate(() => window._pvzGame.entities.filter(e => e.type === 'normal').map(z => !!z.isSlowed || (z.slowTimer || 0) > 0));
  ok(ice.hp.every(h => h > 0), `④ 寒冰菇不造成伤害（hp=${ice.hp}，符合原版）`);
  ok(slowed.filter(Boolean).length >= 2, `④b 寒冰菇冻结全场（${slowed.filter(Boolean).length}/3 被冻）`);

  // ⑤ 西瓜投手：直击 + 3×3 溅射
  const melonRes = await p.evaluate(async () => {
    const g = window._pvzGame, bd = g.board;
    for (const e of [...g.entities]) { if (e.element && e.element.parentNode) e.element.remove(); }
    g.entities.length = 0;
    for (let r = 0; r < bd.rows; r++) for (let c = 0; c < bd.cols; c++) bd.grid[r][c] = null;
    const pl = new Plant(g, 'melonpult');
    pl.row = 2; pl.col = 1;
    pl.x = bd.offsetX + 1 * bd.cellWidth + 40;
    pl.y = bd.offsetY + 2 * bd.cellHeight + bd.cellHeight / 2;
    bd.grid[2][1] = pl; g.entities.push(pl);
    const zs = [[2, 6], [2, 7], [1, 6]].map(([row, col]) => {
      const z = new Zombie(g, row, 'normal');
      z.x = bd.offsetX + col * bd.cellWidth + 40;
      z.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2 - 20;
      z.speed = 0;
      g.entities.push(z);
      return z;
    });
    await new Promise(r => setTimeout(r, 4200));
    return { hp: zs.map(z => Math.round(z.hp)) };
  });
  ok(melonRes.hp.filter(h => h < 200).length >= 2,
     `⑤ 西瓜投手直击+溅射都生效（3 只血量 ${melonRes.hp}）`);

  ok(errs.length === 0, `⑥ 全程 0 页面报错（${errs.join('; ') || '无'}）`);
  console.log(`\n合计 ${pass} PASS / ${fail} FAIL`);
  await b.close();
})();
