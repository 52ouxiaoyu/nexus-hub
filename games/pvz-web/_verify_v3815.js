// v3.81.5 验证：①玩法弹窗 #vs-back 变木牌且能回主菜单 ②选卡页木牌已删 ③选卡页 Return/上一页 回退正常
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

  // ===== T1 玩法弹窗：#vs-back 是木牌样式 + 物理点击回主菜单 =====
  await page.click('#btn-vs');
  await new Promise(r => setTimeout(r, 300));
  const t1 = await page.evaluate(() => {
    const b = document.getElementById('vs-back');
    const cs = getComputedStyle(b);
    return { shown: b.getBoundingClientRect().height > 0, bg: cs.backgroundColor, font: cs.fontFamily.includes('Kaiti'),
             below: b.getBoundingClientRect().top > document.getElementById('vs-fusion').getBoundingClientRect().bottom - 5 };
  });
  ok(t1.shown, 'T1a 玩法弹窗「返回主菜单」可见');
  ok(t1.bg === 'rgb(74, 48, 24)' && t1.font, `T1b 已是同款木牌样式（bg=${t1.bg}）`);
  ok(t1.below, 'T1c 位于普通/融合对战正下方');
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3815_vsmodal.png' });
  const backBtn = await page.evaluate(() => {
    const b = document.getElementById('vs-back');
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(backBtn.x, backBtn.y);
  await new Promise(r => setTimeout(r, 300));
  const afterBack = await page.evaluate(() => ({
    modal: document.getElementById('vs-modal').style.display,
    menu: document.getElementById('start-menu').style.display,
  }));
  ok(afterBack.modal === 'none' && afterBack.menu !== 'none', `T1d 物理点击木牌回主菜单（modal=${afterBack.modal} menu=${afterBack.menu || '默认可见'}）`);

  // ===== T2 选卡页：木牌已删，Return 正常回玩法弹窗 =====
  await page.click('#btn-vs');
  await new Promise(r => setTimeout(r, 200));
  await page.click('#vs-normal');
  await new Promise(r => setTimeout(r, 300));
  const t2 = await page.evaluate(() => ({
    plantGone: !document.getElementById('vs-plant-menu'),
    vzGone: !document.getElementById('vz-menu'),
    returnBtn: !!document.getElementById('btn-back'),
  }));
  ok(t2.plantGone && t2.vzGone, 'T2a 植物/僵尸选卡页木牌已删除');
  const retBtn = await page.evaluate(() => {
    const b = document.getElementById('btn-back');
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(retBtn.x, retBtn.y);
  await new Promise(r => setTimeout(r, 300));
  const t2b = await page.evaluate(() => ({
    chooser: document.getElementById('seed-chooser').style.display,
    modal: document.getElementById('vs-modal').style.display,
  }));
  ok(t2b.chooser === 'none' && t2b.modal === 'flex', 'T2b 选卡页 Return 回到玩法弹窗');

  // ===== T3 僵尸选卡页上一页正常（木牌删除后无残留引用报错） =====
  await page.click('#vs-normal');
  await new Promise(r => setTimeout(r, 200));
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
  const t3 = await page.evaluate(() => {
    const b = document.getElementById('vz-back');
    const r = b.getBoundingClientRect();
    b.click();
    return { shown: r.height > 0, backToPlant: document.getElementById('seed-chooser').style.display };
  });
  ok(t3.shown, 'T3a 僵尸选卡页可见');
  ok(t3.backToPlant === 'flex', 'T3b 上一页回到植物选卡页');
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3815_chooser.png' });

  console.log(`\n===== ${pass} PASS / ${fail} FAIL =====`);
  if (errors.length) { console.log('页面错误:'); errors.forEach(e => console.log('  ' + e)); }
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})();
