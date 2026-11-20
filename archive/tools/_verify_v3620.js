// v3.62.0 验证：删怕羞向日葵 / 双子坚果遮名 / 僵尸图鉴个数 / 我是僵尸加框 / 物品栏黑圈 / 砸罐子困难降难
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + '  ' + (d || '')); c ? pass++ : fail++; };

    // ===== 操作与道具说明 =====
    await page.click('#btn-help-guide');
    await page.waitForFunction('document.getElementById("help-modal").style.display === "block"', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // T1 玩法说明：5 个玩法全部带框（我是僵尸不再 plain）
    const t1 = await page.evaluate(() => {
        const modes = Array.from(document.querySelectorAll('#help-body .hg-mode'));
        const last = modes[modes.length - 1];
        const cs = getComputedStyle(last);
        return { count: modes.length, plainCount: document.querySelectorAll('#help-body .hg-plain').length,
                 lastBorder: cs.borderTopStyle, lastBg: cs.backgroundColor };
    });
    ok('T1a 玩法说明共 5 段', t1.count === 5, JSON.stringify(t1));
    ok('T1b 无 plain 无框段（我是僵尸回归盒式）', t1.plainCount === 0 && t1.lastBorder !== 'none', JSON.stringify(t1));

    // T2 图鉴个数：植物/僵尸 tab 都带（N）
    await page.evaluate(() => { document.querySelector('.hg-tab[data-tab="plants"]').click(); });
    await new Promise(r => setTimeout(r, 500));
    const t2 = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.hg-tab')).map(t => t.textContent);
        return { plants: tabs.find(t => t.indexOf('植物图鉴') >= 0), zombies: tabs.find(t => t.indexOf('僵尸图鉴') >= 0) };
    });
    ok('T2a 植物 tab 带个数', /植物图鉴（\d+）/.test(t2.plants), t2.plants);
    ok('T2b 僵尸 tab 带个数', /僵尸图鉴（\d+）/.test(t2.zombies), t2.zombies);

    // T3 植物图鉴：怕羞向日葵消失；双子坚果图片不再盖名字
    const t3 = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('#help-body .hg-tile'));
        const names = tiles.map(t => (t.querySelector('.hg-tname') || {}).textContent || '');
        const shy = names.filter(n => n.indexOf('怕羞') >= 0).length;
        const twinTile = tiles.find(t => ((t.querySelector('.hg-tname') || {}).textContent || '') === '双子坚果');
        let overlap = null;
        if (twinTile) {
            const art = twinTile.querySelector('.hg-art');
            const tname = twinTile.querySelector('.hg-tname');
            const imgs = Array.from(twinTile.querySelectorAll('img'));
            const artBottom = art.getBoundingClientRect().bottom;
            const nameTop = tname.getBoundingClientRect().top;
            const imgBottoms = imgs.map(im => im.getBoundingClientRect().bottom);
            overlap = { artBottom: Math.round(artBottom), nameTop: Math.round(nameTop),
                        maxImgBottom: imgBottoms.length ? Math.round(Math.max(...imgBottoms)) : 0 };
        }
        return { shy, hasTwin: !!twinTile, overlap };
    });
    ok('T3a 图鉴无怕羞向日葵', t3.shy === 0, JSON.stringify(t3));
    ok('T3b 双子坚果图仍在', t3.hasTwin);
    ok('T3c 双子坚果图片不越过名字线', t3.overlap.maxImgBottom <= t3.overlap.nameTop + 2,
       'imgBottom=' + t3.overlap.maxImgBottom + ' nameTop=' + t3.overlap.nameTop + ' artBottom=' + t3.overlap.artBottom);

    // T4 截图双子坚果瓦片区
    await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('#help-body .hg-tile'));
        const twin = tiles.find(t => ((t.querySelector('.hg-tname') || {}).textContent || '') === '双子坚果');
        twin.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v362_twin.png', clip: { x: 190, y: 150, width: 900, height: 560 } });

    // T5 配方大全：怕羞向日葵不再出现
    await page.evaluate(() => {
        document.getElementById('help-modal').style.display = 'none';
        const g = window._pvzGame;
        g.fusionMode = true;
        g.initFusionUI();
        document.getElementById('recipe-modal').style.display = 'block';
    });
    await new Promise(r => setTimeout(r, 800));
    const t5 = await page.evaluate(() => {
        const txt = document.getElementById('recipe-list').textContent;
        const extras = (window.PVZ_FUSION_EXTRA || []).map(f => f.type);
        return { inRecipe: txt.indexOf('怕羞') >= 0, inExtra: extras.indexOf('fusion_scaredy_sunflower') >= 0,
                 garlicIn: txt.indexOf('胆小蒜卫') >= 0 };
    });
    ok('T5 配方大全无怕羞向日葵（胆小蒜卫保留）', !t5.inRecipe && !t5.inExtra && t5.garlicIn, JSON.stringify(t5));

    // T6 砸罐子困难配置降难（地狱不动）
    const t6 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hard';
        const h = g._vaseDiffCfg();
        g.vaseDifficulty = 'hell';
        const x = g._vaseDiffCfg();
        g.vaseDifficulty = 'easy';
        const e = g._vaseDiffCfg();
        return { hard: { plantMin: h.plantMin, plantMax: h.plantMax, qZombie: h.qZombie, hpMul: h.hpMul, plantPerm: h.plantPerm, qPerm: h.qPerm },
                 hellHp: x.hpMul, easyHp: e.hpMul, hardBagPlants: h.bag.filter(v => v === 'plant').length };
    });
    ok('T6a 困难植物罐保底 5~9', t6.hard.plantMin === 5 && t6.hard.plantMax === 9, JSON.stringify(t6));
    ok('T6b 困难问号罐僵尸率 0.4 / 血量 1.0', t6.hard.qZombie === 0.4 && t6.hard.hpMul === 1.0);
    ok('T6c 困难永久植物率上调 0.85/0.68', t6.hard.plantPerm === 0.85 && t6.hard.qPerm === 0.68);
    ok('T6d 地狱 1.45 / 简单 1.0 不受影响', t6.hellHp === 1.45 && t6.easyHp === 1.0, 'hell=' + t6.hellHp);
    ok('T6e 困难 bag 植物罐 7 个', t6.hardBagPlants === 7);

    // T7 胆小蒜卫映射修复（怕羞删除腾出行）
    const t7 = await page.evaluate(() => {
        const g = window._pvzGame;
        const p = new Plant(g, 'fusion_scaredyshroom_garlic');
        const trait = p.hasTrait('scaredyshroom');
        const art = !!p.element.getAttribute('src');
        p.isDead = true;
        if (p.element.parentNode) p.element.parentNode.removeChild(p.element);
        if (p.fusionOverlay && p.fusionOverlay.parentNode) p.fusionOverlay.parentNode.removeChild(p.fusionOverlay);
        return { trait, art };
    });
    ok('T7 胆小蒜卫 hasTrait(scaredyshroom)=true（缩头特性生效）', t7.trait === true && t7.art, JSON.stringify(t7));

    // T8 物品栏黑圈（进融合局看真实卡片）
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });
    await page.click('#btn-fusion');
    await page.waitForFunction('document.querySelectorAll("#chooser-grid .chooser-card").length > 0', { timeout: 15000 });
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#chooser-grid .chooser-card'));
        cards.find(c => c.dataset.type === 'sunflower').click();
        cards.find(c => c.dataset.type === 'squash').click();
    });
    await page.click('#btn-lets-rock');
    await page.waitForFunction('window._pvzGame.state === "PLAYING"', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    const t8 = await page.evaluate(() => {
        const card = document.querySelector('#seed-bank .seed-card');
        const glove = document.getElementById('glove-bank');
        const recipe = document.getElementById('recipe-book-btn');
        const shovel = document.getElementById('shovel-bank');
        const has = el => el && getComputedStyle(el).boxShadow.indexOf('inset') >= 0;
        return { card: has(card), glove: has(glove), recipe: has(recipe), shovel: has(shovel) };
    });
    ok('T8 卡片/手套/图鉴/铲子最外圈均为黑边', t8.card && t8.glove && t8.recipe && t8.shovel, JSON.stringify(t8));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v362_bank.png', clip: { x: 60, y: 0, width: 900, height: 120 } });

    console.log('\n结果: ' + pass + ' 过 / ' + fail + ' 挂');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
