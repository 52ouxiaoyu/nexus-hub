const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files']
    });
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.setViewport({ width: 1024, height: 768 });
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 700));
    await p.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = true; g.state = 'PLAYING';
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('seed-chooser').style.display = 'none';
        document.getElementById('recipe-modal').style.display = 'none';
        document.getElementById('glove-bank').style.display = 'flex';
        g.board.grid = [];
        for (let rr = 0; rr < 5; rr++) { g.board.grid[rr] = []; for (let cc = 0; cc < 9; cc++) g.board.grid[rr][cc] = null; }
        // 豌豆在(0,1)作参照; 当前版西瓜在(0,3); 官方版西瓜在(0,6)
        g.board.addPlant(new Plant(g, 'peashooter'), 0, 1);
        g.board.addPlant(new Plant(g, 'melonpult'), 0, 3);
        g.board.addPlant(new Plant(g, 'melonpult'), 0, 6);
        // (0,6)换成官方适配版
        const host = g.board.grid[0][6];
        if (host) host.element.src = 'file:///tmp/melonpult_fix96.png';
        for (let i = 0; i < 5; i++) g.update && g.update();
    });
    await new Promise(r => setTimeout(r, 500));
    const box = await p.evaluate(() => {
        const r = document.getElementById('game-container').getBoundingClientRect();
        return { x: 0, y: r.top + 20, width: r.width, height: 120 };
    });
    await p.screenshot({ path: '/tmp/_ab2_melon.png', clip: box });
    console.log('ok');
    await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
