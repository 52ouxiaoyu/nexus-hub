// v4.0.141 截图：守屋大作战房间放大后的全图 + 1:1 近景
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message)));
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"');
    await page.evaluate(() => {
        localStorage.clear();
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('dorm-screen').style.display = 'block';
        window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'peashooter' });
    });
    await page.waitForFunction('window.game && window.game.ais && window.game.ais.length === 5');
    await sleep(1500);

    // 1:1 近景（玩家视角）
    await page.screenshot({ path: '_v4141_view.png' });

    // 全图：缩小 world1 并放开 viewport 裁剪
    const info = await page.evaluate(() => {
        // 冻结模拟，否则相机每帧回写 world1.style.transform
        window.game.paused = true;
        const vp = document.getElementById('vp1');
        const w = document.getElementById('world1');
        // 不改父级（否则 .entity 的百分比尺寸会按世界宽度重算，整屏变成一个巨大贴图）：
        // 只把 viewport 本身放大到整张地图尺寸再整体缩小，世界层保持 1:1
        vp.style.width = '4800px';
        vp.style.height = '3600px';
        vp.style.flex = '0 0 auto';
        vp.style.overflow = 'visible';
        vp.style.transformOrigin = '0 0';
        vp.style.transform = 'scale(0.25)';
        w.style.transform = 'none';
        document.querySelectorAll('#dorm-ui, #dorm-ui > *, .wave-banner, #wave-announce, #zombie-warning, #dn-tint').forEach(el => { el.style.display = 'none'; });
        return {
            rooms: window.game.rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })),
            spawn: window.game.spawnCenter,
            cols: window.game.cols, rows: window.game.rows
        };
    });
    await sleep(600);
    const vpEl = await page.$('#vp1');
    await vpEl.screenshot({ path: '_v4141_map.png' });
    console.log(JSON.stringify(info.rooms));
    console.log('spawn', JSON.stringify(info.spawn), 'errors', errs);
    await b.close();
})();
