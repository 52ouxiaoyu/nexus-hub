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
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(800);
  const out = await p.evaluate(async () => {
    const g = window.game;
    g.ais.forEach(a => { a.actTimer = 9999; });
    g.zombiesPerMin = 0;
    g.dnNext = 1e12;
    // 挂住 addSun 记录来源
    const orig = g.addSun.bind(g);
    window._sunLog = [];
    g.addSun = (n, who) => {
      window._sunLog.push({ n, who: who && (who.isAi ? 'AI(' + (who.roleDef || {}).name + ')' : (who === g.player ? 'P1' : 'other')), stack: new Error().stack.split('\n')[2] });
      return orig(n, who);
    };
    const freeRoom = g.rooms.find(rm => !rm.owners || rm.owners.length === 0) || g.rooms[0];
    const cells = [];
    for (let r = 0; r < freeRoom.tpl.grid.length; r++)
      for (let c = 0; c < freeRoom.tpl.grid[r].length; c++)
        if (freeRoom.tpl.grid[r][c] === 1) cells.push({ c: freeRoom.x + c, r: freeRoom.y + r });
    g.spawnPlant(cells[0].c, cells[0].r, 'puffshroom', false, g.player);
    g.spawnPlant(cells[1].c, cells[1].r, 'plantern', false, g.player);
    g.plants = g.plants.filter(pl => pl.owner !== g.player || pl.def.name.includes('喷菇') || pl.def.name.includes('路灯花'));
    const kept = g.plants.filter(pl => pl.owner === g.player).map(pl => pl.def.name + '@' + pl.c + ',' + pl.r);
    const s0 = g.player.sun;
    await new Promise(res => setTimeout(res, 2200));
    return { kept, delta: g.player.sun - s0, log: window._sunLog, isNight: g.isNight };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
