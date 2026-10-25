// 诊断：僵尸模式下号令尸潮，小鬼/巨人到底在追谁？会不会围着玩家本体（同类）打空手？
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
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(400);

  const info = await page.evaluate(() => {
    const g = window.game;
    return {
      faction: g.faction, isZombieFaction: g.isZombieFaction,
      playerIsZombie: !!g.player.isZombie,
      allPlayers: g.allPlayers.map(p => ({ ai: !!p.isAi, zombie: !!p.isZombie, hp: Math.round(p.hp), name: p.roleDef && p.roleDef.name })),
      plants: g.plants.length,
      roomsWithPlants: g.rooms.filter(rm => g.plants.some(pl => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h)).length,
      aisInRoom: g.ais.filter(a => a.room).length,
      playerPos: [Math.round(g.player.x), Math.round(g.player.y)]
    };
  });
  console.log('== 开局状态 ==');
  console.log(JSON.stringify(info, null, 1));

  // 等 AI 发育 + 玩家走开一点，然后连号两波尸潮
  await sleep(6000);
  const pre = await page.evaluate(() => {
    const g = window.game;
    g.waveOrderCd = 0; g._orderHorde();
    g.waveOrderCd = 0; g._orderHorde();
    return {
      zombies: g.zombies.length,
      plants: g.plants.length,
      roomsWithPlants: g.rooms.filter(rm => g.plants.some(pl => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h)).length,
      playerHp: Math.round(g.player.hp),
      playerPos: [Math.round(g.player.x), Math.round(g.player.y)]
    };
  });
  console.log('== 号令两波尸潮后 ==');
  console.log(JSON.stringify(pre, null, 1));

  const frames = [];
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    const s = await page.evaluate(() => {
      const g = window.game;
      const zs = g.zombies.filter(z => !z.dead);
      return {
        t: Math.round(g.gameTime),
        n: zs.length,
        lockPlayer: zs.filter(z => z.lockedTarget === g.player && !g.player.dead).length,
        lockAi: zs.filter(z => z.lockedTarget && z.lockedTarget.isAi).length,
        lockPlant: zs.filter(z => z.lockedTarget && z.lockedTarget._isPlant).length,
        lockNull: zs.filter(z => !z.lockedTarget).length,
        nearPlayer: zs.filter(z => Math.hypot(z.x - g.player.x, z.y - g.player.y) < 120).length,
        minDist: zs.length ? Math.round(Math.min(...zs.map(z => Math.hypot(z.x - g.player.x, z.y - g.player.y)))) : -1,
        playerHp: Math.round(g.player.hp),
        plants: g.plants.length,
        cmdTarget: g.commandTarget ? (g.commandTarget === g.player ? 'PLAYER' : (g.commandTarget.roleDef ? g.commandTarget.roleDef.name : '?')) : 'none'
      };
    });
    frames.push(s);
  }

  const tot = frames.reduce((a, f) => ({ lockPlayer: a.lockPlayer + f.lockPlayer, lockAi: a.lockAi + f.lockAi, n: a.n + f.n }), { lockPlayer: 0, lockAi: 0, n: 0 });
  console.log('== 12 秒采样 ==');
  console.log('僵尸-帧总数', tot.n, '｜锁定玩家本体的僵尸-帧', tot.lockPlayer, '｜锁定人机的僵尸-帧', tot.lockAi);
  console.log('最近距离序列', frames.map(f => f.minDist).filter((v, i) => i % 5 === 0).join(' '));
  console.log('贴脸(<120px)数量序列', frames.map(f => f.nearPlayer).filter((v, i) => i % 5 === 0).join(' '));
  console.log('玩家血量 起→终', frames[0].playerHp, '→', frames[frames.length - 1].playerHp);
  console.log('玩家植物/僵尸数量 终', frames[frames.length - 1].plants, '/', frames[frames.length - 1].n);
  console.log('令旗目标', frames[0].cmdTarget);
  console.log('异常', errors.length ? errors.slice(0, 5) : '无');
  await browser.close();
})();
