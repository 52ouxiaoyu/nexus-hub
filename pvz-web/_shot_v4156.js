// v4.0.156 截图：泡泡工坊大厅（静音按钮）/ 经典泡泡龙 / 机械龙 / 静音态
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = '/Users/clawbox/nexus-hub/pvz-web';

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu',
               '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
        userDataDir: '/tmp/pptr-shot-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('file://' + ROOT + '/index.html', { waitUntil: 'networkidle2' });
    await sleep(1800);
    await page.mouse.click(720, 800);
    await sleep(300);

    // 1. 工坊大厅（右上角「声音 开」）
    await page.evaluate(() => window.MiniGames.openBubble());
    await sleep(700);
    await page.screenshot({ path: ROOT + '/_v4156_lobby.png' });

    // 2. 经典泡泡龙（顶部条带「声音 开」）
    await page.evaluate(() => window.MiniGames.openGame('bubble'));
    await sleep(500);
    await page.evaluate(async () => {
        const g = window.MiniGames.active;
        for (let i = 0; i < 3; i++) { g.shoot(); await new Promise(r => setTimeout(r, 520)); }
    });
    await sleep(500);
    await page.screenshot({ path: ROOT + '/_v4156_bubble.png' });

    // 3. 机械龙（打到暴怒阶段，炮口预警光）
    await page.evaluate(async () => {
        const MG = window.MiniGames;
        MG.openGame('dragon');
        const g = MG.active;
        g.hp = g.hpMax * 0.30; g.hurt(16);
        g.sprayT = 0.6;
        await new Promise(r => setTimeout(r, 500));
    });
    await sleep(700);
    await page.screenshot({ path: ROOT + '/_v4156_dragon.png' });

    // 4. 静音态文案
    await page.click('#mini-mute');
    await sleep(400);
    await page.screenshot({ path: ROOT + '/_v4156_mute.png' });

    await b.close();
    console.log('shots done');
    process.exit(0);
})();
