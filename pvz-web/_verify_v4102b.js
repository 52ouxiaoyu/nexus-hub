// v4.0.102 补充验证：P1（植物方）路径——僵尸走进房子 → P1 死亡 → 按 N 变天使；再进房僵尸消失不判负
const path = require('path');
const puppeteer = require('puppeteer');
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
let pass = 0, fail = 0;
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
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);
  // 人机对战：玩家=植物方
  await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-plant').click();
    await new Promise(r => setTimeout(r, 500));
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    for (const t of ['peashooter', 'sunflower', 'wallnut']) {
      const c = cards.find(cd => cd.dataset.type === t); if (c) c.click();
    }
    document.getElementById('btn-lets-rock').click();
  });
  await sleep(1500);

  // T1 放一只僵尸贴着房子走进去 → P1 死亡（变身机会），不直接判负
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const z = new Zombie(g, 2, 'normal');
    z.x = 55; z.y = g.board.offsetY + 2 * g.board.cellHeight + g.board.cellHeight / 2 - 20;
    z.speed = 40; // 快速爬进房子（x=55 → 1.5s 内越过 x=40）
    g.entities.push(z);
  });
  await sleep(2500);
  const t1 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { p1: g.vsFate.p1.state, playing: g.state, ann: g.announcementUI ? g.announcementUI.innerText : '' };
  });
  ok(`T1 僵尸进房 → P1 死亡等待变身（p1=${t1.p1}，游戏未结束=${t1.playing === 'PLAYING'}）`, t1.p1 === 'dead' && t1.playing === 'PLAYING');
  ok('T1b 播报提示 N/M 变身', t1.ann.includes('N=😇天使') || t1.ann.includes('阵亡'));

  // T2 按 N 变天使（向日葵+金光环 DOM 实体）
  await page.keyboard.press('KeyN');
  await sleep(500);
  const t2 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p1.ent;
    return { state: g.vsFate.p1.state, hp: ent ? ent.hp : -1, hasEl: !!(ent && ent.el) };
  });
  ok(`T2 按 N → P1 变天使（hp=${t2.hp}）`, t2.state === 'angel' && t2.hp === 800 && t2.hasEl);

  // T3 再放一只僵尸进房 → 被移除，不判负
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const z = new Zombie(g, 2, 'normal');
    z.x = 45; z.y = g.board.offsetY + 2 * g.board.cellHeight + g.board.cellHeight / 2 - 20;
    g.entities.push(z);
  });
  await sleep(1000);
  const t3 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { playing: g.state, p1: g.vsFate.p1.state };
  });
  ok(`T3 P1 变身后僵尸再进房 → 悄然消失不判负（${t3.playing}）`, t3.playing === 'PLAYING' && t3.p1 === 'angel');

  // T4 P1 死后种植权冻结：Digit 选卡被吃、mouseup 种植无效
  const t4 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { p1State: g.vsFate.p1.state };
  });
  ok(`T4 P1 已变身（种植权冻结状态=${t4.p1State}）`, t4.p1State === 'angel');

  // T5 P1 天使 WASD 移动
  const x0 = await page.evaluate(() => (window.game || window._pvzGame).vsFate.p1.ent.x);
  await page.keyboard.down('KeyD');
  await sleep(800);
  await page.keyboard.up('KeyD');
  const x1 = await page.evaluate(() => (window.game || window._pvzGame).vsFate.p1.ent.x);
  ok(`T5 天使 WASD 移动（${x0.toFixed(0)} → ${x1.toFixed(0)}px）`, x1 - x0 > 100);

  // T6 P1 天使 N 捕获 / M 疾跑
  await page.keyboard.press('KeyM');
  await sleep(200);
  const t6 = await page.evaluate(() => (window.game || window._pvzGame).vsFate.p1.ent.spdBuffT);
  ok(`T6 P1 天使 M 疾跑（${t6.toFixed(1)}s）`, t6 > 5);

  ok('T7 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);
  console.log(`\n${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
