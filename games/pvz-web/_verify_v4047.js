// v4.0.47 验证：拆除返还=累计真实投入的一半（种植+历次升级）；盲盒/白得植物不返还；孢子同理
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });

  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(800);

  // ===== T0 场景准备 =====
  const setup = await p.evaluate(() => {
    const g = window.game;
    g.ais.forEach(a => { a.actTimer = 9999; });
    g.zombiesPerMin = 0;
    g.dnNext = 1e12; // 禁自动昼夜切换（避免植物睡觉干扰无关，但保持稳定）
    g.player.invincibleT = 9999;
    const freeRoom = g.rooms.find(rm => !rm.owners || rm.owners.length === 0) || g.rooms[0];
    const emptyCells = [];
    for (let r = 0; r < freeRoom.tpl.grid.length; r++) {
      for (let c = 0; c < freeRoom.tpl.grid[r].length; c++) {
        if (freeRoom.tpl.grid[r][c] === 1) emptyCells.push({ c: freeRoom.x + c, r: freeRoom.y + r });
      }
    }
    g.player.sun = 5000; g.player.spore = 50000;
    // 认领房间（走真实 _claimRoom，会自动补免费门板——门板无投入）
    g._claimRoom(g.player, freeRoom);
    return { room: g.rooms.indexOf(freeRoom), cells: emptyCells.slice(0, 6) };
  });
  ok(setup.cells.length >= 4, 'T0 测试房间就绪（空格 ' + setup.cells.length + ' 个）');

  // ===== T1 真实路径种植记账（doPlant → investSun=8）=====
  const t1 = await p.evaluate(s => {
    const g = window.game;
    g.menuCol = s.cells[0].c; g.menuRow = s.cells[0].r;
    const sun0 = g.player.sun;
    g.doPlant('peashooter');
    const pl = g.plants.find(q => q.c === s.cells[0].c && q.r === s.cells[0].r);
    return { invested: pl ? pl.investSun : 'NO_PLANT', paid: sun0 - g.player.sun, name: pl && pl.def.name };
  }, setup);
  ok(t1.invested === 8 && t1.paid === 8, 'T1 doPlant 种豌豆：付 8☀、investSun=8（实得 ' + t1.invested + '/' + t1.paid + '）');

  // ===== T2 升级链累计：8 → +16 → +32 = 56（用户例：玉米投手）=====
  const t2 = await p.evaluate(s => {
    const g = window.game;
    let pl = g.plants.find(q => q.c === s.cells[0].c && q.r === s.cells[0].r);
    g._evolve(pl, 'cabbagepult', 16, 0);            // 弹窗/键盘升级付费后就是这套调用
    pl = g.plants.find(q => q.c === s.cells[0].c && q.r === s.cells[0].r);
    const inv2 = pl.investSun;
    g._evolve(pl, 'kernelpult', 32, 0);
    pl = g.plants.find(q => q.c === s.cells[0].c && q.r === s.cells[0].r);
    return { inv2, inv3: pl.investSun, name: pl.def.name, investSpore: pl.investSpore };
  }, setup);
  ok(t2.inv2 === 24, 'T2a 升卷心菜：累计 8+16=24（实得 ' + t2.inv2 + '）');
  ok(t2.inv3 === 56 && t2.name === '玉米射手', 'T2b 升玉米射手：累计 8+16+32=56（实得 ' + t2.inv3 + '，' + t2.name + '）');

  // ===== T3 拆除返还 28（走真实弹窗按钮：点两次=确认）=====
  const t3 = await p.evaluate(s => {
    const g = window.game;
    const pl = g.plants.find(q => q.c === s.cells[0].c && q.r === s.cells[0].r);
    g._closePopup();
    g.popupPlant = pl; g.popupPlayer = g.player; // 注意：_closePopup 会清空 popupPlant，必须在其后设置
    const sun0 = g.player.sun;
    g.ppDemolish.onclick(); // 第一次：进入待确认
    const armed = g._delArmed === pl;
    g.ppDemolish.onclick(); // 第二次：2.5s 内确认拆除
    return { armed, refund: g.player.sun - sun0, gone: !g.plants.includes(pl) };
  }, setup);
  ok(t3.armed, 'T3a 第一次点拆除 → 进入二次确认');
  ok(t3.refund === 28 && t3.gone, 'T3b 玉米射手（投入56）拆除返 28☀（实得 ' + t3.refund + '）');

  // ===== T4 盲盒开出：不计投入，拆除零返还 =====
  const t4 = await p.evaluate(s => {
    const g = window.game;
    g.menuCol = s.cells[1].c; g.menuRow = s.cells[1].r;
    const sp0 = g.player.spore;
    g.doPlant('blindbox');
    const pl = g.plants.find(q => q.c === s.cells[1].c && q.r === s.cells[1].r);
    if (!pl) return { err: 'NO_PLANT' };
    const invS = pl.investSun, invSp = pl.investSpore;
    // 打开弹窗看按钮文案，然后双击拆除
    g._closePopup();
    g.popupPlant = pl; g.popupPlayer = g.player;
    const sun0 = g.player.sun, spore0 = g.player.spore;
    g.ppDemolish.onclick(); g.ppDemolish.onclick();
    return { invS, invSp, boxPaid: sp0 - g.player.spore + 0, refundSun: g.player.sun - sun0, refundSpore: g.player.spore - spore0, gone: !g.plants.includes(pl) };
  }, setup);
  ok(!t4.err && t4.invS === 0 && t4.invSp === 0, 'T4a 盲盒开出植物：投入=0（实得 ' + t4.invS + '/' + t4.invSp + '）');
  ok(t4.refundSun === 0 && t4.refundSpore === 0 && t4.gone, 'T4b 盲盒植物拆除：零返还（实得 ☀' + t4.refundSun + ' 🦠' + t4.refundSpore + '）');

  // ===== T5 键盘菜单路径种植记账（_execKMenu buy）=====
  const t5 = await p.evaluate(s => {
    const g = window.game;
    const menu = { targetCol: s.cells[2].c, targetRow: s.cells[2].r, options: [{ action: 'buy', type: 'peashooter' }] };
    const sun0 = g.player.sun;
    g._execKMenu(g.player, menu, menu.options[0]);
    const pl = g.plants.find(q => q.c === s.cells[2].c && q.r === s.cells[2].r);
    return { paid: sun0 - g.player.sun, invested: pl ? pl.investSun : 'NO_PLANT' };
  }, setup);
  ok(t5.paid === 8 && t5.invested === 8, 'T5 键盘菜单种豌豆：investSun=8（实得 ' + t5.invested + '/' + t5.paid + '）');

  // ===== T6 孢子链：路灯花 128🦠 → +2028 → 拆除返一半 =====
  const t6 = await p.evaluate(s => {
    const g = window.game;
    const menu = { targetCol: s.cells[3].c, targetRow: s.cells[3].r, options: [{ action: 'buy', type: 'plantern' }] };
    g._execKMenu(g.player, menu, menu.options[0]);
    let pl = g.plants.find(q => q.c === s.cells[3].c && q.r === s.cells[3].r);
    const inv0 = pl && pl.investSpore;
    if (pl) { g._evolve(pl, 'plantern2', 0, 2028); pl = g.plants.find(q => q.c === s.cells[3].c && q.r === s.cells[3].r); }
    const inv1 = pl && pl.investSpore;
    // 弹窗拆除
    g._closePopup();
    g.popupPlant = pl; g.popupPlayer = g.player;
    const sp0 = g.player.spore;
    g.ppDemolish.onclick(); g.ppDemolish.onclick();
    return { inv0, inv1, refund: g.player.spore - sp0 };
  }, setup);
  ok(t6.inv0 === 128, 'T6a 路灯花种植：investSpore=128（实得 ' + t6.inv0 + '）');
  ok(t6.inv1 === 2156, 'T6b 升 Lv2：累计 128+2028=2156（实得 ' + t6.inv1 + '）');
  ok(t6.refund === 1078, 'T6c 拆除返 1078🦠（2156÷2，实得 ' + t6.refund + '）');

  // ===== T7 免费门板/初始植物：无投入拆除零返还 =====
  const t7 = await p.evaluate(() => {
    const g = window.game;
    const door = g.plants.find(q => q.isDoor);
    if (!door) return { err: 'NO_DOOR' };
    const inv = (door.investSun || 0) + '+' + (door.investSpore || 0);
    g._closePopup();
    g.popupPlant = door; g.popupPlayer = g.player;
    const sun0 = g.player.sun;
    g.ppDemolish.onclick(); g.ppDemolish.onclick();
    return { inv, refund: g.player.sun - sun0, gone: !g.plants.includes(door) };
  });
  ok(!t7.err && t7.inv === '0+0' && t7.refund === 0 && t7.gone, 'T7 免费门板：投入 ' + t7.inv + '、拆除零返还、可正常拆走');

  // ===== T8 弹窗按钮显示返还预览 =====
  const t8 = await p.evaluate(s => {
    const g = window.game;
    const menu = { targetCol: s.cells[4].c, targetRow: s.cells[4].r, options: [{ action: 'buy', type: 'peashooter' }] };
    g._execKMenu(g.player, menu, menu.options[0]);
    const pl = g.plants.find(q => q.c === s.cells[4].c && q.r === s.cells[4].r);
    g.plantClick(pl, 400, 300);
    const txt = g.ppDemolish.innerText;
    g._closePopup();
    return txt;
  }, setup);
  ok(/返.*☀4/.test(t8), 'T8 弹窗拆除按钮显示预览「返☀4」（实际文案：' + t8 + '）');

  console.log(`\n===== v4.0.47 结果: ${pass} pass / ${fail} fail =====`);
  await p.screenshot({ path: '_v4047_refund.png' });
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
