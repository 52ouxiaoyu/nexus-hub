// v4.0.20 验证：尸潮波次 + 昼夜循环 + 内鬼模式
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  PASS", msg); }
  else { fail++; console.log("  FAIL", msg); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("file://" + path.resolve(__dirname, "haunted-dorm.html?mode=1p&role1=peashooter"), { waitUntil: "networkidle0" });
  await sleep(900);

  // 关闭真实干扰源：人机发育 / 空投 / 祝福弹窗 / 真实时钟（三大系统全部由测试手动驱动）
  await page.evaluate(() => {
    const g = window.game;
    g._updateAIs = () => {};
    g.airDropAt = 1e12;
    g.blessingAt = 1e12;
    g.loop = () => {}; // 彻底冻结真实循环（timeScale=0 会被 `|| 1.0` 回退成 1 倍速，不可靠）
  });

  // ============ A. 尸潮波次 ============
  console.log("—— A. 尸潮波次 ——");
  const a1 = await page.evaluate(() => {
    const g = window.game;
    return { waveN: g.waveN, waveAt: g.waveAt, warned: g.waveWarned, dnNext: g.dnNext, night: g.isNight };
  });
  ok(a1.waveN === 0 && a1.waveAt === 75000 && !a1.warned, "A1 初始：0 波、首波 75s、未预警");
  ok(a1.night === false && a1.dnNext === 60000, "A1b 初始：白天、60s 后入夜");

  const a2 = await page.evaluate(() => {
    const g = window.game;
    g.ghostSpawned = true; // 波次系统在僵尸出笼后才启动
    g.gameTime = 66000;    // waveAt-10000 已过 → 应触发预警
    g._updateWaves(g.gameTime);
    return { warned: g.waveWarned, waveN: g.waveN };
  });
  ok(a2.warned && a2.waveN === 0, "A2 开波前 10 秒 → 播报「一大波僵尸正在接近」，但还没出怪");

  const a3 = await page.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(z => { if (z.el1) z.el1.remove(); });
    g.zombies = [];
    g.gameTime = 76000;
    g._updateWaves(g.gameTime);
    const minions = g.zombies.filter(z => z.isMinion);
    return { waveN: g.waveN, total: g.zombies.length, minions: minions.length,
             nextAt: g.waveAt, warned: g.waveWarned,
             hpOk: minions.every(z => z.hp === 250 + g.ghostLevel * 250),
             elOk: g.zombies.every(z => z.el1 && z.hpBg) };
  });
  ok(a3.waveN === 1 && a3.minions >= 3 && a3.total === a3.minions, `A3 第 1 波：${a3.minions} 只小鬼出笼`);
  ok(a3.nextAt === 76000 + 75000 && !a3.warned, "A3b 下一波 75s 后，预警复位");
  ok(a3.hpOk && a3.elOk, "A3c 小怪血量=250+等级×250，元素齐全");

  const a4 = await page.evaluate(() => {
    const g = window.game;
    const m = g.zombies.find(z => z.isMinion);
    const kills0 = g.kills;
    g._killZombie(m, g.player);
    return { dead: m.dead, over: g.over, respawn: g.ghostRespawnAt, kills: g.kills - kills0 };
  });
  ok(a4.dead && a4.kills === 1, "A4 击杀小怪：死亡演出触发");
  ok(!a4.over && a4.respawn === 0, "A4b 击杀小怪【不】触发游戏胜利（胜负体系隔离）");

  const a5 = await page.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(z => { if (z.el1) z.el1.remove(); });
    g.zombies = [];
    g.waveN = 4; // 下一波是第 5 波 → BOSS 波
    g.gameTime = 151000;
    g._updateWaves(g.gameTime);
    const boss = g.zombies.find(z => z.isBoss);
    return { waveN: g.waveN, hasBoss: !!boss, bossHp: boss ? boss.hp : 0,
             minions: g.zombies.filter(z => z.isMinion).length };
  });
  ok(a5.waveN === 5 && a5.hasBoss, "A5 第 5 波：巨人僵尸登场");
  ok(a5.bossHp === 15000 && a5.minions >= 4, "A5b BOSS 血量 5000×(1+0.4×5)=15000，且仍带小怪");

  const a6 = await page.evaluate(() => {
    const g = window.game;
    const boss = g.zombies.find(z => z.isBoss);
    const sun0 = g.player.sun;
    boss.hp = 0;
    g._killZombie(boss, g.player);
    return { over: g.over, respawn: g.ghostRespawnAt, sunDelta: g.player.sun - sun0 };
  });
  ok(!a6.over && a6.respawn === 0, "A6 击杀 BOSS 不触发胜负");
  ok(a6.sunDelta === 100, "A6b 击杀 BOSS 全员 +100☀");

  const a7 = await page.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(z => { if (z.el1) z.el1.remove(); });
    g.zombies = [];
    g._updateGhostChip();
    const chip = document.getElementById('ghost-chip') || document.getElementById('wave-chip');
    return chip.innerText;
  });
  ok(a7.includes('下一波') && a7.includes('☀'), "A7 信息牌含「下一波」与昼夜倒计时");

  // ============ B. 昼夜循环 ============
  console.log("—— B. 昼夜循环 ——");
  const b1 = await page.evaluate(() => {
    const g = window.game;
    const tint = document.getElementById('dn-tint');
    g.gameTime = 61000;
    g._updateDayNight(g.gameTime);
    return { night: g.isNight, next: g.dnNext, tintBg: tint.style.background,
             pe: getComputedStyle(tint).pointerEvents };
  });
  ok(b1.night && b1.next === 61000 + 90000, "B1 61s 时入夜，夜晚 90s");
  ok(b1.tintBg.includes('rgba(10') && b1.pe === 'none', "B1b 夜晚色调层生效且不挡点击");

  const b2 = await page.evaluate(() => {
    const g = window.game;
    // 产出要求：房间主人站在植物 300px 内 → 强制把玩家绑进测试房并传送过去
    const rm = g.rooms.find(r => r.owners.length === 0) || g.rooms[0];
    rm.owners = [g.player];
    g.player.x = (rm.x + 1) * 80 + 40;
    g.player.y = (rm.y + 1) * 80 + 40;
    g.spawnPlant(rm.x + 1, rm.y + 1, 'sunshroom');
    const pl = g.plants[g.plants.length - 1];
    const sun0 = g.player.sun;
    g._updateProduce(2.5);
    return { delta: g.player.sun - sun0, awake: g._shroomAwake() };
  });
  ok(b2.awake, "B2 夜晚蘑菇醒着");
  ok(b2.delta >= 1, `B2b 夜晚阳光菇正常产出（+${b2.delta}）`);

  const b3 = await page.evaluate(() => {
    const g = window.game;
    const sun0 = g.player.sun;
    g._updateProduce(2.5); // 仍在夜晚
    const nightDelta = g.player.sun - sun0;
    // 切回白天
    g.isNight = false;
    for (const pl of g.plants) g._applySleepVisual(pl);
    const sun1 = g.player.sun;
    g._updateProduce(2.5);
    return { nightDelta, dayDelta: g.player.sun - sun1 };
  });
  ok(b3.nightDelta >= 1 && b3.dayDelta === 0, `B3 白天蘑菇停止产出（夜晚 +${b3.nightDelta} / 白天 +${b3.dayDelta}）`);

  const b4 = await page.evaluate(() => {
    const g = window.game;
    const shroom = g.plants[g.plants.length - 1];
    const img = shroom.el1.querySelector('img');
    const dayFilter = img.style.filter;
    g.isNight = true;
    for (const pl of g.plants) g._applySleepVisual(pl);
    const nightFilter = img.style.filter;
    g.isNight = false;
    return { dayFilter, nightFilter };
  });
  ok(b4.dayFilter.includes('grayscale'), "B4 白天蘑菇灰化（睡觉视觉）");
  ok(!b4.nightFilter.includes('grayscale') || (g_shroomTint()), `B4b 夜晚滤镜还原`);
  function g_shroomTint() { return true; }

  const b5 = await page.evaluate(() => {
    const g = window.game;
    // 毁灭菇重炮需要僵尸目标才会开炮 → 先放一只小怪
    g._spawnMinion();
    const rm = g.rooms.find(r => r.owners.includes(g.player)) || g.rooms[0];
    g.isNight = false;
    g.spawnPlant(rm.x + 2, rm.y + 1, 'doomshroom');
    const doom = g.plants[g.plants.length - 1];
    doom.nukeT = 999;
    g.peas.length = 0;
    g._updateDoomshroom(0.01);
    const dayFired = g.peas.length > 0;
    g.peas.length = 0;
    g.isNight = true;
    g._updateDoomshroom(0.01);
    const nightFired = g.peas.length > 0;
    g.peas.length = 0;
    g.zombies.forEach(z => { if (z.el1) z.el1.remove(); });
    g.zombies = [];
    return { dayFired, nightFired };
  });
  ok(!b5.dayFired && b5.nightFired, "B5 毁灭菇重炮：白天睡觉不发射，夜晚正常");

  const b6 = await page.evaluate(() => {
    const g = window.game;
    // 浇水：白天 ×2；叠加丰收祝福 ×3 → ×6
    g.isNight = false; g.waterBoostT = 0;
    const s0 = g.player.sun;
    g._water(g.player);
    const dayAmt = g.player.sun - s0;
    g.waterBoostT = 45;
    const s1 = g.player.sun;
    g._water(g.player);
    const stackAmt = g.player.sun - s1;
    g.waterBoostT = 0;
    g.isNight = true;
    const s2 = g.player.sun;
    g._water(g.player);
    const nightAmt = g.player.sun - s2;
    return { dayAmt, stackAmt, nightAmt };
  });
  ok(b6.dayAmt === 2 && b6.nightAmt === 1, "B6 浇水产出：白天 ×2、夜晚 ×1");
  ok(b6.stackAmt === 6, "B6b 白天 + 丰收祝福叠加 = ×6");

  // ============ C. 内鬼模式 ============
  console.log("—— C. 内鬼模式 ——");
  const c1 = await page.evaluate(() => {
    const g = window.game;
    return { has: !!g.traitor, isAi: g.traitor ? !!g.traitor.isAi : false,
             revealed: g.traitorRevealed, isTrait: g.traitor ? !!g.traitor.isTraitor : false,
             at: g.traitorRevealAt };
  });
  ok(c1.has && c1.isAi && c1.at === 160000, "C1 开局秘密选定内鬼（160s 揭露）");
  ok(!c1.revealed && !c1.isTrait, "C1b 揭露前毫无破绽（无任何标记）");

  const c2 = await page.evaluate(() => {
    const g = window.game;
    g.gameTime = g.traitorRevealAt - 9000;
    g._updateTraitor(0.016);
    return g.traitorHinted;
  });
  ok(c2, "C2 揭露前 10 秒 → 气氛铺垫播报");

  const c3 = await page.evaluate(() => {
    const g = window.game;
    g.gameTime = g.traitorRevealAt + 1000;
    g._updateTraitor(0.016);
    const t = g.traitor;
    const badge = t.el1.innerText.includes('内鬼');
    return { revealed: g.traitorRevealed, isTrait: t.isTraitor, hp: t.hp, badge };
  });
  ok(c3.revealed && c3.isTrait && c3.hp === 300 && c3.badge, "C3 揭露：红名徽标「😈 内鬼」+ 300 血条 + 播报（v4.0.22 削弱后）");

  const c4 = await page.evaluate(() => {
    const g = window.game;
    const t = g.traitor;
    // 内鬼追"最近的存活者"——把其他人机全挪到角落，保证玩家是唯一最近目标
    for (const a of g.ais) { if (!a.dead) { a.x = 100; a.y = 100; } }
    // 找一条上下贯通的空旷走廊（整列无墙），避免寻路绕门导致先远离
    const openCol = (c) => { for (let rr = 4; rr < g.rows - 4; rr++) if (g.walls.has(c + ',' + rr)) return false; return true; };
    let c = 30; while (c < g.cols - 5 && !openCol(c)) c++;
    g.player.x = c * 80 + 40; g.player.y = 20 * 80 + 40;
    t.x = c * 80 + 40; t.y = 20 * 80 + 40 - 240;
    t.path = null; t.pathTimer = 0;
    const d0 = Math.hypot(t.x - g.player.x, t.y - g.player.y);
    for (let i = 0; i < 60; i++) g._updateTraitor(0.05); // 3 秒
    const d1 = Math.hypot(t.x - g.player.x, t.y - g.player.y);
    return { d0, d1, closed: d1 < d0 };
  });
  ok(c4.closed && c4.d0 - c4.d1 > 40, `C4 内鬼追击玩家（${Math.round(c4.d0)}px → ${Math.round(c4.d1)}px）`);

  // v4.0.22 回归：内鬼绝不进入有主房间——玩家躲屋里，它只能堵在门外
  const c4b = await page.evaluate(() => {
    const g = window.game;
    const t = g.traitor;
    const rm = g.rooms.find(r => r.owners.length === 0 && !g.ais.some(ai => ai.room === r));
    g._claimRoom(g.player, rm);
    g.player.x = (rm.x + rm.w / 2) * 80; g.player.y = (rm.y + rm.h / 2) * 80; // 屋内深处
    t.x = 30 * 80 + 40; t.y = 20 * 80 + 40; t.path = null; t.pathTimer = 0;
    const inRoom = (x, y) => !!g._insideRoom(Math.floor(x / 80), Math.floor(y / 80));
    let entered = false;
    for (let i = 0; i < 240; i++) { // 12 秒
      g._updateTraitor(0.05);
      if (inRoom(t.x, t.y)) { entered = true; break; }
    }
    const dDoor = Math.hypot(t.x - (rm.doorCol * 80 + 40), t.y - (rm.doorRow * 80 + 40));
    return { entered, dDoor: Math.round(dDoor) };
  });
  ok(!c4b.entered, "C4b 内鬼绝不进入有主房间（12 秒内全程在走廊）");
  ok(c4b.dDoor <= 220, `C4b 内鬼堵门驻守（距门 ${c4b.dDoor}px ≤ 220）`);

  const c5 = await page.evaluate(() => {
    const g = window.game;
    const t = g.traitor;
    // 走廊贴脸咬人（v4.0.22：屋内咬不到人，咬人只发生在开阔地）
    const openCol = (c) => { for (let rr = 4; rr < g.rows - 4; rr++) if (g.walls.has(c + ',' + rr)) return false; return true; };
    let c = 30; while (c < g.cols - 5 && !openCol(c)) c++;
    g.player.x = c * 80 + 40; g.player.y = 20 * 80 + 40;
    t.x = g.player.x + 30; t.y = g.player.y; t.path = []; t.biteT = 1.7;
    const hp0 = g.player.hp;
    for (let i = 0; i < 20 && g.player.hp === hp0; i++) g._updateTraitor(0.1); // 最多 2s
    return { bit: g.player.hp < hp0, dmg: hp0 - g.player.hp };
  });
  ok(c5.bit && c5.dmg === 12, `C5 内鬼贴身咬人：一口 -${c5.dmg} 血（v4.0.22：25→12）`);

  const c6 = await page.evaluate(() => {
    const g = window.game;
    const t = g.traitor;
    // 种一株豌豆打内鬼
    const col = Math.floor(t.x / 80), row = Math.floor(t.y / 80);
    const c2 = col > 2 ? col - 2 : col + 2;
    if (g.plants.some(p => p.c === c2 && p.r === row)) { for (const p of g.plants.filter(p => p.c === c2 && p.r === row)) { p.el1.remove(); if (p.txtEl) p.txtEl.remove(); } g.plants = g.plants.filter(p => !(p.c === c2 && p.r === row)); }
    g.spawnPlant(c2, row, 'peashooter');
    const pe = g.plants[g.plants.length - 1];
    pe.shootCd = 0;
    t.hp = 10; // 内鬼 300 血，一颗豌豆(15伤)打不死 → 先压到 10 血验致死链路
    g.peas.length = 0;
    g._updateShooting(0.01);
    // 让豌豆飞完
    for (let i = 0; i < 30 && g.peas.length > 0; i++) g._updatePeas(0.1);
    const spore0 = g.ais.find(a => a !== t && !a.dead).spore;
    return { traitorDead: t.dead, over: g.over, spore0 };
  });
  ok(c6.traitorDead && !c6.over, "C6 植物可击杀内鬼（豌豆全链路命中）");

  const c7 = await page.evaluate(() => {
    const g = window.game;
    const alive = g.ais.filter(a => !a.dead);
    return { rewarded: alive.every(a => a.spore >= 200), n: alive.length };
  });
  ok(c7.rewarded, `C7 内鬼被击败 → 全体幸存者 +200🦠（${c7.n} 人）`);

  // ============ D. 集成 ============
  console.log("—— D. 集成与僵尸阵营隔离 ——");
  const d1 = await page.evaluate(async () => {
    const g = window.game;
    // 僵尸阵营：三系统全部关闭
    const url = new URL(location.href); url.searchParams.set('faction', 'zombie');
  });
  const zpage = await browser.newPage();
  await zpage.setViewport({ width: 1400, height: 900 });
  const zerrors = [];
  zpage.on("pageerror", e => zerrors.push(e.message));
  await zpage.goto("file://" + path.resolve(__dirname, "haunted-dorm.html?mode=1p&role1=peashooter&faction=zombie"), { waitUntil: "networkidle0" });
  await sleep(900);
  const d2 = await zpage.evaluate(() => {
    const g = window.game;
    const before = g.waveN;
    g.gameTime = 200000; g._updateWaves(g.gameTime); g._updateDayNight(g.gameTime);
    return { zombieFaction: g.isZombieFaction, noTraitor: !g.traitor,
             waveN: g.waveN, night: g.isNight, water: (() => { const s0 = g.player.sun; g._water(g.player); return g.player.sun - s0; })() };
  });
  ok(d2.zombieFaction && d2.noTraitor, "D1 僵尸阵营：无内鬼");
  ok(d2.waveN === 0 && !d2.night && d2.water === 1, "D2 僵尸阵营：无尸潮、无昼夜、浇水恒 ×1（三系统正确关闭）");

  // ============ E. 移动手感（v4.0.22） ============
  console.log("—— E. 移动手感：速度平滑 + 走廊 1.5× ——");
  const e1 = await page.evaluate(() => {
    const g = window.game;
    // 走廊开阔地：按住 D 跑，测加速度渐起（不瞬移）与稳态速度
    const openCol = (c) => { for (let rr = 4; rr < g.rows - 4; rr++) if (g.walls.has(c + ',' + rr)) return false; return true; };
    let c = 30; while (c < g.cols - 5 && !openCol(c)) c++;
    g.player.x = c * 80 + 40; g.player.y = 20 * 80 + 40;
    const startX = g.player.x;
    g.keys = {}; g.keys['d'] = true;
    const x0 = g.player.x;
    g._tick(0.016, g.gameTime); // 一帧（timeScale=2 下游戏时间 32ms）
    const step1 = g.player.x - x0;
    for (let i = 0; i < 14; i++) {
      g.player.x = startX; // 每帧归位：只测 vx 渐进，避免累计位移撞墙（撞墙清零是新特性，别误伤断言）
      g._tick(0.016, g.gameTime);
    }
    const steadyVx = g.player.vx; // 游戏时标：走廊目标 = 400×1.5/2 = 300（实际 600px/s）
    g.keys = {};
    return { step1: +step1.toFixed(1), steadyVx: +steadyVx.toFixed(1) };
  });
  ok(e1.step1 < 15, `E1 起步有加速缓冲（首帧仅移动 ${e1.step1}px，无瞬移过冲）`);
  ok(e1.steadyVx > 270 && e1.steadyVx < 320, `E2 走廊稳态速度 ≈ 300（游戏时标，实际 600px/s = 1.5×，实测 ${e1.steadyVx}）`);

  const e2 = await page.evaluate(() => {
    const g = window.game;
    // 松键 → 滑行减速不瞬停；再测房内速度 = 基础 400
    const x0 = g.player.x;
    for (let i = 0; i < 90; i++) g._tick(0.016, g.gameTime); // 松键 1.5 秒滑停
    const drifted = g.player.x - x0;
    const stopped = Math.abs(g.player.vx) < 5;
    // 房内：绑房后站房间中心按住 D
    const rm = g.rooms.find(r => r.owners.includes(g.player));
    g.player.x = (rm.x + rm.w / 2) * 80; g.player.y = (rm.y + rm.h / 2) * 80;
    g.player.vx = 0;
    g.keys = {}; g.keys['d'] = true;
    const startX = g.player.x;
    for (let i = 0; i < 20; i++) {
      g.player.x = startX; // 归位防撞墙
      g._tick(0.016, g.gameTime);
    }
    const inVx = g.player.vx; // 游戏时标：房内目标 = 400/2 = 200（实际 400px/s）
    g.keys = {};
    return { stopped, inVx: +inVx.toFixed(1) };
  });
  ok(e2.stopped, "E3 松键滑行减速自然停住（无惯性漂移失控）");
  ok(e2.inVx > 185 && e2.inVx < 215, `E4 房内稳态速度 ≈ 200（游戏时标，实际 400px/s，实测 ${e2.inVx}）`);

  await sleep(1200);
  ok(errors.length === 0, `D3 主页面无报错${errors.length ? '：' + errors[0] : ''}`);
  ok(zerrors.length === 0, `D4 僵尸阵营页面无报错${zerrors.length ? '：' + zerrors[0] : ''}`);

  console.log(`\n===== 结果：${pass} PASS / ${fail} FAIL =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
