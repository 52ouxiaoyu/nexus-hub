// v4.0.124 主菜单封面布局调整 —— 专项验证（不入 commit）
const path = require('path');
const puppeteer = require('puppeteer');
const base = '/Users/clawbox/nexus-hub/pvz-web';
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--window-size=1920,1080'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('file://' + path.join(base, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  const r = await page.evaluate(() => {
    const out = {};
    const rect = id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom), right: Math.round(b.right) };
    };
    out.vs = rect('btn-vs');
    out.dorm = rect('btn-dorm');
    out.helpBtn = rect('btn-help-guide');
    out.ach = rect('btn-achievements');
    out.zombie = rect('btn-zombie');
    out.player = rect('player-name');
    out.backGc = rect('btn-back-gc');
    // offsetWidth = CSS 布局宽度（不受 game-container 全局 scale 影响）；rect 为视觉宽度
    out.vsOffset = document.getElementById('btn-vs') ? document.getElementById('btn-vs').offsetWidth : null;
    out.dormOffset = document.getElementById('btn-dorm') ? document.getElementById('btn-dorm').offsetWidth : null;
    const title = document.querySelector('.game-title');
    const menuTitle = document.querySelector('.menu-title');
    if (title) { const b = title.getBoundingClientRect(); out.title = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) }; }
    if (menuTitle) out.titleMarginTop = parseInt(getComputedStyle(menuTitle).marginTop);
    if (title) out.titleFontSize = parseInt(getComputedStyle(title).fontSize);
    const playerEl = document.getElementById('player-name');
    if (playerEl) out.playerFontSize = parseInt(getComputedStyle(playerEl).fontSize);
    const backEl = document.getElementById('btn-back-gc');
    if (backEl) out.backFontSize = parseInt(getComputedStyle(backEl).fontSize);
    const zombie = document.getElementById('btn-zombie');
    const help = document.getElementById('btn-help-guide');
    out.helpAfterZombie = !!zombie && !!help && zombie.nextElementSibling === help;
    out.helpText = help ? help.innerText.trim() : null;
    const actions = document.querySelector('#start-menu #menu-actions');
    const ach = document.getElementById('btn-achievements');
    out.achInActions = !!actions && !!ach && actions.contains(ach);
    out.overlaps = [];
    const A = out.title, B = out.player, C = out.backGc, D = out.ach, E = out.zombie;
    const inter = (a, b2) => {
      if (!a || !b2) return false;
      return a.x < b2.right && a.right > b2.x && a.y < b2.bottom && a.bottom > b2.y;
    };
    if (inter(A, B)) out.overlaps.push('title-player');
    if (inter(A, C)) out.overlaps.push('title-back');
    if (inter(A, D)) out.overlaps.push('title-ach');
    if (inter(A, E)) out.overlaps.push('title-zombie');
    return out;
  });

  ok('双人对战卡宽度收紧≈310', r.vsOffset === 310 && r.vs && r.vs.w >= 260 && r.vs.w <= 300);
  ok('守屋大作战卡宽度收紧≈310', r.dormOffset === 310 && r.dorm && r.dorm.w >= 260 && r.dorm.w <= 300);
  ok('操作与说明窄卡紧跟「我是僵尸」卡', r.helpAfterZombie === true);
  ok('操作与说明按钮文案', r.helpText && r.helpText.indexOf('📜') === 0 && r.helpText.indexOf('操作与说明') >= 0);
  ok('成就按钮在右上角 menu-actions', r.achInActions === true);
  // v4.0.126：整屏收口到 900x600 设计面，标题上边距 118 -> 78（仍在顶部工具行下方、卡片上方）
  ok('标题空间合理（margin-top 70~96px）', r.titleMarginTop >= 70 && r.titleMarginTop <= 96);
  ok('标题字号加大（58px）', r.titleFontSize === 58);
  ok('左上角玩家名放大（22px）', r.playerFontSize === 22);
  ok('返回键放大（20px）', r.backFontSize === 20);
  ok('标题与左上角/成就/卡片均无重叠', r.overlaps.length === 0);
  ok('页面无 JS 崩溃', errors.length === 0);

  const r2 = await page.evaluate(() => {
    const help = document.getElementById('btn-help-guide');
    help.click();
    const modal = document.getElementById('help-modal');
    return !!modal && modal.style.display !== 'none';
  });
  ok('操作与说明弹窗正常打开', r2 === true);

  await browser.close();
  console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
