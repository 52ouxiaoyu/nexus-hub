// v4.0.122 验证：门格保护 / 走路不出门 / O(4) 键出门 / 重开血量 / P1 死后 P2 血条 / NaN 保护
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) { PASS++; console.log('  PASS ' + m); } else { FAIL++; console.log('  FAIL ' + m); } };

const boot = async (page) => {
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"');
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ gameMode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await page.waitForFunction('window.game && window.game.player2');
  await sleep(1400);
};

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));
  await boot(page);

  // 让僵尸立刻出场
  await page.evaluate(() => { window.game.ghostSpawnAt = 0; });
  await page.waitForFunction('window.game.zombies.length > 0', { timeout: 15000 });
  await sleep(600);

  // 找到第一个房间的门朝向 + 门外/朝内格，摆好门板
  const geo = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize;
    const rm = g.rooms[0];
    const d = g._doorOutDir(rm);
    const door = { c: rm.doorCol, r: rm.doorRow };
    const out = { c: door.c + d.ox, r: door.r + d.oy };
    const inn = { c: door.c - d.ox, r: door.r - d.oy };
    let dp = g.getPlantAt(door.c * gs + 40, door.r * gs + 40);
    if (!dp) { g.spawnPlant(door.c, door.r, 'wallnut', true, g.player); dp = g.getPlantAt(door.c * gs + 40, door.r * gs + 40); }
    return { door, out, inn, dir: d, doorHp: dp ? Math.round(dp.hp) : -1,
             innInside: !!g._insideRoom(inn.c, inn.r), outInside: !!g._insideRoom(out.c, out.r) };
  });
  console.log('门几何:', JSON.stringify(geo));

  // ---------- T1 站门格：僵尸贴门板（距离 < 80）不掉血 ----------
  const t1 = await page.evaluate(async () => {
    const g = window.game, gs = g.gridSize;
    const rm = g.rooms[0], d = g._doorOutDir(rm);
    const z = g.zombies.find(z => !z.dead);
    const oldSpd = z.speed; z.speed = 0;
    g.player.x = rm.doorCol * gs + 40; g.player.y = rm.doorRow * gs + 40;
    g.player.hp = 100; g.player.maxHp = 100;
    // 僵尸摆在门外格、朝门方向挤 22px（模拟真实「贴着门板」）
    z.x = (rm.doorCol + d.ox) * gs + 40 - d.ox * 22;
    z.y = (rm.doorRow + d.oy) * gs + 40 - d.oy * 22;
    z.lockedTarget = g.player; z.retreating = false; z.path = null;
    const dist = Math.round(Math.hypot(g.player.x - z.x, g.player.y - z.y));
    const hp0 = g.player.hp;
    await new Promise(r => setTimeout(r, 1400));
    const lost = Math.round((hp0 - g.player.hp) * 10) / 10;
    // 门板仍是满血吗
    const dp = g.getPlantAt(rm.doorCol * gs, rm.doorRow * gs);
    return { dist, lost, hp1: Math.round(g.player.hp), doorAlive: !!(dp && dp.isDoor && dp.hp > 0) };
  });
  ok(t1.dist < 80, `T1a 场景成立：僵尸与玩家相距 ${t1.dist}px（<80 接触阈值）`);
  ok(t1.lost === 0, `T1b 站在门上升级门：门活着时 0 掉血（实测掉 ${t1.lost}）`);
  ok(t1.doorAlive, 'T1c 门板全程未被忽略（仍 isDoor 且 hp>0）');

  // ---------- T2 门破了就该被咬（不是永久无敌） ----------
  const t2 = await page.evaluate(async () => {
    const g = window.game, gs = g.gridSize;
    const rm = g.rooms[0];
    const dp = g.getPlantAt(rm.doorCol * gs, rm.doorRow * gs);
    if (dp) { dp.el1 && dp.el1.remove(); g.plants = g.plants.filter(x => x !== dp); }
    g.player.hp = 100;
    await new Promise(r => setTimeout(r, 1200));
    return { lost: Math.round((100 - g.player.hp) * 10) / 10, doorGone: !g.getPlantAt(rm.doorCol * gs, rm.doorRow * gs) };
  });
  ok(t2.doorGone && t2.lost > 0, `T2 门板拆掉后站门格会被咬（掉 ${t2.lost} 血）——不是无条件无敌`);

  // ---------- T3 房内走路迈不出门 ----------
  await boot(page);
  const t3 = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize;
    const rm = g.rooms[0], d = g._doorOutDir(rm);
    // 站到「门内侧一格」的中心
    g.player.x = (rm.doorCol - d.ox) * gs + 40;
    g.player.y = (rm.doorRow - d.oy) * gs + 40;
    g.player.vx = 0; g.player.vy = 0;
    window.__geo3 = { rm: { doorCol: rm.doorCol, doorRow: rm.doorRow }, d, gs };
    return { start: { x: Math.round(g.player.x), y: Math.round(g.player.y) } };
  });
  // 朝门外方向按住方向键 1.3 秒
  const dirKey = await page.evaluate(() => {
    const d = window.__geo3.d;
    if (d.oy === -1) return 'KeyW';
    if (d.oy === 1) return 'KeyS';
    if (d.ox === -1) return 'KeyA';
    return 'KeyD';
  });
  await page.keyboard.down(dirKey);
  await sleep(1300);
  await page.keyboard.up(dirKey);
  await sleep(200);
  const t3b = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize, G = window.__geo3;
    const c = Math.floor(g.player.x / gs), r = Math.floor(g.player.y / gs);
    const zone = g._roomZoneOf(c, r);
    return { x: Math.round(g.player.x), y: Math.round(g.player.y), c, r,
             inZone: !!zone, isDoorCell: c === G.rm.doorCol && r === G.rm.doorRow,
             outCell: { c: G.rm.doorCol + G.d.ox, r: G.rm.doorRow + G.d.oy } };
  });
  const crossedOut = (t3b.c === t3b.outCell.c && t3b.r === t3b.outCell.r);
  ok(!crossedOut, `T3a 按住外出方向 1.3s 仍被拦在屋内/门格（落在 ${t3b.c},${t3b.r}，门外格是 ${t3b.outCell.c},${t3b.outCell.r}）`);
  ok(t3b.inZone, `T3b 位置仍属于本房区域（门格 or 房内格）`);

  // ---------- T4 O 键出门直接到门口 ----------
  const t4 = await page.evaluate(() => {
    const g = window.game;
    return { before: { x: Math.round(g.player.x), y: Math.round(g.player.y) } };
  });
  await page.keyboard.press('KeyO');
  await sleep(500);
  const t4b = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize, G = window.__geo3;
    const c = Math.floor(g.player.x / gs), r = Math.floor(g.player.y / gs);
    return { x: Math.round(g.player.x), y: Math.round(g.player.y), c, r,
             want: { c: G.rm.doorCol + G.d.ox, r: G.rm.doorRow + G.d.oy },
             zone: !!g._roomZoneOf(c, r) };
  });
  ok(t4b.c === t4b.want.c && t4b.r === t4b.want.r,
     `T4a O 键把 P1 直接送到门外一格（${t4b.c},${t4b.r} = 期望 ${t4b.want.c},${t4b.want.r}）`);
  ok(!t4b.zone, 'T4b 出门后已不在房间区域（真的出去了）');

  // ---------- T5 从屋外能走回门格（单向限制，进屋不受影响） ----------
  const t5 = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize, G = window.__geo3;
    // 放回门外再往门里走
    g.player.x = (G.rm.doorCol + G.d.ox) * gs + 40;
    g.player.y = (G.rm.doorRow + G.d.oy) * gs + 40;
    return { ok: !g._canWalkTo(g.player, G.rm.doorCol * gs + 40, G.rm.doorRow * gs + 40) === false };
  });
  const canIn = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize, G = window.__geo3;
    return g._canWalkTo(g.player, G.rm.doorCol * gs + 40, G.rm.doorRow * gs + 40);
  });
  ok(canIn, 'T5 从屋外走向门格允许（进屋不受限，只有出屋被拦）');

  // ---------- T6 P2 用 4 键出门 ----------
  const t6 = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize, G = window.__geo3;
    g.player2.x = (G.rm.doorCol - G.d.ox) * gs + 40;
    g.player2.y = (G.rm.doorRow - G.d.oy) * gs + 40;
    g.player2.hp = 100; g.player2.maxHp = 100;
    return { start: { c: Math.floor(g.player2.x / gs), r: Math.floor(g.player2.y / gs) } };
  });
  await page.keyboard.press('Digit4');
  await sleep(500);
  const t6b = await page.evaluate(() => {
    const g = window.game, gs = g.gridSize, G = window.__geo3;
    const c = Math.floor(g.player2.x / gs), r = Math.floor(g.player2.y / gs);
    return { c, r, want: { c: G.rm.doorCol + G.d.ox, r: G.rm.doorRow + G.d.oy } };
  });
  ok(t6b.c === t6b.want.c && t6b.r === t6b.want.r, `T6 P2 按 4 出门到门口（${t6b.c},${t6b.r}）`);

  // ---------- T7 再来一次：血量与血条都不残留 ----------
  await boot(page);
  const t7a = await page.evaluate(() => {
    const g = window.game;
    g.player.hp = 23; g.player2.hp = 57;
    g.setHp();
    return { f1: document.getElementById('hp-fill').style.width, f2: document.getElementById('hp-fill2').style.width };
  });
  await page.evaluate(() => { window.retryDormGame(); });
  await sleep(1400);
  const t7b = await page.evaluate(() => {
    const g = window.game;
    return { hp1: g.player.hp, hp2: g.player2.hp,
             f1: document.getElementById('hp-fill').style.width, n1: document.getElementById('hp-num').innerText,
             f2: document.getElementById('hp-fill2').style.width, n2: document.getElementById('hp-num2').innerText };
  });
  ok(t7a.f2 === '57%', `T7a 上一局残留 57% 已注入（${t7a.f2}）`);
  ok(t7b.hp1 === 100 && t7b.hp2 === 100, `T7b 新局真实血量 100/100（${t7b.hp1}/${t7b.hp2}）`);
  ok(t7b.f1 === '100%' && t7b.f2 === '100%', `T7c 新局两条血条都归位 100%（P1=${t7b.f1} P2=${t7b.f2}，旧版会是 57%）`);
  ok(t7b.n1 === '100' && t7b.n2 === '100', `T7d 血条数字不残留（P1=${t7b.n1} P2=${t7b.n2}）`);

  // ---------- T8 P1 死后 P2 血条保持真实值（不被刷满） ----------
  const t8 = await page.evaluate(async () => {
    const g = window.game;
    g.player2.hp = 40; g.player2.maxHp = 100; g.setHp();
    const z = g.zombies.find(z => !z.dead);
    if (z) { z.x = 40; z.y = 40; }   // 挪开，别真咬
    g.player.hp = -5;
    g._checkP1Down();
    await new Promise(r => setTimeout(r, 900));
    return { p1dead: !!g.player.dead, p2hp: g.player2.hp,
             f1: document.getElementById('hp-fill').style.width, n1: document.getElementById('hp-num').innerText,
             f2: document.getElementById('hp-fill2').style.width, n2: document.getElementById('hp-num2').innerText };
  });
  ok(t8.p1dead && t8.f1 === '0%', `T8a P1 倒下 → P1 血条归零（${t8.f1}，数字 ${t8.n1}）`);
  ok(t8.p2hp === 40 && t8.f2 === '40%' && t8.n2 === '40',
     `T8b P1 倒下不影响 P2 血量显示（真实 ${t8.p2hp} / 血条 ${t8.f2} / 数字 ${t8.n2}）`);

  // ---------- T9 非法血量不再渲染成"满血" ----------
  const t9 = await page.evaluate(() => {
    const g = window.game;
    g.player2.hp = NaN; g.player2.maxHp = 100;
    g.setHp();
    const a = document.getElementById('hp-fill2').style.width;
    g.player2.hp = 40; g.player2.maxHp = 0;
    g.setHp();
    const bb = document.getElementById('hp-fill2').style.width;
    g.player2.maxHp = 100; g.player2.hp = 40; g.setHp();
    return { nanW: a, zeroMaxW: bb };
  });
  ok(t9.nanW === '0%' && t9.zeroMaxW === '0%',
     `T9 hp=NaN / maxHp=0 时血条显示 0%（${t9.nanW} / ${t9.zeroMaxW}），不再回落到 CSS 默认 100%`);

  // ---------- T10 无页面报错 ----------
  ok(errs.length === 0, `T10 全程 0 页面报错（${errs.slice(0, 2).join(' | ') || '无'}）`);

  console.log(`\n=== ${PASS} PASS / ${FAIL} FAIL ===`);
  await b.close();
  process.exit(FAIL ? 1 : 0);
})();
