// v4.0.15 验证：P1/P2 HUD 对称一致 + P2 浇水键(0/小键盘0) + 2P 资源归属修复 + skillDesc 双前缀修复
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

  // ============ A. 1P 模式 ============
  console.log("—— A. 1P 模式：HUD 样式 + P1 浇水回归 ——");
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=1p&role1=peashooter"), { waitUntil: "networkidle0" });
  await sleep(900);
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; }); // 冻结僵尸出笼

  const a1 = await page.evaluate(() => {
    const row = document.getElementById('hp-row');
    const track = document.getElementById('hp-track');
    const fill = document.getElementById('hp-fill');
    const hud = document.getElementById('hud-p1');
    return {
      rowDisp: getComputedStyle(row).display,
      trackW: getComputedStyle(track).width, trackH: getComputedStyle(track).height,
      fillH: fill.offsetHeight,
      hudH: hud.offsetHeight,
      skillTxt: document.getElementById('skill-hud').innerText
    };
  });
  ok(a1.rowDisp === 'flex', `A1 P1 hp-row 改为 flex 布局（原无样式块级堆叠=长块，现 ${a1.rowDisp}）`);
  ok(a1.trackW === '160px' && a1.trackH === '14px', `A2 P1 血条规格与 P2 一致（160x14，实测 ${a1.trackW}x${a1.trackH}）`);
  ok(a1.fillH === 14, `A3 P1 血条填充可见（高度填满 14px 轨道）`);
  ok(!a1.skillTxt.includes('【M键】【M键】') && a1.skillTxt.includes('【M键】'), `A4 技能 HUD 无双重前缀：「${a1.skillTxt}」`);

  // P1 浇水回归（空格开关）
  await page.keyboard.press('Space');
  await sleep(80);
  const a2 = await page.evaluate(() => ({
    on: window.game.player.waterOn,
    badge: document.getElementById('water-badge').style.display
  }));
  ok(a2.on && a2.badge === 'block', `A5 P1 空格开关浇水正常（回归）`);
  const s0 = await page.evaluate(() => window.game.player.sun);
  await sleep(1300);
  const s1 = await page.evaluate(() => window.game.player.sun);
  ok(s1 - s0 >= 11 && s1 - s0 <= 15, `A6 P1 浇水 1.3 秒阳光 +${s1 - s0}（默认 2x 倍速下 0.2s 游戏间隔 ≈ 13 次）`);
  await page.keyboard.press('Space');
  await sleep(80);
  const a3 = await page.evaluate(() => ({ on: window.game.player.waterOn, sun: window.game.player.sun }));
  await sleep(600);
  const a4 = await page.evaluate(() => window.game.player.sun);
  ok(!a3.on && a4 - a3.sun === 0, `A7 P1 再按空格停止浇水`);

  // 玩法说明文案
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.innerText.includes('玩法说明')).click(); });
  await sleep(200);
  const a5 = await page.evaluate(() => document.getElementById('dorm-help').innerText);
  ok(a5.includes('[空格] 浇水开关') && a5.includes('[0键](或小键盘0) 浇水开关'), `A8 玩法说明：P1 空格/P2 0键 浇水开关均已写入`);
  ok(!a5.includes('每 45 秒升级') && a5.includes('30秒') && a5.includes('150秒'), `A9 玩法说明：僵尸升级节奏已改为实际值(30/90/150秒)`);
  ok(!a5.includes('呼出菜单/确认购买/升级</b>') && !a5.includes('[空格](或F/J) 呼出菜单'), `A10 玩法说明：不再错误声称空格呼出菜单`);
  await page.evaluate(() => { document.getElementById('dorm-help').style.display = 'none'; });

  // ============ B. 2P 模式 ============
  console.log("—— B. 2P 模式：HUD 对称 + P2 浇水 + 资源归属 ——");
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?mode=2p&role1=sunflower&role2=peashooter"), { waitUntil: "networkidle0" });
  await sleep(1000);
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; });

  const b1 = await page.evaluate(() => {
    const h1 = document.getElementById('hud-p1'), h2 = document.getElementById('p2-hud');
    return {
      p2Visible: getComputedStyle(h2).display !== 'none',
      row2Disp: getComputedStyle(document.getElementById('hp-row2')).display,
      track2W: getComputedStyle(document.getElementById('hp-track2')).width,
      dupTrack: document.querySelectorAll('[id="hp-track"]').length,
      h1: h1.offsetHeight, h2: h2.offsetHeight,
      skill2: document.getElementById('skill-hud2').innerText
    };
  });
  ok(b1.p2Visible, `B1 2P 模式 P2 HUD 显示`);
  ok(b1.dupTrack === 1, `B2 hp-track 重复 id 已修复（全页仅 1 个，原 P2 复用 P1 的 id）`);
  ok(b1.row2Disp === 'flex' && b1.track2W === '160px', `B3 P2 血条 160px flex（回归）`);
  ok(Math.abs(b1.h1 - b1.h2) <= 6, `B4 P1/P2 HUD 高度一致（${b1.h1}px vs ${b1.h2}px，左右对称等高）`);
  ok(!b1.skill2.includes('【M键】') && b1.skill2.includes('【/键】'), `B5 P2 技能 HUD 只显示【/键】前缀：「${b1.skill2}」`);

  // P2 浇水：按 0 → P2 的标志亮、P2 阳光涨、P1 纹丝不动
  await page.keyboard.press('0');
  await sleep(80);
  const b2 = await page.evaluate(() => ({
    p2on: window.game.player2.waterOn, p1on: window.game.player.waterOn,
    badge2: document.getElementById('water-badge2').style.display,
    badge1: document.getElementById('water-badge').style.display
  }));
  ok(b2.p2on && b2.badge2 === 'block', `B6 按 0 键 → P2 浇水开启 + P2 头顶 🚿 标志`);
  ok(!b2.p1on && b2.badge1 === 'none', `B7 P2 开浇水不影响 P1（P1 标志仍隐藏）`);
  const p2s0 = await page.evaluate(() => window.game.player2.sun);
  const p1s0 = await page.evaluate(() => window.game.player.sun);
  await sleep(1300);
  const b3 = await page.evaluate(() => ({ p2: window.game.player2.sun, p1: window.game.player.sun }));
  ok(b3.p2 - p2s0 >= 11 && b3.p2 - p2s0 <= 15, `B8 P2 浇水 1.3 秒 P2 阳光 +${b3.p2 - p2s0}`);
  ok(b3.p1 === p1s0, `B9 P2 浇水期间 P1 阳光不变（${b3.p1}）——收入归各自主人`);
  await page.keyboard.press('0');
  await sleep(80);
  const b4 = await page.evaluate(() => window.game.player2.waterOn);
  ok(!b4, `B10 再按 0 → P2 浇水停止`);

  // P2 买植物扣 P2 的钱（核心 bug 修复验证）
  const buySetup = await page.evaluate(() => {
    const g = window.game;
    // 把 P2 传送到一个房间的空地上（tpl.grid=1 且无植物）
    let cell = null;
    for (const rm of g.rooms) {
      for (let r = 0; r < rm.tpl.grid.length && !cell; r++) {
        for (let c = 0; c < rm.tpl.grid[r].length && !cell; c++) {
          if (rm.tpl.grid[r][c] !== 1) continue;
          const gc = rm.x + c, gr = rm.y + r;
          if (g.walls.has(gc + ',' + gr)) continue;
          if (g.getPlantAt(gc * 80 + 40, gr * 80 + 40)) continue;
          cell = { x: gc * 80 + 40, y: gr * 80 + 40 };
        }
      }
      if (cell) break;
    }
    g.player2.x = cell.x; g.player2.y = cell.y;
    g.player2.sun = 99999; g.player2.spore = 99999;
    return cell;
  });
  await sleep(400); // 等相机收敛
  await page.keyboard.press('Delete'); // 呼出菜单
  await sleep(300);
  const menuInfo = await page.evaluate(() => {
    const g = window.game;
    const menu = g.kmenus && g.kmenus[2];
    return menu && menu.active ? { opt0: menu.options[0] } : null;
  });
  ok(!!menuInfo, `B11 P2 按 Delete 呼出建造菜单`);
  if (menuInfo) {
    await page.keyboard.press('Delete'); // 确认购买选项 0
    await sleep(400);
    const b5 = await page.evaluate((opt) => {
      const g = window.game;
      const def = g.p2Kmenu && opt.action === 'buy' ? g.constructor.DEFS[opt.type] : null;
      return {
        action: opt.action, type: opt.type,
        cost: def ? (def.cost || 0) : 0,
        p2sun: g.player2.sun, p1sun: g.player.sun,
        plants: g.plants.length
      };
    }, menuInfo.opt0);
    if (b5.action === 'buy') {
      ok(b5.p2sun === 99999 - b5.cost, `B12 P2 购买 ${b5.type}（☀${b5.cost}）→ P2 阳光 99999→${b5.p2sun}（扣自己的）`);
      ok(b5.p1sun === p1s0, `B13 P1 阳光保持 ${b5.p1sun} 未被扣（旧版会扣到 P1 头上）`);
    } else {
      ok(false, `B12/B13 菜单首项不是购买（${b5.action}），跳过资源断言`);
    }
  }

  await page.screenshot({ path: ROOT + "/_v4015_2p.png" });
  ok(pageErrors === 0, `P 全程无页面异常（${pageErrors} 个）`);
  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(2); });
