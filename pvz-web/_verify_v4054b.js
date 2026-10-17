// v4.0.54 二修验证：①冰西瓜投手本体图 = WinterMelon/WinterMelon.png（原版投手）②Boss 血量提高（3000×2^min(waveN,6)，封顶 192000）③其余新植物 img 引用文件存在
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=sunflower');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(600);

  // ===== T1 冰西瓜投手本体图 =====
  const t1 = await p.evaluate(() => {
    const D = window.HauntedDorm.DEFS;
    const wm = D.wintermelon;
    // 种植后 DOM img src
    const g = window.game;
    let cell = null;
    for (const rm of g.rooms) {
      for (let r = rm.y; r < rm.y + rm.h; r++) {
        for (let c = rm.x; c < rm.x + rm.w; c++) {
          if (g._insideRoom(c, r) && !g.walls.has(`${c},${r}`) && !(c === rm.doorCol && r === rm.doorRow) && !g.plants.some(x => x.c === c && x.r === r)) { cell = { c, r }; break; }
        }
        if (cell) break;
      }
      if (cell) break;
    }
    g.spawnPlant(cell.c, cell.r, 'wintermelon', false, g.player);
    const pl = g.plants.find(x => x.c === cell.c && x.r === cell.r && x.type === 'wintermelon');
    const imgSrc = pl && pl.el1 ? (pl.el1.querySelector('img') ? pl.el1.querySelector('img').src : '') : '';
    return JSON.stringify({ defImg: wm.img, domImg: imgSrc.split('/').slice(-3).join('/'), fileOk: imgSrc.includes('WinterMelon/WinterMelon.png') });
  });
  const r1 = JSON.parse(t1);
  ok(r1.defImg === 'Plants/WinterMelon/WinterMelon.png', 'T1a DEFS img = 原版冰西瓜投手本体（' + r1.defImg + '）');
  ok(r1.fileOk, 'T1b 种植后 DOM 实际加载 WinterMelon/WinterMelon.png（' + r1.domImg + '）');

  // ===== T2 Boss 血量 =====
  const t2 = await p.evaluate(() => {
    const g = window.game;
    g.waveN = 5; // 第 5 波 Boss（waveN 已自增到 5）
    g._spawnBoss();
    const b = g.zombies.find(z => z.isBoss);
    const r = b ? b.maxHp : null;
    g.zombies = g.zombies.filter(z => !z.isBoss);
    return r;
  });
  ok(t2 === 96000, 'T2 第 5 波 Boss 血量 = 96000（waveN=5→3000×2^5）（' + t2 + '）');

  const t2b = await p.evaluate(() => {
    const g = window.game;
    g.waveN = 10; // 后期封顶
    g._spawnBoss();
    const b = g.zombies.find(z => z.isBoss);
    const r = b ? b.maxHp : null;
    g.zombies = g.zombies.filter(z => !z.isBoss);
    return r;
  });
  ok(t2b === 192000, 'T2b 后期 Boss 血量封顶 192000（waveN=10→3000×2^6）（' + t2b + '）');

  // ===== T3 其余新植物 img 文件存在 =====
  const t3 = await p.evaluate(() => {
    const D = window.HauntedDorm.DEFS;
    const checks = ['melonpult', 'wintermelon', 'cattail', 'superbox', 'machinestail', 'melonstail', 'icemelonstail'];
    return checks.map(t => {
      const img = D[t].img;
      // 用 fetch 检查本地文件（file:// 下 fetch 同源可用）
      return img;
    });
  });
  const fs = require('fs');
  const path = require('path');
  const okAll = t3.every(img => {
    const f = path.join('/Users/clawbox/nexus-hub/pvz-web/assets/images', img);
    return fs.existsSync(f);
  });
  ok(okAll, 'T3 新植物本体 img 全部存在（' + t3.join(', ') + '）');

  await sleep(400);
  ok(pageErrors.length === 0, 'T4 无 JS 运行错误（' + (pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'clean') + '）');

  await browser.close();
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
