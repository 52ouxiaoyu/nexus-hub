/* 诊断：用户反馈「长按 A/D 车不转向」——用真实 DOM 键盘事件走完整链路 */
const path = require('path');
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const FILE = 'file://' + path.resolve('/Users/clawbox/nexus-hub/racing-3d', 'index.html');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--disable-gpu', '--no-sandbox',
               '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
               '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto(FILE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.state !== 'LOADING', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 300));

    // 进入比赛
    await page.evaluate(() => { const g = window.__game; g.mode = 'SOLO'; g.startRace(); });
    await new Promise(r => setTimeout(r, 500));

    // 真实按键：按住 W 2 秒让车跑起来（keydown + OS 自动重复语义）
    await page.keyboard.down('KeyW');
    await new Promise(r => setTimeout(r, 2000));
    let snap = await page.evaluate(() => {
        const p = window.__game.player;
        return { speed: p.speed, state: window.__game.state, keysW: Input.keys['w'], heading: p.heading };
    });
    console.log('W 加速后:', JSON.stringify(snap));

    // 按住 A 1.5 秒（W 不松）——复现用户场景：边开边长按左
    const h0 = snap.heading;
    await page.keyboard.down('KeyA');
    await new Promise(r => setTimeout(r, 300));
    let mid = await page.evaluate(() => ({ speed: window.__game.player.speed, keysA: Input.keys['a'], heading: window.__game.player.heading }));
    await new Promise(r => setTimeout(r, 1200));
    let endA = await page.evaluate(() => ({ speed: window.__game.player.speed, keysA: Input.keys['a'], heading: window.__game.player.heading }));
    console.log('按住A 0.3s:', JSON.stringify(mid));
    console.log('按住A 1.5s:', JSON.stringify(endA), ' heading变化:', (endA.heading - h0).toFixed(3));
    await page.keyboard.up('KeyA');
    await page.keyboard.up('KeyW');

    // 同样测 D
    await page.keyboard.down('KeyW');
    await new Promise(r => setTimeout(r, 1500));
    const h1 = await page.evaluate(() => window.__game.player.heading);
    await page.keyboard.down('KeyD');
    await new Promise(r => setTimeout(r, 1500));
    let endD = await page.evaluate(() => ({ speed: window.__game.player.speed, keysD: Input.keys['d'], heading: window.__game.player.heading }));
    console.log('按住D 1.5s:', JSON.stringify(endD), ' heading变化:', (endD.heading - h1).toFixed(3));
    await page.keyboard.up('KeyD');
    await page.keyboard.up('KeyW');

    await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
