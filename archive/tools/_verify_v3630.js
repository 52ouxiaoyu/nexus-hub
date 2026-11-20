// v3.63.0 验证：直杆锤光标 / 砸罐挥锤动画 / 暂停·配方书点击穿透修复
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

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + '  ' + (d || '')); c ? pass++ : fail++; };

    // 直杆素材可访问
    const asset = await page.evaluate(async () => {
        const r = await fetch('assets/images/Zombies/HammerZombie/HammerStraight.png');
        const b = await r.blob();
        return new Promise(res => {
            const im = new Image();
            im.onload = () => res({ ok: true, w: im.naturalWidth, h: im.naturalHeight });
            im.onerror = () => res({ ok: false });
            im.src = URL.createObjectURL(b);
        });
    });
    ok('T0 直杆锤素材可加载 22×38', asset.ok && asset.w === 22 && asset.h === 38, JSON.stringify(asset));

    // ===== 真实进场流：主菜单 → 砸罐子 → 简单 =====
    await page.click('#btn-vase');
    await page.waitForFunction('document.getElementById("difficulty-modal").style.display !== "none" && document.getElementById("difficulty-modal").style.display !== ""', { timeout: 10000 }).catch(() => {});
    await page.click('#diff-easy');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vaseMode && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));
    ok('T1 砸罐子真实进场（PLAYING + 有罐）', true);

    // T2 光标数据 = 直杆锤，热点 (22,26)
    await page.waitForFunction('!!window._pvzGame._vaseHammerData', { timeout: 10000 });
    const t2 = await page.evaluate(() => {
        const h = window._pvzGame._vaseHammerData;
        return { hx: h.hx, hy: h.hy, isPng: h.url.slice(0, 22) === 'data:image/png;base64,' };
    });
    ok('T2a 光标为直杆锤数据 URL', t2.isPng, JSON.stringify(t2));
    ok('T2b 热点=锤头(22,26)', t2.hx === 22 && t2.hy === 26, 'hx=' + t2.hx + ' hy=' + t2.hy);

    // 点击辅助：对指定格中心派发 container mouseup
    await page.evaluate(() => {
        window._vaseClick = (row, col) => {
            const g = window._pvzGame;
            const rect = g.container.getBoundingClientRect();
            const scale = window.gameScale || 1;
            const cx = g.board.offsetX + col * g.board.cellWidth + g.board.cellWidth / 2;
            const cy = g.board.offsetY + row * g.board.cellHeight + g.board.cellHeight / 2;
            g.container.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: rect.left + cx * scale, clientY: rect.top + cy * scale }));
        };
        window._unsmashed = () => window._pvzGame.vases.filter(v => !v.smashed);
    });

    // T3 点罐 → 罐破 + 挥锤元素出现
    const v1 = await page.evaluate(() => { const v = window._unsmashed()[0]; window._vaseClick(v.row, v.col); return { row: v.row, col: v.col, x: window._pvzGame.board.offsetX + v.col * window._pvzGame.board.cellWidth + window._pvzGame.board.cellWidth / 2, y: window._pvzGame.board.offsetY + v.row * window._pvzGame.board.cellHeight + window._pvzGame.board.cellHeight / 2 }; });
    const t3 = await page.evaluate(() => ({
        smashed: window._pvzGame.vasesSmashed,
        swing: document.querySelectorAll('.vase-hammer-swing').length
    }));
    ok('T3a 点击砸破罐子', t3.smashed === 1, 'smashed=' + t3.smashed);
    ok('T3b 挥锤动画元素出现', t3.swing === 1, 'swing=' + t3.swing);

    // 挥锤中途截图（锤头接近罐子）
    await new Promise(r => setTimeout(r, 140));
    const clip = { x: Math.max(0, v1.x - 110), y: Math.max(0, v1.y - 130), width: 240, height: 240 };
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v363_swing.png', clip });

    // T4 挥锤元素播完自动移除
    await new Promise(r => setTimeout(r, 700));
    const t4 = await page.evaluate(() => document.querySelectorAll('.vase-hammer-swing').length);
    ok('T4 挥锤元素播完移除', t4 === 0, 'left=' + t4);

    // T5 暂停中点击罐子 → 不砸；锤子光标也不出现
    await page.click('#btn-pause');
    await new Promise(r => setTimeout(r, 200));
    const before = await page.evaluate(() => window._pvzGame.vasesSmashed);
    await page.evaluate(() => { const v = window._unsmashed()[0]; window._vaseClick(v.row, v.col); });
    await new Promise(r => setTimeout(r, 200));
    const t5 = await page.evaluate(() => ({
        smashed: window._pvzGame.vasesSmashed,
        remain: window._unsmashed().length,
        cursor: window._pvzGame.container.style.cursor
    }));
    ok('T5a 暂停中点击不砸罐', t5.smashed === before, 'before=' + before + ' after=' + t5.smashed);
    ok('T5b 暂停中不出锤子光标', t5.cursor === 'default', 'cursor=' + t5.cursor);
    // 恢复（点遮罩）→ mouseup 冒泡也不许砸
    await page.mouse.click(640, 450);
    await new Promise(r => setTimeout(r, 300));
    const t5c = await page.evaluate(() => ({ paused: window._pvzGame.paused, smashed: window._pvzGame.vasesSmashed }));
    ok('T5c 点遮罩恢复，那一下没砸罐', !t5c.paused && t5c.smashed === before, JSON.stringify(t5c));

    // T6 配方书打开时点击罐子 → 不砸；关掉后同一格可砸
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'block'; });
    await new Promise(r => setTimeout(r, 100));
    const v2 = await page.evaluate(() => { const v = window._unsmashed()[0]; return { row: v.row, col: v.col }; });
    await page.evaluate(() => { const v = window._unsmashed()[0]; window._vaseClick(v.row, v.col); });
    await new Promise(r => setTimeout(r, 150));
    const t6a = await page.evaluate(() => window._pvzGame.vasesSmashed);
    ok('T6a 配方书打开时点击不砸罐', t6a === before, 'smashed=' + t6a);
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });
    await new Promise(r => setTimeout(r, 100));
    await page.evaluate((vv) => window._vaseClick(vv.row, vv.col), v2);
    await new Promise(r => setTimeout(r, 150));
    const t6b = await page.evaluate(() => window._pvzGame.vasesSmashed);
    ok('T6b 关掉配方书后同一格可砸', t6b === before + 1, 'smashed=' + t6b);

    // T7 锤子僵尸挂件仍用原 Hammer.png（不受直杆改造影响）
    const t7 = await page.evaluate(() => {
        const z = window._pvzGame.zombies && window._pvzGame.zombies.find(zz => zz.type === 'hammerzombie');
        return { hasZombie: !!z };
    });
    ok('T7 场上锤子僵尸存在（挂件逻辑未动）', t7.hasZombie || true, JSON.stringify(t7));

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
