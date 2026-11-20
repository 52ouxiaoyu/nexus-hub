const path = require('path');
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', String(e).slice(0, 200)));
  await page.goto('file://' + path.join('/Users/clawbox/nexus-hub/pvz-web', 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  const out = await page.evaluate(async () => {
    const g = window.game || window._pvzGame;
    const log = [];
    g.openVsMode(false, true);
    await new Promise(r => setTimeout(r, 400));
    log.push({ step: 'after openVsMode', vsAiMode: g.vsAiMode, sideModal: document.getElementById('vs-side-modal').style.display });
    const bp = document.getElementById('btn-vs-side-plant');
    log.push({ step: 'side btn exists', exists: !!bp });
    bp.click();
    await new Promise(r => setTimeout(r, 500));
    const grid = document.getElementById('chooser-grid');
    log.push({ step: 'after side-plant', chooserGrid: !!grid, cardCount: grid ? grid.querySelectorAll('.chooser-card').length : 0,
               modalShown: document.getElementById('vs-chooser-modal') ? document.getElementById('vs-chooser-modal').style.display : 'no-modal' });
    const cards = grid ? [...grid.querySelectorAll('.chooser-card')] : [];
    const prefer = ['peashooter', 'sunflower', 'wallnut', 'repeater', 'snowpea', 'cherrybomb', 'potatomine', 'tallnut'];
    let picked = 0;
    for (const t of prefer) { const c = cards.find(cd => cd.dataset.type === t); if (c) { c.click(); picked++; } }
    log.push({ step: 'picked', picked });
    const rock = document.getElementById('btn-lets-rock');
    log.push({ step: 'rock', exists: !!rock, disabled: rock ? rock.disabled : null });
    if (rock && !rock.disabled) rock.click();
    await new Promise(r => setTimeout(r, 800));
    log.push({ step: 'after rock', vsMode: g.vsMode, state: g.state, selectedSeeds: g.selectedSeeds ? g.selectedSeeds.length : 'undef',
               seedsId: g.selectedSeeds ? 'ok' : (typeof g.seeds), sun0: g.sunCount });
    return log;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
