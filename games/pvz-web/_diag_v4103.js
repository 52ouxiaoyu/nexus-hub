const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', e.stack || String(e)));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300)); });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  await p.evaluate(() => { window.game.player2.invincibleT = 999999; });
  await sleep(11000);
  const r = await p.evaluate(() => ({ host2: !!window.game.player2._afkHost, host1: !!window.game.player._afkHost }));
  console.log('after 11s:', JSON.stringify(r));
  await sleep(3000);
  const r2 = await p.evaluate(() => {
    const g = window.game;
    return { host2: !!g.player2._afkHost, p2dead: g.player2.dead, p2hasEl: !!g.player2.el1, running: !!g._raf };
  });
  console.log('after 14s:', JSON.stringify(r2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
