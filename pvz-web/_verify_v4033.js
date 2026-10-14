// v4.0.33 验证：大蒜守卫 / AI 500血+常显血条 / 多僵尸检测
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  let pass = 0, fail = 0;
  const ok = (c, n) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n); } };

  // ===== 植物方：大蒜守卫 =====
  const pp = await browser.newPage();
  pp.on('pageerror', e => console.log('[P PAGE ERROR]', e.message));
  await pp.setViewport({ width: 1440, height: 900 });
  await pp.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await pp.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  // 玩家撤离出生点
  await pp.evaluate(() => { const g = window.game; g.player.x = 400; g.player.y = 400; });

  // G1 布景：AI 认领 rooms[0] 后，房内种大蒜+坚果墙，坚果打到 40%，两只僵尸围攻坚果
  const g1 = await pp.evaluate(async () => {
    const g = window.game;
    const ai = g.ais.find(a => !a.dead);
    const rm = g.rooms[0];
    ai.room = rm; ai.targetRoom = rm; rm.owners.push(ai); // 测试直通认领
    // 大蒜种房内空格；坚果=现成门板（门就是坚果墙门板）
    let tile = null;
    outer:
    for (let r = rm.y; r < rm.y + rm.h; r++)
      for (let c = rm.x; c < rm.x + rm.w; c++) {
        if (!g.walls.has(c + ',' + r) && !(c === rm.doorCol && r === rm.doorRow) && !g.plants.some(p => p.c === c && p.r === r)) { tile = { c, r }; break outer; }
      }
    if (!tile) return { err: 'no tile' };
    g.spawnPlant(tile.c, tile.r, 'garlic');
    const nut = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    if (!nut) return { err: 'no door plant' };
    const garlic = g.plants.find(p => p.def.isGarlic);
    nut.hp = nut.maxHp * 0.4; // 门板打到 40% → 过半
    garlic.guardCd = 0;
    // 两只假僵尸在门外走廊围攻（门外方向 = 门格 - 房中心 的主方向）
    const ddx = Math.sign(rm.doorCol - (rm.x + rm.w / 2)), ddy = Math.sign(rm.doorRow - (rm.y + rm.h / 2));
    const ox = ddx * 80, oy = ddy * 80; // 门外一格偏移
    const mk = (dx, dy) => ({ x: rm.doorCol * 80 + 40 + ox + dx, y: rm.doorRow * 80 + 40 + oy + dy, hp: 1000, maxHp: 1000, dead: false, stunT: 0, hitFlashT: 0, el1: null, path: [], speed: 450 });
    const fake1 = mk(0, 0), fake2 = mk(-80, 0); // 门外一格（80px < 120px 臭晕半径）；大蒜落点已避开僵尸格
    g.zombies.push(fake1, fake2);
    const garlicC0 = garlic.c, garlicR0 = garlic.r;
    await new Promise(res => setTimeout(res, 1500));
    return {
      flew: garlic.c !== garlicC0 || garlic.r !== garlicR0,
      guardCd: Math.round(garlic.guardCd),
      z1scare: fake1.garlicScareT > 18, z1stun: fake1.stunT > 0,
      z2scare: fake2.garlicScareT > 18, z2stun: fake2.stunT > 0,
      d1: Math.round(Math.hypot(fake1.x - (rm.doorCol * 80 + 40), fake1.y - (rm.doorRow * 80 + 40))),
      nutPos: { c: nut.c, r: nut.r }, garlicPos: { c: garlic.c, r: garlic.r }
    };
  });
  ok(g1.flew === true, 'G1a 坚果过半血大蒜自动飞援 ' + JSON.stringify(g1));
  ok(g1.guardCd > 40 && g1.guardCd <= 45, 'G1b 触发后 45s 冷却 (cd=' + g1.guardCd + ')');
  ok(g1.z1scare && g1.z2scare, 'G1c 两只僵尸均被标记 20s 恐吓');
  ok(g1.z1stun && g1.z2stun, 'G1d 两只僵尸均被臭晕');

  // G2 被恐吓僵尸走开（目标改为地图上方，2 秒后应远离坚果）
  const g2 = await pp.evaluate(async () => {
    const g = window.game;
    const rm = g.rooms[0];
    const nx = rm.doorCol * 80 + 40, ny = rm.doorRow * 80 + 40; // 门格位置
    const fake = g.zombies.find(z => z.speed === 450 && !z.dead && z.garlicScareT !== undefined && !z.isMinion && !z.isBoss);
    if (!fake) return { d0: -1, d1: -1, leaving: false, nofake: true };
    await new Promise(res => setTimeout(res, 2500)); // 先等臭晕 2.5s 结束
    const d0 = Math.hypot(fake.x - nx, fake.y - ny);
    await new Promise(res => setTimeout(res, 2500));
    const d1 = Math.hypot(fake.x - nx, fake.y - ny);
    return { d0: Math.round(d0), d1: Math.round(d1), leaving: d1 > d0 + 30, scare: Math.round(fake.garlicScareT) };
  });
  ok(g2.leaving, 'G2 被恐吓僵尸走开 (dist ' + g2.d0 + '→' + g2.d1 + ')');

  // G3 冷却期不再触发（再打半血另一个坚果？直接验证 guardCd 递减且大蒜不再飞）
  const g3 = await pp.evaluate(async () => {
    const g = window.game;
    const garlic = g.plants.find(p => p.def.isGarlic);
    const pos = { c: garlic.c, r: garlic.r };
    await new Promise(res => setTimeout(res, 1000));
    return { still: garlic.c === pos.c && garlic.r === pos.r, cd: Math.round(garlic.guardCd) };
  });
  ok(g3.still && g3.cd > 30, 'G3 冷却期大蒜不动 (cd=' + g3.cd + ')');

  // H1 AI 500 血 + 血条常显
  const h1 = await pp.evaluate(() => {
    const a = window.game.ais[0];
    return { hp: a.hp, maxHp: a.maxHp, barShown: a.hpBg && getComputedStyle(a.hpBg).display === 'block' };
  });
  ok(h1.hp === 500 && h1.maxHp === 500, 'H1a AI 血量 500 ' + JSON.stringify(h1));
  ok(h1.barShown, 'H1b AI 血条常显');
  await pp.close();

  // ===== 僵尸方回归 =====
  const zp = await browser.newPage();
  zp.on('pageerror', e => console.log('[Z PAGE ERROR]', e.message));
  await zp.setViewport({ width: 1440, height: 900 });
  await zp.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await zp.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0', { timeout: 30000 });
  await zp.evaluate(() => { const g = window.game; g.player.x = 400; g.player.y = 400; g.gameTime = 6000; });
  await new Promise(r => setTimeout(r, 3000));
  const z1 = await zp.evaluate(() => {
    const g = window.game;
    return { alive: g.ais.filter(a => !a.dead).length, hp: g.ais[0].hp, err: !g.ais.length };
  });
  ok(z1.alive >= 4 && z1.hp === 500, 'Z1 僵尸方回归：AI 500 血正常存活 ' + JSON.stringify(z1));
  await zp.close();

  await browser.close();
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
