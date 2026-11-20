// v4.0.105 截图：人机钉在自家阳光菇格上发育（2p，镜头贴到人机房间）
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
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 999999; g.player2.invincibleT = 999999;
    window._keep = setInterval(() => { g.player._lastInputAt = performance.now(); g.player2._lastInputAt = performance.now(); }, 300);
  });
  // 等全部人机入住 + 发育一会儿
  await p.waitForFunction(`(() => { const g = window.game; return g.ais.every(a => a.dead || (a.room && a.pinned)); })()`, { timeout: 70000 });
  await sleep(9000);
  // 镜头贴到第一只人机的房间：两个真人挪到房间门口附近（2p 相机取两人中点）
  const info = await p.evaluate(() => {
    const g = window.game;
    const ai = g.ais.find(a => a.room && a.pinned && !a.dead);
    const rm = ai.room;
    const bed = { x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 };
    g.player.x = bed.x - 140; g.player.y = bed.y + 40;
    g.player.el1.style.left = g.player.x + 'px'; g.player.el1.style.top = g.player.y + 'px';
    g.player2.x = bed.x + 40; g.player2.y = bed.y + 120;
    g.player2.el1.style.left = g.player2.x + 'px'; g.player2.el1.style.top = g.player2.y + 'px';
    const plantsInRoom = g.plants.filter(pl => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h)
      .map(pl => ({ n: pl.def.name, c: pl.c, r: pl.r, atBed: pl.c === rm.x + rm.tpl.beds[0].c && pl.r === rm.y + rm.tpl.beds[0].r }));
    return { aiDistToBed: Math.round(Math.hypot(ai.x - bed.x, ai.y - bed.y)), pinned: !!ai.pinned, plantsInRoom, ver: (document.body.innerText.match(/v4\.0\.\d+/) || [])[0] };
  });
  await sleep(1200);
  await p.screenshot({ path: '_v4105_pinned.png' });
  console.log(JSON.stringify(info));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
