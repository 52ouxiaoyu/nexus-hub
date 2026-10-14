// v4.0.35 验证：同页复玩 P1 HUD 还原——僵尸局改写的 #hud-p1 不再残留到植物局
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
  // 第 1 局：僵尸方
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await new Promise(res => setTimeout(res, 1500));

  const z1 = await p.evaluate(() => {
    const hud = document.getElementById('hud-p1');
    return {
      hasZombieBar: !!document.getElementById('zombie-stats-bar'),
      ctrlIsZombie: hud.innerText.includes('僵尸 控制'),
      sun1Gone: !document.getElementById('sun1')
    };
  });
  ok(z1.hasZombieBar && z1.ctrlIsZombie && z1.sun1Gone, 'H1 僵尸局 P1 HUD 正常切为僵尸形态 ' + JSON.stringify(z1));

  // 同页直接开第 2 局：植物方（旧版 bug 场景——不刷新页面）
  await p.evaluate(() => window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' }));
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && !window.game.isZombieFaction', { timeout: 30000 });
  await new Promise(res => setTimeout(res, 1500));

  const h2 = await p.evaluate(() => {
    const g = window.game;
    g.player.sun = 777; g.player.spore = 12;
    g._refreshHud();
    const hud = document.getElementById('hud-p1');
    const s1 = document.getElementById('sun1');
    return {
      noZombieBar: !document.getElementById('zombie-stats-bar'),
      ctrlIsPlant: hud.innerText.includes('P1 控制') || hud.innerText.includes('你'),
      ctrlNotZombie: !hud.innerText.includes('僵尸 控制'),
      noZombieText: !hud.innerText.includes('阶级') && !hud.innerText.includes('幸存者'),
      sun1Restored: !!s1, sunVal: s1 ? s1.innerText : null,
      sporeVal: document.getElementById('spore1') ? document.getElementById('spore1').innerText : null,
      skillIsPlant: document.getElementById('skill-hud').innerText.includes('【M键】') && !document.getElementById('skill-hud').innerText.includes('狂暴冲刺')
    };
  });
  ok(h2.noZombieBar && h2.ctrlIsPlant && h2.ctrlNotZombie, 'H2a 植物局 P1 控制行恢复（无僵尸文案）' + JSON.stringify(h2));
  ok(h2.noZombieText, 'H2b 植物局 P1 属性行无僵尸属性（阶级/幸存者）');
  ok(h2.sun1Restored && h2.sunVal === '777' && h2.sporeVal === '12', 'H2c 阳光/孢子 span 恢复且可刷新 (sun=' + h2.sunVal + ' spore=' + h2.sporeVal + ')');
  ok(h2.skillIsPlant, 'H2d 技能行显示植物技能而非狂暴冲刺');

  // 第 3 局：再切回僵尸方（确认僵尸形态仍能正常套用）
  await p.evaluate(() => window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' }));
  await p.waitForFunction('window.game && window.game.isZombieFaction', { timeout: 30000 });
  await new Promise(res => setTimeout(res, 1500));
  const h3 = await p.evaluate(() => {
    const hud = document.getElementById('hud-p1');
    return {
      hasZombieBar: !!document.getElementById('zombie-stats-bar'),
      ctrlIsZombie: hud.innerText.includes('僵尸 控制'),
      barHasStats: document.getElementById('zombie-stats-bar') ? document.getElementById('zombie-stats-bar').innerText.includes('阶级') : false
    };
  });
  ok(h3.hasZombieBar && h3.ctrlIsZombie && h3.barHasStats, 'H3 再次切僵尸方 HUD 仍正常 ' + JSON.stringify(h3));

  // 第 4 局：退出（destroy）后 HUD 也应还原（主站返回菜单场景）
  await p.evaluate(() => { window.game.destroy(); });
  const h4 = await p.evaluate(() => {
    const hud = document.getElementById('hud-p1');
    return { sun1Back: !!document.getElementById('sun1'), noZombieBar: !document.getElementById('zombie-stats-bar') };
  });
  ok(h4.sun1Back && h4.noZombieBar, 'H4 destroy 后 HUD 还原为出厂结构 ' + JSON.stringify(h4));

  await browser.close();
  console.log('RESULT ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
