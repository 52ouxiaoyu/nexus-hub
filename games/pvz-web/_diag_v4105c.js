// 诊断 v3：给每个人机的 path 装 setter 陷阱——房内被重新赋非空路径时抓调用栈
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
  p.on('pageerror', e => console.log('PAGEERROR:', (e.stack || String(e)).slice(0, 400)));
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
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
    g.player.x = 40; g.player.y = 40; g.player.el1.style.left = '40px'; g.player.el1.style.top = '40px';
    g.player2.x = 40; g.player2.y = 80; g.player2.el1.style.left = '40px'; g.player2.el1.style.top = '80px';
    window._keep = setInterval(() => { g.player._lastInputAt = performance.now(); g.player2._lastInputAt = performance.now(); }, 300);
    window._ev = [];
    window._t0 = performance.now();
    g.ais.forEach((a, k) => {
      let _path = a.path;
      Object.defineProperty(a, 'path', {
        configurable: true,
        get() { return _path; },
        set(v) {
          const inOwn = a.room && (() => {
            const c = Math.floor(a.x / 80), r = Math.floor(a.y / 80);
            return c >= a.room.x && c < a.room.x + a.room.w && r >= a.room.y && r < a.room.y + a.room.h;
          })();
          if (v && v.length > 0 && a.room && inOwn) {
            const st = (new Error().stack || '').split('\n').slice(1, 5).join(' <- ');
            window._ev.push({ t: +((performance.now() - window._t0) / 1000).toFixed(1), ai: k, n: v.length, last: v[v.length - 1], stack: st.replace(/\s+/g, ' ') });
          }
          _path = v;
        }
      });
    });
  });
  // 跑到 男 ghost 出现 + 咬门（僵尸 20s 出笼，陆续升级）；期间记录房内出门事件
  await sleep(75000);
  const ev = await p.evaluate(() => window._ev);
  const st = await p.evaluate(() => {
    const g = window.game;
    return {
      time: Math.round(g.gameTime), ghost: g.ghostSpawned, lvl: g.ghostLevel,
      ais: g.ais.map((a, k) => {
        const inOwn = a.room ? (Math.floor(a.x / 80) >= a.room.x && Math.floor(a.x / 80) < a.room.x + a.room.w && Math.floor(a.y / 80) >= a.room.y && Math.floor(a.y / 80) < a.room.y + a.room.h) : null;
        const door = a.room ? g.getPlantAt(a.room.doorCol * 80, a.room.doorRow * 80) : null;
        return { k, room: a.room ? g.rooms.indexOf(a.room) : -1, inOwn, path: a.path ? a.path.length : 0, fleeing: !!a.fleeing, dead: !!a.dead, x: Math.round(a.x), y: Math.round(a.y), doorHp: door ? door.hp : null, doorIsDoor: door ? !!door.isDoor : null, plants: g.plants.filter(pl => a.room && pl.c >= a.room.x && pl.c < a.room.x + a.room.w && pl.r >= a.room.y && pl.r < a.room.y + a.room.h).length };
      })
    };
  });
  console.log('房内被赋出门路径事件数:', ev.length);
  for (const e of ev.slice(0, 14)) console.log(JSON.stringify(e));
  console.log('\n终态:', JSON.stringify(st, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
