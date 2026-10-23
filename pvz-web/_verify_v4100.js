// v4.0.100 验证：双人对战植物方开局阳光 1000→300（用户实测仍不均衡，双方对称 300/300 纯拼运营）
const path = require('path');
const puppeteer = require('puppeteer');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', String(e).slice(0, 200)));
  await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);

  // ===== T1 玩家植物方开局：☀300 / 🧠300，播报含新数字 =====
  const t1 = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-plant').click();
    await new Promise(r => setTimeout(r, 500));
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    for (const t of ['peashooter', 'sunflower', 'wallnut', 'repeater', 'snowpea', 'cherrybomb', 'potatomine', 'tallnut']) {
      const c = cards.find(cd => cd.dataset.type === t); if (c) c.click();
    }
    document.getElementById('btn-lets-rock').click();
    await new Promise(r => setTimeout(r, 900));
    return {
      sun: g.sunCount, brain: g.zombieSun, vsMode: g.vsMode === true && g.vsAiMode === true,
      sunEl: document.getElementById('sun-count') ? document.getElementById('sun-count').innerText : '',
      giantCost: g.vsZombieCost()['gargantuar'],
      ann: g.announcementUI ? g.announcementUI.innerText : ''
    };
  });
  ok('T1a 人机对战（玩家植物方）开局 ☀300（旧1000）', t1.vsMode && t1.sun === 300);
  ok(`T1b 僵尸方开局 🧠300（实测 ${t1.brain}）`, t1.brain === 300);
  ok('T1c 顶栏阳光显示 300', t1.sunEl === '300');
  ok('T1d 开局播报含 ☀300 与 🧠300（无 ☀1000）', t1.ann.includes('☀300') && t1.ann.includes('🧠300') && !t1.ann.includes('☀1000'));

  // ===== T2 300 ☀ 购买力：高价值的巨人杀手级植物要省着花 =====
  const t2 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { sun: g.sunCount, giantCost: g.vsZombieCost()['gargantuar'] };
  });
  ok('T2a 巨人价目仍为 300', t2.giantCost === 300);

  // ===== T3 玩家僵尸方开局（重开一局）：☀300 / 🧠300，15s 保护期后召唤扣费 =====
  await page.evaluate(() => { const g = window.game || window._pvzGame; g.state = 'GAMEOVER'; });
  await sleep(500);
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);
  const t4 = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-zombie').click();
    await new Promise(r => setTimeout(r, 500));
    const vz = [...document.querySelectorAll('.vz-card')];
    for (const t of ['normal', 'conehead', 'imp', 'buckethead', 'newspaper', 'sunhead', 'football', 'gargantuar']) {
      const c = vz.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)'); if (c) c.click();
    }
    const rock = document.getElementById('vz-rock');
    if (rock && !rock.disabled) rock.click();
    await new Promise(r => setTimeout(r, 900));
    const brain0 = g.zombieSun, sun0 = g.sunCount;
    // 等 15s 保护期结束后手动召唤巨人，实测扣费 300→0
    const t0 = Date.now();
    while (g.playTime < 15.5 && g.state === 'PLAYING' && Date.now() - t0 < 40000)
      await new Promise(r => setTimeout(r, 500));
    const before = g.zombieSun;
    g.deployZombie('gargantuar', 0);
    return { playing: g.state === 'PLAYING', before, after: g.zombieSun, brain0, sun0 };
  });
  console.log('  [diag T3]', JSON.stringify(t4));
  ok('T3a 玩家僵尸方开局 🧠300（植物 AI ☀300）', t4.playing && t4.brain0 === 300 && t4.sun0 === 300);
  ok(`T3b 玩家召唤巨人扣费 ${t4.before}→${t4.after}`, t4.before === 300 && t4.after === 0);

  await browser.close();
  console.log(`\n${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
