/* v4.0.162 验收：画风向「原版手绘」靠（不是 Q 版 / 扁平）
   —— 断言全部基于「可观测的像素与样式」，不断言具体色值（色值以后还会调） */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  if (c) { pass++; console.log('  ✅ ' + msg + (extra ? '  [' + extra + ']' : '')); }
  else { fail++; console.log('  ❌ ' + msg + (extra ? '  [' + extra + ']' : '')); }
};

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-v4162-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 820 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window.MiniGames');
  await sleep(700);

  console.log('\n【A】四个泡泡玩法：背景是烘焙纹理，不是纯渐变');
  for (const id of ['farm', 'dragon', 'duel', 'tower']) {
    await p.evaluate(gid => { window.MiniGames.openBubble(); window.MiniGames.openGame(gid); }, id);
    await sleep(1200);
    const r = await p.evaluate(() => {
      const cv = document.querySelector('#mini-canvas');
      const c = cv.getContext('2d');
      // 取一块"一定是背景"的横向条带（右侧中段，避开泡泡与卡片）
      const x0 = 620, y0 = 330, w = 220, h = 70;
      const d = c.getImageData(x0, y0, w, h).data;
      let n = 0, s = 0, s2 = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        n++; s += l; s2 += l * l;
      }
      const mean = s / n;
      const sd = Math.sqrt(Math.max(0, s2 / n - mean * mean));
      // 角 vs 中心：暗角是否生效
      const corner = c.getImageData(6, 594, 1, 1).data;
      const center = c.getImageData(450, 300, 1, 1).data;
      const lum = a => 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
      return { sd, mean, corner: lum(corner), center: lum(center) };
    });
    ok(r.sd >= 2.2, `${id} 背景有纹理（亮度标准差 ${r.sd.toFixed(2)} ≥ 2.2）`);
    ok(r.corner < r.center * 0.95, `${id} 暗角生效（角 ${r.corner.toFixed(1)} < 中心 ${r.center.toFixed(1)}×0.95）`);
  }

  console.log('\n【B】泡泡：手绘描边 + 不再有玻璃球白点');
  const src = await p.evaluate(async () => {
    const r = await fetch('js/MiniGames.js');
    return await r.text();
  });
  ok(/paintBub/.test(src), 'paintBub 存在');
  ok(/0x14100a/.test(src), '泡泡有深色描边（混入 0x14100a）');
  ok(!/rgba\(255,255,255,0\.92\)';\s*\n\s*ctx\.beginPath\(\); ctx\.arc\(x - R \* 0\.46/.test(src), '已删除「高光肩上的硬白点」');
  ok(/createLinearGradient\(x - R \* 0\.55/.test(src), '泡体改成两段线性明暗（不再是球心径向高光）');
  ok(/画布 0~46px|texBrush/.test(src), '笔触工具 texBrush 存在');

  console.log('\n【C】大厅与顶栏：木牌 / 羊皮纸，不是半透明胶囊');
  await p.evaluate(() => window.MiniGames.openBubble());
  await sleep(600);
  const ui = await p.evaluate(() => {
    const card = document.querySelector('.mini-card');
    const cs = getComputedStyle(card);
    const q = document.querySelector('.mini-top .q') || document.querySelector('.mini-head .mb');
    const qs = q ? getComputedStyle(q) : null;
    return {
      cardBorder: cs.borderTopWidth,
      cardShadow: cs.boxShadow,
      cardRadius: cs.borderRadius,
      cardGrain: getComputedStyle(card, '::before').backgroundImage.slice(0, 40),
      btnBg: qs ? qs.backgroundImage : '',
      btnRadius: qs ? qs.borderRadius : ''
    };
  });
  ok(ui.cardBorder === '4px', `卡片是 4px 木框（${ui.cardBorder}）`);
  ok(/inset/.test(ui.cardShadow) && /rgb\(206, 170, 98\)|206, 170, 98/.test(ui.cardShadow), '卡片有内金线');
  ok(ui.cardRadius === '8px', `卡片不再是 14px 大圆角（${ui.cardRadius}）`);
  ok(/url\(/.test(ui.cardGrain), '卡片叠了颗粒纹理');
  ok(/linear-gradient/.test(ui.btnBg), '顶栏按钮是木牌渐变（不再是半透明黑块）');
  ok(ui.btnRadius === '7px', `按钮圆角 ${ui.btnRadius}`);

  console.log('\n【D】主游戏：倍速按钮 / 暂停按钮同款木牌');
  const main = await p.evaluate(() => {
    const s = getComputedStyle(document.getElementById('btn-speed'));
    const pz = getComputedStyle(document.getElementById('btn-pause'));
    return { sp: s.borderRadius, spBg: s.backgroundImage, pzBg: pz.backgroundImage, pzRadius: pz.borderRadius };
  });
  ok(main.sp === '7px', `倍速按钮圆角 7px（${main.sp}）`);
  ok(/linear-gradient/.test(main.spBg), '倍速按钮是木牌渐变');
  ok(/linear-gradient/.test(main.pzBg), '暂停按钮也是木牌渐变');

  console.log('\n【E】10 个玩法整体零报错');
  for (const id of ['tetris', 'whack', 'g2048', 'breakout', 'sokoban', 'memory', 'farm', 'dragon', 'duel', 'tower']) {
    await p.evaluate(gid => { window.MiniGames.openLobby(); window.MiniGames.openGame(gid); }, id);
    await sleep(260);
  }
  await sleep(400);
  ok(errs.length === 0, '全程无 pageerror', errs.slice(0, 2).join(' | '));

  console.log('\n===== v4.0.162 结果：' + pass + ' 通过 / ' + fail + ' 失败 =====');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
