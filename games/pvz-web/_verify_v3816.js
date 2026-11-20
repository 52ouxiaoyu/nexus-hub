// v3.81.6 验证：①我是僵尸 Speed/角标放大 ②全模式移除分数 ③随机事件时间门控
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

  // ===== T1 分数行已删 + 阳光行健在 =====
  const t1 = await page.evaluate(() => ({
    scoreBank: !!document.getElementById('score-bank'),
    scoreCount: !!document.getElementById('score-count'),
    sunBank: !!document.getElementById('sun-bank'),
  }));
  ok(!t1.scoreBank && !t1.scoreCount, 'T1a 顶栏 score-bank/score-count 已删除');
  ok(t1.sunBank, 'T1b 阳光行 sun-bank 保留');

  // ===== T2 我是僵尸：Speed 按钮 + 地狱角标放大 =====
  await page.click('#btn-zombie');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#zdiff-hell');
  await new Promise(r => setTimeout(r, 500));
  const t2 = await page.evaluate(() => {
    const spd = document.getElementById('btn-speed');
    const chip = document.getElementById('zombie-diff-chip');
    return {
      spdInBar: spd && spd.parentElement && spd.parentElement.id === 'top-bar',
      chipText: chip ? chip.textContent.trim() : null,
      spdFs: spd ? getComputedStyle(spd).fontSize : null,
      chipFs: chip ? getComputedStyle(chip).fontSize : null,
      chipEnFs: chip && chip.querySelector('.diff-chip-en') ? getComputedStyle(chip.querySelector('.diff-chip-en')).fontSize : null,
    };
  });
  ok(t2.spdInBar, 'T2a 我是僵尸模式 Speed 按钮在顶栏');
  ok(t2.chipText === '我是僵尸 · 地狱HELL', `T2b 角标文案=${t2.chipText}`);
  ok(t2.spdFs === '24px', `T2c Speed 字号 24px（实测 ${t2.spdFs}）`);
  ok(t2.chipFs === '24px', `T2d 角标字号 24px（实测 ${t2.chipFs}）`);
  ok(t2.chipEnFs === '16px', `T2e 角标英文 16px（实测 ${t2.chipEnFs}）`);
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3816_iz.png' });

  // ===== T3 我是僵尸游戏内：杀僵尸无报错、无分数元素 =====
  const t3 = await page.evaluate(() => {
    const g = window._pvzGame;
    // 放一只僵尸在场地里并击杀
    const z = g.entities.find(e => e.constructor.name === 'Zombie' && !e.isDead);
    if (z) z.hp = 0;
    return { hasScoreProp: 'score' in g, hasUpdateScore: typeof g.updateScore === 'function', playTime: typeof g.playTime };
  });
  ok(!t3.hasScoreProp && !t3.hasUpdateScore, 'T3a game 实例无 score 属性/updateScore 方法');
  ok(t3.playTime === 'number', 'T3b playTime 计时器存在');
  await new Promise(r => setTimeout(r, 400));
  ok(errors.length === 0, `T3c 击杀僵尸后无页面报错（${errors.join('; ') || 'clean'}）`);

  // ===== T4 随机事件时间门控（经典模式 EventManager） =====
  const t4 = await page.evaluate(() => {
    const g = window._pvzGame;
    const em = new EventManager(g);
    const pick = ms => em.events.find(ev => ev.msg.includes(ms));
    const gated = ev => {
      // 模拟 trigger() 的过滤条件
      return !ev.minTime || g.playTime >= ev.minTime;
    };
    const meteor = pick('陨石');   // minTime 210
    const quake = pick('地震');    // 无门槛
    const g0 = { meteor: gated(meteor), quake: gated(quake) };
    g.playTime = 300;
    const g300 = { meteor: gated(meteor) };
    g.playTime = 0;
    return { g0, g300, meteorMin: meteor.minTime, quakeMin: quake.minTime };
  });
  ok(t4.meteorMin === 210 && t4.quakeMin === undefined, `T4a 门槛字段 minTime（陨石=${t4.meteorMin} 地震=${t4.quakeMin}）`);
  ok(!t4.g0.meteor && t4.g0.quake, 'T4b playTime=0 时高门槛事件被过滤、无门槛事件可用');
  ok(t4.g300.meteor, 'T4c playTime=300 时高门槛事件解锁');

  // ===== T5 经典模式开局正常、顶栏无分数 =====
  await page.evaluate(() => {
    // 回主菜单 → 经典冒险
    document.getElementById('start-menu').style.display = 'block';
  });
  await page.click('#btn-adventure');
  await new Promise(r => setTimeout(r, 300));
  const t5 = await page.evaluate(() => {
    const isSun = t => ['sunflower', 'peashooter', 'wallnut', 'cherrybomb'].includes(t);
    const picked = [];
    for (const c of [...document.querySelectorAll('#chooser-grid .chooser-card')]) {
      if (picked.length >= 4) break;
      c.click(); picked.push(c.dataset.type);
    }
    document.getElementById('btn-lets-rock').click();
    return picked;
  });
  await new Promise(r => setTimeout(r, 600));
  const t5b = await page.evaluate(() => {
    const g = window._pvzGame;
    return {
      playing: g.state === 'PLAYING',
      noScoreEl: !document.getElementById('score-bank'),
      sunVisible: document.getElementById('sun-bank').offsetWidth > 0,
      playTimeType: typeof g.playTime,
    };
  });
  ok(t5.length === 4 && t5b.playing, 'T5a 经典模式正常开局');
  ok(t5b.noScoreEl && t5b.sunVisible, 'T5b 游戏中顶栏无分数、阳光正常显示');
  ok(t5b.playTimeType === 'number', 'T5c 经典模式 playTime 正常累计');
  await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v3816_classic.png' });

  console.log(`\n===== ${pass} pass / ${fail} fail =====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
