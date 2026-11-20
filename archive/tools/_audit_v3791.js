// v3.79.1 全表面视觉审计：图鉴僵尸页 / 配方书掉落物格 / 砸罐照明+开罐 / 场上融合株+双盔 / 地面掉落物
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const OK = []; const BAD = [];
function check(name, cond, extra) { (cond ? OK : BAD).push(name + (extra ? ' | ' + JSON.stringify(extra) : '')); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + JSON.stringify(extra) : '')); }

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // ===== S1 图鉴僵尸页（植物头组 + 融合僵尸组）=====
    await page.click('#btn-help-guide');
    await new Promise(r => setTimeout(r, 400));
    await page.click('.hg-tab[data-tab=zombies]');
    await new Promise(r => setTimeout(r, 600));
    const codex = await page.evaluate(() => {
        const groups = [...document.querySelectorAll('#help-panel h3, .hg-group-title, .hg-zgroup-title')].map(e => e.innerText);
        return { titles: groups };
    });
    console.log('图鉴组标题:', JSON.stringify(codex.titles));
    // 滚到融合僵尸组截图
    await page.evaluate(() => {
        const els = [...document.querySelectorAll('#help-panel *')].filter(e => e.innerText === '融合僵尸' && e.children.length === 0);
        if (els[0]) els[0].scrollIntoView({ block: 'start' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a1_codex_fusion.png' });
    await page.evaluate(() => {
        const els = [...document.querySelectorAll('#help-panel *')].filter(e => e.innerText && e.innerText.startsWith('植物头') && e.children.length === 0);
        if (els[0]) els[0].scrollIntoView({ block: 'start' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a2_codex_plantheads.png' });
    // 关掉图鉴
    await page.evaluate(() => {
        const close = document.querySelector('#help-guide-close, .hg-close, #help-close');
        if (close) close.click(); else document.getElementById('btn-help-guide').click();
    });
    await new Promise(r => setTimeout(r, 300));

    // ===== S2 配方书掉落物 5 条的材料格 =====
    await page.evaluate(() => { window._pvzGame.initFusionUI(); document.getElementById('recipe-book-btn').click(); });
    await new Promise(r => setTimeout(r, 400));
    // 找到掉落物配方的 5 行，滚到那里截图
    const rec = await page.evaluate(() => {
        const lis = [...document.querySelectorAll('#recipe-list li')];
        const hits = lis.filter(li => /路障豌豆|铁桶豌豆|旗帜向日葵|铁门坚果|狂暴大喷菇/.test(li.innerText));
        if (hits[0]) hits[0].scrollIntoView({ block: 'center' });
        return hits.length;
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a3_recipe_drops.png' });
    check('S2 配方书掉落物 5 条存在', rec === 5, { hits: rec });
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });

    // ===== S3 砸罐子：照明预览（植物头僵尸罐）+ 开罐瞬间 =====
    await page.evaluate(() => {
        const g = window._pvzGame;
        // 直接进砸罐子
        if (g._beginVaseGame) g._beginVaseGame();
    });
    await new Promise(r => setTimeout(r, 1500));
    const vase = await page.evaluate(() => {
        const g = window._pvzGame;
        if (!g.vases) return { ok: false };
        // 找一个空地格手工造植物头僵尸罐
        g.entities.length = 0;
        const v = g.vases[0];
        if (!v) return { ok: false, n: 0 };
        v.content = { kind: 'zombie', type: 'nuthead' };
        // 照明（调用照亮函数）
        if (g.revealNearby || g._revealVases) { try { (g.revealNearby || g._revealVases).call(g, v.row, v.col); } catch (e) { return { ok: false, err: e.message }; } }
        return { ok: true, row: v.row, col: v.col };
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a4_vase_lit.png' });
    // 开罐
    const smash = await page.evaluate(() => {
        const g = window._pvzGame;
        const v = g.vases[0];
        if (g.smashVase) { g.smashVase(v); return { smashed: true }; }
        if (v.onSmash) { v.onSmash(); return { smashed: 'alt' }; }
        return { smashed: false, keys: Object.keys(v) };
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a5_vase_smashed.png' });
    const fieldZ = await page.evaluate(() => {
        const g = window._pvzGame;
        return g.entities.filter(e => e.headEl !== undefined).map(z => ({
            t: z.type, hasHead: !!z.headEl, inDoc: !!(z.headEl && z.headEl.isConnected),
            bodyHidden: z.element.style.display === 'none', x: Math.round(z.x)
        }));
    });
    check('S3 开罐后植物头僵尸头在 DOM', fieldZ.length > 0 && fieldZ.every(z => z.hasHead && z.inDoc), fieldZ);

    // ===== S4 场上融合株 + 融合僵尸特写（我是僵尸模式，清场摆放）=====
    await page.evaluate(() => { window._pvzGame._beginZombieGame(); });
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.entities = g.entities.filter(e => {
            if (typeof Plant !== 'undefined' && e instanceof Plant) { if (e.element && e.element.parentNode) e.element.remove(); return false; }
            return true;
        });
        // 融合僵尸 4 只
        const ztypes = ['ironcone', 'torchzombie', 'garliczombie', 'madpaper'];
        ztypes.forEach((tp, i) => { const z = new Zombie(g, i % 5, tp); z.x = 300 + i * 150; g.entities.push(z); if (z.syncPlantHead) z.syncPlantHead(); });
        // 掉落物融合株 4 株（种在僵尸行里）
        const ptypes = ['fusion_cone_peashooter', 'fusion_bucket_peashooter', 'fusion_flag_sunflower', 'fusion_door_wallnut', 'fusion_paper_fume'];
        ptypes.forEach((tp, i) => {
            try { const p = new Plant(g, tp); p.row = i % 5; p.x = 250 + i * 120; g.entities.push(p); } catch (e) { console.log('plant err', tp, e.message); }
        });
    });
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a6_field_all.png' });
    // 地面掉落物：强制掉 5 件
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.groundItems = [];
        document.querySelectorAll('.ground-item, [class*=ground]').forEach(e => e.remove());
        const cfgs = ['conehead', 'buckethead', 'flag', 'screendoor', 'newspaper'];
        cfgs.forEach((tp, i) => {
            const fake = { type: tp, x: g.board.offsetX + (i + 1) * g.board.cellWidth + 40, row: i % 5, hypnotized: false };
            if (g._dropZombieLoot) g._dropZombieLoot(fake);
        });
        return g.groundItems.length;
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_a7_ground_items.png' });

    console.log('\n===== 汇总: ' + OK.length + ' pass / ' + BAD.length + ' fail');
    await browser.close();
})();
