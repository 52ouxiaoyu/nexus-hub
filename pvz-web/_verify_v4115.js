// v4.0.115 验证：僵尸模式下尸潮不再把玩家本体当猎物（同阵营不自相残杀），令旗目标里也不再有「你」
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };

const launch = async () => {
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
  return { browser, page, errors };
};

(async () => {
  // ================= A 局：1p 僵尸阵营 =================
  let { browser, page, errors } = await launch();
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(400);

  // ---------- T1 阵营身份 ----------
  const t1 = await page.evaluate(() => {
    const g = window.game;
    return {
      isZombieFaction: !!g.isZombieFaction,
      playerZombie: !!g.player.isZombie,
      aiCount: g.ais.length,
      aiZombie: g.ais.filter(a => a.isZombie).length,
      inAllPlayers: g.allPlayers.length
    };
  });
  ok(t1.isZombieFaction && t1.playerZombie, 'T1a 僵尸阵营：玩家本体 isZombie=true');
  ok(t1.aiCount === 5 && t1.aiZombie === 0, `T1b 5 个人机是植物方幸存者（${t1.aiCount} 只，僵尸化 ${t1.aiZombie} 只）`);

  // 让 AI 先发育出植物，再连号两波尸潮
  await sleep(7000);
  const pre = await page.evaluate(() => {
    const g = window.game;
    g.waveOrderCd = 0; g._orderHorde();
    g.waveOrderCd = 0; g._orderHorde();
    return { zombies: g.zombies.length, plants: g.plants.length,
             roomsWithPlants: g.rooms.filter(rm => g.plants.some(pl => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h)).length };
  });
  ok(pre.zombies >= 2, `T1c 尸潮已出动（${pre.zombies} 只僵尸 / ${pre.plants} 株植物，分布在 ${pre.roomsWithPlants} 间房）`);

  // ---------- T2 12 秒采样：绝不锁玩家本体 ----------
  const frames = [];
  for (let i = 0; i < 90; i++) {
    await sleep(200);
    frames.push(await page.evaluate(() => {
      const g = window.game;
      const zs = g.zombies.filter(z => !z.dead);
      return {
        n: zs.length,
        lockPlayer: zs.filter(z => z.lockedTarget === g.player).length,
        lockP2: zs.filter(z => g.player2 && z.lockedTarget === g.player2).length,
        lockAi: zs.filter(z => z.lockedTarget && z.lockedTarget.isAi).length,
        lockPlant: zs.filter(z => z.lockedTarget && z.lockedTarget._isPlant).length,
        inRoom: zs.filter(z => g._insideRoom(Math.floor(z.x / 80), Math.floor(z.y / 80))).length,
        biting: zs.filter(z => (z.biteT || 0) > 0.05).length,
        nearPlant: zs.filter(z => g.plants.some(pl => Math.hypot(pl.c * 80 + 40 - z.x, pl.r * 80 + 40 - z.y) < 90)).length,
        doorHp: g.plants.filter(pl => pl.isDoor).reduce((a, pl) => a + Math.max(0, pl.hp), 0),
        plantCount: g.plants.length,
        playerHp: Math.round(g.player.hp)
      };
    }));
  }
  const sum = k => frames.reduce((a, f) => a + f[k], 0);
  ok(frames[0].n > 0, `T2a 采样期间场上有僵尸（${frames[0].n} 只）`);
  ok(sum('lockPlayer') === 0, `T2b 18 秒内没有任何一只僵尸把玩家本体当目标（改前 120 僵尸-帧，实测 ${sum('lockPlayer')}）`);
  ok(sum('lockP2') === 0, `T2c 同样不锁 P2（实测 ${sum('lockP2')}）`);
  ok(sum('lockAi') > 0, `T2d 尸潮确实在追植物方幸存者（锁定人机 ${sum('lockAi')} 僵尸-帧）`);
  ok(frames[frames.length - 1].playerHp === frames[0].playerHp, `T3a 玩家本体全程零掉血（${frames[0].playerHp}→${frames[frames.length - 1].playerHp}，以前是"被围着打但没伤害"）`);
  const doorDrop = frames[0].doorHp - frames[frames.length - 1].doorHp;
  ok(sum('biting') > 0 && (doorDrop > 0 || sum('nearPlant') > 0),
     `T3b 尸潮确实在啃屋里的植物（啃食中 ${sum('biting')} 僵尸-帧，门板总血 ${Math.round(frames[0].doorHp)}→${Math.round(frames[frames.length - 1].doorHp)}，贴植物 ${sum('nearPlant')} 僵尸-帧）`);

  // ---------- T4 G 键轮转：候选里没有本体 ----------
  const t4 = await page.evaluate(() => {
    const g = window.game;
    const seq = [];
    for (let i = 0; i < 8; i++) {
      g._cycleCommandTarget();
      const t = g.commandTarget;
      seq.push(t ? (t === g.player ? 'PLAYER' : (t === g.player2 ? 'P2' : (t.roleDef ? t.roleDef.name : '?'))) : 'none');
    }
    return { seq, isPlayer: g.commandTarget === g.player };
  });
  ok(!t4.seq.includes('PLAYER') && !t4.seq.includes('P2'), `T4a G 键 8 次轮转，令旗目标里没有你我（${t4.seq.join(' → ')}）`);
  ok(t4.seq.filter(v => v !== 'none').length > 0, 'T4b 令旗仍能指向植物方幸存者');

  // ---------- T5 HUD 文案里没有「你」 ----------
  const t5 = await page.evaluate(() => {
    const g = window.game;
    g._refreshHud();
    const el = document.getElementById('skill-hud');
    return { txt: el ? el.innerText : '', cmd: g.commandTarget ? (g.commandTarget.roleDef ? g.commandTarget.roleDef.name : '?') : '无' };
  });
  ok(!/目标:\s*你/.test(t5.txt) && !t5.txt.includes('目标:你'), `T5a 技能栏不再显示「目标:你」（当前：${t5.txt.replace(/\s+/g, ' ').slice(0, 90)}）`);
  ok(t5.txt.includes('目标:' + t5.cmd) || t5.cmd === '无', `T5b 目标文案与真实令旗一致（${t5.cmd}）`);

  // ---------- T6 幸存者全灭 → 尸潮改去啃植物（不再回头咬本体） ----------
  const t6 = await page.evaluate(async () => {
    const g = window.game;
    if (g.over) return { skip: true, why: 'over' };
    g.ais.forEach(a => { a.dead = true; a.hp = 0; });
    g.waveOrderCd = 0; g._orderHorde();
    const seq = [];
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 100));
      const zs = g.zombies.filter(z => !z.dead);
      seq.push({ lockPlayer: zs.filter(z => z.lockedTarget === g.player).length,
                 lockPlant: zs.filter(z => z.lockedTarget && z.lockedTarget._isPlant).length,
                 n: zs.length });
    }
    const prey = g._hordePlantPrey(g.zombies.filter(z => !z.dead)[0] || { x: g.player.x, y: g.player.y });
    return { seq, preyOk: !!(prey && prey._isPlant && prey._plant), over: g.over,
             plants: g.plants.length };
  });
  if (t6.skip) {
    console.log('  ⚠️  T6 跳过（对局已结束）');
  } else {
    const anyPlayerLock = t6.seq.reduce((a, s) => a + s.lockPlayer, 0);
    const anyPlantLock = t6.seq.reduce((a, s) => a + s.lockPlant, 0);
    ok(anyPlayerLock === 0, `T6a 幸存者全灭后仍然不锁本体（${anyPlayerLock} 次）`);
    ok(t6.preyOk, `T6b 新增 _hordePlantPrey 能挑出「有植物房间里的植物」（场上 ${t6.plants} 株）`);
    ok(anyPlantLock > 0 || t6.over, `T6c 尸潮转而锁定屋里的植物继续啃（植物锁定 ${anyPlantLock} 次${t6.over ? '，对局已结算' : ''}）`);
  }

  // ---------- T7 植物阵营回归：尸潮照旧咬植物方 ----------
  await page.evaluate(() => {
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.isZombieFaction === false && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(1200);
  const t7 = await page.evaluate(async () => {
    const g = window.game;
    g._spawnMinion(false, 0, 1, null);
    await new Promise(r => setTimeout(r, 2600));
    const z = g.zombies[g.zombies.length - 1];
    const t = z && z.lockedTarget;
    return { hasZ: !!z, isPlayer: t === g.player, isAi: !!(t && t.isAi), isZombiePlayerSide: !!(t && t.isZombie), name: t && t.roleDef ? t.roleDef.name : '?' };
  });
  ok(t7.hasZ, 'T7a 植物阵营仍能刷出尸潮小怪');
  ok(t7.isPlayer || t7.isAi, `T7b 植物阵营的小怪照旧锁定植物方（目标：${t7.name}，是玩家=${t7.isPlayer}）`);
  ok(!t7.isZombiePlayerSide, 'T7c 植物阵营里不会把自己人当目标（isZombie 过滤只对僵尸阵营生效）');
  ok(errors.length === 0, `T8 全程 0 异常${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();

  // ================= B 局：2p 僵尸阵营（P2 也是僵尸） =================
  ({ browser, page, errors } = await launch());
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'zombie', role1: 'peashooter', role2: 'wallnut' });
  });
  await page.waitForFunction('window.game && window.game.player2 && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(600);
  const t9 = await page.evaluate(async () => {
    const g = window.game;
    const bothZombie = !!g.player.isZombie && !!g.player2.isZombie;
    const seq = [];
    for (let i = 0; i < 8; i++) { g._cycleCommandTarget(); const t = g.commandTarget; seq.push(t === g.player ? 'P' : (t === g.player2 ? 'P2' : (t && t.roleDef ? 'ai' : 'none'))); }
    g.waveOrderCd = 0; g._orderHorde();
    let lockPlayers = 0;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 150));
      lockPlayers += g.zombies.filter(z => !z.dead && (z.lockedTarget === g.player || z.lockedTarget === g.player2)).length;
    }
    return { bothZombie, seq, lockPlayers };
  });
  ok(t9.bothZombie, 'T9a 2p 僵尸阵营：P1/P2 都是僵尸身份');
  ok(!t9.seq.includes('P') && !t9.seq.includes('P2'), `T9b 2p 令旗候选也不含两位本体（${t9.seq.join(',')}）`);
  ok(t9.lockPlayers === 0, `T9c 2p 尸潮不锁 P1/P2（实测 ${t9.lockPlayers} 次）`);
  ok(errors.length === 0, `T10 2p 全程 0 异常${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();

  console.log(`\n===== v4.0.115 结果：${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail ? 1 : 0);
})();
