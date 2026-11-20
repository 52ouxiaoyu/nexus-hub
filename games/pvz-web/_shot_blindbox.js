const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-shot-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto('file://' + path.resolve(__dirname, 'haunted-dorm.html?mode=1p&role1=peashooter'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const g = window.game;
    g.loop = () => {};
    g._updateAIs = () => {};
    g.player.spore = 500;
    const rm = g.rooms[0];
    // 种一个盲盒
    g.menuCol = rm.x + 1;
    g.menuRow = rm.y + 1;
    g.doPlant('blindbox');
    // 再打开菜单显示状态
    g.openPlantMenu(450, 320);
  });

  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve(__dirname, '_v4028_blindbox.png') });
  console.log('Screenshot saved to _v4028_blindbox.png');

  await browser.close();
})();
