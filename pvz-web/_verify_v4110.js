// v4.0.110 验证：植物图鉴把「守屋专属升级形态」从融合区拆出来
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push((e.stack || String(e)).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('!!document.getElementById("btn-help-guide")', { timeout: 20000 });

  // 打开图鉴 → 植物页签
  await page.evaluate(() => {
    document.getElementById('btn-help-guide').click();
    const tab = document.querySelector('#help-modal .hg-tab[data-tab="plants"]');
    tab.click();
  });
  await sleep(400);

  const info = await page.evaluate(() => {
    const body = document.getElementById('help-body');
    // 按分组标签切块
    const groups = [];
    let cur = { tag: null, names: [], subs: [] };
    for (const el of body.children) {
      if (el.classList && el.classList.contains('hg-group')) {
        if (cur.tag !== undefined) groups.push(cur);
        const tagEl = el.querySelector('.hg-group-tag');
        cur = { tag: tagEl ? tagEl.textContent.trim() : '?', names: [], subs: [] };
      } else if (el.classList && el.classList.contains('hg-tiles')) {
        // 兼容
      }
    }
    groups.push(cur);
    // 更稳：直接按 hg-group 之后的下一个 .hg-grid
    const gs = [...body.querySelectorAll('.hg-group')].map(g => {
      const grid = g.nextElementSibling;
      const tiles = grid ? [...grid.querySelectorAll('.hg-tile')] : [];
      return {
        tag: g.querySelector('.hg-group-tag').textContent.trim(),
        names: tiles.map(t => t.querySelector('.hg-tname').textContent.trim()),
        subs: tiles.map(t => (t.querySelector('.hg-tsub') || {}).textContent || '')
      };
    });
    const tip = (body.querySelector('.hg-tip') || {}).textContent || '';
    return { groups: gs, tip, tabText: document.querySelector('#help-modal .hg-tab[data-tab="plants"]').textContent };
  });

  const tags = info.groups.map(g => g.tag.replace(/\s/g, ''));
  console.log('  分组:', tags.map((t, i) => t + '(' + info.groups[i].names.length + ')').join(' / '));

  ok(tags.length === 3 && tags[0] === '经典' && tags[1] === '融合' && tags[2] === '守屋专属',
     `T1 图鉴分成 经典 / 融合 / 守屋专属 三组（实测 ${tags.join(' / ')}）`);

  const fuse = info.groups[1], dorm = info.groups[2];
  const dormNames = dorm ? dorm.names : [];
  const fuseNames = fuse ? fuse.names : [];

  ok(dormNames.length === 21, `T2 守屋专属区 21 条（实测 ${dormNames.length}）`);
  ok(fuseNames.length === 55, `T3 融合区 55 条（实测 ${fuseNames.length}，改前 76 条混在一起）`);

  const shouldBeDorm = ['大阳光菇', '水晶向日葵', '石芒杨桃', '双向投手', '超级机箱', '机箱猫尾草',
    '巨型坚果', '南瓜堡垒', '永恒高坚果', '巨型忧郁菇', '暗影忧郁菇', '星际忧郁菇', '宇宙忧郁菇',
    '终极火焰地刺', '南瓜壳·愈', '南瓜壳·愈金', '南瓜壳·不朽'];
  const leaked = shouldBeDorm.filter(n => fuseNames.includes(n));
  ok(leaked.length === 0, `T4 融合区不再混入守屋升级形态（漏进融合区 ${leaked.length} 条：${leaked.join(',') || '无'}）`);
  const allInDorm = shouldBeDorm.every(n => dormNames.includes(n));
  ok(allInDorm, `T5 守屋升级形态全部落在守屋区（${shouldBeDorm.filter(n => !dormNames.includes(n)).join(',') || '全部命中'}）`);

  // 4 条同名消歧
  const pairs = [['魅惑向日葵', '魅惑向日葵·守屋'], ['冰蒜卫士', '冰蒜卫士·守屋'],
                 ['金蒜坚果', '金蒜坚果·守屋'], ['蒜味高坚果', '蒜味高坚果·守屋']];
  const bad = pairs.filter(([a, b]) => !fuseNames.includes(a) || !dormNames.includes(b));
  ok(bad.length === 0, `T6 4 组同名条目已消歧（融合区保留原名 + 守屋区加「·守屋」）：${bad.map(p => p[0]).join(',') || '魅惑向日葵 / 冰蒜卫士 / 金蒜坚果 / 蒜味高坚果'}`);

  // 全图鉴无重名
  const all = [...info.groups[0].names, ...fuseNames, ...dormNames];
  const dup = all.filter((n, i) => all.indexOf(n) !== i);
  ok(dup.length === 0, `T7 全图鉴无同名条目（共 ${all.length} 条，重复 ${dup.length} 个：${dup.join(',') || '无'}）`);

  // 副标题
  const wrongSubs = dorm.subs.filter(s => /融合获得/.test(s));
  ok(wrongSubs.length === 0 && dorm.subs.every(s => /守屋升级/.test(s)),
     `T8 守屋区副标题全部为「守屋升级」，不再写「融合获得」（异常 ${wrongSubs.length} 条）`);
  const fuseWrong = fuse.subs.filter(s => !/融合获得/.test(s));
  ok(fuseWrong.length === 0, `T9 融合区副标题仍是「融合获得」（异常 ${fuseWrong.length} 条）`);

  // 脚注
  ok(/没有融合配方/.test(info.tip), `T10 图鉴脚注写明守屋专属「没有融合配方」（实测："${info.tip.trim().slice(-60)}"）`);

  // 点开详情：守屋条目不该出现「手套融合获得」
  const detail = await page.evaluate(() => {
    const modal = document.getElementById('help-modal');
    const tiles = [...document.querySelectorAll('#help-body .hg-tile')];
    const byName = (n) => tiles.find(t => t.querySelector('.hg-tname').textContent.trim() === n);
    const open = (n) => {
      const t = byName(n);
      if (!t) return null;
      t.click();
      const d = document.getElementById('hg-detail');
      const txt = d ? d.textContent : '';
      const badges = d ? [...d.querySelectorAll('.hg-d-badge, .hg-badge, span')].map(x => x.textContent.trim()) : [];
      return { txt, badges };
    };
    const a = open('巨型坚果');
    const b = open('金蒜坚果·守屋');
    const c = open('金蒜坚果');
    return { dorm: a, dormSame: b, fuseSame: c };
  });

  const dormTxt = (detail.dorm && detail.dorm.txt) || '';
  ok(/守屋专属形态/.test(dormTxt) && /守屋模式升级获得/.test(dormTxt) && !/手套融合获得/.test(dormTxt),
     'T11 守屋条目详情卡：🏰 守屋专属形态 + 守屋模式升级获得，且不含「手套融合获得」');

  const dSame = (detail.dormSame && detail.dormSame.txt) || '';
  const fSame = (detail.fuseSame && detail.fuseSame.txt) || '';
  ok(/守屋专属形态/.test(dSame) && /手套融合获得/.test(fSame) && /融合植物/.test(fSame),
     'T12 同名两条详情卡来源不同（守屋区=守屋升级 / 融合区=手套融合获得）');

  ok(errs.length === 0, `T13 0 条 JS 异常（${errs.length === 0 ? '无' : errs[0]}）`);

  // 截图
  await page.evaluate(() => {
    const body = document.getElementById('help-body');
    const gs = [...body.querySelectorAll('.hg-group')];
    if (gs[2]) gs[2].scrollIntoView({ block: 'start' });
  });
  await sleep(500);
  await page.screenshot({ path: '_v4110_guide_dorm.png' });

  await page.evaluate(() => {
    const body = document.getElementById('help-body');
    body.scrollTop = 0;
    const gs = [...body.querySelectorAll('.hg-group')];
    if (gs[1]) gs[1].scrollIntoView({ block: 'start' });
  });
  await sleep(400);
  await page.screenshot({ path: '_v4110_guide_fusion.png' });

  console.log(`\n结果：${pass} pass / ${fail} fail`);
  if (errs.length) console.log('JS 异常:', errs.slice(0, 3));
  await browser.close();
})();
