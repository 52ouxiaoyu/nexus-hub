/* v4.0.159 截图：经典冒险小队突袭横幅 + 泡泡牧场 / 泡泡塔 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await p.waitForFunction('window._pvzGame');
    await sleep(600);

    // ① 经典冒险：走真实入口（点卡片 → 选 10 张 → 开打），HUD 才是对的
    await p.click('#btn-adventure');
    await sleep(400);
    await p.evaluate(() => {
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')].slice(0, 10);
        cards.forEach(c => c.click());
    });
    await sleep(200);
    await p.click('#btn-lets-rock');
    await sleep(700);

    await p.evaluate(async () => {
        const g = window._pvzGame;
        g.sunCount = 9999;
        // 手动触发一次小队突袭，并把僵尸摆进可见区，拍下「同帧多路」的画面
        g.waveManager._squadRaid();
        await new Promise(r => setTimeout(r, 120));
        g.entities.filter(e => e.constructor && e.constructor.name === 'Zombie').forEach((z, i) => {
            z.x = g.board.offsetX + (8.2 - (i % 3) * 1.4) * g.board.cellWidth;
            z.update(0);
        });
    });
    await sleep(260);
    await p.screenshot({ path: '_v4159_classic_raid.png' });

    // ② 泡泡牧场（重新载入，避免经典开局的飘字残留到小游戏画面里）
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await p.waitForFunction('window._pvzGame');
    await sleep(500);
    await p.evaluate(async () => {
        window.MiniGames.quit();
        window.MiniGames.openBubble();
        window.MiniGames.openGame('farm');
    });
    await sleep(1200);
    await p.screenshot({ path: '_v4159_bubble_farm.png' });

    // ③ 泡泡塔第 3 层（5 色）
    await p.evaluate(async () => {
        window.MiniGames.openGame('tower');
    });
    await sleep(900);
    await p.evaluate(() => {
        const a = window.MiniGames.active;
        if (a && a.loadFloor) a.loadFloor(3);
    });
    await sleep(700);
    await p.screenshot({ path: '_v4159_bubble_tower.png' });

    await b.close();
    console.log('shots done');
})().catch(e => { console.error('FATAL', e); process.exit(2); });
