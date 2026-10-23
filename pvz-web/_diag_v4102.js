// v4.0.102 诊断：P2 破产死亡流程为何走到 GAMEOVER
const path = require('path');
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(800);
  await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('btn-vs-side-zombie').click();
    await new Promise(r => setTimeout(r, 500));
    const vz = [...document.querySelectorAll('.vz-card')];
    for (const t of ['normal', 'imp']) {
      const c = vz.find(cd => cd.dataset.type === t && cd.style.filter !== 'brightness(50%)'); if (c) c.click();
    }
    const rock = document.getElementById('vz-rock');
    if (rock && !rock.disabled) rock.click();
  });
  await sleep(1200);
  // 逐秒采样：清场后观察 _vsWinTimer/f2.state/state/overlay
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    window._diag = [];
    const origTrigger = g._vsTriggerDeath.bind(g);
    g._vsTriggerDeath = (s) => { window._diag.push(['trigger', s, g.state]); return origTrigger(s); };
    const origWin = g.vsPlantWin.bind(g);
    g.vsPlantWin = () => { window._diag.push(['vsPlantWin', g._vsWinTimer, g.vsFate.p2.state, 'human=' + g._vsSideHuman('p2'), 'ai=' + g.vsAiMode, 'side=' + g.vsPlayerSide]); return origWin(); };
  });
  await page.evaluate(() => {
    const g = window.game || window._pvzGame;
    g.entities = g.entities.filter(e => !(e instanceof Zombie));
    g.zombieSun = 0;
  });
  for (let i = 0; i < 5; i++) {
    await sleep(1000);
    const s = await page.evaluate(() => {
      const g = window.game || window._pvzGame;
      const ov = document.querySelector('.vase-win-overlay');
      return {
        state: g.state, timer: (g._vsWinTimer || 0).toFixed(2), p2: g.vsFate.p2.state,
        title: ov ? ov.innerText.split('\n').slice(0, 2).join(' | ') : '', diag: (window._diag || []).slice(-4)
      };
    });
    console.log(i + 's', JSON.stringify(s));
  }
  console.log('pageerrors:', JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
