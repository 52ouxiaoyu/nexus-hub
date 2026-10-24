// v4.0.112 验证：守屋大作战封面插画重做（三段景深 + 去 emoji + 原版投影/阳光）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('document.getElementById("btn-dorm")', { timeout: 20000 });
  await page.evaluate(() => { const m = document.getElementById('start-menu'); if (m) m.style.display = 'block'; });
  await sleep(1500);

  // ---------- T1 DOM 结构 ----------
  const t1 = await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    const imgs = [...art.querySelectorAll('img')];
    return {
      imgCount: imgs.length,
      plants: imgs.filter(i => /Plants\//.test(i.getAttribute('src'))).length,
      sunSrc: (art.querySelector('.dorm-sun') || {}).tagName === 'IMG'
        ? art.querySelector('.dorm-sun').getAttribute('src') : null,
      sunLoaded: (() => { const s = art.querySelector('.dorm-sun'); return s && s.naturalWidth > 0; })(),
      shCount: art.querySelectorAll('.dorm-sh').length,
      leaf: art.querySelectorAll('.dorm-leaf').length,
      text: art.textContent.trim()
    };
  });
  ok(t1.imgCount === 4 && t1.plants === 3, `T1a 插画区 3 张植物 + 1 张阳光（实测 img ${t1.imgCount}，植物 ${t1.plants}）`);
  ok(/Sun\.gif$/.test(t1.sunSrc || ''), `T1b 阳光换成原版素材（src=${t1.sunSrc}）`);
  ok(t1.sunLoaded, 'T1c 阳光素材已实际加载（naturalWidth > 0）');
  ok(t1.shCount === 3, `T1d 三枚贴地投影元素就位（实测 ${t1.shCount}）`);
  ok(t1.leaf === 0 && t1.text === '', `T1e emoji 已清空（叶子 ${t1.leaf} 个，插画区纯文本="${t1.text}"）`);

  // ---------- T2 布局：远小近大 + 从左到右 ----------
  const t2 = await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    const r = art.getBoundingClientRect();
    const k = 158 / r.width;   // 菜单整体有 scale，换算回 CSS px
    const g = sel => {
      const e = art.querySelector(sel); const b = e.getBoundingClientRect();
      return { x: +((b.x - r.x) * k).toFixed(1), w: +(b.width * k).toFixed(1), h: +(b.height * k).toFixed(1),
               bottom: +((r.bottom - b.bottom) * k).toFixed(1) };
    };
    return {
      artW: +(r.width * k).toFixed(1), artH: +(r.height * k).toFixed(1),
      left: g('.dorm-side-l'), hero: g('.dorm-hero'), right: g('.dorm-side-r'), sun: g('.dorm-sun'),
      afterH: getComputedStyle(art, '::after').height,
      shBg: getComputedStyle(art.querySelector('.dorm-sh-c')).backgroundImage,
      cardH: +document.querySelector('#btn-dorm').getBoundingClientRect().height.toFixed(1),
      vsH: +document.querySelector('#btn-vs').getBoundingClientRect().height.toFixed(1)
    };
  });
  ok(t2.artW === 158 && Math.abs(t2.artH - 117.2) < 1, `T2a 插画画布尺寸未被破坏（${t2.artW}×${t2.artH}）`);
  // 插画区有 3px 边框，absolute 的 left/right 从 padding box 起算 → 期望值统一 +3 / -3
  const expL = 3 + 4, expHero = 3 + 34, expR = 158 - 3 - 2 - t2.right.w;
  ok(Math.abs(t2.left.x - expL) < 2 && Math.abs(t2.hero.x - expHero) < 2 && Math.abs(t2.right.x - expR) < 2,
     `T2b 三段横向位置正确（向日葵 x=${t2.left.x}/期望${expL} · 高坚果 x=${t2.hero.x}/期望${expHero} · 豌豆 x=${t2.right.x}/期望${expR.toFixed(1)}）`);
  ok(Math.abs(t2.left.h - 38) < 1.5 && Math.abs(t2.hero.h - 84) < 1.5 && Math.abs(t2.right.h - 62) < 1.5,
     `T2c 远小近大尺寸成立（远景 ${t2.left.h} / 近景 ${t2.hero.h} / 中景 ${t2.right.h}）`);
  ok(t2.left.h < t2.right.h && t2.right.h < t2.hero.h,
     `T2d 高度阶梯 向日葵 < 豌豆 < 高坚果（${t2.left.h} < ${t2.right.h} < ${t2.hero.h}）`);

  // ---------- T3 遮挡：每只被前层压掉的比例 ----------
  const cover = [{ n: '向日葵', a: t2.left, b: t2.hero }, { n: '豌豆', a: t2.right, b: t2.hero }].map(({ n, a, b }) => {
    const ov = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    return { n, ratio: +(1 - ov / a.w).toFixed(2), ov: +ov.toFixed(1) };
  });
  ok(cover.every(c => c.ratio >= 0.75),
     `T3a 两侧植物可见度 ≥75%（向日葵 ${(cover[0].ratio * 100).toFixed(0)}% / 豌豆 ${(cover[1].ratio * 100).toFixed(0)}%，各被前层压 ${cover[0].ov}/${cover[1].ov}px，改前是压掉半张脸）`);

  // ---------- T4 地平线 / 投影 / 草地 ----------
  ok(Math.abs(t2.left.bottom - t2.hero.bottom) <= 25 && Math.abs(t2.right.bottom - t2.hero.bottom) <= 25,
     `T4a 三只脚底向同一地平线收敛（${t2.left.bottom}/${t2.hero.bottom}/${t2.right.bottom}px，景深有意错落 ≤25px）`);
  ok(t2.afterH === '16px', `T4b 草地台阶存在（::after 高 ${t2.afterH}）`);
  ok(/plantshadow32\.png/.test(t2.shBg), 'T4c 投影用的是原版 plantshadow32.png');

  // ---------- T5 阳光在主画面上层 + 不压植物 ----------
  ok(t2.sun.x < t2.left.x + t2.left.w && t2.sun.bottom > t2.left.bottom + 30,
     `T5 阳光浮在左上天空区、不压向日葵（x=${t2.sun.x} bottom=${t2.sun.bottom}，向日葵 x=${t2.left.x} bottom=${t2.left.bottom}）`);

  // ---------- T6 不破坏相邻卡片 ----------
  ok(Math.abs(t2.cardH - t2.vsH) < 1, `T6a 守屋卡与双人对战卡仍等高（${t2.cardH.toFixed(1)} vs ${t2.vsH.toFixed(1)}）`);
  const t6 = await page.evaluate(() => {
    const vs = document.querySelector('#btn-vs .pkt-art img');
    const d = document.querySelector('#btn-dorm .pkt-art img');
    return { vsH: getComputedStyle(vs).height, lastRule: [...document.styleSheets].length > 0 };
  });
  ok(t6.vsH === '56px', `T6b 双人对战卡插图尺寸未受影响（img height=${t6.vsH}）`);

  // ---------- T7 无 JS 异常 ----------
  ok(errors.length === 0, `T7 无 JS 异常（${errors.length} 条）${errors.length ? ' → ' + errors.slice(0, 3).join(' | ') : ''}`);

  // ---------- 出图 ----------
  await page.screenshot({ path: '_v4112_menu_full.png' });
  await (await page.$('#btn-dorm')).screenshot({ path: '_v4112_dorm_card.png' });
  await (await page.$('#vs-row')).screenshot({ path: '_v4112_vs_row.png' });

  console.log(`\n${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
