// v4.0.140 截图：主菜单封面（经典冒险=大蒜）+ 后院游乐场 10 张卡
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = 'file://' + path.resolve(__dirname, 'index.html');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(FILE, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1400));

    // --- 1. 主菜单封面 ---
    await page.screenshot({ path: '_v4140_menu.png' });
    // 单卡特写
    const advBox = await page.evaluate(() => {
        const b = document.getElementById('btn-adventure').getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
    await page.screenshot({ path: '_v4140_advcard.png', clip: { x: advBox.x - 6, y: advBox.y - 6, width: advBox.width + 12, height: advBox.height + 12 } });

    // --- 2. 后院游乐场大厅 ---
    const lobby = await page.evaluate(() => {
        if (!window.MiniGames) return 'no MiniGames';
        window.MiniGames.openLobby();
        return 'ok';
    });
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({ path: '_v4140_lobby.png' });

    const cards = await page.evaluate(() =>
        [...document.querySelectorAll('#mini-grid .mini-card')].map(c => {
            const img = c.querySelector('.ico img');
            const r = img.getBoundingClientRect();
            const ir = c.querySelector('.ico').getBoundingClientRect();
            return {
                name: c.querySelector('h3').textContent,
                src: img.getAttribute('src').split('/').slice(-2).join('/'),
                w: Math.round(r.width), h: Math.round(r.height),
                boxW: Math.round(ir.width), boxH: Math.round(ir.height),
                clipped: (r.width > ir.width - 3) || (r.height > ir.height - 3)
            };
        }));
    console.log('lobby:', lobby);
    console.log(JSON.stringify(cards, null, 1));
    console.log('pageerror:', errs);
    await browser.close();
})();
