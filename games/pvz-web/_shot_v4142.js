// v4.0.142 截图：守屋全景（房间再放大）/ 砸罐子照亮后重掷 / 我是僵尸卡带 / 彩蛋猫压过顶部条
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
    await sleep(1200);

    // ---------- 1. 首页：把猫挪到顶部条位置，证明不再被盖住 ----------
    await page.evaluate(() => {
        const wrap = document.getElementById('menu-cat-wrap');
        wrap.style.left = '520px';
        wrap.style.top = '8px';
        const cat = document.getElementById('menu-cat');
        cat.classList.remove('walking');
        cat.style.setProperty('--cat-face', '1');
    });
    await sleep(400);
    await page.screenshot({ path: '_v4142_cat.png' });

    // ---------- 2. 守屋全景 ----------
    await page.evaluate(() => {
        localStorage.clear();
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('dorm-screen').style.display = 'block';
        window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'peashooter' });
    });
    await page.waitForFunction('window.game && window.game.ais && window.game.ais.length === 5');
    await sleep(1500);
    await page.screenshot({ path: '_v4142_dorm.png' });
    const rooms = await page.evaluate(() => {
        window.game.paused = true;
        const vp = document.getElementById('vp1');
        const w = document.getElementById('world1');
        vp.style.width = '4800px';
        vp.style.height = '3600px';
        vp.style.flex = '0 0 auto';
        vp.style.overflow = 'visible';
        vp.style.transformOrigin = '0 0';
        vp.style.transform = 'scale(0.25)';
        w.style.transform = 'none';
        document.querySelectorAll('#dorm-ui, #dorm-ui > *, .wave-banner, #wave-announce, #zombie-warning, #dn-tint').forEach(el => { el.style.display = 'none'; });
        return window.game.rooms.map(r => r.w + 'x' + r.h);
    });
    await sleep(600);
    await (await page.$('#vp1')).screenshot({ path: '_v4142_map.png' });
    console.log('rooms', rooms.join(' '));

    // ---------- 3. 砸罐子：照亮 + 重掷 ----------
    await page.reload();
    await page.waitForFunction('window._pvzGame && window._pvzGame.board');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'easy';
        g._beginVaseGame();
    });
    await sleep(1400);
    const vinfo = await page.evaluate(async () => {
        const g = window._pvzGame;
        const v = g.vases.find(x => !x.smashed && x.content && x.content.kind === 'plant');
        if (!v) return { err: 'no plant vase' };
        let lamp = null;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const r = v.row + dr, c = v.col + dc;
            if (g.vases.some(x => !x.smashed && x.row === r && x.col === c)) continue;
            lamp = { r, c }; break;
        }
        // 真种一棵路灯花（走 spawnPlant 的视觉路径，不消耗阳光）
        if (lamp) {
            const p = new Plant(g, 'plantern');
            p.x = g.board.offsetX + lamp.c * g.board.cellWidth + g.board.cellWidth / 2;
            p.y = g.board.offsetY + lamp.r * g.board.cellHeight + g.board.cellHeight / 2;
            p.element.style.left = p.x + 'px';
            p.element.style.top = (p.y + (p.yOffset || 0)) + 'px';
            p.element.style.transform = `translate(-50%,-50%) scale(0.55)`;
        }
        g.lightUpNeighbors(lamp.r, lamp.c);
        await new Promise(r => setTimeout(r, 700));
        return { row: v.row, col: v.col, kind: v.content.type, lit: g.vases.filter(x => x.revealed).length };
    });
    console.log('lit', JSON.stringify(vinfo));
    await sleep(400);
    await page.screenshot({ path: '_v4142_vase_before.png' });
    const after = await page.evaluate(async () => {
        const g = window._pvzGame;
        const v = g.vases.find(x => x.revealed && !x.smashed);
        g.rerollVase(v);
        await new Promise(r => setTimeout(r, 700));
        return { kind: v.content.kind, type: v.content.type, hasEl: !!v.contentEl, uses: g.vaseRerollUses };
    });
    console.log('after', JSON.stringify(after));
    await sleep(300);
    await page.screenshot({ path: '_v4142_vase_after.png' });

    // ---------- 4. 我是僵尸卡带（无熔炉按钮） ----------
    await page.reload();
    await page.waitForFunction('window._pvzGame && window._pvzGame.board');
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.sunCount = 5000;
        g.startZombieMode ? g.startZombieMode() : (g.zombieMode = true, g.buildZombieBank());
    });
    await sleep(1500);
    const bankEl = await page.$('#zombie-bank');
    if (bankEl) await bankEl.screenshot({ path: '_v4142_zbank.png' });
    console.log('errors', errs);
    await b.close();
})();
