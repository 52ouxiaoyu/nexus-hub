// 诊断：独立部署形态（pvz-web 为站点根）下点主页「返回」按钮会发生什么
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--no-sandbox"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto("http://127.0.0.1:8801/index.html", { waitUntil: "domcontentloaded" });
  await sleep(1200);
  await page.evaluate(() => {
    // 主菜单可能需要显示出来才能点到：直接对按钮 dispatch
    const b = document.getElementById('btn-back-gc');
    b.click();
  });
  await sleep(1500);
  const s = await page.evaluate(() => ({
    url: location.href,
    textLen: document.body ? document.body.innerText.trim().length : 0,
    textHead: document.body ? document.body.innerText.trim().slice(0, 80) : '',
    title: document.title
  }));
  console.log("点「返回」后:", JSON.stringify(s, null, 2));
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_diag_vs_back404.png" });
  await browser.close();
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
