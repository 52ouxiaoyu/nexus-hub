// v3.86.0 验证：猛鬼宿舍战斗闭环（射击/击杀/掉落/受伤/波次/结算）+ 主页统一入口
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

  // ===== A. 主页统一 =====
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/index.html"), { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 800));
  const a1 = await page.evaluate(() => {
    const dorm = document.getElementById('btn-dorm');
    const row = document.getElementById('vs-row');
    const vs = document.getElementById('btn-vs');
    return {
      inRow: row.contains(dorm) && row.contains(vs),
      sameClass: dorm.className === vs.className,
      artImg: dorm.querySelector('.vs-duel img')?.getAttribute('src') || '',
      noSunShroom: !dorm.innerHTML.includes('SunShroom'),
      noInlineOnclick: !dorm.hasAttribute('onclick'),
    };
  });
  ok(a1.inRow && a1.sameClass, 'A1 宿舍卡与双人对战同在 #vs-row 且同为 mode-card 宽卡');
  ok(a1.artImg.includes('WallNut') && a1.noSunShroom, 'A2 卡面图=坚果门板+僵尸主题（不再是阳光菇）');
  ok(a1.noInlineOnclick, 'A3 进入方式=JS 绑定（无内联 onclick）');

  // A4: 点卡片物理点击 → 弹窗（diff-panel 样式）
  const r = await page.evaluate(() => {
    const b = document.getElementById('btn-dorm').getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  await page.mouse.click(r.x, r.y); await new Promise(r2 => setTimeout(r2, 200));
  const a4 = await page.evaluate(() => {
    const m = document.getElementById('dorm-role-modal');
    const panel = m.querySelector('.diff-panel');
    return { shown: m.style.display === 'flex', hasPanel: !!panel,
      plantBtn: !!document.getElementById('dorm-plant'),
      zombieGray: (document.getElementById('dorm-zombie').style.filter || '').includes('grayscale') };
  });
  ok(a4.shown && a4.hasPanel, 'A4 物理点卡打开阵营弹窗，使用 diff-panel 同款面板');
  ok(a4.plantBtn && a4.zombieGray, 'A5 植物阵营可点 / 僵尸阵营置灰(开发中)');
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3860_home.png" });

  // ===== B. 游戏本体战斗闭环 =====
  await page.goto("file://" + path.resolve("/Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?role=plant"), { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 800));

  const b1 = await page.evaluate(() => {
    const g = window.game;
    return { rooms: g.rooms.length, walls: g.walls.size, plants: g.plants.length, minimap: !!g.minimap };
  });
  ok(b1.rooms >= 5 && b1.walls > 0 && b1.plants >= b1.rooms, `B1 地图生成正常（房间 ${b1.rooms} 墙 ${b1.walls} 植物 ${b1.plants}）`);
  ok(b1.minimap, 'B2 小地图初始化');

  // 造一场可控测试局：手动种豌豆+僵尸放到豌豆旁边
  const b2 = await page.evaluate(() => {
    const g = window.game;
    g.wave = 3; // 模拟第 3 波数值
    const px = Math.floor(g.player.x / 80), py = Math.floor(g.player.y / 80);
    g.spawnPlant(px, py, 'peashooter');
    // 僵尸放在豌豆右侧 3 格
    g.spawnZombie((px + 3) * 80 + 40, py * 80 + 40);
    return { plants: g.plants.length, zombies: g.zombies.length, wave: g.wave, zhp: g.zombies[0].hp };
  });
  ok(b2.zombies === 1 && b2.zhp === 300 + 70 * 2, `B3 波次成长数值：第3波僵尸血 ${b2.zhp}（300+70×2）`);

  // 等 2.5s：豌豆应已射击并命中（20×N 伤）
  await new Promise(r => setTimeout(r, 2500));
  const b3 = await page.evaluate(() => {
    const g = window.game;
    return { peas: g.peas.length, zhp: g.zombies[0] ? g.zombies[0].hp : 'dead', hpBarShown: g.zombies[0] ? g.zombies[0].hpBg.style.display === 'block' : false };
  });
  ok(b3.zhp === 'dead' || b3.zhp < 300 + 140, `B4 豌豆自动射击并命中（僵尸血量 ${b3.zhp}，场上弹 ${b3.peas}）`);
  ok(b3.zhp === 'dead' || b3.hpBarShown, 'B5 僵尸受击后血条显示');

  // 击杀 → 掉阳光袋
  const b4 = await page.evaluate(() => {
    const g = window.game;
    if (g.zombies[0] && !g.zombies[0].dead) g._killZombie(g.zombies[0]);
    return { kills: g.kills, suns: g.suns.length };
  });
  await new Promise(r2 => setTimeout(r2, 200));
  const b4b = await page.evaluate(() => {
    const g = window.game;
    // 走过去捡阳光
    if (g.suns[0]) { g.player.x = g.suns[0].x; g.player.y = g.suns[0].y; }
    return g.suns.length;
  });
  await new Promise(r2 => setTimeout(r2, 120));
  const b4c = await page.evaluate(() => ({ suns: window.game.suns.length, sun: window.game.player.sun }));
  ok(b4.kills === 1 && b4.suns === 1, 'B6 击杀僵尸 → 掉落阳光袋');
  ok(b4c.sun >= 75 && b4c.suns === 0, `B7 走近拾取 +25（阳光=${b4c.sun}）`);

  // 玩家受伤：僵尸贴脸
  const b5 = await page.evaluate(() => {
    const g = window.game;
    g.player.hp = 100;
    g.spawnZombie(g.player.x + 30, g.player.y);
    return g.zombies.length;
  });
  await new Promise(r2 => setTimeout(r2, 700));
  const b5b = await page.evaluate(() => ({ hp: window.game.player.hp, hud: document.getElementById('hp-num').innerText }));
  ok(b5b.hp < 100 && +b5b.hud === Math.ceil(b5b.hp), `B8 僵尸贴脸玩家掉血（HP ${b5b.hp.toFixed(1)}，HUD 同步 ${b5b.hud}）`);

  // 死亡结算（轮询等待，headless rAF 帧率有抖动）
  await page.evaluate(() => { window.game.player.hp = 3; });
  let b6b = { over: false, title: '' };
  for (let i = 0; i < 20 && !b6b.over; i++) {
    await new Promise(r2 => setTimeout(r2, 200));
    b6b = await page.evaluate(() => ({
      over: document.getElementById('dorm-over').style.display === 'flex',
      title: document.getElementById('ov-title').innerText,
    }));
  }
  ok(b6b.over && b6b.title.includes('抓住'), `B9 HP 归零 → 失败结算面板（${b6b.title}）`);
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3860_gameover.png" });

  // 波次播报与胜利判定逻辑（直接调 startWave）
  await page.evaluate(() => { location.reload(); });
  await new Promise(r2 => setTimeout(r2, 900));
  const b7 = await page.evaluate(() => {
    const g = window.game;
    g.zombies = [];
    g.startWave();
    return { wave: g.wave, spawned: g.zombies.length, chip: document.getElementById('wave-chip').innerText };
  });
  ok(b7.wave === 1 && b7.spawned === 3, `B10 startWave：第1波刷 3 只（实际 ${b7.spawned}）`);
  ok(b7.chip.includes('第 1'), `B11 波次牌同步（${b7.chip}）`);
  const b8 = await page.evaluate(() => {
    const g = window.game;
    g.zombies = [];
    g.wave = g.waveTotal;
    // 第 8 波清空 → 胜利（loop 下一帧触发）
    return true;
  });
  await new Promise(r2 => setTimeout(r2, 300));
  const b8b = await page.evaluate(() => document.getElementById('dorm-over').style.display === 'flex');
  ok(b8b, 'B12 挺过 8 波清场 → 胜利结算面板');
  await page.screenshot({ path: "/Users/clawbox/nexus-hub/pvz-web/_v3860_win.png" });

  ok(pageErrors.length === 0, `T 无页面错误（${pageErrors.length}）`);
  if (pageErrors.length) console.log("ERRORS:", pageErrors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
