// v3.82.0 验证：右侧僵尸栏 + 亮起行 + 一键召唤 + 投降
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

  // 进对局（普通对战）
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
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => {
    for (const c of [...document.querySelectorAll("#vz-grid .vz-card")].slice(0, 8)) c.click();
    document.getElementById("vz-rock").click();
  });
  await new Promise(r => setTimeout(r, 900));

  // T1 僵尸栏在右侧空地（不压草坪 x<770 布局坐标）
  const t1 = await page.evaluate(() => {
    const bar = document.getElementById('vs-bottom-bar');
    const cs = getComputedStyle(bar);
    return { display: cs.display, right: bar.getBoundingClientRect().right, left: bar.getBoundingClientRect().left,
             top: bar.getBoundingClientRect().top, cards: bar.querySelectorAll('.zcard').length,
             flexDir: cs.flexDirection, vw: window.innerWidth };
  });
  ok(t1.display === 'flex', 'T1a 僵尸栏已显示');
  ok(t1.cards === 8, `T1b 竖排 8 卡（${t1.cards}）`);
  ok(t1.flexDir === 'column', `T1c 纵向排布（${t1.flexDir}）`);
  const contR = await page.evaluate(() => document.getElementById('game-container')?.getBoundingClientRect().right || window.innerWidth);
  ok(t1.right >= contR - 12, `T1d 紧贴容器右侧（bar right=${Math.round(t1.right)} / 容器右缘 ${Math.round(contR)}）`);
  ok(t1.left > 770 * 1.5 - 40, `T1e 不压草坪（left=${Math.round(t1.left)} > 草坪右缘 770×1.5=1155-容差）`);

  // T2 亮起行：初始第一排 + ↑↓ 移动 + 上下限
  const t2 = await page.evaluate(() => {
    const g = window._pvzGame;
    const hl = document.getElementById('vs-row-hl');
    const send = code => document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
    const top0 = hl ? parseInt(hl.style.top) : null;
    const r0 = g.vsSpawnRow;
    send('ArrowDown'); send('ArrowDown');
    const r2 = g.vsSpawnRow;
    const top2 = hl ? parseInt(hl.style.top) : null;
    send('ArrowUp');
    const r1 = g.vsSpawnRow;
    for (let i = 0; i < 10; i++) send('ArrowUp'); // 顶到 0
    const rMin = g.vsSpawnRow;
    for (let i = 0; i < 10; i++) send('ArrowDown'); // 底到 4
    const rMax = g.vsSpawnRow;
    return { exists: !!hl, top0, r0, r2, top2, r1, rMin, rMax, rows: g.board.rows };
  });
  ok(t2.exists, 'T2a 亮起行元素存在');
  ok(t2.r0 === 0 && t2.top0 === 85 + 7, `T2b 开局亮起第一排（row=${t2.r0} top=${t2.top0}）`);
  ok(t2.r2 === 2 && t2.top2 === 85 + 2 * 100 + 7, `T2c ↓×2 移到第 3 排（row=${t2.r2} top=${t2.top2}）`);
  ok(t2.r1 === 1, `T2d ↑ 回到第 2 排（row=${t2.r1}）`);
  ok(t2.rMin === 0 && t2.rMax === t2.rows - 1, `T2e 上下限夹住（min=${t2.rMin} max=${t2.rMax}）`);

  // T3 一键召唤：物理点击僵尸卡 → 僵尸出现在亮起行
  // 先把亮起行移到第 4 排（row=3）
  await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true })); });
  const rowBefore = await page.evaluate(() => window._pvzGame.vsSpawnRow);
  const clickCard = await page.evaluate(() => {
    const card = [...document.querySelectorAll('#vs-bottom-bar .zcard')].find(c => !c.classList.contains('disabled'));
    const r = card.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, type: card.dataset.type, brains: window._pvzGame.zombieSun };
  });
  await page.mouse.click(clickCard.x, clickCard.y);
  await new Promise(r => setTimeout(r, 500));
  const t3 = await page.evaluate((wantType) => {
    const g = window._pvzGame;
    const z = g.entities.filter(e => e.constructor.name === 'Zombie' && e.type === wantType && !e.isDead).pop();
    return { spawned: !!z, row: z ? z.row : null, brains: g.zombieSun };
  }, clickCard.type);
  ok(t3.spawned && t3.row === rowBefore, `T3a 物理点卡直接召唤到亮起行（row=${t3.row}，期望 ${rowBefore}）`);
  ok(clickCard.brains - t3.brains > 0, `T3b 扣脑子（${clickCard.brains}→${t3.brains}）`);
  // 再点同一张卡：直接再召唤一只（不再有"取消选中"态）
  const brainsBefore = await page.evaluate(() => { const g = window._pvzGame; g.zombieSun = 5000; g._refreshVsZombieBar(); return 5000; });
  await page.mouse.click(clickCard.x, clickCard.y);
  await new Promise(r => setTimeout(r, 400));
  const t3c = await page.evaluate(() => window._pvzGame.zombieSun);
  ok(t3c < brainsBefore, `T3c 再点一次=再召唤一次（脑子 ${brainsBefore}→${t3c}）`);

  // T4 投降：按 0 = 僵尸方投降 → 植物方胜
  const send0 = await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit0', bubbles: true, cancelable: true }));
    return window._pvzGame.state;
  });
  await new Promise(r => setTimeout(r, 300));
  const t4 = await page.evaluate(() => {
    const overlay = document.querySelector('.vase-win-overlay');
    const txt = overlay ? overlay.textContent : '';
    return { state: window._pvzGame.state, overlay: !!overlay, plantWin: txt.includes('植物方获胜'), surrHidden: getComputedStyle(document.getElementById('vs-surrender')).display === 'none' };
  });
  ok(t4.state === 'GAMEOVER' && t4.overlay && t4.plantWin, 'T4a 按 0 = 僵尸方投降 → 植物方获胜结算');
  ok(t4.surrHidden, 'T4b 结算后投降按钮隐藏');

  // T5 重开后点投降按钮 = 植物方投降 → 僵尸方胜
  await page.evaluate(() => { document.getElementById('vs-replay')?.click(); });
  await new Promise(r => setTimeout(r, 300));
  // 重走选人到对局
  // restartVs 直接进植物选卡（不经过玩法弹窗）
  const chooserUp = await page.evaluate(() => { const c = document.getElementById('seed-chooser'); return c && getComputedStyle(c).display !== 'none'; });
  if (chooserUp) {
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
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => { for (const c of [...document.querySelectorAll("#vz-grid .vz-card")].slice(0, 8)) c.click(); document.getElementById("vz-rock").click(); });
    await new Promise(r => setTimeout(r, 900));
  }
  const t5a = await page.evaluate(() => {
    const g = window._pvzGame;
    return { playing: g.state === 'PLAYING', row: g.vsSpawnRow, hlShown: getComputedStyle(document.getElementById('vs-row-hl')).display === 'block',
             surr: getComputedStyle(document.getElementById('vs-surrender')).display };
  });
  ok(t5a.playing && t5a.row === 0 && t5a.hlShown, `T5a 重开局亮起行复位第一排（row=${t5a.row} hl=${t5a.hlShown} playing=${t5a.playing}）`);
  ok(t5a.surr === 'block', 'T5b 投降按钮重新出现');
  const surrBtn = await page.evaluate(() => {
    const b = document.getElementById('vs-surrender');
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(surrBtn.x, surrBtn.y);
  await new Promise(r => setTimeout(r, 300));
  const t5c = await page.evaluate(() => {
    const overlay = document.querySelector('.vase-win-overlay');
    return { state: window._pvzGame.state, zombieWin: overlay ? overlay.textContent.includes('僵尸方获胜') : false };
  });
  ok(t5c.state === 'GAMEOVER' && t5c.zombieWin, 'T5c 物理点投降按钮 = 植物方投降 → 僵尸方获胜结算');

  // 截图
  await page.evaluate(() => { window._pvzGame.state = 'PLAYING'; window._pvzGame._showVsRowHighlight(); document.getElementById('vs-surrender').style.display = 'block'; document.querySelector('.vase-win-overlay')?.remove(); });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3820_vsgame.png" });

  ok(pageErrors.length === 0, `T6 无页面错误（${pageErrors.length}）`);
  if (pageErrors.length) console.log("ERRORS:", pageErrors.join(' | '));

  await browser.close();
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
