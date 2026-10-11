// v4.0.25 验证：①冰双向射手前/后向弹种 ②砸罐子融合免费卡卡面自适应 ③对战选卡僵尸合成图标
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS " : "  FAIL ") + msg); cond ? pass++ : fail++; };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await sleep(800);

  // ===== A. 冰双向射手：traits + 前/后向弹种 =====
  console.log("A. 冰双向射手（fusion_splitpea_snowpea）");
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
  await sleep(1000);

  const a = await page.evaluate(() => {
    const g = window._pvzGame;
    g.loop = () => {}; // 冻结真实循环，手动驱动
    const p = new Plant(g, 'fusion_splitpea_snowpea');
    if (!g.board.addPlant(p, 1, 2)) return { err: 'addPlant失败' };
    // 前后各放一只僵尸
    const zF = new Zombie(g, 1, 'normal'); g.entities.push(zF); zF.x = p.x + 250;
    const zB = new Zombie(g, 1, 'normal'); g.entities.push(zB); zB.x = p.x - 160;
    for (let i = 0; i < 130; i++) p.update(0.016); // ≈2.1s > fireRate 1.5s
    const peas = g.entities.filter(e => e instanceof Projectile && !e.isDead);
    const fwd = peas.filter(pr => pr.x > p.x).map(pr => pr.type);
    const back = peas.filter(pr => pr.x < p.x).map(pr => pr.type);
    return {
      traits: p.traits, isSnow: p.hasTrait('snowpea'), isSplit: p.hasTrait('splitpea'),
      fwd, back, nF: fwd.length, nB: back.length,
    };
  });
  if (a.err) { ok(false, "A0 开局/种植物: " + a.err); }
  else {
    ok(a.isSnow && a.isSplit, `A1 traits 含 splitpea+snowpea（${JSON.stringify(a.traits)}）`);
    ok(a.nF > 0 && a.fwd.every(t => t === 'snowpea'), `A2 前向弹全是寒冰豌豆（${a.nF} 发: ${[...new Set(a.fwd)].join(',')}）`);
    ok(a.nB > 0 && a.back.every(t => t === 'backsnowpea'), `A3 后向弹全是后向冰豆（${a.nB} 发: ${[...new Set(a.back)].join(',')}）`);
    const dmgOk = await page.evaluate(() => {
      const g = window._pvzGame;
      const pr = g.entities.find(e => e instanceof Projectile && e.type === 'backsnowpea');
      return pr ? pr.damage : null;
    });
    ok(dmgOk === 40, `A4 后向冰豆伤害 40（实测 ${dmgOk}）`);
  }

  // ===== B. 砸罐子融合免费卡卡面自适应（爆炸弹跳）=====
  console.log("B. 融合免费卡卡面（fusion_boomsquash）");
  const b = await page.evaluate(() => {
    const g = window._pvzGame;
    g._grantVasePlantCard('fusion_boomsquash', 'golden');
    const el = [...document.querySelectorAll('#seed-bank .vase-free-card')].pop();
    return { found: !!el, type: el ? el.dataset.type : null };
  });
  ok(b.found && b.type === 'fusion_boomsquash', "B1 免费卡已入种子栏");
  await sleep(700); // 等卡面图加载 + fitOversizedCardArt
  const b2 = await page.evaluate(() => {
    const el = [...document.querySelectorAll('#seed-bank .vase-free-card')].pop();
    const stage = el.querySelector('div[style*="scale"]');
    const bodyImg = stage ? stage.querySelector('img') : null;
    if (!stage || !bodyImg) return { err: '找不到stage/bodyImg' };
    const m = stage.style.transform.match(/scale\(([\d.]+)\)/);
    const scale = m ? parseFloat(m[1]) : 1;
    const card = el.getBoundingClientRect();
    const r = bodyImg.getBoundingClientRect();
    // 内容视觉中心应回到卡面锚点附近：bodyImg 中心 y 与卡面 top:20px 锚点(卡顶+20*?)对比
    // 直接验证：transform 含 calc 且 scale < 0.5
    return {
      scale, hasCalc: bodyImg.style.transform.includes('calc'),
      natural: bodyImg.naturalWidth + 'x' + bodyImg.naturalHeight,
      cardH: Math.round(card.height), imgH: Math.round(r.height),
    };
  });
  if (b2.err) ok(false, "B2 " + b2.err);
  else {
    ok(b2.natural === '100x226', `B2 主体素材为窝瓜画布（${b2.natural}）`);
    ok(b2.hasCalc && b2.scale < 0.5, `B3 自适应生效：scale=${b2.scale} transform含calc（原体系恒 0.5）`);
  }
  // 截图种子栏目检
  const bankRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('#seed-bank .vase-free-card')].pop();
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y - 10), width: r.width + 300, height: r.height + 20 };
  });
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v4025_card_zoom.png", clip: bankRect });

  // ===== C. 对战僵尸方选卡合成图标 =====
  console.log("C. 僵尸方选卡合成图标");
  const c1 = await page.evaluate(() => {
    const g = window._pvzGame;
    g.showVsZombieChooser();
    const cardFor = (t) => [...document.querySelectorAll('#vz-grid .vz-card')].find(c => c.dataset.type === t);
    const out = {};
    for (const t of ['peahead', 'mysterybox', 'tallnuthead', 'nuthead']) {
      const card = cardFor(t);
      if (!card) { out[t] = { err: '无卡' }; continue; }
      const wrap = card.querySelector('.zcard-fusion');
      const head = wrap ? wrap.querySelector('.zf-head') : null;
      const hi = head ? head.querySelector('img') : null;
      if (!hi) { out[t] = { err: '无头图' }; continue; }
      const hr = hi.getBoundingClientRect();
      const cr = head.getBoundingClientRect();
      out[t] = {
        imgW: Math.round(hr.width), imgH: Math.round(hr.height),
        boxH: Math.round(cr.height),
        fullyInside: hr.top >= cr.top - 1 && hr.bottom <= cr.bottom + 1,
        squareOrRatio: Math.abs(hr.width - hr.height) < 2, // 71×71 方形头（pea/snow）
      };
    }
    return out;
  });
  ok(c1.peahead && !c1.peahead.err && c1.peahead.squareOrRatio, `C1 豌豆头不再被强拉成 46px（${c1.peahead && c1.peahead.imgW}x${c1.peahead && c1.peahead.imgH}，应等宽等高）`);
  ok(c1.mysterybox && !c1.mysterybox.err && c1.mysterybox.fullyInside, `C2 盲盒礼盒完整可见（img ${c1.mysterybox && c1.mysterybox.imgH}px / 容器 ${c1.mysterybox && c1.mysterybox.boxH}px）`);
  ok(c1.tallnuthead && !c1.tallnuthead.err, `C3 高坚果头正常渲染（${c1.tallnuthead && c1.tallnuthead.imgW}x${c1.tallnuthead && c1.tallnuthead.imgH}）`);

  const gridRect = await page.evaluate(() => {
    const r = document.getElementById('vz-grid').getBoundingClientRect();
    return { x: r.x, y: Math.max(0, r.y), width: r.width, height: r.height };
  });
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v4025_chooser.png", clip: gridRect });

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("脚本异常:", e); process.exit(2); });
