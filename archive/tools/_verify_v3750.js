// v3.75.0 验证：选卡槽位 10→12 + 选卡页所有植物黑边框
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-dev-shm-usage'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 760 });
  let fail = 0;
  const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const checkChooser = async (btnId, modeName) => {
    // 进选卡页
    await page.evaluate((id) => { document.getElementById('start-menu').style.display = 'block'; document.getElementById(id).click(); }, btnId);
    await new Promise(r => setTimeout(r, 400));
    const info = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
      const countText = document.querySelector('#seed-chooser h2').innerText;
      const borders = cards.map(c => getComputedStyle(c).borderColor + '|' + getComputedStyle(c).borderStyle + '|' + getComputedStyle(c).borderWidth);
      const allBlack = borders.every(b => b.startsWith('rgb(0, 0, 0)|solid|2px'));
      return { n: cards.length, countText, allBlack, borders: borders.slice(0, 3) };
    });
    ok(modeName + ' 卡牌全部黑边框 (2px solid #000)', info.allBlack);
    ok(modeName + ' 计数上限显示 /12', info.countText.includes('/12'));
    // 点满 13 张 → 只能选 12
    const sel = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
      cards.forEach(c => c.click());
      return document.getElementById('chooser-count').innerText;
    });
    ok(modeName + ' 点满全页只选上 12 张（实际选上=' + sel + '）', sel === '12');
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_shot_v3750_' + btnId + '.png' });
    // 关闭选卡页，回主菜单
    await page.evaluate(() => document.getElementById('btn-back').click());
    await new Promise(r => setTimeout(r, 300));
    return info;
  };

  const a = await checkChooser('btn-adventure', '经典冒险');
  console.log('  经典冒险卡池张数=' + a.n, '样例边框=' + JSON.stringify(a.borders[0]));
  const b = await checkChooser('btn-fusion', '融合进化');
  console.log('  融合进化卡池张数=' + b.n);

  // 实际选满 12 张开局 → 顶栏种子栏两行不压草坪
  await page.evaluate(() => { document.getElementById('start-menu').style.display = 'block'; document.getElementById('btn-adventure').click(); });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')].slice(0, 12);
    cards.forEach(c => c.click());
    document.getElementById('btn-lets-rock').click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const bank = await page.evaluate(() => {
    const sb = document.getElementById('seed-bank');
    const cards = sb.querySelectorAll('.seed-card');
    const rect = sb.getBoundingClientRect();
    const firstTop = cards[0] ? cards[0].getBoundingClientRect().top : 0;
    const rows = new Set([...cards].map(c => Math.round(c.getBoundingClientRect().top)));
    return { n: cards.length, bankBottom: Math.round(rect.bottom), rows: rows.size };
  });
  ok('开局带满 12 张卡（实际=' + bank.n + '）', bank.n === 12);
  ok('种子栏最多两行（实际行数=' + bank.rows + '）', bank.rows <= 2);
  ok('顶栏底边不压草坪深处（bottom=' + bank.bankBottom + 'px < 190）', bank.bankBottom < 190);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/_shot_v3750_game.png' });

  await browser.close();
  console.log(fail === 0 ? 'ALL ' + 'PASS' : fail + ' FAIL');
  process.exit(fail === 0 ? 0 : 1);
})();
