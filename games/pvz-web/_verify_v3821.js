// v3.82.1 验证：综合战力重定价（技能加价/肉盾打折/撑杆<舞王）+ 巨人图标=巨型普通僵尸 + 植物头不被僵尸头盖住
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

  // ===== T1 roster 数据：25 种、关键新价、降序、撑杆<舞王 =====
  const t1 = await page.evaluate(() => {
    const r = window._pvzGame.constructor.VS_ZOMBIE_ROSTER;
    const m = Object.fromEntries(r);
    return {
      count: r.length,
      prices: m,
      descending: r.every(([t, p], i) => i === 0 || p <= r[i - 1][1]),
      min: Math.min(...r.map(x => x[1])),
    };
  });
  ok(t1.count === 25, `T1a 花名册 25 种（${t1.count}）`);
  const exp = { gargantuar: 500, zomboni: 380, tallnuthead: 350, screendoor: 320, football: 300,
    dancing: 220, machinegunhead: 200, buckethead: 185, snowpeahead: 140, polevaulting: 125,
    peahead: 100, garliczombie: 105, normal: 50, imp: 40, sunhead: 75 };
  let priceOk = true;
  for (const [t, p] of Object.entries(exp)) if (t1.prices[t] !== p) { priceOk = false; console.log("   BAD", t, t1.prices[t], "!=", p); }
  ok(priceOk, 'T1b 关键价格全部正确（巨人500/高坚果头350/铁门320/舞王220/机枪头200/撑杆125/豌豆头100/小鬼40…）');
  ok(t1.descending, 'T1c 卡单按价格降序排列');
  ok(t1.prices.dancing > t1.prices.polevaulting, `T1d 撑杆(${t1.prices.polevaulting}) < 舞王(${t1.prices.dancing})`);
  ok(t1.prices.machinegunhead > 50 && t1.prices.snowpeahead > 50 && t1.prices.peahead > 50 && t1.prices.garliczombie > 50,
    'T1e 技能僵尸（机枪/寒冰/豌豆/大蒜头）全部高于无技能普僵 50');

  // ===== T2 巨人图标 = 巨型普通僵尸（Zombie.gif + 放大暗色），非 LGBOSS =====
  const t2 = await page.evaluate(() => {
    const g = window._pvzGame;
    const el = g.zombieIconEl('gargantuar');
    return {
      isImg: el.tagName === 'IMG',
      src: el.getAttribute('src'),
      transform: el.style.transform,
      filter: el.style.filter,
    };
  });
  ok(t2.isImg && t2.src.includes('Zombies/Zombie/Zombie.gif') && !t2.src.includes('LGBOSS'),
    `T2a 巨人卡面=巨型普通僵尸图（${t2.src.split('/').pop()}）`);
  ok(t2.transform.includes('scale(1.35)') && t2.filter.includes('brightness(0.8)') && t2.filter.includes('contrast(1.2)'),
    'T2b 巨人图标放大1.35倍+战场同款暗色滤镜');

  // ===== T3 植物头图标：zf-head 必须在 zf-body 之上（DOM 后者在上） =====
  const t3 = await page.evaluate(() => {
    const g = window._pvzGame;
    const types = ['peahead', 'machinegunhead', 'snowpeahead', 'garliczombie', 'sunhead', 'tallnuthead', 'jalapenohead', 'nuthead'];
    const out = {};
    types.forEach(t => {
      const w = g.zombieIconEl(t);
      const head = w.querySelector('.zf-head'), body = w.querySelector('.zf-body');
      out[t] = !!(head && body) && !!(head.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING);
      // PRECEDING: body 在 head 之前 → head 绘制在上层 ✓
    });
    return out;
  });
  ok(Object.values(t3).every(Boolean), `T3 全部 ${Object.keys(t3).length} 种植物头图标：头层级在身体之上（不被僵尸头盖住）`);

  // ===== T4 真实菜单进入对战选僵尸页：卡面价目渲染 =====
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
  const t4 = await page.evaluate(() => {
    const g = window._pvzGame;
    const cost = g.vsZombieCost();
    const cards = [...document.querySelectorAll("#vz-grid .vz-card")];
    const check = {};
    cards.forEach(c => {
      const t = c.dataset.type;
      const txt = c.querySelector('.vz-cost')?.textContent || '';
      check[t] = txt === '🧠' + cost[t];
    });
    return { count: cards.length, allMatch: Object.values(check).every(Boolean), check,
      gargaSrc: cards.find(c => c.dataset.type === 'gargantuar')?.querySelector('img')?.getAttribute('src') };
  });
  ok(t4.count === 25, `T4a 选僵尸页 25 卡（${t4.count}）`);
  ok(t4.allMatch, 'T4b 每张卡 🧠价 与新战力价目一致');
  ok(t4.gargaSrc && t4.gargaSrc.includes('Zombies/Zombie/Zombie.gif'), 'T4c 网格里巨人卡实际渲染=巨型普通僵尸图');

  // ===== T5 物理点击选卡：点机枪头选中 → 再点取消 =====
  const t5before = await page.evaluate(() => window._pvzGame.vsZombiePicks.length);
  const mg = await page.evaluate(() => {
    const c = [...document.querySelectorAll("#vz-grid .vz-card")].find(x => x.dataset.type === 'machinegunhead');
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(mg.x, mg.y); await new Promise(r => setTimeout(r, 150));
  const t5mid = await page.evaluate(() => ({ picks: window._pvzGame.vsZombiePicks.slice(), hasClass: [...document.querySelectorAll("#vz-grid .vz-card")].find(x => x.dataset.type === 'machinegunhead').classList.contains('picked') }));
  await page.mouse.click(mg.x, mg.y); await new Promise(r => setTimeout(r, 150));
  const t5after = await page.evaluate(() => window._pvzGame.vsZombiePicks.length);
  ok(t5before === 0 && t5mid.picks.includes('machinegunhead') && t5mid.hasClass && t5after === 0,
    `T5 物理点击选卡/取消（0→${t5mid.picks.join(',')||'无'}→0）`);
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3821_vzgrid.png" });

  // ===== T6 真实开局 + 物理点卡召唤：新价格扣脑子（机枪头 200）=====
  await page.evaluate(() => {
    const g = window._pvzGame;
    g.vsZombiePicks = ['machinegunhead', 'imp', 'normal', 'dancing', 'buckethead', 'tallnuthead', 'screendoor', 'peahead'];
    const rock = document.getElementById("vz-rock");
    rock.disabled = false; // T5 取消选卡后按钮处于 disabled，直接 click 无效
    rock.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const summon = await page.evaluate(() => {
    const bar = document.getElementById('vs-bottom-bar');
    const card = [...bar.querySelectorAll('.zcard')].find(c => c.dataset.type === 'machinegunhead');
    const r = card.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, sun: window._pvzGame.zombieSun, disabled: card.classList.contains('disabled') };
  });
  await page.mouse.click(summon.x, summon.y); await new Promise(r => setTimeout(r, 400));
  const t6 = await page.evaluate(() => {
    const g = window._pvzGame;
    return { sun: g.zombieSun, zombies: g.entities.filter(e => typeof Zombie !== 'undefined' && e instanceof Zombie && e.type === 'machinegunhead').length };
  });
  ok(summon.sun === 300 && !summon.disabled, `T6a 开局 🧠300、机枪头卡可点（disabled=${summon.disabled}）`);
  ok(t6.zombies === 1 && t6.sun === 100, `T6b 物理点卡召唤成功：机枪头(🧠200)上场，脑子 300→${t6.sun}，场上机枪头=${t6.zombies}`);

  // ===== T7 舞王 220 > 300 脑子时买不起→disabled 联动（顺带验证高价新价）=====
  const t7 = await page.evaluate(() => {
    const bar = document.getElementById('vs-bottom-bar');
    const card = [...bar.querySelectorAll('.zcard')].find(c => c.dataset.type === 'dancing');
    return { disabled: card.classList.contains('disabled'), sun: window._pvzGame.zombieSun };
  });
  ok(t7.disabled && t7.sun === 100, `T7 脑子 ${t7.sun} < 舞王 🧠220 → 卡面正确置灰`);

  // ===== T8 HelpGuide 新文案 =====
  const t8 = await page.evaluate(async () => {
    const src = await (await fetch('js/HelpGuide.js')).text();
    return { hasImp40: src.includes('🧠40 小鬼'), hasTall350: src.includes('高坚果头 🧠350'), hasSkillNote: src.includes('技能价值') };
  });
  ok(t8.hasImp40 && t8.hasTall350 && t8.hasSkillNote, 'T8 帮助·双人对战文案同步新价目');

  ok(pageErrors.length === 0, `T9 无页面错误（${pageErrors.length}）`);
  if (pageErrors.length) console.log("ERRORS:", pageErrors.join(' | '));

  await browser.close();
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
