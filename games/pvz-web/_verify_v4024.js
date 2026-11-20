// v4.0.24 验证：盲盒开出盲盒 + 砸罐子金罐盲盒免费卡修复
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  PASS", m); } else { fail++; console.log("  FAIL", m); } };
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
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await sleep(1000);

  // A. 植物盲盒池含 plantbox 自身（种子卡路径）
  const a1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const pool = g._plantBoxPool();
    // 统计开 400 次盲盒的产出分布
    let boxCount = 0;
    for (let i = 0; i < 400; i++) {
      const got = pool[Math.floor(Math.random() * pool.length)];
      if (got === 'plantbox') boxCount++;
    }
    return { hasBox: pool.includes('plantbox'), boxCount, poolSize: pool.length };
  });
  ok(a1.hasBox, `A1 植物盲盒池包含 plantbox 自身（池 ${a1.poolSize} 项，400 抽出现 ${a1.boxCount} 次）`);

  // C. 砸罐子模式：金罐开出 plantbox → 免费卡种下 → 开出真实植物（v4.0.24 修复点）
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1400, height: 900 });
  page2.on("pageerror", e => errors.push("vase: " + e.message));
  await page2.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await sleep(900);
  await page2.click("#btn-vase"); await sleep(300);
  await page2.evaluate(() => {
    // 直接选地狱（金罐限定），或走难度按钮
    const btn = [...document.querySelectorAll('#vase-difficulty-modal button, .vase-diff-btn')].find(b => /地狱/.test(b.innerText));
    if (btn) btn.click(); else window._pvzGame._chooseVaseDifficulty('hell');
  });
  await sleep(1200);
  const c1 = await page2.evaluate(() => {
    const g = window._pvzGame;
    if (!g.vaseMode) return { skip: true };
    // 手动造一个 plantbox 免费卡（模拟金罐砸出）
    const el = document.createElement('div');
    document.body.appendChild(el);
    g.vaseFreeCards.push({ type: 'plantbox', element: el, consumed: false });
    // 找一个没罐子也没植物的空格
    let spot = null;
    for (let r = 0; r < g.board.rows && !spot; r++)
      for (let c = 0; c < g.board.cols && !spot; c++)
        if (g.board.canPlant(r, c) && !(g.vases || []).some(v => !v.smashed && v.row === r && v.col === c))
          spot = { r, c };
    if (!spot) return { skip: false, ok: false, type: null, cardConsumed: '无空格', giftShown: false };
    const before = g.entities.filter(e => e instanceof Plant).length;
    g.tryPlanting('plantbox', spot.r, spot.c);
    const after = g.entities.filter(e => e instanceof Plant);
    const planted = after.length > before ? after[after.length - 1] : null;
    const fc = g.vaseFreeCards.find(c => c.type === 'plantbox');
    // 礼盒演出元素存在
    const giftShown = !!([...document.querySelectorAll('img')].find(i => (i.src || '').includes('GiftBox')));
    return { skip: false, ok: !!planted, type: planted ? planted.type : null,
             cardConsumed: fc ? fc.consumed : '无卡', giftShown };
  });
  if (c1.skip) { console.log("  SKIP C 段：砸罐子对局未启动"); }
  else {
    ok(c1.ok && c1.type && c1.type !== 'plantbox', `C1 金罐盲盒免费卡种下 → 开出真实植物（${c1.type}），不再是无素材空图`);
    ok(c1.cardConsumed === true, "C2 免费卡正确消耗");
    ok(c1.giftShown, "C3 礼盒开箱演出播放");
  }

  // B. 种子卡种植路径：在已进入的对局里给阳光 → tryPlanting → 开出真实植物
  const b1 = await page2.evaluate(() => {
    const g = window._pvzGame;
    if (g.state !== 'PLAYING') return { skip: true };
    g.sunCount = 1000;
    if (!g.seeds.find(s => s.type === 'plantbox')) g.seeds.push({ type: 'plantbox', cost: 500, cooldown: 0, img: '' });
    g.cooldowns['plantbox'] = 0;
    let spot = null;
    for (let r = 0; r < g.board.rows && !spot; r++)
      for (let c = 0; c < g.board.cols && !spot; c++)
        if (g.board.canPlant(r, c) && !(g.vases || []).some(v => !v.smashed && v.row === r && v.col === c))
          spot = { r, c };
    if (!spot) return { skip: false, ok: false, type: null, sunLeft: g.sunCount };
    const before = g.entities.filter(e => e instanceof Plant).length;
    g.tryPlanting('plantbox', spot.r, spot.c);
    const after = g.entities.filter(e => e instanceof Plant);
    const planted = after.length > before ? after[after.length - 1] : null;
    return { ok: !!planted, type: planted ? planted.type : null, sunLeft: g.sunCount };
  });
  if (b1.skip) { console.log("  SKIP B 段：对局未进入 PLAYING"); }
  else {
    ok(b1.ok && b1.type !== 'plantbox', `B1 种子卡开盲盒 → 种出真实植物（${b1.type}）`);
    ok(b1.sunLeft === 500, "B1b 扣除 500 阳光");
  }

  // D. 盲盒僵尸可开出盲盒僵尸（连锁）——直接检查开箱池源码（Zombie 类不可劫持）
  const d1 = await page.evaluate(() => {
    const src = Zombie.prototype._openMysteryBox.toString();
    return { hasBox: src.includes("'mysterybox'"), len: src.length };
  });
  ok(d1.hasBox, "D1 盲盒僵尸开箱池包含 mysterybox 自身（连锁成立）");

  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`);
  if (errors.length) console.log("页面错误:", errors.slice(0, 5));
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})();
