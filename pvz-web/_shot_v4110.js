// v4.0.110 截图：图鉴「守屋专属」分区 + 融合分区对照
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('!!document.getElementById("btn-help-guide")', { timeout: 20000 });
  await page.evaluate(() => {
    document.getElementById('btn-help-guide').click();
    document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click();
  });
  await sleep(500);

  const scrollTo = async (idx) => page.evaluate((i) => {
    const d = document.getElementById('hg-detail');
    if (d) { d.style.display = 'none'; d.innerHTML = ''; }
    const body = document.getElementById('help-body');
    const gs = [...body.querySelectorAll('.hg-group')];
    if (gs[i]) body.scrollTop += gs[i].getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
  }, idx);

  await scrollTo(2);
  await sleep(600);
  await page.screenshot({ path: '_v4110_guide_dorm.png' });

  await scrollTo(1);
  await sleep(600);
  await page.screenshot({ path: '_v4110_guide_fusion.png' });
  await browser.close();
})();
