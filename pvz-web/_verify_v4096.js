// v4.0.96 验证：僵尸方开局脑子 1000→300（用户实测 1000 还是不均衡；巨人 300=开局最多一只）
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

  // ===== T1 玩家植物方开局：☀1000 / 🧠300，播报含新数字 =====
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
      giantCost: g.vsZombieCost()['gargantuar'],
      ann: g.announcementUI ? g.announcementUI.innerText : ''
    };
  });
  ok('T1a 人机对战（玩家植物方）开局 ☀1000', t1.vsMode && t1.sun === 1000);
  ok(`T1b 僵尸方开局 🧠300（实测 ${t1.brain}）`, t1.brain === 300);
  ok('T1c 巨人价目仍为 300（300 恰好一只）', t1.giantCost === 300);
  ok('T1d 开局播报含 ☀1000 与 🧠300', t1.ann.includes('☀1000') && t1.ann.includes('🧠300'));

  // ===== T2 300 脑子购买力：恰好一只巨人（<2 只）=====
  const t2 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const gc = g.vsZombieCost()['gargantuar'];
    return { brain: g.zombieSun, gc, one: g.zombieSun >= gc, two: g.zombieSun >= gc * 2 };
  });
  ok('T2a 开局 300 脑子买得起一只巨人', t2.one === true);
  ok('T2b 买不起第二只巨人（300 < 600）', t2.two === false);

  // ===== T3 AI 僵尸开局第一只=买得起的最贵（应为巨人），10s 保护期后 2s 内出手 =====
  const zPeak = await (async () => {
    let peak = 0, first = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const s = await page.evaluate(() => {
        const g = window.game || window._pvzGame;
        return { playTime: g.playTime, state: g.state,
          zs: (g.entities || []).filter(e => e.constructor.name === 'Zombie' && !e.isDead).map(e => e.type || e.constructor.name),
          brain: g.zombieSun };
      });
      if (s.state !== 'PLAYING') break;
      if (s.zs.length > peak) peak = s.zs.length;
      if (s.zs.length > 0 && !first) first = { at: s.playTime, brain: s.brain };
      if (first && s.playTime > (first.at + 5)) break; // 观测窗口足够
      await sleep(1500);
    }
    return { peak, first };
  })();
  ok('T3a AI 僵尸 10s 保护期后正常出手（场上出过兵）', zPeak.peak >= 1 && zPeak.first);
  ok(`T3b AI 首召后脑子耗尽（首召时剩余=${zPeak.first ? zPeak.first.brain : '?'}，应为 0=开局梭哈一只巨人）`,
    zPeak.first && zPeak.first.brain === 0);

  // ===== T4 玩家僵尸方开局（重开一局）=====
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
    const brain0 = g.zombieSun, sun0 = g.sunCount; // 开局初值（召唤后会被扣）
    // 等 10s 保护期结束后手动召唤巨人，实测扣费 300→0
    const t0 = Date.now();
    while (g.playTime < 10.5 && g.state === 'PLAYING' && Date.now() - t0 < 30000)
      await new Promise(r => setTimeout(r, 500));
    const before = g.zombieSun;
    g.deployZombie('gargantuar', 0);
    return { sun: g.sunCount, brain: g.zombieSun, playing: g.state === 'PLAYING', before, after: g.zombieSun, brain0, sun0 };
  });
  console.log('  [diag T4a]', JSON.stringify(t4));
  ok('T4a 玩家僵尸方开局 🧠300（植物 AI ☀1000）', t4.playing && t4.brain0 === 300 && t4.sun0 === 1000);
  ok(`T4b 玩家召唤巨人扣费 ${t4.before}→${t4.after}（300 恰好一只）`, t4.before === 300 && t4.after === 0);

  await browser.close();
  console.log(`\n${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
