// 诊断：双人对战结束后「再玩一局」/「退出」是否可能出现纯空白画面
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
const ROOT = "/Users/clawbox/nexus-hub/pvz-web";
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
  let errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === 'error') errors.push("console: " + m.text()); });

  const forceEnd = () => page.evaluate(() => {
    const g = window._pvzGame;
    g.vsMode = true;
    g.state = 'PLAYING';
    g.vsPlantWin(); // 触发结算面板
  });

  // ============ 路径 A：再玩一局（restartVs → 重新选卡） ×3 ============
  for (let round = 1; round <= 3; round++) {
    errors.length = 0;
    await page.goto("file://" + path.resolve(ROOT + "/index.html"), { waitUntil: "networkidle0" });
    await sleep(800);
    await page.click("#btn-vs"); await sleep(200);
    await page.click("#vs-normal"); await sleep(300);
    await forceEnd();
    await sleep(300);
    const s1 = await page.evaluate(() => ({
      overlay: !!document.querySelector('.vase-win-overlay'),
      title: document.querySelector('.vase-win-title') ? document.querySelector('.vase-win-title').innerText : null
    }));
    await page.click("#vs-replay");
    await sleep(500);
    const s2 = await page.evaluate(() => ({
      chooser: document.getElementById('seed-chooser') ? getComputedStyle(document.getElementById('seed-chooser')).display : 'missing',
      overlayGone: !document.querySelector('.vase-win-overlay'),
      menu: document.getElementById('start-menu') ? getComputedStyle(document.getElementById('start-menu')).display : 'missing',
      bodyBg: getComputedStyle(document.body).backgroundColor,
      visibleImgs: [...document.images].filter(im => im.complete && im.naturalWidth > 0).length
    }));
    await page.screenshot({ path: ROOT + `/_diag_vs_replay${round}.png` });
    console.log(`A${round} 结算面板: ${s1.overlay ? s1.title : '未出现'} | 点再玩一局后: 选卡页=${s2.chooser} 覆盖层移除=${s2.overlayGone} 主菜单=${s2.menu} 错误=${errors.length ? errors.join(' | ') : '无'}`);
  }

  // ============ 路径 B：退出（location.reload → 主菜单） ×3 ============
  for (let round = 1; round <= 3; round++) {
    errors.length = 0;
    await page.goto("file://" + path.resolve(ROOT + "/index.html"), { waitUntil: "networkidle0" });
    await sleep(800);
    await page.click("#btn-vs"); await sleep(200);
    await page.click("#vs-normal"); await sleep(300);
    await forceEnd();
    await sleep(300);
    await page.click("#vs-exit");
    await sleep(1500); // 等 reload 完成
    const s = await page.evaluate(() => ({
      url: location.pathname.split('/').pop(),
      menu: document.getElementById('start-menu') ? getComputedStyle(document.getElementById('start-menu')).display : 'missing',
      gameObj: !!window._pvzGame,
      bodyChildren: document.body.children.length,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      visibleImgs: [...document.images].filter(im => im.complete && im.naturalWidth > 0).length
    }));
    await page.screenshot({ path: ROOT + `/_diag_vs_exit${round}.png` });
    console.log(`B${round} 点退出后: url=${s.url} 主菜单=${s.menu} 游戏对象=${s.gameObj} body子节点=${s.bodyChildren} 可见图=${s.visibleImgs} 错误=${errors.length ? errors.join(' | ') : '无'}`);
  }

  await browser.close();
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
