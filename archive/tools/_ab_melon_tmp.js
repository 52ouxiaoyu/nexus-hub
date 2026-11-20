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
    // 进游戏态
    await p.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = true; g.state = 'PLAYING';
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('seed-chooser').style.display = 'none';
        document.getElementById('recipe-modal').style.display = 'none';
        document.getElementById('glove-bank').style.display = 'flex';
        g.board.grid = [];
        for (let rr = 0; rr < 5; rr++) { g.board.grid[rr] = []; for (let cc = 0; cc < 9; cc++) g.board.grid[rr][cc] = null; }
    });
    // 左: 豌豆(参照清晰度) 中: 当前西瓜版 右: 官方版
    await p.evaluate(() => {
        const g = window._pvzGame;
        g.board.addPlant(new Plant(g, 'peashooter'), 0, 2);
        g.board.addPlant(new Plant(g, 'melonpult'), 0, 4);
    });
    // 把(0,4)西瓜投手的 src 换成官方适配版生成对照
    await p.evaluate(() => {
        const g = window._pvzGame;
        const host = g.board.grid[0][4];
        if (host) host.element.src = 'file:///tmp/melonpult_fix96.png';
        for (let i = 0; i < 5; i++) g.update && g.update();
    });
    await new Promise(r => setTimeout(r, 500));
    // 截草坪第一行整行
    const box = await p.evaluate(() => {
        const r = document.getElementById('game-container').getBoundingClientRect();
        return { x: 0, y: r.top, width: r.width, height: 130 };
    });
    await p.screenshot({ path: '/tmp/_ab_melon.png' });
    console.log('shot A/B done');
    await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
