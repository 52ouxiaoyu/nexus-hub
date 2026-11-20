/* v4.0.161 截图：双人对战 → 僵尸攻破一路 → 当场判负（没有天使/魔鬼二选一）*/
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-shot161-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window._pvzGame');
  await sleep(700);

  // 走真实开局路径：openVsMode → 选卡 → _beginVsGame
  await p.evaluate(async () => {
    const g = window._pvzGame;
    g.openVsMode(false, false);
    const pick = t => g.seeds.find(s => s.type === t);
    g.vsPlantSeeds = ['sunflower', 'peashooter', 'wallnut', 'snowpea']
      .map(t => Object.assign({}, pick(t))).filter(Boolean);
    g.vsZombiePicks = ['normal', 'imp', 'conehead'];
    g._beginVsGame();
    await new Promise(r => setTimeout(r, 600));
    g.playTime = 20; g._vsLastDeploy = 0; g.zombieSun = 9999;
    g.deployZombie('normal', 2);
    // 摆两株植物，让画面像真在对战
    g.tryPlanting('sunflower', 1, 1);
    g.tryPlanting('peashooter', 2, 2);
    g.tryPlanting('peashooter', 0, 2);
  });
  await sleep(4200);   // 等成就飘条/召唤提示自己消失，截干净的结算画面
  // 把第 3 路那只僵尸推进房子
  await p.evaluate(() => {
    const g = window._pvzGame;
    const z = g.entities.filter(e => e instanceof Zombie && !e.isDead)
      .sort((a, b) => a.x - b.x)[0];
    if (z) { z.state = 'WALKING'; z.x = 46; }
  });
  await sleep(900);
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4161_vs_lose.png' });

  const info = await p.evaluate(() => {
    const g = window._pvzGame;
    const ov = document.querySelector('.vase-win-overlay');
    return {
      state: g.state,
      title: ov ? ov.querySelector('.vase-win-title').innerText.trim() : '',
      sub: ov ? ov.querySelector('.vase-win-sub').innerText.trim() : '',
      fate: typeof g.vsFate,
      buttons: ov ? [...ov.querySelectorAll('button')].map(x => x.innerText.trim()) : []
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
