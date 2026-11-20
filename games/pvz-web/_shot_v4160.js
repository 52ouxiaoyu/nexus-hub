/* v4.0.160 截图：同一关连开两次的对照（证明每局地图不同）+ 关卡面板 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-shot160-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window._pvzGame');
  await sleep(600);

  // 关卡面板（走真实入口）
  await p.evaluate(() => document.querySelector('#btn-vase').click());
  await sleep(700);
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4160_levels.png' });
  console.log('levels panel ok');

  // 第 7 关：连开两次
  for (const k of [1, 2]) {
    await p.evaluate((k) => {
      const g = window._pvzGame;
      g._startVaseLevel(7);
      g.gameSpeed = 1;
    }, k);
    await sleep(1200);
    await p.screenshot({ path: `/Users/clawbox/nexus-hub/pvz-web/_v4160_L7_run${k}.png` });
    const info = await p.evaluate(() => window._pvzGame.vases
      .slice().sort((a, b) => a.row - b.row || a.col - b.col)
      .map(v => `${v.type[0]}${v.golden ? 'G' : ''}@${v.row},${v.col}`).join(' '));
    console.log(`run${k}: ${info}`);
  }
  await b.close();
})();
