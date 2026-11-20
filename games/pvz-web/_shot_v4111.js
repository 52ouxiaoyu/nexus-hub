// v4.0.111 截图：满级豌豆升级瞬间显示的新伤害数字（伤19300）
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
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });

  // 造一株 t15，进屋、升到 t16，抓升级飘字
  const info = await page.evaluate(() => {
    const g = window.game;
    g.ghostLevel = 8;
    g.player.invincibleT = 99999;
    g.ghostSpawnAt = 9e9;
    const rm = g.rooms[0];
    let pick = null;
    for (let r = rm.y; r < rm.y + rm.h && !pick; r++)
      for (let c = rm.x; c < rm.x + rm.w && !pick; c++) {
        if (rm.tpl.grid[r - rm.y][c - rm.x] !== 1) continue;
        if (g.plants.some(p => p.c === c && p.r === r)) continue;
        pick = { c, r };
      }
    const pl = g.spawnPlant(pick.c, pick.r, 'melonstail', false, g.player);
    // 玩家站到植物旁，镜头跟过去
    g.player.x = pick.c * 80 + 40;
    g.player.y = pick.r * 80 + 140;
    return { c: pick.c, r: pick.r, dmg15: pl.def.shoot.dmg };
  });
  await sleep(5200);   // 等开局横幅/播报自然消失，避免压住升级飘字

  await page.evaluate(() => {
    const g = window.game;
    const pl = g.plants.find(p => p.def && p.def.up && p.def.up.to === 'icemelonstail');
    if (pl) g._evolve(pl, 'icemelonstail');
  });
  await sleep(220);
  await page.screenshot({ path: '_v4111_upgrade_dmg.png' });

  const after = await page.evaluate(() => {
    const g = window.game;
    const p = g.plants.find(x => x.def && x.def.tier === 16);
    return { name: p ? p.def.name : null, dmg: p ? p.def.shoot.dmg : null,
             fly: [...document.querySelectorAll('.fly-text, .flytext, div')].map(e => e.innerText || '').filter(t => /伤/.test(t)).slice(0, 3) };
  });
  console.log('t15 →', info.dmg15, '｜ t16 →', after.name, after.dmg, '｜ 飘字', JSON.stringify(after.fly));

  await browser.close();
})();
