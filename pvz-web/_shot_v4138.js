const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 800 });
    await p.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await sleep(1500);

    // 大厅
    await p.evaluate(() => window.MiniGames.openLobby());
    await sleep(600);
    await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_lobby.png' });

    // 玉米方块：强制 Z 型（自绘玉米块）在画面中间，next 也是 Z
    await p.evaluate(() => window.MiniGames.openGame('tetris'));
    await sleep(500);
    await p.evaluate(() => {
        const a = window.MiniGames.active;
        a.dropIv = 1e9;
        a.next = 'Z';
        a.cur = { k: 'Z', m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], x: 4, y: 5 };
        // 顺便堆几行已经消好的组合，看不同方块是否协调
        const kinds = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
        for (let i = 0; i < 7; i++) a.board[16][i + 1] = kinds[i % 7];
        for (let i = 0; i < 4; i++) a.board[15][i + 3] = kinds[i];
        a.score = 1280; a.lines = 7; a.survT = 63; a.timeScore = 189;
    });
    await sleep(400);
    await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_tetris.png' });

    // 2048
    await p.evaluate(() => window.MiniGames.openGame('g2048'));
    await sleep(500);
    await p.evaluate(() => { const a = window.MiniGames.active; a.g = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7]]; a.score = 5320; });
    await sleep(300);
    await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_2048.png' });

    await b.close();
    console.log('shots done');
})().catch(e => { console.error(e); process.exit(1); });
