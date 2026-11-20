/* 视觉抽查（不提交仓库） */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'index.html');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--disable-gpu', '--no-sandbox',
      '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
      '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
    userDataDir: '/tmp/pptr-tw-shot-' + Date.now(),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900 });
  page.on('pageerror', (e) => console.log('ERR', String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 300));

  await page.screenshot({ path: __dirname + '/_v_menu.png' });

  // 满火力 + 僚机
  await page.evaluate(() => {
    window.__twGame.start('story');
    window.__twGame.setPower(5);
    window.__twGame.G.graze = 37; window.__twGame.G.combo = 12; window.__twGame.G.comboT = 90;
    window.__twGame.key('j', true);
    window.__twGame.frame(420);
    window.__twGame.render();
  });
  await page.screenshot({ path: __dirname + '/_v_power5.png' });

  // 第 3 关 Boss，打掉一个侧炮塔
  await page.evaluate(() => {
    window.__twGame.gotoStage(2);
    window.__twGame.G.frame = 0; window.__twGame.G.stageT = 100;
    window.__twGame.killAll();
    window.__twGame.spawnBoss(2);
    window.__twGame.G.boss.parts[0].alive = false;
    window.__twGame.frame(260);
    window.TW.FX.hitstop = 0;
    window.__twGame.G.boss.hp = window.__twGame.G.boss.maxhp * 0.4;
    window.__twGame.frame(30);
    window.__twGame.render();
  });
  await page.screenshot({ path: __dirname + '/_v_boss3.png' });

  await browser.close();
  console.log('shots done');
})();
