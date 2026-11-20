// Verify the v3.3.10 melon/wintermelon HD sprite replacements in three contexts:
//   1) seed chooser seed cards (melon + wintermelon), 2) plants placed on lawn,
//   3) recipe book modal where melon is used as a result image and an overlay.
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files']
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url() + ' ' + r.failure().errorText));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    await page.setViewport({ width: 1024, height: 720 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 900));

    // ---- 1) seed chooser: render melon + wintermelon cards ----
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = true;
        document.getElementById('start-menu').style.display = 'none';
        if (typeof g.showSeedChooser === 'function') g.showSeedChooser();
        else document.getElementById('seed-chooser').style.display = 'flex';
    });
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: '/tmp/v3310_seedchooser.png' });

    // ---- 2) lawn: plant peashooter (ref) + melonpult + wintermelon on visible rows ----
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = true;
        g.state = 'PLAYING';
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('seed-chooser').style.display = 'none';
        document.getElementById('recipe-modal').style.display = 'none';
        const gb = document.getElementById('glove-bank'); if (gb) gb.style.display = 'flex';
        g.board.grid = [];
        for (let rr = 0; rr < 5; rr++) { g.board.grid[rr] = []; for (let cc = 0; cc < 9; cc++) g.board.grid[rr][cc] = null; }
        // row 0 is visible at top of lawn (closest to zombies); row 1 for second plant
        g.board.addPlant(new Plant(g, 'peashooter'), 0, 1);
        g.board.addPlant(new Plant(g, 'melonpult'), 0, 3);
        g.board.addPlant(new Plant(g, 'wintermelon'), 0, 5);
        g.board.addPlant(new Plant(g, 'melonpult'), 1, 1);
        g.board.addPlant(new Plant(g, 'wintermelon'), 1, 3);
        for (let i=0;i<3;i++) if (g.update) g.update();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: '/tmp/v3310_lawn.png' });

    // ---- 3) recipe book modal: click the recipe book button to open ----
    await page.evaluate(() => {
        const g = window._pvzGame;
        // ensure fusion UI is initialized so recipe list is populated
        if (typeof g.initFusionUI === 'function') g.initFusionUI();
        const modal = document.getElementById('recipe-modal');
        modal.style.display = 'block';
        const btn = document.getElementById('recipe-book-btn');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({ path: '/tmp/v3310_recipe.png' });
    // scroll the recipe-list (the actual scrollable container) to its bottom to see melon recipes
    await page.evaluate(() => {
        const list = document.getElementById('recipe-list');
        if (list) list.scrollTop = list.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: '/tmp/v3310_recipe_bottom.png' });

    // ---- inspect: confirm new assetVersion is in play and img tags carry it ----
    const info = await page.evaluate(() => {
        const out = { assetVersion: null, melonSrc: null, wmSrc: null, melonLoaded: null, wmLoaded: null, errors: [] };
        try {
            // version.json might be fetched; read from window if present, else from a known element
            const v = document.querySelector('[data-version]');
            if (v) out.assetVersion = v.getAttribute('data-version');
            // find an img on the lawn whose src contains MelonPult/MelonPult.png
            const imgs = Array.from(document.querySelectorAll('img'));
            const mp = imgs.find(i => /MelonPult\/MelonPult\.png/.test(i.src));
            const wm = imgs.find(i => /WinterMelon\/WinterMelon\.png/.test(i.src));
            if (mp) {
                out.melonSrc = mp.src;
                out.melonLoaded = mp.complete && mp.naturalWidth > 0;
            }
            if (wm) {
                out.wmSrc = wm.src;
                out.wmLoaded = wm.complete && wm.naturalWidth > 0;
            }
        } catch (e) { out.errors.push(String(e)); }
        return out;
    });
    console.log('INFO', JSON.stringify(info));
    if (errors.length) console.log('ERRORS', errors.join('\n')); else console.log('NO_PAGE_ERRORS');
    await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });