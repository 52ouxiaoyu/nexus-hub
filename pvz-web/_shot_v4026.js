// v4.0.26 截图：主页菜单 + 内嵌守屋开局画面
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox", "--disable-renderer-backgrounding"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await sleep(800);
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v4026_menu.png" });

  // 走完整流程进守屋
  await page.click("#btn-dorm"); await sleep(200);
  await page.click("#btn-dorm-1p"); await sleep(200);
  await page.click(".dorm-skin-btn[data-role='peashooter']"); await sleep(2500);
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v4026_embedded.png" });

  const url = await page.evaluate(() => location.pathname.split("/").pop());
  console.log("embedded at:", url);
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });
