// v3.89.0 验证：删除包子 / 开局0阳光+浇水1秒冷却 / 升级后阳光菇继续产阳光 / 坚果升级血量成长+弹窗预览
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const fs = require("fs");
const path = require("path");
const ROOT = "/Users/clawbox/nexus-hub/pvz-web";
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg); } }
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
  let pageErrors = 0;
  page.on("pageerror", e => { pageErrors++; console.log("PAGEERROR:", e.message); });
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?role=plant"), { waitUntil: "networkidle0" });
  await sleep(900);

  // 冻结猛鬼出笼（保证长等待期间不被啃植物干扰）
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; });

  // —— 物理点击工具 ——
  const clickWorld = async (wx, wy) => {
    await sleep(350);
    const pt = await page.evaluate((wx, wy) => {
      const g = window.game;
      const r = g.vp1.getBoundingClientRect();
      return { x: r.left + wx - g.player.camX, y: r.top + wy - g.player.camY };
    }, wx, wy);
    await page.mouse.click(pt.x, pt.y);
  };
  const clickEl = async el => {
    const pt = await page.evaluate(e => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, el);
    await page.mouse.click(pt.x, pt.y);
  };

  // ============ A. 开局状态：0 阳光、无包子 ============
  console.log("—— A. 开局状态 ——");
  const a = await page.evaluate(() => {
    const g = window.game;
    return {
      sun: g.player.sun, hudSun: document.getElementById('sun1').innerText,
      baoField: 'bao' in g.player, baoEl: !!document.getElementById('bao1'),
      baoText: document.getElementById('hud-p1').innerText.includes('包子'),
      throwBao: typeof g.throwBao, addBao: typeof g.addBao, updateBaos: typeof g._updateBaos,
      baosArr: g.baos, keyE: true
    };
  });
  ok(a.sun === 0 && a.hudSun === '0', `A1 开局阳光 = 0（HUD 显示 ${a.hudSun}）`);
  ok(!a.baoField && !a.baoEl && !a.baoText, `A2 包子全面移除：player.bao / HUD #bao1 / 文案 均不存在`);
  ok(a.throwBao === 'undefined' && a.addBao === 'undefined' && a.updateBaos === 'undefined' && a.baosArr === undefined,
     `A3 throwBao/addBao/_updateBaos/baos 全部不存在`);

  // ============ B. 按 E 键无任何反应、主循环存活 ============
  console.log("—— B. E 键与主循环 ——");
  const b1 = await page.evaluate(() => { return { t: window.game.lastTime }; });
  await page.keyboard.press('KeyE');
  await sleep(250);
  await page.keyboard.press('KeyE');
  await sleep(250);
  const b2 = await page.evaluate(() => ({ t: window.game.lastTime, err: window.__lastErr || null }));
  ok(b2.t > b1.t && pageErrors === 0, `B1 按两次 E 键无异常、rAF 主循环存活（pageError ${pageErrors} 次）`);

  // ============ C. 浇水 1 秒冷却（物理键盘） ============
  console.log("—— C. 浇水冷却 ——");
  const c0 = await page.evaluate(() => window.game.player.sun);
  await page.keyboard.down('Space'); await sleep(300); await page.keyboard.up('Space');
  await sleep(120);
  const c1 = await page.evaluate(() => window.game.player.sun);
  await page.keyboard.down('Space'); await sleep(300); await page.keyboard.up('Space'); // 距上次浇水 ~0.42s，应被冷却挡住
  await sleep(120);
  const c2 = await page.evaluate(() => window.game.player.sun);
  await sleep(750); // 距上次浇水已 >1s
  await page.keyboard.down('Space'); await sleep(250); await page.keyboard.up('Space');
  await sleep(120);
  const c3 = await page.evaluate(() => window.game.player.sun);
  ok(c1 - c0 === 1, `C1 第一次浇水 +1 阳光（${c0}→${c1}）`);
  ok(c2 === c1, `C2 冷却期内再按空格不再产出（${c1}→${c2}）——拼手速无效`);
  ok(c3 - c2 === 1, `C3 冷却结束（>1s）再浇 +1（${c2}→${c3}）`);

  // ============ D. 阳光菇：升级前后都正常产阳光（真实弹窗升级） ============
  console.log("—— D. 阳光菇升级后继续产阳光 ——");
  const d0 = await page.evaluate(() => {
    const g = window.game;
    const sh = g.plants.find(p => p.type === 'sunshroom');
    g.player.x = sh.c * 80 + 40;
    g.player.y = sh.r * 80 + 130;
    return { wx: sh.c * 80 + 40, wy: sh.r * 80 + 40 };
  });
  // 升级前产出：prodT 快进到 7.5s，等 0.9s 应 +2
  await page.evaluate(() => { const g = window.game; g.plants.find(p => p.type === 'sunshroom').prodT = 7.5; });
  await sleep(900);
  const d1 = await page.evaluate(() => window.game.player.sun);
  ok(d1 >= c3 + 2, `D1 升级前阳光菇产阳光 +2（${c3}→${d1}）`);

  await clickWorld(d0.wx, d0.wy);
  await sleep(250);
  const d2 = await page.evaluate(() => {
    const g = window.game;
    g.addSpore(10);
    return { open: g.popup.style.display === 'block', title: g.ppTitle.innerText,
      feed: g.ppFeed.innerText, upTxt: g.ppUp.innerText, disabled: g.ppUp.classList.contains('pp-disabled') };
  });
  ok(d2.open && d2.title === '阳光菇', `D2 物理点击弹出升级面板（${d2.title}）`);
  ok(d2.feed.includes('血量 300→350') && d2.feed.includes('产阳光 3/每8秒'), `D3 弹窗显示升级收益预览：「${d2.feed}」`);
  ok(!d2.disabled, `D4 孢子充足时升级按钮可用`);
  await clickEl(await page.evaluateHandle(() => window.game.ppUp));
  await sleep(250);
  const d3 = await page.evaluate(() => {
    const g = window.game;
    const pl = g.plants.find(p => p.type === 'sunshroom2');
    if (!pl) return null;
    return { found: true, scale: pl.def.scale };
  });
  ok(!!d3, `D5 升级成功：阳光菇 → 大阳光菇`);
  // 升级后产出：+3 / 每8秒
  await page.evaluate(() => { const g = window.game; g.plants.find(p => p.type === 'sunshroom2').prodT = 7.5; });
  await sleep(900);
  const d4 = await page.evaluate(() => window.game.player.sun);
  ok(d4 >= d1 + 3, `D6 升级后大阳光菇继续产阳光 +3（${d1}→${d4}）——用户反馈点验证通过`);
  await page.keyboard.press('Escape'); // 无副作用，确保键盘状态干净
  await page.evaluate(() => window.game._closePopup());

  // ============ E. 坚果升级：门板血量成长 + 变大（真实弹窗升级） ============
  console.log("—— E. 坚果升级实质成长 ——");
  const e0 = await page.evaluate(() => {
    const g = window.game;
    const door = g.plants.find(p => p.isDoor);
    g.player.x = door.c * 80 + 40;
    g.player.y = door.r * 80 + 140;
    return { wx: door.c * 80 + 40, wy: door.r * 80 + 40, c: door.c, r: door.r, doorHp: door.maxHp, doorType: door.type };
  });
  ok(e0.doorHp === 1200 && e0.doorType === 'wallnut', `E1 门板坚果初始血量 1200（${e0.doorType}）`);
  await clickWorld(e0.wx, e0.wy);
  await sleep(250);
  const e1 = await page.evaluate(() => {
    const g = window.game;
    g.addSpore(20);
    return { title: g.ppTitle.innerText, feed: g.ppFeed.innerText,
      enabled: !g.ppUp.classList.contains('pp-disabled') };
  });
  ok(e1.title.includes('门板'), `E2 弹窗标题标注门板（${e1.title}）`);
  ok(e1.feed.includes('血量 1200→1500') && e1.feed.includes('子弹跟踪'), `E3 弹窗显示坚果升级收益：「${e1.feed}」`);
  ok(e1.enabled, `E3b 弹窗开着时加孢子 → 升级按钮实时解除置灰`);
  await clickEl(await page.evaluateHandle(() => window.game.ppUp));
  await sleep(250);
  const e2 = await page.evaluate((c, r) => {
    const g = window.game;
    const pl = g.plants.find(p => p.c === c && p.r === r);
    return pl ? { type: pl.type, hp: pl.maxHp, scale: pl.def.scale, homing: pl.def.shoot && pl.def.shoot.homing } : null;
  }, e0.c, e0.r);
  ok(e2 && e2.type === 'nutshooter' && e2.hp === 1500, `E4 门板升级为豌豆坚果：血量 1200→${e2 ? e2.hp : '?'}（跟着涨）`);
  ok(e2 && e2.scale === 1.05 && e2.homing, `E5 升级后体型变大(scale ${e2 && e2.scale})且获得跟踪弹`);
  // 纯血量成长链抽查（数据层）
  const e3 = await page.evaluate(() => {
    const D = HauntedDorm.DEFS;
    return ['wallnut','nutshooter','nutgunner','cabbagenut','tallnut','pumpkin'].map(t => D[t].hp);
  });
  ok(e3.every((v, i) => i === 0 || v > e3[i-1]), `E6 坚果链血量单调递增：${e3.join('→')}`);

  // ============ F. 喂大目标缩小 + 数据层无 bao ============
  console.log("—— F. 喂大与数据 ——");
  const f1 = await page.evaluate(() => {
    const D = HauntedDorm.DEFS;
    return { puff: D.puffshroom.feed.goal, scaredy: D.scaredyshroom.feed.goal, fume: D.fumeshroom.feed.goal,
      anyBao: Object.values(D).some(d => d.bao !== undefined),
      puffSpore: !!D.puffshroom.spore };
  });
  ok(f1.puff === 40 && f1.scaredy === 80 && f1.fume === 160, `F1 喂大目标 40/80/160（浇水1秒1次下节奏合理）`);
  ok(!f1.anyBao && f1.puffSpore, `F2 图鉴无任何 bao 产出，蘑菇系保留 🦠孢子产出`);
  ok(pageErrors === 0, `F3 全程无页面异常`);

  // ============ G. 视觉回归：河道/棋盘/桥 + 截图 ============
  console.log("—— G. 视觉回归 ——");
  const g1 = await page.evaluate(() => {
    const wall = document.querySelector('.tile.wall');
    const cs = wall ? getComputedStyle(wall) : null;
    const vp = getComputedStyle(document.getElementById('world1'));
    return { wallBg: cs ? cs.backgroundImage : '', vpBg: vp.backgroundImage,
      bridges: document.querySelectorAll('.tile.bridge').length,
      broken: [...document.querySelectorAll('#world1 img')].filter(im => !im.complete || im.naturalWidth === 0).length };
  });
  ok(g1.wallBg.includes('repeating-linear-gradient'), `G1 河道墙保留`);
  ok(g1.vpBg.includes('conic-gradient'), `G2 棋盘草地保留`);
  ok(g1.bridges >= 8 && g1.broken === 0, `G3 木桥 ${g1.bridges} 座、无裂图`);
  await page.evaluate(() => {
    const g = window.game;
    const nut = g.plants.find(p => p.isDoor);
    g.player.x = nut.c * 80 + 40;
    g.player.y = nut.r * 80 + 150;
    g._flyText(nut.c * 80 + 40, nut.r * 80, '豌豆坚果！（血量 1200→1500）', '#9dff6b');
  });
  await sleep(400);
  await page.screenshot({ path: ROOT + "/_v3890_game.png" });
  console.log("  📷 截图: _v3890_game.png");

  await browser.close();
  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
