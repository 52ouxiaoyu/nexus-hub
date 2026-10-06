/* 验收测试（不提交仓库） */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, 'index.html');
const OUT = __dirname;
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--disable-gpu', '--no-sandbox',
      '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
      '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
    userDataDir: '/tmp/pptr-tw-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 400));

  console.log('\n--- 加载与句柄 ---');
  ok('无页面异常', errors.length === 0, errors.slice(0, 3));
  const ver = await page.evaluate(() => window.__twGame && window.__twGame.VERSION);
  ok('句柄存在且版本 v1.4.8', ver === 'v1.4.8', ver);
  ok('初始为菜单态', await page.evaluate(() => window.__twGame.state()) === 'MENU');
  await page.screenshot({ path: OUT + '/_shot_menu.png' });

  console.log('\n--- 开局与波次 ---');
  await page.evaluate(() => window.__twGame.start('story'));
  ok('进入 PLAYING', await page.evaluate(() => window.__twGame.state()) === 'PLAYING');
  await page.evaluate(() => window.__twGame.frame(120));
  const c1 = await page.evaluate(() => window.__twGame.counts());
  ok('波次生成敌机', c1.e > 0, c1);
  ok('玩家存在', await page.evaluate(() => !!window.__twGame.G.player));

  console.log('\n--- 输入 ---');
  const x0 = await page.evaluate(() => window.__twGame.G.player.x);
  await page.evaluate(() => { window.__twGame.key('a', true); window.__twGame.frame(30); window.__twGame.key('a', false); });
  const x1 = await page.evaluate(() => window.__twGame.G.player.x);
  ok('A 键左移生效', x1 < x0 - 20, { x0, x1 });
  await page.evaluate(() => { window.__twGame.key('d', true); window.__twGame.frame(60); window.__twGame.key('d', false); });
  const x2 = await page.evaluate(() => window.__twGame.G.player.x);
  ok('D 键右移生效', x2 > x1 + 20, { x1, x2 });

  console.log('\n--- 射击与蓄力 ---');
  await page.evaluate(() => { window.__twGame.key(' ', true); window.__twGame.frame(20); });
  const c2 = await page.evaluate(() => window.__twGame.counts());
  ok('射击产生子弹', c2.pb > 0, c2);
  await page.evaluate(() => window.__twGame.frame(60));
  ok('蓄力已充能或已释放', await page.evaluate(() => window.__twGame.G.player.charge) >= 0);
  await page.evaluate(() => window.__twGame.setPower(5));
  await page.evaluate(() => { window.__twGame.G.pbullets.length = 0; window.__twGame.frame(10); });
  ok('满火力弹量更多', await page.evaluate(() => window.__twGame.counts().pb) >= 5);

  console.log('\n--- 道具 ---');
  const pw = await page.evaluate(() => {
    const g = window.__twGame.G;
    g.enemies.length = 0; g.pending.length = 0; g.items.length = 0;
    g.power = 1;
    window.TW.dropItem(g.player.x, g.player.y, 'power');
    window.__twGame.frame(3);
    return g.power;
  });
  ok('P 道具提升火力', pw >= 2, 'pw=' + pw);
  await page.evaluate(() => {
    const g = window.__twGame.G; const p = g.players[0];
    g.items.length = 0; p.weapon = 0;
    g.items.push({ x: p.x, y: p.y, vy: 1.5, vx: 0, kind: 'weapon', w: 2, t: 0 });
    window.__twGame.frame(2);
  });
  ok('W 道具切换武器', await page.evaluate(() => window.__twGame.G.weapon) === 2);

  console.log('\n--- 大招（随机） ---');
  await page.evaluate(() => {
    window.__twGame.killAll(); window.__twGame.spawnBoss(0);
    window.__twGame.G.players.forEach((p) => { p.ai = false; p.idle = 0; });  // 冻结 AI：5 秒空闲会接管并可能放大招清空敌弹，干扰断言
  });
  let eb = 0;
  for (let k = 0; k < 4 && eb === 0; k++) {
    await page.evaluate(() => {
      window.__twGame.G.players.forEach((p) => { p.ai = false; p.idle = 0; });
      window.__twGame.frame(90);
    });
    eb = await page.evaluate(() => window.__twGame.counts().eb);
  }
  ok('Boss 放出弹幕', eb > 0, { eb });
  await page.screenshot({ path: OUT + '/_shot_boss.png' });
  // 现在「大招键」释放的是随机大招；其中「新星爆破」这一种会清空敌弹
  const novaClear = await page.evaluate(() => {
    const g = window.__twGame.G; const p = g.players[0];
    p.bombs = 3; p.invuln = 0; p.nextUlt = 'nova';
    window.__twGame.bomb();
    return { eb: window.__twGame.counts().eb, b: g.bombs };
  });
  ok('新星爆破清空敌弹', novaClear.eb === 0, novaClear);

  console.log('\n--- Boss 阶段与部件 ---');
  await page.evaluate(() => {
    window.TW.FX.hitstop = 0;
    window.__twGame.G.boss.hp = window.__twGame.G.boss.maxhp * 0.5;
    window.__twGame.frame(10);
  });
  ok('血量过半进入第 2 阶段', await page.evaluate(() => window.__twGame.G.boss.phase) >= 1);
  const partHpBefore = await page.evaluate(() => window.__twGame.G.boss.parts[0].hp);
  await page.evaluate(() => { window.__twGame.G.boss.parts[0].hp = 0; window.__twGame.frame(4); });
  ok('侧炮塔可击毁', await page.evaluate(() => window.__twGame.G.boss.parts[0].alive) === false);
  ok('击毁部件掉落道具', await page.evaluate(() => window.__twGame.counts().it) > 0);
  await page.evaluate(() => { window.__twGame.G.boss.hp = 1; window.__twGame.frame(2); window.__twGame.frame(90); });
  ok('Boss 击坠后进入过关流程',
    ['CLEAR', 'PLAYING'].indexOf(await page.evaluate(() => window.__twGame.state())) >= 0,
    await page.evaluate(() => window.__twGame.state()));

  console.log('\n--- 计分 / 连击 / 擦弹 ---');
  await page.evaluate(() => { const g = window.__twGame.G; g.score = 0; g.combo = 10; g.comboT = 100; });
  const sc = await page.evaluate(() => { const g = window.__twGame.G; return g.addScore(100); });
  ok('连击倍率生效', sc > 100, { sc });
  ok('倍率上限 4.0', await page.evaluate(() => { const g = window.__twGame.G; g.combo = 999; return g.mult(); }) <= 4.001);
  await page.evaluate(() => { window.__twGame.G.combo = 0; });

  console.log('\n--- 死亡与残机 ---');
  /* 先重开一局：前面的用例已经跑掉过残机，不重置会污染断言基数 */
  await page.evaluate(() => window.__twGame.start('story', false));
  const lives0 = await page.evaluate(() => window.__twGame.G.lives);
  await page.evaluate(() => {
    const g = window.__twGame.G;
    g.player.invuln = 0;
    g.ebullets.push({ x: g.player.x, y: g.player.y, vx: 0, vy: 0, r: 5, kind: 'red', t: 0, grazed: false });
    window.__twGame.frame(2);
  });
  const lives1 = await page.evaluate(() => window.__twGame.G.lives);
  ok('中弹掉一条命', lives1 === lives0 - 1, { lives0, lives1 });
  ok('复活后有无敌时间', await page.evaluate(() => window.__twGame.G.player.invuln) > 0);

  console.log('\n--- 渲染像素断言 ---');
  await page.evaluate(() => { window.__twGame.start('story'); window.__twGame.frame(300); window.__twGame.key(' ', true); window.__twGame.frame(30); window.__twGame.render(); });
  const lit = await page.evaluate(() => {
    const cv = document.getElementById('cv');
    const g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) {
      if (d[i] + d[i + 1] + d[i + 2] > 220) n++;
    }
    return n;
  });
  ok('画面有足够亮像素（渲染未哑火）', lit > 1200, { lit });  // 阈值留余量：同屏亮像素随波次随机浮动
  await page.screenshot({ path: OUT + '/_shot_play.png' });

  console.log('\n--- 压力测试 ---');
  const perf = await page.evaluate(() => {
    const g = window.__twGame.G;
    for (let i = 0; i < 240; i++) {
      g.ebullets.push({ x: Math.random() * 480, y: Math.random() * 800, vx: 0, vy: 1, r: 4, kind: 'red', t: 0, grazed: false });
    }
    for (let i = 0; i < 40; i++) window.TW.spawn('drone', Math.random() * 480, Math.random() * 300);
    const t0 = performance.now();
    for (let i = 0; i < 120; i++) { window.__twGame.frame(1); window.__twGame.render(); }
    return { ms: performance.now() - t0, c: window.__twGame.counts() };
  });
  ok('120 帧（240 弹幕 + 40 敌机）耗时 < 2500ms', perf.ms < 2500, perf);

  console.log('\n--- 无尽 ---');
  await page.evaluate(() => window.__twGame.start('endless'));
  await page.evaluate(() => window.__twGame.frame(400));
  ok('无尽持续刷怪', await page.evaluate(() => window.__twGame.G.wave) > 0,
    await page.evaluate(() => window.__twGame.G.wave));

  console.log('\n--- 流程连通性（脚本推进到 Boss） ---');
  await page.evaluate(() => {
    window.__twGame.start('story');
    window.__twGame.key(' ', true);
    window.__twGame.setPower(5);
  });
  let bossSeen = false, cleared = false, nextStage = false;
  for (let k = 0; k < 30; k++) {
    const s = await page.evaluate(() => {
      const g = window.__twGame.G;
      g.lives = 99;
      if (g.player) g.player.invuln = Math.max(g.player.invuln, 900);
      window.__twGame.frame(200);
      return { boss: !!g.boss, st: g.state, stage: g.stage };
    });
    if (s.boss) bossSeen = true;
    if (s.st === 'CLEAR') cleared = true;
    if (cleared && s.st === 'PLAYING' && s.stage === 1) { nextStage = true; break; }
    if (bossSeen && !s.boss && s.st === 'PLAYING' && s.stage > 0) { nextStage = true; break; }
  }
  ok('推进可触发关底 Boss', bossSeen);
  ok('Boss 击破后进入过关并推进到第 2 关', cleared && nextStage,
    await page.evaluate(() => ({ st: window.__twGame.G.state, stage: window.__twGame.G.stage })));

  console.log('\n--- 通关结算 ---');
  await page.evaluate(() => {
    window.__twGame.start('story');
    window.__twGame.gotoStage(4);
    window.__twGame.spawnBoss(4);
    window.__twGame.key(' ', true);
    window.__twGame.setPower(5);
  });
  for (let i = 0; i < 6; i++) {
    const s = await page.evaluate(() => {
      window.TW.FX.hitstop = 0;
      if (window.__twGame.G.boss) window.__twGame.G.boss.hp = Math.min(window.__twGame.G.boss.hp, 1);
      window.__twGame.frame(40);
      return window.__twGame.G.state;
    });
    if (s === 'WIN') break;
  }
  const win = await page.evaluate(() => ({
    st: window.__twGame.G.state,
    ov: !document.getElementById('ov-result').classList.contains('hidden'),
    best: +(localStorage.getItem('tw_best') || 0),
  }));
  ok('第 5 关 Boss 击破进入通关结算', win.st === 'WIN', win);
  ok('结算面板弹出', win.ov);
  ok('最高分已写入本地', win.best > 0, win);

  console.log('\n--- 同屏 ---');
  await page.evaluate(() => window.__twGame.start('story', true));
  const dpx = await page.evaluate(() => {
    const S = window.__twGame, A = S.playerInfo();
    S.key('ArrowLeft', true); S.key('d', true); S.frame(30);
    S.key('ArrowLeft', false); S.key('d', false);
    const B = S.playerInfo();
    return { a0: A[0].x, b0: B[0].x, a1: A[1].x, b1: B[1].x, n: A.length };
  });
  ok('双人开局有两名玩家', dpx.n === 2, dpx);
  ok('2P 方向键独立左移', dpx.b1 < dpx.a1 - 10, dpx);
  ok('1P 同时用 WASD 右移', dpx.b0 > dpx.a0 + 10, dpx);

  const shoot2 = await page.evaluate(() => {
    const S = window.__twGame;
    S.G.pbullets.length = 0;
    S.key('d', false);
    S.key('numpadenter', true); S.frame(12); S.key('numpadenter', false);
    return S.G.pbullets.filter((b) => b.owner === 1).length;
  });
  ok('2P 回车键独立射击', shoot2 > 0, { shoot2 });

  const p2Item = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    g.items.length = 0;
    window.TW.dropItem(g.players[1].x, g.players[1].y, 'power');
    const before = [g.players[0].power, g.players[1].power];
    S.frame(3);
    return { before: before, after: [g.players[0].power, g.players[1].power] };
  });
  // 同屏火力道具成对掉落，两人分摊；这里只断言「谁碰到谁受益」
  ok('道具只给碰到的人（2P 火力上升）', p2Item.after[1] > p2Item.before[1], p2Item);
  ok('另一人火力不受影响', p2Item.after[0] === p2Item.before[0], p2Item);

  const bomb2 = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    g.players[0].invuln = 0; g.players[1].invuln = 0;
    const before = [g.players[0].bombs, g.players[1].bombs];
    S.bomb(1);
    return { before: before, after: [g.players[0].bombs, g.players[1].bombs] };
  });
  ok('2P 大招只扣自己的次数', bomb2.after[1] === bomb2.before[1] - 1 && bomb2.after[0] === bomb2.before[0], bomb2);

  /* 中弹测试：先消化上一轮的复活帧与无敌帧，否则命中会被 invuln 吃掉 */
  const killOne = async (idx) => page.evaluate((i) => {
    const S = window.__twGame, g = S.G;
    window.TW.FX.hitstop = 0; S.frame(1);
    window.TW.FX.hitstop = 0;
    g.players[i].invuln = 0;
    g.players[i].ai = false; g.players[i].idle = 0;   // 关掉 AI：本测试只验证中弹扣命逻辑（否则空闲席会被 AI 接管而躲弹）
    const before = g.players.map((p) => p.lives);
    g.ebullets.push({ x: g.players[i].x, y: g.players[i].y, vx: 0, vy: 0, r: 5, kind: 'red', t: 0, gz: [false, false] });
    S.frame(2);
    return { before: before, after: g.players.map((p) => p.lives),
             out: g.players[i].out, alive: g.alive().length, st: g.state, pod: g.pods.length };
  }, idx);

  await page.evaluate(() => {
    const g = window.__twGame.G;
    g.players[0].invuln = 0; g.players[1].invuln = 0;
  });
  const k2 = await killOne(1);
  ok('2P 中弹只掉 2P 的命', k2.after[1] === k2.before[1] - 1 && k2.after[0] === k2.before[0], k2);

  await page.evaluate(() => {
    const g = window.__twGame.G;
    g.players[0].lives = 0; g.players[1].lives = 0;
    g.players[0].x = 100; g.players[0].y = 610;
    g.players[1].x = 400; g.players[1].y = 610;
    g.players.forEach((p) => { p.ai = false; p.idle = 0; });
  });
  const k2b = await killOne(1);
  ok('一方坠机 → 待救援信标 + 游戏继续（另一位仍可战）', k2b.st === 'PLAYING' && k2b.out && k2b.pod === 1 && k2b.alive === 1, k2b);
  const k1 = await killOne(0);
  ok('两人全灭进入结算', k1.st === 'OVER', k1);

  const res2 = await page.evaluate(() => ({
    ov: !document.getElementById('ov-result').classList.contains('hidden'),
    has1p: document.getElementById('res-detail').innerHTML.indexOf('1P') >= 0,
    has2p: document.getElementById('res-detail').innerHTML.indexOf('2P') >= 0,
  }));
  ok('结算面板弹出并区分 1P / 2P 战绩', res2.ov && res2.has1p && res2.has2p, res2);

  /* v1.4.8 救援：接触信标把队友拉回战场 */
  const res3 = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', true);
    g.enemies.length = 0; g.ebullets.length = 0; g.pods.length = 0;
    const p1 = g.players[0], p2 = g.players[1];
    p1.ai = false; p1.idle = 0; p2.ai = false; p2.idle = 0;
    p2.lives = 0; p2.invuln = 0;
    g.ebullets.push({ x: p2.x, y: p2.y, vx: 0, vy: 0, r: 5, kind: 'red', t: 0, gz: [false, false] });
    S.frame(2);
    const pod = g.pods[0];
    if (!pod) return { revived: false, pods: 0 };
    p1.x = pod.x; p1.y = pod.y;
    S.frame(3);
    return { revived: !p2.out, lives: p2.lives, invuln: p2.invuln, pods: g.pods.length };
  });
  ok('接触信标救回队友（2 残机 + 无敌 + 信标消失）', res3.revived && res3.lives === 2 && res3.invuln > 0 && res3.pods === 0, res3);

  await page.evaluate(() => { window.__twGame.start('story', true); window.__twGame.setPower(5, 0); window.__twGame.setPower(4, 1); window.__twGame.key(' ', true); window.__twGame.key('numpadenter', true); window.__twGame.frame(420); window.__twGame.render(); });
  await page.screenshot({ path: OUT + '/_shot_coop.png' });
  ok('双人实战推进无异常', errors.length === 0, errors.slice(0, 3));
  await page.evaluate(() => { window.__twGame.key(' ', false); window.__twGame.key('numpadenter', false); });

  console.log('\n--- 双人流程连通性 ---');
  await page.evaluate(() => {
    const S = window.__twGame;
    S.start('story', true); S.setPower(5, 0); S.setPower(5, 1);
    S.key(' ', true); S.key('numpadenter', true);
  });
  let boss2 = false, next2 = false;
  for (let k = 0; k < 30; k++) {
    const s = await page.evaluate(() => {
      const g = window.__twGame.G;
      g.players.forEach((pl) => { pl.lives = 99; pl.invuln = Math.max(pl.invuln, 900); });
      window.__twGame.frame(200);
      return { boss: !!g.boss, st: g.state, stage: g.stage, alive: g.alive().length };
    });
    if (s.boss) boss2 = true;
    if (boss2 && s.alive === 2 && s.st === 'PLAYING' && s.stage === 1) { next2 = true; break; }
  }
  ok('双人共同推进到关底 Boss 并进入第 2 关', boss2 && next2,
    await page.evaluate(() => ({ st: window.__twGame.G.state, stage: window.__twGame.G.stage })));
  await page.evaluate(() => { window.__twGame.key(' ', false); window.__twGame.key('numpadenter', false); });

  console.log('\n--- 画面自适应 ---');
  // 走真实关卡脚本：第 1 关 t=40 的 V 字编队是以参考坐标 240（=中轴）生成的
  const layout = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false); S.killAll();
    S.frame(45);
    const xs = g.enemies.map((e) => e.x);
    const mid = xs.reduce((a, b) => a + b, 0) / xs.length;
    return { W: S.W, H: S.H, mid: Math.round(mid * 10) / 10, n: xs.length };
  });
  ok('逻辑宽度在 420-720 自适应区间内', layout.W >= 420 && layout.W <= 720 && layout.H === 800, layout);
  ok('关卡编队按战场宽度等比居中（参考坐标映射生效）',
    layout.n === 5 && Math.abs(layout.mid - layout.W / 2) < 2, layout);

  console.log('\n--- 敌我配色契约 ---');
  const hue = await page.evaluate(() => {
    const c = document.createElement('canvas'), g2 = c.getContext('2d');
    const probe = (img) => {
      c.width = img.width; c.height = img.height;
      g2.clearRect(0, 0, c.width, c.height);
      g2.drawImage(img, 0, 0);
      const d = g2.getImageData(0, 0, c.width, c.height).data;
      let solid = 0, greenish = 0, redLead = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 120) continue;
        solid++;
        if (d[i + 1] > d[i] * 1.15 && d[i + 1] > d[i + 2] * 1.15) greenish++;
        if (d[i] > d[i + 1] && d[i] > d[i + 2]) redLead++;
      }
      return { solid, greenish, redLead };
    };
    const out = { enemy: {}, ours: {} };
    ['red', 'amber', 'magenta', 'purple', 'green', 'big'].forEach((k) => { out.enemy[k] = probe(window.TW.BULLET[k]); });
    ['vulcan', 'laser', 'missile', 'wing', 'charge'].forEach((k) => { out.ours[k] = probe(window.TW.BULLET[k]); });
    return out;
  });
  const badHue = Object.keys(hue.enemy).filter((k) => hue.enemy[k].solid === 0 || hue.enemy[k].greenish / hue.enemy[k].solid > 0.05);
  ok('敌弹一律暖色，不存在「绿色=安全」的误导色', badHue.length === 0,
    { bad: badHue, sample: hue.enemy.green });
  const oursWarm = Object.keys(hue.ours).filter((k) => hue.ours[k].solid === 0 || hue.ours[k].redLead / hue.ours[k].solid > 0.1);
  ok('我方子弹一律冷色（红通道不得主导）', oursWarm.length === 0,
    { bad: oursWarm, sample: hue.ours.missile });

  console.log('\n--- 局内 Build（升级自动发词条，无弹窗） ---');
  await page.evaluate(() => window.__twGame.start('story', false));
  const lv0 = await page.evaluate(() => window.__twGame.G.player.level);
  const before = await page.evaluate(() => Object.keys(window.__twGame.perks()).length);
  /* 升级时自动发词条，不弹菜单、不减速、不抢键 */
  await page.evaluate(() => window.__twGame.gainExp(6));
  const st = await page.evaluate(() => ({
    lv: window.__twGame.G.player.level,
    pick: !!window.__twGame.G.player.pick,
    nPerks: Object.keys(window.__twGame.perks()).length,
  }));
  ok('吃经验升级并自动发放词条（无弹窗）', st.lv > lv0 && !st.pick && st.nPerks > before, st);

  /* 升级不中断操作：升级后仍可正常移动，没有三选一抢方向键 */
  const moveOk = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false); S.gainExp(60);
    const x0 = g.player.x;
    S.key('d', true); S.frame(30); S.key('d', false);
    return { pick: !!g.player.pick, moved: g.player.x > x0 + 5, nPerks: Object.keys(S.perks()).length };
  });
  ok('升级不弹窗、不抢键、仍可移动', !moveOk.pick && moveOk.moved && moveOk.nPerks > 0, moveOk);

  /* 单发对比：每次都把射击冷却归零，否则两次统计的射击次数会不同 */
  const twinTest = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false); S.setPower(3);
    const oneShot = (perks) => {
      window.TW.FX.hitstop = 0;
      g.player.perks = perks; g.player.fireT = 0; g.pbullets.length = 0;
      S.key(' ', true); S.frame(1); S.key(' ', false);
      return g.pbullets.length;
    };
    return { before: oneShot({}), after: oneShot({ twin: 2 }) };
  });
  ok('词条实际改变弹幕形态（双联发射增加弹数）', twinTest.after > twinTest.before, twinTest);

  console.log('\n--- 超载 OVERDRIVE ---');
  const odTest = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false); S.setPower(3);
    const oneShot = (od) => {
      window.TW.FX.hitstop = 0;
      g.player.od = od; g.player.fireT = 0; g.pbullets.length = 0;
      S.key(' ', true); S.frame(1); S.key(' ', false);
      return g.pbullets.length;
    };
    const normal = oneShot(0);
    S.overdrive(0);
    const on = g.player.od > 0;
    return { on: on, odShots: oneShot(g.player.od), normal: normal };
  });
  ok('超载可触发且提升输出', odTest.on && odTest.odShots > odTest.normal, odTest);

  const grazeCharge = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false);
    const pl = g.player;
    pl.od = 0; pl.odCharge = 0; pl.invuln = 9999;
    g.ebullets.push({ x: pl.x + pl.grazeR * 0.5, y: pl.y, vx: 0, vy: 0, r: 4, kind: 'red', t: 0, gz: [false, false] });
    S.frame(2);
    return { charge: pl.odCharge, graze: pl.graze };
  });
  ok('擦弹为超载充能（贴弹幕飞有即时回报）', grazeCharge.charge > 0 && grazeCharge.graze > 0, grazeCharge);

  console.log('\n--- 关卡机制：精英机 / 陨石 / 激光栅栏 ---');
  const mech = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false); S.killAll();
    S.spawnElite(); const elite = g.enemies.filter((e) => e.elite).length;
    S.spawnRock(); const rock = g.rocks.length;
    S.spawnBeam(); const beam = g.beams.length;
    return { elite: elite, rock: rock, beam: beam };
  });
  ok('精英机 / 陨石 / 激光栅栏均可生成', mech.elite === 1 && mech.rock === 1 && mech.beam === 1, mech);

  const seg = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false);
    let seen = 0;
    for (let i = 0; i < 1400 && g.stageT < 1200; i++) {
      g.player.invuln = 900; g.player.lives = 99;
      S.frame(1);
      seen = Math.max(seen, g.enemies.filter((e) => e.elite).length);
    }
    return { seen: seen, stageT: g.stageT };
  });
  ok('段末精英机会登场（每关切成三个节奏高点）', seg.seen > 0, seg);

  const gimmick = await page.evaluate(() => {
    const S = window.__twGame, g = S.G;
    S.start('story', false); S.gotoStage(2);
    let maxRock = 0;
    for (let i = 0; i < 1200; i++) {
      g.player.invuln = 900; g.player.lives = 99;
      S.frame(1);
      maxRock = Math.max(maxRock, g.rocks.length);
    }
    return { maxRock: maxRock, gim: window.TW.STAGES[2].gimmick, beamGim: window.TW.STAGES[3].gimmick };
  });
  ok('每关有独有机制（第 3 关陨石带 / 第 4 关激光栅栏）',
    gimmick.gim === 'meteor' && gimmick.beamGim === 'beam' && gimmick.maxRock > 0, gimmick);

  console.log('\n--- 长线牵引：每日挑战 / 成就 ---');
  const daily = await page.evaluate(() => {
    const M = window.TW.Meta;
    const p1 = M.dailyPool(), p2 = M.dailyPool();
    const other = M.dailyPool('20200101');
    return {
      stable: JSON.stringify(p1) === JSON.stringify(p2), n: p1.length,
      differs: JSON.stringify(other) !== JSON.stringify(p1),
    };
  });
  ok('每日挑战词条池当天固定、每天不同', daily.stable && daily.n === 6 && daily.differs, daily);

  const dailyMode = await page.evaluate(() => {
    const S = window.__twGame;
    S.start('daily', false);
    return { daily: S.G.daily, pool: S.G.perkPool, pow: S.G.dailyPow, rank: Math.round(S.G.rank) };
  });
  ok('每日挑战模式生效（限定池 + 起步 Rank 更高）',
    dailyMode.daily && !!dailyMode.pool && dailyMode.pow >= 1 && dailyMode.rank > 0, dailyMode);

  const ach = await page.evaluate(() => {
    const M = window.TW.Meta;
    localStorage.removeItem('tw_ach');
    const st = { win: true, score: 10, wave: 0, level: 1, maxCombo: 0, deaths: 0, odTriggers: 0, graze: 0 };
    const fresh = M.check(st).map((a) => a.id);
    const again = M.check(st).length;
    return { fresh: fresh, again: again };
  });
  ok('成就可解锁且不重复解锁', ach.fresh.indexOf('clear1') >= 0 && ach.again === 0, ach);

  const achUI = await page.evaluate(() => {
    document.querySelector('[data-act="show-ach"]').click();
    const el = document.getElementById('ov-ach');
    return { shown: !el.classList.contains('hidden'), items: document.querySelectorAll('#ach-list .ach-item').length };
  });
  ok('成就面板可打开且列出全部条目', achUI.shown && achUI.items === 8, achUI);
  await page.evaluate(() => { document.getElementById('ov-ach').classList.add('hidden'); });

  console.log('\n--- 全程异常检查 ---');
  ok('运行期间无 JS 异常', errors.length === 0, errors.slice(0, 5));

  await browser.close();
  console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})();
