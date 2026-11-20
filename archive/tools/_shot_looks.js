const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--window-size=1280,760']
    });
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 760 });
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(800);
    await p.click('#btn-fusion');
    await sleep(900);
    await p.evaluate(() => {
        const grid = document.getElementById('chooser-grid');
        if (grid) { if (grid.children[0]) grid.children[0].click(); if (grid.children[1]) grid.children[1].click(); }
        const r = document.getElementById('btn-lets-rock'); if (r) r.click();
    });
    await sleep(1600);
    await p.evaluate(() => {
        const g = window._pvzGame;
        const chooser = document.getElementById('seed-chooser');
        if (chooser) chooser.style.display = 'none';
        if (g.state !== 'PLAYING') g.state = 'PLAYING';
        const types = [
            'fusion_peashooter_spikeweed',   // 射刺豌豆
            'fusion_wallnut_garlic',         // 金蒜坚果
            'fusion_tallnut_garlic',         // 蒜味高坚果
            'fusion_scaredy_sunflower',      // 帕修向日葵
            'fusion_gatlingpea_cattail',     // 机枪猫尾草
            'fusion_wallnut_twinsunflower',  // 双子坚果
            'fusion_wintermelon_cabbagepult',// 冰双果投手
            'fusion_peaflower',              // 豌豆向日葵
            'fusion_doomshroom_sunflower',   // 毁灭向日葵
            'fusion_icecabbage',             // 寒冰卷心菜
            'fusion_cabbagenut',             // 卷心菜堡垒
            'fusion_nutshooter',             // 坚果射手
            'fusion_firerepeater',           // 火焰双发
            'fusion_quadsun',                // 四头向日葵（参照）
            'fusion_chomper_garlic'          // 蒜香大嘴花（待删）
        ];
        types.forEach((t, i) => {
            const row = i < 5 ? 0 : (i < 10 ? 2 : 4);
            const col = 1 + (i % 5);
            try {
                const pl = new Plant(g, t);
                pl.row = row; pl.col = col;
                pl.x = g.board.offsetX + col * g.board.cellWidth + g.board.cellWidth / 2;
                pl.y = g.board.offsetY + row * g.board.cellHeight + g.board.cellHeight / 2 + 20;
                g.board.addPlant(pl, row, col);
                pl.element.style.left = pl.x + 'px';
            } catch (e) { console.log('ERR', t, e.message); }
        });
        return true;
    });
    await sleep(1600);
    const el = await p.$('#game-container');
    await (el || p).screenshot({ path: '/Users/clawbox/nexus-hub/v356_before.png' });
    console.log('saved');
    await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
