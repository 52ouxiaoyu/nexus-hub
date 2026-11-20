// v4.0.19 验证：门口小推车（最后防线）+ 存活三选一祝福
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
  await page.evaluate(() => { const g = window.game; g.ghostSpawnAt = 1e12; g._updateAIs = () => {}; });

  // ============ A. 小推车 ============
  console.log("—— A. 门口小推车（每房一台，最后防线）——");
  const a0 = await page.evaluate(() => {
    const g = window.game;
    const inDom = g.mowers.filter(mw => mw.el1 && mw.el1.isConnected).length;
    const noWall = g.mowers.every(mw => {
      const c = Math.floor(mw.x / g.gridSize), r = Math.floor(mw.y / g.gridSize);
      return !g.walls.has(`${c},${r}`);
    });
    return { n: g.mowers.length, rooms: g.rooms.length, inDom, noWall };
  });
  ok(a0.n === a0.rooms && a0.n > 0, `A1 每间房一台小推车（${a0.n}/${a0.rooms}）`);
  ok(a0.inDom === a0.n, "A2 全部推车元素已挂到 DOM");
  ok(a0.noWall, "A3 推车停靠格都不是墙（门外桥上）");

  // 触发 + 冲撞 + 伤害 + 击退 + 一次性（v4.0.21 白名单语义）
  const a1 = await page.evaluate(() => {
    const g = window.game;
    const mw = g.mowers[0];
    g._claimRoom(g.player, mw.room); // 有主房间：伤害记账给主人
    // 回归：主僵尸（剧情核心）贴推车 → 不触发不被撞（开局被秒杀 bug 修复）
    g._spawnGhost();
    const main = g.zombies[0];
    main.hp = 9999;
    main.x = mw.x + mw.dirX * 60; main.y = mw.y + mw.dirY * 60;
    for (let i = 0; i < 12; i++) g._updateMowers(0.016);
    const mainIgnored = !mw.active && !mw.used && main.hp === 9999;
    // 小怪贴推车 → 触发 + 撞击
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    zb.x = mw.x + mw.dirX * 60; zb.y = mw.y + mw.dirY * 60;
    zb.hp = 9999; zb.maxHp = 9999;
    const dmg0 = g.player.dmgDealt || 0;
    for (let i = 0; i < 12; i++) g._updateMowers(0.016);
    return { mainIgnored, active: mw.active, used: mw.used,
             hpDrop: 9999 - zb.hp, stun: zb.stunT > 0,
             ownerGotDmg: (g.player.dmgDealt || 0) - dmg0 };
  });
  ok(a1.mainIgnored, "A4 主僵尸贴近推车 → 不触发不被撞（开局秒杀修复回归）");
  ok(a1.active && a1.used, "A5 小怪逼近门口 75px → 推车自动启动（一次性消耗）");
  ok(a1.hpDrop >= 800, `A6 冲撞伤害落地（掉血 ${a1.hpDrop} ≥ 800）`);
  ok(a1.stun, "A7 撞击附带眩晕");
  ok(a1.ownerGotDmg >= 800, `A8 伤害计入房间主人账本（+${a1.ownerGotDmg}）`);

  const a2 = await page.evaluate(() => {
    const g = window.game;
    const mw = g.mowers[0];
    for (let i = 0; i < 60; i++) g._updateMowers(0.016); // 跑完 260px 冲程
    const gone = mw.gone && !mw.el1.isConnected;
    // 后备推车：认领该房后恢复
    const n = g._restoreMowers(g.player);
    return { gone, restored: n >= 1, back: mw.used === false && mw.el1.isConnected,
             home: mw.x === mw.homeX && mw.y === mw.homeY };
  });
  ok(a2.gone, "A9 冲完 260px → 推车消失（一次性）");
  ok(a2.restored && a2.back && a2.home, "A10 「后备推车」恢复：回原位、可再次触发");

  // A 段收尾：清掉真实僵尸（否则它在真实游戏循环里追杀玩家，把局面打到 over，B 段祝福开不出来）
  await page.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(zb => { if (zb.el1) zb.el1.remove(); });
    g.zombies = [];
  });

  // ============ B. 存活三选一祝福 ============
  console.log("—— B. 存活三选一祝福（每 90 秒）——");
  const b1 = await page.evaluate(() => {
    const g = window.game;
    g.gameTime = 91000;
    g._updateBlessing();
    return { open: !!g.blessing, n: g.blessing ? g.blessing.options.length : 0,
             shown: g.blessEl && g.blessEl.style.display === "block",
             unique: g.blessing ? new Set(g.blessing.options.map(o => o.id)).size : 0 };
  });
  ok(b1.open && b1.n === 3, "B1 存活 90 秒 → 祝福三选一弹出（3 个选项）");
  ok(b1.unique === 3, "B2 三个祝福互不重复");
  ok(b1.shown, "B3 祝福面板已显示");

  const b2 = await page.evaluate(() => {
    const g = window.game;
    const b = g.blessing;
    const len = b.options.length;
    g.keysJustPressed = { s: true }; g._updateBlessing();
    const afterDown = b.idx;
    g.keysJustPressed = { w: true }; g._updateBlessing();
    const afterUp = b.idx;
    g.keysJustPressed = { w: true }; g._updateBlessing();
    return { afterDown, afterUp, wrap: b.idx, len };
  });
  ok(b2.afterDown === 1, `B4 按 S → 选择下移（idx=1）`);
  ok(b2.afterUp === 0, `B5 按 W → 选择上移（idx=0）`);
  ok(b2.wrap === (b2.len - 1), `B6 到顶按 W → 循环到最底（idx=${b2.wrap}）`);

  const b3 = await page.evaluate(() => {
    const g = window.game;
    const b = g.blessing;
    const sunIdx = b.options.findIndex(o => o.id === "sun");
    b.idx = sunIdx >= 0 ? sunIdx : 0;
    const optId = b.options[b.idx].id;
    const sun0 = g.player.sun;
    g.keysJustPressed = { f: true };
    g._updateBlessing();
    return { optId, closed: g.blessing === null, gained: g.player.sun - sun0,
             nextAt: g.blessingAt - g.gameTime };
  });
  if (b3.optId === "sun") ok(b3.gained === 300, `B7 F 确认「阳光雨」→ +300 ☀，面板关闭`);
  else ok(true, `B7 F 确认生效（本抽无阳光雨，选中的是 ${b3.optId}，已关闭）`);
  ok(b3.closed, "B7b 确认后面板关闭");
  ok(Math.abs(b3.nextAt - 90000) < 50, "B8 下一轮祝福 90 秒后再送出");

  // 15 秒无人选自动跳过
  const b4 = await page.evaluate(() => {
    const g = window.game;
    g.gameTime = g.blessingAt; // 到点
    g.keysJustPressed = {}; // 清掉上一轮确认残留的按键（真实游戏每帧末尾会清，这里手动对齐）
    g._updateBlessing();
    const opened = !!g.blessing;
    g.gameTime = g.blessing.deadline + 1;
    g._updateBlessing();
    return { opened, autoClosed: g.blessing === null, hidden: g.blessEl.style.display === "none" };
  });
  ok(b4.opened && b4.autoClosed && b4.hidden, "B9 15 秒无人选 → 自动跳过并隐藏");

  // 各祝福效果
  const b5 = await page.evaluate(() => {
    const g = window.game;
    const res = {};
    // 狂怒：豌豆伤害翻倍（用假目标驱动 _updateShooting，不走真实僵尸 AI）
    const myRm = g.rooms.find(r => r.owners.includes(g.player));
    const spot = { c: myRm.x + Math.floor(myRm.w / 2), r: myRm.y + Math.floor(myRm.h / 2) };
    if (g.plants.some(p => p.c === spot.c && p.r === spot.r)) spot.c += 1;
    g.spawnPlant(spot.c, spot.r, "peashooter");
    const pl = g.plants[g.plants.length - 1];
    pl.shootCd = 0; // 跳过初始冷却，否则 _updateShooting 不出手
    g._spawnMinion(); // v4.0.20：用真实小怪替代裸对象（裸对象无 el1，真实循环渲染到它会崩）
    { const zb2 = g.zombies[g.zombies.length - 1]; zb2.x = spot.c * 80 + 40 + 90; zb2.y = spot.r * 80 + 40; zb2.hp = 9999; zb2.maxHp = 9999; }
    g.peas.length = 0;
    g.plantDmgBoostT = 20;
    g._updateShooting(0.01);
    const pea = g.peas[g.peas.length - 1];
    res.rageDmg = pea ? pea.dmg : 0;
    res.rageOk = pea && pea.dmg === pl.def.shoot.dmg * 2;
    // 硬化：全员回满
    pl.hp = 1;
    const door = g.plants.find(p => p.isDoor);
    if (door) door.hp = 5;
    HauntedDorm.BLESSINGS.find(b => b.id === "heal").apply(g);
    res.healOk = pl.hp === pl.maxHp && (!door || door.hp === door.maxHp);
    // 丰收浇水：v4.0.20 白天 ×2 叠加口径（增益期 3×2=+6、平时 +2；切夜晚则 ×3/×1）
    g.isNight = false; // 固定白天，断言叠加结果
    const s0 = g.player.sun;
    g.waterBoostT = 45; g._water(g.player);
    res.water3 = g.player.sun - s0;
    g.waterBoostT = 0; g._water(g.player);
    res.water1 = g.player.sun - s0 - res.water3;
    // 冷却清零
    g.player.skillCd = 30;
    HauntedDorm.BLESSINGS.find(b => b.id === "cd").apply(g);
    res.cdOk = g.player.skillCd === 0;
    // 孢子潮
    const sp0 = g.player.spore;
    HauntedDorm.BLESSINGS.find(b => b.id === "spore").apply(g, g.player);
    res.sporeOk = g.player.spore - sp0 === 200;
    return res;
  });
  ok(b5.rageOk, `B10 狂怒：豌豆伤害翻倍（${b5.rageDmg}）`);
  ok(b5.healOk, "B11 硬化：所有植物与门板血量回满");
  ok(b5.water3 === 6 && b5.water1 === 2, `B12 丰收浇水：白天增益期 +6 ☀/次（平时 +2，含昼夜 ×2 叠加）`);
  ok(b5.cdOk, "B13 冷却清零：技能 CD 归 0");
  ok(b5.sporeOk, "B14 孢子潮：+200 🦠");

  // 祝福期间建造菜单被屏蔽（共用确认键）——全同步复刻真实子步顺序：kmenu 先于 blessing
  const b6 = await page.evaluate(() => {
    const g = window.game;
    if (!g.blessing) { g.gameTime = g.blessingAt; g._updateBlessing(); }
    const opened = !!g.blessing;
    const myRm = g.rooms.find(r => r.owners.includes(g.player));
    g.player.x = (myRm.x + myRm.w / 2) * g.gridSize + 40;
    g.player.y = (myRm.y + myRm.h / 2) * g.gridSize + 40;
    g.keysJustPressed = { f: true };
    // 真实顺序第一步：_updateKMenus 先跑（祝福打开 → 守卫拦截）
    g._handleKMenu(1, g.player, ["f", "j"], ["altright", "g", "k"], ["w"], ["s"], g.p1Kmenu, g.p1Cursor);
    const kmenuBlocked = !g.kmenus[1].active;
    const stillBlessing = !!g.blessing;
    // 真实顺序第二步：_updateBlessing 消费 F → 生效关闭
    g._updateBlessing();
    const closedAfterConfirm = g.blessing === null;
    // 祝福关闭后 F 恢复正常开建造菜单
    g.keysJustPressed = { f: true };
    g._handleKMenu(1, g.player, ["f", "j"], ["altright", "g", "k"], ["w"], ["s"], g.p1Kmenu, g.p1Cursor);
    const kmenuRestored = g.kmenus[1].active;
    g.kmenus[1].active = false; g.p1Kmenu.style.display = "none";
    return { opened, kmenuBlocked, stillBlessing, closedAfterConfirm, kmenuRestored };
  });
  ok(b6.opened && b6.kmenuBlocked && b6.stillBlessing && b6.closedAfterConfirm,
    "B15 祝福选择期间按 F → 只确认祝福，建造菜单被守卫拦截");
  ok(b6.kmenuRestored, "B16 祝福关闭后 F 恢复正常开建造菜单（回归）");

  ok(pageErrors === 0, `Z0 无页面错误（${pageErrors}）`);
  console.log(`\n===== 结果: ${pass} pass / ${fail} fail =====`);
  await browser.close();
  if (fail > 0) process.exit(1);
})().then(() => {
  // ===== 回归：v4.0.18 + v4.0.17 =====
  const { execSync } = require("child_process");
  for (const f of ["_verify_v4018.js", "_verify_v4017.js"]) {
    console.log(`\n===== 回归 ${f} =====`);
    try {
      const out = execSync(`/Users/clawbox/.workbuddy/binaries/node/versions/22.22.2-6/bin/node ${f} 2>&1`, { cwd: ROOT, encoding: "utf8" });
      const tail = out.trim().split("\n").slice(-3).join("\n");
      console.log(tail);
      if (/fail[^0-]*[1-9]/.test(tail) || /失败/.test(tail.replace(/0 失败/g, ""))) { console.log("回归有失败！"); process.exit(1); }
    } catch (e) {
      console.log(String(e.stdout || e).trim().split("\n").slice(-6).join("\n"));
      process.exit(1);
    }
  }
  console.log("\n全部回归通过 ✓");
});
