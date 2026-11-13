/* v4.0.157 平衡模拟：按真实三消分布（3~6 连、4 色均分、25% 空发）跑 300 局，
 * 直接调用 DragonRaid.onPop 的真实伤害逻辑，统计打死机械龙要多少回合。 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files','--no-sandbox','--disable-gpu'], userDataDir: '/tmp/pptr-bal-'+Date.now() });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'index.html'), { waitUntil: 'networkidle2' });
  await sleep(700);
  await p.evaluate(() => window.MiniGames.openGame('dragon'));
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = window.MiniGames.active;
    const runs = [];
    for (let k = 0; k < 300; k++) {
      g.reset();
      let turns = 0;
      while (g.hp > 0 && turns < 400) {
        turns++;
        // 25% 打空（落点无可消）
        if (Math.random() < 0.25) { g.combo = 0; g.tickTurn(); continue; }
        const col = (Math.random() * 4) | 0;
        const r0 = Math.random();
        const n = r0 < 0.45 ? 3 : r0 < 0.80 ? 4 : r0 < 0.95 ? 5 : 6;
        const dropped = Math.random() < 0.30 ? 2 + ((Math.random() * 3) | 0) : 0;
        g.onPop({ popped: n, dropped, size: n, col });
        g.tickTurn();
      }
      runs.push({ turns, hp: g.hp, hpMax: g.hpMax, gloom: g.gloom });
    }
    const sorted = runs.map(r => r.turns).sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const secs = avg * 3.0;                     // 每回合约 3 秒（瞄准 + 飞行）
    return {
      avgTurns: +avg.toFixed(1),
      median: sorted[150],
      p10: sorted[30], p90: sorted[270],
      max: sorted[sorted.length - 1],
      avgSecs: Math.round(secs),
      gloomRate: +(runs.filter(r => r.gloom).length / runs.length * 100).toFixed(1),
      cleared: runs.filter(r => r.hp <= 0).length
    };
  });
  console.log('SIM', JSON.stringify(r, null, 1));
  await b.close();
})();
