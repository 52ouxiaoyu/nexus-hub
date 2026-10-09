// v4.0.17 验证：房间归属误报修复 / 伤害归属补全 / HUD 实时伤害榜
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

  // ============ A. 房间解析修复（「你已经有房间了！」误报）============
  console.log("—— A. 房间解析：站在自己房间/门口建造不再误报 ——");
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=1p&role1=peashooter"), { waitUntil: "networkidle0" });
  await sleep(800);
  const a0 = await page.evaluate(() => {
    const g = window.game;
    g.ghostSpawnAt = 1e12; // 冻结出笼
    // 绑定一个房间（模拟已在房间 A 种过植物）
    const myRm = g.rooms.find(rm => !g.ais.some(ai => ai.room === rm));
    g.player.room = myRm;
    if (!myRm.owners.includes(g.player)) myRm.owners.push(g.player);
    // 找自己房间的门邻格（桥/门口，地形上不属于房间内部）
    const dc = myRm.doorCol, dr = myRm.doorRow;
    const doorAdj = [[dc + 1, dr], [dc - 1, dr], [dc, dr + 1], [dc, dr - 1]]
      .find(([c, r]) => !g.walls.has(`${c},${r}`) && !g._insideRoom(c, r));
    // 自己房间内的床位格（非地形格 grid!==1）
    let bedTile = null;
    for (let rr = myRm.y; rr < myRm.y + myRm.h && !bedTile; rr++)
      for (let cc = myRm.x; cc < myRm.x + myRm.w && !bedTile; cc++)
        if (myRm.tpl.grid[rr - myRm.y][cc - myRm.x] !== 1) bedTile = { c: cc, r: rr };
    // 旧逻辑复现：门邻格 find 首匹配（可能抓隔壁）
    const oldRoom = doorAdj ? g.rooms.find(rm => Math.abs(doorAdj[0] - rm.doorCol) + Math.abs(doorAdj[1] - rm.doorRow) <= 1) : null;
    const newRoomAdj = doorAdj ? g._resolveBuildRoom(doorAdj[0], doorAdj[1], g.player) : null;
    const newRoomBed = bedTile ? g._resolveBuildRoom(bedTile.c, bedTile.r, g.player) : null;
    return { myRoomIdx: g.rooms.indexOf(myRm), doorAdj, oldIsMine: oldRoom === myRm, newIsMine: newRoomAdj === myRm, bedIsMine: newRoomBed === myRm, hasBed: !!bedTile };
  });
  ok(a0.doorAdj, `A1 找到自己房间的门邻格 (${a0.doorAdj})`);
  if (a0.doorAdj && !a0.oldIsMine) {
    ok(a0.newIsMine, `A2 门邻格解析回自己的房间（新逻辑）；旧逻辑会误抓隔壁房间（已实锤复现用户 bug）`);
  } else {
    ok(a0.newIsMine, `A2 门邻格解析回自己的房间（旧逻辑此处恰好也命中自己的房间）`);
  }
  ok(!a0.hasBed || a0.bedIsMine, `A3 房间内非地形格（床位）解析回自己的房间`);

  // 物理键盘：站门邻格按 F → 菜单打开且无误报
  const a4 = await page.evaluate(() => {
    const g = window.game;
    const myRm = g.player.room;
    const dc = myRm.doorCol, dr = myRm.doorRow;
    const adj = [[dc + 1, dr], [dc - 1, dr], [dc, dr + 1], [dc, dr - 1]]
      .find(([c, r]) => !g.walls.has(`${c},${r}`) && !g._insideRoom(c, r));
    g.player.x = adj[0] * g.gridSize + 40;
    g.player.y = adj[1] * g.gridSize + 40;
    g.keys = {}; g.keysJustPressed = {};
    return { x: g.player.x, y: g.player.y };
  });
  await sleep(350); // 相机收敛
  await page.keyboard.press("f");
  await sleep(250);
  const a5 = await page.evaluate(() => {
    const g = window.game;
    const menuOn = g.kmenus[1].active;
    const opts = menuOn ? g.kmenus[1].options.length : 0;
    g._handleKMenu(1, g.player, ['f', 'j'], ['altright', 'g', 'k'], ['w'], ['s'], g.p1Kmenu, g.p1Cursor);
    if (g.kmenus[1].active) { g.kmenus[1].active = false; g.p1Kmenu.style.display = 'none'; }
    return { menuOn, opts };
  });
  ok(a5.menuOn && a5.opts > 0, `A4 站在自家门口按 F → 建造菜单正常打开（${a5.opts} 个选项，无误报）`);

  // ============ B. 伤害归属补全 ============
  console.log("—— B. 伤害归属：所有输出口径都计入 dmgDealt ——");
  // B1 豌豆射击归属
  const b0 = await page.evaluate(() => {
    const g = window.game;
    g._spawnGhost();
    const zb = g.zombies[0];
    // 在玩家房间种一株豌豆
    const myRm = g.player.room;
    const spot = { c: myRm.x + Math.floor(myRm.w / 2), r: myRm.y + Math.floor(myRm.h / 2) };
    if (g.plants.some(p => p.c === spot.c && p.r === spot.r)) spot.c += 1;
    g.spawnPlant(spot.c, spot.r, 'peashooter');
    const pl = g.plants[g.plants.length - 1];
    const rm = g._insideRoom(spot.c, spot.r);
    const owner = (rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : g.player;
    // 玩家和僵尸都挪到植物旁边（僵尸 AI 会追玩家，玩家守在植物旁 → 僵尸始终在射程内）
    g.player.x = spot.c * g.gridSize + 40 + 70;
    g.player.y = spot.r * g.gridSize + 40;
    zb.x = g.player.x + 80; zb.y = g.player.y;
    return { ownerIsPlayer: owner === g.player, dmg0: g.player.dmgDealt || 0, zbHp: zb.hp };
  });
  ok(b0.ownerIsPlayer, `B1 豌豆归属玩家房间（owners[0] === P1）`);
  await sleep(2600);
  const b1 = await page.evaluate(() => {
    const g = window.game;
    return { dmg: g.player.dmgDealt || 0, peas: g.peas.length };
  });
  ok(b1.dmg > b0.dmg0, `B2 豌豆命中僵尸后 dmgDealt 累计（${b0.dmg0} → ${b1.dmg}）`);

  // B3 倭瓜技能计入
  const b2 = await page.evaluate(() => {
    const g = window.game;
    const p = g.player;
    const zb = g.zombies[0];
    if (!zb || zb.dead) return { skip: true };
    p.roleDef = { id: 'squash', name: '倭瓜' };
    p.skillCd = 0;
    const hpBefore = zb.hp;
    const dmgBefore = p.dmgDealt || 0;
    g._useSkill(p);
    return { dealt: (p.dmgDealt || 0) - dmgBefore, hpBefore, skip: false };
  });
  ok(!b2.skip && b2.dealt > 0, `B3 倭瓜技能伤害计入 dmgDealt（+${Math.round(b2.dealt || 0)}）`);

  // B4 毁灭菇导弹带 owner
  const b3 = await page.evaluate(() => {
    const g = window.game;
    g.isNight = true; // v4.0.20：毁灭菇是蘑菇系，白天睡觉不开炮——切到夜晚再测
    const myRm = g.player.room;
    const spot = { c: myRm.x + 1, r: myRm.y + 1 };
    if (g.plants.some(p => p.c === spot.c && p.r === spot.r)) return { skip: true };
    g.spawnPlant(spot.c, spot.r, 'doomshroom');
    const pl = g.plants[g.plants.length - 1];
    if (!pl || !pl.def.nuke) return { skip: true, hasNuke: false };
    pl.nukeT = pl.def.nuke.cd; // 快进冷却
    return { skip: false };
  });
  await sleep(600);
  const b4 = await page.evaluate(() => {
    const g = window.game;
    const nuke = g.peas.find(pp => pp.homeR === 9999);
    return { hasPea: !!nuke, hasOwner: !!(nuke && nuke.owner && nuke.owner.roleDef), ownerIsPlayer: !!(nuke && nuke.owner === g.player) };
  });
  ok(!b3.skip && b4.hasPea && b4.hasOwner && b4.ownerIsPlayer, `B4 毁灭菇导弹带 owner（归属 P1，原版导弹无主白打）`);

  // C. HUD 实时伤害
  console.log("—— C. HUD 实时伤害显示 ——");
  const c0 = await page.evaluate(() => {
    const g = window.game;
    g.player.dmgDealt = 1234;
    g.allPlayers.forEach((p, i) => { if (p.isAi && i % 2 === 0) p.dmgDealt = 9999; });
    return { hasDmg1: !!document.getElementById('dmg1'), boardExists: !!document.getElementById('dmg-board') };
  });
  ok(c0.hasDmg1 && c0.boardExists, `C1 HUD 伤害字段与伤害榜 DOM 存在`);
  await sleep(900);
  const c1 = await page.evaluate(() => {
    const g = window.game;
    g._updateDmgBoard();
    const d1 = document.getElementById('dmg1').innerText;
    const board = document.getElementById('dmg-board');
    const txt = board.innerText;
    const on = board.style.display;
    const live = String(Math.round(g.player.dmgDealt || 0));
    const aiFirst = txt.indexOf('人机') !== -1 && txt.indexOf('人机') < txt.indexOf('P1');
    return { d1, txt, on, live, aiFirst };
  });
  ok(c1.d1 === c1.live && Number(c1.d1) >= 1234, `C2 P1 HUD 伤害与账本实时同步（HUD ${c1.d1} = 账本 ${c1.live}，豌豆还在持续命中）`);
  ok(c1.on === 'block' && c1.txt.includes('P1') && c1.txt.includes('人机'), `C3 顶部伤害榜显示全部玩家（含人机）`);
  ok(c1.aiFirst, `C4 伤害榜按伤害降序（人机 9999 排在 P1 1234 前面——MVP 结果全程可见不意外）`);

  // C5: 2P 模式 dmg2
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=2p&role1=peashooter&role2=sunflower"), { waitUntil: "networkidle0" });
  await sleep(800);
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; window.game.player2.dmgDealt = 777; });
  await sleep(900);
  const c5 = await page.evaluate(() => {
    window.game._updateDmgBoard();
    return { d2: document.getElementById('dmg2').innerText, board: document.getElementById('dmg-board').innerText };
  });
  ok(c5.d2 === '777', `C5 2P 模式 P2 HUD 伤害实时刷新（显示 ${c5.d2}）`);
  ok(c5.board.includes('P1') && c5.board.includes('P2'), `C6 2P 伤害榜含 P1/P2 双方`);

  // ============ D. 回归：正常建造闭环（房间内）============
  console.log("—— D. 回归：房间内建造闭环 ——");
  const d0 = await page.evaluate(() => {
    const g = window.game;
    g.ghostSpawnAt = 1e12;
    // 全图扫描有空地形格的房间（2P 地图上 P1 默认绑定的房间可能已满）
    for (const myRm of g.rooms) {
      if (g.ais.some(ai => ai.room === myRm)) continue;
      for (let rr = myRm.y; rr < myRm.y + myRm.h; rr++)
        for (let cc = myRm.x; cc < myRm.x + myRm.w; cc++)
          if (myRm.tpl.grid[rr - myRm.y][cc - myRm.x] === 1 && !g.plants.some(p => p.c === cc && p.r === rr) && !g.walls.has(`${cc},${rr}`)) {
            g.player.room = myRm;
            if (!myRm.owners.includes(g.player)) myRm.owners.push(g.player);
            g.player.x = cc * g.gridSize + 40;
            g.player.y = rr * g.gridSize + 40;
            return { c: cc, r: rr, plantsBefore: g.plants.length };
          }
    }
    return null;
  });
  ok(!!d0, `D0 找到可建造的空格（${d0 ? `(${d0.c},${d0.r})` : '全图无空格'}）`);
  if (d0) {
    await page.evaluate(() => { window.game.player.sun = 99999; }); // 2P 开局 0 阳光，先给钱
    await sleep(350);
    await page.keyboard.press("f");
    await sleep(200);
    await page.keyboard.press("f"); // 确认首项购买
    await sleep(300);
    const d1 = await page.evaluate(() => {
      const g = window.game;
      return { plantsAfter: g.plants.length, menuClosed: !g.kmenus[1].active, sun: g.player.sun };
    });
    ok(d1.plantsAfter === d0.plantsBefore + 1 && d1.menuClosed, `D1 房间内建造闭环正常（种植成功扣费，阳光 ${d1.sun}）`);
  }

  await page.screenshot({ path: ROOT + "/_v4017_hud.png" });
  ok(pageErrors === 0, `P 全程无页面异常（${pageErrors} 个）`);

  console.log(`\n========== 结果：${pass} 通过 / ${fail} 失败 ==========`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
