// 诊断：2p 下人机进房→碰床→离开 的行为采样
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
    // 玩家别干扰：把两人挪到地图角落（不进任何房间）
    g.player.x = 40; g.player.y = 40; g.player.el1.style.left = '40px'; g.player.el1.style.top = '40px';
    g.player2.x = 40; g.player2.y = 80; g.player2.el1.style.left = '40px'; g.player2.el1.style.top = '80px';
    window._keepP1 = setInterval(() => { g.player._lastInputAt = performance.now(); g.player2._lastInputAt = performance.now(); }, 400);
    window._ev = [];
    // 记录每次 room/targetRoom 变化
    window._prev = g.ais.map(a => ({ room: a.room, t: a.targetRoom, inside: -1 }));
  });
  for (let i = 0; i < 90; i++) {
    await sleep(500);
    const rows = await p.evaluate(() => {
      const g = window.game;
      const idx = (rm) => rm ? g.rooms.indexOf(rm) : -1;
      const out = [];
      g.ais.forEach((a, k) => {
        const inside = g._insideRoom(Math.floor(a.x / 80), Math.floor(a.y / 80));
        const cur = { room: idx(a.room), t: idx(a.targetRoom), inside: inside ? g.rooms.indexOf(inside) : -1 };
        const pv = window._prev[k];
        if (pv.room !== cur.room || pv.t !== cur.t || pv.inside !== cur.inside) {
          window._ev.push({ t: (i) * 0.5, ai: k, from: pv, to: cur, x: Math.round(a.x), y: Math.round(a.y), path: a.path ? a.path.length : 0, dead: !!a.dead });
          window._prev[k] = cur;
        }
        out.push({ ai: k, room: cur.room, t: cur.t, inside: cur.inside, path: a.path ? a.path.length : 0, x: Math.round(a.x), y: Math.round(a.y), act: Math.round(a.actTimer || 0), spd: a.speed });
      });
      return out;
    }).catch(e => { console.log('EVAL_ERR', e.message); return []; });
    if (i % 6 === 0) console.log('SAMPLE t=' + (i * 0.5).toFixed(1) + 's', JSON.stringify(rows));
  }
  const ev = await p.evaluate(() => window._ev);
  console.log('\n===== 状态变化事件（room/target/inside）=====');
  for (const e of ev) {
    console.log(`t=${e.t}s AI${e.ai} (${e.x},${e.y}) path=${e.path} | room ${e.from.room}->${e.to.room} | target ${e.from.t}->${e.to.t} | inside ${e.from.inside}->${e.to.inside}`);
  }
  const rooms = await p.evaluate(() => window.game.rooms.map((r, i) => ({ i, x: r.x, y: r.y, w: r.w, h: r.h, beds: r.tpl.beds, cap: r.capacity, owners: r.owners.length })));
  console.log('\n===== 房间表 =====');
  console.log(JSON.stringify(rooms));
  const plants = await p.evaluate(() => window.game.plants.map(pl => ({ c: pl.c, r: pl.r, n: pl.def.name, ai: !!pl.owner && !!pl.owner.isAi, owner: pl.owner ? (pl.owner.isAi ? 'AI' : 'HUMAN') : 'null' })));
  console.log('\n===== 植物 =====');
  console.log(JSON.stringify(plants));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
