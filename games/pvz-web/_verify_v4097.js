// v4.0.97 验证：双人对战保护期 10→15 秒（僵尸 15 秒后才能召唤）
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

  // ===== 玩家僵尸局：手动召唤测保护期 gate（AI 不会抢脑子）=====
  const r = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-zombie').click();
    await new Promise(r => setTimeout(r, 500));
    const vz = [...document.querySelectorAll('.vz-card')];
    for (const t of ['normal', 'conehead', 'imp', 'buckethead', 'newspaper', 'sunhead', 'football', 'gargantuar']) {
      const c = vz.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)'); if (c) c.click();
    }
    document.getElementById('vz-rock').click();
    await new Promise(r => setTimeout(r, 900));

    // T1: playTime<15 内尝试召唤（等过 1.2s 节奏冷却后）→ 被拒，脑子不变，播报含准备时间
    await new Promise(r => setTimeout(r, 1500)); // 避开 1.2s 节奏上限干扰
    const brainBefore = g.zombieSun;
    g.deployZombie('imp', 0);
    const blocked = g.zombieSun === brainBefore;
    const ann1 = g.announcementUI ? g.announcementUI.innerText : '';
    const pt1 = g.playTime;

    // T2: 等到 playTime>=15 再召唤 → 成功扣费
    const t0 = Date.now();
    while (g.playTime < 15.5 && g.state === 'PLAYING' && Date.now() - t0 < 40000)
      await new Promise(r => setTimeout(r, 500));
    const brainMid = g.zombieSun;
    g.deployZombie('imp', 0);
    const allowed = g.zombieSun === brainMid - 25;
    return { pt1, blocked, ann1, brainBefore, brainMid, allowed, playing: g.state === 'PLAYING' };
  });
  ok(`T1a 保护期内（实测 ${r.pt1.toFixed(1)}s）召唤被拒，脑子 ${r.brainBefore} 不变`, r.blocked && r.brainBefore === 300);
  ok('T1b 播报为「准备时间，还剩 X 秒可释放僵尸」', r.ann1.includes('准备时间') && r.ann1.includes('可释放僵尸'));
  ok('T2 15 秒后召唤成功（imp 扣 25 脑子）', r.allowed && r.playing);

  // ===== T3 AI 僵尸局：AI 在 10~15s 之间不出手、15s 后出手 =====
  await page.evaluate(() => { const g = window.game || window._pvzGame; g.state = 'GAMEOVER'; });
  await sleep(500);
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);
  const obs = await page.evaluate(async () => {
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
    // 轮询观测：15s 前每秒采样场上僵尸数
    const zs = () => (g.entities || []).filter(e => e.constructor.name === 'Zombie' && !e.isDead).length;
    let before15 = 0, at15 = -1;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const pt = g.playTime, zn = zs();
      if (pt < 14.5 && zn > 0) before15 = zn;
      if (at15 < 0 && pt >= 14.5) at15 = zn; // 14.5~15s 时刻快照
      if (at15 >= 0) {
        if (zn > 0 || g.playTime > 20) return { before15, at15, znAfter: zs(), pt: g.playTime, state: g.state };
      }
      if (g.state !== 'PLAYING') break;
      await new Promise(r => setTimeout(r, 600));
    }
    return { before15, at15, znAfter: zs(), pt: g.playTime, state: g.state };
  });
  ok('T3a AI 僵尸 15 秒前零出手', obs.before15 === 0);
  ok(`T3b AI 僵尸 15 秒后出手（14.5s 快照=${obs.at15}，之后峰值 ${obs.znAfter}）`, obs.znAfter > 0 || (obs.state !== 'PLAYING' && obs.at15 > 0));

  await browser.close();
  console.log(`\n${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
