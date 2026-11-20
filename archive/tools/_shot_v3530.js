const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--window-size=1280,760']
    });
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 760 });
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(800);
    await p.click('#btn-fusion');
    await sleep(800);
    // 选 2 张卡再点 Let's Rock
    await p.evaluate(() => {
        const grid = document.getElementById('chooser-grid');
        const cards = grid.children;
        if (cards[0]) cards[0].click();
        if (cards[1]) cards[1].click();
        document.getElementById('btn-lets-rock').click();
        return true;
    });
    await sleep(1500);
    const ok = await p.evaluate(() => {
        const g = window._pvzGame;
        const chooser = document.getElementById('seed-chooser');
        if (chooser) chooser.style.display = 'none';
        if (g.state !== 'PLAYING') { g.state = 'PLAYING'; }
        const types = [
            'fusion_sunshroom_puffshroom', 'fusion_threepeater_torchwood', 'fusion_pumpkinhead_tallnut',
            'fusion_gloomshroom_garlic', 'fusion_hypnoshroom_sunflower', 'fusion_fumeshroom_iceshroom',
            'fusion_doomshroom_iceshroom', 'fusion_spikerock_torchwood'];
        types.forEach((t, i) => {
            const row = i < 4 ? 1 : 3;
            const col = 1 + (i % 4) * 2;
            const pl = new Plant(g, t);
            pl.row = row; pl.col = col;
            pl.x = g.board.offsetX + col * g.board.cellWidth + g.board.cellWidth / 2;
            pl.y = g.board.offsetY + row * g.board.cellHeight + g.board.cellHeight / 2 + 20;
            g.board.addPlant(pl, row, col);
            pl.element.style.left = pl.x + 'px';
            pl.update(0.016);
        });
        return { state: g.state, chooserHidden: !chooser || chooser.style.display === 'none' };
    });
    console.log(JSON.stringify(ok));
    await sleep(1500);
    const el = await p.$('#game-container');
    if (el) { await el.screenshot({ path: '/Users/clawbox/nexus-hub/v3530_looks.png' }); }
    else { await p.screenshot({ path: '/Users/clawbox/nexus-hub/v3530_looks.png' }); }
    console.log('saved');
    await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
