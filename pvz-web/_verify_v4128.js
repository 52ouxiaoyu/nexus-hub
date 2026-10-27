/**
 * _verify_v4128.js —— 主菜单回滚到 v4.0.123 大卡片布局
 *
 * 用户诉求：「现在这个图片更不完整了，返回上次的那个图片，还是太丑了」
 * 所以本脚本断言的正是**回滚后的 123 版几何**：
 *   · 一行 4 张模式卡 196×258（不是 158×200 的挤扁版）
 *   · 绿色插图框四张等高 104px、图片零裁切（罐子/僵尸脚都在框内）
 *   · 「操作与道具说明」回到右上角顶部工具行（不是第 5 张卡）
 *   · 下排双人/守屋 419px 宽、vs-row 856px
 *   · 标题 46px、落在说明按钮下方 / 卡片上方
 *   · 画布仍按 900×600 纯等比铺满（v4.0.127 的修复不被回滚带走）
 *
 * 运行：node _verify_v4128.js
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'file://' + path.resolve(__dirname, 'index.html');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg); }
  else { fail++; console.log('  ❌ ' + msg); }
}

async function measure(page, vp) {
  await page.setViewport({ width: vp[0], height: vp[1] });
  await page.goto(URL);
  await page.waitForFunction('typeof window.startHauntedDorm === "function"');
  await page.waitForFunction('!!document.getElementById("btn-help-guide")');
  await new Promise(r => setTimeout(r, 900));
  return page.evaluate(() => {
    const S = window.gameScale;
    const R = e => e.getBoundingClientRect();
    const gc = R(document.getElementById('game-container'));
    // 统一换算到 900×600 设计面坐标
    const D = v => +(v / S).toFixed(2);
    const box = e => { const r = R(e); return { x: D(r.left - gc.left), y: D(r.top - gc.top), w: D(r.width), h: D(r.height), right: D(r.right - gc.left), bottom: D(r.bottom - gc.top) }; };

    const cards = [...document.querySelectorAll('#start-menu .menu-cards > .mode-card')];
    const help = document.getElementById('btn-help-guide');
    const ach = [...document.querySelectorAll('#start-menu #menu-actions > *')].find(b => b !== help);
    const title = document.querySelector('#start-menu .game-title');
    const vsRow = document.getElementById('vs-row');

    const cardsInfo = cards.map(c => {
      const art = c.querySelector('.pkt-art');
      const img = art ? art.querySelector(':scope > img') : null;   // 只取插图区直系大图（融合卡是公式，不参与）
      const ar = art ? R(art) : null, ir = img ? R(img) : null;
      return {
        id: c.id,
        w: c.offsetWidth, h: c.offsetHeight,
        box: box(c),
        artH: art ? art.offsetHeight : 0,
        artW: art ? art.offsetWidth : 0,
        imgH: img ? D(ir.height) : 0,
        clipTop: img ? +(D(ar.top) - D(ir.top)).toFixed(2) : 0,     // >0 = 图片上沿被切
        clipBot: img ? +(D(ir.bottom) - D(ar.bottom)).toFixed(2) : 0, // >0 = 图片下沿被切
        clipL: img ? +(D(ar.left) - D(ir.left)).toFixed(2) : 0,
        clipR: img ? +(D(ir.right) - D(ar.right)).toFixed(2) : 0,
        ovfY: c.scrollHeight - c.clientHeight,
        ovfX: c.scrollWidth - c.clientWidth
      };
    });

    return {
      vp: innerWidth + 'x' + innerHeight,
      scale: +S.toFixed(4),
      designW: D(gc.width), designH: D(gc.height),
      fillX: +(gc.width / innerWidth).toFixed(3),
      fillY: +(gc.height / innerHeight).toFixed(3),
      nCards: cards.length,
      cards: cardsInfo,
      help: help ? box(help) : null,
      helpInActions: !!(help && help.parentElement && help.parentElement.id === 'menu-actions'),
      helpText: help ? help.textContent.replace(/\s+/g, '') : '',
      ach: ach ? box(ach) : null,
      title: title ? Object.assign(box(title), { fs: getComputedStyle(title).fontSize }) : null,
      titleText: title ? title.textContent.trim() : '',
      hasSubTitle: !!(document.querySelector('#start-menu .game-sub') || document.querySelector('#start-menu .title-sub')),
      vsRow: vsRow ? box(vsRow) : null,
      vs: document.getElementById('btn-vs') ? Object.assign(box(document.getElementById('btn-vs')), { w: document.getElementById('btn-vs').offsetWidth }) : null,
      dorm: document.getElementById('btn-dorm') ? Object.assign(box(document.getElementById('btn-dorm')), { w: document.getElementById('btn-dorm').offsetWidth }) : null,
      verText: (document.getElementById('start-version') || {}).textContent || '',
      docScrollW: document.documentElement.scrollWidth,
      innerW: innerWidth
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  console.log('\n=== v4.0.128 主菜单回滚验收（1280×860）===');
  const M = await measure(page, [1280, 860]);

  // ① 缩放：仍是纯等比铺满（v4.0.127 的修复不能被回滚带走）
  const exp = Math.min(1280 / 900, 860 / 600);
  ok(Math.abs(M.scale - exp) < 0.01, `画布仍纯等比铺满（scale ${M.scale} = min(1280/900,860/600)=${exp.toFixed(4)}）`);
  ok(M.designW === 900 && M.designH === 600, `设计面 900×600（实测 ${M.designW}×${M.designH}）`);
  ok(M.fillX >= 0.995 || M.fillY >= 0.995, `至少一方向铺满（宽 ${M.fillX * 100}% / 高 ${M.fillY * 100}%）`);

  // ② 卡片回到「大卡片」
  ok(M.nCards === 4, `第一行 4 张模式卡（实际 ${M.nCards} 张，不是 5 张挤一行）`);
  const all196 = M.cards.every(c => c.w === 196 && c.h === 258);
  ok(all196, `四张卡均为 196×258（实测 ${M.cards.map(c => c.w + '×' + c.h).join(' / ')}）`);

  // ③ 绿色插图框等高、图片零裁切
  const artHs = M.cards.map(c => c.artH);
  ok(new Set(artHs).size === 1 && artHs[0] === 104, `四张插图框等高 104px（实测 ${artHs.join(' / ')}）`);
  const clipped = M.cards.filter(c => c.clipTop > 0.5 || c.clipBot > 0.5 || c.clipL > 0.5 || c.clipR > 0.5);
  ok(clipped.length === 0, '插图零裁切（' + (clipped.length ? clipped.map(c => c.id + ':' + [c.clipTop, c.clipBot].join('/')).join(', ') : '罐子/僵尸/向日葵全部在框内') + '）');
  const vase = M.cards.find(c => c.id === 'btn-vase');
  const zombie = M.cards.find(c => c.id === 'btn-zombie');
  ok(vase && vase.imgH >= 96, `问号罐子够大（高 ${vase ? vase.imgH : '?'}px，不再压到 78px）`);
  ok(zombie && zombie.imgH >= 92, `僵尸够大（高 ${zombie ? zombie.imgH : '?'}px，不再压到 74px）`);
  const ovf = M.cards.filter(c => c.ovfY > 0 || c.ovfX > 0);
  ok(ovf.length === 0, '卡片文字不溢出边框（溢出 ' + ovf.length + ' 张）');

  // ④ 说明按钮回到右上角顶部工具行
  ok(M.helpInActions === true, '「操作与道具说明」挂在右上角 #menu-actions');
  ok(M.helpText.indexOf('操作与道具说明') >= 0, `说明按钮文案完整（"${M.helpText}"）`);
  ok(!!M.help && M.help.y < M.title.y, `说明按钮在标题上方（按钮 y ${M.help ? M.help.y : '?'} < 标题 y ${M.title.y}）`);
  ok(!!M.ach && M.ach.x > M.help.right - 1, `成就按钮在说明右侧（${M.ach ? M.ach.x : '?'} > ${M.help ? M.help.right : '?'}）`);

  // ⑤ 标题：46px、无英文副标题、在卡片上方
  ok(M.title.fs === '46px', `标题字号回到 46px（实测 ${M.title.fs}）`);
  ok(M.hasSubTitle === false, '标题下没有英文副标题（Plants vs. Zombies 已删）');
  ok(!/[A-Za-z]/.test(M.titleText), `标题纯中文（"${M.titleText}"）`);
  const minCardY = Math.min(...M.cards.map(c => c.box.y));
  ok(M.title.bottom <= minCardY + 0.5, `标题在卡片上方（标题底 ${M.title.bottom} ≤ 卡顶 ${minCardY}）`);

  // ⑥ 下排双人/守屋：419 宽、vs-row 856
  ok(M.vsRow && Math.abs(M.vsRow.w - 856) < 2, `下排行宽 856px（实测 ${M.vsRow ? M.vsRow.w : '?'}）`);
  ok(M.vs && M.vs.w === 419 && M.dorm && M.dorm.w === 419, `双人/守屋各 419px 宽（实测 ${M.vs ? M.vs.w : '?'} / ${M.dorm ? M.dorm.w : '?'}）`);
  ok(M.vsRow && M.vsRow.x >= 10 && M.vsRow.right <= 890, `下排完整落在设计面内（${M.vsRow ? M.vsRow.x : '?'}..${M.vsRow ? M.vsRow.right : '?'}）`);
  const lowCard = Math.max(M.vs ? M.vs.bottom : 0, M.dorm ? M.dorm.bottom : 0);
  ok(lowCard <= 600 - 4, `下排卡片底部不被裁（底 ${lowCard} ≤ 596）`);

  // ⑦ 版本徽标短格式
  ok(/^pvz-web v\d+\.\d+\.\d+$/.test(M.verText.trim()), `版本徽标只显示版本号（"${M.verText}"）`);
  ok(/v4\.0\.128/.test(M.verText), '徽标已是 v4.0.128（未缓存旧版）');
  ok(M.docScrollW <= M.innerW + 1, `页面无横向滚动（${M.docScrollW} ≤ ${M.innerW}）`);

  console.log('\n=== 1920×1080 复核 ===');
  const B = await measure(page, [1920, 1080]);
  ok(Math.abs(B.scale - 1.8) < 0.01, `1920 下 scale 1.8（实测 ${B.scale}）`);
  ok(B.designW === 900 && B.designH === 600, `设计面仍 900×600（${B.designW}×${B.designH}）`);
  ok(B.fillY >= 0.995, `1920 高度铺满（${B.fillY * 100}%）`);
  const oobB = B.cards.filter(c => c.box.y < -0.5 || c.box.bottom > 600.5 || c.box.x < -0.5 || c.box.right > 900.5);
  ok(oobB.length === 0, `四张卡完整落在画面内（越界 ${oobB.length} 张）`);
  ok(B.cards.every(c => c.w === 196 && c.h === 258 && c.artH === 104), '大屏下卡片尺寸不变形（196×258 / 插图 104）');
  ok(B.cards.every(c => c.clipTop <= 0.5 && c.clipBot <= 0.5), '大屏下插图仍零裁切');

  ok(errors.length === 0, '无 JS 报错' + (errors.length ? '：' + errors[0] : ''));

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
