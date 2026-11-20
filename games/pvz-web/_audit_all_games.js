// v4.0.24 全游戏巡检：加载每个游戏 → 截图 → 收集页面错误/404
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const GAMES = [
  ["pvz-web", "index.html"],
  ["pvz-web", "haunted-dorm.html"],
  ["tank-battle", "index.html"],
  ["billiards", "index.html"],
  ["racing-3d", "index.html"],
  ["kingdom-rush", "index.html"],
  ["thunder-wing", "index.html"],
  ["snake", "index.html"],
  ["geometry-wars", "index.html"],
  ["tetris-battle", "index.html"],
  ["calabash-brothers", "index.html"],
  ["little-prince", "little-prince.html"],
  ["huaxiazi", "index.html"],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  for (const [dir, file] of GAMES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const errors = [], notFound = [];
    page.on("pageerror", e => errors.push(e.message.slice(0, 120)));
    page.on("response", r => { if (r.status() === 404) notFound.push(r.url().split("/").slice(-1)[0]); });
    try {
      await page.goto(`file:///Users/clawbox/nexus-hub/${dir}/${file}`, { waitUntil: "networkidle0", timeout: 20000 });
    } catch (e) { errors.push("goto: " + e.message.slice(0, 80)); }
    await sleep(2200);
    // 尝试自动开始游戏（点最常见的开始按钮）
    try {
      await page.evaluate(() => {
        const idents = ["btn-start", "start-btn", "btn-play", "play-btn", "btn-1p", "btn-start-game", "startBtn"];
        for (const id of idents) { const b = document.getElementById(id); if (b) { b.click(); return; } }
        const btn = [...document.querySelectorAll("button, .menu-btn, .btn")].find(b => /开始| start /i.test(b.innerText) && b.offsetParent);
        if (btn) btn.click();
      });
    } catch (e) {}
    await sleep(2500);
    const tag = `${dir}_${file.replace(".html", "")}`;
    await page.screenshot({ path: `/Users/clawbox/nexus-hub/pvz-web/_audit_${tag}.png` });
    console.log(`== ${dir}/${file}`);
    if (errors.length) console.log("   页面错误:", [...new Set(errors)].slice(0, 3));
    if (notFound.length) console.log("   404:", [...new Set(notFound)].slice(0, 5));
    if (!errors.length && !notFound.length) console.log("   加载正常");
    await page.close();
  }
  await browser.close();
  console.log("巡检完成");
})();
