// v4.0.23 游戏内截图：加载 + 版本徽标确认
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
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
  await page.goto("file://" + path.resolve(__dirname, "haunted-dorm.html?mode=2p&role1=peashooter&role2=sunshroom"), { waitUntil: "networkidle0" });
  await sleep(1500);
  const ver = await page.evaluate(() => (window.game && window.game.version) || document.body.innerText.match(/v4\.[\d.]+[^\s<]*/)?.[0] || "unknown");
  console.log("页面版本标识:", ver);
  await page.screenshot({ path: "_v4023_lobby.png" });
  await browser.close();
  console.log("done");
})();
