const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction(() => {
    const el = document.getElementById('start-version');
    return el && el.textContent && !el.textContent.includes('加载');
  }, { timeout: 15000 });
  const r = await page.evaluate(() => {
    const el = document.getElementById('start-version');
    const rect = el.getBoundingClientRect();
    return { text: el.textContent, width: Math.round(rect.width), bottom: Math.round(rect.bottom) };
  });
  console.log(JSON.stringify(r));
  await new Promise(res => setTimeout(res, 800));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4032_verbar.png' });
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
