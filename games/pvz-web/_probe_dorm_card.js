// 量测守屋卡片插画区与三张素材的真实尺寸，并试注入候选 CSS 出图
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const cssFile = process.argv[2];      // 候选 CSS 文件（可空）
  const out = process.argv[3] || '_dorm_try';
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

  const dims = await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    const r = art.getBoundingClientRect();
    const imgs = [...art.querySelectorAll('img')].map(i => ({
      cls: i.className, src: i.getAttribute('src'),
      nw: i.naturalWidth, nh: i.naturalHeight,
      w: +i.getBoundingClientRect().width.toFixed(1), h: +i.getBoundingClientRect().height.toFixed(1)
    }));
    return { art: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, imgs };
  });
  console.log(JSON.stringify(dims, null, 1));

  if (cssFile) {
    await page.addStyleTag({ content: fs.readFileSync(cssFile, 'utf8') });
    await sleep(600);
    const card = await page.$('#btn-dorm');
    await card.screenshot({ path: out + '_card.png' });
    const row = await page.$('#vs-row');
    await row.screenshot({ path: out + '_row.png' });
    const d2 = await page.evaluate(() => {
      const art = document.querySelector('#btn-dorm .pkt-art.dorm');
      const r = art.getBoundingClientRect();
      const imgs = [...art.querySelectorAll('img.hero, img[class*="dorm-"]')].map(i => ({
        cls: i.className,
        x: +(i.getBoundingClientRect().x - r.x).toFixed(1),
        w: +i.getBoundingClientRect().width.toFixed(1),
        h: +i.getBoundingClientRect().height.toFixed(1),
        bottom: +(r.bottom - i.getBoundingClientRect().bottom).toFixed(1)
      }));
      return { art: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, imgs };
    });
    console.log('注入后', JSON.stringify(d2, null, 1));
  }
  await browser.close();
})();
