// v3.68.0 验证：锤子僵尸退出问号罐 + 照明预览带锤
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
    await page.click('#btn-vase');
    await page.click('#diff-hell');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + (d ? '  ' + d : '')); c ? pass++ : fail++; };

    // T1 问号罐抽签 300 次：锤子僵尸绝迹
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        let hammer = 0;
        for (let i = 0; i < 300; i++) {
            if (g._rollVaseZombieType(5, true) === 'hammerzombie') hammer++;
        }
        return hammer;
    });
    ok('T1 问号罐 300 抽无锤子僵尸', t1 === 0, '出现 ' + t1 + ' 次');

    // T2 紫罐（僵尸罐）抽签 300 次：锤子僵尸仍可出
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        let hammer = 0;
        for (let i = 0; i < 300; i++) {
            if (g._rollVaseZombieType(5, false) === 'hammerzombie') hammer++;
        }
        return hammer;
    });
    ok('T2 紫罐 300 抽锤子僵尸在池', t2 > 0, '出现 ' + t2 + ' 次');

    // T3 金罐僵尸池含锤子僵尸
    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        let hammer = 0;
        for (let i = 0; i < 200; i++) {
            const c = g._rollGoldenVaseContent();
            if (c.kind === 'zombie' && c.type === 'hammerzombie') hammer++;
        }
        return hammer;
    });
    ok('T3 金罐 200 抽锤子僵尸在池', t3 > 0, '出现 ' + t3 + ' 次');

    // T4 照明预览：锤子僵尸罐 → 预览 DOM 含 Hammer.png（普通僵尸只含 Zombie.gif）
    const t4 = await page.evaluate(() => {
        const g = window._pvzGame;
        const vs = g.vases.filter(v => !v.smashed);
        if (vs.length < 2) return { ok: false, why: 'vases 不足' };
        // 找一个无南瓜套的罐子改成锤子僵尸，旁边一罐保持普通僵尸
        const vH = vs.find(v => !v.pumpkinHp), vN = vs.find(v => v !== vH && !v.pumpkinHp);
        if (!vH || !vN) return { ok: false, why: '无可用罐' };
        vH.content = { kind: 'zombie', type: 'hammerzombie' };
        vN.content = { kind: 'zombie', type: 'normal' };
        // lightUpNeighbors 照亮的是目标格"周围一圈"（不含自身）——对罐子左侧格调用使罐子成为邻居被照亮
        g.lightUpNeighbors(vH.row, vH.col - 1);
        g.lightUpNeighbors(vN.row, vN.col - 1);
        const htmlH = vH.contentEl ? vH.contentEl.innerHTML : '';
        const outerN = vN.contentEl ? (vN.contentEl.outerHTML || '') : '';
        return {
            ok: true,
            hHasHammer: htmlH.includes('Hammer.png'), hHasBody: htmlH.includes('Zombie.gif'),
            nHasHammer: outerN.includes('Hammer.png'), nHasBody: outerN.includes('Zombie.gif')
        };
    });
    ok('T4 锤子僵尸预览=身体+锤', t4.ok && t4.hHasHammer && t4.hHasBody, JSON.stringify(t4));
    ok('T5 普通僵尸预览无锤', t4.ok && !t4.nHasHammer && t4.nHasBody);

    // 截图：被照亮的锤子僵尸罐
    const shot = await page.evaluate(() => {
        const g = window._pvzGame;
        const v = g.vases.find(x => !x.smashed && x.contentEl && x.contentEl.innerHTML.includes('Hammer.png'));
        if (!v) return null;
        const cx = g.board.offsetX + v.col * g.board.cellWidth + g.board.cellWidth / 2;
        const cy = g.board.offsetY + v.row * g.board.cellHeight + g.board.cellHeight / 2;
        const rect = g.container.getBoundingClientRect();
        const scale = window.gameScale || 1;
        return { vx: rect.left + cx * scale, vy: rect.top + cy * scale };
    });
    if (shot) {
        await page.screenshot({ path: '/Users/clawbox/nexus-hub/v368_hammer_preview.png',
            clip: { x: Math.max(0, shot.vx - 110), y: Math.max(0, shot.vy - 130), width: 220, height: 220 } });
        ok('T6 照明预览截图完成', true);
    } else {
        ok('T6 照明预览截图完成', false, '未找到锤子预览罐');
    }

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
