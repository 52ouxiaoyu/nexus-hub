// v4.0.108 截图：出生点在屋外空地（房子在视野内）+ 走进房间 + 2p 双方各在自家门外
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TIP = (txt) => `
  const old = document.getElementById('shot-tip'); if (old) old.remove();
  const tip = document.createElement('div');
  tip.id = 'shot-tip';
  tip.style = "position:absolute; left:50%; top:63%; transform:translate(-50%,-50%); color:#ffd54a; font-size:22px; font-weight:bold; text-shadow:2px 2px 0 #000, 0 0 12px rgba(0,0,0,.8); z-index:9000; pointer-events:none; white-space:nowrap;";
  tip.innerText = ${JSON.stringify(txt)};
  document.body.appendChild(tip);
`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const boot = async (o) => {
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
    await page.evaluate((cfg) => {
      localStorage.clear();
      document.getElementById('start-menu').style.display = 'block';
      document.getElementById('dorm-screen').style.display = 'block';
      window.startHauntedDorm(cfg);
    }, o);
    await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
    await page.evaluate(() => {
      const g = window.game;
      g.player.invincibleT = 999999;
      if (g.player2) g.player2.invincibleT = 999999;
      g.ghostSpawnAt = 9e9;         // 别让僵尸来搅景
    });
    await sleep(7200);              // 等开场播报队列播完
  };

  // —— 1p：出生在屋外，房子在正前方 ——
  await boot({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  await page.evaluate(new Function(TIP('🏠 你在屋外 → 走进最近的空房，点地板种植物才有阳光')));
  await sleep(400);
  await page.screenshot({ path: '_v4108_spawn_outside.png' });

  // 走进房间（对比）
  await page.evaluate(() => {
    const g = window.game, rm = g.player._homeRoom, dr = rm.tpl.door;
    let ox = 0, oy = 0;
    if (dr.r === -1) oy = 1; else if (dr.r >= rm.h) oy = -1;
    else if (dr.c === -1) ox = 1; else if (dr.c >= rm.w) ox = -1;
    const p = g.player;
    p.x = (rm.doorCol + ox) * 80 + 40;
    p.y = (rm.doorRow + oy) * 80 + 40;
    if (p.el1) { p.el1.style.left = p.x + 'px'; p.el1.style.top = p.y + 'px'; }
  });
  await sleep(900);
  await page.evaluate(new Function(TIP('🏠 点脚下地板种一株植物 → 开始产阳光')));
  await sleep(400);
  await page.screenshot({ path: '_v4108_walk_in.png' });

  // —— 2p：两人各在自家门外 ——
  await boot({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  await page.evaluate(new Function(TIP('🏠 两人都在屋外：各自走进一间空房开建')));
  await sleep(400);
  await page.screenshot({ path: '_v4108_2p.png' });

  await browser.close();
})();
