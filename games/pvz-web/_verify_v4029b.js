// T8b 兜底分支：无任何已放置推车时，祝福随身送一台
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  const url = 'file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter';
  await page.goto(url);
  await page.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.mowerItems && window.game.mowerItems.length>0', { timeout: 30000 });
  const r = await page.evaluate(() => {
    const g = window.game, p = g.player;
    g.mowers = [];           // 无任何已放置推车
    p.mowerCarry = 0;
    const bless = window.HauntedDorm.BLESSINGS.find(b => b.id === 'mower');
    bless.apply(g, p);
    const carryOk = p.mowerCarry === 1 && getComputedStyle(p.mowerBadge).display === 'block';
    // 再选一次祝福：已携带时退孢子
    const sporeBefore = p.spores !== undefined ? p.spores : null;
    bless.apply(g, p);
    return { carryOk, carry2: p.mowerCarry, sporeBefore };
  });
  console.log('T8b 兜底随身送推车:', r.carryOk ? 'PASS' : 'FAIL', JSON.stringify(r));
  // T9 版本确认（bump 前）
  const ver = await page.evaluate(() => {
    const m = document.body.innerText.match(/v4\.0\.\d+/);
    return m ? m[0] : null;
  });
  console.log('[当前页面版本]', ver);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
