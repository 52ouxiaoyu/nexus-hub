// v3.61.0 验证：倭瓜两修（配方书材料格裁剪窗 + 手套拖拽株体上移）+ 西瓜误改回退
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
    await new Promise(r => setTimeout(r, 800));
    await page.click('#btn-fusion');
    await page.waitForFunction('document.querySelectorAll("#chooser-grid .chooser-card").length > 0', { timeout: 15000 });
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#chooser-grid .chooser-card'));
        cards.find(c => c.dataset.type === 'sunflower').click();
        cards.find(c => c.dataset.type === 'squash').click();
    });
    await page.click('#btn-lets-rock');
    await page.waitForFunction('window._pvzGame.state === "PLAYING"', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + '  ' + (d || '')); c ? pass++ : fail++; };

    // T1 手套路径：纯倭瓜 + 爆炸弹跳 body transform = translate(-50%,-82%)，株体中心=幽灵锚点
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        const out = {};
        const check = (type, key) => {
            const p = new Plant(g, type);
            g._applyFusionDragGhost(p);
            const gEl = document.getElementById('drag-ghost');
            const stage = gEl.querySelector('div');
            const body = stage.querySelector('img');
            const gr = gEl.getBoundingClientRect();
            const br = body.getBoundingClientRect();
            const gr0 = gEl.getBoundingClientRect();
            // 幽灵框此时可能没跟随鼠标（未拖拽态），但 stage 锚点=幽灵框中心是恒定的
            const anchorY = gr0.top + gr0.height / 2;
            // 株体在素材里的中心：y≈185/226≈81.9%
            const bodyCenterY = br.top + br.height * 0.819;
            out[key] = { transform: body.style.transform, anchorY: Math.round(anchorY), bodyCenterY: Math.round(bodyCenterY), dev: Math.round(bodyCenterY - anchorY) };
            p.isDead = true;
            if (p.element.parentNode) p.element.parentNode.removeChild(p.element);
            if (p.fusionOverlay && p.fusionOverlay.parentNode) p.fusionOverlay.parentNode.removeChild(p.fusionOverlay);
        };
        check('squash', 'pure');
        check('fusion_boomsquash', 'boom');
        return out;
    });
    ok('T1a 纯倭瓜 body translate(-50%,-82%)', t1.pure.transform === 'translate(-50%, -82%)', JSON.stringify(t1.pure));
    ok('T1b 纯倭瓜株体中心=幽灵锚点(±6px)', Math.abs(t1.pure.dev) <= 6, 'dev=' + t1.pure.dev);
    ok('T1c 爆炸弹跳 body translate(-50%,-82%)', t1.boom.transform === 'translate(-50%, -82%)', JSON.stringify(t1.boom));
    ok('T1d 爆炸弹跳株体中心=幽灵锚点(±6px)', Math.abs(t1.boom.dev) <= 6, 'dev=' + t1.boom.dev);

    // T2 配方书：squash 材料格变 62×75 裁剪窗（Squash.gif 背景图），其他材料仍 img
    await page.click('#recipe-book-btn');
    await page.waitForFunction(() => {
        const imgs = Array.from(document.querySelectorAll('#recipe-list img'));
        return imgs.length > 0 && imgs.every(im => im.complete);
    }, { timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
    const t2 = await page.evaluate(() => {
        const list = document.getElementById('recipe-list');
        const squashDivs = Array.from(list.querySelectorAll('div')).filter(d => (d.style.backgroundImage || '').indexOf('Squash') >= 0);
        const r = squashDivs.length ? squashDivs[0].getBoundingClientRect() : null;
        // 冰西瓜投手结果预览框（回退后应为 78×80 逻辑 ≈ 111×114 设备）
        const boxes = Array.from(list.querySelectorAll('div')).filter(d => Math.abs(d.style.width.replace('px', '') - 78) < 1);
        // 双向豌豆（peashooter+squash）条目里 squash 格
        return { squashCount: squashDivs.length, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0 };
    });
    ok('T2a 配方书倭瓜裁剪窗出现（双向豌豆+爆炸弹跳 ≥2 处）', t2.squashCount >= 2, JSON.stringify(t2));
    ok('T2b 倭瓜格尺寸 62×75 逻辑（设备≈88×107）', t2.w >= 80 && t2.w <= 96 && t2.h >= 98 && t2.h <= 115, 'w=' + t2.w + ' h=' + t2.h);
    // 截图双向豌豆条目（index 1 附近）
    await page.evaluate(() => {
        const items = Array.from(document.getElementById('recipe-list').children);
        const li = items.find(x => x.textContent.indexOf('双向豌豆') >= 0) || items[0];
        li.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v361_squash_recipe.png', clip: { x: 200, y: 150, width: 880, height: 500 } });

    // T3 西瓜回退：冰西瓜投手结果图恢复 74 逻辑封顶（设备 ~105）
    const t3 = await page.evaluate(() => {
        const list = document.getElementById('recipe-list');
        const items = Array.from(list.children);
        const li = items.find(x => x.textContent.indexOf('冰西瓜投手') >= 0);
        const img = li ? Array.from(li.querySelectorAll('img')).pop() : null;
        const r = img ? img.getBoundingClientRect() : null;
        return r ? Math.round(r.width) : 0;
    });
    ok('T3 冰西瓜投手结果回退到 ~105 设备px（74 逻辑封顶）', t3 >= 95 && t3 <= 115, 'w=' + t3);

    // T4 选卡拖拽纯倭瓜幽灵（v3.20.0 逻辑未破坏）
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });
    await page.waitForFunction('window._pvzGame.sunCount >= 50', { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => { window._pvzGame.sunCount = 500; window._pvzGame.updateUI && window._pvzGame.updateUI(); });
    await new Promise(r => setTimeout(r, 9500)); // 等冷却
    const card = await page.evaluate(() => {
        const c = Array.from(document.querySelectorAll('#seed-bank .seed-card')).find(x => x.dataset.type === 'squash');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, cls: c.className };
    });
    if (card && card.cls.indexOf('disabled') < 0) {
        await page.mouse.move(card.x, card.y);
        await page.mouse.down();
        await page.mouse.move(640, 500, { steps: 8 });
        await new Promise(r => setTimeout(r, 250));
        const t4 = await page.evaluate(() => {
            const gEl = document.getElementById('drag-ghost');
            return { w: Math.round(gEl.getBoundingClientRect().width), h: Math.round(gEl.getBoundingClientRect().height), bgPos: gEl.style.backgroundPosition, bgSize: gEl.style.backgroundSize };
        });
        ok('T4 倭瓜选卡拖拽幽灵 70×85 + center bottom（v3.20.0 保留）', t4.w >= 95 && t4.h >= 115 && /bottom/.test(t4.bgPos), JSON.stringify(t4));
        await page.screenshot({ path: '/Users/clawbox/nexus-hub/v361_squash_ghost.png', clip: { x: 460, y: 340, width: 360, height: 320 } });
        await page.mouse.up();
    } else {
        console.log('  ⚠️ T4 跳过（卡不可用）', JSON.stringify(card));
    }

    console.log('\n结果: ' + pass + ' 过 / ' + fail + ' 挂');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
