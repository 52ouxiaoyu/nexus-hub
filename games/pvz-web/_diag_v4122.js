// v4.0.122 诊断：① 站门格被咬 ② 重开血量残留 ③ P1 死后 P2 血量变化
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message)));

  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"');
  await p.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ gameMode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.allPlayers && window.game.player2');
  await sleep(1500);

  // ---------- A) 站在门格上：僵尸在门外相邻格，会不会掉血 ----------
  const A = await p.evaluate(async () => {
    const g = window.game, gs = g.gridSize;
    // 找一个已认领/最近的空房，把 P1 放到门格上，并按门板
    const rm = g.rooms.find(r => r.owners && r.owners.length >= 0) || g.rooms[0];
    const door = { c: rm.doorCol, r: rm.doorRow };
    // 门朝向
    const dr = rm.tpl.door;
    let ox = 0, oy = 0;
    if (dr.r === -1) oy = -1; else if (dr.r >= rm.h) oy = 1;
    else if (dr.c === -1) ox = -1; else if (dr.c >= rm.w) ox = 1;
    const outCell = { c: door.c + ox, r: door.r + oy };

    // 门格种门板（若没有）
    let dp = g.getPlantAt(door.c * gs + 40, door.r * gs + 40);
    if (!dp) { g.spawnPlant(door.c, door.r, 'wallnut', true, g.player); dp = g.getPlantAt(door.c * gs + 40, door.r * gs + 40); }

    // P1 站门格中心
    g.player.x = door.c * gs + 40; g.player.y = door.r * gs + 40;
    g.player.hp = 100; g.player.maxHp = 100;
    // 僵尸站在门外一格中心
    const z = g.zombies.find(z => !z.dead) || null;
    if (!z) return { error: '开局没有僵尸', zombieCount: g.zombies.length };
    z.x = outCell.c * gs + 40; z.y = outCell.r * gs + 40;
    z.path = null; z.lockedTarget = g.player; z.retreating = false;

    const dist = Math.round(Math.hypot(g.player.x - z.x, g.player.y - z.y));
    const pRm = g._insideRoom(Math.floor(g.player.x / gs), Math.floor(g.player.y / gs));
    const zRm = g._insideRoom(Math.floor(z.x / gs), Math.floor(z.y / gs));
    const doorPlant = g.getPlantAt(door.c * gs, door.r * gs);
    const hp0 = g.player.hp;
    // 冻结僵尸移动，只测接触伤害：把僵尸 speed 设 0
    const oldSpeed = z.speed; z.speed = 0;
    await new Promise(r => setTimeout(r, 1500));
    z.speed = oldSpeed;
    return {
      door, outCell, dist,
      pRm: pRm ? `room@${pRm.x},${pRm.y}` : null,
      zRm: zRm ? `room@${zRm.x},${zRm.y}` : null,
      doorPlant: doorPlant ? { type: doorPlant.type, isDoor: doorPlant.isDoor, hp: Math.round(doorPlant.hp) } : null,
      hp0: Math.round(hp0), hp1: Math.round(g.player.hp),
      lost: Math.round(hp0 - g.player.hp)
    };
  });
  console.log('=== A) 站门格 vs 门外僵尸 ===');
  console.log(JSON.stringify(A, null, 1));

  // ---------- B) P1 死亡 → P2 血量变化（拦截 hp setter 抓调用栈）----------
  const B = await p.evaluate(async () => {
    const g = window.game;
    const p2 = g.player2;
    p2.hp = 40; p2.maxHp = 100;
    g.setHp();
    const before = { p2hp: p2.hp, dom: document.getElementById('hp-fill2') ? document.getElementById('hp-fill2').style.width : 'n/a' };
    const log = [];
    // 拦截 p2.hp 写入
    let _v = p2.hp;
    Object.defineProperty(p2, 'hp', {
      configurable: true,
      get() { return _v; },
      set(nv) {
        if (Math.abs(nv - _v) > 0.001) {
          const st = (new Error().stack || '').split('\n').slice(1, 4).map(s => s.trim()).join(' | ');
          log.push({ from: Math.round(_v), to: Math.round(nv), at: Math.round(g.gameTime), stack: st });
        }
        _v = nv;
      }
    });
    // 秒杀 P1
    g.player.hp = -10;
    g._checkP1Down();
    await new Promise(r => setTimeout(r, 2500));
    return {
      before,
      after: { p2hp: p2.hp, p2max: p2.maxHp, dead: !!p2.dead, pendingFate: !!p2.pendingFate,
               p1dead: !!g.player.dead, p1hp: Math.round(g.player.hp),
               dom2: document.getElementById('hp-fill2') ? document.getElementById('hp-fill2').style.width : 'n/a',
               dom1: document.getElementById('hp-fill') ? document.getElementById('hp-fill').style.width : 'n/a' },
      log: log.slice(0, 8)
    };
  });
  console.log('=== B) P1 死后 P2 血量 ===');
  console.log(JSON.stringify(B, null, 1));

  // ---------- C) 再来一次：血量 / 血条残留 ----------
  const C = await p.evaluate(async () => {
    const g = window.game;
    // 装成残血残 UI
    g.player.hp = 23; g.player2.hp = 57;
    g.setHp();
    const beforeDom = {
      f1: document.getElementById('hp-fill').style.width, n1: document.getElementById('hp-num').innerText,
      f2: document.getElementById('hp-fill2') ? document.getElementById('hp-fill2').style.width : null,
      n2: document.getElementById('hp-num2') ? document.getElementById('hp-num2').innerText : null
    };
    // 走真实重开入口
    window.retryDormGame();
    await new Promise(r => setTimeout(r, 1200));
    const ng = window.game;
    return {
      isNewInstance: ng !== g,
      beforeDom,
      newHp: { p1: ng.player.hp, p1max: ng.player.maxHp, p2: ng.player2 ? ng.player2.hp : null, p2max: ng.player2 ? ng.player2.maxHp : null },
      afterDom: {
        f1: document.getElementById('hp-fill').style.width, n1: document.getElementById('hp-num').innerText,
        f2: document.getElementById('hp-fill2') ? document.getElementById('hp-fill2').style.width : null,
        n2: document.getElementById('hp-num2') ? document.getElementById('hp-num2').innerText : null
      }
    };
  });
  console.log('=== C) 再来一次血量残留 ===');
  console.log(JSON.stringify(C, null, 1));

  console.log('pageerrors:', errs.slice(0, 4));
  await b.close();
})();
