// v4.0.18 验证：小地图透明 / 菜单贴边上调 / 菜单循环翻页 / 盲盒 100 孢子 / 支持拥有两间房
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
const ROOT = "/Users/clawbox/nexus-hub/pvz-web";
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  let pageErrors = 0;
  page.on("pageerror", e => { pageErrors++; console.log("PAGEERROR:", e.message); });

  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=1p&role1=peashooter"), { waitUntil: "networkidle0" });
  await sleep(800);

  // 冻结动态因素：僵尸出笼 / AI 行动
  await page.evaluate(() => {
    const g = window.game;
    g.ghostSpawnAt = 1e12;
    g._updateAIs = () => {};
  });

  // ============ A. 小地图透明 ============
  console.log("—— A. 小地图半透明（悬停恢复）——");
  const a = await page.evaluate(() => {
    const el = document.getElementById("minimap");
    const op = getComputedStyle(el).opacity;
    let hoverRule = false;
    for (const sheet of document.styleSheets) {
      try {
        for (const r of sheet.cssRules) {
          if (r.selectorText && r.selectorText.includes("#minimap:hover")) hoverRule = true;
        }
      } catch (e) {}
    }
    return { op, hoverRule, pe: getComputedStyle(el).pointerEvents };
  });
  ok(parseFloat(a.op) < 0.6, `A1 小地图默认半透明（opacity=${a.op} < 0.6）`);
  ok(a.hoverRule, "A2 悬停恢复不透明的 CSS 规则存在（#minimap:hover）");
  ok(a.pe === "auto", "A3 小地图可接收鼠标事件（pointer-events:auto，悬停生效的前提）");

  // ============ B. 盲盒价格 5 → 100 孢子 ============
  console.log("—— B. 盲盒价格 ——");
  const b = await page.evaluate(() => {
    const g = window.game;
    const def = HauntedDorm.DEFS.blindbox;
    return { sporeCost: def.sporeCost, inMenu: HauntedDorm.MENU.includes("blindbox") };
  });
  ok(b.sporeCost === 100, `B1 盲盒孢子价 = ${b.sporeCost}（应为 100）`);
  ok(b.inMenu, "B2 盲盒在建造菜单清单中");

  // ============ C. 菜单循环翻页 ============
  console.log("—— C. 键盘菜单循环翻页（到顶往上→最底 / 到底往下→最顶）——");
  const c = await page.evaluate(() => {
    const g = window.game;
    const menu = g.kmenus[1];
    menu.active = true;
    menu.options = Array.from({ length: 8 }, (_, i) => ({ action: "buy", type: "garlic", text: "选项" + i }));
    const KU = ["w"], KD = ["s"];
    const KO = ["f", "j"], KC = ["altright", "g", "k"];
    const step = () => g._handleKMenu(1, g.player, KO, KC, KU, KD, g.p1Kmenu, g.p1Cursor);
    menu.index = 0;
    g.keysJustPressed = { w: true }; step();          // 到顶再往上
    const upWrap = menu.index;                         // 期望 7
    g.keysJustPressed = { s: true }; step();          // 再往下
    const downBack = menu.index;                       // 期望 0
    menu.index = 7;
    g.keysJustPressed = { s: true }; step();          // 到底再往下
    const downWrap = menu.index;                       // 期望 0
    menu.active = false; g.p1Kmenu.style.display = "none";
    g.keysJustPressed = {};
    return { upWrap, downBack, downWrap, len: menu.options.length };
  });
  ok(c.upWrap === 7, `C1 第 0 条按上 → 循环到最底（index=${c.upWrap}，期望 7）`);
  ok(c.downBack === 0, `C2 最底按下 → 回到最顶（index=${c.downBack}，期望 0）`);
  ok(c.downWrap === 0, `C3 第 7 条按下 → 循环到最顶（index=${c.downWrap}，期望 0）`);

  // ============ D. 支持拥有两间房 ============
  console.log("—— D. 两间房：认领 / 副房建造 / 第三间拦截 / 人机房间拦截 ——");
  const d0 = await page.evaluate(() => {
    const g = window.game;
    // 找三间无主房（不在 AI 手里）
    const free = g.rooms.filter(rm => rm.owners.length === 0 && !g.ais.some(ai => ai.room === rm));
    const rA = free[0], rB = free[1], rC = free[2];
    g._claimRoom(g.player, rA);
    return {
      nFree: free.length,
      roomIsA: g.player.room === rA,
      aOwners: rA.owners.includes(g.player),
      rA: g.rooms.indexOf(rA), rB: g.rooms.indexOf(rB), rC: g.rooms.indexOf(rC),
    };
  });
  ok(d0.nFree >= 3, `D0 至少三间无主房可用（实际 ${d0.nFree}）`);
  ok(d0.roomIsA && d0.aOwners, "D1 认领主房：p.room 绑定 + owners 落账");

  // D2 键盘全链路：走进第二间空房按 F 建造 → 自动认领副房
  const d2p = await page.evaluate((rBIdx) => {
    const g = window.game;
    const rB = g.rooms[rBIdx];
    g.player.sun = 99999; g.player.spore = 99999;
    // 找 rB 内一个无墙无植物的地形格
    let spot = null;
    for (let rr = rB.y; rr < rB.y + rB.h && !spot; rr++)
      for (let cc = rB.x; cc < rB.x + rB.w && !spot; cc++)
        if (rB.tpl.grid[rr - rB.y][cc - rB.x] === 1 && !g.walls.has(`${cc},${rr}`) &&
            !g.plants.some(pl => pl.c === cc && pl.r === rr)) spot = { c: cc, r: rr };
    g.player.x = spot.c * g.gridSize + 40;
    g.player.y = spot.r * g.gridSize + 40;
    g.keys = {}; g.keysJustPressed = {};
    return { spot };
  }, d0.rB);
  await sleep(350);
  await page.keyboard.press("f");
  await sleep(250);
  const d2 = await page.evaluate((rBIdx) => {
    const g = window.game;
    const rB = g.rooms[rBIdx];
    const menuOn = g.kmenus[1].active;
    if (!menuOn) return { menuOn };
    // 直接执行购买（大蒜 ☀100）——走真实 _execKMenu 认领链路
    const opt = g.kmenus[1].options.find(o => o.action === "buy" && o.type === "garlic");
    g._execKMenu(g.player, g.kmenus[1], opt);
    g.kmenus[1].active = false; g.p1Kmenu.style.display = "none";
    return {
      menuOn,
      room2IsB: g.player.room2 === rB,
      bOwners: rB.owners.includes(g.player),
      doorNut: g.plants.some(pl => pl.c === rB.doorCol && pl.r === rB.doorRow),
      sun: g.player.sun,
    };
  }, d0.rB);
  ok(d2.menuOn, "D2 在第二间空房按 F → 菜单正常打开（旧版此处报「你已经有房间了！」）");
  ok(d2.room2IsB && d2.bOwners, "D2b 副房认领：p.room2 === rB 且 owners 落账");
  ok(d2.doorNut, "D2c 首个占领副房 → 门口自动补坚果门板");
  ok(d2.sun === 99999 - 100, `D2d 购买扣费正确（大蒜☀100，余额 ${d2.sun}）`);

  // D3 第三间房拦截
  const d3 = await page.evaluate((rCIdx) => {
    const g = window.game;
    const rC = g.rooms[rCIdx];
    let spot = null;
    for (let rr = rC.y; rr < rC.y + rC.h && !spot; rr++)
      for (let cc = rC.x; cc < rC.x + rC.w && !spot; cc++)
        if (rC.tpl.grid[rr - rC.y][cc - rC.x] === 1 && !g.walls.has(`${cc},${rr}`)) spot = { c: cc, r: rr };
    g.player.x = spot.c * g.gridSize + 40;
    g.player.y = spot.r * g.gridSize + 40;
    g.keys = {}; g.keysJustPressed = {};
    return {};
  }, d0.rC);
  await sleep(350);
  await page.keyboard.press("f");
  await sleep(250);
  const d3r = await page.evaluate(() => {
    const g = window.game;
    const blocked = !g.kmenus[1].active;
    g.kmenus[1].active = false; g.p1Kmenu.style.display = "none";
    return { blocked };
  });
  ok(d3r.blocked, "D3 已有两间房，第三间按 F → 菜单不打开（拦截）");

  // D4 人机房间拦截（回归）
  const d4 = await page.evaluate(() => {
    const g = window.game;
    const aiRm = g.ais.find(ai => ai.room) && g.ais.find(ai => ai.room).room;
    if (!aiRm) return { hasAiRoom: false };
    let spot = null;
    for (let rr = aiRm.y; rr < aiRm.y + aiRm.h && !spot; rr++)
      for (let cc = aiRm.x; cc < aiRm.x + aiRm.w && !spot; cc++)
        if (aiRm.tpl.grid[rr - aiRm.y][cc - aiRm.x] === 1 && !g.walls.has(`${cc},${rr}`)) spot = { c: cc, r: rr };
    if (!spot) return { hasAiRoom: false };
    g.player.x = spot.c * g.gridSize + 40;
    g.player.y = spot.r * g.gridSize + 40;
    g.keys = {}; g.keysJustPressed = {};
    return { hasAiRoom: true };
  });
  await sleep(350);
  await page.keyboard.press("f");
  await sleep(250);
  const d4r = await page.evaluate(() => {
    const g = window.game;
    const blocked = !g.kmenus[1].active;
    g.kmenus[1].active = false; g.p1Kmenu.style.display = "none";
    return { blocked };
  });
  ok(!d4.hasAiRoom || d4r.blocked, "D4 人机房间按 F → 仍被拦截（回归）");

  // ============ E. 键盘菜单贴底自动上调 ============
  console.log("—— E. 键盘菜单贴屏幕下缘自动上调 ——");
  await page.evaluate(() => {
    const g = window.game;
    g._origResolve = g._resolveBuildRoom;
    g._resolveBuildRoom = () => g.rooms.find(rm => rm.owners.includes(g.player)); // 允许任意位置开菜单
    // 世界最底部的空格（避开边界墙/已有植物）→ 相机钳制 → 人物贴屏幕下缘
    let spot = null;
    for (let r = g.rows - 1; r >= 0 && !spot; r--)
      for (let c = Math.floor(g.cols / 2) - 4; c <= Math.floor(g.cols / 2) + 4 && !spot; c++)
        if (!g.walls.has(`${c},${r}`) && !g.plants.some(pl => pl.c === c && pl.r === r)) spot = { c, r };
    g.player.x = spot.c * g.gridSize + 40;
    g.player.y = spot.r * g.gridSize + 40;
    g.keys = {}; g.keysJustPressed = {};
  });
  await sleep(400); // 等相机收敛到钳制位
  await page.keyboard.press("f");
  await sleep(300); // 等 _render 钳制生效
  const e = await page.evaluate(() => {
    const g = window.game;
    const km = g.p1Kmenu;
    const rect = km.getBoundingClientRect();
    const res = {
      open: g.kmenus[1].active,
      bottom: rect.bottom,
      vh: window.innerHeight,
      topStyle: km.style.top,
      h: km.offsetHeight,
    };
    g.kmenus[1].active = false; km.style.display = "none";
    g._resolveBuildRoom = g._origResolve;
    g.keysJustPressed = {};
    return res;
  });
  ok(e.open, "E1 世界最底部按 F → 菜单打开");
  ok(e.bottom <= e.vh + 2, `E2 菜单底缘 ${Math.round(e.bottom)}px ≤ 视口高 ${e.vh}px（自动上调生效，style.top=${e.topStyle}）`);

  // ============ F. 鼠标菜单贴底自动上调 ============
  console.log("—— F. 鼠标菜单贴屏幕下缘自动上调 ——");
  await page.setViewport({ width: 1400, height: 420 });
  await sleep(200);
  const f0 = await page.evaluate(() => {
    const g = window.game;
    g._resolveBuildRoom = () => g.rooms.find(rm => rm.owners.includes(g.player));
    g.plants.forEach(pl => { if (pl.el1) pl.el1.remove(); if (pl.txtEl) pl.txtEl.remove(); });
    g.plants = []; // 清掉门板坚果等，确保目标格无植物
    // 玩家放回主房中心
    const rm = g.rooms.find(r => r.owners.includes(g.player));
    g.player.x = (rm.x + rm.w / 2) * g.gridSize;
    g.player.y = (rm.y + rm.h / 2) * g.gridSize;
    return { okSpot: true };
  });
  await sleep(400); // 先等相机收敛到玩家新位置，再测屏幕坐标（否则拿到旧相机坐标）
  const f0b = await page.evaluate(() => {
    const g = window.game;
    const rm = g.rooms.find(r => r.owners.includes(g.player));
    // 主房内偏下的空地形格（屏幕上贴近视口下缘）
    let spot = null;
    for (let rr = rm.y + rm.h - 1; rr >= rm.y && !spot; rr--)
      for (let cc = rm.x; cc < rm.x + rm.w && !spot; cc++)
        if (rr > rm.y + rm.h / 2 && rm.tpl.grid[rr - rm.y][cc - rm.x] === 1 && !g.walls.has(`${cc},${rr}`)) spot = { c: cc, r: rr };
    if (!spot) return { okSpot: false };
    // 探针元素拿该格的真实屏幕坐标（免疫 transform-origin 差异）
    const probe = document.createElement("div");
    probe.id = "_probe";
    probe.style.cssText = `position:absolute;left:${spot.c * g.gridSize}px;top:${spot.r * g.gridSize}px;width:${g.gridSize}px;height:${g.gridSize}px;`;
    g.world1.appendChild(probe);
    const pr = probe.getBoundingClientRect();
    const cx = pr.left + 40, cy = pr.top + 40;
    // 同一帧内：打开菜单 + 读取钳制后的位置（相机不会变）
    g.openPlantMenu(cx, cy);
    const pm = document.getElementById("plant-menu");
    const rect = pm.getBoundingClientRect();
    const res = {
      okSpot: true,
      hit: g.menuCol === spot.c && g.menuRow === spot.r,
      visible: getComputedStyle(pm).display !== "none",
      bottom: rect.bottom, vh: window.innerHeight,
      styleTop: pm.style.top,
    };
    g._closePlantMenu();
    probe.remove();
    g._resolveBuildRoom = g._origResolve;
    return res;
  });
  ok(f0b.okSpot, "F1 找到主房内偏下的空地形格");
  if (f0b.okSpot) {
    ok(f0b.hit, "F2 点击坐标 → 世界格往返解析一致（相机数学无损）");
    ok(f0b.visible, "F3 鼠标菜单打开");
    ok(f0b.bottom <= f0b.vh + 2, `F4 菜单底缘 ${Math.round(f0b.bottom)}px ≤ 视口高 ${f0b.vh}px（自动上调生效 top=${f0b.styleTop}）`);
  }
  await page.setViewport({ width: 1400, height: 900 });

  // ============ G. 回归：主房正常建造 ============
  console.log("—— G. 回归：主房建造链路 ——");
  const g1 = await page.evaluate(() => {
    const g = window.game;
    const rm = g.rooms.find(r => r.owners.includes(g.player));
    let spot = null;
    for (let rr = rm.y; rr < rm.y + rm.h && !spot; rr++)
      for (let cc = rm.x; cc < rm.x + rm.w && !spot; cc++)
        if (rm.tpl.grid[rr - rm.y][cc - rm.x] === 1 && !g.walls.has(`${cc},${rr}`) &&
            !g.plants.some(pl => pl.c === cc && pl.r === rr)) spot = { c: cc, r: rr };
    g.player.x = spot.c * g.gridSize + 40;
    g.player.y = spot.r * g.gridSize + 40;
    g.keys = {}; g.keysJustPressed = {};
    return {};
  });
  await sleep(350);
  await page.keyboard.press("f");
  await sleep(250);
  const g2 = await page.evaluate(() => {
    const g = window.game;
    const open = g.kmenus[1].active;
    const opts = open ? g.kmenus[1].options.length : 0;
    // 菜单选项价格文本：盲盒应显示 🦠100
    const bbOpt = open ? g.kmenus[1].options.find(o => o.type === "blindbox") : null;
    g.kmenus[1].active = false; g.p1Kmenu.style.display = "none";
    return { open, opts, bbText: bbOpt ? bbOpt.text : "" };
  });
  ok(g2.open && g2.opts === 8, `G1 主房按 F → 建造菜单正常（${g2.opts} 项）`);
  ok(g2.bbText.includes("🦠100"), `G2 菜单里盲盒显示「${g2.bbText}」`);

  ok(pageErrors === 0, `Z0 无页面错误（${pageErrors}）`);

  console.log(`\n===== 结果: ${pass} pass / ${fail} fail =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
