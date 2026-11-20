const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
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
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  // 启动守屋对局
  await p.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  // 点对局内「返回主菜单」
  await p.evaluate(() => {
    const btns = document.querySelectorAll('button');
    let btn = null;
    btns.forEach(b => { if (b.textContent.includes('返回主菜单') && b.closest('#dorm-screen')) btn = b; });
    if (!btn) return 'NO_BTN';
    btn.click();
    return 'CLICKED';
  });
  const r = await p.evaluate(() => JSON.stringify({
    dormHidden: document.getElementById('dorm-screen').style.display === 'none' || getComputedStyle(document.getElementById('dorm-screen')).display === 'none',
    startShown: document.getElementById('start-menu').style.display === 'block',
    faction: document.getElementById('dorm-faction-modal').style.display,
    mode: document.getElementById('dorm-mode-modal').style.display,
    role: document.getElementById('dorm-role-modal').style.display
  }));
  const s = JSON.parse(r);
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
  ok(s.dormHidden, '对局层 dorm-screen 已隐藏');
  ok(s.startShown, '首页 start-menu 已显示');
  ok(s.faction !== 'flex' && s.faction === 'none', '阵营弹窗已关闭 (' + s.faction + ')');
  ok(s.mode === 'none', '模式弹窗已关闭 (' + s.mode + ')');
  ok(s.role === 'none', '皮肤弹窗已关闭 (' + s.role + ')');
  ok(errs.length === 0, '无 JS 错误' + (errs.length ? ':' + errs[0] : ''));
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
