// v4.0.104 截图：守屋 2p —— P1 变天使 + P2 变内鬼同框
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
  // 两人都倒下 → 分别按 N（P1 天使）和 2（P2 内鬼）
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 0; g.player.hp = 0; g._checkPlayerDown(g.player);
    g.player2.invincibleT = 0; g.player2.hp = 0; g._checkPlayerDown(g.player2);
  });
  await sleep(500);
  await p.screenshot({ path: '_v4104_fate_wait.png' }); // 等待抉择画面
  await p.keyboard.press('KeyN');
  await sleep(300);
  await p.keyboard.press('Digit2');
  await sleep(1200);
  // 拉到两人附近便于同框
  await p.evaluate(() => {
    const g = window.game;
    g.player.x = 620; g.player.y = 400; g.player.el1.style.left = '620px'; g.player.el1.style.top = '400px';
    g.player2.x = 760; g.player2.y = 400; g.player2.el1.style.left = '760px'; g.player2.el1.style.top = '400px';
    g._refreshHud();
  });
  await sleep(600);
  await p.screenshot({ path: '_v4104_angel_traitor.png' });
  const r = await p.evaluate(() => ({
    a1: !!window.game.player.angelic, t2: !!window.game.player2.traitor,
    ver: document.body.innerText.match(/v4\.0\.\d+/)
  }));
  console.log(JSON.stringify(r));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
