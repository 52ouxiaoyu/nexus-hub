// v4.0.26 验证：守屋大作战并入主站（index.html 内嵌界面，不再跳转独立网页）
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS " : "  FAIL ") + msg); cond ? pass++ : fail++; };
const ROOT = "/Users/clawbox/nexus-hub/pvz-web";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });

  // ===== A. 主站加载：守屋界面默认隐藏、无报错 =====
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("file://" + path.resolve(ROOT, "index.html"), { waitUntil: "networkidle0" });
  await sleep(800);
  const a = await page.evaluate(() => ({
    screenHidden: document.getElementById("dorm-screen").style.display === "" &&
                  getComputedStyle(document.getElementById("dorm-screen")).display === "none",
    hasStart: typeof window.startHauntedDorm === "function",
    noAutoGame: window.game === undefined || window.game === null,
    skeleton: !!document.getElementById("dorm-container") && !!document.getElementById("dorm-ui") &&
              !!document.getElementById("world1") && !!document.getElementById("minimap"),
    mainOK: !!document.getElementById("game-container"),
  }));
  ok(a.screenHidden, "A1 主页上守屋界面默认隐藏");
  ok(a.hasStart, "A2 startHauntedDorm 启动入口已就绪");
  ok(a.noAutoGame, "A3 主页不会自动开局（仅独立页自动）");
  ok(a.skeleton, "A4 守屋 DOM 骨架完整（dorm-container/world1/minimap）");
  ok(a.mainOK, "A5 主游戏容器不受影响");
  ok(errors.length === 0, `A6 页面零报错${errors.length ? "（" + errors[0] + "…）" : ""}`);

  // ===== B. 菜单流程 1p：选卡 → 原页开局，URL 不变 =====
  await page.click("#btn-dorm"); await sleep(200);
  const b0 = await page.evaluate(() => getComputedStyle(document.getElementById("dorm-mode-modal")).display);
  ok(b0 === "flex", "B0 点击守屋卡片弹出模式选择");
  await page.click("#btn-dorm-1p"); await sleep(200);
  await page.click(".dorm-skin-btn[data-role='peashooter']"); await sleep(600);
  const b = await page.evaluate(() => ({
    screenShown: document.getElementById("dorm-screen").style.display === "block",
    isDorm: window.game instanceof HauntedDorm,
    mode: window.game.gameMode,
    url: location.pathname.split("/").pop() + location.search,
    worldTiles: document.querySelectorAll("#world1 .tile").length,
    hudVisible: document.getElementById("hud-p1").offsetParent !== null || document.getElementById("hud-p1").getClientRects().length > 0,
    sunText: document.getElementById("sun1") !== null,
  }));
  ok(b.screenShown, "B1 守屋界面原页展开（display:block）");
  ok(b.isDorm && b.mode === "1p", "B2 页内直接开局：1p 模式实例创建");
  ok(b.url === "index.html", `B3 URL 保持 index.html 不跳转（当前 ${b.url}）`);
  ok(b.worldTiles > 100, `B4 大地图已生成（${b.worldTiles} 块地块）`);
  ok(b.hudVisible && b.sunText, "B5 内嵌 HUD 正常显示");

  // ===== C. 重复开局守护：直接再开一局僵尸阵营，旧循环停转 =====
  const c = await page.evaluate(() => {
    const oldGen = window.game._dormGen;
    window.startHauntedDorm({ mode: "1p", faction: "zombie" });
    return { gen: window.__dormGen, oldGen, isZombie: window.game.isZombieFaction,
             hp: window.game.player.hp, overOld: undefined };
  });
  ok(c.gen === 2 && c.oldGen === 1, "C1 重复开局代际号递增（1→2）");
  ok(c.isZombie && c.hp > 100, "C2 新实例为僵尸阵营（血量=鬼王配置）");

  // ===== D. 2p 流程：两次选皮肤 → player2 就位 =====
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1400, height: 900 });
  await page2.goto("file://" + path.resolve(ROOT, "index.html"), { waitUntil: "networkidle0" });
  await sleep(500);
  await page2.click("#btn-dorm"); await sleep(150);
  await page2.click("#btn-dorm-2p"); await sleep(150);
  await page2.click(".dorm-skin-btn[data-role='sunflower']"); await sleep(150); // P1
  const d0 = await page2.evaluate(() => ({
    title: document.getElementById("dorm-role-title").innerText,
    notStarted: window.game === undefined || window.game === null,
  }));
  ok(d0.title.includes("P2"), `D0 P1 选完后提示选择 P2（${d0.title}）`);
  ok(d0.notStarted, "D0b 双人模式 P1 选完尚未开局");
  await page2.click(".dorm-skin-btn[data-role='wallnut']"); await sleep(500);
  const d = await page2.evaluate(() => ({
    mode: window.game.gameMode,
    has2p: !!window.game.player2,
    r1: window.game.role1, r2: window.game.role2,
  }));
  ok(d.mode === "2p" && d.has2p, "D1 双人模式页内开局，player2 就位");
  ok(d.r1 === "sunflower" && d.r2 === "wallnut", `D2 皮肤各自绑定（P1=${d.r1} P2=${d.r2}）`);

  // ===== F. 内嵌局真实运行：游戏时间推进（必须在开新标签页前测，避免后台 rAF 节流假失败） =====
  const f = await page2.evaluate(async () => {
    const t0 = window.game.gameTime;
    await new Promise(r => setTimeout(r, 1200));
    return { advanced: window.game.gameTime > t0, notOver: !window.game.over };
  });
  ok(f.advanced && f.notOver, "F1 内嵌对局真实循环运行中（gameTime 推进）");

  // ===== E. 旧独立页直链兼容 =====
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 1400, height: 900 });
  await page3.goto("file://" + path.resolve(ROOT, "haunted-dorm.html?mode=2p&role1=peashooter&role2=sunshroom"), { waitUntil: "networkidle0" });
  await sleep(700);
  const e1 = await page3.evaluate(() => ({
    isDorm: window.game instanceof HauntedDorm,
    mode: window.game.gameMode, r2: window.game.role2,
    visible: getComputedStyle(document.getElementById("dorm-screen")).display === "block",
  }));
  ok(e1.isDorm && e1.mode === "2p" && e1.r2 === "sunshroom", "E1 旧直链 haunted-dorm.html?mode=2p… 兼容（自动开局）");
  ok(e1.visible, "E2 独立页守屋界面常显（body.dorm-page）");

  const page4 = await browser.newPage();
  await page4.setViewport({ width: 1400, height: 900 });
  await page4.goto("file://" + path.resolve(ROOT, "haunted-dorm.html"), { waitUntil: "networkidle0" });
  await sleep(700);
  const e3 = await page4.evaluate(() => window.game instanceof HauntedDorm && window.game.gameMode === "1p");
  ok(e3, "E3 独立页无参数访问仍自动开局 1p（行为不变）");

  // ===== G. 主站其余模式回归入口：砸罐子卡片还能点开 =====
  const page5 = await browser.newPage();
  await page5.setViewport({ width: 1400, height: 900 });
  await page5.goto("file://" + path.resolve(ROOT, "index.html"), { waitUntil: "networkidle0" });
  await sleep(500);
  await page5.click("#btn-vase"); await sleep(200);
  const g1 = await page5.evaluate(() => {
    const modal = document.getElementById("difficulty-modal");
    return modal && modal.style.display === "flex";
  });
  ok(g1, "G1 主站其他模式入口不受影响（砸罐子难度弹窗正常）");

  await browser.close();
  console.log(`\n结果：${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
