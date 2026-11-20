/* 诊断：VS 模式发车 P1/P2 是否同时能动——真实键盘事件 W + ArrowUp 同时按住 */
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

    // 走真实菜单流程进 VS（会 buildRace 重建 P2 车）
    await page.evaluate(() => document.getElementById('btn-vs').click());
    await new Promise(r => setTimeout(r, 200));

    // 倒计时一开始就按住两个键（模拟真人提前按住油门）
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ArrowUp');
    console.log('state:', await page.evaluate(() => window.__game.state));

    // 采样 5 秒
    for (let i = 0; i < 25; i++) {
        const s = await page.evaluate(() => {
            const g = window.__game, p1 = g.player, p2 = g.player2;
            return { st: g.state, cd: +g.cdTime.toFixed(2),
                     p1v: +p1.speed.toFixed(2), p2v: p2 ? +p2.speed.toFixed(2) : null,
                     keysW: !!Input.keys['w'], keyUp: !!Input.keys['arrowup'],
                     p2thr: Input.p2.throttle };
        });
        console.log(`t=${(i*0.2).toFixed(1)}s`, JSON.stringify(s));
        await new Promise(r => setTimeout(r, 200));
    }
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ArrowUp');
    await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
