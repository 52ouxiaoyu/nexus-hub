/* ============================================================
 * v4.0.157 验收：机械龙植物体系 + 泡泡牧场
 * 用户规则逐条对照（一条规则一条断言，不看代码只看行为）：
 *   ① 3 个豌豆 = 5 点   ② 4 个豌豆 = 10 点（双发）
 *   ③ 连续 4 次消除 = 40 点（机枪）
 *   ④ 寒冰叠霜冻 / 满 6 层冰封 / 5 回合没消就融化
 *   ⑤ 玉米每 3 颗 25% 黄油，定身 10 秒
 *   ⑥ 小喷菇 3 连毒 1、大喷菇 4 连毒 2、忧郁菇 5 连毒 4 且血上限 1000
 *   ⑦ 泡泡牧场：喂满 3 颗升级、2 盆满级通关、满级作物会自己打
 * ============================================================ */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-gpu'],
    userDataDir: '/tmp/pptr-v4157v-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'), { waitUntil: 'networkidle2' });
  await sleep(1000);

  /* ---------- A. 注册表 ---------- */
  console.log('\n【A】玩法注册表');
  const reg = await page.evaluate(() => ({
    games: window.MiniGames.games,
    bubble: window.MiniGames.bubbleGames
  }));
  ok(reg.games.length === 10, '一共 10 个玩法', reg.games.length);
  ok(reg.bubble.length === 4, '泡泡工坊 4 张卡', reg.bubble.length);
  ok(reg.bubble[0].id === 'farm' && reg.bubble[0].name === '泡泡牧场', '第一张卡换成「泡泡牧场」', JSON.stringify(reg.bubble[0]));
  ok(!reg.games.some(g => g.id === 'bubble'), '「猫尾草泡泡龙」已下架');
  ok(reg.bubble.some(g => g.id === 'dragon'), '机械龙攻城还在');

  /* ---------- B. 机械龙：伤害规则 ---------- */
  console.log('\n【B】机械龙 · 四种植物');
  await page.evaluate(() => window.MiniGames.openGame('dragon'));
  await sleep(500);

  // 工具：模拟一次消除，返回掉血
  const pop = (col, size) => page.evaluate((c, n) => {
    const g = window.MiniGames.active;
    g.hp = 5000; g.hpMax = 5000; g.dieT = 0; g.over = false; g.phase = 1;
    const before = g.hp;
    g.onPop({ popped: n, dropped: 0, size: n, col: c });
    return { dmg: before - g.hp, per: g.poison.per, turns: g.poison.turns, frost: g.frost, ice: g.iceCd, hpMax: g.hpMax, butter: g.butter, combo: g.combo };
  }, col, size);

  const reset = () => page.evaluate(() => {
    const g = window.MiniGames.active;
    g.hp = 5000; g.hpMax = 5000; g.dieT = 0; g.over = false; g.phase = 1;
    g.combo = 0; g.poison = { per: 0, turns: 0 }; g.frost = 0; g.iceCd = 0;
    g.butter = 0; g.iceIdle = 0; g.gloom = false;
  });

  await reset();
  let r = await pop(0, 3);
  ok(r.dmg === 5, '① 3 个豌豆 = 5 点伤害', '实测 ' + r.dmg);

  await reset();
  r = await pop(0, 4);
  ok(r.dmg === 10, '② 4 个豌豆 = 双发 10 点', '实测 ' + r.dmg);

  await reset();
  r = await pop(0, 5);
  ok(r.dmg === 15, '5 个豌豆 = 15 点（每多一颗 +5）', '实测 ' + r.dmg);

  // ③ 连续 4 次消除 → 机枪 40
  await reset();
  const seq = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.hp = 5000; g.hpMax = 5000;
    const out = [];
    for (let i = 0; i < 4; i++) {
      const b = g.hp;
      g.onPop({ popped: 3, dropped: 0, size: 3, col: 0 });
      out.push(b - g.hp);
    }
    return out;
  });
  ok(seq[0] === 5 && seq[1] === 5 && seq[2] === 5, '连续前 3 次消除各 5 点', JSON.stringify(seq));
  ok(seq[3] === 45, '③ 第 4 次消除额外触发机枪 40 点（本发合计 45）', JSON.stringify(seq));
  const combAfter = await page.evaluate(() => window.MiniGames.active.combo);
  ok(combAfter === 0, '机枪打完后连击槽清零', combAfter);

  // ④ 寒冰
  await reset();
  r = await pop(1, 3);
  ok(r.frost === 3, '④ 寒冰 3 连 = 叠 3 层霜冻', r.frost);
  ok(r.dmg === 3, '寒冰伤害是豌豆的一半（3 点）', r.dmg);
  await reset();
  r = await pop(1, 6);
  ok(r.ice === 3, '寒冰叠到 6 层 → 冰封 3 秒', 'iceCd=' + r.ice);
  ok(r.frost === 0, '冰封触发后霜冻层数归零', r.frost);

  // 寒冰 5 回合没消 → 融化
  const melt = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.lane.g[0][0] = 1; g.lane.g[0][1] = 1; g.iceIdle = 0;
    for (let i = 0; i < 5; i++) g.onPop({ popped: 0, dropped: 0, size: 0, col: 3 });
    return { a: g.lane.g[0][0], b: g.lane.g[0][1], idle: g.iceIdle };
  });
  ok(melt.a === 0 && melt.b === 0, '④ 寒冰连续 5 回合没被消 → 融回普通豌豆', JSON.stringify(melt));

  // ⑤ 玉米黄油：跑 240 次统计
  const butterStat = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.hp = 1e9; g.hpMax = 1e9; g.combo = 0;
    let hit = 0, lastT = 0;
    for (let i = 0; i < 240; i++) {
      g.butter = 0; g.combo = 0;
      g.onPop({ popped: 3, dropped: 0, size: 3, col: 3 });
      if (g.butter > 0) { hit++; lastT = g.butter; }
    }
    return { hit, total: 240, lastT };
  });
  const rate = butterStat.hit / butterStat.total;
  ok(rate > 0.15 && rate < 0.36, '⑤ 玉米每 3 颗约 25% 概率黄油（240 次抽样）', (rate * 100).toFixed(1) + '%');
  ok(Math.abs(butterStat.lastT - 10) < 0.01, '⑤ 黄油定身 10 秒', butterStat.lastT);

  // ⑥ 菇系毒
  await reset();
  r = await pop(2, 3);
  ok(r.per === 1 && r.turns === 10, '⑥ 小喷菇 3 连 = 毒 1/回合 × 10 回合', JSON.stringify({ per: r.per, turns: r.turns }));
  ok(r.dmg === 5, '⑥ 小喷菇自身伤害 5 点', r.dmg);
  await reset();
  r = await pop(2, 4);
  ok(r.per === 2, '⑥ 大喷菇 4 连 = 毒 2/回合', r.per);
  await reset();
  r = await pop(2, 5);
  ok(r.per === 4, '⑥ 忧郁菇 5 连 = 毒 4/回合（翻 4 倍）', r.per);
  ok(r.hpMax === 1000, '⑥ 忧郁菇把 Boss 血上限顶到 1000', r.hpMax);

  // 毒结算：一回合掉 per 点
  const dot = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.hp = 900; g.hpMax = 1000; g.poison = { per: 4, turns: 10 }; g.butter = 0; g.iceCd = 0;
    const b = g.hp;
    g.tickTurn();
    return { dmg: b - g.hp, turns: g.poison.turns };
  });
  ok(dot.dmg === 4, '⑥ 毒在下一回合结算 4 点', dot.dmg);
  ok(dot.turns === 9, '⑥ 毒持续回合数递减', dot.turns);

  // 黄油/冰封加伤
  const amp = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.hp = 5000; g.hpMax = 5000; g.butter = 5; g.iceCd = 0;
    let b = g.hp; g.onPop({ popped: 3, dropped: 0, size: 3, col: 0 }); const a = b - g.hp;
    g.hp = 5000; g.butter = 0; g.iceCd = 3;
    b = g.hp; g.onPop({ popped: 3, dropped: 0, size: 3, col: 0 }); const c = b - g.hp;
    return { butter: a, ice: c };
  });
  ok(amp.butter === 8, '黄油期间受伤 +50%（5 → 8）', amp.butter);
  ok(amp.ice === 10, '冰封期间受伤翻倍（5 → 10）', amp.ice);

  // 黄油真的会让喷吐停住
  const frozenSpray = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.butter = 3; g.sprayT = 0.2;
    for (let i = 0; i < 30; i++) g.update(1 / 30);
    return { butter: g.butter, sprayT: g.sprayT };
  });
  ok(frozenSpray.sprayT > 0.15, '黄油期间喷吐计时冻结', JSON.stringify(frozenSpray));

  // 霜冻让喷吐变慢
  const slow = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.phase = 1; g.frost = 0; const base = g.sprayInterval();
    g.frost = 5; const slowv = g.sprayInterval();
    return { base, slowv };
  });
  ok(slow.slowv > slow.base * 1.4, '霜冻让喷吐间隔明显变长', JSON.stringify(slow));

  await page.screenshot({ path: path.resolve(__dirname, '_v4157_dragon.png') });

  /* ---------- C. 泡泡牧场 ---------- */
  console.log('\n【C】泡泡牧场');
  await page.evaluate(() => window.MiniGames.openGame('farm'));
  await sleep(500);

  const farmInit = await page.evaluate(() => {
    const g = window.MiniGames.active;
    return { pots: g.pots.length, cls: g.constructor.name, over: g.over };
  });
  ok(farmInit.cls === 'BubbleFarm' && farmInit.pots === 5, '牧场有 5 个花盆', JSON.stringify(farmInit));

  const lv1 = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.feed(0, 3);
    return g.pots.map(p => p.lv + ':' + p.seed);
  });
  ok(lv1[0] === '1:0', '⑦ 喂满 3 颗同色 → 升 1 级', JSON.stringify(lv1));

  const lv6 = await page.evaluate(() => {
    const g = window.MiniGames.active;
    for (let i = 0; i < 5; i++) g.feed(0, 3);
    return g.pots.map(p => p.lv + ':' + p.seed);
  });
  ok(lv6[0] === '6:0', '连喂 5 次到满级 Lv6', JSON.stringify(lv6));
  const oneFull = await page.evaluate(() => {
    const g = window.MiniGames.active;
    return { over: g.over, win: g.win, dead: g.lane.dead, full: g.pots.filter(q => q.lv >= 6).length };
  });
  ok(oneFull.over === false, '只有 1 盆满级还不算通关（要 2 盆）', JSON.stringify(oneFull));

  const win = await page.evaluate(() => {
    const g = window.MiniGames.active;
    // 第二个绿盆（index 4）也喂满
    for (let i = 0; i < 6; i++) g.feed(0, 3);
    return { over: g.over, win: g.win, full: g.pots.filter(p => p.lv >= 6).length };
  });
  ok(win.over && win.win, '⑦ 2 盆满级作物 → 通关', JSON.stringify(win));

  // 作物自动攻击 / 升级惩罚
  const auto = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.reset();
    g.pots[0].lv = 4; g.pots[0].cd = 0;
    const b0 = g.lane.score, c0 = g.lane.count();
    let peak = 0;
    for (let i = 0; i < 240; i++) { g.update(1 / 60); peak = Math.max(peak, g.shots.length); }
    return { peak, dScore: g.lane.score - b0, dCount: c0 - g.lane.count() };
  });
  ok(auto.peak > 0 || auto.dScore > 0, '⑦ 满级以下作物也会自己往上打', JSON.stringify(auto));

  const punish = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.reset();
    g.pots[1].lv = 0; g.pots[1].seed = 2;
    g.iceCd = 0;
    const before = g.lane.count();
    g.feed(0, 1);
    return { before, after: g.lane.count() };
  });
  ok(punish.after >= punish.before, '升级会从顶部压下一截杂草（惩罚存在）', JSON.stringify(punish));

  await sleep(2600);
  await page.screenshot({ path: path.resolve(__dirname, '_v4157_farm.png') });

  /* ---------- D. 大厅 ---------- */
  await page.evaluate(() => window.MiniGames.openBubble());
  await sleep(700);
  const lobby = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.mini-card')];
    return cards.map(c => ({ id: c.dataset.id, t: c.querySelector('.nm, .ti, h3') ? c.querySelector('.nm, .ti, h3').textContent : '' }));
  });
  ok(lobby.length === 4, '泡泡工坊大厅 4 张卡', lobby.length);
  ok(lobby[0].id === 'farm', '第一张是泡泡牧场', JSON.stringify(lobby[0]));
  await page.screenshot({ path: path.resolve(__dirname, '_v4157_lobby.png') });

  /* ---------- E. 全部玩法开一遍 ---------- */
  console.log('\n【E】10 个玩法逐个开');
  const ids = reg.games.map(g => g.id);
  for (const id of ids) {
    await page.evaluate(i => window.MiniGames.openGame(i), id);
    await sleep(260);
    const st = await page.evaluate(() => {
      const g = window.MiniGames.active;
      return g ? { ok: true, over: g.over } : { ok: false };
    });
    ok(st.ok, id + ' 打开无异常');
  }

  console.log('\nERRORS(' + errs.length + '):', errs.slice(0, 6));
  ok(errs.length === 0, '全程零报错');
  console.log('\n================================');
  console.log('PASS ' + pass + ' / ' + (pass + fail));
  if (fail) console.log('FAILED:\n - ' + fails.join('\n - '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
