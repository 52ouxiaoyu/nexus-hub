// v4.0.119 截图：玉米加农炮发射动作（抬炮口 + 炮口白烟）→ 空中翻滚 → 落地爆炸 + 原版 BlastMark 痕迹
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

  // 清场 → 摆一队僵尸（普通/铁桶/巨人）在 col 5~7，玉米炮在 row 2 col 1~2
  const setup = await p.evaluate(() => {
    const g = window._pvzGame;
    for (const e of [...g.entities]) { if (e.element && e.element.parentNode) e.element.remove(); }
    g.entities.length = 0;
    for (let r = 0; r < g.board.rows; r++) for (let c = 0; c < g.board.cols; c++) g.board.grid[r][c] = null;
    const bd = g.board;
    const cob = g._spawnCobCannon(2, 1);
    cob.chargeReady = true; cob.chargeTimer = 0;
    cob._showCobShell(true);
    const spots = [[1, 5, 'normal'], [2, 5, 'normal'], [3, 5, 'normal'], [2, 6, 'buckethead'], [1, 6, 'conehead'], [3, 6, 'gargantuar']];
    window.__zs = spots.map(([row, col, type]) => {
      const z = new Zombie(g, row, type);
      z.x = bd.offsetX + col * bd.cellWidth + 40;
      z.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2 - 20;
      z.speed = 0;
      g.entities.push(z);
      return z;
    });
    window.__cob = cob;
    g.sunCountElement.innerText = '9999';
    return { cob: [cob.x, cob.y], zs: window.__zs.map(z => z.type) };
  });
  console.log('setup', JSON.stringify(setup));
  await sleep(300);
  await p.screenshot({ path: '_v4119_0_loaded.png' });   // 装填完毕（炮口有玉米）

  // 发射
  await p.evaluate(() => {
    const g = window._pvzGame, cob = window.__cob, bd = g.board;
    cob.fireCob(bd.offsetX + 5.5 * bd.cellWidth, bd.offsetY + 2 * bd.cellHeight + bd.cellHeight / 2);
  });
  await sleep(110);
  await p.screenshot({ path: '_v4119_1_lift.png' });     // 抬起炮口 + 白烟
  await sleep(230);
  await p.screenshot({ path: '_v4119_2_fly.png' });      // 空中翻滚
  await sleep(560);
  await p.screenshot({ path: '_v4119_3_boom.png' });     // 落地爆炸
  await sleep(1400);
  await p.screenshot({ path: '_v4119_4_mark.png' });     // 痕迹清楚

  const info = await p.evaluate(() => {
    const g = window._pvzGame;
    return {
      marks: [...document.querySelectorAll('.cob-blastmark')].map(m => ({ src: m.getAttribute('src'), w: m.style.width })),
      scorch: document.querySelectorAll('.cob-scorch').length,
      dead: window.__zs.filter(z => z.state === 'DYING' || z.isDead).length,
      total: window.__zs.length,
      transform: (g.entities.find(e => e.type === 'cobcannon') || {}).element?.style.transform
    };
  });
  console.log('info', JSON.stringify(info));
  console.log('errors', errs);
  await b.close();
})();
