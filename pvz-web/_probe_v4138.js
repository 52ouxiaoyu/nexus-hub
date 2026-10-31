const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1800));
    const ver = await p.evaluate(() => { const e = document.querySelector('.ver'); return e ? e.innerText : '(none)'; });
    const sub = await p.evaluate(() => {
        const e = document.querySelector('#btn-minigame .pkt-sub');
        const rg = document.createRange(); rg.selectNodeContents(e);
        return e.innerText + ' | lines=' + [...rg.getClientRects()].filter(x => x.width > 0.5).length
            + ' | w=' + Math.round(rg.getBoundingClientRect().width);
    });
    console.log('ver =', ver);
    console.log('minigame sub =', sub);
    await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_menu.png' });
    await b.close();
})();
