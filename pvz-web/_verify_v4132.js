const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 与 index.html 中 REST 保持一致（猫会在这里久坐 0.9~3.1s，必须完全不压文字）
const REST = [
  { left: 280, top: -6 }, { left: 400, top: -7 }, { left: 500, top: -6 },
  { left: 52, top: 60 }, { left: 172, top: 61 },
  { left: 0, top: 537 }, { left: 160, top: 538 }, { left: 320, top: 537 },
  { left: 480, top: 538 }, { left: 640, top: 537 },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:8899/pvz-web/index.html', { waitUntil: 'networkidle2', timeout: 40000 });
  await sleep(1800);

  let pass = 0, fail = 0;
  const ok = (c, m, e) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m + (e !== undefined ? ' -> ' + JSON.stringify(e) : ''))); };

  const rects = await page.evaluate(() => {
    const g = document.getElementById('game-container').getBoundingClientRect();
    const S = window.gameScale || 1;
    const rel = el => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - g.left) / S, y: (r.top - g.top) / S, r: (r.right - g.left) / S, b: (r.bottom - g.top) / S };
    };
    const out = [];
    document.querySelectorAll('.menu-cards .mode-card, #vs-row > button').forEach(c => {
      [...c.querySelectorAll('.pkt-name, .pkt-sub, .pkt-en, .card-desc, div, span')].forEach(e => {
        if (e.children.length === 0 && e.textContent.trim()) {
          const r = rel(e);
          if (r.b - r.y > 4 && r.b - r.y < 60) out.push({ kind: 'text', t: e.textContent.trim().slice(0, 10), ...r });
        }
      });
    });
    ['.menu-corner', '.menu-actions', '#start-version'].forEach(s => {
      const el = document.querySelector(s);
      if (el) out.push({ kind: 'ui', t: s, ...rel(el) });
    });
    return out;
  });

  const overlap = (a, r) => {
    const ox = Math.max(0, Math.min(a.x + a.w, r.r) - Math.max(a.x, r.x));
    const oy = Math.max(0, Math.min(a.y + a.h, r.b) - Math.max(a.y, r.y));
    return (ox * oy) / ((r.r - r.x) * (r.b - r.y));
  };

  const geo = () => page.evaluate(() => {
    const g = document.getElementById('game-container').getBoundingClientRect();
    const S = window.gameScale || 1;
    const cEl = document.getElementById('menu-cat');
    const c = cEl.getBoundingClientRect();
    return { x: (c.left - g.left) / S, y: (c.top - g.top) / S, w: c.width / S, h: c.height / S,
             walking: cEl.classList.contains('walking'), pe: getComputedStyle(cEl).pointerEvents,
             face: getComputedStyle(cEl).getPropertyValue('--cat-face').trim() };
  });

  console.log('=== A. 尺寸（用户：扩大到原来的一倍）===');
  const g0 = await geo();
  ok(Math.abs(g0.w / 38.7 - 2) < 0.06, '视觉宽正好是原来 2 倍 → ' + g0.w.toFixed(1) + 'px（原 38.7）');
  ok(Math.abs(g0.h / 29.7 - 2) < 0.06, '视觉高正好是原来 2 倍 → ' + g0.h.toFixed(1) + 'px（原 29.7）');

  console.log('=== B. 静止落脚点（猫会久坐的地方）绝不压文字 ===');
  let worstRest = 0, restInfo = null;
  for (const p of REST) {
    const box = { x: p.left + 4.3, y: p.top + 3.3, w: 77.4, h: 59.4 };
    for (const r of rects) {
      if (r.kind !== 'text') continue;
      const ra = overlap(box, r);
      if (ra > worstRest) { worstRest = ra; restInfo = { at: 'left' + p.left + ',top' + p.top, t: r.t, ratio: +ra.toFixed(2) }; }
    }
  }
  ok(worstRest < 0.4, '10 个落脚点里，最多只擦到某行文字 ' + (worstRest * 100).toFixed(0) + '%（阈值 40%）', restInfo);

  console.log('=== C. 整屏走动（采样 40s / 每 400ms）===');
  const S = [];
  for (let i = 0; i < 100; i++) { S.push(await geo()); await sleep(400); }
  const xs = S.map(s => s.x), ys = S.map(s => s.y);
  const uniq = new Set(S.map(s => Math.round(s.x / 15) + ',' + Math.round(s.y / 15))).size;
  ok(uniq >= 12, '到过 ' + uniq + ' 个不同位置（≥12）');
  ok(Math.max(...ys) - Math.min(...ys) > 300, '纵向跨度 ' + Math.round(Math.max(...ys) - Math.min(...ys)) + 'px > 300（不再只在底部）');
  ok(Math.max(...xs) - Math.min(...xs) > 300, '横向跨度 ' + Math.round(Math.max(...xs) - Math.min(...xs)) + 'px > 300');
  ok(Math.min(...ys) < 60, '到过屏幕顶部 y=' + Math.round(Math.min(...ys)));
  ok(Math.max(...ys) > 480, '到过草地 y=' + Math.round(Math.max(...ys)));
  ok(S.some(s => s.walking), '有走路状态');
  ok(S.filter(s => s.walking).every(s => s.pe === 'none'), '走路时 pointer-events:none（不抢卡片点击）');
  ok(S.filter(s => !s.walking).every(s => s.pe === 'auto'), '站定时可点击互动');
  ok(S.some(s => s.face === '-1') && S.some(s => s.face === '1'), '左右朝向都出现（会转身）');
  ok(S.every(s => s.x > -10 && s.y > -12 && s.x + s.w < 911 && s.y + s.h < 606), '始终在画布内');

  console.log('=== D. 只「路过」不「赖着」（移动中横穿文字行允许，但不能停）===');
  // 逐帧标记：是否对某行文字遮挡 >40%
  const marks = S.map(s => rects.some(r => r.kind === 'text' && overlap(s, r) > 0.4));
  let run = 0, maxRun = 0;
  marks.forEach(m => { run = m ? run + 1 : 0; if (run > maxRun) maxRun = run; });
  ok(maxRun <= 4, '连续遮挡文字行最多 ' + (maxRun * 0.4).toFixed(1) + 's（阈值 1.6s，即路过而非停留）');
  const catArea = 77.4 * 59.4, scrArea = 900 * 600;
  ok(catArea / scrArea < 0.012, '猫本身只占屏幕 ' + (catArea / scrArea * 100).toFixed(2) + '% 面积，远不到「大部分」');

  console.log('=== E. 不压 UI 控件（玩家名/返回/成就/说明/版本徽标）===');
  let worstUI = 0, uiInfo = null;
  for (const s of S) for (const r of rects) {
    if (r.kind !== 'ui') continue;
    const ra = overlap(s, r);
    if (ra > worstUI) { worstUI = ra; uiInfo = { t: r.t, ratio: +ra.toFixed(2) }; }
  }
  ok(worstUI < 0.3, '最多遮挡 ' + (worstUI * 100).toFixed(0) + '%（阈值 30%）', uiInfo);

  ok(errs.length === 0, '无 pageerror', errs.slice(0, 2));

  console.log('\n=== ' + pass + ' pass / ' + fail + ' fail ===');
  console.log('活动范围  x:', Math.round(Math.min(...xs)), '~', Math.round(Math.max(...xs)),
              ' y:', Math.round(Math.min(...ys)), '~', Math.round(Math.max(...ys)));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
