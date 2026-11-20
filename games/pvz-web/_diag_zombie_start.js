// 诊断：僵尸阵营开局「不能动」到底冻多久 + 观察期内技能是否可放
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });

  const t0 = Date.now();
  const log = [];
  for (let i = 0; i < 24; i++) {
    const s = await page.evaluate(() => {
      const g = window.game;
      return {
        gt: +(g.gameTime / 1000).toFixed(1),
        fz: +g.zombieFreezeT.toFixed(2),
        paused: g.paused, over: g.over,
        x: Math.round(g.player.x), y: Math.round(g.player.y),
        lv: g.player.level, hp: Math.round(g.player.hp),
        hud: (document.getElementById('skill-hud') || {}).innerText || '',
        fzEl: g.freezeEl ? g.freezeEl.style.display : 'none'
      };
    });
    log.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ...s });
    await sleep(1000);
  }
  console.log('--- 每秒采样（真实秒 / gameTime / zombieFreezeT / 位置）---');
  for (const r of log) console.log(`t=${r.t}s gt=${r.gt}s fz=${r.fz} x=${r.x} y=${r.y} lv=${r.lv} hp=${r.hp} frozenEl=${r.fzEl}`);

  // 观察期技能测试：重开一局，在冻结中按 M / G / H / B
  await page.evaluate(() => { window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' }); });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(800);
  const before = await page.evaluate(() => {
    const g = window.game;
    return {
      fz: +g.zombieFreezeT.toFixed(2), skillCd: +g.player.skillCd.toFixed(1),
      waveOrderCd: +g.waveOrderCd.toFixed(1), cmd: g.commandTarget ? 'set' : 'null',
      speedy: +g.player.speedBuffT.toFixed(1), zombies: g.zombies.length,
      hud: (document.getElementById('skill-hud') || {}).innerText.replace(/\s+/g, ' ') || ''
    };
  });
  await page.keyboard.press('m'); await sleep(200);
  await page.keyboard.press('g'); await sleep(200);
  await page.keyboard.press('h'); await sleep(300);
  const after = await page.evaluate(() => {
    const g = window.game;
    return {
      fz: +g.zombieFreezeT.toFixed(2), skillCd: +g.player.skillCd.toFixed(1),
      waveOrderCd: +g.waveOrderCd.toFixed(1), cmd: g.commandTarget ? (g.commandTarget.roleDef ? g.commandTarget.roleDef.name : 'x') : 'null',
      speedy: +g.player.speedBuffT.toFixed(1), zombies: g.zombies.length,
      hud: (document.getElementById('skill-hud') || {}).innerText.replace(/\s+/g, ' ') || ''
    };
  });
  console.log('\n--- 观察期内按 M/G/H ---');
  console.log('前', JSON.stringify(before));
  console.log('后', JSON.stringify(after));

  // 观察期内的移动测试
  const x0 = await page.evaluate(() => Math.round(window.game.player.x));
  await page.keyboard.down('d'); await sleep(1200); await page.keyboard.up('d');
  const x1 = await page.evaluate(() => Math.round(window.game.player.x));
  console.log(`观察期内按住 D 1.2s：x ${x0} → ${x1}（位移 ${x1 - x0}px）`);

  await browser.close();
})();
