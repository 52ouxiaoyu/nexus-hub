// v4.0.122 出图（1p，等横幅消失、镜头居中）：站门格门板保护 / O 键出门
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"');
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.rooms');
  await sleep(7500);   // 开局引导横幅 5 秒后消失

  await page.evaluate(() => { window.game.ghostSpawnAt = 0; });
  await page.waitForFunction('window.game.zombies.length > 0', { timeout: 15000 });
  await sleep(800);

  // ---- 场景 1：P1 站门格，僵尸贴门板，打开升级门板菜单 ----
  const s1 = await page.evaluate(async () => {
    const g = window.game, gs = g.gridSize;
    const rm = g.rooms[0], d = g._doorOutDir(rm);
    let dp = g.getPlantAt(rm.doorCol * gs + 40, rm.doorRow * gs + 40);
    if (!dp) { g.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true, g.player); dp = g.getPlantAt(rm.doorCol * gs + 40, rm.doorRow * gs + 40); }
    g.player.x = rm.doorCol * gs + 40; g.player.y = rm.doorRow * gs + 40;
    g.player.hp = 100; g.player.maxHp = 100; g.setHp();
    const z = g.zombies.find(z => !z.dead);
    const oldSpd = z.speed; z.speed = 0;
    z.x = (rm.doorCol + d.ox) * gs + 40 - d.ox * 26;
    z.y = (rm.doorRow + d.oy) * gs + 40 - d.oy * 26;
    z.lockedTarget = g.player; z.path = null; z.retreating = false;
    await new Promise(r => setTimeout(r, 1200));
    return { dist: Math.round(Math.hypot(g.player.x - z.x, g.player.y - z.y)), hp: Math.round(g.player.hp),
             door: { c: rm.doorCol, r: rm.doorRow }, dir: d };
  });
  await page.keyboard.press('KeyF');       // 打开门板升级菜单
  await sleep(700);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4122_door_guard.png' });
  console.log('场景1:', JSON.stringify(s1));

  // ---- 场景 2：回到门内一格，按 O 出门 ----
  await page.evaluate(() => {
    const g = window.game, gs = g.gridSize;
    if (g.kmenus[1]) g.kmenus[1].active = false;
    if (g.p1Kmenu) g.p1Kmenu.style.display = 'none';
    const rm = g.rooms[0], d = g._doorOutDir(rm);
    g.player.x = (rm.doorCol - d.ox) * gs + 40;
    g.player.y = (rm.doorRow - d.oy) * gs + 40;
    g.player.hp = 100; g.setHp();
  });
  await sleep(600);
  const before = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize;
    return { c: Math.floor(g.player.x / gs), r: Math.floor(g.player.y / gs) };
  });
  await page.keyboard.press('KeyO');
  await sleep(800);
  const after = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize;
    const c = Math.floor(g.player.x / gs), r = Math.floor(g.player.y / gs);
    return { c, r, zone: !!g._roomZoneOf(c, r) };
  });
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4122_door_exit.png' });
  console.log('场景2 房内 → O 出门:', JSON.stringify({ before, after }));

  await b.close();
})();
