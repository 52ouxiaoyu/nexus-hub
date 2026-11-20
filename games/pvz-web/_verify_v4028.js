// v4.0.28 验证：守屋卡片重做 + 弹窗返回键木牌化 + 选卡返回键
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  PASS", m); } else { fail++; console.log("  FAIL", m); } };

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-v4028-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('pageerror', e => console.log("  PAGE_ERROR:", e.message));
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await sleep(2500);

  // ===== A. 守屋卡片：新构图元素存在 + 图片全部加载成功 =====
  const a1 = await page.evaluate(() => {
    const art = document.querySelector('#btn-dorm .pkt-art.dorm');
    const imgs = [...art.querySelectorAll('img')];
    return {
      isDorm: !!art,
      n: imgs.length,
      allLoaded: imgs.every(i => i.complete && i.naturalWidth > 0),
      hasHero: !!art.querySelector('.dorm-hero'),
      hasLeaves: art.querySelectorAll('.dorm-leaf').length === 2,
      hasSun: !!art.querySelector('.dorm-sun'),
      oldCoverGone: !art.querySelector('img[src*="pvz_dorm_cover"]'),
    };
  });
  ok(a1.isDorm && a1.hasHero && a1.hasLeaves && a1.hasSun, `A1 守屋卡片新构图就位（hero/双叶/阳光）`);
  ok(a1.n === 3 && a1.allLoaded, "A2 三张原版素材全部加载成功（无 404）");
  ok(a1.oldCoverGone, "A3 旧截图封面已移除");
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_menu.png' });

  // ===== B. 守屋三弹窗返回键木牌样式 =====
  const woodStyle = async (btnId, clickAway) => {
    return page.evaluate((id) => {
      const b = document.getElementById(id);
      if (!b) return null;
      const cs = getComputedStyle(b);
      return { bg: cs.backgroundColor, border: cs.borderColor, font: cs.fontFamily.includes('Kaiti') };
    }, btnId);
  };
  await page.click('#btn-dorm'); await sleep(600);
  const b1 = await woodStyle('dorm-faction-back');
  ok(b1 && b1.bg === 'rgb(74, 48, 24)' && b1.font, `B1 阵营弹窗返回键=木牌样式（bg=${b1 && b1.bg}）`);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_faction.png' });
  await page.evaluate(() => document.getElementById('btn-faction-plant').click()); await sleep(500);
  const b2 = await woodStyle('dorm-mode-back');
  ok(b2 && b2.bg === 'rgb(74, 48, 24)' && b2.font, "B2 模式弹窗返回键=木牌样式");
  await page.evaluate(() => document.getElementById('btn-dorm-1p').click()); await sleep(500);
  const b3 = await woodStyle('dorm-back');
  ok(b3 && b3.bg === 'rgb(74, 48, 24)' && b3.font, "B3 皮肤弹窗返回键=木牌样式");
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_skin.png' });

  // ===== C. 皮肤弹窗返回键逐级回退（皮肤→模式→阵营→主菜单） =====
  await page.evaluate(() => document.getElementById('dorm-back').click()); await sleep(400);
  const c1 = await page.evaluate(() => ({
    modeShown: document.getElementById('dorm-mode-modal').style.display === 'flex',
    menuHidden: document.getElementById('start-menu').style.display === 'none',
  }));
  ok(c1.modeShown && !c1.menuHidden, "C1 皮肤弹窗「返回」→ 回模式选择（不跳主菜单）");
  await page.evaluate(() => document.getElementById('dorm-mode-back').click()); await sleep(400);
  const c2 = await page.evaluate(() => document.getElementById('dorm-faction-modal').style.display === 'flex');
  ok(c2, "C2 模式弹窗返回 → 回阵营选择");
  await page.evaluate(() => document.getElementById('dorm-faction-back').click()); await sleep(400);
  const c3 = await page.evaluate(() => document.getElementById('start-menu').style.display !== 'none');
  ok(c3, "C3 阵营弹窗「返回主菜单」→ 回主菜单");

  // ===== D. 选植物界面：返回键文字=返回，点击可退出 =====
  await page.click('#btn-adventure'); await sleep(900);
  const d1 = await page.evaluate(() => {
    const b = document.getElementById('btn-back');
    return { shown: document.getElementById('seed-chooser').style.display === 'flex', text: b.textContent.trim() };
  });
  ok(d1.shown && d1.text === '返回', `D1 选卡界面出现且返回键文字=「返回」（实际「${d1.text}」）`);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_seedbar.png' });
  await page.evaluate(() => document.getElementById('btn-back').click()); await sleep(400);
  const d2 = await page.evaluate(() => ({
    chooserHidden: document.getElementById('seed-chooser').style.display === 'none',
    menuShown: document.getElementById('start-menu').style.display !== 'none',
  }));
  ok(d2.chooserHidden && d2.menuShown, "D2 点「返回」退出选卡界面回主菜单");

  // ===== E. 砸罐子/我是僵尸木牌不受影响（回归） =====
  await page.click('#btn-vase'); await sleep(500);
  const e1 = await woodStyle('diff-back');
  ok(e1 && e1.bg === 'rgb(74, 48, 24)', "E1 砸罐子难度弹窗木牌样式保持");
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4028_vase_diff.png' });
  await page.evaluate(() => document.getElementById('diff-back').click()); await sleep(300);
  await page.click('#btn-zombie'); await sleep(500);
  const e2 = await woodStyle('zdiff-back');
  ok(e2 && e2.bg === 'rgb(74, 48, 24)', "E2 我是僵尸难度弹窗木牌样式保持");

  console.log(`\n结果: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
