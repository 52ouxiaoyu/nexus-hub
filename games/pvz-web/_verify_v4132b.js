const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:8899/pvz-web/index.html', { waitUntil: 'networkidle2', timeout: 40000 });
  await sleep(1800);

  let pass = 0, fail = 0;
  const ok = (c, m, e) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m + (e !== undefined ? ' -> ' + JSON.stringify(e) : ''))); };

  // 冻结猫到指定点，点一下，看气泡是否出画
  async function testAt(left, top, label) {
    await page.evaluate((l, t) => {
      const w = document.getElementById('menu-cat-wrap');
      w.style.transition = 'none';
      w.style.left = l + 'px'; w.style.top = t + 'px';
      // 先让气泡按新位置重算
      document.getElementById('menu-cat').click();
    }, left, top);
    await sleep(120);
    const r = await page.evaluate(() => {
      const g = document.getElementById('game-container').getBoundingClientRect();
      const S = window.gameScale || 1;
      const b = document.getElementById('cat-bubble');
      const br = b.getBoundingClientRect();
      return {
        shown: getComputedStyle(b).display !== 'none',
        hasBelow: b.classList.contains('below'),
        x: (br.left - g.left) / S, y: (br.top - g.top) / S,
        r: (br.right - g.left) / S, bb: (br.bottom - g.top) / S,
        text: b.textContent,
      };
    });
    ok(r.shown, label + '：气泡显示');
    ok(r.x >= -2 && r.r <= 902 && r.y >= -2 && r.bb <= 602,
       label + '：气泡完整在画布内', { x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.r), b: Math.round(r.bb) });
    return r;
  }

  console.log('=== 气泡位置自适应 ===');
  const top1 = await testAt(400, -7, '顶部天空带');
  ok(top1.hasBelow === true, '顶部时气泡翻到脚下（below）', top1.hasBelow);
  const right1 = await testAt(700, 533, '最右侧草地');
  ok(right1.hasBelow === false, '底部时不翻转', right1.hasBelow);
  const left1 = await testAt(20, 533, '最左侧');
  ok(left1.x >= -2, '最左侧气泡不被裁', Math.round(left1.x));

  console.log('=== 猫本体不被裁 ===');
  await page.evaluate(() => { const w = document.getElementById('menu-cat-wrap'); w.style.left = '-8px'; w.style.top = '-8px'; });
  await sleep(200);
  const clip = await page.evaluate(() => {
    const g = document.getElementById('game-container').getBoundingClientRect();
    const S = window.gameScale || 1;
    const r = document.getElementById('menu-cat').getBoundingClientRect();
    return { x: (r.left - g.left) / S, y: (r.top - g.top) / S };
  });
  ok(clip.x > -10 && clip.y > -10, '极端角落也不至于整只消失', { x: Math.round(clip.x), y: Math.round(clip.y) });

  console.log('\n=== 结果: ' + pass + ' pass / ' + fail + ' fail ===');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
