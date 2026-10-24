// 截主菜单守屋大作战卡片（v4.0.112 封面美化前后对照）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = process.argv[2] || '_dorm_card_before';
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('document.getElementById("btn-dorm")', { timeout: 20000 });
  await page.evaluate(() => { const m = document.getElementById('start-menu'); if (m) m.style.display = 'block'; });
  await sleep(1800);   // 等 gif/字体稳定

  const card = await page.$('#btn-dorm');
  await card.screenshot({ path: out + '_card.png' });
  const row = await page.$('#vs-row');
  await row.screenshot({ path: out + '_row.png' });
  await page.screenshot({ path: out + '_full.png' });

  const box = await card.boundingBox();
  console.log('卡片尺寸', JSON.stringify(box));
  await browser.close();
})();
