// 诊断 T1：回自家床边过程中发生了什么（是否被抢盲盒劫走）
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
  page.on('pageerror', e => console.log('PAGEERROR:', (e.stack || String(e)).slice(0, 300)));
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await page.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  await page.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
    g.player.x = 40; g.player.y = 40; g.player.el1.style.left = '40px'; g.player.el1.style.top = '40px';
    g.player2.x = 40; g.player2.y = 80; g.player2.el1.style.left = '40px'; g.player2.el1.style.top = '80px';
    window._keep = setInterval(() => { g.player._lastInputAt = performance.now(); g.player2._lastInputAt = performance.now(); }, 300);
  });
  await page.waitForFunction(`(() => { const g = window.game; return g.ais.every(a => a.dead || !!a.room); })()`, { timeout: 60000 });
  await sleep(1200);
  await page.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => a.room && !a.dead);
    const rm = ai.room;
    const bed = { x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 };
    ai.pinned = false; ai.pinX = undefined; ai.pinY = undefined;
    ai.x = rm.frontX; ai.y = rm.frontY + 120;
    ai.path = [{ x: rm.frontX, y: rm.frontY }, { x: bed.x, y: bed.y }];
    ai.targetRoom = rm;
    window._ai = ai; window._bed = bed;
  });
  for (let i = 0; i < 16; i++) {
    await sleep(300);
    const s = await page.evaluate(() => {
      const a = window._ai, b = window._bed;
      return {
        d: Math.round(Math.hypot(a.x - b.x, a.y - b.y)), pinned: !!a.pinned,
        path: a.path ? a.path.length : 0, drop: !!a.targetDrop, flee: !!a.fleeing,
        spd: a.speed, room: !!a.room, tg: !!a.targetRoom, drops: (window.game.airdrops || []).length
      };
    });
    console.log((i * 0.3).toFixed(1) + 's', JSON.stringify(s));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
