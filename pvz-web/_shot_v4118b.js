// 截图：① 图鉴里的「寒冰高坚果」与「寒冰坚果」并排；② 守屋豌豆链 tier4(紫)/tier5(原色) 对比
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
  await p.setViewport({ width: 1280, height: 860 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');

  // ---------- ① 图鉴 ----------
  await p.waitForFunction('!!document.getElementById("btn-help-guide")');
  await p.evaluate(() => {
    document.getElementById('btn-help-guide').click();
    document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click();
  });
  await sleep(500);
  const pos = await p.evaluate(() => {
    const t = [...document.querySelectorAll('#help-body .hg-tile')].find(x => x.querySelector('.hg-tname').textContent.trim() === '寒冰高坚果');
    if (!t) return null;
    t.scrollIntoView({ block: 'center' });
    const r = t.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  await sleep(500);
  await p.screenshot({ path: '_v4118_guide_snowtallnut.png' });
  console.log('图鉴格位置', JSON.stringify(pos));

  // ---------- ② 守屋 ----------
  await p.evaluate(() => {
    document.querySelector('#help-modal').style.display = 'none';
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await p.waitForFunction('window.game && window.game.ais.length > 0');
  await sleep(9000); // 等开场大字公告飘走
  const made = await p.evaluate(() => {
    const g = window.game;
    const free = [];
    for (const rm of g.rooms) {
      for (let r = rm.y; r < rm.y + rm.h; r++) {
        for (let c = rm.x; c < rm.x + rm.w; c++) {
          if (g.walls.has(c + ',' + r)) continue;
          if (g.getPlantAt(c * 80 + 40, r * 80 + 40)) continue;
          if (g._insideRoom(c, r) !== rm) continue;
          free.push([c, r]);
        }
      }
      if (free.length >= 8) break;
    }
    const out = [];
    ['dualpea', 'bidipea', 'nutlv8'].forEach((id, i) => {
      const pl = g.spawnPlant(free[i][0], free[i][1], id, false, g.player);
      if (pl) {
        const img = pl.el1.querySelector('img');
        out.push({ id, name: pl.def.name, cell: free[i], filter: img.style.filter || '(none)' });
      }
    });
    g.player.x = free[0][0] * 80 + 40 + 240; g.player.y = free[0][1] * 80 + 40;
    return out;
  });
  console.log(JSON.stringify(made));
  await sleep(1200);
  // 裁一块以这些植物为中心的区域（相机以玩家为中心，取玩家左侧）
  const clip = await p.evaluate(() => {
    const g = window.game;
    const el = document.getElementById('dorm-screen');
    return { ok: !!el };
  });
  await p.screenshot({ path: '_v4118_dorm_ladder.png' });
  await b.close();
})();
