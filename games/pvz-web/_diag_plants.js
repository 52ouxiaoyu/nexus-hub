// v4.0.24 诊断 v2：每批新开对局，全植物图片完整性检查 + 截图目检
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

  // 先开一局拿全类型表
  let page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await sleep(800);
  const allTypes = await page.evaluate(() => {
    const pool = [...new Set(window._pvzGame._plantBoxPool())].concat((window._pvzGame.seeds || []).map(s => s.type));
    return [...new Set(pool)];
  });
  console.log("植物类型总数:", allTypes.length);
  await page.close();

  const PER = 40;
  const problems = [];
  for (let batch = 0; batch * PER < allTypes.length; batch++) {
    const slice = allTypes.slice(batch * PER, (batch + 1) * PER);
    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
    await sleep(800);
    await page.click("#btn-vs"); await sleep(200);
    await page.click("#vs-normal"); await sleep(200);
    await page.evaluate(() => {
      for (const c of [...document.querySelectorAll("#chooser-grid .chooser-card")].slice(0, 8)) c.click();
      document.getElementById("btn-lets-rock").click();
    });
    await sleep(200);
    await page.evaluate(() => {
      for (const c of [...document.querySelectorAll("#vz-grid .vz-card")].slice(0, 8)) c.click();
      document.getElementById("vz-rock").click();
    });
    await sleep(900);
    await page.evaluate((types) => {
      const g = window._pvzGame;
      // 冻结植物行为（防一次性植物自爆）
      if (!Plant.prototype.__frozen) {
        Plant.prototype.__frozen = true;
        Plant.prototype.update = function () {};
      }
      types.forEach((t, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        try {
          const p = new Plant(g, t);
          if (!g.board.addPlant(p, r, c)) return;
        } catch (e) { problems.push({ t, issue: "创建异常:" + e.message }); }
      });
    }, slice);
    await sleep(1500);

    const checks = await page.evaluate((types) => {
      const g = window._pvzGame;
      const res = [];
      for (const t of types) {
        const p = g.entities.find(e => e instanceof Plant && e.type === t && e.element);
        if (!p) { res.push({ t, issue: "未找到实体" }); continue; }
        const img = p.element.tagName === "IMG" ? p.element : p.element.querySelector("img");
        if (!img) { res.push({ t, issue: "无img" }); continue; }
        const nw = img.naturalWidth, nh = img.naturalHeight;
        if (!nw) { res.push({ t, issue: "图片未加载(404?)" }); continue; }
        const r = img.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) { res.push({ t, issue: "渲染尺寸0", pos: [Math.round(r.x), Math.round(r.y)] }); continue; }
        const natRatio = nw / nh, renRatio = r.width / r.height;
        const stretch = Math.abs(natRatio - renRatio) / natRatio;
        if (stretch > 0.18) res.push({ t, issue: `拉伸${Math.round(stretch * 100)}%`, nat: `${nw}x${nh}`, ren: `${Math.round(r.width)}x${Math.round(r.height)}` });
        // 渲染尺寸 vs 自然尺寸的比例，找出明显偏小（素材残缺感）的
        const scale = r.width / nw;
        if (scale < 0.8) res.push({ t, issue: `渲染偏小scale=${scale.toFixed(2)}` });
      }
      return res;
    }, slice);
    if (checks.length) problems.push(...checks);
    console.log(`批次 ${batch + 1}: ${slice.length} 株，检查问题 ${checks.length}`);
    await page.screenshot({ path: `/Users/clawbox/nexus-hub/pvz-web/_diag_plants_b${batch + 1}.png` });
    await page.close();
  }

  console.log("\n汇总问题:", problems.length ? JSON.stringify(problems, null, 1) : "无");
  await browser.close();
})();
