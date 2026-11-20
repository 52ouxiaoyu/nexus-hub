// v4.0.105 回归：1p 单人模式人机照常入住钉床；2p 60 秒无一人机离房
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const errs = [];
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const launch = () => puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
  userDataDir: '/tmp/pptr-prof-' + Date.now()
});

async function boot(mode) {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push((e.stack || String(e)).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate((md) => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: md, faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  }, mode);
  await page.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await page.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999;
    if (g.player2) g.player2.invincibleT = 999999;
    window._keep = setInterval(() => {
      g.player._lastInputAt = performance.now();
      if (g.player2) g.player2._lastInputAt = performance.now();
    }, 300);
  });
  return { browser, page };
}

(async () => {
  // ---------- A. 单人 1p ----------
  {
    const { browser, page } = await boot('1p');
    await page.waitForFunction(`(() => { const g = window.game; return g.ais.every(a => a.dead || !!a.room); })()`, { timeout: 70000 });
    await sleep(4000);
    const a = await page.evaluate(() => {
      const g = window.game;
      return {
        ais: g.ais.map(a => {
          const rm = a.room;
          const bed = rm ? { x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 } : null;
          return { dead: !!a.dead, hasRoom: !!rm, pinned: !!a.pinned, dist: bed ? Math.round(Math.hypot(a.x - bed.x, a.y - bed.y)) : -1 };
        }),
        plants: g.plants.length, aiPlants: g.plants.filter(p => p.owner && p.owner.isAi).length,
        mode: g.gameMode
      };
    });
    ok(`A1 1p 模式人机全部入住（${a.ais.filter(x => x.hasRoom).length}/${a.ais.length}）`, a.ais.every(x => x.dead || x.hasRoom));
    ok(`A2 1p 人机全部钉床在床位（pinned=${a.ais.map(x => x.pinned).join(',')}，dist=${a.ais.map(x => x.dist).join(',')}）`,
      a.ais.every(x => x.dead || (x.pinned && x.dist <= 3)));
    ok(`A3 1p 人机持续发育（AI 植物 ${a.aiPlants} 株）`, a.aiPlants >= 3);
    await browser.close();
  }

  // ---------- B. 双人 2p 60 秒稳定性：无人离房 ----------
  {
    const { browser, page } = await boot('2p');
    await page.waitForFunction(`(() => { const g = window.game; return g.ais.every(a => a.dead || !!a.room); })()`, { timeout: 70000 });
    await sleep(1500);
    await page.evaluate(() => {
      const g = window.game;
      window._left = [];
      window._watch = g.ais.map(a => ({ rm: a.room, inRoom: true }));
    });
    for (let i = 0; i < 120; i++) {
      await sleep(500);
      await page.evaluate(() => {
        const g = window.game;
        g.ais.forEach((a, k) => {
          const rec = window._watch[k];
          if (!rec.rm) return;
          const c = Math.floor(a.x / 80), r = Math.floor(a.y / 80);
          const inside = c >= rec.rm.x && c < rec.rm.x + rec.rm.w && r >= rec.rm.y && r < rec.rm.y + rec.rm.h;
          const door = g.getPlantAt(rec.rm.doorCol * 80, rec.rm.doorRow * 80);
          // 门还在（没被啃破）却离开房间 = 异常
          if (rec.inRoom && !inside && door && !a.fleeing && !a.targetDrop) {
            window._left.push({ t: k, ai: k, x: Math.round(a.x), y: Math.round(a.y), path: a.path ? a.path.length : 0 });
          }
          rec.inRoom = inside;
          if (a.room) rec.rm = a.room;
        });
      });
    }
    const b = await page.evaluate(() => {
      const g = window.game;
      return {
        left: window._left,
        ais: g.ais.map(a => ({ dead: !!a.dead, pinned: !!a.pinned, hasRoom: !!a.room, path: a.path ? a.path.length : 0 })),
        aiPlants: g.plants.filter(p => p.owner && p.owner.isAi).length,
        time: Math.round(g.gameTime / 1000)
      };
    });
    ok(`B1 60 秒内无人机无端离房（记录 ${b.left.length} 次）` + (b.left.length ? ' 首次=' + JSON.stringify(b.left[0]) : ''), b.left.length === 0);
    ok(`B2 存活人机全部留在自家房内（${b.ais.filter(x => x.hasRoom).length}/${b.ais.length} 有房，${b.ais.filter(x => x.pinned).length} 钉床）`,
      b.ais.every(x => x.dead || (x.hasRoom && x.pinned)));
    ok(`B3 人机持续建造（AI 植物 ${b.aiPlants} 株，游戏内 ${b.time}s）`, b.aiPlants >= 3);
    await browser.close();
  }

  ok('C 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);
  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
