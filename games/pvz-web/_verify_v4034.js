// v4.0.34 验证：AI 不再卡在场地外——①无房 AI 遇僵尸直接逃进房间（不再逃向地图边缘）
// ②原「180 内丢路点」改为加速冲向房间 ③速度字段真正生效
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
  const insideRoom = (g, x, y) => {
    const c = Math.floor(x / 80), r = Math.floor(y / 80);
    return g.rooms.some(rm => c >= rm.x && c < rm.x + rm.w && r >= rm.y && r < rm.y + rm.h);
  };

  // ===== F1 常规进房：僵尸玩家远离出生点，AI 应在 15 秒内全部走进自己房间 =====
  const p1 = await browser.newPage();
  p1.on('pageerror', e => console.log('[F1 PAGE ERROR]', e.message));
  await p1.setViewport({ width: 1440, height: 900 });
  await p1.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p1.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.ais.length>0', { timeout: 30000 });
  await p1.evaluate(() => { const g = window.game; g.player.x = 300; g.player.y = 300; });
  await new Promise(res => setTimeout(res, 15000));
  const f1 = await p1.evaluate(() => {
    const g = window.game;
    return g.ais.map(a => ({
      room: !!a.room, dead: a.dead,
      cx: Math.round(a.x), cy: Math.round(a.y)
    }));
  });
  await p1.evaluate(() => {
    const g = window.game;
    window._f1in = g.ais.filter(a => {
      if (!a.room) return false;
      const c = Math.floor(a.x / 80), r = Math.floor(a.y / 80);
      return c >= a.room.x && c < a.room.x + a.room.w && r >= a.room.y && r < a.room.y + a.room.h;
    }).length;
  });
  const f1in = await p1.evaluate('window._f1in');
  ok(f1in >= 4, 'F1 常规开局 15s 后 ' + f1in + '/5 AI 身处房间内（认领+物理在房内）');

  // ===== F2 蹲点测试：僵尸玩家开局就站在 AI 出生点正中央（<130px 贴脸），AI 应逃进房间而不是卡在场地外 =====
  const p2 = await browser.newPage();
  p2.on('pageerror', e => console.log('[F2 PAGE ERROR]', e.message));
  await p2.setViewport({ width: 1440, height: 900 });
  await p2.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p2.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.ais.length>0', { timeout: 30000 });
  await p2.evaluate(() => {
    const g = window.game;
    // 玩家钉死在 AI 出生点（地图中心）
    g.player.x = g.worldWidth / 2; g.player.y = g.worldHeight / 2;
  });
  // 持续把玩家钉在中心（防 AI 出生保护/其他逻辑移动玩家）
  await p2.evaluate(() => {
    const g = window.game;
    window._camp = setInterval(() => { g.player.x = g.worldWidth / 2; g.player.y = g.worldHeight / 2; }, 200);
  });
  await new Promise(res => setTimeout(res, 20000));
  const f2 = await p2.evaluate(() => {
    const g = window.game;
    clearInterval(window._camp);
    return {
      withRoom: g.ais.filter(a => a.room).length,
      inside: g.ais.filter(a => {
        if (!a.room) return false;
        const c = Math.floor(a.x / 80), r = Math.floor(a.y / 80);
        return c >= a.room.x && c < a.room.x + a.room.w && r >= a.room.y && r < a.room.y + a.room.h;
      }).length,
      dead: g.ais.filter(a => a.dead).length,
      total: g.ais.length
    };
  });
  ok(f2.inside >= 3, 'F2 玩家贴脸蹲点 20s 后 ' + f2.inside + '/' + f2.total + ' AI 进入房间内（死亡 ' + f2.dead + '）');
  ok(f2.withRoom >= 3, 'F2 同场景 ' + f2.withRoom + '/' + f2.total + ' AI 已认领房间');

  // ===== F3 逃进房间断言：无房 AI 被僵尸贴脸 → 路点终点应落在某个房间内部（而非地图边缘）且真的在移动 =====
  const p3 = await browser.newPage();
  p3.on('pageerror', e => console.log('[F3 PAGE ERROR]', e.message));
  await p3.setViewport({ width: 1440, height: 900 });
  await p3.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p3.waitForFunction('window.game && window.game.rooms && window.game.rooms.length>0 && window.game.ais.length>0', { timeout: 30000 });
  const f3 = await p3.evaluate(async () => {
    const g = window.game;
    const ai = g.ais[0];
    // 锁定场景：AI 无房、目标房被玩家占（逼走「逃向最近空房」分支）
    ai.room = null;
    ai.targetRoom = null; // 逼 refuge 选择逻辑
    g.player.x = ai.x + 90; g.player.y = ai.y; // 90px 贴脸（<130）
    g.player.room = null; g.player.room2 = null;
    await new Promise(res => setTimeout(res, 250)); // 逃跑刚触发就观察（320px 安全复位前）
    const fleeing = ai.fleeing === true, fast = ai.speed === 300;
    const x0 = ai.x, y0 = ai.y;
    await new Promise(res => setTimeout(res, 300));
    const moved = Math.hypot(ai.x - x0, ai.y - y0); // 300 速 0.3s ≈ 90px，200 速 ≈ 60px
    const path = ai.path || [];
    const last = path.length ? path[path.length - 1] : null;
    let lastInRoom = false, lastNearEdge = null;
    if (last) {
      const c = Math.floor(last.x / 80), r = Math.floor(last.y / 80);
      const rm = g.rooms.find(rm => c >= rm.x && c < rm.x + rm.w && r >= rm.y && r < rm.y + rm.h);
      lastInRoom = !!rm;
      lastNearEdge = last.x < 150 || last.y < 150 || last.x > g.worldWidth - 150 || last.y > g.worldHeight - 150;
    }
    return { fleeing, fast, moved: Math.round(moved), lastInRoom, lastNearEdge, pathLen: path.length };
  });
  ok(f3.fleeing && f3.fast, 'F3a 贴脸触发逃跑且速度切 300 (fleeing=' + f3.fleeing + ' speed300=' + f3.fast + ')');
  ok(f3.moved > 72, 'F3b 速度字段真正生效：0.3s 位移 ' + f3.moved + 'px（>72 即 300 速，200 速只有 ~60）');
  ok(f3.lastInRoom && !f3.lastNearEdge, 'F3c 逃跑路点终点在房间内部而非地图边缘 (inRoom=' + f3.lastInRoom + ' nearEdge=' + f3.lastNearEdge + ')');

  // ===== F4 180 内不再丢路点：无房 AI 行进中僵尸贴近（150px），路径应保留且继续向房间推进 =====
  const f4 = await p3.evaluate(async () => {
    const g = window.game;
    const ai = g.ais[1];
    if (!ai || ai.dead) return { skip: true };
    ai.room = null; ai.fleeing = false; ai.speed = 200;
    // 给它一条去 targetRoom 的路径
    const rm = ai.targetRoom || g.rooms.find(r => r.owners.length < r.capacity);
    ai.targetRoom = rm;
    const p = g._findPath(ai.x, ai.y, rm.frontX, rm.frontY);
    if (p) p.push({ x: (rm.x + rm.tpl.beds[0].c) * 80 + 40, y: (rm.y + rm.tpl.beds[0].r) * 80 + 40 });
    ai.path = p || [];
    g.player.x = ai.x + 150; g.player.y = ai.y; // 150px（在 130~180 之间：不触发逃跑但旧版会丢路点）
    const pathLen0 = ai.path.length;
    await new Promise(res => setTimeout(res, 1000));
    return { skip: false, pathKept: (ai.path || []).length > 0, pathLen0, progressed: Math.hypot(ai.x - (g.player.x - 150), ai.y - g.player.y) > 0 };
  });
  if (!f4.skip) ok(f4.pathKept, 'F4 150px 贴近时路径保留不再丢点（旧版会清空路径原地卡死）');
  else console.log('SKIP F4（无可用 AI）');

  await browser.close();
  console.log('RESULT ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
