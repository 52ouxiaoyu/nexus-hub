// v3.81.4 验证：①物理点击能选中僵尸卡并部署（pointer-events 修复）②对战弹窗按钮名单行 ③键盘选卡回归
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--window-size=1400,900'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name); } };

  // ===== T1 对战弹窗：两按钮单行 + 按钮名不溢出 =====
  await page.click('#btn-vs');
  await new Promise(r => setTimeout(r, 300));
  const t1 = await page.evaluate(() => {
    const modal = document.getElementById('vs-modal');
    const row = modal.querySelector('.diff-row');
    const btns = [...modal.querySelectorAll('.diff-btn')];
    const names = btns.map(b => b.querySelector('.diff-name'));
    return {
      modalShown: getComputedStyle(modal).display,
      sameRow: btns.length === 2 && btns[0].getBoundingClientRect().top === btns[1].getBoundingClientRect().top,
      nameFits: names.every(n => n.scrollWidth <= n.clientWidth + 1 && n.getBoundingClientRect().height < 60),
      nameFs: names.map(n => getComputedStyle(n).fontSize),
    };
  });
  ok(t1.modalShown === 'flex', 'T1a 对战弹窗正常打开');
  ok(t1.sameRow, 'T1b 普通对战/融合对战两按钮同一行');
  ok(t1.nameFits, `T1c 按钮名单行放下不溢出（字号 ${t1.nameFs.join('/')}）`);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3814_vsmodal.png' });

  // 开一局普通对战
  await page.click('#vs-normal');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const isSun = t => ['sunflower', 'sunshroom', 'twinsunflower'].includes(t);
    const picked = [];
    for (const c of [...document.querySelectorAll('#chooser-grid .chooser-card')]) {
      if (picked.length >= 8) break;
      if (isSun(c.dataset.type) && picked.some(t => isSun(t))) continue;
      c.click(); picked.push(c.dataset.type);
    }
    document.getElementById('btn-lets-rock').click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    for (const c of [...document.querySelectorAll('#vz-grid .vz-card')].slice(0, 8)) c.click();
    document.getElementById('vz-rock').click();
  });
  await new Promise(r => setTimeout(r, 800));

  // ===== T2 物理点击命中僵尸卡（不再穿透） =====
  const t2 = await page.evaluate(() => {
    const card = document.querySelector('#vs-bottom-bar .zcard');
    const r = card.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { hitIsCard: !!(el && el.closest('.zcard')), barPE: getComputedStyle(document.getElementById('vs-bottom-bar')).pointerEvents };
  });
  ok(t2.barPE === 'auto', `T2a 底栏 pointer-events=auto（实际 ${t2.barPE}）`);
  ok(t2.hitIsCard, 'T2b elementFromPoint 命中僵尸卡（不再穿透到 entity-layer）');

  // ===== T3 物理点击完整部署流程（选卡 → 点草坪行 2） =====
  await page.evaluate(() => {
    const g = window._pvzGame;
    g.zombieSun = 2000; g._refreshVsZombieBar(); // 保证买得起
  });
  const cardBox = await page.evaluate(() => {
    const c = document.querySelectorAll('#vs-bottom-bar .zcard')[0];
    const b = c.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, type: c.dataset.type };
  });
  await page.mouse.click(cardBox.x, cardBox.y);
  await new Promise(r => setTimeout(r, 150));
  const sel = await page.evaluate(() => window._pvzGame.pendingZombie);
  ok(sel === cardBox.type, `T3a 物理点击选中僵尸卡（${sel}）`);

  const lawnPt = await page.evaluate(() => {
    const g = window._pvzGame;
    const cont = document.getElementById('game-container');
    const r = cont.getBoundingClientRect();
    const scale = window.gameScale || 1;
    const p = g.board.gridToScreen ? g.board.gridToScreen(2, 4) : { x: 300, y: 300 };
    return { x: r.left + p.x * scale, y: r.top + p.y * scale };
  });
  await page.mouse.click(lawnPt.x, lawnPt.y);
  await new Promise(r => setTimeout(r, 300));
  const t3 = await page.evaluate(() => {
    const g = window._pvzGame;
    const zs = g.entities.filter(e => e instanceof Zombie);
    return { n: zs.length, type: zs.length ? zs[0].type : null, row: zs.length ? zs[0].row : null,
             pending: g.pendingZombie, sun: g.zombieSun };
  });
  ok(t3.n >= 1 && t3.type === sel, `T3b 物理点击草坪成功部署僵尸（${t3.type}@行${t3.row}）`);
  ok(t3.pending === null, 'T3c 部署后选中自动清空');

  // ===== T4 键盘选卡回归（v3.81.3 功能未被破坏） =====
  const t4 = await page.evaluate(() => {
    const g = window._pvzGame;
    const im = g.inputManager;
    const send = code => document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    send('Digit1');
    const plant = im.selectedSeed;
    im.selectedSeed = null;
    g.pendingZombie = null;
    send('Numpad2');
    const zom = g.pendingZombie;
    return { plant, zom };
  });
  ok(!!t4.plant, `T4a 主键盘1 仍能选植物卡（${t4.plant}）`);
  ok(!!t4.zom, `T4b 小键盘2 仍能选僵尸卡（${t4.zom}）`);

  console.log(`\n===== ${pass} PASS / ${fail} FAIL =====`);
  if (errors.length) { console.log('页面错误:'); errors.forEach(e => console.log('  ' + e)); }
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})();
