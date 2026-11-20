// v4.0.38 验证：AI 产出不再把 AI 阳光写进 P1 的 HUD——sun1/spore1 恒等于真人玩家数值
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  let pass = 0, fail = 0;
  const ok = (c, n) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n); } };

  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });

  // S1: 连续 8 秒采样 sun1/spore1，必须始终等于 player 真实值（旧版会被 AI 产出串成 AI 的数）
  const s1 = await p.evaluate(async () => {
    const g = window.game;
    let badSun = 0, badSpore = 0, samples = 0;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      const s1t = document.getElementById('sun1').innerText;
      const sp1t = document.getElementById('spore1').innerText;
      if (s1t !== String(g.player.sun)) badSun++;
      if (sp1t !== String(g.player.spore)) badSpore++;
      samples++;
    }
    const aiSunGrew = g.ais.some(a => !a.dead && a.sun > 100); // AI 确实在产出（旧版必然串显）
    return { samples, badSun, badSpore, aiSunGrew,
             aiSuns: g.ais.map(a => a.sun), playerSun: g.player.sun };
  });
  ok(s1.aiSunGrew, 'S1a 前置确认：AI 阳光确实在持续产出 (AI 阳光=' + JSON.stringify(s1.aiSuns) + ')');
  ok(s1.badSun === 0, 'S1b ' + s1.samples + ' 次采样 sun1 全部等于 P1 真实阳光（旧版会跳成 AI 的数） 偏差=' + s1.badSun);
  ok(s1.badSpore === 0, 'S1c ' + s1.samples + ' 次采样 spore1 全部等于 P1 真实孢子 偏差=' + s1.badSpore);

  // S2: 直接调用 addSun(ai) 断言不碰 sun1；addSun(player) 立即刷新
  const s2 = await p.evaluate(() => {
    const g = window.game;
    const before = document.getElementById('sun1').innerText;
    const ai = g.ais[0];
    g.addSun(777, ai);          // AI 加阳光——不得改 sun1
    const afterAi = document.getElementById('sun1').innerText;
    const aiSun = ai.sun;
    g.addSun(5, g.player);      // P1 加阳光——必须立即刷新
    const afterP1 = document.getElementById('sun1').innerText;
    // 还原
    g.addSun(-5, g.player); g.addSun(-777, ai);
    return { before, afterAi, afterP1, aiSun };
  });
  ok(s2.afterAi === s2.before, 'S2a addSun(AI) 不再写 sun1 (sun1=' + s2.afterAi + ' 不变=' + (s2.afterAi === s2.before) + ')');
  const s2b = await p.evaluate(() => {
    const g = window.game;
    const el = document.getElementById('sun1');
    g.addSun(5, g.player);
    const v = el.innerText === String(g.player.sun);
    g.addSun(-5, g.player);
    return v;
  });
  ok(s2b, 'S2b addSun(P1) 立即刷新 sun1');

  // S3: 双人模式 P2 阳光显示正常
  await p.evaluate(() => window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' }));
  await p.waitForFunction('window.game && window.game.player2 && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  const s3 = await p.evaluate(async () => {
    const g = window.game;
    let bad2 = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (document.getElementById('sun2').innerText !== String(g.player2.sun)) bad2++;
      if (document.getElementById('sun1').innerText !== String(g.player.sun)) bad2++;
    }
    return { bad2 };
  });
  ok(s3.bad2 === 0, 'S3 双人模式 sun1/sun2 各自恒等于真人数值 偏差=' + s3.bad2);

  await browser.close();
  console.log('RESULT ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
