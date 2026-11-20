const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--force-device-scale-factor=1'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
    await page.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2200));

    const dir = '/Users/clawbox/nexus-hub/pvz-web/';
    await page.screenshot({ path: dir + '_v4133_menu.png' });

    // 逐卡截图（定位后裁剪，绕过 transform 影响）
    const ids = ['btn-adventure', 'btn-fusion', 'btn-vs', 'btn-minigame'];
    for (const id of ids) {
        const box = await page.evaluate(sel => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
        }, '#' + id);
        if (!box) { console.log('MISS', id); continue; }
        await page.screenshot({
            path: dir + '_v4133_' + id.replace('btn-', '') + '.png',
            clip: { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 4), width: box.w + 8, height: box.h + 8 },
        });
        console.log(id, JSON.stringify(box));
    }

    // 素材是否真的加载成功（naturalWidth>0）
    const imgs = await page.evaluate(() => Array.from(document.querySelectorAll('#start-menu .pkt-art img, #btn-minigame img')).map(i => ({
        src: i.getAttribute('src').split('/').slice(-2).join('/'),
        alt: i.alt,
        ok: i.complete && i.naturalWidth > 0,
        w: i.naturalWidth, h: i.naturalHeight,
        rw: Math.round(i.getBoundingClientRect().width), rh: Math.round(i.getBoundingClientRect().height),
    })));
    console.log('--- 封面图 ---');
    imgs.forEach(i => console.log((i.ok ? 'OK ' : 'BAD'), i.alt.padEnd(6), i.src.padEnd(24), i.w + 'x' + i.h, '->', i.rw + 'x' + i.rh));
    console.log('--- pageerror ---', errs.length ? errs : 'none');
    await browser.close();
})();
