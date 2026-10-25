// v4.0.119 诊断：玉米加农炮只砸死一只僵尸（范围伤害失效）
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
  await p.setViewport({ width: 1400, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0' });
  await sleep(1200);

  // 走真实流程进融合关卡（主循环只在真实开局后启动，手改 state 不会跑 update）
  await p.evaluate(() => { document.getElementById('btn-fusion').click(); });
  await sleep(400);
  await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    // 选 8 张：优先玉米投手/向日葵/豌豆等基础
    const want = ['kernelpult', 'sunflower', 'peashooter', 'wallnut', 'cabbagepult', 'snowpea', 'cherrybomb', 'melonpult'];
    const picked = [];
    for (const t of want) {
      const c = cards.find(x => x.dataset.type === t && !x.classList.contains('disabled'));
      if (c) { c.click(); picked.push(t); }
    }
    for (const c of cards) { if (picked.length >= 8) break; if (!picked.includes(c.dataset.type)) { c.click(); picked.push(c.dataset.type); } }
    document.getElementById('btn-lets-rock').click();
  });
  await sleep(1500);

  // 开局：清场后摆测试场景
  const setup = await p.evaluate(() => {
    const g = window._pvzGame;
    if (g.state !== 'PLAYING') return { fail: 'not-playing', state: g.state };
    // 清掉菜单期残留实体
    for (const e of [...g.entities]) { if (e.element && e.element.parentNode) e.element.remove(); }
    g.entities.length = 0;
    for (let r = 0; r < g.board.rows; r++) for (let c = 0; c < g.board.cols; c++) g.board.grid[r][c] = null;
    g.waveManager.zombiesSpawned = 0;
    g.sunCount = 5000;
    const bd = g.board;
    const cob = g._spawnCobCannon(2, 1);
    cob.chargeReady = true;
    cob.chargeTimer = 0;
    // 6 只僵尸：落点附近 3×3 内 5 只 + 远处 1 只（对照组）
    const spots = [
      [2, 5], [2, 6], [1, 5], [3, 5], [2, 7], [0, 1]
    ];
    const zs = spots.map(([row, col]) => {
      const z = new Zombie(g, row, row === 0 ? 'buckethead' : 'normal');
      z.x = bd.offsetX + col * bd.cellWidth + 40;
      z.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2 - 20;
      z.speed = 0;                 // 冻结，方便对齐判定
      // 用真实血量：普通 200 / 铁桶 1370，验证"圈内全灭"而不是"只死一只"
      g.entities.push(z);
      return z;
    });
    window.__zs = zs; window.__cob = cob;
    return { cobPos: [cob.x, cob.y], zs: zs.map(z => ({ row: z.row, x: Math.round(z.x), hp: z.hp })) };
  });
  console.log('setup', JSON.stringify(setup));

  // 落点 = 僵尸群中心（col5~6 之间）
  const fire = await p.evaluate(() => {
    const g = window._pvzGame, cob = window.__cob, bd = g.board;
    const tx = bd.offsetX + 5 * bd.cellWidth + bd.cellWidth;  // 两格之间
    const ty = bd.offsetY + 2 * bd.cellHeight + bd.cellHeight / 2;
    cob.fireCob(tx, ty);
    return { tx: Math.round(tx), ty: Math.round(ty), proj: g.entities.filter(e => e.type === 'cob').length };
  });
  console.log('fire', JSON.stringify(fire));

  // 逐帧跟踪炮弹
  const trace = [];
  for (let i = 0; i < 24; i++) {
    await sleep(120);
    trace.push(await p.evaluate(() => {
      const g = window._pvzGame;
      const cobs = g.entities.filter(e => e.type === 'cob' && !e.isDead);
      return {
        t: Date.now() % 100000,
        tr: (g.entities.find(e => e.type === 'cobcannon') || {}).element?.style.transform || '',
        cob: cobs.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), vy: Math.round(c.vy || 0), canHit: c.canHitNow ? c.canHitNow() : null })),
        zs: window.__zs.map(z => ({ hp: Math.round(z.hp), dead: !!z.isDead, state: z.state, row: z.row, x: Math.round(z.x) })),
        cinders: document.querySelectorAll('.cob-scorch').length,
        marks: [...document.querySelectorAll('.cob-blastmark')].map(m => m.getAttribute('src')),
        firing: document.querySelectorAll('.cob-firing').length,
        puffs: document.querySelectorAll('.cob-muzzle-puff').length
      };
    }));
  }
  console.log('--- trace（每 120ms）---');
  trace.forEach((t, i) => {
    console.log(i, 'cob=' + JSON.stringify(t.cob), 'dead=' + t.zs.filter(z=>z.dead).length + '/' + t.zs.length,
      'hp=' + JSON.stringify(t.zs.map(z => z.hp + ':' + z.state)),
      'puffs=' + t.puffs, 'marks=' + JSON.stringify(t.marks.map(m=>(m||'').split('/').pop())));
  });
  const last = trace[trace.length - 1];
  const dead = last.zs.filter(z => z.dead).length;
  const hurt = last.zs.filter(z => z.hp < 5000).length;
  console.log(`\n结论：死亡 ${dead}/6，受伤 ${hurt}/6`);
  console.log('errors', errs);
  await b.close();
})();
