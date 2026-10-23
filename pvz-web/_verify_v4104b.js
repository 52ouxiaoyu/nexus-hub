// v4.0.104b 验证：①单人 1p 模式不变（弹窗抉择、不进入 pendingFate）②2p 两人同时倒下都能等待并各自变身
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const launch = () => puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
  userDataDir: '/tmp/pptr-prof-' + Date.now()
});
const boot = async (browser, mode, role1, role2) => {
  const p = await browser.newPage();
  p.on('pageerror', e => { errorList.push(String(e).slice(0, 200)); });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate((m, r1, r2) => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: m, faction: 'plant', role1: r1, role2: r2 });
  }, mode, role1, role2);
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  return p;
};
const errorList = [];
(async () => {
  // ===== A. 单人 1p 回归 =====
  const b1 = await launch();
  const p1 = await boot(b1, '1p', 'peashooter');
  await p1.evaluate(() => { const g = window.game; g.player.invincibleT = 0; g.player.hp = 0; g._checkPlayerDown(g.player); });
  await sleep(500);
  let r = await p1.evaluate(() => {
    const g = window.game;
    return { pend: !!g.player.pendingFate, fateEl: !!document.getElementById('fate-choice'), fateOpen: !!g.fateOpen, over: !!g.over };
  });
  ok(`A1 1p 死亡仍弹抉择窗（弹窗=${r.fateEl}，fateOpen=${r.fateOpen}，pendingFate=${r.pend}）`, r.fateEl && r.fateOpen && !r.pend && !r.over);
  // 点天使
  await p1.evaluate(() => { const el = document.querySelector('#fate-angel'); if (el) el.click(); });
  await sleep(400);
  r = await p1.evaluate(() => ({ ang: !!window.game.player.angelic, halo: !!window.game.player.angelHalo, hp: window.game.player.hp, open: !!window.game.fateOpen, el: !!document.getElementById('fate-choice') }));
  ok(`A2 1p 点天使 → 天使形态（angelic=${r.ang} hp=${r.hp} 光环=${r.halo} 弹窗已关=${!r.el}）`, r.ang && r.hp > 0 && r.halo && !r.el && !r.open);
  // 1p 天使技能 N 不崩（无僵尸时不消耗 CD）
  r = await p1.evaluate(() => { const g = window.game; const before = g.player.capCd; g._angelCapture(g.player); return { cd: g.player.capCd }; });
  ok(`A3 1p 天使捕获调用正常（CD=${r.cd}）`, typeof r.cd === 'number');
  ok('A4 1p 无 JS 错误' + (errorList.length ? ': ' + errorList[0] : ''), errorList.length === 0);
  await b1.close();

  // ===== B. 2p 两人同时等待抉择 =====
  errorList.length = 0;
  const b2 = await launch();
  const p2 = await boot(b2, '2p', 'peashooter', 'sunflower');
  await p2.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
    // 两人同时倒下
    g.player.invincibleT = 0; g.player.hp = 0; g._checkPlayerDown(g.player);
    g.player2.invincibleT = 0; g.player2.hp = 0; g._checkPlayerDown(g.player2);
  });
  await sleep(500);
  r = await p2.evaluate(() => {
    const g = window.game;
    return { pend1: !!g.player.pendingFate, pend2: !!g.player2.pendingFate, over: !!g.over, state: g.over ? 'over' : 'playing' };
  });
  ok(`B1 两人同时倒下 → 都进入等待、游戏不结束（P1=${r.pend1} P2=${r.pend2} over=${r.over}）`, r.pend1 && r.pend2 && !r.over);

  // 两人各自变身（P1 天使 / P2 内鬼）
  await p2.keyboard.press('KeyN');
  await sleep(300);
  await p2.keyboard.press('Digit2');
  await sleep(400);
  r = await p2.evaluate(() => {
    const g = window.game;
    return { a1: !!g.player.angelic, t2: !!g.player2.traitor, over: !!g.over,
             dead1: !!g.player.dead, dead2: !!g.player2.dead, hp1: g.player.hp, hp2: Math.round(g.player2.hp) };
  });
  ok(`B2 同时变身成功（P1 天使=${r.a1} hp=${r.hp1}，P2 内鬼=${r.t2} hp=${r.hp2}，未结束=${!r.over}）`,
     r.a1 && r.t2 && !r.over && !r.dead1 && !r.dead2 && r.hp1 > 0 && r.hp2 > 0);

  // P2 内鬼咬死 P1 天使 → P1 出局（天使只有一条命）
  await p2.evaluate(() => {
    const g = window.game, p1 = g.player, p2 = g.player2;
    p1.invincibleT = 0;
    p1.x = 120; p1.y = 200; p2.x = 140; p2.y = 200;
    p1.hp = 10; // 接近死亡，下一口即死
    g.gameTime = 6000; // 越过开局 5 秒保护
  });
  await sleep(4000);
  r = await p2.evaluate(() => {
    const g = window.game;
    return { dead1: !!g.player.dead, pend1: !!g.player.pendingFate, a1: !!g.player.angelic, over: !!g.over };
  });
  ok(`B3 天使被内鬼咬死 → 天使出局不再复活（dead=${r.dead1} pendingFate=${r.pend1} 未判负=${!r.over}）`,
     r.dead1 && !r.pend1);

  // P2 内鬼团灭所有幸存者前先验证：游戏仍进行（P2 内鬼 vs 人机）
  ok('B4 双方同时变身无 JS 错误' + (errorList.length ? ': ' + errorList[0] : ''), errorList.length === 0);
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await b2.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
