// v3.92.0 验证：空格开关式浇水 + 0.2 秒间隔 + 头顶 🚿 标志
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
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?role=plant"), { waitUntil: "networkidle0" });
  await sleep(900);
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; }); // 冻结僵尸出笼

  // ============ W. 开关式浇水 ============
  console.log("—— W. 开关式浇水 ——");

  // W1: 按一下空格（keydown+keyup 完整一次）→ 浇水开启 + 头顶标志显示，无需按住
  await page.keyboard.press('Space');
  await sleep(80);
  const w1 = await page.evaluate(() => {
    const g = window.game;
    const badge = document.getElementById('water-badge');
    return { on: g.waterOn, keysSpace: g.keys[' '], badgeShown: badge && badge.style.display === 'block' };
  });
  ok(w1.on && !w1.keysSpace, `W1 按一下空格（已松开）→ 浇水开启，空格键不处于按住状态`);
  ok(w1.badgeShown, `W2 头顶 🚿 浇水标志显示`);

  // W3: 不碰键盘 1.2 秒 → 阳光自动 +6（0.2s 间隔，无需按住）
  const s0 = await page.evaluate(() => window.game.player.sun);
  await sleep(1300);
  const s1 = await page.evaluate(() => window.game.player.sun);
  ok(s1 - s0 >= 5 && s1 - s0 <= 7, `W3 松手后 1.3 秒阳光 +${s1 - s0}（期望约 6 = 0.2 秒一次，无需按住）`);

  // W4: 再按一下 → 停止，标志隐藏，阳光不再增长
  await page.keyboard.press('Space');
  await sleep(80);
  const s2 = await page.evaluate(() => {
    const g = window.game;
    const badge = document.getElementById('water-badge');
    return { on: g.waterOn, sun: g.player.sun, badgeHidden: badge && badge.style.display === 'none' };
  });
  ok(!s2.on && s2.badgeHidden, `W4 再按一下 → 浇水停止，🚿 标志隐藏`);
  await sleep(700);
  const s3 = await page.evaluate(() => window.game.player.sun);
  ok(s3 === s2.sun, `W5 停止后 0.7 秒阳光不变（${s2.sun}→${s3}），不再产出`);

  // W6: 催熟同步——造一株小喷菇在玩家旁边，开浇水 1 秒 → fed 涨约 5（0.2s×5）
  const f0 = await page.evaluate(() => {
    const g = window.game;
    const rm = g.rooms[0];
    let spot = null;
    for (let r = 0; r < rm.h && !spot; r++) for (let c = 0; c < rm.w && !spot; c++) {
      if (rm.tpl.grid[r][c] !== 1) continue;
      const col = rm.x + c, row = rm.y + r;
      if (g.plants.some(pl => pl.c === col && pl.r === row)) continue;
      spot = { col, row };
    }
    g.spawnPlant(spot.col, spot.row, 'puffshroom');
    const pl = g.plants.find(p => p.c === spot.col && p.r === spot.row);
    g.player.x = spot.col * 80 + 40;
    g.player.y = spot.row * 80 + 40 + 60;
    return { fed0: pl.fed, goal: pl.def.feed.goal };
  });
  await page.keyboard.press('Space'); // 开浇水
  await sleep(1100);
  const f1 = await page.evaluate((fed0) => {
    const g = window.game;
    const pl = g.plants.find(p => p.def.feed);
    return { fed: pl ? pl.fed : fed0 + 999, evolved: !pl };
  }, f0.fed0);
  await page.keyboard.press('Space'); // 关浇水
  ok(f1.evolved || (f1.fed - f0.fed0) >= 4, `W6 开浇水 1.1 秒：小喷菇喂大进度 ${f0.fed0}→${f1.evolved ? '已进化' : f1.fed}/${f0.goal}（催熟与浇水同步）`);

  // W7: 快速连按空格 → 状态翻转正常，无产出爆冲
  const q0 = await page.evaluate(() => window.game.player.sun);
  await page.keyboard.press('Space'); await sleep(60);
  await page.keyboard.press('Space'); await sleep(60);
  await page.keyboard.press('Space'); await sleep(500);
  const q1 = await page.evaluate(() => window.game.player.sun);
  ok(q1 - q0 <= 4, `W7 三连按后 0.5 秒阳光 +${q1 - q0}（≤4，状态翻转正常无爆冲）`);
  await page.keyboard.press('Space'); // 确保关闭（三连按后为开）

  // W8: 回归——房间外禁种仍生效
  const r1 = await page.evaluate(() => {
    const g = window.game;
    const c = Math.floor(g.cols / 2) + 4, r = Math.floor(g.rows / 2);
    g.openPlantMenu(c * 80 + 40, r * 80 + 40);
    return { open: g.menuOpen };
  });
  ok(!r1.open, `W8 回归：房间外种植菜单仍被拦截`);

  ok(pageErrors === 0, `P 全程无页面异常`);
  await page.evaluate(() => { window.game.setWatering(true); window.game.player.sun = 888; });
  await sleep(400);
  await page.screenshot({ path: ROOT + "/_v3920_game.png" });

  await browser.close();
  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
