// v4.0.103 截图：托管激活——P2 在房内被托管，画面显示托管徽标/飞字
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
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999;
    g.player2.invincibleT = 999999;
    window._keepP1 = setInterval(() => { g.player._lastInputAt = performance.now(); }, 400);
  });
  // 等 P2 托管激活 + 在房内发育一会儿（有画面内容：飞字/播报/植物）
  await sleep(14000);
  await p.screenshot({ path: '_v4103_hosted.png' });
  const r = await p.evaluate(() => ({ host2: !!window.game.player2._afkHost, ver: document.body.innerText.match(/v4\.0\.\d+/) }));
  console.log(JSON.stringify(r));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
