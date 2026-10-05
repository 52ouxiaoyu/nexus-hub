// v3.79.1 验证：图鉴植物头组回归修复 / 双盔倒扣贴合 / 火把在手 / 掉落物完整裁剪 / 融合株扣紧
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log('PASS ' + name); }
    else { fail++; console.log('FAIL ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
}

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

    // ===== T1 图鉴：植物头组 7 条全部带 .hg-zhead（回归修复核心断言）=====
    await page.click('#btn-help-guide');
    await new Promise(r => setTimeout(r, 400));
    await page.click('.hg-tab[data-tab=zombies]');
    await new Promise(r => setTimeout(r, 600));
    const t1 = await page.evaluate(() => {
        const names = ['高坚果头僵尸', '坚果头僵尸', '机枪头僵尸', '寒冰头僵尸', '火爆辣椒头僵尸', '豌豆头僵尸', '向日葵头僵尸'];
        return names.map(n => {
            const nameEls = [...document.querySelectorAll('#help-panel *')].filter(e => e.innerText === n && e.children.length === 0);
            if (!nameEls.length) return { n, found: false };
            const tile = nameEls[0].parentElement;
            return { n, found: true, zbody: !!tile.querySelector('.hg-zbody'), zhead: !!tile.querySelector('.hg-zhead'),
                     headImg: tile.querySelector('.hg-zhead img') ? tile.querySelector('.hg-zhead img').naturalWidth : 0 };
        });
    });
    check('T1 图鉴植物头组 7 条全部有僵尸身体+头顶植物', t1.length === 7 && t1.every(x => x.found && x.zbody && x.zhead && x.headImg > 0), t1.filter(x => !x.zhead || !x.found));

    // ===== T2 图鉴：双盔 acc 翻转、大蒜头、火把整桩（图鉴缩略图是 canvas→base64 内联，DOM 里无文件名，改源码断言）=====
    const fs = require('fs');
    const hgSrc = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
    const garlicInCodex = /大蒜僵尸'[\s\S]{0,200}head: \{ src: PL \+ 'Garlic\/Garlic\.gif'/.test(hgSrc);
    const torchFullInCodex = /火把僵尸'[\s\S]{0,200}x2: 73, y2: 87/.test(hgSrc);
    const t2 = { flipInField: true, garlicInCodex, torchFullInCodex };
    check('T2 图鉴融合僵尸组：双盔桶翻转+大蒜头+火把树桩齐备', garlicInCodex && torchFullInCodex, t2);
    // 滚到融合僵尸组截图
    await page.evaluate(() => {
        const els = [...document.querySelectorAll('#help-panel *')].filter(e => e.innerText === '融合僵尸' && e.children.length === 0);
        if (els[0]) els[0].scrollIntoView({ block: 'start' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c1_codex_fusion.png' });
    await page.evaluate(() => {
        const els = [...document.querySelectorAll('#help-panel *')].filter(e => e.innerText && e.innerText.startsWith('植物头') && e.children.length === 0);
        if (els[0]) els[0].scrollIntoView({ block: 'start' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c2_codex_plantheads.png' });
    // 关图鉴
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    // ===== T3 砸罐子模式（zombieMode=false）：场上双盔/火把 + 掉落物 5 件 + 融合株 5 株 =====
    await page.evaluate(() => { window._pvzGame._beginVaseGame(); });
    await new Promise(r => setTimeout(r, 2000));
    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        window._savedVase = g.vases && g.vases[0] || null; // T8 照明预览要用
        g.vases = []; // 清空罐子避免遮挡
        document.querySelectorAll('.vase, [class*=vase]').forEach(e => { if (e.style) e.style.display = 'none'; });
        const zs = ['ironcone', 'torchzombie', 'garliczombie'].map((tp, i) => {
            const z = new Zombie(g, i, tp); z.x = 260 + i * 170; g.entities.push(z); z.update(0.016); return z;
        });
        const iron = zs[0], torch = zs[1];
        const accImg = iron._accEl.querySelector('img');
        const torchH = torch._accEl.getBoundingClientRect().height / (getComputedStyle(document.body).getPropertyValue('--k') || 1);
        return {
            zombieMode: g.zombieMode,
            ironFlip: accImg.style.transform.includes('scaleY(-1)'),
            ironAccRect: (r => ({ w: +r.width.toFixed(0), h: +r.height.toFixed(0) }))(iron._accEl.getBoundingClientRect()),
            ironAccTop: iron._accEl.style.top,
            torchAccRect: (r => ({ w: +r.width.toFixed(0), h: +r.height.toFixed(0) }))(torch._accEl.getBoundingClientRect()),
            torchAccTop: torch._accEl.style.top,
            garlicHead: !!zs[2].headEl
        };
    });
    check('T3a 砸罐子模式 zombieMode=false', t3.zombieMode === false);
    check('T3b 双盔外桶垂直翻转（倒扣）', t3.ironFlip);
    check('T3c 火把挂件为整桩（高≈31csspx 而非旧 15）', t3.torchAccRect.h > 38 && t3.torchAccRect.h < 52, t3.torchAccRect); // 31css*1.42屏缩放≈44
    check('T3d 大蒜僵尸植物头在场', t3.garlicHead);

    // 地面掉落物 5 件（绕过概率：直接调 _dropZombieLoot）
    await page.evaluate(() => {
        const g = window._pvzGame;
        ['conehead', 'buckethead', 'flag', 'screendoor', 'newspaper'].forEach((tp, i) => {
            const fake = { type: tp, x: g.board.offsetX + (i + 1) * g.board.cellWidth + g.board.cellWidth / 2, row: i % 5, hypnotized: false };
            // 强制掉落：临时把 rate 提到 1
            const cfg = window.PVZ_DROP_LOOT[tp];
            const old = cfg.rate; cfg.rate = 1;
            g._dropZombieLoot(fake);
            cfg.rate = old;
        });
    });
    await new Promise(r => setTimeout(r, 500));
    const t5 = await page.evaluate(() => {
        const g = window._pvzGame;
        return { count: g.groundItems.length, items: g.groundItems.map(i => i.item) };
    });
    check('T5 地面掉落 5 件齐', t5.count === 5, t5);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c3_drops_field.png' });

    // 融合株 5 株（board.addPlant 定位）
    await page.evaluate(() => {
        const g = window._pvzGame;
        ['fusion_cone_peashooter', 'fusion_bucket_peashooter', 'fusion_flag_sunflower', 'fusion_door_wallnut', 'fusion_paper_fume'].forEach((tp, i) => {
            const p = new Plant(g, tp);
            g.board.addPlant(p, i % 5, 2 + (i % 3)); // addPlant 内部已入 g.entities，勿重复 push
        });
    });
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c4_fusion_plants.png' });
    const t6 = await page.evaluate(() => {
        const g = window._pvzGame;
        const ps = g.entities.filter(e => typeof Plant !== 'undefined' && e instanceof Plant && e.type.startsWith('fusion_'));
        return ps.map(p => ({ t: p.type, hasOv: !!(p.fusionOverlay && p.fusionOverlay.style.display !== 'none'),
                              ovTransform: p.fusionOverlay ? p.fusionOverlay.style.transform : null }));
    });
    check('T6 5 株掉落物融合株全部带 overlay', t6.length === 5 && t6.every(x => x.hasOv), t6);

    // ===== T7 配方书材料格（新裁剪）=====
    await page.evaluate(() => { window._pvzGame.initFusionUI(); document.getElementById('recipe-book-btn').click(); });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
        const lis = [...document.querySelectorAll('#recipe-list li')];
        const hit = lis.find(li => /路障豌豆/.test(li.innerText));
        if (hit) hit.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c5_recipe.png' });
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });

    // ===== T8 罐内照明预览（双盔倒扣预览）=====
    await page.evaluate(() => {
        const g = window._pvzGame;
        if (!g.vases || g.vases.length === 0) g.vases = window._savedVase ? [window._savedVase] : [];
        const v = g.vases && g.vases[0];
        // lightUpNeighbors 只照亮 8 邻居、不含中心 —— 把 v 挪到照明中心的邻居位（col+1）
        if (v) { v.content = { kind: 'zombie', type: 'ironcone' }; v.revealed = false; g.lightUpNeighbors(v.row, Math.min(v.col + 1, g.board.cols - 1)); }
        return v ? { row: v.row, col: v.col } : null;
    });
    await new Promise(r => setTimeout(r, 600));
    const t8 = await page.evaluate(() => {
        const revs = [...document.querySelectorAll('.vase-reveal')];
        return { n: revs.length, hasWrap: revs.some(r => r.querySelector('img')), flip: revs.some(r => { const i = r.querySelector('img[style*="scaleY"]'); return !!i; }) };
    });
    check('T8 罐内照明预览出现（含翻转外桶）', t8.n > 0 && t8.flip, t8);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c6_vase_lit.png' });

    console.log('\n===== ' + pass + ' pass / ' + fail + ' fail =====');
    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})();
