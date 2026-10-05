// v3.81.9 验证：合成图标=身体+头（战场同比例）+ vz-grid 两排多一个
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  PASS", msg); } else { fail++; console.log("  FAIL", msg); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--allow-file-access-from-files", "--no-sandbox"],
    userDataDir: "/tmp/pptr-prof-" + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  let pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1000));

  // ===== T1 合成图标结构：9 种植物头/盲盒 = 身体+头，比例=战场 =====
  const t1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const types = Object.keys(Zombie.PLANT_HEAD_CFG);
    const out = { types, icons: {} };
    types.forEach(t => {
      const el = g.zombieIconEl(t);
      const body = el.querySelector('.zf-body'), head = el.querySelector('.zf-head');
      out.icons[t] = {
        isWrap: el.className === 'zcard-fusion',
        bodyW: body ? parseInt(body.style.width) : null,
        bodyH: body ? parseInt(body.style.height) : null,
        headW: head ? parseInt(head.style.width) : null,
        headH: head ? parseInt(head.style.height) : null,
        headTop: head ? parseInt(head.style.top) : null,
        headLeft: head ? parseInt(head.style.left) : null,
      };
    });
    const n = g.zombieIconEl('normal');
    out.normalIsImg = n.tagName === 'IMG';
    return out;
  });
  ok(t1.types.length === 9, `T1a 合成类型 9 种（${t1.types.join(',')}）`);
  ok(t1.normalIsImg, 'T1b 普通僵尸仍是单图');
  let allOk = true;
  for (const [t, i] of Object.entries(t1.icons)) {
    // 身体=166×(52/144)≈60 宽 52 高；头比例=cfg.w/144×52；头顶=0
    const expBodyW = Math.round(166 * 52 / 144);
    const propOk = i.bodyH === 52 && i.bodyW === expBodyW && i.headW >= 10 && i.headTop === 0 && i.headLeft > 0;
    if (!propOk) { allOk = false; console.log("   BAD", t, JSON.stringify(i)); }
  }
  ok(allOk, 'T1c 全部合成图标：身体 60×52、头锚点 top=0/left>0（战场同比例）');

  // ===== T2 我是僵尸卡带视觉：把全部合成图标塞进临时行截图 =====
  await page.click("#btn-zombie"); await new Promise(r => setTimeout(r, 200));
  await page.click("#zdiff-hell"); await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const g = window._pvzGame;
    g.state = 'PLAYING';
    const bank = document.getElementById('zombie-bank');
    const demo = document.createElement('div');
    demo.id = '_demo_icons';
    demo.style.cssText = 'display:flex;gap:6px;position:absolute;top:56px;left:160px;z-index:9999;background:#2e2438;padding:6px;border-radius:8px;';
    Object.keys(Zombie.PLANT_HEAD_CFG).forEach(t => {
      const c = document.createElement('div');
      c.className = 'zcard';
      c.style.position = 'relative';
      c.appendChild(g.zombieIconEl(t));
      const nm = document.createElement('span'); nm.className = 'z-name'; nm.textContent = g.zombieName(t);
      c.appendChild(nm);
      demo.appendChild(c);
    });
    bank.parentElement.appendChild(demo);
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3819_icons.png", clip: { x: 150, y: 40, width: 900, height: 120 } });
  ok(true, 'T2 合成图标卡带截图已生成');

  // ===== T3 vz-grid：12 列两排多一个 =====
  await page.evaluate(() => {
    document.getElementById('zombie-bank').style.display = 'none';
    document.getElementById('_demo_icons')?.remove();
    window._pvzGame.state = 'MENU';
    document.getElementById('start-menu').style.display = 'block';
  });
  await new Promise(r => setTimeout(r, 200));
  await page.click("#btn-vs"); await new Promise(r => setTimeout(r, 200));
  await page.click("#vs-normal"); await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => {
    const isSun = t => ["sunflower","sunshroom","twinsunflower"].includes(t);
    const picked = [];
    for (const c of [...document.querySelectorAll("#chooser-grid .chooser-card")]) {
      if (picked.length >= 8) break;
      if (isSun(c.dataset.type) && picked.some(t => isSun(t))) continue;
      c.click(); picked.push(c.dataset.type);
    }
    document.getElementById("btn-lets-rock").click();
  });
  await new Promise(r => setTimeout(r, 400));
  const t3 = await page.evaluate(() => {
    const grid = document.getElementById("vz-grid");
    const cards = [...grid.querySelectorAll(".vz-card")];
    const rows = {};
    cards.forEach(c => { const t = Math.round(c.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; });
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    return { count: cards.length, rows: Object.values(rows), cols, gridW: grid.offsetWidth };
  });
  ok(t3.count === 25, `T3a 25 张僵尸卡（${t3.count}）`);
  ok(t3.cols === 12, `T3b 网格 12 列（${t3.cols}）`);
  ok(t3.rows.length === 3 && t3.rows[0] === 12 && t3.rows[1] === 12 && t3.rows[2] === 1, `T3c 两排多一个（行分布 ${t3.rows.join('+')}）`);
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3819_vzgrid.png" });

  // ===== T4 对战底栏小尺寸合成图标不溢出 =====
  await page.evaluate(() => {
    for (const c of [...document.querySelectorAll("#vz-grid .vz-card")].slice(0, 8)) c.click();
    document.getElementById("vz-rock").click();
  });
  await new Promise(r => setTimeout(r, 800));
  const t4 = await page.evaluate(() => {
    const bar = document.getElementById('vs-bottom-bar');
    const cards = [...bar.querySelectorAll('.zcard')];
    const fusions = cards.filter(c => c.querySelector('.zcard-fusion'));
    let overflow = 0;
    cards.forEach(c => { if (c.scrollWidth > c.clientWidth + 2 || c.scrollHeight > c.clientHeight + 2) overflow++; });
    return { total: cards.length, fusions: fusions.length, overflow };
  });
  ok(t4.total === 8 && t4.overflow === 0, `T4a 底栏 8 卡无溢出（${t4.total} 卡, 溢出 ${t4.overflow}）`);
  ok(true, `T4b 底栏含 ${t4.fusions} 张合成图标（取决于抽选）`);
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3819_vsbar.png", clip: { x: 100, y: 760, width: 1200, height: 140 } });

  ok(pageErrors.length === 0, `T5 无页面错误（${pageErrors.length}）`);
  if (pageErrors.length) console.log("ERRORS:", pageErrors.join(' | '));

  await browser.close();
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
