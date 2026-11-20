// v4.0.101 截图：P2 挂机托管激活瞬间（播报+头顶提示）
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
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  // P1 保持活跃，P2 立即满足挂机条件
  for (let i = 0; i < 3; i++) { await p.keyboard.press('KeyW'); await sleep(1200); }
  await p.evaluate(() => {
    window.game.player2.invincibleT = 99999;
    window.game.player2._lastInputAt = performance.now() - 11000;
  });
  await sleep(1500);
  await p.keyboard.press('KeyS'); // P1 活跃
  await sleep(500);
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4101_afk.png' });
  const st = await p.evaluate(() => ({
    host2: !!window.game.player2._afkHost, host1: !!window.game.player._afkHost,
    badge: (document.getElementById('start-version') || {}).innerText
  }));
  console.log(JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
