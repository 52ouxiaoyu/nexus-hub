// v4.0.122 深度探针：① 站门格被咬 ③ P1 死后 P2 血量写入全记录
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
  await p.waitForFunction('window.game && window.game.player2');
  await p.evaluate(() => { window.game.ghostSpawnAt = 0; });   // 立刻出僵尸
  await p.waitForFunction('window.game.zombies.length > 0', { timeout: 15000 });
  await sleep(800);

  // ================= A) 站门格：门外相邻格有僵尸 =================
  const A = await p.evaluate(async () => {
    const g = window.game, gs = g.gridSize;
    const rm = g.rooms[0];
    const dr = rm.tpl.door;
    let ox = 0, oy = 0;
    if (dr.r === -1) oy = -1; else if (dr.r >= rm.h) oy = 1;
    else if (dr.c === -1) ox = -1; else if (dr.c >= rm.w) ox = 1;
    const door = { c: rm.doorCol, r: rm.doorRow };
    const outCell = { c: door.c + ox, r: door.r + oy };

    let dp = g.getPlantAt(door.c * gs + 40, door.r * gs + 40);
    if (!dp) { g.spawnPlant(door.c, door.r, 'wallnut', true, g.player); dp = g.getPlantAt(door.c * gs + 40, door.r * gs + 40); }

    const z = g.zombies.find(z => !z.dead);
    if (!z) return { error: 'no zombie' };
    const oldSpd = z.speed;
    z.speed = 0; z.path = null; z.retreating = false;

    // 场景 1：玩家站门格中心，僵尸在门外 1 格中心（距离 80）
    g.player.x = door.c * gs + 40; g.player.y = door.r * gs + 40;
    g.player.hp = 100; g.player.maxHp = 100;
    z.x = outCell.c * gs + 40; z.y = outCell.r * gs + 40;
    z.lockedTarget = g.player;
    const s1 = { dist: Math.round(Math.hypot(g.player.x - z.x, g.player.y - z.y)), hp0: g.player.hp };
    await new Promise(r => setTimeout(r, 1200));
    s1.hp1 = Math.round(g.player.hp * 10) / 10;
    s1.lost = Math.round((s1.hp0 - g.player.hp) * 10) / 10;
    s1.pRm = (() => { const r = g._insideRoom(Math.floor(g.player.x / gs), Math.floor(g.player.y / gs)); return r ? 'room' : null; })();
    s1.zRm = (() => { const r = g._insideRoom(Math.floor(z.x / gs), Math.floor(z.y / gs)); return r ? 'room' : null; })();

    // 场景 2：玩家在房内（门后一格），僵尸在门外 1 格 → 应安全（既有逻辑）
    g.player.hp = 100;
    g.player.y = (door.r - oy) * gs + 40;   // 朝房内退一格
    await new Promise(r => setTimeout(r, 1200));
    s2 = { hp1: Math.round(g.player.hp * 10) / 10, lost: Math.round((100 - g.player.hp) * 10) / 10 };

    z.speed = oldSpd;
    return { door, outCell, s1, s2 };
  });
  console.log('=== A) 站门格被咬 ===');
  console.log(JSON.stringify(A, null, 1));

  // ================= C) P1 死亡 → P2 血量写入全记录 =================
  const C = await p.evaluate(async () => {
    const g = window.game;
    const p1 = g.player, p2 = g.player2;
    const log = [];
    for (const [name, obj] of [['p1', p1], ['p2', p2]]) {
      let v = obj.hp;
      Object.defineProperty(obj, 'hp', {
        configurable: true,
        get() { return v; },
        set(nv) {
          if (Math.abs(nv - v) > 0.01) {
            log.push({ who: name, from: Math.round(v), to: Math.round(nv), t: Math.round(g.gameTime),
                       at: (new Error().stack || '').split('\n').slice(2, 4).map(s => s.trim().replace(/^at\s+/, '')).join(' << ') });
          }
          v = nv;
        }
      });
    }
    p2.hp = 40; p2.maxHp = 100;
    g.setHp();
    const dom0 = { f1: document.getElementById('hp-fill').style.width, n1: document.getElementById('hp-num').innerText,
                   f2: document.getElementById('hp-fill2').style.width, n2: document.getElementById('hp-num2').innerText };
    // P1 站到僵尸嘴边（真实受伤路径）
    const z = g.zombies.find(z => !z.dead);
    p1.x = z.x; p1.y = z.y - 30;
    p1.hp = 12; p1.maxHp = 100;
    const snaps = [];
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 400));
      snaps.push({ t: Math.round(g.gameTime), p1: Math.round(p1.hp), p2: Math.round(p2.hp), dead1: !!p1.dead,
                   fate: !!p1.pendingFate, d1: document.getElementById('hp-fill').style.width,
                   d2: document.getElementById('hp-fill2').style.width, n2: document.getElementById('hp-num2').innerText });
    }
    return { dom0, snaps, log: log.slice(0, 20), logLen: log.length };
  });
  console.log('=== C) P1 死亡 → P2 血量 ===');
  console.log(JSON.stringify(C, null, 1));

  console.log('pageerrors:', errs.slice(0, 4));
  await b.close();
})();
