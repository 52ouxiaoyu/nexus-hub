// v4.0.45 验证：①房间内植物常产（不要求主人贴身，房外植物保留 300px 规则）②人机产出类植物不再自动产资源 ③昼夜规则不变
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
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

  // ===== 场景准备：冻结 AI 行动，找空格 =====
  const setup = await p.evaluate(() => {
    const g = window.game;
    g.ais.forEach(a => { a.actTimer = 9999; });          // 冻结 AI 行动，防花钱干扰断言
    g.zombiesPerMin = 0;                                  // 不刷小怪
    // 找一个无人认领的房间（找得到就用，找不到用任意房）
    const freeRoom = g.rooms.find(rm => !rm.owners || rm.owners.length === 0) || g.rooms[0];
    const emptyCells = [];
    for (let r = 0; r < freeRoom.tpl.grid.length; r++) {
      for (let c = 0; c < freeRoom.tpl.grid[r].length; c++) {
        if (freeRoom.tpl.grid[r][c] === 1) emptyCells.push({ c: freeRoom.x + c, r: freeRoom.y + r });
      }
    }
    // 找房外空格（走廊）：从地图中心向外找 _insideRoom 为 null 的格
    let outCell = null;
    const cx = Math.floor(g.worldWidth / 2 / 80), cy = Math.floor(g.worldHeight / 2 / 80);
    for (let d = 0; d < 20 && !outCell; d++) {
      for (const [dc, dr] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d]]) {
        const c = cx + dc, r = cy + dr;
        if (!g._insideRoom(c, r)) { outCell = { c, r }; break; }
      }
    }
    return {
      isNight0: g.isNight,
      roomId: freeRoom.id || g.rooms.indexOf(freeRoom),
      inA: emptyCells[0], inB: emptyCells[1] || emptyCells[0], inC: emptyCells[2] || emptyCells[0], inD: emptyCells[3] || emptyCells[2] || emptyCells[0],
      outCell,
      ai0Sun: g.ais[0].sun, ai0Spore: g.ais[0].spore
    };
  });
  ok(setup.isNight0 === true, 'T0a 开局即夜晚（阳光系产出的前提）');
  ok(!!setup.inA && !!setup.outCell, 'T0b 测试格子就绪（房内 ' + JSON.stringify(setup.inA) + ' 房外 ' + JSON.stringify(setup.outCell) + '）');

  // ===== T1 人机产出类植物不再产资源（夜晚：旧版此刻会产）=====
  await p.evaluate(s => {
    const g = window.game, ai = g.ais[0], rm = g.rooms[s.roomId];
    if (!rm.owners.includes(ai)) rm.owners.push(ai);
    ai.targetRoom = rm;
    g.spawnPlant(s.inA.c, s.inA.r, 'sunflower', false, ai);     // 产阳光（nightOnly，夜晚活跃）
    g.spawnPlant(s.inB.c, s.inB.r, 'puffshroom', false, ai);    // 产孢子
  }, setup);
  {
    const s0 = await p.evaluate(() => {
      const g = window.game;
      return { sun: g.ais[0].sun, spore: g.ais[0].spore, prodT: g.plants.filter(pl => pl.owner && pl.owner.isAi).map(pl => pl.prodT) };
    });
    await sleep(2600);
    const s1 = await p.evaluate(() => {
      const g = window.game;
      return { sun: g.ais[0].sun, spore: g.ais[0].spore, prodT: g.plants.filter(pl => pl.owner && pl.owner.isAi).map(pl => pl.prodT) };
    });
    ok(s1.sun === s0.sun && s1.spore === s0.spore, 'T1a 2.6s 内人机阳光/孢子零增长 (' + s0.sun + '/' + s0.spore + ' → ' + s1.sun + '/' + s1.spore + ')');
    ok(s1.prodT.every(t => (t || 0) === 0), 'T1b 人机植物 prodT 未累积（产出周期完全停摆）');
  }

  // ===== T2 玩家房内植物：人远离 >300px 依旧常产 =====
  await p.evaluate(s => {
    const g = window.game;
    g.spawnPlant(s.inC.c, s.inC.r, 'sunflower', false, g.player);
    // 玩家传送到远离植物的角落 + 无敌防误死
    g.player.x = 120; g.player.y = 120;
    g.player.invincibleT = 9999;
  }, setup);
  {
    const s0 = await p.evaluate(() => window.game.player.sun);
    await sleep(2100);
    const s1 = await p.evaluate(() => window.game.player.sun);
    ok(s1 - s0 >= 12, 'T2 玩家距房内向日葵>300px 仍常产（2.1s +' + (s1 - s0) + '☀，期望约+20）');
  }

  // ===== T3 房外植物仍需主人靠近（先清掉玩家其他植物，隔离测量窗口）=====
  {
    const r3 = await p.evaluate(async s => {
      const g = window.game;
      g.spawnPlant(s.outCell.c, s.outCell.r, 'sunflower', false, g.player);
      g.plants = g.plants.filter(pl => !(pl.owner === g.player && !(pl.c === s.outCell.c && pl.r === s.outCell.r)));
      g.player.x = 120; g.player.y = 120; // 远离
      const far0 = g.player.sun;
      await new Promise(res => setTimeout(res, 2100));
      const far1 = g.player.sun;
      // 主人贴近
      g.player.x = s.outCell.c * 80 + 40; g.player.y = s.outCell.r * 80 + 60;
      await new Promise(res => setTimeout(res, 2100));
      const near1 = g.player.sun;
      return { farDelta: far1 - far0, nearDelta: near1 - far1 };
    }, setup);
    ok(r3.farDelta === 0, 'T3a 房外植物主人远离 → 零产出 (' + r3.farDelta + ')');
    ok(r3.nearDelta >= 12 && r3.nearDelta <= 30, 'T3b 主人靠近房外植物 → 恢复产出 (+' + r3.nearDelta + '☀)');
  }

  // ===== T4 昼夜规则不变：白天阳光系停摆、菇类白天睡/夜晚产（清场后只留房内向日葵+玩家小喷菇，人远离）=====
  {
    const r4 = await p.evaluate(async s => {
      const g = window.game;
      g.plants = g.plants.filter(pl => pl.owner !== g.player);
      g.spawnPlant(s.inD.c, s.inD.r, 'sunflower', false, g.player);
      g.spawnPlant(s.inC.c, s.inC.r, 'puffshroom', false, g.player);
      g.player.x = 120; g.player.y = 120; // 人远离，验证房内常产
      g.isNight = false;                       // 手动拨到白天（dnNext 未到不会自动翻回）
      const s0 = g.player.sun, sp0 = g.player.spore;
      await new Promise(res => setTimeout(res, 1700));
      const daySun = g.player.sun - s0, daySpore = g.player.spore - sp0;
      g.isNight = true;                        // 拨回夜晚
      const sn0 = g.player.sun, spn0 = g.player.spore;
      await new Promise(res => setTimeout(res, 1700));
      return { daySun, daySpore, nightSun: g.player.sun - sn0, nightSpore: g.player.spore - spn0 };
    }, setup);
    ok(r4.daySun === 0, 'T4a 白天：房内向日葵停摆（+' + r4.daySun + '）');
    ok(r4.daySpore === 0, 'T4b 白天：玩家小喷菇睡觉不产孢子（+' + r4.daySpore + '）');
    ok(r4.nightSun >= 8 && r4.nightSun <= 30, 'T4c 夜晚：房内向日葵恢复产出（+' + r4.nightSun + '☀）');
    ok(r4.nightSpore >= 2, 'T4d 夜晚：小喷菇恢复产孢子（+' + r4.nightSpore + '🦠）');
  }

  // ===== T5 回归：天使状态下玩家植物无产出（v4.0.44）=====
  {
    const r5 = await p.evaluate(async () => {
      const g = window.game;
      g.playerAngelic = true;
      const s0 = g.player.sun;
      await new Promise(res => setTimeout(res, 1700));
      g.playerAngelic = false;
      return g.player.sun - s0;
    });
    ok(r5 === 0, 'T5 天使状态植物仍无产出（+' + r5 + '）');
  }

  await p.screenshot({ path: '_v4045_produce.png' });
  await browser.close();
  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
