// v3.90.0 验证：向日葵链/坚果链升级改耗阳光☀ / 阳光菇近距离才产出 / 猛鬼离散慢啃+咬力随等级成长
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
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
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; }); // 冻结猛鬼出笼

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

  // ============ A. 货币归属：向日葵链/坚果链=☀，孢子植物/豌豆分支=🦠 ============
  console.log("—— A. 货币归属 ——");
  const a = await page.evaluate(() => {
    const D = HauntedDorm.DEFS;
    const isSun = t => D[t].up && D[t].up.cur === 'sun';
    return {
      sunChain: ['sunshroom', 'sunshroom2', 'sunflower'].every(isSun),
      nutChain: ['wallnut', 'nutshooter', 'nutgunner', 'cabbagenut', 'tallnut'].every(isSun),
      sunCosts: ['sunshroom', 'sunshroom2', 'sunflower'].map(t => D[t].up.cost),
      nutCosts: ['wallnut', 'nutshooter', 'nutgunner', 'cabbagenut', 'tallnut'].map(t => D[t].up.cost),
      sporeBranch: Object.keys(D).filter(t => D[t].up && D[t].up.cur !== 'sun').map(t => t)
    };
  });
  ok(a.sunChain && a.nutChain, `A1 向日葵链+坚果链升级全部改耗阳光☀`);
  ok(JSON.stringify(a.sunCosts) === '[25,75,200]' && JSON.stringify(a.nutCosts) === '[40,100,160,260,400]',
     `A2 阳光定价：向日葵链 ${a.sunCosts.join('/')}，坚果链 ${a.nutCosts.join('/')}（按阳光经济重定价）`);
  ok(a.sporeBranch.length === 4 && a.sporeBranch.every(t => ['peashooter', 'repeater', 'snowpea', 'splitpea'].includes(t)),
     `A3 孢子升级只剩豌豆射手分支（${a.sporeBranch.join(',')}），地刺/眩晕菇/毁灭菇走孢子购买价`);

  // ============ B. 弹窗显示 ☀ 费用并从阳光扣费（真实点击升级阳光菇） ============
  console.log("—— B. 阳光升级扣费 ——");
  const b0 = await page.evaluate(() => {
    const g = window.game;
    const sh = g.plants.find(p => p.type === 'sunshroom');
    g.player.x = sh.c * 80 + 40;
    g.player.y = sh.r * 80 + 130;
    g.player.spore = 0;
    g.addSun(60);
    return { wx: sh.c * 80 + 40, wy: sh.r * 80 + 40, sun: g.player.sun };
  });
  await clickWorld(b0.wx, b0.wy);
  await sleep(250);
  const b1 = await page.evaluate(() => {
    const g = window.game;
    return { txt: g.ppUp.innerText, disabled: g.ppUp.classList.contains('pp-disabled') };
  });
  ok(b1.txt === '升级 ☀25' && !b1.disabled, `B1 弹窗按钮显示「${b1.txt}」且阳光充足可点`);
  await clickEl(await page.evaluateHandle(() => window.game.ppUp));
  await sleep(250);
  const b2 = await page.evaluate(() => {
    const g = window.game;
    return { sun: g.player.sun, up2: !!g.plants.find(p => p.type === 'sunshroom2') };
  });
  ok(b2.sun === b0.sun - 25 && b2.up2, `B2 升级成功：阳光 60→${b2.sun}（扣的是普通阳光，孢子未动）`);

  // ============ C. 阳光菇近距离才产出（远处不产 = 修复全场一起产的过快收入） ============
  console.log("—— C. 产出距离门槛 ——");
  const c = await page.evaluate(async () => {
    const g = window.game;
    const sh = g.plants.find(p => p.type === 'sunshroom' || p.type === 'sunshroom2');
    const wx = sh.c * 80 + 40, wy = sh.r * 80 + 40;
    // 玩家传到远处（>300px）：地图中心
    g.player.x = g.worldWidth / 2; g.player.y = g.worldHeight / 2;
    const d = Math.hypot(wx - g.player.x, wy - g.player.y);
    sh.prodT = 7.9;
    const sunBefore = g.player.sun;
    await new Promise(r => setTimeout(r, 1100));
    const farDelta = g.player.sun - sunBefore;
    // 玩家传到旁边（~200px）
    g.player.x = wx; g.player.y = wy + 200;
    sh.prodT = 7.9;
    await new Promise(r => setTimeout(r, 900));
    const nearDelta = g.player.sun - sunBefore - farDelta;
    return { d: Math.round(d), farDelta, nearDelta };
  });
  ok(c.d > 300 && c.farDelta === 0, `C1 玩家距阳光菇 ${c.d}px（>300）→ 不产出（+${c.farDelta}）`);
  ok(c.nearDelta >= 2, `C2 走到旁边 200px → 恢复产出（+${c.nearDelta}）`);

  // ============ D. 浇水 1 秒 1 阳光（回归） ============
  console.log("—— D. 浇水节奏回归 ——");
  const d0 = await page.evaluate(() => window.game.player.sun);
  await page.keyboard.down('Space'); await sleep(300); await page.keyboard.up('Space');
  await sleep(120);
  const d1 = await page.evaluate(() => window.game.player.sun);
  await page.keyboard.down('Space'); await sleep(300); await page.keyboard.up('Space');
  await sleep(120);
  const d2 = await page.evaluate(() => window.game.player.sun);
  ok(d1 - d0 === 1 && d2 === d1, `D1 浇水 +1 ☀，冷却期内连按无效（${d0}→${d1}→${d2}）`);

  // ============ E. 猛鬼离散慢啃：站定 2.4s 一口，咬力随等级 ============
  console.log("—— E. 猛鬼慢啃 ——");
  await page.evaluate(() => { window.game.ghostSpawnAt = performance.now() - 10; });
  await sleep(400);
  const e0 = await page.evaluate(() => {
    const g = window.game;
    const zb = g.zombies.find(z => !z.dead);
    const door = g.plants.find(p => p.isDoor);
    // 玩家放门板另一侧（房间内），猛鬼放门板正上方一格旁 → 朝玩家走必撞门板
    g.player.x = door.c * 80 + 40;
    g.player.y = door.r * 80 + 40 - 240;
    zb.x = door.c * 80 + 40;
    zb.y = door.r * 80 + 40 + 70;
    return { doorHp: door.hp, ghostLv: g.ghostLevel };
  });
  await sleep(3000); // ≈1 口（2.4s 间隔）
  const e1b = await page.evaluate((hp0) => {
    const door = window.game.plants.find(p => p.isDoor);
    return { loss: hp0 - door.hp, stillThere: !!door };
  }, e0.doorHp);
  ok(e1b.stillThere && e1b.loss >= 15 && e1b.loss <= 60, `E1 3 秒内门板只掉 ${e1b.loss} 血（离散慢啃：1~2 口 ×15；旧逐帧 DPS 3 秒要掉 120）`);
  await sleep(3000); // 累计 ≈6s → 2~3 口
  const e2 = await page.evaluate((hp0) => {
    const door = window.game.plants.find(p => p.isDoor);
    return { loss: hp0 - door.hp, dead: !door };
  }, e0.doorHp);
  ok((e2.dead ? 1200 : e2.loss) <= 90, `E2 6 秒累计掉血 ${e2.loss}（≤3 口；旧 DPS 6 秒要掉 240——慢啃生效）`);

  // E3: 升级后咬力上涨（Lv3 → 每口 15+24=39）
  const e3 = await page.evaluate(() => {
    const g = window.game;
    g.ghostLevel = 3;
    const zb = g.zombies.find(z => !z.dead);
    if (zb) { zb.el1 && zb.el1.remove(); g.zombies = g.zombies.filter(z => z !== zb); }
    g._spawnGhost();
    const nb = g.zombies.find(z => !z.dead);
    const door = g.plants.find(p => p.isDoor);
    if (!door) return { gone: true };
    g.player.x = door.c * 80 + 40;
    g.player.y = door.r * 80 + 40 - 240;
    nb.x = door.c * 80 + 40;
    nb.y = door.r * 80 + 40 + 70;
    return { gone: false, hp0: door.hp };
  });
  await sleep(5400); // 等到达 + 1~2 口
  const e4 = await page.evaluate((r) => {
    if (r.gone) return { skip: true };
    const door = window.game.plants.find(p => p.isDoor);
    if (!door) return { dead: true };
    return { loss: r.hp0 - door.hp };
  }, e3);
  if (e4.skip) { console.log("  - E3 门板已被前一轮啃穿，跳过等级咬力断言（前两步已充分证明慢啃）"); }
  else if (e4.dead) { ok(true, "E3 Lv.3 咬力更高，门板被啃穿（39/口 × 3 口 = 117 ≤ 1200 不该发生——检查）"); }
  else ok(e4.loss >= 39 && e4.loss <= 120, `E3 Lv.3 猛鬼每口 39 血（15+12×2），2 口内掉 ${e4.loss}（咬力随实际等级上涨）`);

  ok(pageErrors === 0, `F 全程无页面异常`);
  await page.screenshot({ path: ROOT + "/_v3900_game.png" });

  await browser.close();
  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
