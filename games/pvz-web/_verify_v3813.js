// v3.81.3 验证：①对战卡位置=砸罐子+我是僵尸正下方 ②键盘选卡 ③对战融合选卡池=18张基础牌
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--window-size=1400,900'],
    userDataDir: '/tmp/pptr-prof-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  const url = 'file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name); } };

  // ===== T1 对战卡位置：右缘≈我是僵尸右缘，左缘≈砸罐子左缘 =====
  const pos = await page.evaluate(() => {
    const g = id => { const el = document.getElementById(id); const r = el.getBoundingClientRect(); return { l: r.left, r: r.right }; };
    return { vs: g('btn-vs'), vase: g('btn-vase'), zombie: g('btn-zombie'), fusion: g('btn-fusion') };
  });
  ok(Math.abs(pos.vs.r - pos.zombie.r) < 6, `T1a 对战卡右缘(${pos.vs.r.toFixed(0)})≈我是僵尸右缘(${pos.zombie.r.toFixed(0)})`);
  ok(Math.abs(pos.vs.l - pos.vase.l) < 6, `T1b 对战卡左缘(${pos.vs.l.toFixed(0)})≈砸罐子左缘(${pos.vase.l.toFixed(0)})`);
  ok(pos.vs.l > pos.fusion.l + 100, `T1c 对战卡不在融合进化下方(对战左缘${pos.vs.l.toFixed(0)} > 融合左缘${pos.fusion.l.toFixed(0)})`);

  // ===== T2 对战·融合选卡池=18张基础牌（全部在白名单内，无融合成品） =====
  await page.click('#btn-vs');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#vs-fusion');
  await new Promise(r => setTimeout(r, 300));
  const BASE = ['sunflower','peashooter','wallnut','cherrybomb','squash','jalapeno','potatomine','chomper','tallnut','puffshroom','iceshroom','doomshroom','spikeweed','garlic','melonpult','cabbagepult','kernelpult','plantbox'];
  const fuseTypes = await page.evaluate(() =>
    [...document.querySelectorAll('#chooser-grid .chooser-card')].map(c => c.dataset.type));
  ok(fuseTypes.length === 18, `T2a 融合对战选卡数=18（实际 ${fuseTypes.length}）`);
  ok(fuseTypes.every(t => BASE.includes(t)), 'T2b 全部为基础牌（无融合成品混入）');
  // 融合成品抽确实不在：冰西瓜/机枪豌豆等典型
  ok(!fuseTypes.includes('wintermelon') && !fuseTypes.includes('gatlingpea') && !fuseTypes.includes('twinsunflower'), 'T2c 典型融合成品（冰西瓜/机枪豌豆/双子向日葵）未混入');

  // ===== T3 对战·普通选卡池=全部植物（数量>融合池） =====
  await page.click('#btn-back');
  await new Promise(r => setTimeout(r, 200));
  await page.click('#vs-normal');
  await new Promise(r => setTimeout(r, 300));
  const normalCount = await page.evaluate(() => document.querySelectorAll('#chooser-grid .chooser-card').length);
  ok(normalCount > 18, `T3 普通对战仍开放全部植物（${normalCount} > 18）`);

  // 直接补满 8 张并开始（遵守"产阳光植物最多 1 个"约束地选 8 张）
  await page.evaluate(() => {
    const isSun = t => ['sunflower', 'sunshroom', 'twinsunflower'].includes(t);
    const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
    const picked = [];
    for (const c of cards) {
      if (picked.length >= 8) break;
      if (isSun(c.dataset.type) && picked.some(t => isSun(t))) continue;
      c.click();
      picked.push(c.dataset.type);
    }
    document.getElementById('btn-lets-rock').click();
  });
  await new Promise(r => setTimeout(r, 300));
  // 僵尸方选 8 只
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#vz-grid .vz-card')].slice(0, 8);
    cards.forEach(c => c.click());
    document.getElementById('vz-rock').click();
  });
  await new Promise(r => setTimeout(r, 800));
  const inGame = await page.evaluate(() => {
    const g = window._pvzGame;
    return { vs: g.vsMode, state: g.state, seedCards: document.querySelectorAll('#seed-bank .seed-card').length,
             zcards: document.querySelectorAll('#vs-bottom-bar .zcard').length };
  });
  ok(inGame.vs && inGame.state === 'PLAYING' && inGame.seedCards === 8 && inGame.zcards === 8,
     `T4 对战开局就绪（vs=${inGame.vs} state=${inGame.state} 植物卡=${inGame.seedCards} 僵尸卡=${inGame.zcards}）`);

  // ===== T5 植物方主键盘 1~8 选卡 =====
  const t5 = await page.evaluate(() => {
    const g = window._pvzGame;
    const im = g.inputManager;
    const cards = [...document.querySelectorAll('#seed-bank .seed-card')];
    const send = code => document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    send('Digit2');
    const sel2 = im.selectedSeed;
    send('Digit7');
    const sel7 = im.selectedSeed;
    // 阳光不足时键盘选卡不生效（选中保持原卡不变）
    const sunBackup = g.sunCount; g.sunCount = 0;
    send('Digit1');
    const poor = im.selectedSeed === sel7;
    g.sunCount = sunBackup;
    return { want2: cards[1].dataset.type, sel2, want7: cards[6].dataset.type, sel7, poor };
  });
  ok(t5.sel2 === t5.want2, `T5a 主键盘2 → 选中 ${t5.sel2}`);
  ok(t5.sel7 === t5.want7, `T5b 主键盘7 → 选中 ${t5.sel7}`);
  ok(t5.poor, 'T5c 阳光为 0 时键盘选卡不生效');

  // ===== T6 僵尸方小键盘 1~8 选卡 + 再按取消 + 破产卡不可选 =====
  const t6 = await page.evaluate(() => {
    const g = window._pvzGame;
    const cards = [...document.querySelectorAll('#vs-bottom-bar .zcard')];
    const send = code => document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    send('Numpad3');
    const s1 = g.pendingZombie;
    send('Numpad3');
    const s2 = g.pendingZombie;
    send('Numpad5');
    const s3 = g.pendingZombie;
    // 脑子清零 → 全部卡 disabled → 键盘无效
    const zsBackup = g.zombieSun; g.zombieSun = 0; g._refreshVsZombieBar();
    send('Numpad1');
    const poor = g.pendingZombie;
    g.zombieSun = zsBackup; g._refreshVsZombieBar();
    return { w3: cards[2].dataset.type, s1, s2, w5: cards[4].dataset.type, s3, poor };
  });
  ok(t6.s1 === t6.w3, `T6a 小键盘3 → 选中 ${t6.s1}`);
  ok(t6.s2 === null, `T6b 再按小键盘3 → 取消（${t6.s2}）`);
  ok(t6.s3 === t6.w5, `T6c 小键盘5 → 选中 ${t6.s3}`);
  ok(t6.poor === t6.w5, `T6d 脑子为 0（全卡 disabled）时键盘选卡无效（选中保持 ${t6.poor} 不变）`);

  // ===== T7 主键盘数字不串到僵尸卡 / 小键盘不串到植物卡 =====
  const t7 = await page.evaluate(() => {
    const g = window._pvzGame;
    const im = g.inputManager;
    const send = code => document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    im.selectedSeed = null; g.pendingZombie = null;
    send('Numpad4');
    const plantUntouched = im.selectedSeed === null;
    g.pendingZombie = null; // 清掉 Numpad4 的选中，单独验证 Digit 不串僵尸方
    send('Digit4');
    const zomUntouched = g.pendingZombie === null;
    return { plantUntouched, zomUntouched };
  });
  ok(t7.plantUntouched && t7.zomUntouched, 'T7 小键盘只走僵尸方 / 主键盘只走植物方，互不串线');

  // ===== 截图：主菜单对战卡位置 =====
  await page.evaluate(() => { location.hash = ''; });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3813_menu.png' });

  console.log(`\n===== ${pass} PASS / ${fail} FAIL =====`);
  if (errors.length) { console.log('页面错误:'); errors.forEach(e => console.log('  ' + e)); }
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})();
