/**
 * _verify_v4129.js —— 主菜单 4 列网格改造（用户口述的一批调整）
 *
 * 断言目标（全部换算到 900×600 设计面坐标）：
 *   ① 两行都是 4 列 196 网格：行1 = 4×196×236；行2 = 196(双人) + 196(守屋) + 412(小游戏)
 *   ② 列对齐：双人在经典冒险正下方、守屋在融合进化正下方、小游戏横跨砸罐子+我是僵尸
 *   ③ 「操作与道具说明」在右上角「成就」下方、卡片上方，宽约为成就的 2 倍
 *   ④ 返回键 ≈ 成就大小；玩家名 ≈ 成就字号
 *   ⑤ 版本徽标放大到 14px，且不压卡片
 *   ⑥ 双人封面豌豆右移 / 僵尸左移（露出叶子、有融合感）；守屋三只植物不出框
 *   ⑦ 小游戏占位卡点击有明确反馈（不弹窗）
 *
 * 运行：node _verify_v4129.js
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
  await page.waitForFunction('!!document.getElementById("btn-help-guide") && !!document.getElementById("btn-achievements")');
  await new Promise(r => setTimeout(r, 800));
  return page.evaluate(() => {
    const S = window.gameScale;
    const R = e => e.getBoundingClientRect();
    const gc = R(document.getElementById('game-container'));
    const D = v => +(v / S).toFixed(2);
    const B = e => { const r = R(e); return { x: D(r.left - gc.left), y: D(r.top - gc.top), w: D(r.width), h: D(r.height), right: D(r.right - gc.left), bottom: D(r.bottom - gc.top) }; };
    const $ = id => document.getElementById(id);
    const card = id => {
      const c = $(id); if (!c) return null;
      const art = c.querySelector('.pkt-art');
      return Object.assign(B(c), {
        id: id, ow: c.offsetWidth, oh: c.offsetHeight,
        ovfY: c.scrollHeight - c.clientHeight, ovfX: c.scrollWidth - c.clientWidth,
        art: art ? Object.assign(B(art), { nImg: art.querySelectorAll('img').length }) : null,
        name: (c.querySelector('.pkt-name') || {}).textContent || '',
        fsName: c.querySelector('.pkt-name') ? getComputedStyle(c.querySelector('.pkt-name')).fontSize : ''
      });
    };
    const clipOf = id => {
      const c = $(id); const art = c && c.querySelector('.pkt-art'); if (!art) return [];
      const ar = R(art);
      return [...art.querySelectorAll('img')].filter(i => {
        const r = R(i);
        return r.top < ar.top - 0.6 || r.bottom > ar.bottom + 0.6 || r.left < ar.left - 0.6 || r.right > ar.right + 0.6;
      }).map(i => i.className || i.alt);
    };
    const help = $('btn-help-guide'), ach = $('btn-achievements'), back = $('btn-back-gc'), player = $('player-name'), ver = $('start-version');

    // 双人封面的豌豆/僵尸位移（transform 是设计意图的直接证据）
    const pImg = document.querySelector('#btn-vs .vs-p'), zImg = document.querySelector('#btn-vs .vs-z');

    return {
      vp: innerWidth + 'x' + innerHeight, scale: +S.toFixed(4),
      cards: ['btn-adventure', 'btn-fusion', 'btn-vase', 'btn-zombie', 'btn-vs', 'btn-dorm', 'btn-minigame'].map(card),
      row1W: R(document.querySelector('.menu-cards')).width / S,
      row2W: R($('vs-row')).width / S,
      help: help ? Object.assign(B(help), { parent: help.parentElement ? help.parentElement.id : '' }) : null,
      helpText: help ? help.textContent.replace(/\s+/g, '') : '',
      helpFs: help ? getComputedStyle(help).fontSize : '',
      ach: ach ? Object.assign(B(ach), { parent: ach.parentElement ? ach.parentElement.id : '' }) : null,
      back: back ? B(back) : null,
      backFs: back ? getComputedStyle(back).fontSize : '',
      player: player ? Object.assign(B(player), { fs: getComputedStyle(player).fontSize }) : null,
      ver: ver ? Object.assign(B(ver), { fs: getComputedStyle(ver).fontSize, text: ver.textContent.trim() }) : null,
      title: B(document.querySelector('.game-title')),
      vsP: pImg ? getComputedStyle(pImg).transform : 'none',
      vsZ: zImg ? getComputedStyle(zImg).transform : 'none',
      clips: ['btn-adventure', 'btn-fusion', 'btn-vase', 'btn-zombie', 'btn-vs', 'btn-dorm', 'btn-minigame']
        .map(id => ({ id: id, bad: clipOf(id) })).filter(o => o.bad.length),
      docScrollW: document.documentElement.scrollWidth, innerW: innerWidth
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

  console.log('\n=== v4.0.129 主菜单 4 列网格验收（1280×860）===');
  const M = await measure(page, [1280, 860]);
  const C = {};
  M.cards.forEach(c => { if (c) C[c.id] = c; });

  // ① 七张卡都在，尺寸对
  ok(M.cards.every(c => c), '七张卡全部存在（4 模式 + 双人 + 守屋 + 小游戏）');
  const top = ['btn-adventure', 'btn-fusion', 'btn-vase', 'btn-zombie'];
  ok(top.every(id => C[id].ow === 196 && C[id].oh === 236), '行1 四张卡 196×236（实测 ' + top.map(id => C[id].ow + '×' + C[id].oh).join(' / ') + '）');
  ok(C['btn-vs'].ow === 196 && C['btn-vs'].oh === 192, '双人对战 196×192（与上面四卡同宽）');
  ok(C['btn-dorm'].ow === 196 && C['btn-dorm'].oh === 192, '守屋大作战 196×192（与上面四卡同宽）');
  ok(C['btn-minigame'].ow === 412 && C['btn-minigame'].oh === 192, '小游戏 412×192（两列宽）');
  ok(Math.abs(M.row1W - 844) < 2 && Math.abs(M.row2W - 844) < 2, '两行整行同宽 844（' + M.row1W.toFixed(1) + ' / ' + M.row2W.toFixed(1) + '）');

  // ② 列对齐（用左边距判定）
  const near = (a, b) => Math.abs(a - b) < 1.5;
  ok(near(C['btn-vs'].x, C['btn-adventure'].x), '双人对战在经典冒险正下方（x ' + C['btn-vs'].x + ' = ' + C['btn-adventure'].x + '）');
  ok(near(C['btn-dorm'].x, C['btn-fusion'].x), '守屋大作战在融合进化正下方（x ' + C['btn-dorm'].x + ' = ' + C['btn-fusion'].x + '）');
  ok(near(C['btn-minigame'].x, C['btn-vase'].x) && near(C['btn-minigame'].right, C['btn-zombie'].right),
     '小游戏横跨砸罐子+我是僵尸（' + C['btn-minigame'].x + '..' + C['btn-minigame'].right + '）');
  ok(near(C['btn-minigame'].y, C['btn-vs'].y), '行2 三张卡顶部对齐（y ' + C['btn-minigame'].y + '）');
  ok(C['btn-vs'].bottom <= 596 && C['btn-minigame'].bottom <= 596, '行2 不被画布底部裁掉（底 ' + C['btn-vs'].bottom + '）');

  // ③ 说明按钮：成就下方、卡片上方、约 2 倍大
  ok(M.help.parent === 'menu-actions' && M.ach.parent === 'menu-actions', '说明与成就都挂在右上角 #menu-actions');
  ok(M.help.y >= M.ach.bottom - 1, '说明在成就下方（' + M.help.y + ' ≥ ' + M.ach.bottom + '）');
  ok(M.help.bottom <= C['btn-zombie'].y - 2, '说明在卡片上方（底 ' + M.help.bottom + ' ≤ 卡顶 ' + C['btn-zombie'].y + '）');
  ok(M.help.right <= M.ach.right + 1, '说明与成就右边缘对齐（' + M.help.right + ' / ' + M.ach.right + '）');
  const wRatio = M.help.w / M.ach.w, aRatio = (M.help.w * M.help.h) / (M.ach.w * M.ach.h);
  ok(wRatio >= 1.85, '说明宽度 ≈ 成就 2 倍（' + wRatio.toFixed(2) + '×，' + M.help.w + ' vs ' + M.ach.w + '）');
  ok(aRatio >= 1.8, '说明面积 ≈ 成就 2 倍（' + aRatio.toFixed(2) + '×）');
  ok(parseFloat(M.helpFs) > parseFloat('19'), '说明字号大于成就（' + M.helpFs + ' vs 19px）');
  ok(M.helpText.indexOf('操作与道具说明') >= 0, '说明按钮文案「操作与道具说明」');
  ok(M.help.x > M.title.right - 2, '说明不与标题重叠（说明左 ' + M.help.x + ' ≥ 标题右 ' + M.title.right + '）');

  // ④ 左上角放大
  ok(M.back.w >= 100 && M.back.h >= 44, '返回键放大约成就大小（' + M.back.w + '×' + M.back.h + ' vs 成就 ' + M.ach.w + '×' + M.ach.h + '）');
  ok(M.player.fs === '19px', '玩家名字号 19px（与成就同字号，实测 ' + M.player.fs + '）');
  ok(M.player.right < M.back.x, '玩家名与返回键不重叠（' + M.player.right + ' < ' + M.back.x + '）');

  // ⑤ 版本徽标
  ok(parseFloat(M.ver.fs) >= 13, '版本徽标字号 ≥13px（实测 ' + M.ver.fs + '）');
  ok(/^pvz-web v\d+\.\d+\.\d+$/.test(M.ver.text), '徽标单行短格式（"' + M.ver.text + '"）');
  ok(M.ver.y >= C['btn-minigame'].bottom - 1, '徽标不压住下排卡片（' + M.ver.y + ' ≥ ' + C['btn-minigame'].bottom + '）');

  // ⑥ 封面细节
  ok(/matrix\(1, 0, 0, 1, 3, 0\)/.test(M.vsP), '双人封面豌豆射手右移 3px（' + M.vsP + '）');
  ok(/matrix\(1, 0, 0, 1, -3, 0\)/.test(M.vsZ), '双人封面僵尸左移 3px（' + M.vsZ + '）');
  ok(C['btn-dorm'].art.nImg === 4, '守屋封面 4 个元素（3 植物 + 阳光）');
  ok(M.clips.length === 0, '七张卡图片全部在插图框内（越界 ' + M.clips.map(c => c.id + ':' + c.bad.join(',')).join(' / ') + '）');
  const ovf = M.cards.filter(c => c.ovfY > 0 || c.ovfX > 0);
  ok(ovf.length === 0, '卡片文字不溢出（溢出 ' + ovf.length + ' 张）');

  // ⑦ 小游戏占位反馈
  const toast = await page.evaluate(() => {
    const btn = document.getElementById('btn-minigame'), t = document.getElementById('mg-toast');
    btn.click();
    return { exists: !!t, shown: t && getComputedStyle(t).display !== 'none', text: t ? t.textContent.trim() : '' };
  });
  ok(toast.exists && toast.shown, '点小游戏卡有明确提示（"' + toast.text + '"）');
  ok(toast.text.indexOf('敬请期待') >= 0, '提示文案含「敬请期待」');

  // ⑧ 1920 复核
  console.log('\n=== 1920×1080 复核 ===');
  const Bg = await measure(page, [1920, 1080]);
  ok(Math.abs(Bg.scale - 1.8) < 0.01, '1920 下 scale 1.8（实测 ' + Bg.scale + '）');
  ok(Bg.cards.every(c => c.ow === (c.id === 'btn-minigame' ? 412 : 196)), '大屏下卡片宽度不变形');
  const oob = Bg.cards.filter(c => c.bottom > 600.5 || c.right > 900.5 || c.x < -0.5 || c.y < -0.5);
  ok(oob.length === 0, '大屏下七张卡都在画面内（越界 ' + oob.length + '）');
  ok(Bg.clips.length === 0, '大屏下图片仍零裁切');

  ok(errors.length === 0, '无 JS 报错' + (errors.length ? '：' + errors[0] : ''));
  ok(M.docScrollW <= M.innerW + 1, '页面无横向滚动');

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
