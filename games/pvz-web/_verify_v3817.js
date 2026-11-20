// v3.81.7 验证：选卡界面植物头/盲盒僵尸图标=身体+头顶合成
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // ===== T1 我是僵尸：地狱难度卡带含植物头/盲盒 → 合成结构 =====
  await page.click('#btn-zombie');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#zdiff-hell');
  await new Promise(r => setTimeout(r, 600));
  const t1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const bank = document.getElementById('zombie-bank');
    const fusionTypes = [...bank.querySelectorAll('.zcard-fusion')].map(w => w.closest('.zcard').dataset.type);
    // 结构断言：合成块内有 zf-body + zf-head 两层
    const structOk = [...bank.querySelectorAll('.zcard-fusion')].every(w =>
      w.querySelector('.zf-body') && w.querySelector('.zf-head') && w.querySelector('.zf-head img'));
    const bodyLoaded = [...bank.querySelectorAll('.zf-body')].every(i => i.complete && i.naturalWidth > 0);
    return { fusionTypes, structOk, bodyLoaded, bankCards: bank.querySelectorAll('.zcard').length };
  });
  ok(t1.bankCards >= 6, `T1a 地狱卡带 ${t1.bankCards} 张`);
  const t1b = await page.evaluate(() => {
    const g = window._pvzGame;
    // 本局随机上架的特殊僵尸（SPECIALS 池）应带合成图标
    const rolled = g._zombieDiffCfg().specialZombie;
    const bank = document.getElementById('zombie-bank');
    const fusionTypes = [...bank.querySelectorAll('.zcard-fusion')].map(w => w.closest('.zcard').dataset.type);
    // 单测：全部 PLANT_HEAD_CFG 类型都应产出合成图标
    const allHeadTypes = Object.keys(Zombie.PLANT_HEAD_CFG);
    const allFusion = allHeadTypes.every(t => g.zombieIconEl(t).className === 'zcard-fusion');
    const normalPlain = g.zombieIconEl('normal').tagName === 'IMG';
    const rolledIsHead = allHeadTypes.includes(rolled);
    return { rolled, fusionTypes, allFusion, normalPlain, rolledIsHead };
  });
  ok(!t1b.rolledIsHead || t1b.fusionTypes.includes(t1b.rolled), `T1b 本局特殊僵尸 ${t1b.rolled}${t1b.rolledIsHead ? ' 应在合成图标列表' : '（非植物头类，无需合成）'}（${t1b.fusionTypes.join(',')}）`);
  ok(t1b.allFusion, 'T1b+ 全部 9 种植物头/盲盒类型 zombieIconEl 均产出合成图标');
  ok(t1b.normalPlain, 'T1b+ 普通僵尸仍为单图');
  ok(t1.structOk, 'T1c 合成结构=zf-body+zf-head 两层');
  ok(t1.bodyLoaded, 'T1d 僵尸身体图加载成功');
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3817_izbank.png' });

  // ===== T2 对战选人界面 vz-grid：植物头卡也是合成图标 =====
  await page.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block'; // 回主菜单才能点对战卡
    window._pvzGame.state = 'MENU';
  });
  await page.click('#btn-vs');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#vs-normal');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { // 植物方选完进入僵尸选人
    const isSun = t => ['sunflower', 'sunshroom', 'twinsunflower'].includes(t);
    const picked = [];
    for (const c of [...document.querySelectorAll('#chooser-grid .chooser-card')]) {
      if (picked.length >= 8) break;
      if (isSun(c.dataset.type) && picked.some(t => isSun(t))) continue;
      c.click(); picked.push(c.dataset.type);
    }
    document.getElementById('btn-lets-rock').click();
  });
  await new Promise(r => setTimeout(r, 400));
  const t2 = await page.evaluate(() => {
    const grid = document.getElementById('vz-grid');
    const cards = [...grid.querySelectorAll('.vz-card')];
    const fusion = cards.filter(c => c.querySelector('.zcard-fusion')).map(c => c.dataset.type);
    return { total: cards.length, fusion, hasPea: fusion.includes('peahead'), hasBox: fusion.includes('mysterybox'), hasNormal: !cards.find(c => c.dataset.type === 'normal').querySelector('.zcard-fusion') };
  });
  ok(t2.total === 25, `T2a vz-grid ${t2.total} 卡`);
  ok(t2.hasPea && t2.hasBox, 'T2b 植物头/盲盒卡用合成图标');
  ok(t2.hasNormal, 'T2c 普通僵尸仍用单图');
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3817_vzgrid.png' });

  console.log(`\n===== ${pass} pass / ${fail} fail =====`);
  console.log('pageerrors:', errors.length ? errors.join('; ') : 'none');
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
