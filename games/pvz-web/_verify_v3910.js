// v3.91.0 验证：改名「守屋大作战」+ 植物只能种在房间里面
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

  // ============ A. 主页改名：卡面/阵营弹窗/帮助 ============
  console.log("—— A. 主页改名 ——");
  await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "networkidle0" });
  await sleep(600);
  const a = await page.evaluate(() => {
    const card = document.getElementById('btn-dorm');
    const modal = document.getElementById('dorm-role-modal');
    return {
      cardName: card.querySelector('.pkt-name').innerText,
      cardTag: card.querySelector('.pkt-tag') ? card.querySelector('.pkt-tag').innerText : '',
      cardTitle: card.title,
      modalTxt: modal.innerText,
      pageHasOld: document.body.innerText.includes('猛鬼') || document.body.innerText.includes('宿舍'),
    };
  });
  ok(a.cardName === '守屋大作战', `A1 主页卡名 =「${a.cardName}」`);
  ok(a.cardTag === 'HOUSE GUARD', `A2 卡面英文标签 =「${a.cardTag}」`);
  ok(a.cardTitle.startsWith('守屋大作战'), `A3 卡片 title =「${a.cardTitle}」`);
  ok(a.modalTxt.includes('守屋大作战') && a.modalTxt.includes('HOUSE GUARD'), `A4 阵营弹窗标题改为「守屋大作战 / HOUSE GUARD」`);
  ok(!a.pageHasOld, `A5 主页可见文本已无「猛鬼/宿舍」字样`);

  // 帮助面板
  await page.evaluate(() => {
    const t = document.querySelector('#start-menu .game-title');
    t.nextElementSibling.click(); // HelpGuide 注入的帮助按钮
  });
  await sleep(400);
  const a6 = await page.evaluate(() => {
    const body = document.querySelector('#help-body');
    return { txt: body ? body.innerText : '', old: body ? (body.innerText.includes('猛鬼') || body.innerText.includes('宿舍')) : true };
  });
  ok(a6.txt.includes('守屋大作战'), `A6 帮助面板含「守屋大作战」章节`);
  ok(!a6.old, `A7 帮助面板已无「猛鬼/宿舍」字样`);
  const a8 = await page.evaluate(() => document.querySelector('#help-body').innerText.includes('只能种在房间里面'));
  ok(a8, `A8 帮助已写明「植物只能种在房间里面」`);

  // ============ B. 游戏内改名 + 种植限制 ============
  console.log("—— B. 游戏内改名与种植限制 ——");
  await page.goto("file://" + path.resolve(ROOT + "/haunted-dorm.html?role=plant"), { waitUntil: "networkidle0" });
  await sleep(900);
  const b0 = await page.evaluate(() => {
    window.game.ghostSpawnAt = 1e12; // 冻结僵尸出笼
    return { title: document.title };
  });
  ok(b0.title.includes('守屋大作战') && !b0.title.includes('猛鬼'), `B1 游戏页标题 =「${b0.title}」`);

  const clickWorld = async (wx, wy) => {
    await sleep(380);
    const pt = await page.evaluate((wx, wy) => {
      const g = window.game;
      const r = g.vp1.getBoundingClientRect();
      return { x: r.left + wx - g.player.camX, y: r.top + wy - g.player.camY };
    }, wx, wy);
    await page.mouse.click(pt.x, pt.y);
  };

  // B2: 房间外草地（地图中心横向 +4 格，必然不在任何房间/墙内）→ 菜单不弹 + 提示
  const out = await page.evaluate(() => {
    const g = window.game;
    const c = Math.floor(g.cols / 2) + 4, r = Math.floor(g.rows / 2);
    g.player.x = c * 80 + 40; g.player.y = r * 80 + 40;
    return { wx: c * 80 + 40, wy: r * 80 + 40, inRoom: g._insideRoom(c, r) };
  });
  ok(!out.inRoom, `B2 测试格 (${Math.floor(out.wx / 80)},${Math.floor(out.wy / 80)}) 确认在所有房间之外`);
  await clickWorld(out.wx, out.wy);
  const b3 = await page.evaluate(() => {
    const g = window.game;
    return { open: g.menuOpen, menuShown: g.plantMenu.style.display === 'flex', hint: document.body.innerText.includes('只能种在房间里') };
  });
  ok(!b3.open && !b3.menuShown, `B3 房间外点空地 → 种植菜单不弹出`);
  ok(b3.hint, `B4 弹出提示「只能种在房间里」`);

  // B5: 房间内空地 → 菜单弹出；点菜单第一项 → 真实种植 + 扣阳光
  const inner = await page.evaluate(() => {
    const g = window.game;
    const rm = g.rooms[0];
    for (let r = 0; r < rm.h; r++) for (let c = 0; c < rm.w; c++) {
      if (rm.tpl.grid[r][c] !== 1) continue;
      const col = rm.x + c, row = rm.y + r;
      if (g.plants.some(pl => pl.c === col && pl.r === row)) continue;
      g.player.x = col * 80 + 40; g.player.y = row * 80 + 40;
      g.player.sun = 500;
      return { wx: col * 80 + 40, wy: row * 80 + 40, col, row, nBefore: g.plants.length, sunBefore: 500 };
    }
    return null;
  });
  ok(!!inner, `B5 rooms[0] 内找到无植物空地 (${inner ? inner.col + ',' + inner.row : '-'})`);
  await clickWorld(inner.wx, inner.wy);
  const b6 = await page.evaluate(() => {
    const g = window.game;
    return { open: g.menuOpen, shown: g.plantMenu.style.display === 'flex', first: g.plantMenu.children[0] ? g.plantMenu.children[0].innerText : '' };
  });
  ok(b6.open && b6.shown, `B6 房间内点空地 → 种植菜单弹出（第一项「${b6.first}」）`);
  await page.evaluate(() => { const g = window.game; const r0 = g.plantMenu.children[0].getBoundingClientRect(); window.__menuPt = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 }; });
  const mp = await page.evaluate(() => window.__menuPt);
  await page.mouse.click(mp.x, mp.y);
  await sleep(250);
  const b7 = await page.evaluate((nb) => {
    const g = window.game;
    return { n: g.plants.length, sun: g.player.sun, menuClosed: !g.menuOpen };
  }, inner.nBefore);
  ok(b7.n === inner.nBefore + 1, `B7 菜单种植成功：植物 ${inner.nBefore}→${b7.n} 株`);
  ok(b7.sun < inner.sunBefore, `B8 阳光已扣费（500→${b7.sun}），种植闭环正常`);

  // B9: 浇水回归（1 秒 1 阳光）
  const s0 = await page.evaluate(() => window.game.player.sun);
  await page.keyboard.down('Space'); await sleep(300); await page.keyboard.up('Space');
  const s1 = await page.evaluate(() => window.game.player.sun);
  ok(s1 - s0 === 1, `B9 浇水回归正常：+1 ☀（${s0}→${s1}）`);

  // B10: 全页可见文本无「猛鬼」
  const b10 = await page.evaluate(() => document.body.innerText.includes('猛鬼'));
  ok(!b10, `B10 游戏页可见文本无「猛鬼」字样`);

  ok(pageErrors === 0, `C 全程无页面异常`);
  await page.screenshot({ path: ROOT + "/_v3910_game.png" });

  await browser.close();
  console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 ==========`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
