// v4.0.16 验证：悬空血条 / MVP 重做 / 出生安全 / AI 穿墙 / 键位 / 拆除二次确认 / 菜单锁定移动
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

  // ============ A. 出生安全（1P 重开 4 次）============
  console.log("—— A. 出生安全：玩家/人机不卡墙里 + 僵尸出笼远离玩家 ——");
  let spawnBadTotal = 0, ghostMinMin = Infinity, ghostMissing = 0;
  for (let i = 0; i < 4; i++) {
    await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=1p&role1=peashooter"), { waitUntil: "networkidle0" });
    await sleep(700);
    const r = await page.evaluate(() => {
      const g = window.game;
      g.ghostSpawnAt = 1e12;
      const bad = g.allPlayers.filter(p => p && g.checkCollision(p.x, p.y, 14)).length;
      let minDist = Infinity, missing = 0;
      for (let k = 0; k < 5; k++) {
        const sp = g._ghostSpawnPoint();
        const d = Math.min(...g.allPlayers.filter(p => !p.dead).map(p => Math.hypot(p.x - sp.x, p.y - sp.y)));
        if (sp.x === 100 && sp.y === 100) missing++;
        if (d < minDist) minDist = d;
      }
      return { players: g.allPlayers.length, bad, minDist, missing };
    });
    spawnBadTotal += r.bad;
    ghostMinMin = Math.min(ghostMinMin, r.minDist);
    ghostMissing += r.missing;
    console.log(`  第${i + 1}局：实体 ${r.players} 个，卡墙 ${r.bad} 个，出笼最小距离 ${Math.round(r.minDist)}，兜底 ${r.missing}/5`);
  }
  ok(spawnBadTotal === 0, `A1 4 局出生点零卡墙（累计 ${spawnBadTotal} 个实体在墙内）`);
  ok(ghostMissing === 0, `A2 20 次出笼点全部走主路径（无兜底 100,100）`);
  ok(ghostMinMin >= 600, `A3 出笼点距最近存活玩家 ≥600px（实测最小 ${Math.round(ghostMinMin)}）`);

  // ============ B. 悬空血条 ============
  console.log("—— B. 僵尸血条跟随本体（不再悬空） ——");
  const b = await page.evaluate(() => {
    const g = window.game;
    g.ghostLevel = 1;
    g._spawnGhost();
    const zb = g.zombies[0];
    zb.hp = zb.maxHp * 0.5;
    // 挪到地图中心开阔处，跑一帧渲染
    zb.x = g.worldWidth / 2; zb.y = g.worldHeight / 2;
    zb.hpBg.style.display = 'block';
    g.render ? g.render() : null;
    return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
      const bar = zb.hpBg.getBoundingClientRect();
      const el = zb.el1.getBoundingClientRect();
      res({
        inlineLeft: zb.hpBg.style.left, inlineTop: zb.hpBg.style.top,
        barCx: bar.left + bar.width / 2, barCy: bar.top + bar.height / 2,
        elCx: el.left + el.width / 2, elCy: el.top + el.height / 2,
        zbx: zb.x, zby: zb.y,
      });
    })));
  });
  // 创建时的 top:-14px 是相对本体的静态偏移（合法）；bug 是 _render 里写 zb.x/zb.y 世界绝对坐标（会变成几百 px）
  const topOk = b.inlineTop === '' || /^-\d{1,2}px$/.test(b.inlineTop);
  ok(b.inlineLeft === '' && topOk, `B1 血条不再写世界绝对坐标（left="${b.inlineLeft}" top="${b.inlineTop}"）`);
  const dx = Math.abs(b.barCx - b.elCx), dy = Math.abs(b.barCy - b.elCy);
  ok(dx < 40 && dy < 80, `B2 血条贴在本体上方（水平偏差 ${Math.round(dx)}px，垂直偏差 ${Math.round(dy)}px，旧版≈2 倍坐标飞走）`);

  // ============ C. AI 穿墙：_findPath 门板豁免 + 失败返 null ============
  console.log("—— C. AI 寻路：门板放行 + 不可达返 null（不再直线穿墙） ——");
  const c = await page.evaluate(() => {
    const g = window.game;
    g.zombies.forEach(z => z.el1 && z.el1.remove());
    g.zombies = [];
    const rm = g.rooms[0];
    const d = rm.tpl.door;
    let dx = 0, dy = 0;
    if (d.r >= rm.h) dy = 1; else if (d.r < 0) dy = -1;
    else if (d.c >= rm.w) dx = 1; else dx = -1;
    const outC = rm.x + d.c + dx * 3, outR = rm.y + d.r + dy * 3;
    const outX = outC * g.gridSize + 40, outY = outR * g.gridSize + 40;
    const inX = (rm.x + Math.floor(rm.w / 2)) * g.gridSize + 40;
    const inY = (rm.y + Math.floor(rm.h / 2)) * g.gridSize + 40;

    // 未造门板时：门格是否是唯一入口
    const pBefore = g._findPath(outX, outY, inX, inY, true);
    // 造门板（门格）
    g.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true);
    const pAllow = g._findPath(outX, outY, inX, inY, true);   // AI：可过门
    const pDeny = g._findPath(outX, outY, inX, inY, false);   // 僵尸：门=障碍
    const doorX = rm.doorCol * g.gridSize + 40, doorY = rm.doorRow * g.gridSize + 40;
    const denyThroughDoor = pDeny ? pDeny.some(s => Math.abs(s.x - doorX) < 1 && Math.abs(s.y - doorY) < 1) : false;

    // 确定性构造不可达目标：临时把某个空格的 4 邻加成墙（形成一个封闭死格），测完还原
    let sealed = null;
    for (let rr = 2; rr < g.rows - 2 && !sealed; rr++) {
      for (let cc = 2; cc < g.cols - 2; cc++) {
        if (g.walls.has(`${cc},${rr}`)) continue;
        if (cc === outC && rr === outR) continue;
        const nb = [`${cc},${rr - 1}`, `${cc},${rr + 1}`, `${cc - 1},${rr}`, `${cc + 1},${rr}`];
        if (nb.every(k => !g.walls.has(k))) { sealed = { c: cc, r: rr, nb }; break; }
      }
    }
    let sealedTmp = [];
    if (sealed) { for (const k of sealed.nb) { g.walls.add(k); sealedTmp.push(k); } }
    const pNull = sealed ? g._findPath(outX, outY, sealed.c * g.gridSize + 40, sealed.r * g.gridSize + 40, true) : 'NOSEAL';
    for (const k of sealedTmp) g.walls.delete(k); // 还原临时墙

    return {
      beforeLen: pBefore ? pBefore.length : -1,
      allowLen: pAllow ? pAllow.length : -1,
      denyNull: pDeny === null,
      denyThroughDoor,
      nullRes: pNull === 'NOSEAL' ? 'NOSEAL' : (pNull === null ? 'NULL' : 'PATH' + pNull.length),
    };
  });
  ok(c.beforeLen > 0, `C1 未造门板时门外可进房间（路径 ${c.beforeLen} 步）`);
  ok(c.allowLen > 0, `C2 造门板后 AI 仍能过门进房（passDoors 路径 ${c.allowLen} 步）——旧版此处必失败→直线穿墙`);
  ok(c.denyNull === true || c.denyThroughDoor === false, `C3 僵尸寻路不穿门板（denyNull=${c.denyNull}，路径含门格=${c.denyThroughDoor}）`);
  ok(c.nullRes === 'NOSEAL' || c.nullRes === 'NULL', `C4 不可达目标返回 null 而非直线（结果 ${c.nullRes}）`);

  // ============ D. 键位 + 拆除二次确认 + 菜单锁定移动（2P）============
  console.log("—— D. 2P 键位 / 拆除二次确认 / 菜单打开时人物站定 ——");
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=2p&role1=peashooter&role2=sunflower"), { waitUntil: "networkidle0" });
  await sleep(800);
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; });

  // 把 P2 放进一间房（找空格）
  const setup2p = await page.evaluate(() => {
    const g = window.game;
    g.player2.sun = 5000; g.player2.spore = 5000;
    // 找一间房里的空格，把 P2 放进去
    for (const rm of g.rooms) {
      for (let r = rm.y + 1; r < rm.y + rm.h - 1; r++) {
        for (let cc = rm.x + 1; cc < rm.x + rm.w - 1; cc++) {
          const x = cc * g.gridSize + 40, y = r * g.gridSize + 40;
          if (g.walls.has(`${cc},${r}`)) continue;
          const pl = g.getPlantAt(x, y);
          if (pl) continue;
          g.player2.room = rm; g.player2.x = x; g.player2.y = y;
          return { x, y, room: true };
        }
      }
    }
    return { room: false };
  });
  ok(setup2p.room, "D0 P2 已放入空房间（准备测试建造菜单）");

  // D1: P2 按 1 → 建造菜单打开
  await page.keyboard.press('1');
  await sleep(180);
  const d1 = await page.evaluate(() => ({ active: window.game.kmenus[2].active, opts: window.game.kmenus[2].options.length }));
  ok(d1.active === true, `D1 P2 按 [1] 打开建造菜单（active=${d1.active}，选项 ${d1.opts} 个）`);

  // D2: 菜单打开时按方向键 → P2 不移动
  const d2 = await page.evaluate(() => ({ x: window.game.player2.x, y: window.game.player2.y }));
  await page.keyboard.down('ArrowRight');
  await sleep(450);
  await page.keyboard.up('ArrowRight');
  const d2b = await page.evaluate(() => ({ x: window.game.player2.x, y: window.game.player2.y }));
  ok(Math.abs(d2b.x - d2.x) < 1.5 && Math.abs(d2b.y - d2.y) < 1.5,
     `D2 菜单打开时 P2 站定不动（Δx=${Math.round(d2b.x - d2.x)} Δy=${Math.round(d2b.y - d2.y)}）`);

  // D3: P2 按 2 → 菜单关闭
  await page.keyboard.press('2');
  await sleep(180);
  const d3 = await page.evaluate(() => ({ active: window.game.kmenus[2].active }));
  ok(d3.active === false, `D3 P2 按 [2] 关闭菜单（active=${d3.active}）`);

  // D4: 关闭后 P2 可以移动
  await page.keyboard.down('ArrowLeft');
  await sleep(400);
  await page.keyboard.up('ArrowLeft');
  const d4 = await page.evaluate(() => ({ x: window.game.player2.x }));
  ok(Math.abs(d4.x - d2b.x) > 4, `D4 关菜单后 P2 恢复移动（Δx=${Math.round(d4.x - d2b.x)}）`);

  // D5: P2 按 3 → 触发 P2 技能（而非 P1）
  const d5 = await page.evaluate(() => ({ p1cd: window.game.player.skillCd, p2cd: window.game.player2.skillCd }));
  await page.keyboard.press('3');
  await sleep(200);
  const d5b = await page.evaluate(() => ({ p1cd: window.game.player.skillCd, p2cd: window.game.player2.skillCd }));
  ok(d5b.p2cd > 0 && d5b.p1cd === d5.p1cd, `D5 P2 按 [3] 技能落在 P2（P2 CD ${d5b.p2cd} / P1 CD ${d5b.p1cd} 未变）`);

  // D6: P2 按 0 → P2 浇水开关，P1 阳光不动
  const d6pre = await page.evaluate(() => ({ p1: window.game.player.sun, p2: window.game.player2.sun }));
  await page.keyboard.press('0');
  await sleep(140);
  const d6on = await page.evaluate(() => ({ on: window.game.player2.waterOn, badge: document.getElementById('water-badge2').style.display }));
  await sleep(700);
  const d6post = await page.evaluate(() => ({ p1: window.game.player.sun, p2: window.game.player2.sun }));
  ok(d6on.on === true && d6on.badge === 'block', "D6 P2 按 [0] 开启浇水，P2 头顶标志出现");
  ok(d6post.p2 - d6pre.p2 >= 4 && d6post.p1 === d6pre.p1, `D6b P2 浇水只加自己（P2 +${d6post.p2 - d6pre.p2}，P1 保持 ${d6post.p1}）`);
  await page.keyboard.press('0');
  await sleep(80);

  // D7: 拆除二次确认（物理点击弹窗按钮）
  await page.evaluate(() => {
    const g = window.game;
    g.player.spore = 9999; g.player.sun = 9999;
    // 在 P1 身边房间种一株植物用于拆除
    const rm = g.rooms[0];
    let cell = null;
    for (let r = rm.y + 1; r < rm.y + rm.h - 1; r++) {
      for (let cc = rm.x + 1; cc < rm.x + rm.w - 1; cc++) {
        if (g.walls.has(`${cc},${r}`)) continue;
        if (g.getPlantAt(cc * g.gridSize + 40, r * g.gridSize + 40)) continue;
        cell = { c: cc, r: r }; break;
      }
      if (cell) break;
    }
    window.__delCell = cell;
    g.spawnPlant(cell.c, cell.r, 'peashooter');
    g.player.x = cell.c * g.gridSize + 40;
    g.player.y = cell.r * g.gridSize + 40;
    g.player.room = rm;
    g.plantClick(g.plants.find(p => p.c === cell.c && p.r === cell.r));
  });
  await sleep(200);
  const d7a = await page.evaluate(() => ({ n: window.game.plants.filter(p => !p.isDoor).length, label: document.getElementById('pp-demolish').innerText, disp: window.game.popup.style.display }));
  // 第一次点拆除
  await page.evaluate(() => document.getElementById('pp-demolish').click());
  await sleep(150);
  const d7b = await page.evaluate(() => ({ n: window.game.plants.filter(p => !p.isDoor).length, label: document.getElementById('pp-demolish').innerText }));
  ok(d7b.n === d7a.n, `D7 第一次点拆除不生效（植物仍 ${d7b.n} 株）`);
  ok(d7b.label.includes('再点一次') || d7b.label.includes('确认'), `D7b 按钮切换为确认态：「${d7b.label}」`);
  // 第二次点拆除
  await page.evaluate(() => document.getElementById('pp-demolish').click());
  await sleep(200);
  const d7c = await page.evaluate(() => ({ n: window.game.plants.filter(p => !p.isDoor).length }));
  ok(d7c.n === d7a.n - 1, `D7c 第二次点拆除生效（植物 ${d7c.n} 株）`);

  // ============ E. MVP 结算 ============
  console.log("—— E. MVP 结算按伤害评定 + 身份标识 ——");
  const e = await page.evaluate(() => {
    const g = window.game;
    g.player.dmgDealt = 120;
    g.player2.dmgDealt = 980; // P2 伤害最高
    g.gameOver(true);
    return { txt: document.getElementById('ov-mvp').innerText };
  });
  ok(e.txt.includes('P2'), `E1 最高伤害者 P2 被评为 MVP，且标注 P2 而非「人机」（「${e.txt}」）`);
  ok(e.txt.includes('980'), `E2 MVP 文案带伤害数值（「${e.txt}」）`);

  ok(pageErrors === 0, `P 全程无页面异常（${pageErrors}）`);

  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=2p&role1=peashooter&role2=sunflower"), { waitUntil: "networkidle0" });
  await sleep(700);
  await page.evaluate(() => { window.game.ghostSpawnAt = 200; });
  await sleep(1400);

  // ============ F. HUD 与顶部信息条不重叠 + 左右等高 ============
  console.log("—— F. HUD 收窄：与顶部僵尸信息条不重叠 + 左右等高 ——");
  const f = await page.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const p1 = r('hud-p1'), p2 = r('p2-hud'), chip = r('wave-chip');
    return { p1R: p1.right, p2L: p2.left, chipL: chip.left, chipR: chip.right, h1: p1.height, h2: p2.height };
  });
  ok(f.p1R <= f.chipL + 2, `F1 P1 面板右缘(${Math.round(f.p1R)})不压信息条左缘(${Math.round(f.chipL)})`);
  ok(f.p2L >= f.chipR - 2, `F2 P2 面板左缘(${Math.round(f.p2L)})不压信息条右缘(${Math.round(f.chipR)})`);
  ok(Math.abs(f.h1 - f.h2) < 2, `F3 P1/P2 面板等高（${Math.round(f.h1)} vs ${Math.round(f.h2)}）`);

  await page.screenshot({ path: ROOT + "/_v4016_2p.png" });

  console.log(`\n== v4.0.16 结果：${pass} 通过 / ${fail} 失败 ==`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
