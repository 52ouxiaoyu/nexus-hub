// v4.0.28 现状截图：守屋卡片/阵营弹窗/模式弹窗/选卡界面
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-shot4028-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await sleep(2500);

  // 1. 主菜单全貌（守屋卡片现状）
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_menu.png' });

  // 2. 守屋阵营弹窗
  await page.click('#btn-dorm'); await sleep(600);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_faction.png' });
  await page.evaluate(() => { document.getElementById('dorm-faction-back').click(); });
  await sleep(400);

  // 3. 砸罐子难度弹窗（对照组样式）
  await page.click('#btn-vase'); await sleep(600);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_vase_diff.png' });
  await page.evaluate(() => { document.getElementById('diff-back').click(); });
  await sleep(400);

  // 4. 经典冒险选卡界面
  await page.click('#btn-adventure'); await sleep(800);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_seedbar.png' });

  await browser.close();
  console.log('SHOT_OK');
})();
