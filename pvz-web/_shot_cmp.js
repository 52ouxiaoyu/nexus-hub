/* 画风对比：HEAD(旧) vs 工作区(新) —— 泡泡牧场 / 机械龙 / 大厅 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = '/Users/clawbox/nexus-hub/pvz-web/';
async function shot(root, tag) {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-cmp-' + tag + '-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 820 });
  await p.goto('file://' + root + '/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window.MiniGames');
  await sleep(800);
  await p.evaluate(() => window.MiniGames.openBubble());
  await sleep(700);
  await p.screenshot({ path: OUT + '_v4162_' + (tag==='old'?'before':'after') + '_lobby.png' });
  for (const id of ['farm', 'dragon']) {
    await p.evaluate(gid => { window.MiniGames.openBubble(); window.MiniGames.openGame(gid); }, id);
    await sleep(1600);
    await p.screenshot({ path: OUT + '_v4162_' + (tag==='old'?'before':'after') + '_' + id + '.png' });
  }
  await b.close();
}
(async () => {
  await shot('/tmp/pvzhead/pvz-web', 'old');
  await shot('/Users/clawbox/nexus-hub/pvz-web', 'new');
  console.log('done');
})();
