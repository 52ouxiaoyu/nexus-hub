// 截图：僵尸模式号令尸潮后，小鬼/巨人奔向有植物的房间（不再围着玩家本体）
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
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });

  // 让 AI 发育出植物 + 小屋都有人
  await sleep(9000);
  const st = await page.evaluate(() => {
    const g = window.game;
    g.waveOrderCd = 0; g._orderHorde(); g.waveOrderCd = 0; g._orderHorde();
    return { plants: g.plants.length, aisInRoom: g.ais.filter(a => a.room).length };
  });
  console.log('开局：植物', st.plants, '｜已进屋人机', st.aisInRoom);
  await sleep(11000);

  const info = await page.evaluate(() => {
    const g = window.game;
    const zs = g.zombies.filter(z => !z.dead);
    const el = document.getElementById('skill-hud');
    return {
      zombies: zs.length,
      lockPlayer: zs.filter(z => z.lockedTarget === g.player).length,
      lockAi: zs.filter(z => z.lockedTarget && z.lockedTarget.isAi).length,
      hud: el ? el.innerText.replace(/\s+/g, ' ') : '',
      playerHp: Math.round(g.player.hp)
    };
  });
  console.log(JSON.stringify(info, null, 1));

  await page.screenshot({ path: '_v4115_horde_walk.png' });

  // HUD 局部
  const hud = await page.evaluate(() => {
    const el = document.getElementById('skill-hud');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 6), w: Math.min(1280, r.width + 16), h: r.height + 12 };
  });
  if (hud) await page.screenshot({ path: '_v4115_hud.png', clip: { x: hud.x, y: hud.y, width: hud.w, height: hud.h } });

  // 令旗指向某位幸存者的画面
  await page.evaluate(() => { const g = window.game; g._cycleCommandTarget(); g._cycleCommandTarget(); });
  await sleep(600);
  await page.screenshot({ path: '_v4115_cmd.png' });
  console.log('截图完成');
  await browser.close();
})();
