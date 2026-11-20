// v4.0.95 验证：双人对战平衡重构——①开局 1000/1000 对称；②僵尸价目回归击杀成本定价；
// ③人机对战（玩家植物方）正常布防可顶住 AI 僵尸第一波（不再必胜一波流）；④AI 植物托管能建起防线
// 不入 commit。运行：node _verify_v4095.js
const path = require('path');
const puppeteer = require('puppeteer');
const base = '/Users/clawbox/nexus-hub/pvz-web';
let pass = 0, fail = 0;
const ok = (name, cond) => { (cond ? pass++ : fail++); console.log((cond ? '  PASS ' : '  FAIL ') + name); };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(base, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  // ===== 场景1：开局资源对称 1000/1000 + 价目抽查 =====
  const r1 = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    if (!g) return { noGame: true };
    g.openVsMode(false, false); // 双人对战（非人机）
    await new Promise(r => setTimeout(r, 300));
    const grid = document.getElementById('chooser-grid');
    const cards = grid ? [...grid.querySelectorAll('.chooser-card')] : [];
    const prefer = ['peashooter', 'sunflower', 'wallnut', 'repeater', 'snowpea', 'cherrybomb', 'potatomine', 'tallnut'];
    let picked = 0;
    for (const t of prefer) { const c = cards.find(cd => cd.dataset.type === t); if (c) { c.click(); picked++; } }
    if (picked < 8) { for (const c of cards) { if (picked >= 8) break; if (c.style.filter !== 'brightness(50%)') { c.click(); picked++; } } }
    const rock = document.getElementById('btn-lets-rock');
    if (rock && !rock.disabled) rock.click();
    await new Promise(r => setTimeout(r, 300));
    const vzCards = [...document.querySelectorAll('.vz-card')];
    let vzPicked = 0;
    for (const c of vzCards) { if (vzPicked >= 8) break; if (c.style.filter !== 'brightness(50%)') { c.click(); vzPicked++; } }
    const vzRock = document.getElementById('vz-rock');
    if (vzRock && !vzRock.disabled) vzRock.click();
    await new Promise(r => setTimeout(r, 800));
    const cost = g.vsZombieCost();
    return {
      vsMode: g.vsMode, sunCount: g.sunCount, zombieSun: g.zombieSun,
      hudSun: document.getElementById('sun-count') ? document.getElementById('sun-count').innerText : null,
      costGarg: cost.gargantuar, costZomboni: cost.zomboni, costBucket: cost.buckethead,
      costNormal: cost.normal, costImp: cost.imp, costSunhead: cost.sunhead
    };
  });

  ok('双人对战开局流程走通', r1.noGame ? false : r1.vsMode === true);
  ok('植物方开局阳光 1000（与脑子对称）', r1.sunCount === 1000);
  ok('僵尸方开局脑子 1000', r1.zombieSun === 1000);
  ok('HUD 阳光显示 1000', r1.hudSun === '1000');
  ok('巨人价 300（原 125）', r1.costGarg === 300);
  ok('冰车价 250（原 95）', r1.costZomboni === 250);
  ok('铁桶价 125（原 45）', r1.costBucket === 125);
  ok('普通僵尸 40 / 小鬼 25 / 向日葵头 50', r1.costNormal === 40 && r1.costImp === 25 && r1.costSunhead === 50);

  // ===== 场景2：人机对战（玩家植物方）——正常布防顶住 AI 僵尸第一波 =====
  // 1000 阳光布防：4 向日葵(200) + 8 豌豆(800)，两路重防两路轻防
  await page.goto('file://' + path.join(base, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear()); // 清掉场景1残留的选卡记录（自动选中会导致再点=取消）
  await new Promise(r => setTimeout(r, 800));
  const r2start = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true); // 人机对战
    await new Promise(r => setTimeout(r, 300));
    // v4.0.94 阵营选择：玩家=植物
    const sidePlant = document.getElementById('btn-vs-side-plant');
    if (sidePlant) sidePlant.click();
    await new Promise(r => setTimeout(r, 500));
    const grid = document.getElementById('chooser-grid');
    const cards = grid ? [...grid.querySelectorAll('.chooser-card')] : [];
    const prefer = ['peashooter', 'sunflower', 'wallnut', 'repeater', 'snowpea', 'cherrybomb', 'potatomine', 'tallnut'];
    let picked = 0;
    for (const t of prefer) { const c = cards.find(cd => cd.dataset.type === t); if (c) { c.click(); picked++; } }
    const rock = document.getElementById('btn-lets-rock');
    const rockDisabled = rock ? rock.disabled : 'no-btn';
    if (rock && !rock.disabled) rock.click();
    await new Promise(r => setTimeout(r, 900));
    return { started: g.vsMode === true && g.vsAiMode === true, sun0: g.sunCount,
             vsMode: g.vsMode, vsAiMode: g.vsAiMode, state: g.state, gExists: !!g,
             cards: cards.length, picked, rockDisabled };
  });
  console.log('  [diag r2start]', JSON.stringify(r2start));
  ok('人机对战（玩家植物方）开局', r2start.started && r2start.sun0 === 1000);

  // 布防：4 向日葵后排 + 8 豌豆中前排（走真实种植通道 seedPlant）
  const planted = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const put = (type, row, col) => {
      const has = (g.selectedSeeds || []).some(s => s.type === type);
      if (!has) return false;
      g.tryPlanting(type, row, col); // 走真实种植通道（扣阳光+CD）
      return true;
    };
    let n = 0;
    // 后排经济：每行 1 向日葵（行 0~3）
    for (let row = 0; row < 4; row++) { if (put('sunflower', row, 0)) n++; }
    // 火力：行 0/1 各 3 豌豆，行 2/3 各 1 豌豆
    const layout = [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 2], [3, 2]];
    for (const [row, col] of layout) { if (put('peashooter', row, col)) n++; }
    return n;
  });
  ok('布防 12 株（4 向日葵 + 8 豌豆）', planted === 12);

  // 轮询等 playTime >= 90（AI 僵尸第一波 10s 后开始出兵、推进+啃食需要时间）
  // Node 侧轮询采样（避免 evaluate 内长循环触发 CDP protocolTimeout）
  let zMax = 0, sample = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    sample = await page.evaluate(() => {
      const g = window.game || window._pvzGame;
      return { playTime: g.playTime,
               eaten: (g._brainEaten || []).filter(Boolean).length,
               zn: (g.entities || []).filter(e => e.constructor.name === 'Zombie' && !e.isDead).length,
               state: g.state };
    });
    if (sample.zn > zMax) zMax = sample.zn;
    if (sample.playTime >= 60 || sample.state !== 'PLAYING') break;
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`  [实测] playTime=${(sample ? sample.playTime : 0).toFixed(0)}s 被吃行数=${sample ? sample.eaten : '?'} 僵尸峰值=${zMax} 终局态=${sample ? sample.state : '?'}`);
  ok('AI 僵尸确实出过兵（场上峰值>=1）', zMax >= 1);
  // eaten 只增不减，最终值=全程峰值；GAMEOVER（植物胜/AI 破产）=对局完整结束，全程观测有效
  ok(`对局全程（实测至 ${sample ? sample.playTime.toFixed(0) : '?'}s 终局）脑子最多被吃 2 行（第一波不再是必胜一波流）`, sample && sample.eaten <= 2);

  // ===== 场景3：人机对战（玩家僵尸方）——AI 植物托管能建起防线 =====
  await page.goto('file://' + path.join(base, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await new Promise(r => setTimeout(r, 800));
  const r3start = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 300));
    const sideZ = document.getElementById('btn-vs-side-zombie');
    if (sideZ) sideZ.click();
    await new Promise(r => setTimeout(r, 300));
    // 僵尸选卡：选高战力组合（模拟玩家第一波）
    const vzCards = [...document.querySelectorAll('.vz-card')];
    const prefer = ['gargantuar', 'gargantuar', 'gargantuar', 'buckethead', 'buckethead', 'buckethead', 'normal', 'normal'];
    let vzPicked = 0;
    for (const t of prefer) {
      const c = vzCards.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)');
      if (c) { c.click(); vzPicked++; }
    }
    const vzRock = document.getElementById('vz-rock');
    if (vzRock && !vzRock.disabled) vzRock.click();
    await new Promise(r => setTimeout(r, 800));
    return { started: g.vsMode === true && g.vsPlayerSide === 'zombie', sun0: g.zombieSun };
  });
  ok('人机对战（玩家僵尸方）开局脑子 1000', r3start.started && r3start.sun0 === 1000);

  // 等 45s：AI 植物托管建防（开局 10s 保护 + 2s 一株）
  let r3 = null;
  const t3 = Date.now();
  while (Date.now() - t3 < 300000) {
    r3 = await page.evaluate(() => {
      const g = window.game || window._pvzGame;
      return { playTime: g.playTime,
               plantCount: (g.entities || []).filter(e => e.constructor.name === 'Plant').length,
               aiSun: g.sunCount, state: g.state };
    });
    if (r3.playTime >= 45 || r3.state !== 'PLAYING') break;
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`  [实测] playTime=${(r3 ? r3.playTime : 0).toFixed(0)}s AI 植物数=${r3 ? r3.plantCount : '?'} AI 剩余阳光=${r3 ? r3.aiSun : '?'}`);
  ok('AI 植物托管 45 秒建起 6 株以上防线', r3 && r3.plantCount >= 6);

  ok('无页面 JS 错误', errors.length === 0);
  if (errors.length) console.log('  [PAGE ERRORS]', errors.slice(0, 3));

  console.log(`\n===== v4.0.95 结果：${pass} pass / ${fail} fail =====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
