// v4.0.106 截图：守屋 2p —— 按 P 进入绝对暂停的画面
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
  await p.waitForFunction('window.game && window.game.player2 && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
  });
  await sleep(6000);          // 先让对局跑一会儿（阳光/僵尸/人机都在动）
  await p.keyboard.press('KeyP');
  await sleep(800);
  await p.screenshot({ path: '_v4106_paused.png' });
  const r = await p.evaluate(() => ({
    paused: window.game.paused,
    overlay: !!document.getElementById('dorm-pause'),
    ver: (document.body.innerText.match(/v4\.0\.\d+/) || [''])[0]
  }));
  console.log(JSON.stringify(r));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
