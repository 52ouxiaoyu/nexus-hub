// v4.0.104 验证：守屋双人（首乌大作战 2p）天使/内鬼机制——P1 死后 N=天使/M=内鬼，P2 死后 1=天使/2=内鬼
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    localStorage.clear();
    window._annLog = [];
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });
  // v4.0.104 测试：hook 播报（真实 #wave-announce 会被 AI 技能播报顶掉）
  await p.evaluate(() => {
    const g = window.game, orig = g._announce.bind(g);
    g._announce = (txt, sfx, big) => { window._annLog.push(String(txt)); return orig(txt, sfx, big); };
  });

  // T1 开局形态字段
  let r = await p.evaluate(() => {
    const g = window.game;
    return { mode: g.gameMode, a1: !!g.player.angelic, t1: !!g.player.traitor, a2: !!g.player2.angelic, t2: !!g.player2.traitor,
             aliasA: g.playerAngelic, aliasT: g.playerTraitor, over: !!g.over };
  });
  ok(`T1 2p 开局双方均无形态（mode=${r.mode}，P1 别名=${r.aliasA}/${r.aliasT}）`, r.mode === '2p' && !r.a1 && !r.t1 && !r.a2 && !r.t2 && r.aliasA === false);

  // 给双方无敌，避免自然死亡干扰；等僵尸出笼（ghostSpawnAt=20s）
  await p.evaluate(() => { const g = window.game; g.player.invincibleT = 999999; g.player2.invincibleT = 999999; });
  await p.waitForFunction('window.game.zombies && window.game.zombies.some(z => !z.dead)', { timeout: 45000 });
  await p.evaluate(() => { const g = window.game; g.player.invincibleT = 999999; g.player2.invincibleT = 999999; });

  // T2 杀 P1 → 进入按键抉择（不判负、不判死）
  await p.evaluate(() => {
    const g = window.game;
    g.player.invincibleT = 0;
    g.player.hp = 0;
    g._checkPlayerDown(g.player);
  });
  await sleep(400);
  r = await p.evaluate(() => {
    const g = window.game;
    return { pend: !!g.player.pendingFate, dead: !!g.player.dead, over: !!g.over, ang: !!g.player.angelic,
             ann: (document.getElementById('wave-announce') || {}).innerText || '' };
  });
  ok(`T2 P1 倒下 → 进入形态抉择（pendingFate=${r.pend}，游戏未结束=${!r.over}）`, r.pend && r.dead && !r.over && !r.ang);
  const ann2 = await p.evaluate(() => window._annLog.slice(-6).join(' | '));
  ok(`T2b 播报提示 P1 按 N/M（"${ann2.slice(-60)}"）`, /P1 倒下了/.test(ann2) && /N/.test(ann2) && /M/.test(ann2));

  // T3 按 N → P1 变天使
  await p.keyboard.press('KeyN');
  await sleep(400);
  r = await p.evaluate(() => {
    const g = window.game;
    return { ang: !!g.player.angelic, alias: g.playerAngelic, pend: !!g.player.pendingFate, dead: !!g.player.dead,
             hp: g.player.hp, halo: !!g.player.angelHalo, traitor: !!g.player.traitor };
  });
  ok(`T3 P1 按 N → 天使形态（angelic=${r.ang} 别名=${r.alias} hp=${r.hp} 光环=${r.halo}）`, r.ang && r.alias === true && !r.pend && !r.dead && r.hp > 0 && r.halo && !r.traitor);

  // T4 P1 天使 N=捕获
  const t4 = await p.evaluate(() => {
    const g = window.game, p1 = g.player;
    const z = g.zombies.find(z => !z.dead);
    if (!z) return { no: true };
    z.x = p1.x + 120; z.y = p1.y;   // 拉近便于命中判定（捕获是全场最近，无需贴近）
    const before = { stun: z.stunT || 0, cd: p1.capCd || 0, merit: p1.merit || 0 };
    g._angelCapture(p1);
    return { before, after: { stun: z.stunT || 0, cap: z.capturedT || 0, cd: p1.capCd || 0, merit: p1.merit || 0 } };
  });
  ok(`T4 P1 捕获：僵尸定身 ${t4.after ? t4.after.stun : '?'}s / CD ${t4.after ? t4.after.cd : '?'}s / 功德 ${t4.after ? t4.after.merit : '?'}`,
     !t4.no && t4.after.stun > 0 && t4.after.cd === 20 && t4.after.merit === (t4.before.merit + 1));

  // T5 P1 天使 M=加速
  await p.evaluate(() => { window.game.player.spdCd = 0; });
  await p.keyboard.press('KeyM');
  await sleep(300);
  r = await p.evaluate(() => ({ spd: window.game.player.speedBuffT, cd: window.game.player.spdCd }));
  ok(`T5 P1 按 M → 疾跑 6s（speedBuffT=${r.spd}，CD=${r.cd}）`, r.spd > 5 && r.spd <= 6 && r.cd > 18 && r.cd <= 20);

  // T6 杀 P2 → P2 抉择（P1 天使活着，游戏继续）
  await p.evaluate(() => {
    const g = window.game;
    g.player2.invincibleT = 0; g.player2.hp = 0; g._checkPlayerDown(g.player2);
  });
  await sleep(400);
  r = await p.evaluate(() => {
    const g = window.game;
    return { pend: !!g.player2.pendingFate, over: !!g.over, p1alive: !g.player.dead,
             ann: (document.getElementById('wave-announce') || {}).innerText || '' };
  });
  ok(`T6 P2 倒下 → 抉择等待（pendingFate=${r.pend}，P1 仍在=${r.p1alive}，未结束=${!r.over}）`, r.pend && r.p1alive && !r.over);
  const ann6 = await p.evaluate(() => window._annLog.slice(-6).join(' | '));
  ok(`T6b 播报提示 P2 按 1/2（"${ann6.slice(-60)}"）`, /P2 倒下了/.test(ann6) && /1/.test(ann6) && /2/.test(ann6));

  // T7 按 1 → P2 变天使
  await p.keyboard.press('Digit1');
  await sleep(400);
  r = await p.evaluate(() => {
    const g = window.game;
    return { ang: !!g.player2.angelic, pend: !!g.player2.pendingFate, dead: !!g.player2.dead, hp: g.player2.hp,
             halo: !!g.player2.angelHalo, kmenu: g.kmenus[2].active };
  });
  ok(`T7 P2 按 1 → 天使形态（angelic=${r.ang} hp=${r.hp} 光环=${r.halo}）`, r.ang && !r.pend && !r.dead && r.hp > 0 && r.halo);
  ok('T7b P2 天使时按 1 不会打开建造菜单', r.kmenu === false);

  // T8 P2 天使 1=捕获
  const t8 = await p.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(z => { z.stunT = 0; z.capturedT = 0; });
    const prior = g.player2.capCd = 0;
    return { prior };
  });
  await p.keyboard.press('Digit1');
  await sleep(300);
  r = await p.evaluate(() => {
    const g = window.game;
    const z = g.zombies.find(z => !z.dead);
    return { stun: z ? (z.stunT || 0) : 0, capCd: g.player2.capCd, merit: g.player2.merit, kActive: g.kmenus[2].active };
  });
  ok(`T8 P2 按 1 捕获（僵尸定身 ${r.stun}s，P2 CD=${r.capCd}s，功德=${r.merit}）`, r.stun > 1.5 && r.capCd > 18 && r.capCd <= 20 && r.merit === 1 && !r.kActive);

  // T9 P2 天使 2=加速
  await p.evaluate(() => { window.game.player2.spdCd = 0; });
  await p.keyboard.press('Digit2');
  await sleep(300);
  r = await p.evaluate(() => ({ spd: window.game.player2.speedBuffT, cd: window.game.player2.spdCd, p1spd: window.game.player.speedBuffT }));
  ok(`T9 P2 按 2 → 疾跑（speedBuffT=${r.spd}，CD=${r.cd}）`, r.spd > 5 && r.spd <= 6 && r.cd > 18 && r.cd <= 20);

  // T10 P1/P2 形态互不影响：P1 仍是天使、P2 也是天使
  r = await p.evaluate(() => ({ a1: !!window.game.player.angelic, a2: !!window.game.player2.angelic, m1: window.game.player.merit, m2: window.game.player2.merit }));
  ok(`T10 双方可同时是天使（P1 merit=${r.m1} / P2 merit=${r.m2}）`, r.a1 && r.a2 && r.m1 >= 1 && r.m2 >= 1);

  // T11 P2 重置后走内鬼分支：按 2 → 内鬼
  await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    p2.angelic = false; p2.dead = false; p2.pendingFate = false;
    if (p2.angelHalo) { p2.angelHalo.remove(); p2.angelHalo = null; }
    p2.el1.classList.remove('dead-slash'); p2.el1.style.filter = '';
    p2.invincibleT = 0; p2.hp = 0;
    g._checkPlayerDown(p2);
  });
  await sleep(300);
  await p.keyboard.press('Digit2');
  await sleep(400);
  r = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    return { tr: !!p2.traitor, dead: !!p2.dead, isZ: !!p2.isZombie, hp: Math.round(p2.hp), pend: !!p2.pendingFate,
             a1: !!g.player.angelic };
  });
  ok(`T11 P2 按 2 → 内鬼（traitor=${r.tr} isZombie=${r.isZ} hp=${r.hp}；P1 仍是天使=${r.a1}）`, r.tr && !r.dead && r.isZ && r.hp > 0 && !r.pend && r.a1);

  // T12 P2 内鬼挠门：移到有门板房门口 → 门血下降
  const t12 = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    const door = g.plants.find(pl => pl.isDoor && pl.hp > 0);
    if (!door) return { no: true };
    p2.x = door.c * 80 + 40; p2.y = door.r * 80 + 40;
    p2.biteT = 2.3; // 下一帧即咬（2.4s 一次）
    return { doorHp0: door.hp, c: door.c, r: door.r };
  });
  await sleep(1200);
  r = await p.evaluate(() => {
    const g = window.game;
    const door = g.plants.find(pl => pl.isDoor && pl.hp > 0);
    return { hp: door ? door.hp : 0, corrupt: g.player2.corrupt || 0 };
  });
  ok(`T12 P2 内鬼挠门（门血 ${t12.doorHp0} → ${r.hp}）`, !t12.no && r.hp < t12.doorHp0);

  // T13 僵尸不咬内鬼 P2（hp 不减）
  const t13 = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    const z = g.zombies.find(z => !z.dead);
    if (!z) return { no: true };
    // 移到远离所有植物的空地（走廊死角），排除「植物打内鬼」的干扰
    p2.x = 120; p2.y = 200;
    p2.el1.style.left = p2.x + 'px'; p2.el1.style.top = p2.y + 'px';
    p2.hp = Math.round(p2.maxHp);
    z.x = p2.x + 30; z.y = p2.y;
    return { hp0: p2.hp, maxHp: p2.maxHp };
  });
  await sleep(2500);
  r = await p.evaluate(() => ({ hp: Math.round(window.game.player2.hp), dead: !!window.game.player2.dead }));
  ok(`T13 僵尸贴身不咬内鬼 P2（hp ${t13.hp0} → ${r.hp}，dead=${r.dead}）`, !t13.no && r.hp >= t13.hp0 - 1 && !r.dead);

  // T14 植物攻击内鬼 P2：植物索敌列表包含 P2
  r = await p.evaluate(() => {
    const g = window.game;
    const list = g._getHostileTargets ? g._getHostileTargets() : [];
    return { hasP2: list.includes(g.player2), hasP1: list.includes(g.player) };
  });
  ok(`T14 植物索敌包含内鬼 P2（含 P2=${r.hasP2}，含天使 P1=${r.hasP1}）`, r.hasP2 === true && r.hasP1 === false);

  // T15 P2 内鬼不触发僵尸升级链（P2.level 保持 1）
  r = await p.evaluate(() => ({ lvl2: window.game.player2.level, hp: Math.round(window.game.player2.maxHp) }));
  ok(`T15 P2 内鬼不走僵尸升级链（level=${r.lvl2}）`, r.lvl2 === 1);

  ok('T16 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
