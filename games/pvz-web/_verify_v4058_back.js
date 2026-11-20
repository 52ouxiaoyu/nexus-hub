const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('document.getElementById("btn-dorm") && typeof window.exitDormGame === "function"', { timeout: 20000 });

  // —— 用户流程：守屋卡片 → 阵营(植物) → 模式(单人) → 皮肤界面 ——
  await p.evaluate(() => {
    document.getElementById('btn-dorm').click();
  });
  await p.evaluate(() => {
    document.getElementById('btn-faction-plant').click();
  });
  await p.evaluate(() => {
    document.getElementById('btn-dorm-1p').click();
  });
  const inRole = await p.evaluate(() => document.getElementById('dorm-role-modal').style.display === 'flex');
  ok(inRole, 'T1 已进入皮肤选择界面');

  // —— 皮肤界面点「返回」→ 直达首页 ——
  await p.evaluate(() => { document.getElementById('dorm-back').click(); });
  const r1 = await p.evaluate(() => JSON.stringify({
    role: document.getElementById('dorm-role-modal').style.display,
    mode: document.getElementById('dorm-mode-modal').style.display,
    faction: document.getElementById('dorm-faction-modal').style.display,
    start: document.getElementById('start-menu').style.display
  }));
  const s1 = JSON.parse(r1);
  ok(s1.role === 'none' && s1.mode === 'none' && s1.faction === 'none', 'T2 皮肤界面「返回」→ 三个弹窗全部关闭');
  ok(s1.start === 'block', 'T3 首页 start-menu 显示（直达首页）');

  // —— 再次进入，模式选择界面点「返回主菜单」→ 直达首页 ——
  await p.evaluate(() => {
    document.getElementById('btn-dorm').click();
    document.getElementById('btn-faction-plant').click();
  });
  await p.evaluate(() => { document.getElementById('dorm-mode-back').click(); });
  const r2 = await p.evaluate(() => JSON.stringify({
    mode: document.getElementById('dorm-mode-modal').style.display,
    faction: document.getElementById('dorm-faction-modal').style.display,
    start: document.getElementById('start-menu').style.display
  }));
  const s2 = JSON.parse(r2);
  ok(s2.mode === 'none' && s2.faction === 'none', 'T4 模式界面「返回主菜单」→ 弹窗全部关闭');
  ok(s2.start === 'block', 'T5 首页 start-menu 显示（直达首页）');

  // —— 阵营界面「返回主菜单」→ 直达首页 ——
  await p.evaluate(() => { document.getElementById('btn-dorm').click(); });
  await p.evaluate(() => { document.getElementById('dorm-faction-back').click(); });
  const r3 = await p.evaluate(() => JSON.stringify({
    faction: document.getElementById('dorm-faction-modal').style.display,
    start: document.getElementById('start-menu').style.display
  }));
  const s3 = JSON.parse(r3);
  ok(s3.faction === 'none', 'T6 阵营界面「返回主菜单」→ 弹窗关闭');
  ok(s3.start === 'block', 'T7 首页 start-menu 显示（直达首页）');

  ok(errs.length === 0, 'T8 无 JS 错误' + (errs.length ? ':' + errs[0] : ''));
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
