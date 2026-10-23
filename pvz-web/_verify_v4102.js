// v4.0.102 验证：双人对战天使/内鬼死亡变身系统
// 场景：人机对战（玩家=僵尸方）——P2 破产死亡 → 按 1 变天使 / 2 变内鬼；形态技能；死亡判胜负
// 注意选 vsPlayerSide='zombie'：AI 植物方无变身，僵尸玩家死亡后可变身（验证 p2 侧全链路）
const path = require('path');
const puppeteer = require('puppeteer');
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
let pass = 0, fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);

  // ===== T1 玩家僵尸方开局，清空脑子+场上僵尸 → 破产触发 P2 死亡（变身机会）=====
  const t1 = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true); // 人机对战
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-zombie').click();
    await new Promise(r => setTimeout(r, 500));
    const vz = [...document.querySelectorAll('.vz-card')];
    for (const t of ['normal', 'imp']) {
      const c = vz.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)'); if (c) c.click();
    }
    const rock = document.getElementById('vz-rock');
    if (rock && !rock.disabled) rock.click();
    await new Promise(r => setTimeout(r, 900));
    return { playing: g.state === 'PLAYING', fate: !!g.vsFate, p2: g.vsFate ? g.vsFate.p2.state : '?' };
  });
  ok(`T1 人机对战（玩家僵尸方）开局，变身系统就绪（p2=${t1.p2}）`, t1.playing && t1.fate && t1.p2 === 'alive');

  // T2 破产 → P2 死亡（等待变身）；场上清光僵尸
  const t2 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    g.entities.forEach(e => { if (e instanceof Zombie) { e.hp = 0; e.state = 'DYING'; e.isDead = true; } });
    g.entities = g.entities.filter(e => !(e instanceof Zombie));
    g.zombieSun = 0;
    return { sun: g.zombieSun };
  });
  await sleep(3500); // 等破产 2.5s 判定
  const t2b = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { p2: g.vsFate.p2.state, ann: g.announcementUI ? g.announcementUI.innerText : '', playing: g.state };
  });
  ok(`T2 僵尸方破产 → P2 死亡等待变身（state=${t2b.p2}，游戏未结束=${t2b.playing === 'PLAYING'}）`, t2b.p2 === 'dead' && t2b.playing === 'PLAYING');
  ok('T2b 播报提示变身按键', t2b.ann.includes('1=😇天使') || t2b.ann.includes('阵亡'));

  // T3 按 2 变内鬼：实体入场（僵尸阵营）+ 指挥权冻结（不能再召唤）
  await page.keyboard.press('Digit2');
  await sleep(600);
  const t3 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p2.ent;
    return {
      state: g.vsFate.p2.state,
      isTraitor: ent instanceof Zombie && ent._vsKind === 'traitor',
      inEntities: g.entities.includes(ent),
      hp: ent ? ent.hp : -1
    };
  });
  ok(`T3a 按 2 → P2 变内鬼（state=${t3.state}）`, t3.state === 'traitor');
  ok('T3b 内鬼实体继承 Zombie 并在战场上（可被植物攻击）', t3.isTraitor && t3.inEntities && t3.hp === 1500);

  // T4 内鬼移动（方向键）+ 挠植物
  const t4a = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p2.ent;
    // 放一株豌豆，然后内鬼直接站上同一格（挠判定=站在植物所在格）
    const row = ent.row;
    const col = Math.max(1, Math.floor((ent.x - g.board.offsetX) / g.board.cellWidth) - 1);
    g.tryPlanting('peashooter', row, col);
    const pl = g.board.grid[row][col];
    ent.x = g.board.offsetX + col * g.board.cellWidth + g.board.cellWidth / 2;
    ent.y = g.board.offsetY + row * g.board.cellHeight + g.board.cellHeight / 2 - 20;
    return { planted: !!pl, hp0: pl ? pl.hp : -1, row };
  });
  await sleep(2500); // 挠 2.5s ≈ 250 伤
  const t4c = await page.evaluate((row) => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p2.ent;
    const pl = g.board.grid[row][Math.max(1, Math.floor((ent.x - g.board.offsetX) / g.board.cellWidth) - 1)];
    return { hpNow: pl ? pl.hp : -1, dead: pl ? pl.isDead : true, moved: ent.x };
  }, t4a.row);
  ok(`T4a 面前种豌豆成功`, t4a.planted);
  ok(`T4b 内鬼挠植物掉血（${t4a.hp0} → ${t4c.hpNow}）`, t4c.hpNow < t4a.hp0);

  // T5 内鬼狂暴：按 Digit1 → rageT=6
  await page.keyboard.press('Digit1');
  await sleep(300);
  const t5 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p2.ent;
    return { rageT: ent.rageT, rageCd: ent.rageCd };
  });
  ok(`T5 内鬼狂暴激活（rageT=${t5.rageT.toFixed(1)}，CD=${t5.rageCd.toFixed(0)}）`, t5.rageT > 5 && t5.rageCd > 29);

  // T6 内鬼被植物打死 → 植物方获胜
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    // 清掉豌豆（避免持续输出干扰），直接打空内鬼血
    g.vsFate.p2.ent.hp = 1;
    // 保证无豌豆打它：把格上植物铲了
    for (let r = 0; r < g.board.rows; r++) for (let c = 0; c < g.board.cols; c++) {
      const p = g.board.grid[r][c];
      if (p) { p.isDead = true; if (p.element && p.element.parentNode) p.element.remove(); g.board.grid[r][c] = null; }
    }
  });
  await sleep(600);
  // 手动扣最后一滴（update 下一帧判死）
  await page.evaluate(() => { const g = window.game || window._pvzGame; g.vsFate.p2.ent.hp = 0; });
  await sleep(800);
  const t6 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ov = document.querySelector('.vase-win-overlay');
    return { over: g.state === 'GAMEOVER', title: ov ? ov.innerText : '' };
  });
  ok(`T6 内鬼被消灭 → 植物方获胜结算（${t6.title.split('\n')[0]}）`, t6.over && t6.title.includes('植物方获胜'));

  // ===== 第二局：P2 变天使路径 + 天使被咬死判负 =====
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);
  await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-zombie').click();
    await new Promise(r => setTimeout(r, 500));
    const vz = [...document.querySelectorAll('.vz-card')];
    for (const t of ['normal', 'imp']) {
      const c = vz.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)'); if (c) c.click();
    }
    const rock = document.getElementById('vz-rock');
    if (rock && !rock.disabled) rock.click();
  });
  await sleep(1200);
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    g.entities = g.entities.filter(e => !(e instanceof Zombie));
    g.zombieSun = 0;
  });
  await sleep(3200);
  await page.keyboard.press('Digit1'); // 变天使
  await sleep(500);
  const t7 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    return { state: g.vsFate.p2.state, hp: g.vsFate.p2.ent.hp, angel: g.vsFate.p2.state === 'angel' };
  });
  ok(`T7 按 1 → P2 变天使（hp=${t7.hp}）`, t7.angel && t7.hp === 800);

  // T8 天使捕获：放一只僵尸在旁边 → 按 Digit1 定身
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p2.ent;
    ent.x = g.board.offsetX + 4 * g.board.cellWidth + 20;
    ent.y = g.board.offsetY + 2 * g.board.cellHeight + g.board.cellHeight / 2 - 20;
    const z = new Zombie(g, 2, 'normal');
    z.x = ent.x + 60; z.y = ent.y + 20;
    g.entities.push(z);
  });
  await sleep(200);
  await page.keyboard.press('Digit1');
  await sleep(300);
  const t8 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ent = g.vsFate.p2.ent;
    const zs = g.entities.filter(e => e instanceof Zombie && !e.isDead);
    return { capCd: ent.capCd, merit: ent.merit, frozen: zs.length ? zs[0].freezeTimer > 0 : false, n: zs.length };
  });
  ok(`T8 天使捕获定身僵尸（CD=${t8.capCd.toFixed(0)} 功德=${t8.merit} 冻结=${t8.frozen}）`, t8.capCd > 19 && t8.merit === 1 && t8.frozen);

  // T9 天使疾跑
  await page.keyboard.press('Digit2');
  await sleep(200);
  const t9 = await page.evaluate(() => (window.game || window._pvzGame).vsFate.p2.ent.spdBuffT);
  ok(`T9 天使疾跑激活（${t9.toFixed(1)}s）`, t9 > 5);

  // T10 天使被咬死 → 僵尸方获胜
  await page.evaluate(() => { const g = window.game || window._pvzGame; g.vsFate.p2.ent.invT = 0; g.vsFate.p2.ent.hp = 50; });
  await sleep(300);
  await page.evaluate(() => { const g = window.game || window._pvzGame; g.vsFate.p2.ent.hp = 0; });
  await sleep(600);
  const t10 = await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    const ov = document.querySelector('.vase-win-overlay');
    return { over: g.state === 'GAMEOVER', title: ov ? ov.innerText : '' };
  });
  ok(`T10 天使被咬死 → 僵尸方获胜结算（${t10.title.split('\n')[0]}）`, t10.over && t10.title.includes('僵尸方获胜'));

  ok('T11 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);
  console.log(`\n${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
