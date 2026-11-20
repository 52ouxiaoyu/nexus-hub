// v3.92.1 验证：豌豆坚果改用原版素材组装（坚果身体+头顶豌豆射手），弃用自创拼接图
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
  await page.evaluate(() => { window.game.ghostSpawnAt = 1e12; });

  // ============ N. 豌豆坚果贴图 ============
  console.log("—— N. 豌豆坚果原版素材组装 ——");
  const n = await page.evaluate(() => {
    const g = window.game;
    const D = HauntedDorm.DEFS;
    const rm = g.rooms[0];
    // 找房间内两个空格：一株豌豆坚果 + 一株射手坚果
    const spots = [];
    for (let r = 0; r < rm.h && spots.length < 2; r++) for (let c = 0; c < rm.w && spots.length < 2; c++) {
      if (rm.tpl.grid[r][c] !== 1) continue;
      const col = rm.x + c, row = rm.y + r;
      if (g.plants.some(pl => pl.c === col && pl.r === row)) continue;
      spots.push({ col, row });
    }
    g.spawnPlant(spots[0].col, spots[0].row, 'nutshooter');
    g.spawnPlant(spots[1].col, spots[1].row, 'nutgunner');
    const p1 = g.plants.find(p => p.c === spots[0].col && p.r === spots[0].row);
    const p2 = g.plants.find(p => p.c === spots[1].col && p.r === spots[1].row);
    const imgs1 = [...p1.el1.querySelectorAll('img')].map(i => i.getAttribute('src'));
    const imgs2 = [...p2.el1.querySelectorAll('img')].map(i => i.getAttribute('src'));
    // 玩家挪过去看
    g.player.x = spots[0].col * 80 + 40; g.player.y = spots[0].row * 80 + 120;
    return { imgs1, imgs2, def1: { img: D.nutshooter.img, overlay: D.nutshooter.overlay, blend: !!D.nutshooter.blend } };
  });
  ok(n.def1.img === 'Plants/WallNut/0.gif' && n.def1.overlay === 'Plants/Peashooter/0.gif',
     `N1 DEFS：主体=原版坚果 ${n.def1.img}，overlay=原版豌豆射手 ${n.def1.overlay}`);
  ok(!n.def1.blend, `N2 已去掉 multiply 白底混合（原版 GIF 透明底不需要）`);
  ok(n.imgs1.length === 2 && n.imgs1[0].includes('WallNut/0.gif') && n.imgs1[1].includes('Peashooter/0.gif'),
     `N3 豌豆坚果渲染两张原版图（${n.imgs1.join(' + ')}）`);
  ok(n.imgs2.length === 2 && n.imgs2[0].includes('WallNut/0.gif') && n.imgs2[1].includes('Peashooter/0.gif'),
     `N4 射手坚果同款组装（坚果身体+头顶豌豆）`);
  ok(!n.imgs1.join().includes('Fusions/nutshooter') && !n.imgs2.join().includes('Fusions/nutshooter'),
     `N5 自创拼接图 nutshooter.png 已不再被引用`);

  await sleep(500);
  await page.screenshot({ path: ROOT + "/_v3921_nut.png" });

  ok(pageErrors === 0, `P 全程无页面异常`);
  await browser.close();
  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
