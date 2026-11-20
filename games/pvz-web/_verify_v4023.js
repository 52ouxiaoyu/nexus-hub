// v4.0.23 验证：房间归属误判修复 + P1 倒下不直接结算 + MVP 伤害归属（按种植者记账）
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
  await page.goto("file://" + path.resolve(__dirname, "haunted-dorm.html?mode=2p&role1=peashooter&role2=sunshroom"), { waitUntil: "networkidle0" });
  await sleep(900);

  // 冻结真实循环；保留 _updateAIs 原函数供测试手动驱动
  await page.evaluate(() => {
    const g = window.game;
    window.__uAI = g._updateAIs.bind(g);
    g._updateAIs = () => {};
    g.airDropAt = 1e12;
    g.blessingAt = 1e12;
    g.loop = () => {}; // 彻底冻结真实循环
    // 推车会撞死测试用小怪，全程禁用
    g.mowers.forEach(m => { m.gone = true; if (m.el1) m.el1.remove(); });
    g.mowers = [];
  });

  // ============ A. 房间归属（「别人的地盘」误判） ============
  console.log("—— A. 房间归属：玩家先进房，AI 不得抢注 ——");
  const a1 = await page.evaluate(() => {
    const g = window.game;
    // 找一间无主房，把 P1 传进去（站在可行走格中心）
    const rm = g.rooms.find(r => r.owners.length === 0);
    let cell = null;
    for (let r = 0; r < rm.h && !cell; r++)
      for (let c = 0; c < rm.w && !cell; c++)
        if (rm.tpl.grid[r][c] === 1) cell = { c, r };
    g.player.x = (rm.x + cell.c) * 80 + 40;
    g.player.y = (rm.y + cell.r) * 80 + 40;
    g.player.vx = 0; g.player.vy = 0;
    window.__testRm = rm;
    return { inside: g._insideRoom(Math.floor(g.player.x / 80), Math.floor(g.player.y / 80)) === rm, owners: rm.owners.length };
  });
  ok(a1.inside && a1.owners === 0, "A1 P1 物理进入无主房间（尚未建造认领）");

  const a2 = await page.evaluate(() => {
    const g = window.game;
    const rm = window.__testRm;
    // 非逃跑 AI 目标 = P1 所在房间，且已站在床位 → 动态查房应立即改目标，绝不抢注
    const ai = g.ais[0];
    ai.speed = 200; ai.dead = false; ai.stunT = 0;
    ai.targetRoom = rm;
    const bed = rm.tpl.beds[0];
    const bx = (rm.x + bed.c) * 80 + 40, by = (rm.y + bed.r) * 80 + 40;
    ai.x = bx; ai.y = by; ai.path = [{ x: bx, y: by }];
    let t = 2000;
    for (let i = 0; i < 5; i++) { g._tick(0.016, t); t += 16; }
    return { claimed: rm.owners.includes(ai), owners: rm.owners.length, retarget: ai.targetRoom !== rm };
  });
  ok(!a2.claimed && a2.owners === 0 && a2.retarget, "A2 AI 到达床位 → 检测到玩家在内 → 换房，房间仍无主（v4.0.23 修复点）");

  const a3 = await page.evaluate(() => {
    const g = window.game;
    const rm = window.__testRm;
    // 逃跑 AI 避难：只设 ai.room 不进 owners（临时避难不算归属，不会堵死玩家建造）
    const ai = g.ais[1];
    ai.speed = 300; ai.dead = false; ai.stunT = 0;
    ai.targetRoom = rm;
    const bed = rm.tpl.beds[0];
    const bx = (rm.x + bed.c) * 80 + 40, by = (rm.y + bed.r) * 80 + 40;
    ai.x = bx; ai.y = by; ai.path = [{ x: bx, y: by }];
    let t = 3000;
    for (let i = 0; i < 5; i++) { g._tick(0.016, t); t += 16; }
    return { inOwners: rm.owners.includes(ai), owners: rm.owners.length, shelter: ai.room === rm };
  });
  ok(!a3.inOwners && a3.owners === 0 && a3.shelter, "A3 逃跑 AI 避难不进 owners——玩家仍可建造");

  const a4 = await page.evaluate(() => {
    const g = window.game;
    const rm = window.__testRm;
    const okClaim = g._claimRoom(g.player, rm); // 玩家先进 → 认领必须成功
    return { okClaim, owners: rm.owners.length, isPlayerRoom: g.player.room === rm };
  });
  ok(a4.okClaim && a4.owners === 1 && a4.isPlayerRoom, "A4 P1 认领成功——「别人的地盘！」不再误报");

  const a5 = await page.evaluate(() => {
    const g = window.game;
    // 反向：AI 正常认领空房（玩家不在场），玩家再想认领 → 拒绝
    const rm2 = g.rooms.find(r => r.owners.length === 0);
    const ai = g.ais[2];
    ai.speed = 200; ai.dead = false; ai.stunT = 0;
    ai.targetRoom = rm2;
    const bed = rm2.tpl.beds[0];
    const bx = (rm2.x + bed.c) * 80 + 40, by = (rm2.y + bed.r) * 80 + 40;
    ai.x = bx; ai.y = by; ai.path = [{ x: bx, y: by }];
    let t = 4000;
    for (let i = 0; i < 5; i++) { g._tick(0.016, t); t += 16; }
    const aiClaimed = rm2.owners.includes(ai);
    const playerBlocked = !g._claimRoom(g.player, rm2);
    return { aiClaimed, playerBlocked };
  });
  ok(a5.aiClaimed && a5.playerBlocked, "A5 回归：AI 认领无人房仍正常，玩家此时建造被拦（真的别人的地盘）");

  // ============ B. MVP 伤害归属（按种植者记账） ============
  console.log("—— B. MVP 伤害归属 ——");
  const b1 = await page.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(z => { if (z.el1) z.el1.remove(); });
    g.zombies = [];
    g._spawnMinion();
    const zb = g.zombies[0];
    zb.x = g.player2.x + 150; zb.y = g.player2.y; // 放在 P2 旁边
    g.peas = [];
    g._firePea(zb.x - 140, zb.y, 0, 120, { img: "Plants/PeaShooter/PeaShooter.gif", range: 300, speed: 1000, owner: g.player2 });
    for (let i = 0; i < 6; i++) g._updatePeas(0.05);
    return { p2: g.player2.dmgDealt || 0, p1: g.player.dmgDealt || 0, zbHp: zb.hp };
  });
  ok(b1.p2 === 120 && b1.p1 === 0, `B1 豌豆 owner=P2 → 伤害记 P2 名下（P1 不再白拿）p2=${b1.p2} p1=${b1.p1}`);
  ok(b1.zbHp > 0, "B1b 小怪存活（不受死亡演出干扰）");

  const b2 = await page.evaluate(() => {
    const g = window.game;
    // 无主植物（owner=null，比如系统生成）——不记账不崩溃，绝不兜底给 P1
    g.plants.push({ c: 1, r: 1, def: { spike: { r: 100, dps: 50 } } }); // 走廊格（无房间 → 无 owner）
    const zb = g.zombies[0];
    zb.x = 80 + 40; zb.y = 80 + 40; // 与假地刺重叠
    const p1Before = g.player.dmgDealt || 0;
    g._updateSpike(0.016);
    g.plants.pop();
    return { p1Before, p1After: g.player.dmgDealt || 0, applied: zb.hp < zb.maxHp, zbHp: zb.hp };
  });
  ok((b2.p1After === 0 && b2.p1Before === 0 && b2.applied), `B2 无主植物伤害照打但不记账（P1 兜底已移除）${JSON.stringify(b2)}`);

  // ============ C. P1 倒下不直接结算 ============
  console.log("—— C. P1 倒下，P2 接着打 ——");
  const c1 = await page.evaluate(() => {
    const g = window.game;
    g.player.hp = 0;
    g._checkP1Down();
    return { dead: g.player.dead, over: g.over, allDead: g.allPlayers.every(q => q.dead) };
  });
  ok(c1.dead && !c1.over && !c1.allDead, "C1 P1 倒下 → dead=true，游戏【不】结束（P2 还活着）");

  const c2 = await page.evaluate(() => {
    const g = window.game;
    // 尸体不接受移动输入
    g.zombies.forEach(z => { if (z.el1) z.el1.remove(); });
    g.zombies = [];
    const x0 = g.player.x, y0 = g.player.y;
    g.keys["a"] = true; g.keys["w"] = true;
    let t = 1000;
    for (let i = 0; i < 10; i++) { g._tick(0.016, t); t += 16; }
    g.keys["a"] = false; g.keys["w"] = false;
    return { moved: Math.hypot(g.player.x - x0, g.player.y - y0) > 0.5 };
  });
  ok(!c2.moved, "C2 P1 倒下后按方向键不再移动");

  const c3 = await page.evaluate(() => {
    const g = window.game;
    let err = null;
    try { g._updateKMenus(); g.openPlantMenu(400, 300); } catch (e) { err = e.message; }
    return { err, menuOpen: g.menuOpen === true };
  });
  ok(!c3.err && !c3.menuOpen, "C3 P1 倒下后建造菜单打不开、不报错");

  const c4 = await page.evaluate(() => {
    const g = window.game;
    // 镜头完全跟随 P2
    g.player2.x = 2000; g.player2.y = 1500;
    g._render();
    const tf = g.world1.style.transform;
    const vpw = g.vp1.clientWidth, vph = g.vp1.clientHeight;
    const expX = Math.max(0, Math.min(g.worldWidth - vpw, 2000 - vpw / 2));
    const expY = Math.max(0, Math.min(g.worldHeight - vph, 1500 - vph / 2));
    const m = tf.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
    return { tf, dx: m ? Math.abs(parseFloat(m[1]) + expX) : 1e9, dy: m ? Math.abs(parseFloat(m[2]) + expY) : 1e9 };
  });
  ok(c4.dx < 2 && c4.dy < 2, `C4 P1 倒下后镜头跟随 P2（偏差 ${c4.dx.toFixed(1)},${c4.dy.toFixed(1)}px）`);

  // ============ D. P2 也倒下 → 才结算 ============
  console.log("—— D. 全员阵亡才结算 ——");
  const d1 = await page.evaluate(() => {
    const g = window.game;
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    zb.lockedTarget = g.player2;
    let t = 5000;
    for (let i = 0; i < 500 && !g.over; i++) {
      zb.x = g.player2.x + 40; zb.y = g.player2.y; zb.lockedTarget = g.player2; // 每帧贴脸，排除 AI 走位干扰
      g._tick(0.05, t); t += 50;
    }
    return { p2Dead: g.player2.dead, over: g.over, overlayShown: document.getElementById("dorm-over").style.display === "flex",
             diag: { hp: g.player2.hp, zbAlive: g.zombies.some(z => !z.dead) } };
  });
  ok(d1.p2Dead, `D1 P2 被咬倒下 ${JSON.stringify(d1.diag)}`);
  ok(d1.over && d1.overlayShown, "D2 全员阵亡 → 游戏结束，结算面板弹出");

  // ============ E. 单人模式：P1 倒下仍直接结算 ============
  console.log("—— E. 单人模式回归 ——");
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1400, height: 900 });
  page2.on("pageerror", e => errors.push("1p: " + e.message));
  await page2.goto("file://" + path.resolve(__dirname, "haunted-dorm.html?mode=1p&role1=peashooter"), { waitUntil: "networkidle0" });
  await sleep(800);
  const e1 = await page2.evaluate(() => {
    const g = window.game;
    g.loop = () => {};
    g.player.hp = 0;
    let err = null;
    try { g._checkP1Down(); } catch (e) { err = e.message; }
    return { dead: g.player.dead, over: g.over, err, nPlayers: g.allPlayers.length };
  });
  ok(e1.dead && e1.over, `E1 单人模式 P1 倒下 → 立即结算（行为不变）${e1.err ? " err=" + e1.err : ""} ${JSON.stringify(e1)}`);

  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`);
  if (errors.length) console.log("页面错误:", errors.slice(0, 5));
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})();
