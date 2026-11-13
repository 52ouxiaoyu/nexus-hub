/* v4.0.157 截图 + 平衡实测
 * 平衡：机器人每 0.6 秒随机角度打一发，跑 150 秒游戏时间，看能不能把 640 打完。
 * 顺带把「毒 / 霜冻 / 黄油 / 忧郁菇」四条状态线同时打开截图。 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-gpu'],
    userDataDir: '/tmp/pptr-shot4157-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'), { waitUntil: 'networkidle2' });
  await sleep(900);

  /* ---------- 1. 平衡实测 ---------- */
  await page.evaluate(() => window.MiniGames.openGame('dragon'));
  await sleep(300);
  const bal = await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.reset();
    const t0 = performance.now();
    let shots = 0;
    for (let step = 0; step < 60 * 150; step++) {
      if (step % 36 === 0 && !g.over) {
        // 更像真人的打法：瞄准最低那一行里靠中间的球（不是随机角度）
        const l = g.lane;
        let tgt = null;
        for (let r = l.rows - 1; r >= 0 && !tgt; r--) {
          const cs = [];
          for (let c = 0; c < l.colsIn(r); c++) if (l.g[r][c] >= 0) cs.push(c);
          if (cs.length) tgt = [r, cs[(cs.length / 2) | 0]];
        }
        if (tgt) l.aimAt(l.cx(tgt[0], tgt[1]), l.yOf(tgt[0]) - 30);
        else l.shooter.ang = -Math.PI / 2;
        if (l.fire()) { g.tickTurn(); shots++; }
      }
      g.update(1 / 60);
      if (g.over) break;
    }
    return {
      ms: Math.round(performance.now() - t0),
      hp: Math.round(g.hp), hpMax: g.hpMax, over: g.over, win: g.win,
      turns: g.turn, shots, dmg: g.dmgDone, phase: g.phase,
      gloom: g.gloom, poison: g.poison.per + 'x' + g.poison.turns
    };
  });
  console.log('BALANCE', JSON.stringify(bal));

  /* ---------- 2. 状态全开截图 ---------- */
  await page.evaluate(() => window.MiniGames.openGame('dragon'));
  await sleep(300);
  await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.hp = 380; g.hpMax = 1000; g.phase = 3;
    g.poison = { per: 4, turns: 8 };
    g.frost = 5; g.butter = 8.4; g.gloom = true;
    g.combo = 3; g.turn = 37; g.dmgDone = 620;
    g.poisonFx = 0.4;
    g.baner = '';
    g.banner = '忧郁菇激怒了机械龙 —— 血量上限 1000，但毒伤翻了 4 倍';
    g.bannerT = 2.5;
    g.fx.push({ x: 300, y: 176, s: '忧郁菇 毒 4/回合', t: 1.2, c: '#c9a3ff' });
    g.fx.push({ x: 470, y: 120, s: '-40', t: 1.0, tag: '机枪豌豆 · 四连扫射', c: '#ffd166' });
    g.gatlingFx = 0.5;
  });
  await sleep(120);
  await page.screenshot({ path: path.resolve(__dirname, '_v4157_dragon_status.png') });

  /* ---------- 3. 牧场有作物 ---------- */
  await page.evaluate(() => window.MiniGames.openGame('farm'));
  await sleep(200);
  await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.pots[0].lv = 6; g.pots[0].seed = 0;
    g.pots[1].lv = 4; g.pots[1].seed = 2;
    g.pots[2].lv = 3; g.pots[2].seed = 1;
    g.pots[3].lv = 2; g.pots[3].seed = 0;
    g.pots[4].lv = 5; g.pots[4].seed = 2;
    g.floats.push({ x: 135, y: 430, s: 'Lv6 西瓜投手', t: 1.4, c: '#ffe066' });
  });
  await sleep(200);
  await page.screenshot({ path: path.resolve(__dirname, '_v4157_farm_pots.png') });

  /* ---------- 4. 牧场通关 ---------- */
  await page.evaluate(() => {
    const g = window.MiniGames.active;
    g.pots[0].lv = 6; g.pots[4].lv = 6;
    g.lane.score = 1860;
    g.end(true);
  });
  await sleep(300);
  await page.screenshot({ path: path.resolve(__dirname, '_v4157_farm_win.png') });

  await browser.close();
})();
