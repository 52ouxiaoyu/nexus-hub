// v3.81.8 验证：战力值公式重排 + 对战开局 200/300 + 动态破产线
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

  // ===== T1 战力表：公式抽查 + 普僵=50 + 25 种 + 单调性 =====
  const t1 = await page.evaluate(() => {
    const g = window._pvzGame;
    const roster = g.constructor.VS_ZOMBIE_ROSTER;
    const cost = g.vsZombieCost();
    const S = (speed, hp) => Math.round((speed + hp + 50) * 50 / 270);
    return {
      n: roster.length,
      normal: cost.normal,
      imp: cost.imp,
      screendoor: cost.screendoor,
      gargantuar: cost.gargantuar,
      buckethead: cost.buckethead,
      sunhead: cost.sunhead,
      formulaOk: cost.normal === S(20, 200) && cost.imp === S(35, 100) && cost.screendoor === S(20, 5200) && cost.buckethead === S(20, 1300),
      sorted: roster.every((e, i) => i === 0 || roster[i - 1][1] >= e[1]),
      min: Math.min(...Object.values(cost)),
    };
  });
  ok(t1.n === 25, `T1a 战力表 25 种（实测 ${t1.n}）`);
  ok(t1.normal === 50, `T1b 普通僵尸=50 校准（实测 ${t1.normal}）`);
  ok(t1.imp === 34, `T1c 小鬼=34（实测 ${t1.imp}，远低于普僵）`);
  ok(t1.screendoor === 976 && t1.gargantuar === 752 && t1.buckethead === 254, `T1d 公式抽查：铁门${t1.screendoor}/巨人${t1.gargantuar}/铁桶${t1.buckethead}`);
  ok(t1.sunhead === 50, `T1e 向日葵头=50（实测 ${t1.sunhead}）`);
  ok(t1.formulaOk, 'T1f 表值与公式逐一吻合');
  ok(t1.sorted, 'T1g 表按战力降序排列');
  ok(t1.min === 34, `T1h 最低战力=34 小鬼（实测 ${t1.min}）`);

  // ===== T2 对战开局 200/300 =====
  await page.click('#btn-vs');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#vs-normal');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const isSun = t => ['sunflower', 'sunshroom', 'twinsunflower'].includes(t);
    const picked = [];
    for (const c of [...document.querySelectorAll('#chooser-grid .chooser-card')]) {
      if (picked.length >= 8) break;
      if (isSun(c.dataset.type) && picked.some(t => isSun(t))) continue;
      c.click(); picked.push(c.dataset.type);
    }
    document.getElementById('btn-lets-rock').click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    for (const c of [...document.querySelectorAll('#vz-grid .vz-card')].slice(0, 8)) c.click();
    document.getElementById('vz-rock').click();
  });
  await new Promise(r => setTimeout(r, 800));
  const t2 = await page.evaluate(() => {
    const g = window._pvzGame;
    return { sun: g.sunCount, brain: g.zombieSun, sunText: document.getElementById('sun-count').innerText, playing: g.state === 'PLAYING' };
  });
  ok(t2.playing, 'T2a 对战正常开局');
  ok(t2.sun === 200 && t2.sunText === '200', `T2b 植物方开局 200 阳光（实测 ${t2.sun}）`);
  ok(t2.brain === 300, `T2c 僵尸方开局 300 脑子（实测 ${t2.brain}）`);
  ok(Math.abs(t2.brain - t2.sun) === 100, 'T2d 双方差距恰好 100');

  // ===== T3 破产线动态=34：脑子 40 无僵尸不判负，清到 33 持续 2.5s 判负 =====
  const t3 = await page.evaluate(async () => {
    const g = window._pvzGame;
    g.entities.filter(e => e.constructor.name === 'Zombie').forEach(z => z.hp = 0);
    g.zombieSun = 40;
    await new Promise(r => setTimeout(r, 3000));
    const aliveAt40 = g.state === 'PLAYING';
    g.zombieSun = 20;
    await new Promise(r => setTimeout(r, 3000));
    return { aliveAt40, lostAt20: g.state === 'GAMEOVER' };
  });
  ok(t3.aliveAt40, 'T3a 脑子 40（>34）无僵尸不判负');
  ok(t3.lostAt20, 'T3b 脑子 20（<34）无僵尸持续 2.5s → 植物方胜');
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3818_vsgame.png' });

  console.log(`\n===== ${pass} pass / ${fail} fail =====`);
  console.log('pageerrors:', errors.length ? errors.join('; ') : 'none');
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
