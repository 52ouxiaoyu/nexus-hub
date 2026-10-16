// v4.0.46 验证：①植物作息反转（阳光系白天产/夜晚熄灯；小喷菇/路灯花夜晚产/白天睡）②开局即白天 ③人机手持技能（CD好后1分钟内释放，随后CD重计）
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

  // ===== T0 开局即白天 + 场景准备 =====
  const setup = await p.evaluate(() => {
    const g = window.game;
    const dn0 = g.dnNext;              // 先取原值再禁用自动切换
    g.ais.forEach(a => { a.actTimer = 9999; });
    g.zombiesPerMin = 0;
    g.dnNext = 1e12; // 测试期间禁止自动昼夜切换
    const freeRoom = g.rooms.find(rm => !rm.owners || rm.owners.length === 0) || g.rooms[0];
    const emptyCells = [];
    for (let r = 0; r < freeRoom.tpl.grid.length; r++) {
      for (let c = 0; c < freeRoom.tpl.grid[r].length; c++) {
        if (freeRoom.tpl.grid[r][c] === 1) emptyCells.push({ c: freeRoom.x + c, r: freeRoom.y + r });
      }
    }
    return {
      isNight0: g.isNight, dn0,
      tint0: (document.getElementById('dn-tint') || {}).style ? document.getElementById('dn-tint').style.background : '',
      roomId: g.rooms.indexOf(freeRoom),
      inA: emptyCells[0], inB: emptyCells[1] || emptyCells[0], inC: emptyCells[2] || emptyCells[0],
      inD: emptyCells[3] || emptyCells[0], inE: emptyCells[4] || emptyCells[0]
    };
  });
  ok(setup.isNight0 === false, 'T0a 开局即白天（作息反转后阳光系立刻有收入）');
  ok(setup.dn0 === 60000, 'T0b 开局白天时长 60s（dnNext=' + setup.dn0 + '）');
  ok(setup.tint0 === 'transparent' || setup.tint0 === '', 'T0c 开局无夜幕染色');

  // ===== T1 阳光系（向日葵+阳光菇）：白天产、夜晚熄灯 =====
  await p.evaluate(s => {
    const g = window.game;
    g.spawnPlant(s.inA.c, s.inA.r, 'sunflower', false, g.player);
    g.spawnPlant(s.inB.c, s.inB.r, 'sunshroom', false, g.player); // 名字带「菇」但作息跟向日葵
    g.player.x = 120; g.player.y = 120; g.player.invincibleT = 9999; // 人远离，房内常产
  }, setup);
  {
    const r1 = await p.evaluate(async () => {
      const g = window.game;
      const s0 = g.player.sun;
      await new Promise(res => setTimeout(res, 2100));
      const day = g.player.sun - s0;
      g.isNight = true; // 手动入夜（dnNext 已禁用）
      for (const pl of g.plants) g._applySleepVisual(pl);
      await new Promise(res => setTimeout(res, 300));
      const zzz = g.plants.filter(pl => pl.owner === g.player && (pl.def.name === '向日葵' || pl.def.name === '阳光菇'));
      const sleepBadges = zzz.map(pl => !!pl.sleepBadge);
      const sn0 = g.player.sun;
      await new Promise(res => setTimeout(res, 2100));
      const night = g.player.sun - sn0;
      g.isNight = false; // 拨回白天
      for (const pl of g.plants) g._applySleepVisual(pl);
      return { day, night, sleepBadges };
    });
    ok(r1.day >= 20, 'T1a 白天：向日葵+阳光菇常产（人远离仍 +' + r1.day + '☀/2.1s）');
    ok(r1.sleepBadges.length === 2 && r1.sleepBadges.every(b => b), 'T1b 夜晚：阳光系头顶💤熄灯');
    ok(r1.night === 0, 'T1c 夜晚：阳光系停摆（+' + r1.night + '）');
  }

  // ===== T2 小喷菇/路灯花：夜晚产、白天睡（清掉 T1 的阳光系，隔离测量窗口）=====
  await p.evaluate(s => {
    const g = window.game;
    g.spawnPlant(s.inC.c, s.inC.r, 'puffshroom', false, g.player);
    g.spawnPlant(s.inD.c, s.inD.r, 'plantern', false, g.player);
    // 只留两株测试植物 + AI 名下植物（开局自带阳光菇是 owner=null 的预置植物，靠 rm.owners[0] 解析成玩家，必须按坐标剔除）
    const isTest = pl => (pl.c === s.inC.c && pl.r === s.inC.r) || (pl.c === s.inD.c && pl.r === s.inD.r);
    g.plants = g.plants.filter(pl => isTest(pl) || (pl.owner && pl.owner.isAi));
  }, setup);
  {
    const r2 = await p.evaluate(async () => {
      const g = window.game;
      // 此时 isNight 已拨回白天
      const sd0 = g.player.sun, sp0 = g.player.spore;
      await new Promise(res => setTimeout(res, 2100));
      const daySun = g.player.sun - sd0, daySpore = g.player.spore - sp0;
      g.isNight = true;
      const sn0 = g.player.sun, spn0 = g.player.spore;
      await new Promise(res => setTimeout(res, 2100));
      const nightSun = g.player.sun - sn0, nightSpore = g.player.spore - spn0;
      g.isNight = false;
      return { daySun, daySpore, nightSun, nightSpore };
    });
    ok(r2.daySpore === 0, 'T2a 白天：小喷菇睡觉不产孢子（+' + r2.daySpore + '）');
    ok(r2.daySun === 0, 'T2b 白天：路灯花睡觉不产阳光（+' + r2.daySun + '，此窗口向日葵已拨回白天不计）');
    ok(r2.nightSpore >= 3, 'T2c 夜晚：小喷菇产孢子（+' + r2.nightSpore + '🦠）');
    ok(r2.nightSun >= 25, 'T2d 夜晚：路灯花产阳光（+' + r2.nightSun + '☀，此窗口含向日葵以外新增）');
  }

  // ===== T3 人机手持技能：CD 好了 1 分钟内释放，随后 CD 重新计时 =====
  {
    const r3 = await p.evaluate(async () => {
      const g = window.game;
      const ai = g.ais[0];
      ai.roleDef = { id: 'sunflower', name: '向日葵' }; // 固定角色确保技能必成功（sunBuff 无前置条件）
      const t0 = g.gameTime;
      ai.skillAt = t0 + 400;   // 模拟「CD 已好，排进 1 分钟内的随机时刻」
      ai.skillCd = 0;
      await new Promise(res => setTimeout(res, 1200));
      const used = ai.skillCd > 55 && ai.sunBuffT > 0; // CD 已开始走（60→~58.8 递减中）即视为释放成功
      const nextDelay = ai.skillAt - g.gameTime; // 放成功后应排到 CD(60s) 结束后再 0~60s
      return { used, skillCd: ai.skillCd, nextDelay, skillAtDefined: ai.skillAt !== undefined };
    });
    ok(r3.used, 'T3a 人机释放手持技能（skillCd=60 向日葵翻倍 buff 生效）');
    ok(r3.nextDelay >= 55000 && r3.nextDelay <= 125000, 'T3b 放完重新计时：下次尝试排在 ' + Math.round(r3.nextDelay / 1000) + 's 后（CD60s+0~60s）');
  }
  {
    // 懒初始化：新 AI 首次调度落在「接下来 1 分钟内」
    const r3c = await p.evaluate(() => {
      const g = window.game;
      const ai = g.ais[1];
      delete ai.skillAt;               // 模拟未初始化
      const t0 = g.gameTime;
      return { t0 };
    });
    await sleep(400);
    const r3d = await p.evaluate(s => {
      const g = window.game;
      const ai = g.ais[1];
      return { delay: ai.skillAt - s.t0 };
    }, r3c);
    ok(r3d.delay >= 9500 && r3d.delay <= 61000, 'T3c 新 AI 首次技能排期在 10~60s 内（' + Math.round(r3d.delay / 1000) + 's）');
  }

  // ===== T4 回归：人机产出停摆（v4.0.45）+ 天使无产出（v4.0.44）=====
  {
    const r4 = await p.evaluate(async s => {
      const g = window.game;
      const ai = g.ais[2];
      if (!g.rooms[s.roomId].owners.includes(ai)) g.rooms[s.roomId].owners.push(ai);
      g.spawnPlant(s.inE.c, s.inE.r, 'sunflower', false, ai); // 白天、AI 向日葵
      const a0 = ai.sun;
      const s0 = g.player.sun;
      g.playerAngelic = true;
      const p0 = g.player.sun;
      await new Promise(res => setTimeout(res, 2100));
      g.playerAngelic = false;
      return { aiDelta: ai.sun - a0, angelDelta: g.player.sun - p0, playerAllDelta: g.player.sun - s0 };
    }, setup);
    ok(r4.aiDelta === 0, 'T4a 白天：人机向日葵仍零产出（+' + r4.aiDelta + '）');
    ok(r4.angelDelta === 0, 'T4b 天使状态植物无产出（+' + r4.angelDelta + '）');
  }

  await p.screenshot({ path: '_v4046_schedule.png' });
  await browser.close();
  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
